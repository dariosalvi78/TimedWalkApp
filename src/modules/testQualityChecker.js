import model from './curveClassfier_params.json' with { type: "json" }
import { mean, variance, skewness, kurtosis } from './stats.js'

const QUALITY_THRESHOLDS = {
  minSamplingFrequency: 0.2,     // Hz -> at least one position every 5 seconds in average
  maxAllowedGapMs: 30000,           // milliseconds -> no gap larger than 30 seconds
}

export default {
  subSampledPositions: [],
  gapsDetected: false,
  firstTimestamp: null,
  lastSubsampledPositionTime: null,
  lastSelectedPositionTime: null,
  samplesNumber: 0,

  reset () {
    this.subSampledPositions = []
    this.gapsDetected = false
    this.firstTimestamp = null
    this.lastSubsampledPositionTime = null
    this.lastSelectedPositionTime = null
    this.samplesNumber = 0
  },

  addPosition (position, isSelected) {
    this.samplesNumber++

    if (!this.firstTimestamp) {
      this.firstTimestamp = position.timestamp
    }

    // add to subsampled positions if it meets the sampling criteria

    const timestamp = position.timestamp // unix timestamp in ms
    if (!this.lastSubsampledPositionTime) {
      this.lastSubsampledPositionTime = timestamp
      this.subSampledPositions.push(position)
    } else {
      const dt = timestamp - this.lastSubsampledPositionTime
      if (dt >= 5000) {
        // take the last position before this one
        const prev = this.subSampledPositions[this.subSampledPositions.length - 1]
        // fix heading if missing or negative
        if (position.coords.heading < 0) {
          position.coords.heading = this.computeHeading(prev, position)
        }

        // only add if we have a valid heading and timestamp
        if (position.coords.heading !== undefined && !isNaN(position.coords.heading) && position.timestamp !== undefined && !isNaN(position.timestamp)) {
          // oldest (lowest timestamp) are at the beginning
          // newest (highest timestamp) are at the end
          this.subSampledPositions.push(position)
          this.lastSubsampledPositionTime = timestamp
        }
      }
    }

    if (isSelected) {
      // check the time gap between the last position and the current one
      if (this.lastSelectedPositionTime) {
        const timeGap = position.timestamp - this.lastSelectedPositionTime
        if (timeGap > QUALITY_THRESHOLDS.maxAllowedGapMs) { // if the gap is greater than the allowed threshold, consider it a gap
          this.gapsDetected = true
        }
      }
      this.lastSelectedPositionTime = position.timestamp
    }
  },

  isSamplingFrequencySufficient () {
    if (this.samplesNumber === 0) return false
    const totalTimeSeconds = (this.lastSelectedPositionTime - this.firstTimestamp) / 1000
    const samplingFrequency = this.samplesNumber / totalTimeSeconds
    return samplingFrequency >= QUALITY_THRESHOLDS.minSamplingFrequency
  },

  isGapsDetected () {
    return this.gapsDetected
  },

  // Converts numeric degrees to radians
  toRad (Value) {
    return Value * Math.PI / 180
  },

  computeHeading (p1, p2) {
    const lat1 = this.toRad(p1.coords.latitude)
    const lat2 = this.toRad(p2.coords.latitude)
    const dLon = this.toRad(p2.coords.longitude - p1.coords.longitude)

    const y = Math.sin(dLon) * Math.cos(lat2)
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)

    let bearing = Math.atan2(y, x)
    bearing = (bearing * 180) / Math.PI
    return (bearing + 360) % 360
  },

  /**
 * Compute heading features from subsampled positions.
 * @param {Array<Object>} subsampledPositions - array of position objects subsampled every 5s
 * @returns {Object} computed features
 */
  computeHeadingFeatures () {

    if (!this.subSampledPositions || this.subSampledPositions.length < 3) throw new Error('Not enough heading data to compute features')

    // -----------------------------
    // BASIC STATS
    // -----------------------------
    const headings = this.subSampledPositions.map(p => p.coords.heading)
    const heading_var = variance(headings)
    const heading_kurtosis = kurtosis(headings)
    const heading_skewness = skewness(headings)

    // const [heading_acfpeak, heading_acflag] = computingAutocorrelation(headings)

    // -----------------------------
    // CIRCULAR DIFFERENCES
    // -----------------------------
    const dtheta = []
    for (let i = 1; i < headings.length; i++) {
      let diff = headings[i] - headings[i - 1]
      // diff = ((diff + 180) % 360) - 180
      diff = (((diff + 180) % 360) + 360) % 360 - 180
      dtheta.push(diff)
    }

    const abs_dtheta = dtheta.map(Math.abs)
    const mean_abs_dtheta = mean(abs_dtheta)

    // -----------------------------
    // TURN EVENTS
    // -----------------------------
    const turn_threshold = 20
    const turn_events = abs_dtheta.filter(x => x > turn_threshold).length

    // -----------------------------
    // ZERO CROSSING RATE
    // -----------------------------
    let zero_crossings = 0
    for (let i = 1; i < dtheta.length; i++) {
      const prev = dtheta[i - 1]
      const curr = dtheta[i]
      if ((prev > 0 && curr < 0) || (prev < 0 && curr > 0)) {
        zero_crossings++
      }
    }

    const zero_crossing_rate = zero_crossings / dtheta.length

    return {
      turn_events,
      mean_abs_dtheta,
      heading_kurtosis,
      heading_var,
      zero_crossing_rate,
      // heading_acfpeak,
      heading_skewness,
      // heading_acflag
    }
  },

  /**
 * Standardize features using the trained scaler.
 * @param {Array<number>} features
 * @returns {Array<number>} standardized features
 */
  standardize (features) {
    const mean = model.scaler.mean
    const scale = model.scaler.scale

    return features.map((x, i) => {
      const s = scale[i] === 0 ? 1 : scale[i]
      return (x - mean[i]) / s
    })
  },

  /**
 * Softmax function to convert raw scores to probabilities for multiclass classification.
 * Softmax activation function converts a vector of raw numerical scores into a
 * probability distribution, where each value is between 0 and 1, and all values sum to 1.
 * $softmax(x_i) = \frac{e^{x_i - \max(x)}}{\sum_{j} e^{x_j - \max(x)}}$$
 * @param {Array<number>} scores
 * @returns {Array<number>} probabilities corresponding to each class
 */
  softmax (scores) {
    const max = Math.max(...scores) // subtract max for numerical stability
    const exps = scores.map(s => Math.exp(s - max))
    const sum = exps.reduce((a, b) => a + b, 0)
    return exps.map(e => e / sum)
  },

  /**
 * Classify curve type using a logistic regression model.
 * @param {Object} positions - array of position objects (with heading and timestamp) from the test report
 * @returns {Object} classification result with label, probabilities, and features
 */
  classifyLogistic () {
    if (this.subSampledPositions.length < 3) throw new Error('No position data available')

    // 2. Features
    const f = this.computeHeadingFeatures()
    if (!f) throw new Error('Not enough valid heading data to compute features')

    // IMPORTANT: exact order used during training
    const featureVector = [
      f.turn_events,
      f.mean_abs_dtheta,
      f.heading_kurtosis,
      f.heading_var,
      f.zero_crossing_rate,
      f.heading_skewness,
    ]

    // 3. Standardization
    const x = this.standardize(featureVector)

    // 4. Linear scores (same as before)
    const coefs = model.model.coef
    const intercepts = model.model.intercept
    const classes = model.model.classes

    const rawScores = coefs.map((coefRow, i) =>
      coefRow.reduce((s, c, j) => s + c * x[j], 0) + intercepts[i]
    )

    // 5. Softmax → probabilities  (this is the only change from Ridge)
    const probabilities = this.softmax(rawScores)

    // 6. Predicted class = argmax of probabilities (same as argmax of rawScores)
    const maxIdx = probabilities.reduce(
      (best, p, i) => p > probabilities[best] ? i : best, 0
    )

    const labelMap = {
      0: 'straight',
      1: 'moderate curvature',
      2: 'high curvature'
    }

    if (process.env.VUE_APP_DEBUG) {
      console.log('Features:', featureVector)
      console.log('Standardized:', x)
      console.log('Raw scores:', rawScores)
      console.log('Probabilities:', probabilities)
    }

    return {
      label: classes[maxIdx],
      label_txt: labelMap[classes[maxIdx]],
      probabilities, // replaces raw `scores`
      features: f
    }
  },

  /**
 * Classify curve type using a ridge regression model (original version).
 * @param {Object} positions - array of position objects (with heading and timestamp) from the test report
 * @returns {Object} classification result with label, probabilities, and features
 */
  classifyRidge () {
    if (this.subSampledPositions.length < 3) throw new Error('No position data available')

    const f = this.computeHeadingFeatures()
    if (!f) throw new Error('Not enough valid heading data to compute features')

    // IMPORTANT: exact order used during training
    const featureVector = [
      f.turn_events,
      f.mean_abs_dtheta,
      f.heading_kurtosis,
      f.heading_var,
      f.zero_crossing_rate,
      f.heading_skewness,
    ]
    console.log('Features:', featureVector)

    // 3. Standardization
    const x = this.standardize(featureVector)

    //   // 4. Linear model
    //   const score = dot(model.coef, x) + model.intercept
    //   console.log('Score:', score)

    //   const label = score > 0
    //     ? model.classes[1]
    //     : model.classes[0]
    // MULTICLASS SCORES

    const coefs = model.model.coef
    const intercepts = model.model.intercept
    const classes = model.model.classes

    const scores = coefs.map((coefRow, i) => {
      let s = 0
      for (let j = 0; j < coefRow.length; j++) {
        s += coefRow[j] * x[j]
      }
      return s + intercepts[i]
    })

    if (process.env.VUE_APP_DEBUG) {
      console.log('Features:', featureVector)
      console.log('Standardized:', x)
      console.log('Scores:', scores)
    }

    let maxIdx = 0
    for (let i = 1; i < scores.length; i++) {
      if (scores[i] > scores[maxIdx]) {
        maxIdx = i
      }
    }


    const labelMap = {
      0: 'straight',
      1: 'moderate curvature',
      2: 'high curvature'
    }

    return {
      label: classes[maxIdx],
      label_txt: labelMap[classes[maxIdx]],
      scores,
      features: f
    }
  },

  classifyCurvature (modelType = 'logistic') {
    if (modelType === 'logistic') {
      return this.classifyLogistic()
    } else if (modelType === 'ridge') {
      return this.classifyRidge()
    } else {
      throw new Error(`Unknown model type: ${modelType}`)
    }
  }

}
