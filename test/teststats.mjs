import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import * as stats from '../src/modules/stats.js'

describe('Testing stats module', () => {

    test ('mean, variance, skewness, kurtosis compute correctly', () => {
        const values = [1, 2, 3, 4, 5]
        assert.strictEqual(stats.mean(values), 3)
        assert.strictEqual(stats.variance(values), 2.5)
        assert.strictEqual(stats.skewness(values), 0)
        assert.ok(stats.kurtosis(values) - -1.2 < 0.1) // Allow some numerical imprecision
    })

    test('WindowedRollingStats computes mean and variance correctly', () => {
        const windowSize = 3
        const wrs = new stats.WindowedRollingStats(windowSize)

        wrs.addValue(1)
        assert.strictEqual(wrs.getMean(), 1)
        assert.strictEqual(wrs.getVariance(), undefined)

        wrs.addValue(2)
        assert.strictEqual(wrs.getMean(), 1.5)
        assert.strictEqual(wrs.getVariance(), 0.5)

        wrs.addValue(3)
        assert.strictEqual(wrs.getMean(), 2)
        assert.strictEqual(wrs.getVariance(), 1)

        // Adding a new value should remove the oldest value (1)
        wrs.addValue(4)
        assert.strictEqual(wrs.getMean(), 3)
        assert.strictEqual(wrs.getVariance(), 1)
    })
})
