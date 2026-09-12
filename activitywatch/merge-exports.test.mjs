import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { mergeActivityWatchExports } from "./merge-exports.mjs";

function exportDocument(events, hostname = "test") {
  return {
    buckets: {
      "aw-watcher-window_test": {
        id: "aw-watcher-window_test",
        type: "currentwindow",
        client: "aw-watcher-window",
        hostname,
        events,
      },
    },
  };
}

test("merges exports, removes stable duplicates, and writes UTC months", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "activitywatch-merge-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const input = path.join(root, "input");
  const nested = path.join(input, "nested");
  const output = path.join(input, "output");
  await fs.mkdir(nested, { recursive: true });

  await fs.writeFile(path.join(input, "first.json"), JSON.stringify(exportDocument([
    { id: 1, timestamp: "2026-01-31T23:30:00Z", duration: 30, data: { app: "Editor", title: "One" } },
    { id: 2, timestamp: "2026-02-01T00:30:00Z", duration: 10, data: { app: "Browser" } },
    { id: 4, timestamp: "2026-02-02T00:00:00Z", duration: 10, data: { app: "Terminal" } },
  ])));
  await fs.writeFile(path.join(nested, "second.JSON"), JSON.stringify(exportDocument([
    { id: 99, timestamp: "2026-01-31T23:30:00.000Z", duration: 30, data: { title: "One", app: "Editor" } },
    { id: 3, timestamp: "2026-02-02T00:00:05Z", duration: 10, data: { app: "Terminal" } },
    { id: 5, timestamp: "2026-02-02T00:00:06Z", duration: 2, data: { app: "Other" } },
    { id: 6, timestamp: "2026-02-02T00:00:15Z", duration: 5, data: { app: "Terminal" } },
    { id: 7, timestamp: "2026-02-02T00:00:07Z", duration: 0, data: { app: "Terminal" } },
  ])));

  const result = await mergeActivityWatchExports(input, output);
  assert.equal(result.files.length, 2);
  assert.deepEqual(result.files[0].buckets[0], {
    id: "aw-watcher-window_test",
    hostname: "test",
    type: "currentwindow",
    events: 3,
    start: Date.parse("2026-01-31T23:30:00Z"),
    end: Date.parse("2026-02-02T00:00:10Z"),
  });
  assert.equal(result.events, 8);
  assert.equal(result.uniqueExact, 7);
  assert.equal(result.exactDuplicates, 1);
  assert.equal(result.overlapMerges, 1);
  assert.equal(result.extending, 1);
  assert.equal(result.adjacentKept, 1);
  assert.equal(result.conflictingOverlaps, 1);
  assert.equal(result.zeroDuration, 1);
  assert.equal(result.unique, 6);
  assert.equal(result.months, 2);
  assert.deepEqual((await fs.readdir(output)).sort(), [
    "activitywatch-2026-01.json",
    "activitywatch-2026-02.json",
  ]);

  const january = JSON.parse(await fs.readFile(path.join(output, "activitywatch-2026-01.json"), "utf8"));
  const february = JSON.parse(await fs.readFile(path.join(output, "activitywatch-2026-02.json"), "utf8"));
  assert.equal(january.buckets["aw-watcher-window_test"].events.length, 1);
  assert.equal(february.buckets["aw-watcher-window_test"].events.length, 5);
  const terminal = february.buckets["aw-watcher-window_test"].events.find((event) => event.data.app === "Terminal" && event.duration === 15);
  assert.equal(terminal.timestamp, "2026-02-02T00:00:00Z");
  assert.equal(terminal.duration, 15);
  assert.ok(february.buckets["aw-watcher-window_test"].events.every((event) => event.id === undefined));
});

test("separates conflicting bucket identities and removes source event IDs", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "activitywatch-merge-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const input = path.join(root, "input");
  const output = path.join(root, "output");
  await fs.mkdir(input);
  const event = { id: 1, timestamp: "2026-01-01T00:00:00Z", duration: 1, data: { app: "Editor" } };
  await fs.writeFile(path.join(input, "one.json"), JSON.stringify(exportDocument([event], "host-one")));
  await fs.writeFile(path.join(input, "two.json"), JSON.stringify(exportDocument([event], "host-two")));

  const result = await mergeActivityWatchExports(input, output);
  assert.equal(result.bucketIdsWithConflicts, 1);
  assert.equal(result.bucketVariantsRenamed, 2);
  assert.equal(result.exactDuplicates, 0);
  assert.equal(result.unique, 2);
  const document = JSON.parse(await fs.readFile(path.join(output, "activitywatch-2026-01.json"), "utf8"));
  const bucketIds = Object.keys(document.buckets);
  assert.equal(bucketIds.length, 2);
  assert.ok(bucketIds.every((id) => /^aw-watcher-window_test__[0-9a-f]{8}$/.test(id)));
  assert.ok(bucketIds.every((id) => document.buckets[id].id === id));
  assert.ok(bucketIds.every((id) => document.buckets[id].events[0].id === undefined));
});

test("rejects malformed event timestamps", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "activitywatch-merge-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const input = path.join(root, "input");
  const output = path.join(root, "output");
  await fs.mkdir(input);
  await fs.writeFile(path.join(input, "bad.json"), JSON.stringify(exportDocument([
    { timestamp: "not-a-date", duration: 1, data: {} },
  ])));

  await assert.rejects(
    mergeActivityWatchExports(input, output),
    /Invalid event timestamp/,
  );
});
