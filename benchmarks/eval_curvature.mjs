/**
 * eval_curvature.mjs
 *
 * Batch evaluation of the curve classifier across all tracks.
 * Classification logic is imported directly from curveClassifier.js.
 *
 * Usage (from the project root):
 *   node public/eval_curvature.mjs
 *
 *   node public/eval_curvature.mjs --data public/data_realtracks --out curvature_results.csv
 */

import fs   from 'fs'
import path from 'path'
import curveClassifier from '../src/modules/curveClassifier.js'

// ─── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const getArg = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : def }

const DATA_DIR = getArg('--data', 'public/data_realtracks')
const OUT_CSV  = getArg('--out',  'curvature_results_withimport.csv')

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
  console.log(`\nScanning tracks in: ${DATA_DIR}\n`)

  const tracks = findAllTracks(DATA_DIR)
  if (tracks.length === 0) {
    console.error('[INIT] No tracks found — check your --data path')
    process.exit(1)
  }
  console.log(`Found ${tracks.length} tracks.\n`)

  const results = []
  const errors  = []

  for (const { subject, trial, posFile, trackId } of tracks) {
    console.log(`\n──── ${trackId} ────────────────────────`)
    try {
      const rows = parseCSV(fs.readFileSync(posFile, 'utf8'))
      console.log(`  [load] CSV rows (raw)        : ${rows.length}`)

      // curveClassifier.subsampleHeadings expects:
      //   - positions sorted newest-first (it calls .reverse() internally)
      //   - each row has { timestamp, heading } fields
      // So we parse ascending, then reverse to match app behaviour.
      const positions = rows
        .map(r => ({
          timestamp: parseFloat(r.ms ?? r.timestamp ?? 0),
          heading:   parseFloat(r.heading ?? r.course ?? 0),
          latitude:  parseFloat(r.latitude ?? r.lat ?? 0),
          longitude: parseFloat(r.longitude ?? r.lon ?? 0),
        }))
        .filter(r => r.timestamp > 0 && !isNaN(r.heading) && r.heading >= 0)
        .sort((a, b) => b.timestamp - a.timestamp) // newest-first, matching app

      console.log(`  [load] positions after filter: ${positions.length}  (timestamp>0, heading≥0, not NaN)`)

      if (positions.length === 0) {
        errors.push({ trackId, reason: 'all rows filtered out — check ms and heading column names' })
        console.log(`  [load] No valid positions remain`)
        continue
      }

      // classifyLogistic expects a testReport object with a positions array
      const result = curveClassifier.classifyLogistic({ positions })

      if (!result) {
        errors.push({ trackId, reason: 'classifier returned null (too few samples after subsampling?)' })
        continue
      }

      results.push({ trackId, subject, trial, ...result })

      const probs = result.probabilities.map(p => p.toFixed(2)).join(' | ')
      console.log(
        `  ✓ label=${result.label}  label_txt="${result.label_txt}"` +
        `  p=[${probs}]`
      )
    } catch (err) {
      errors.push({ trackId, reason: err.message })
      console.error(` ERROR: ${err.message}`)
      console.error(err.stack)
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n─── Summary ───────────────────────────────────────────')
  const counts = {}
  for (const r of results) counts[r.label_txt] = (counts[r.label_txt] ?? 0) + 1
  for (const [label, n] of Object.entries(counts)) {
    console.log(`  ${label.padEnd(22)}: ${n} tracks`)
  }
  if (errors.length) {
    console.log(`\n  Failed tracks: ${errors.length}`)
    for (const e of errors) console.log(`    ${e.trackId}: ${e.reason}`)
  }

  // ── Save CSV ───────────────────────────────────────────────────────────────
  const featureKeys = results[0] ? Object.keys(results[0].features) : []
  const header = ['trackId','subject','trial','label','label_txt',
                  ...featureKeys,
                  'prob_0','prob_1','prob_2'].join(',')
  const csvRows = results.map(r =>
    [r.trackId, r.subject, r.trial, r.label, r.label_txt,
     ...featureKeys.map(k => r.features[k]),
     ...r.probabilities
    ].join(',')
  )
  fs.writeFileSync(OUT_CSV, [header, ...csvRows].join('\n'))
  console.log(`\nResults saved to: ${OUT_CSV}\n`)
}

main()
