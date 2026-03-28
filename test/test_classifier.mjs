import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import classifier from '../src/modules/curveClassifier.js'

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
    //             heading: 0 // always same heading, no curves
    //         })
    //     }

    //     const result = classifier.classifyLogistic(testReport)
    //     assert.strictEqual(result.label, 0)
    // })

    test ('a 6MWT with litle oscillations is classified as straight', () => {
      const ts = new Date()
        const testReport = {
            positions: [
            ]
        }

        for (let i = 0; i < 360; i++) {
            testReport.positions.push({
                timestamp: new Date(ts.getTime() + i * 1000),
                heading: 0 + Math.sin((i/10) * 2* Math.PI)*10 // little oscillations every 10 seconds
            })
        }

        const result = classifier.classifyLogistic(testReport)
        assert.strictEqual(result.label, 0)
    })

    test ('a 6MWT with moderate curves is classified as such', () => {
      const ts = new Date()
        const testReport = {
            positions: [
            ]
        }

        for (let i = 0; i < 90; i++) {
            testReport.positions.push({
                timestamp: new Date(ts.getTime() + i * 1000),
                heading: 0
            })
        }
        for (let i = 90; i < 180; i++) {
            testReport.positions.push({
                timestamp: new Date(ts.getTime() + i * 1000),
                heading: 90
            })
        }
        for (let i = 180; i < 270; i++) {
            testReport.positions.push({
                timestamp: new Date(ts.getTime() + i * 1000),
                heading: 180
            })
        }
        for (let i = 270; i < 360; i++) {
            testReport.positions.push({
                timestamp: new Date(ts.getTime() + i * 1000),
                heading: 360
            })
        }

        const result = classifier.classifyLogistic(testReport)
        assert.strictEqual(result.label, 1)
    })


    test ('a 6MWT with lots of curves is classified as such', () => {
      const ts = new Date()
        const testReport = {
            positions: [
            ]
        }

        for (let i = 0; i < 360; i++) {
            testReport.positions.push({
                timestamp: new Date(ts.getTime() + i * 1000),
                heading: 0 + Math.sin((i/30) * 2* Math.PI)*180 // simulate a lot of curves by making the heading oscillate between 0 and 180 degrees every 30 seconds
            })
        }

        const result = classifier.classifyLogistic(testReport)
        assert.strictEqual(result.label, 2)
    })
  })
