/**
 * eval_curvature.mjs
 *
 * Batch evaluation of the curve classifier across all tracks.
 *
 * Usage (from the project root):
 *   node public/eval_curvature.mjs
 *
 * Or with a custom data dir and model path:
 *   node public/eval_curvature.mjs --data public/data_realtracks --model src/assets/curve_model.json
 *
 * Output: a table printed to console + results saved to curvature_results.csv
 */

import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'

// ─── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const getArg = (flag, def) => {
  const i = args.indexOf(flag)
  return i !== -1 ? args[i + 1] : def
}
const DATA_DIR  = getArg('--data',  'public/data_realtracks')
const MODEL_PATH = getArg('--model', 'src/assets/pipeline_params.json')
const OUT_CSV   = getArg('--out',   'curvature_results.csv')

// ─── Load model ──────────────────────────────────────────────────────────────
const require = createRequire(import.meta.url)
const model = JSON.parse(fs.readFileSync(MODEL_PATH, 'utf8'))

// ─── CSV parser ──────────────────────────────────────────────────────────────
/**
 * Parses a CSV string into an array of objects.
 * Handles quoted fields and trims whitespace.
 */
function parseCSV(text) {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim())
    const row = {}
    headers.forEach((h, i) => { row[h] = cols[i] })
    return row
  })
}


/* =========================
   --- BASIC UTILITIES -----
   ========================= */

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function variance(arr) {
  const m = mean(arr)
  return mean(arr.map(x => (x - m) ** 2))
}

function std(arr) {
  return Math.sqrt(variance(arr))
}

function skewness(arr) {
  const m = mean(arr)
  const s = std(arr)
  if (s === 0) return 0
  return mean(arr.map(x => ((x - m) / s) ** 3))
}

function kurtosis(arr) {
  const m = mean(arr)
  const s = std(arr)
  if (s === 0) return 0
  return mean(arr.map(x => ((x - m) / s) ** 4)) - 3
}


/* =========================
   --- SUBSAMPLING ---------
   ========================= */

function subsampleHeadings(positions) {
  let buffer = []
  let deltaT = 0
  let prevMs = 0
  
  const ordered = [...positions]//.reverse() 
  const subsampledHeadings = []
  const subsampledTimestamps = []

      
    // const row = ordered[0]
    // const timestamp = row.ms
    // console.log("Row: ", row, ", timestamp: ", timestamp)

  for (let i = 0; i < ordered.length; i++) {
    
    const row = ordered[i]
    const timestamp = row.ms

    if (timestamp <= 0) continue

    // FIRST VALID SAMPLE
    if (prevMs === 0) {
      prevMs = timestamp
      buffer.push(row)
      console.log("First valid sample")
      continue
    }
    
    const dt = timestamp - prevMs

    if (deltaT < 5000) {
      deltaT += dt
      buffer.push(row)
      prevMs = timestamp
    } else {
      deltaT += dt
      buffer.push(row)
      prevMs = timestamp

      subsampledHeadings.push(buffer[0].heading)
      subsampledTimestamps.push(buffer[0].ms)

      // reset
      deltaT = 0
      buffer = []
    }
  }
  console.log("Length of subsampleHeadings: ", subsampledHeadings.length)
  console.log("Length of subsampled timestamps: ", subsampledTimestamps.length)
  console.log("Timestamp[0]:", subsampledTimestamps[0])
  return {
    headings: subsampledHeadings,
    timestamps: subsampledTimestamps
  }
}

/* =========================
   --- FEATURE EXTRACTION --
   ========================= */

function computeHeadingFeatures(headings, timestamps) {
  if (!headings || headings.length < 3) {
    console.log("Less than 3 samples")
    return null
  }
  console.log("Timestamps: ", timestamps)
  // remove NaNs
  const clean = []
  for (let i = 0; i < headings.length; i++) {
    if (!isNaN(headings[i]) && !isNaN(timestamps[i])) {

      clean.push({ h: headings[i], t: timestamps[i] })
    }
  }

  if (clean.length < 3) {
    console.log("Clean.length<3")
    return null
  }

  headings = clean.map(x => x.h)

  // -----------------------------
  // BASIC STATS
  // -----------------------------
  const heading_var = variance(headings)
  const heading_kurtosis = kurtosis(headings)
  const heading_skewness = skewness(headings)

  // const [heading_acfpeak, heading_acflag] = computingAutocorrelation(headings)

  // -----------------------------
  // CIRCULAR DIFFERENCES
  // -----------------------------
  const dtheta = []
  for (let i = 1; i < headings.length; i++) {
    let diff = headings[i] - headings[i - 1]
    // diff = ((diff + 180) % 360) - 180
    diff = (((diff + 180) % 360) + 360) % 360 - 180
    dtheta.push(diff)
  }

  const abs_dtheta = dtheta.map(Math.abs)
  const mean_abs_dtheta = mean(abs_dtheta)

  // -----------------------------
  // TURN EVENTS
  // -----------------------------
  const turn_threshold = 20
  const turn_events = abs_dtheta.filter(x => x > turn_threshold).length

  // -----------------------------
  // ZERO CROSSING RATE
  // -----------------------------
  let zero_crossings = 0
  for (let i = 1; i < dtheta.length; i++) {
    const prev = dtheta[i - 1]
    const curr = dtheta[i]
    if ((prev > 0 && curr < 0) || (prev < 0 && curr > 0)) {
        zero_crossings++
        }
    }

  const zero_crossing_rate = zero_crossings / dtheta.length
  console.log("Ok, computed features")
  return {
    turn_events,
    mean_abs_dtheta,
    heading_kurtosis,
    heading_var,
    zero_crossing_rate,
    // heading_acfpeak,
    heading_skewness,
    // heading_acflag
  }
}

/* =========================
   --- MODEL INFERENCE -----
   ========================= */

function standardize(features) {
  const mean = model.scaler.mean
  const scale = model.scaler.scale

  return features.map((x, i) => {
    const s = scale[i] === 0 ? 1 : scale[i]
    return (x - mean[i]) / s
  })
}

// ─── Softmax ──────────────────────────────────────────────────────────────────
function softmax(scores) {
  const max = Math.max(...scores)          // subtract max for numerical stability
  const exps = scores.map(s => Math.exp(s - max))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map(e => e / sum)
}
function classifyLogistic(positions) {
  // ── 1. Subsampling ──────────────────────────────────────────────────────────
  const { headings, timestamps } = subsampleHeadings(positions)
  console.log(`  [classify] positions total   : ${positions.length}`)
  console.log(`  [classify] subsampled points : ${headings.length}`)

  if (headings.length < 3) {
    console.log(`  [classify] ✗ Too few subsampled points (need ≥ 3)`)
    return null
  }

  // ── 2. Features ─────────────────────────────────────────────────────────────
  const f = computeHeadingFeatures(headings, timestamps)
  if (!f) {
    console.log(`  [classify] ✗ computeHeadingFeatures returned null`)
    return null
  }

  // IMPORTANT: order must match training
  const featureVector = [
    f.turn_events,
    f.mean_abs_dtheta,
    f.heading_kurtosis,
    f.heading_var,
    f.zero_crossing_rate,
    f.heading_skewness,
  ]
  console.log(`  [classify] features          :`, featureVector.map(v => +v.toFixed(4)))

  // ── 3. Standardize ──────────────────────────────────────────────────────────
  const x = standardize(featureVector)
  console.log(`  [classify] standardized      :`, x.map(v => +v.toFixed(4)))

  // ── 4. Linear scores ────────────────────────────────────────────────────────
  const coefs      = model.model.coef
  const intercepts = model.model.intercept
  const classes    = model.model.classes

  // Sanity check: feature vector length vs model expectation
  if (featureVector.length !== coefs[0].length) {
    console.error(`  [classify] ✗ Feature length mismatch! featureVector=${featureVector.length}, model expects=${coefs[0].length}`)
    return null
  }

  const rawScores     = coefs.map((row, i) => row.reduce((s, c, j) => s + c * x[j], 0) + intercepts[i])
  const probabilities = softmax(rawScores)
  const maxIdx        = probabilities.reduce((best, p, i) => p > probabilities[best] ? i : best, 0)

  console.log(`  [classify] raw scores        :`, rawScores.map(v => +v.toFixed(4)))
  console.log(`  [classify] probabilities     :`, probabilities.map(v => +v.toFixed(4)))
  console.log(`  [classify] → predicted class : ${classes[maxIdx]}`)

  const labelMap = { 0: 'straight', 1: 'moderate curvature', 2: 'high curvature' }

  return {
    class:         classes[maxIdx],
    label:         labelMap[classes[maxIdx]],
    probabilities: probabilities.map(p => +p.toFixed(4)),
    nSamples:      positions.length,
    nSubsamp:      headings.length,
    features:      Object.fromEntries(Object.entries(f).map(([k, v]) => [k, +v.toFixed(4)]))
  }
}

// ─── Track discovery ─────────────────────────────────────────────────────────
function findAllTracks(dataDir) {
  const tracks = []
  for (const subject of fs.readdirSync(dataDir).sort()) {
    const subjPath = path.join(dataDir, subject)
    if (!fs.statSync(subjPath).isDirectory()) continue
    for (const trial of fs.readdirSync(subjPath).sort()) {
      const trialPath = path.join(subjPath, trial)
      const posFile   = path.join(trialPath, 'positions.csv')
      if (fs.existsSync(posFile)) {
        tracks.push({ subject, trial, posFile, trackId: `${subject}/${trial}` })
      }
    }
  }
  return tracks
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function main() {
  console.log(`\nLoading model from: ${MODEL_PATH}`)
  console.log(`Scanning tracks in: ${DATA_DIR}\n`)

  const tracks = findAllTracks(DATA_DIR)
  console.log(`Found ${tracks.length} tracks.\n`)

  const results = []
  const errors  = []

  if (tracks.length === 0) {
    console.error('[INIT] ✗ No tracks found — check your --data path')
    process.exit(1)
  }

  for (const { subject, trial, posFile, trackId } of tracks) {
    console.log(`\n──── ${trackId} ────────────────────────`)
    try {
      const rows = parseCSV(fs.readFileSync(posFile, 'utf8'))
      console.log(`  [load] CSV rows (raw)        : ${rows.length}`)

      const positions = rows
        .map(r => ({
          ms:        parseFloat(r.ms        ?? r.timestamp ?? 0),
          heading:   parseFloat(r.heading   ?? r.course    ?? 0),
          latitude:  parseFloat(r.latitude  ?? r.lat       ?? 0),
          longitude: parseFloat(r.longitude ?? r.lon       ?? 0),
        }))
        .filter(r => r.ms > 0 && !isNaN(r.heading) && r.heading >= 0)

      console.log(`  [load] positions after filter: ${positions.length}  (ms>0, heading≥0, not NaN)`)

      if (positions.length === 0) {
        errors.push({ trackId, reason: 'all rows filtered out — check ms and heading column names' })
        console.log(`  [load] ✗ No valid positions remain`)
        continue
      }

      const result = classifyLogistic(positions)

      if (!result) {
        errors.push({ trackId, reason: 'classifier returned null (too few samples after subsampling?)' })
        continue
      }

      results.push({ trackId, subject, trial, ...result })

      const probs = result.probabilities.map(p => p.toFixed(2)).join(' | ')
      console.log(
        `  ✓ class=${result.class}  label="${result.label}"` +
        `  n=${result.nSamples}  sub=${result.nSubsamp}  p=[${probs}]`
      )
    } catch (err) {
      errors.push({ trackId, reason: err.message })
      console.error(`  ✗ ERROR: ${err.message}`)
      console.error(err.stack)
    }
  }


  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n─── Summary ───────────────────────────────────────────')
  const counts = {}
  for (const r of results) counts[r.label] = (counts[r.label] ?? 0) + 1
  for (const [label, n] of Object.entries(counts)) {
    console.log(`  ${label.padEnd(22)}: ${n} tracks`)
  }
  if (errors.length) {
    console.log(`\n  Failed tracks: ${errors.length}`)
    for (const e of errors) console.log(`    ${e.trackId}: ${e.reason}`)
  }

  // ── Save CSV ───────────────────────────────────────────────────────────────
  const featureKeys = results[0] ? Object.keys(results[0].features) : []
  const header = ['trackId','subject','trial','class','label','nSamples','nSubsamp',
                  ...featureKeys, 'score_0','score_1','score_2'].join(',')
  const csvRows = results.map(r =>
    [r.trackId, r.subject, r.trial, r.class, r.label, r.nSamples, r.nSubsamp,
     ...featureKeys.map(k => r.features[k]),
      ...r.probabilities
    ].join(',')
  )
  fs.writeFileSync(OUT_CSV, [header, ...csvRows].join('\n'))
  console.log(`\nResults saved to: ${OUT_CSV}\n`)
}

main()
