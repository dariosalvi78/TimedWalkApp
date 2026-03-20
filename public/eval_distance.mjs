/**
 * eval_distance.mjs
 *
 * Batch evaluation of the outdoorDistance algorithm across all tracks.
 * Compares computed distance against ground-truth values from metadata_tracks.csv.
 *
 * Requires resolve-extensions.mjs loader so Node can import the source files
 * that use bare specifiers (no .js extension), as written for Vite/Webpack.
 *
 * Usage (from the project root):
 *   node --import ./resolve-extensions.mjs public/eval_distance.mjs
 *
 * With custom paths:
 *   node --import ./resolve-extensions.mjs public/eval_distance.mjs \
 *     --data public/data_realtracks \
 *     --meta public/metadata_tracks.csv \
 *     --out  distance_results.csv
 *
 * Node 18 alternative (--loader is the older spelling):
 *   node --loader ./resolve-extensions.mjs public/eval_distance.mjs
 */

import fs   from 'fs'
import path from 'path'
import outdoorDistance from '../src/modules/outdoorDistance.js'

// ─── CLI args ────────────────────────────────────────────────────────────────
const args   = process.argv.slice(2)
const getArg = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : def }

const DATA_DIR  = getArg('--data', 'public/data_realtracks')
const META_PATH = getArg('--meta', 'public/metadata_tracks.csv')
const OUT_CSV   = getArg('--out',  'distance_results.csv')

// ─── CSV parser ──────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim())
    const row  = {}
    headers.forEach((h, i) => { row[h] = cols[i] })
    return row
  })
}

// ─── Convert CSV row → position object outdoorDistance expects ────────────────
function csvRowToPosition(r) {
  return {
    timestamp: r.ms,
    heading:   (r.heading >= 0 && !isNaN(r.heading)) ? r.heading : -1,
    coords: {
      latitude:  r.latitude,
      longitude: r.longitude,
      accuracy:  r.accuracy,
      altitude:  r.altitude ?? null,
      heading:   r.heading,
    },
  }
}

// ─── Run the full outdoorDistance lifecycle on one track ──────────────────────
// outdoorDistance is a singleton object with mutable state, so we must
// call reset() between tracks.
function computeDistance(positionsAsc) {
  outdoorDistance.reset()

  // Feed the first position before startTest so selectPosition has an anchor
  outdoorDistance.addPosition(csvRowToPosition(positionsAsc[0]))
  outdoorDistance.startTest()

  for (let i = 1; i < positionsAsc.length; i++) {
    outdoorDistance.addPosition(csvRowToPosition(positionsAsc[i]))
  }

  outdoorDistance.stopTest()

  return {
    distance:     outdoorDistance.distance,
    signalReport: outdoorDistance.getEstimationReportQuality(),
  }
}

// ─── Track discovery ──────────────────────────────────────────────────────────
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

// ─── Statistics helpers ───────────────────────────────────────────────────────
const mean = arr  => arr.reduce((a, b) => a + b, 0) / arr.length
const mae  = errs => mean(errs.map(e => Math.abs(e)))
const rmse = errs => Math.sqrt(mean(errs.map(e => e ** 2)))

// ─── Main ─────────────────────────────────────────────────────────────────────
function main() {
  console.log(`\nScanning tracks in : ${DATA_DIR}`)
  console.log(`Ground-truth file  : ${META_PATH}`)

  // ── Load ground-truth metadata ─────────────────────────────────────────────
  if (!fs.existsSync(META_PATH)) {
    console.error(`\n[INIT] ✗ metadata file not found: ${META_PATH}`)
    process.exit(1)
  }
  const metaRows = parseCSV(fs.readFileSync(META_PATH, 'utf8'))

  // testName in metadata: "<subject>_<session>" e.g. "0_0"
  const groundTruth = {}
  for (const row of metaRows) {
    if (row.testName && row.distanceReference) {
      groundTruth[row.testName] = parseFloat(row.distanceReference)
    }
  }
  console.log(`Loaded ${Object.keys(groundTruth).length} ground-truth entries.\n`)

  // ── Discover tracks ────────────────────────────────────────────────────────
  const tracks = findAllTracks(DATA_DIR)
  if (tracks.length === 0) {
    console.error('[INIT] ✗ No tracks found — check your --data path')
    process.exit(1)
  }
  console.log(`Found ${tracks.length} tracks.\n`)

  const results = []
  const failed  = []

  for (const { subject, trial, posFile, trackId } of tracks) {
    console.log(`\n──── ${trackId} ────────────────────────`)
    try {
      const rows = parseCSV(fs.readFileSync(posFile, 'utf8'))
      console.log(`  [load] CSV rows (raw)        : ${rows.length}`)

      const positions = rows
        .map(r => ({
          ms:        parseFloat(r.ms        ?? r.timestamp ?? 0),
          heading:   parseFloat(r.heading   ?? r.course    ?? 'NaN'),
          latitude:  parseFloat(r.latitude  ?? r.lat       ?? 'NaN'),
          longitude: parseFloat(r.longitude ?? r.lon       ?? 'NaN'),
          accuracy:  parseFloat(r.accuracy  ?? 10),
          altitude:  r.altitude !== undefined ? parseFloat(r.altitude) : null,
        }))
        .filter(r => r.ms > 0 && !isNaN(r.latitude) && !isNaN(r.longitude) && !isNaN(r.accuracy))
        .sort((a, b) => a.ms - b.ms)

      console.log(`  [load] positions after filter: ${positions.length}`)

      if (positions.length < 2) {
        failed.push({ trackId, reason: 'fewer than 2 valid positions' })
        console.log(`  ✗ Too few positions`)
        continue
      }

      const { distance: computed, signalReport } = computeDistance(positions)

      // testName = "subject_trial" to match metadata
      const testName  = `${subject}_${trial}`
      const reference = groundTruth[testName]
      const hasRef    = reference !== undefined && !isNaN(reference)
      const error     = hasRef ? computed - reference : null
      const errorPct  = hasRef ? (error / reference) * 100 : null

      results.push({
        trackId, subject, trial, testName,
        computed:        +computed.toFixed(2),
        reference:       hasRef ? +reference.toFixed(2) : null,
        error:           error    !== null ? +error.toFixed(2)    : null,
        errorPct:        errorPct !== null ? +errorPct.toFixed(2) : null,
        nSamples:        positions.length,
        meanDt_ms:       signalReport.meanDt != null ? +signalReport.meanDt.toFixed(1) : null,
        maxDt_ms:        signalReport.maxDt  != null ? +signalReport.maxDt.toFixed(1)  : null,
        samplingFreq_hz: +signalReport.samplingFrequency.toFixed(3),
        warnLowSampling: signalReport.warningLowSampling,
        warnLargeGap:    signalReport.warningLargeGap,
        hasWarning:      signalReport.hasWarning,
      })

      const refStr  = hasRef
        ? `ref=${reference.toFixed(1)} m  err=${error.toFixed(1)} m (${errorPct.toFixed(1)} %)`
        : 'no ground-truth entry'
      const warnStr = signalReport.hasWarning
        ? `  ⚠ ${signalReport.warningMessages.join(', ')}`
        : ''

      console.log(`  ✓ computed=${computed.toFixed(1)} m   ${refStr}   n=${positions.length}   f=${signalReport.samplingFrequency.toFixed(3)} Hz${warnStr}`)

    } catch (err) {
      failed.push({ trackId, reason: err.message })
      console.error(`  ✗ ERROR: ${err.message}`)
    }
  }

  // ── Aggregate statistics ───────────────────────────────────────────────────
  const paired = results.filter(r => r.error !== null)
  console.log('\n─── Aggregate statistics (tracks with ground truth) ──────────────')
  if (paired.length > 0) {
    const errs = paired.map(r => r.error)
    const pcts = paired.map(r => r.errorPct)
    console.log(`  Tracks evaluated : ${paired.length}`)
    console.log(`  Mean error       : ${mean(errs).toFixed(2)} m`)
    console.log(`  MAE              : ${mae(errs).toFixed(2)} m`)
    console.log(`  RMSE             : ${rmse(errs).toFixed(2)} m`)
    console.log(`  Mean error %     : ${mean(pcts).toFixed(2)} %`)
    console.log(`  MAE %            : ${mae(pcts).toFixed(2)} %`)
  } else {
    console.log('  No paired results. Check testName format matches "<subject>_<trial>".')
  }

  if (failed.length) {
    console.log(`\n  Failed tracks: ${failed.length}`)
    for (const e of failed) console.log(`    ${e.trackId}: ${e.reason}`)
  }

  // ── Save CSV ───────────────────────────────────────────────────────────────
  const header  = 'trackId,subject,trial,testName,computed_m,reference_m,error_m,error_pct,nSamples,meanDt_ms,maxDt_ms,samplingFreq_hz,warnLowSampling,warnLargeGap,hasWarning'
  const csvRows = results.map(r =>
    [r.trackId, r.subject, r.trial, r.testName,
     r.computed, r.reference ?? '', r.error ?? '', r.errorPct ?? '',
     r.nSamples, r.meanDt_ms ?? '', r.maxDt_ms ?? '', r.samplingFreq_hz,
     r.warnLowSampling, r.warnLargeGap, r.hasWarning].join(',')
  )
  fs.writeFileSync(OUT_CSV, [header, ...csvRows].join('\n'))
  console.log(`\nResults saved to: ${OUT_CSV}\n`)
}

main()
