import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import qualityChecker from '../src/modules/testQualityChecker.js'

describe('Testing the curvature classifier', () => {

  // TODO: fix
  // test ('a 6MWT no curves is classified as such', () => {
  //   const ts = new Date()
  //     const testReport = {
  //         positions: [
  //         ]
  //     }

  //     for (let i = 0; i < 360; i++) {
  //         testReport.positions.push({
  //             timestamp: new Date(ts.getTime() + i * 1000),
  //             heading: 150 // always same heading, no curves
  //         })
  //     }

  //     const result = classifyCurvature(testReport, 'logistic')
  //     assert.strictEqual(result.label, 0)
  // })

  test('a 6MWT with litle oscillations is classified as straight', () => {
    const ts = new Date()

    for (let i = 0; i < 360; i++) {
      qualityChecker.addPosition({
        timestamp: ts.getTime() + (i * 1000),
        coords: {
          heading: 0 + Math.sin((i / 10) * 2 * Math.PI) * 10 // 10 degree oscillations every 10 seconds
        }
      }, false)
    }

    const result = qualityChecker.classifyCurvature('logistic')
    assert.strictEqual(result.label, 0)
  })

  test('a 6MWT with 3 x 90 degrees curves is classified as moderate', () => {
    const ts = new Date()

    for (let i = 0; i < 90; i++) {
      qualityChecker.addPosition({
        timestamp: ts.getTime() + i * 1000,
        coords: {
          heading: 0
        }
      }, false)
    }

    for (let i = 90; i < 180; i++) {
      qualityChecker.addPosition({
        timestamp: ts.getTime() + i * 1000,
        coords: {
          heading: 90
        }
      }, false)
    }
    for (let i = 180; i < 270; i++) {
      qualityChecker.addPosition({
        timestamp: ts.getTime() + i * 1000,
        coords: {
          heading: 180
        }
      }, false)
    }
    for (let i = 270; i < 360; i++) {
      qualityChecker.addPosition({
        timestamp: ts.getTime() + i * 1000,
        coords: {
          heading: 360
        }
      }, false)
    }

    const result = qualityChecker.classifyCurvature('logistic')
    assert.strictEqual(result.label, 1)
  })

  test('a 6MWT with 10 x 90 degrees curves is classified as moderate', () => {
    const ts = new Date()

    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 36; j++) {
        qualityChecker.addPosition({
          timestamp: ts.getTime() + (i * 10 + j * 1000),
          coords: {
            heading: (i * 90) % 360
          }
        }, false)
      }
    }

    const result = qualityChecker.classifyCurvature('logistic')
    assert.strictEqual(result.label, 1)
  })


  test('a 6MWT with lots of curves is classified as high', () => {
    const ts = new Date()

    for (let i = 0; i < 360; i++) {
      qualityChecker.addPosition({
        timestamp: ts.getTime() + i * 1000,
        coords: {
          heading: 0 + Math.sin((i / 30) * 2 * Math.PI) * 180 // simulate a lot of curves by making the heading oscillate between 0 and 180 degrees every 30 seconds
        }
      }, false)
    }

    const result = qualityChecker.classifyCurvature('logistic')
    assert.strictEqual(result.label, 2)
  })
})
