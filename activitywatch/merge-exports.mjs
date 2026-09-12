#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

const OUTPUT_PATTERN = /^activitywatch-\d{4}-\d{2}\.json$/;

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function jsonFiles(directory, excludedDirectory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (path.resolve(entryPath) !== excludedDirectory) {
        files.push(...await jsonFiles(entryPath, excludedDirectory));
      }
    } else if (
      entry.isFile()
      && entry.name.toLowerCase().endsWith(".json")
      && !(path.resolve(directory) === excludedDirectory && OUTPUT_PATTERN.test(entry.name))
    ) {
      files.push(entryPath);
    }
  }
  return files.sort();
}

function eventDetails(event, file) {
  const time = new Date(event.timestamp);
  if (!Number.isFinite(time.getTime())) {
    throw new Error(`Invalid event timestamp in ${file}: ${event.timestamp}`);
  }
  const duration = Number(event.duration ?? 0);
  if (!Number.isFinite(duration) || duration < 0) {
    throw new Error(`Invalid event duration in ${file}: ${event.duration}`);
  }
  return {
    start: time.getTime(),
    end: time.getTime() + duration * 1_000,
    duration,
    month: time.toISOString().slice(0, 7),
    dataKey: stableStringify(event.data ?? {}),
    key: `${time.toISOString()}\u0000${duration}\u0000${stableStringify(event.data ?? {})}`,
  };
}

function bucketMetadata(bucket) {
  const { events: _events, ...metadata } = bucket;
  return metadata;
}

function bucketIdentity(bucketId, bucket) {
  return stableStringify({
    bucketId,
    type: bucket.type ?? null,
    client: bucket.client ?? null,
    hostname: bucket.hostname ?? null,
  });
}

function suffixedBucketId(bucketId, identity) {
  const suffix = createHash("sha256").update(identity).digest("hex").slice(0, 8);
  return `${bucketId}__${suffix}`;
}

function mergeMissing(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (target[key] === undefined || target[key] === null || target[key] === "") {
      target[key] = value;
    }
  }
}

function typeStats(stats, type) {
  if (!stats.types[type]) {
    stats.types[type] = {
      raw: 0,
      exactDuplicates: 0,
      zeroDuration: 0,
      overlapMerges: 0,
      contained: 0,
      extending: 0,
      adjacentKept: 0,
      conflictingOverlaps: 0,
      output: 0,
    };
  }
  return stats.types[type];
}

function mergeOverlappingEvents(events, stats) {
  const zeroDuration = [];
  const groups = new Map();
  for (const item of events) {
    if (item.duration === 0) {
      zeroDuration.push(item);
      continue;
    }
    if (!groups.has(item.dataKey)) groups.set(item.dataKey, []);
    groups.get(item.dataKey).push(item);
  }

  const merged = [...zeroDuration];
  for (const group of groups.values()) {
    group.sort((a, b) => a.start - b.start || b.end - a.end || stableStringify(a.event).localeCompare(stableStringify(b.event)));
    let current;
    for (const item of group) {
      if (!current) {
        current = { ...item, event: { ...item.event } };
        continue;
      }
      const itemTypeStats = typeStats(stats, item.type);
      if (item.start === current.end) {
        stats.adjacentKept += 1;
        itemTypeStats.adjacentKept += 1;
      }
      if (item.start >= current.end) {
        merged.push(current);
        current = { ...item, event: { ...item.event } };
        continue;
      }

      stats.overlapMerges += 1;
      itemTypeStats.overlapMerges += 1;
      if (item.end <= current.end) {
        stats.contained += 1;
        itemTypeStats.contained += 1;
      } else {
        stats.extending += 1;
        itemTypeStats.extending += 1;
        current.end = item.end;
        current.duration = (current.end - current.start) / 1_000;
        current.event.duration = current.duration;
      }
    }
    if (current) merged.push(current);
  }
  return merged;
}

function countConflictingOverlaps(events, stats) {
  const active = [];
  for (const item of events.filter((event) => event.duration > 0).sort((a, b) => a.start - b.start || a.end - b.end)) {
    for (let index = active.length - 1; index >= 0; index -= 1) {
      if (active[index].end <= item.start) active.splice(index, 1);
    }
    for (const other of active) {
      if (other.dataKey !== item.dataKey) {
        stats.conflictingOverlaps += 1;
        typeStats(stats, item.type).conflictingOverlaps += 1;
      }
    }
    active.push(item);
  }
}

export async function mergeActivityWatchExports(inputDirectory, outputDirectory) {
  const input = path.resolve(inputDirectory);
  const output = path.resolve(outputDirectory);
  const inputStat = await fs.stat(input);
  if (!inputStat.isDirectory()) throw new Error(`Input is not a directory: ${input}`);

  const files = await jsonFiles(input, output);
  if (files.length === 0) throw new Error(`No JSON files found under ${input}`);

  const bucketRecords = new Map();
  const stats = {
    files: [],
    events: 0,
    uniqueExact: 0,
    exactDuplicates: 0,
    zeroDuration: 0,
    overlapMerges: 0,
    contained: 0,
    extending: 0,
    adjacentKept: 0,
    conflictingOverlaps: 0,
    crossMonth: 0,
    sourceEventIdsSeen: 0,
    bucketIdsWithConflicts: 0,
    bucketVariantsRenamed: 0,
    unique: 0,
    months: 0,
    types: {},
    monthStats: {},
  };

  for (const file of files) {
    const fileStats = { file: path.relative(input, file), events: 0, unique: 0, exactDuplicates: 0, buckets: [] };
    let document;
    try {
      document = JSON.parse(await fs.readFile(file, "utf8"));
    } catch (error) {
      throw new Error(`Cannot parse ${file}: ${error.message}`, { cause: error });
    }
    if (!document?.buckets || typeof document.buckets !== "object" || Array.isArray(document.buckets)) {
      throw new Error(`Missing ActivityWatch buckets object in ${file}`);
    }

    for (const [bucketId, bucket] of Object.entries(document.buckets)) {
      if (!Array.isArray(bucket?.events)) throw new Error(`Bucket ${bucketId} has no events array in ${file}`);
      const type = String(bucket.type ?? "unknown");
      const fileBucketStats = {
        id: bucketId,
        hostname: String(bucket.hostname ?? "unknown"),
        type,
        events: bucket.events.length,
        start: null,
        end: null,
      };
      fileStats.buckets.push(fileBucketStats);
      const identity = bucketIdentity(bucketId, bucket);
      if (!bucketRecords.has(identity)) {
        bucketRecords.set(identity, { originalId: bucketId, identity, metadata: bucketMetadata(bucket), events: new Map(), type });
      }
      const bucketRecord = bucketRecords.get(identity);
      mergeMissing(bucketRecord.metadata, bucketMetadata(bucket));
      for (const event of bucket.events) {
        stats.events += 1;
        fileStats.events += 1;
        const currentTypeStats = typeStats(stats, type);
        currentTypeStats.raw += 1;
        if (event.id !== undefined && event.id !== null) stats.sourceEventIdsSeen += 1;
        const details = eventDetails(event, file);
        fileBucketStats.start = fileBucketStats.start === null
          ? details.start
          : Math.min(fileBucketStats.start, details.start);
        fileBucketStats.end = fileBucketStats.end === null
          ? details.end
          : Math.max(fileBucketStats.end, details.end);
        if (details.duration === 0) {
          stats.zeroDuration += 1;
          currentTypeStats.zeroDuration += 1;
        }
        if (bucketRecord.events.has(details.key)) {
          stats.exactDuplicates += 1;
          fileStats.exactDuplicates += 1;
          currentTypeStats.exactDuplicates += 1;
        } else {
          stats.uniqueExact += 1;
          fileStats.unique += 1;
          const { id: _sourceId, ...eventWithoutId } = event;
          bucketRecord.events.set(details.key, { event: eventWithoutId, type, ...details });
        }
      }
    }
    stats.files.push(fileStats);
  }

  const identitiesByBucketId = new Map();
  for (const record of bucketRecords.values()) {
    if (!identitiesByBucketId.has(record.originalId)) identitiesByBucketId.set(record.originalId, []);
    identitiesByBucketId.get(record.originalId).push(record.identity);
  }
  stats.bucketIdsWithConflicts = [...identitiesByBucketId.values()].filter((identities) => identities.length > 1).length;
  stats.bucketVariantsRenamed = [...identitiesByBucketId.values()].reduce(
    (count, identities) => count + (identities.length > 1 ? identities.length : 0),
    0,
  );

  const months = new Map();
  for (const bucket of bucketRecords.values()) {
    const hasIdentityConflict = identitiesByBucketId.get(bucket.originalId).length > 1;
    const outputBucketId = hasIdentityConflict
      ? suffixedBucketId(bucket.originalId, bucket.identity)
      : bucket.originalId;
    const outputMetadata = { ...bucket.metadata, id: outputBucketId };
    const mergedEvents = mergeOverlappingEvents([...bucket.events.values()], stats);
    countConflictingOverlaps(mergedEvents, stats);
    for (const item of mergedEvents) {
      const month = new Date(item.start).toISOString().slice(0, 7);
      const endMonth = new Date(Math.max(item.start, item.end - 1)).toISOString().slice(0, 7);
      if (month !== endMonth) stats.crossMonth += 1;
      if (!months.has(month)) months.set(month, new Map());
      const monthBuckets = months.get(month);
      if (!monthBuckets.has(outputBucketId)) monthBuckets.set(outputBucketId, { metadata: outputMetadata, events: [] });
      monthBuckets.get(outputBucketId).events.push(item.event);
      typeStats(stats, item.type).output += 1;
      stats.unique += 1;
    }
  }
  stats.months = months.size;

  await fs.mkdir(output, { recursive: true });
  for (const entry of await fs.readdir(output, { withFileTypes: true })) {
    if (entry.isFile() && OUTPUT_PATTERN.test(entry.name)) await fs.unlink(path.join(output, entry.name));
  }

  for (const month of [...months.keys()].sort()) {
    const buckets = {};
    for (const [bucketId, bucket] of [...months.get(month)].sort(([a], [b]) => a.localeCompare(b))) {
      const events = bucket.events.sort((a, b) => {
        const timeDifference = new Date(a.timestamp) - new Date(b.timestamp);
        return timeDifference || stableStringify(a).localeCompare(stableStringify(b));
      });
      buckets[bucketId] = { ...bucket.metadata, events };
    }
    const filename = `activitywatch-${month}.json`;
    const destination = path.join(output, filename);
    const temporary = `${destination}.tmp-${process.pid}`;
    const contents = `${JSON.stringify({ buckets }, null, 2)}\n`;
    await fs.writeFile(temporary, contents);
    await fs.rename(temporary, destination);
    stats.monthStats[month] = {
      buckets: Object.keys(buckets).length,
      events: Object.values(buckets).reduce((count, bucket) => count + bucket.events.length, 0),
      bytes: Buffer.byteLength(contents),
    };
  }

  return stats;
}

function usage() {
  console.error("Usage: merge-exports.mjs <input-directory> <output-directory>");
}

function number(value) {
  return value.toLocaleString("en-US");
}

function bytes(value) {
  if (value < 1_024) return `${value} B`;
  if (value < 1_048_576) return `${(value / 1_024).toFixed(1)} KiB`;
  return `${(value / 1_048_576).toFixed(1)} MiB`;
}

function printStats(stats) {
  console.log("\nInput files:");
  for (const file of stats.files) {
    console.log(`  ${file.file}: ${number(file.events)} events, ${number(file.exactDuplicates)} exact duplicates`);
    for (const bucket of file.buckets.sort((a, b) => a.id.localeCompare(b.id) || a.hostname.localeCompare(b.hostname))) {
      const range = bucket.start === null
        ? "no events"
        : `${new Date(bucket.start).toISOString()} -> ${new Date(bucket.end).toISOString()}`;
      console.log(`    bucket=${bucket.id}, hostname=${bucket.hostname}, type=${bucket.type}, events=${number(bucket.events)}, range=${range}`);
    }
  }
  console.log("\nMerge summary:");
  console.log(`  Raw events:                    ${number(stats.events)}`);
  console.log(`  Exact duplicates removed:      ${number(stats.exactDuplicates)}`);
  console.log(`  Same-data overlaps merged:     ${number(stats.overlapMerges)}`);
  console.log(`    Fully contained:             ${number(stats.contained)}`);
  console.log(`    Extended interval:           ${number(stats.extending)}`);
  console.log(`  Same-data adjacent events kept:${number(stats.adjacentKept).padStart(12)}`);
  console.log(`  Different-data overlaps kept:  ${number(stats.conflictingOverlaps)}`);
  console.log(`  Zero-duration events observed: ${number(stats.zeroDuration)}`);
  console.log(`  Cross-month events kept whole: ${number(stats.crossMonth)}`);
  console.log(`  Source events carrying IDs:     ${number(stats.sourceEventIdsSeen)} (IDs omitted from output)`);
  console.log(`  Conflicting bucket IDs:         ${number(stats.bucketIdsWithConflicts)} (${number(stats.bucketVariantsRenamed)} variants renamed)`);
  console.log(`  Output events:                 ${number(stats.unique)}`);

  console.log("\nBy bucket type:");
  for (const [type, values] of Object.entries(stats.types).sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`  ${type}: raw=${number(values.raw)}, exact-duplicates=${number(values.exactDuplicates)}, overlaps-merged=${number(values.overlapMerges)}, conflicts-kept=${number(values.conflictingOverlaps)}, output=${number(values.output)}`);
  }

  console.log("\nMonthly output:");
  for (const [month, values] of Object.entries(stats.monthStats).sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`  activitywatch-${month}.json: ${number(values.events)} events, ${number(values.buckets)} buckets, ${bytes(values.bytes)}`);
  }
}

async function main() {
  if (process.argv.length !== 4 || process.argv.includes("--help") || process.argv.includes("-h")) {
    usage();
    process.exitCode = process.argv.includes("--help") || process.argv.includes("-h") ? 0 : 64;
    return;
  }
  const result = await mergeActivityWatchExports(process.argv[2], process.argv[3]);
  printStats(result);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
