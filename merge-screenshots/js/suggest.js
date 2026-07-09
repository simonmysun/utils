// Smart-merge (auto-stitch) provider.
//
// Pluggable via `getSuggestionProvider()` so the algorithm can be swapped
// without touching the core editing/merge pipeline.
//
// Batch interface:
//   analyze(items, direction, { allowReorder }) -> {
//     order:   number[]            // indices into `items`, stitch order
//     perItem: [{ cropTop, cropBottom, overlapNext }]  // along-axis semantics
//     warnings: string[]
//   }
//
// Algorithm (see requirements.md 4.1): rasterize rotated luma -> column-block
// signatures along the stitch axis -> temporal-median background subtraction ->
// fixed head/foot detection -> NCC scroll alignment per adjacent pair.

import { rotatedSize, baseTranslate } from './geometry.js';

const K = 32;                 // perpendicular column/row blocks
const LUMA = [0.299, 0.587, 0.114];

export class SuggestionProvider {
  get available() {
    return false;
  }

  // eslint-disable-next-line no-unused-vars
  async analyze(items, direction, opts) {
    throw new Error('SuggestionProvider.analyze() not implemented');
  }
}

/** Default no-op provider. Advertises itself as unavailable. */
export class NoopSuggestionProvider extends SuggestionProvider {}

/** Real auto-stitch implementation. */
export class AutoMergeProvider extends SuggestionProvider {
  get available() {
    return true;
  }

  async analyze(items, direction, { allowReorder = false } = {}) {
    const warnings = [];
    const n = items.length;
    if (n < 2) {
      return { order: items.map((_, i) => i), perItem: emptyPlan(n), warnings };
    }

    // 1-2. Per-item column-block signature along the stitch axis.
    const sigs = items.map((it) => signatureOf(it, direction));
    const A = sigs[0].along;
    const uniformAlong = sigs.every((s) => s.along === A);

    // 3. Temporal-median background (only when along-extents match).
    let med = null;
    if (uniformAlong) {
      med = medianSig(sigs, A);
    } else {
      warnings.push('Images differ in scroll-axis length; background subtraction skipped.');
    }

    // 4. Fixed head / foot detection from row deviation vs. median.
    let ht = 0;
    let hf = 0;
    if (med) {
      const dev = rowDeviation(sigs, med, A);
      ({ ht, hf } = detectFixedBands(dev));
    }
    const As = A - ht - hf;
    if (As < Math.max(40, Math.floor(A * 0.1))) {
      // Detection collapsed the scroll region; fall back to no fixed bands.
      ht = 0;
      hf = 0;
    }
    const As2 = A - ht - hf;

    // Residual signatures over the scrolling region (background removed).
    const res = sigs.map((s) => residual(s, med, ht, As2, A));

    // 5. Optional reordering, then pairwise NCC alignment.
    let order = items.map((_, i) => i);
    if (allowReorder) {
      order = greedyChain(res, As2);
    }

    const minScroll = Math.max(20, Math.floor(As2 * 0.05));
    const minOverlap = Math.max(30, Math.floor(As2 * 0.04));

    const perItem = emptyPlan(n);
    for (let k = 0; k < n; k++) {
      const idx = order[k];
      perItem[idx] = {
        cropTop: k === 0 ? 0 : ht,
        cropBottom: k === n - 1 ? 0 : hf,
        overlapNext: 0,
      };
    }
    for (let k = 0; k < n - 1; k++) {
      const a = res[order[k]];
      const b = res[order[k + 1]];
      const { s, ncc } = bestShift(a, b, As2, minScroll, As2 - minOverlap);
      const overlap = Math.max(0, As2 - s);
      perItem[order[k]].overlapNext = overlap;
      if (ncc < 0.5) {
        warnings.push(
          `Low match confidence (${ncc.toFixed(2)}) between images ` +
          `${order[k] + 1} and ${order[k + 1] + 1}; please verify the seam.`,
        );
      }
    }

    return { order, perItem, warnings };
  }
}

// --- signature extraction ------------------------------------------------

/**
 * Column-block luma signature along the stitch axis for one item, computed on
 * the *rotated* pixels (matching the crop coordinate space used by geometry).
 * Returns { along, across, data: Float32Array(along * K) } laid out row-major
 * as data[a * K + k].
 */
function signatureOf(item, direction) {
  const { w: rW, h: rH } = rotatedSize(item.naturalWidth, item.naturalHeight, item.rotation);
  const luma = rasterizeLuma(item, rW, rH); // Float32Array(rW * rH), row-major

  // Map to (along, across): vertical stitches down rows; horizontal across cols.
  const along = direction === 'vertical' ? rH : rW;
  const across = direction === 'vertical' ? rW : rH;
  const data = new Float32Array(along * K);

  // Precompute across-index -> block index.
  const blockOf = new Int32Array(across);
  for (let x = 0; x < across; x++) blockOf[x] = Math.min(K - 1, Math.floor((x * K) / across));
  const blockCount = new Int32Array(K);
  for (let x = 0; x < across; x++) blockCount[blockOf[x]]++;

  for (let a = 0; a < along; a++) {
    const acc = new Float32Array(K);
    for (let c = 0; c < across; c++) {
      // Pixel (row, col) in rotated image depends on stitch direction.
      const px = direction === 'vertical' ? a * rW + c : c * rW + a;
      acc[blockOf[c]] += luma[px];
    }
    const base = a * K;
    for (let k = 0; k < K; k++) data[base + k] = acc[k] / blockCount[k];
  }
  return { along, across, data };
}

/** Rasterize the item's rotated pixels and return a per-pixel luma buffer. */
function rasterizeLuma(item, rW, rH) {
  const canvas = document.createElement('canvas');
  canvas.width = rW;
  canvas.height = rH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const [bx, by] = baseTranslate(item.naturalWidth, item.naturalHeight, item.rotation);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(bx, by);
  ctx.rotate((item.rotation * Math.PI) / 180);
  ctx.drawImage(item.element, 0, 0);

  const { data: rgba } = ctx.getImageData(0, 0, rW, rH);
  const luma = new Float32Array(rW * rH);
  for (let i = 0, p = 0; i < luma.length; i++, p += 4) {
    luma[i] = rgba[p] * LUMA[0] + rgba[p + 1] * LUMA[1] + rgba[p + 2] * LUMA[2];
  }
  return luma;
}

// --- background / band analysis -----------------------------------------

function medianSig(sigs, A) {
  const m = sigs.length;
  const med = new Float32Array(A * K);
  const col = new Float32Array(m);
  for (let i = 0; i < A * K; i++) {
    for (let j = 0; j < m; j++) col[j] = sigs[j].data[i];
    col.sort();
    const mid = m >> 1;
    med[i] = m % 2 ? col[mid] : (col[mid - 1] + col[mid]) / 2;
  }
  return med;
}

/** Mean absolute deviation from the median, per along-row, averaged over items. */
function rowDeviation(sigs, med, A) {
  const dev = new Float32Array(A);
  for (let a = 0; a < A; a++) {
    let sum = 0;
    const base = a * K;
    for (let j = 0; j < sigs.length; j++) {
      const d = sigs[j].data;
      let rowSum = 0;
      for (let k = 0; k < K; k++) rowSum += Math.abs(d[base + k] - med[base + k]);
      sum += rowSum / K;
    }
    dev[a] = sum / sigs.length;
  }
  return dev;
}

/** Leading/trailing runs of near-static rows -> fixed head/foot heights. */
function detectFixedBands(dev) {
  const sorted = Float32Array.from(dev).sort();
  const p = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  const floor = p(0.1);
  const hi = p(0.7);
  const tol = floor + 0.4 * (hi - floor) + 2;
  let ht = 0;
  while (ht < dev.length && dev[ht] < tol) ht++;
  let hf = 0;
  while (hf < dev.length && dev[dev.length - 1 - hf] < tol) hf++;
  return { ht, hf };
}

/**
 * Residual (background-removed) signature restricted to the scrolling region
 * [ht, ht + As). Returns Float32Array(As * K). When no median is available the
 * raw signature is used (mean-subtraction in NCC still centres it).
 */
function residual(sig, med, ht, As, A) {
  const out = new Float32Array(As * K);
  for (let a = 0; a < As; a++) {
    const src = (ht + a) * K;
    const dst = a * K;
    for (let k = 0; k < K; k++) {
      out[dst + k] = med ? sig.data[src + k] - med[src + k] : sig.data[src + k];
    }
  }
  return out;
}

// --- alignment -----------------------------------------------------------

/**
 * Best scroll shift `s` aligning residual `a` (from row s) against residual `b`
 * (from row 0) via normalized cross-correlation. Coarse-to-fine to stay fast.
 * Returns { s, ncc }.
 */
function bestShift(a, b, As, minS, maxS) {
  if (maxS <= minS) return { s: minS, ncc: -1 };
  const D = Math.max(1, Math.floor(As / 512));
  if (D === 1) return searchRange(a, b, As, minS, maxS);

  // Coarse pass on a down-sampled copy (average every D along-rows).
  const Ac = Math.ceil(As / D);
  const ca = downAlong(a, As, D, Ac);
  const cb = downAlong(b, As, D, Ac);
  const minSc = Math.max(1, Math.floor(minS / D));
  const maxSc = Math.min(Ac - 1, Math.ceil(maxS / D));
  const coarse = searchRange(ca, cb, Ac, minSc, maxSc);
  const s0 = coarse.s * D;

  // Fine pass around the coarse optimum at full resolution.
  return searchRange(a, b, As, Math.max(minS, s0 - D), Math.min(maxS, s0 + D));
}

function downAlong(v, A, D, Ac) {
  const out = new Float32Array(Ac * K);
  for (let a = 0; a < Ac; a++) {
    const r0 = a * D;
    const r1 = Math.min(A, r0 + D);
    const cnt = r1 - r0;
    const base = a * K;
    for (let r = r0; r < r1; r++) {
      const rb = r * K;
      for (let k = 0; k < K; k++) out[base + k] += v[rb + k];
    }
    for (let k = 0; k < K; k++) out[base + k] /= cnt;
  }
  return out;
}

function searchRange(a, b, A, minS, maxS) {
  let best = -Infinity;
  let bestS = minS;
  for (let s = minS; s <= maxS; s++) {
    const c = nccShift(a, b, A, s);
    if (c > best) {
      best = c;
      bestS = s;
    }
  }
  return { s: bestS, ncc: best === -Infinity ? -1 : best };
}

/** NCC of a[s..A) against b[0..A-s), each element a K-vector row. */
function nccShift(a, b, A, s) {
  const rows = A - s;
  if (rows <= 0) return -1;
  const n = rows * K;
  let sa = 0;
  let sb = 0;
  let saa = 0;
  let sbb = 0;
  let sab = 0;
  const aOff = s * K;
  for (let i = 0; i < n; i++) {
    const va = a[aOff + i];
    const vb = b[i];
    sa += va;
    sb += vb;
    saa += va * va;
    sbb += vb * vb;
    sab += va * vb;
  }
  const cov = n * sab - sa * sb;
  const da = n * saa - sa * sa;
  const db = n * sbb - sb * sb;
  const denom = Math.sqrt(da * db);
  return denom < 1e-6 ? -1 : cov / denom;
}

/** Greedy chain ordering by best pairwise overlap NCC (used when reordering). */
function greedyChain(res, As) {
  const n = res.length;
  const score = Array.from({ length: n }, () => new Float32Array(n));
  const minS = Math.max(20, Math.floor(As * 0.05));
  const maxS = As - Math.max(30, Math.floor(As * 0.04));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      score[i][j] = bestShift(res[i], res[j], As, minS, maxS).ncc;
    }
  }
  // Start from the node that is the weakest successor (likely the head).
  let start = 0;
  let worstIn = Infinity;
  for (let j = 0; j < n; j++) {
    let maxIn = -Infinity;
    for (let i = 0; i < n; i++) if (i !== j) maxIn = Math.max(maxIn, score[i][j]);
    if (maxIn < worstIn) {
      worstIn = maxIn;
      start = j;
    }
  }
  const used = new Array(n).fill(false);
  const order = [start];
  used[start] = true;
  for (let step = 1; step < n; step++) {
    const last = order[order.length - 1];
    let next = -1;
    let bestScore = -Infinity;
    for (let j = 0; j < n; j++) {
      if (!used[j] && score[last][j] > bestScore) {
        bestScore = score[last][j];
        next = j;
      }
    }
    used[next] = true;
    order.push(next);
  }
  return order;
}

// --- helpers -------------------------------------------------------------

function emptyPlan(n) {
  return Array.from({ length: n }, () => ({ cropTop: 0, cropBottom: 0, overlapNext: 0 }));
}

// --- registry ------------------------------------------------------------

let current = new AutoMergeProvider();

export function getSuggestionProvider() {
  return current;
}

export function setSuggestionProvider(provider) {
  current = provider;
}
