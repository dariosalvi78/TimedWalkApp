import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {checkReportSampling, checkReportGaps} from '../src/modules/testQualityCheck.js'

describe('Testing the report checking functions', () => {

  test ('a 6MWT with little data does not pass sampling check', () => {
        const testReport = {
            positions: [
            ]
        }

        const result = checkReportSampling(testReport)
        assert.strictEqual(result, false)
  })


  test ('a 6MWT with a gap > 30s data does not pass gap check', () => {
    const testReport = {
        positions: []
      }

        const ts = new Date()
        for (let i = 0; i < 180; i++) {
            testReport.positions.push({
                timestamp: new Date(ts.getTime() + i * 1000),
                heading: 0 + Math.sin((i/10) * 2* Math.PI)*10 // little oscillations every 10 seconds
            })
        }

        for (let i = 240; i < 360; i++) {
            testReport.positions.push({
                timestamp: new Date(ts.getTime() + i * 1000),
                heading: 0 + Math.sin((i/10) * 2* Math.PI)*10 // little oscillations every 10 seconds
            })
        }

        const result = checkReportGaps(testReport)
        assert.strictEqual(result, false)
  })
})
