/**
 *
 * Batch evaluation of the quality check algorithm across all tracks.
 * Compares computed distance against ground-truth values from metadata_tracks.csv.
 *
 * Usage (from the benchmarks folder):
 *   node eval_classification.mjs \
 *     --data public/data_realtracks \
 *     --filter-minutes 6 \
 *     --out  classification_results.csv
 *
 */
import path from 'path'
import fs from 'node:fs';
import csvReplay from '../src/modules/csvReplay.js'
import txtReplay from '../src/modules/txtReplay.js'
import testQualityChecker from '../src/modules/testQualityChecker.js';

// ─── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const getArg = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : def }

const DATA_DIR = getArg('--data', '../../tracks')
const OUT_CSV = getArg('--out')
const FILTER_MINUTES = parseFloat(getArg('--filter-minutes'))


// ─── Main ─────────────────────────────────────────────────────────────────────
async function main () {
  console.log(`Scanning tracks in : ${DATA_DIR}`)
  console.log(`Ground-truth file  : ${DATA_DIR}/metadata_tracks.csv`)

  // write to the output CSV
  if (OUT_CSV) {
    fs.writeFileSync(OUT_CSV, 'testName,duration,isBadQuality,refIsBadQuality\n')
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
    const hasGaps = testQualityChecker.isGapsDetected()
    const hasLowFreq = !testQualityChecker.isSamplingFrequencySufficient()

    let isBadQuality = hasGaps || hasLowFreq || classification.label >= 2
    let refIsBadQuality = testMeta.path_curvature >= 2 || parseFloat(testMeta.total_gaps_time_gnss) >= 30 || parseFloat(testMeta.fs_gnss) < 0.2


    console.log(`  ✓ Computed curvature: ${classification.label}`)
    console.log(`  ✓ Ground-truth from metadata: ${testMeta.path_curvature}`)
    console.log(`  ✓ Is bad quality: ${isBadQuality}`)
    console.log(`  ✓ Reference is bad quality: ${refIsBadQuality}`)

    // write to the output CSV
    if (OUT_CSV) {
      const row = [
        testMeta.testName,
        testMeta.duration,
        isBadQuality,
        refIsBadQuality
      ]
      fs.appendFileSync(OUT_CSV, row.join(',') + '\n')
    }

    results.classification = results.classification || []
    results.classification.push(isBadQuality)
    results.reference = results.reference || []
    results.reference.push(refIsBadQuality)
  }

  // compute statistics
  console.log(`\n──── Summary ────────────────────────────────`)
  console.log(`Skipped tests: ${skippedCount}`)
  console.log(`Overall:`)
  console.log(`  N: ${results.classification.length}`)
  let correctPredictions = 0
  let confusionMatrix = {}
  for (let i = 0; i < results.classification.length; i++) {
    const predicted = results.classification[i]
    const actual = results.reference[i]
    if (predicted === actual) {
      correctPredictions++
    }
    confusionMatrix[actual] = confusionMatrix[actual] || {}
    confusionMatrix[actual][predicted] = (confusionMatrix[actual][predicted] || 0) + 1
  }
  console.log(` Accuracy: ${(correctPredictions / results.classification.length * 100).toFixed(1)}%`)
  console.log(` Confusion Matrix:`)
  for (const actual in confusionMatrix) {
    console.log(`  ${actual}: ${JSON.stringify(confusionMatrix[actual])}`)
  }

  // compute F1 score
  const tp = confusionMatrix[true]?.[true] || 0
  const fp = confusionMatrix[false]?.[true] || 0
  const fn = confusionMatrix[true]?.[false] || 0
  const precision = tp / (tp + fp)
  const recall = tp / (tp + fn)
  const f1 = 2 * (precision * recall) / (precision + recall)
  console.log(` F1 score: ${f1.toFixed(2)}`)
  console.log(` Precision: ${precision.toFixed(2)}`)
  console.log(` Recall: ${recall.toFixed(2)}`)

}

main()
