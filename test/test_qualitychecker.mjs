import assert from 'node:assert/strict'
import { beforeEach, describe, test } from 'node:test'
import qualityChecker from '../src/modules/testQualityChecker.js'

describe('Testing the report checking functions', () => {

  beforeEach(() => {
    qualityChecker.reset()
  })

  test('a 6MWT with no data does not pass sampling check', () => {
    const positions = [] // no samples at all

    for (const pos of positions) {
      qualityChecker.addPosition(pos, true)
    }
    const result = qualityChecker.isSamplingFrequencySufficient()
    assert.strictEqual(result, false)
  })

  test('a 6MWT with little data does not pass sampling check', () => {
    for (let i = 0; i < 36; i++) {
      qualityChecker.addPosition({
        timestamp: new Date().getTime() + i * 10000, // one sample every 10 s
        coords: {
          heading: 0 + Math.sin((i / 10) * 2 * Math.PI) * 10 // little oscillations every 10 seconds
        }
      }, true)
    }

    const result = qualityChecker.isSamplingFrequencySufficient()
    assert.strictEqual(result, false)
  })

  test('a 6MWT with enough data passes sampling check', () => {

    for (let i = 0; i < 360; i++) {
      qualityChecker.addPosition({
        timestamp: new Date().getTime() + i * 1000, // one sample every second
        coords: {
          heading: 0 + Math.sin((i / 10) * 2 * Math.PI) * 10 // little oscillations every 10 seconds
        }
      }, true)
    }

    const result = qualityChecker.isSamplingFrequencySufficient()
    assert.strictEqual(result, true)
  })


  test('a 6MWT with a gap > 30s data does not pass gap check', () => {

    const ts = new Date()
    for (let i = 0; i < 180; i++) {
      qualityChecker.addPosition({
        timestamp: ts.getTime() + i * 1000,
        coords: {
          heading: 0 + Math.sin((i / 10) * 2 * Math.PI) * 10 // little oscillations every 10 seconds
        }
      }, true)
    }

    for (let i = 240; i < 360; i++) {
      qualityChecker.addPosition({
        timestamp: ts.getTime() + i * 1000,
        coords: {
          heading: 0 + Math.sin((i / 10) * 2 * Math.PI) * 10 // little oscillations every 10 seconds
        }
      }, true)
    }

    const result = qualityChecker.isGapsDetected()
    assert.strictEqual(result, true)
  })
})
