/**
 *
 * Batch evaluation of the curvature algorithm across all tracks.
 * Compares computed distance against ground-truth values from metadata_tracks.csv.
 *
 * Usage (from the benchmarks folder):
 *   node eval_curvature.mjs \
 *     --data public/data_realtracks \
 *     --filter-minutes 6 \
 *     --out  curvature_results.csv
 *
 */
import path from 'path'
import fs from 'node:fs';
import Papa from 'papaparse'
import { classifyCurvature } from '../src/modules/testQualityCheck.js'

// ─── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const getArg = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : def }

const DATA_DIR = getArg('--data', '../../tracks')
const OUT_CSV = getArg('--out')
const FILTER_MINUTES = parseFloat(getArg('--filter-minutes'))

async function parseCSV (filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      delimiter: ',',
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: resolve,
      error: reject
    })
  })
}


// ─── Main ─────────────────────────────────────────────────────────────────────
async function main () {
  console.log(`Scanning tracks in : ${DATA_DIR}`)
  console.log(`Ground-truth file  : ${DATA_DIR}/metadata_tracks.csv`)

  // write to the output CSV
  if (OUT_CSV) {
    fs.writeFileSync(OUT_CSV, 'testName,subject,isPatient,duration,curvature,curvatureReference\n', 'utf8');
  }

  // ── Load ground-truth metadata ─────────────────────────────────────────────
  if (!fs.existsSync(`${DATA_DIR}/metadata_tracks.csv`)) {
    console.error(`Metadata file not found: ${DATA_DIR}/metadata_tracks.csv`)
    process.exit(1)
  }

  const metaInfo = await parseCSV(`${DATA_DIR}/metadata_tracks.csv`)

  if (metaInfo.data.length === 0) {
    console.error('No metadata entries found in metadata_tracks.csv')
    process.exit(1)
  }

  // ── Discover tracks ────────────────────────────────────────────────────────
  const tracks = {}
  for (const subject of fs.readdirSync(DATA_DIR).sort()) {
    if (subject.startsWith('.')) continue  // skip hidden files
    const subjPath = path.join(DATA_DIR, subject)
    if (!fs.statSync(subjPath).isDirectory()) continue
    for (const trial of fs.readdirSync(subjPath).sort()) {
      if (trial.startsWith('.')) continue  // skip hidden files
      const trialPath = path.join(subjPath, trial)
      tracks[trial] = { subject, trial, path: trialPath }
    }
  }
  if (Object.keys(tracks).length === 0) {
    console.error('No tracks found — check your --data path')
    process.exit(1)
  }
  console.log(`Found ${Object.keys(tracks).length} tracks.\n`)

  let results = {}
  let skippedCount = 0

  for (const testMeta of metaInfo.data) {
    console.log(`\n──── ${testMeta.testName} ────────────────────────`)
    // skip tests with insufficient duration if --filter-minutes is set
    if (FILTER_MINUTES > 0 &&
      testMeta.duration < (FILTER_MINUTES * 60) - 30 ||
      testMeta.duration > (FILTER_MINUTES * 60) + 30
    ) {
      console.log(`  ⚠ Skipping (duration ${testMeta.duration} s < ${FILTER_MINUTES * 60} s)`)
      skippedCount++
      continue
    }
    const gpsCsv = await parseCSV(tracks[testMeta.testName].path + '/positions.csv')
    console.log(`Positions rows       : ${gpsCsv.data.length}`)

    if (gpsCsv.data.length < 2) {
      console.error(`  ✗  Discarded, too few positions`)
      continue
    }

    const stepsCsv = await parseCSV(tracks[testMeta.testName].path + '/steps.csv')
    console.log(`Steps rows           : ${stepsCsv.data.length}`)

    let positions = gpsCsv.data.map(row => ({
      timestamp: row.ms,
      coords: {
        longitude: row.longitude,
        latitude: row.latitude,
        accuracy: row.confInterval,
        altitude: row.altitude,
        heading: row.heading
      }
    })).filter((p) => p.timestamp >= 0)

    const classification = classifyCurvature(positions, 'logistic')

    console.log(`  ✓ Computed curvature: ${classification.label}`)
    console.log(`  ✓ Ground-truth from metadata: ${testMeta.path_curvature}`)

    // write to the output CSV
    if (OUT_CSV) {
      const row = [
        testMeta.testName,
        testMeta.subject,
        testMeta.isPatient,
        testMeta.duration,
        classification.label,
        testMeta.path_curvature
      ]
      fs.appendFileSync(OUT_CSV, row.join(',') + '\n')
    }

    results.curvature = results.curvature || []
    results.curvature.push(classification.label)
    results.reference = results.reference || []
    results.reference.push(testMeta.path_curvature)
  }

  // compute statistics
  console.log(`\n──── Summary ────────────────────────────────`)
  console.log(`Skipped tests: ${skippedCount}`)
  console.log(`Overall:`)
  console.log(`  N: ${results.curvature.length}`)
  let correctPredictions = 0
  let confusionMatrix = {}
  for (let i = 0; i < results.curvature.length; i++) {
    const predicted = results.curvature[i]
    const actual = results.reference[i]
    if (predicted === actual) {
      correctPredictions++
    }
    confusionMatrix[actual] = confusionMatrix[actual] || {}
    confusionMatrix[actual][predicted] = (confusionMatrix[actual][predicted] || 0) + 1
  }
  console.log(` Accuracy: ${(correctPredictions / results.curvature.length * 100).toFixed(1)}%`)
  console.log(` Confusion Matrix:`)
  for (const actual in confusionMatrix) {
    console.log(`  ${actual}: ${JSON.stringify(confusionMatrix[actual])}`)
  }
}

main()
