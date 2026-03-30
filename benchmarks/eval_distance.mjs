/**
 *
 * Batch evaluation of the outdoorDistance algorithm across all tracks.
 * Compares computed distance against ground-truth values from metadata_tracks.csv.
 *
 * Usage (from the benchmarks folder):
 *   node eval_distance.mjs \
 *     --data public/data_realtracks \
 *     --filter-minutes 6 \
 *     --group-by path_curvature \
 *     --out  distance_results.csv
 *
 */
import path from 'path'
import fs from 'node:fs';
import Papa from 'papaparse'
import outdoorDistance from '../src/modules/outdoorDistance.js'

// ─── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const getArg = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : def }

const DATA_DIR = getArg('--data', '../../tracks')
const OUT_CSV = getArg('--out')
const FILTER_MINUTES = parseFloat(getArg('--filter-minutes'))
const GROUP_BY = getArg('--group-by', null)

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


// ─── Statistics helpers ───────────────────────────────────────────────────────
const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length
const stdev = arr => {
  const m = mean(arr)
  return Math.sqrt(mean(arr.map(x => (x - m) ** 2)))
}
const mae = errs => mean(errs.map(e => Math.abs(e)))
const rmse = errs => Math.sqrt(mean(errs.map(e => e ** 2)))
const min = arr => Math.min(...arr)
const max = arr => Math.max(...arr)

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main () {
  console.log(`Scanning tracks in : ${DATA_DIR}`)
  console.log(`Ground-truth file  : ${DATA_DIR}/metadata_tracks.csv`)

  // write to the output CSV
  if (OUT_CSV) {
    fs.writeFileSync(OUT_CSV, 'testName,subject,isPatient,duration,distance,distanceReference\n')
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

    // replay positions through outdoorDistance and compute distance
    outdoorDistance.reset()

    let lastStepsI = 0
    let lastSteps = null
    for (let i = 0; i < gpsCsv.data.length; i++) {
      const row = gpsCsv.data[i]
      if (row.ms === undefined || row.latitude === undefined || row.longitude === undefined) {
        console.warn(`  ⚠ Skipping invalid position row ${i} (missing ms, latitude, or longitude)`)
        continue
      }
      // find steps if available
      if (stepsCsv && stepsCsv.data.length > 0) {
        for (let j = lastStepsI; (j < stepsCsv.data.length) && (stepsCsv.data[j].ms < row.ms); j++) {
          lastStepsI = j
          lastSteps = stepsCsv.data[j].steps
        }
      }

      // { timestamp: ttt, coords: {longitude: xx, latitude: yy, accuracy: zz, altitude: bbb}, steps: ss}
      outdoorDistance.addPosition({
        timestamp: row.ms,
        coords: {
          longitude: row.longitude,
          latitude: row.latitude,
          accuracy: row.confInterval,
          altitude: row.altitude
        },
        steps: lastSteps == null ? undefined : lastSteps,
      })

      // test starts when ms >=0
      if (!outdoorDistance.started && row.ms >= 0) {
        outdoorDistance.startTest()
      }
    }

    outdoorDistance.stopTest()

    const distance = outdoorDistance.getDistance()

    console.log(`  ✓ Computed distance: ${distance.toFixed(1)} m`)
    console.log(`  ✓ Ground-truth from metadata: ${testMeta.distanceReference.toFixed(1)} m`)

    // write to the output CSV
    if (OUT_CSV) {
      const row = [
        testMeta.testName,
        testMeta.subject,
        testMeta.isPatient,
        testMeta.duration,
        distance.toFixed(2),
        testMeta.distanceReference.toFixed(2)
      ]
      fs.appendFileSync(OUT_CSV, row.join(',') + '\n')
    }


    // if group by is specified
    if (GROUP_BY) {
      results[testMeta[GROUP_BY]] = results[testMeta[GROUP_BY]] || {}
      results[testMeta[GROUP_BY]].distance = results[testMeta[GROUP_BY]].distance || []
      results[testMeta[GROUP_BY]].distance.push(distance)
      results[testMeta[GROUP_BY]].reference = results[testMeta[GROUP_BY]].reference || []
      results[testMeta[GROUP_BY]].reference.push(testMeta.distanceReference)
    } else {
      results.distance = results.distance || []
      results.distance.push(distance)
      results.reference = results.reference || []
      results.reference.push(testMeta.distanceReference)
    }
  }
  // compute statistics
  console.log(`\n──── Summary ────────────────────────────────`)
  console.log(`Skipped tests: ${skippedCount}`)
  if (GROUP_BY) {
    for (const group in results) {
      const groupResults = results[group]
      const errs = groupResults.distance.map((d, i) => d - groupResults.reference[i])
      console.log(`Group: ${group}`)
      console.log(`  N: ${errs.length}`)
      console.log(`  Mean error: ${mean(errs).toFixed(1)} m`)
      console.log(`  Stddev error: ${stdev(errs).toFixed(1)} m`)
      console.log(`  MAE: ${mae(errs).toFixed(1)} m`)
      console.log(`  RMSE: ${rmse(errs).toFixed(1)} m`)
      console.log(`  Min error: ${min(errs).toFixed(1)} m`)
      console.log(`  Max error: ${max(errs).toFixed(1)} m`)
    }
  } else {
    const errs = results.distance.map((d, i) => d - results.reference[i])
    console.log(`Overall:`)
    console.log(`  N: ${errs.length}`)
    console.log(`  Mean error: ${mean(errs).toFixed(1)} m`)
    console.log(`  Stddev error: ${stdev(errs).toFixed(1)} m`)
    console.log(`  MAE: ${mae(errs).toFixed(1)} m`)
    console.log(`  RMSE: ${rmse(errs).toFixed(1)} m`)
    console.log(`  Min error: ${min(errs).toFixed(1)} m`)
    console.log(`  Max error: ${max(errs).toFixed(1)} m`)
  }
}

main()
