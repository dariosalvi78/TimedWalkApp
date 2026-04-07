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
import csvReplay from '../src/modules/csvReplay.js'
import txtReplay from '../src/modules/txtReplay.js'
import qualityChecker from '../src/modules/testQualityChecker.js'
import testQualityChecker from '../src/modules/testQualityChecker.js';

// ─── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const getArg = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : def }

const DATA_DIR = getArg('--data', '../../tracks')
const OUT_CSV = getArg('--out')
const FILTER_MINUTES = parseFloat(getArg('--filter-minutes'))

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
    fs.writeFileSync(OUT_CSV, 'testName,duration,curvature,curvatureReference\n')
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

    testQualityChecker.reset()



    replayer.registerEventCallback((e) => {
      if (e === 'test start') {
        replayer.registerPositionCallback((p) => {
          testQualityChecker.addPosition(p)
        })
      }
    })

    replayer.startReplay(false)

    replayer.stopReplay()

    const classification = testQualityChecker.classifyCurvature('logistic')

    console.log(`  ✓ Computed curvature: ${classification.label}`)
    console.log(`  ✓ Ground-truth from metadata: ${testMeta.path_curvature}`)

    // write to the output CSV
    if (OUT_CSV) {
      const row = [
        testMeta.testName,
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
