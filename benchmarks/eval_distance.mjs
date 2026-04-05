/**
 *
 * Batch evaluation of the outdoorDistance algorithm across all tracks.
 * Compares computed distance against ground-truth values from metadata_tracks.csv.
 *
 * Usage:
 * You need a folder with a file named metadata_tracks.csv containing the metadata for each track,
 * and subfolders for each track with the sensors data, with at least one file for localization (positions.csv).
 * The metadata file should have a column named "testName" that matches the subfolder names, and a column
 * named "distanceReference" with the ground-truth distance for each track.
 * You can filter tracks by duration with --filter-minutes, and group results by a metadata column with --group-by.
 * The grouping is
 *   node eval_distance.mjs \
 *     --data public/data_realtracks \
 *     --filter-minutes 6 \
 *     --group-by path_curvature \
 *     --out  distance_results.csv
 *
 */
import path from 'path'
import fs from 'node:fs'
import csvReplay from '../src/modules/csvReplay.js'
import txtReplay from '../src/modules/txtReplay.js'
import outdoorDistance from '../src/modules/outdoorDistance.js'

// ─── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const getArg = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : def }

const DATA_DIR = getArg('--data', '../../tracks')
const OUT_CSV = getArg('--out')
const FILTER_MINUTES = parseFloat(getArg('--filter-minutes'))
const GROUP_BY = getArg('--group-by', null)


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
    fs.writeFileSync(OUT_CSV, 'testName,duration,distance,distanceReference\n')
  }

  // ── Load ground-truth metadata ─────────────────────────────────────────────
  if (!fs.existsSync(`${DATA_DIR}/metadata_tracks.csv`)) {
    console.error(`Metadata file not found: ${DATA_DIR}/metadata_tracks.csv`)
    process.exit(1)
  }

  const metaInfo = await csvReplay.parseCSV(fs.readFileSync(`${DATA_DIR}/metadata_tracks.csv`, 'utf-8'))

  if (metaInfo.length === 0) {
    console.error('No metadata entries found in metadata_tracks.csv')
    process.exit(1)
  }


  let results = {}
  let skippedCount = 0
  let tracks = []

  for (const subdir of fs.readdirSync(DATA_DIR).sort()) {
    if (subdir.startsWith('.')) continue  // skip hidden files
    const subPath = path.join(DATA_DIR, subdir)
    if (!fs.statSync(subPath).isDirectory()) continue
    for (const subItem of fs.readdirSync(subPath).sort()) {
      if (subItem.startsWith('.')) continue  // skip hidden files
      const subItemPath = path.join(subPath, subItem)

      // expect finding more subfolders
      if (fs.statSync(subItemPath).isDirectory()) {
        // csv files structure is fixed
        if (fs.existsSync(`${subItemPath}/positions.csv`)) {
          tracks.push({
            type: 'csv',
            testName: subItem,
            positionsPath: `${subItemPath}/positions.csv`,
            stepsPath: fs.existsSync(`${subItemPath}/steps.csv`) ? `${subItemPath}/steps.csv` : null,
          })
        } else {
          // txt file structure is not fixed, we look for any txt file in the subfolders
          for (const subsubItem of fs.readdirSync(subItemPath).sort()) {
            if (subsubItem.startsWith('.')) continue  // skip hidden files
            const subsubItemPath = path.join(subItemPath, subsubItem)
            if (subsubItemPath.endsWith('.txt')) {
              tracks.push({
                type: 'txt',
                testName: subsubItem.split('.txt')[0],
                txtPath: subsubItemPath
              })
            }
          }
        }
      }
    }
  }

  for (const track of tracks) {
    console.log(`  Found track: ${track.type === 'csv' ? track.positionsPath : track.txtPath}`)
    // find the corresponding metadata entry
    const testMeta = metaInfo.find(m => m.testName === track.testName)
    if (!testMeta) {
      console.warn(`    ⚠ No metadata entry found for testName: ${track.testName}, skipping this track`)
      continue
    }

    // skip tests with insufficient duration if --filter-minutes is set
    let testDuration = 0
    let replayer

    if (track.type === 'csv') {
      await csvReplay.loadCsvFiles(fs.readFileSync(track.positionsPath, 'utf-8'), track.stepsPath ? fs.readFileSync(track.stepsPath, 'utf-8') : null)
      console.log(`    Loaded events       : ${csvReplay.events.length}`)
      if (csvReplay.events.length < 2) {
        console.warn(`    ⚠ Skipping, too few events`)
        skippedCount++
        continue
      }
      testDuration = (csvReplay.events[csvReplay.events.length - 1].ms - csvReplay.events[0].ms) / 1000

      replayer = csvReplay
    } else {
      txtReplay.loadTxtFile(fs.readFileSync(track.txtPath, 'utf-8'))
      console.log(`    Loaded lines       : ${txtReplay.lines.length}`)
      if (txtReplay.lines.length < 2) {
        console.warn(`    ⚠ Skipping, too few events`)
        skippedCount++
        continue
      }

      // get the last line, parse the timestamp and compute duration
      const lastLine = txtReplay.lines[txtReplay.lines.length - 1]
      const jsonPart = JSON.parse(lastLine.split('test end ')[1])
      testDuration = jsonPart.duration * 60  // convert minutes to seconds

      replayer = txtReplay
    }

    if (FILTER_MINUTES > 0 &&
      testDuration < (FILTER_MINUTES * 60) - 30 ||
      testDuration > (FILTER_MINUTES * 60) + 30
    ) {
      console.log(`  ⚠ Skipping (duration ${testDuration} s != ${FILTER_MINUTES * 60} s)`)
      skippedCount++
      continue
    }

    // replay positions through outdoorDistance and compute distance
    outdoorDistance.reset()


    replayer.registerPositionCallback((p) => {
      outdoorDistance.addPosition(p)
    })

    replayer.registerEventCallback((e) => {
      if (e === 'test start') {
        outdoorDistance.startTest()
      }
      if (e === 'test end') {
        outdoorDistance.stopTest()
      }
    })

    replayer.startReplay(false)


    replayer.stopReplay()

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

    // end of track loop
  }


  // compute statistics
  console.log(`\n──── Summary ────────────────────────────────`)
  console.log(`Total tracks found: ${tracks.length}`)
  console.log(`Tracks to evaluate after filtering: ${tracks.length - skippedCount}`)
  console.log(`Skipped tests: ${skippedCount}`)
  if (GROUP_BY) {
    for (const group in results) {
      const groupResults = results[group]
      const errs = groupResults.distance.map((d, i) => d - groupResults.reference[i])
      let merr = mean(errs)
      let stdevErr = stdev(errs)
      let loa1 = merr - 1.96 * stdevErr
      let loa2 = merr + 1.96 * stdevErr
      let mdc = (loa2 - loa1) / 2
      console.log(`Group: ${group}`)
      console.log(`  N: ${errs.length}`)
      console.log(`  Mean error: ${merr.toFixed(1)} m`)
      console.log(`  Stddev error: ${stdevErr.toFixed(1)} m`)
      console.log(`  MDC: ${mdc.toFixed(1)} m`)
      console.log(`  MAE: ${mae(errs).toFixed(1)} m`)
      console.log(`  RMSE: ${rmse(errs).toFixed(1)} m`)
      console.log(`  Min error: ${min(errs).toFixed(1)} m`)
      console.log(`  Max error: ${max(errs).toFixed(1)} m`)
    }
  } else {
    const errs = results.distance.map((d, i) => d - results.reference[i])
    let merr = mean(errs)
    let stdevErr = stdev(errs)
    let loa1 = merr - 1.96 * stdevErr
    let loa2 = merr + 1.96 * stdevErr
    let mdc = (loa2 - loa1) / 2
    console.log(`Overall:`)
    console.log(`  N: ${errs.length}`)
    console.log(`  Mean error: ${merr.toFixed(1)} m`)
    console.log(`  Stddev error: ${stdevErr.toFixed(1)} m`)
    console.log(`  MDC: ${mdc.toFixed(1)} m`)
    console.log(`  MAE: ${mae(errs).toFixed(1)} m`)
    console.log(`  RMSE: ${rmse(errs).toFixed(1)} m`)
    console.log(`  Min error: ${min(errs).toFixed(1)} m`)
    console.log(`  Max error: ${max(errs).toFixed(1)} m`)
  }
}

main()
