import model from './curveClassfier_params.json' with { type: "json" }
import { mean, variance, skewness, kurtosis } from './stats.js'


/**
 * Subsample headings from a list of position objects.
 * @param {Array<Object>} positions - array of position objects
 * @returns {Array<Object>} subsampled position objects
 */
function subsampleHeadings(positions) {
  let deltaT = 0
  let prevMs = 0

  const sortedPositions = [...positions].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  const subsampledPositions = []

  for (let i = 0; i < sortedPositions.length; i++) {

    const row = sortedPositions[i]

    const timestamp = row.timestamp.getTime() // unix timestamp in ms
    if (timestamp <= 0) continue

    // FIRST VALID SAMPLE
    if (prevMs === 0) {
      prevMs = timestamp
      subsampledPositions.push(row)
      continue
    }

    const dt = timestamp - prevMs

    if (deltaT < 5000) {
      deltaT += dt
      prevMs = timestamp
    } else {
      deltaT += dt
      prevMs = timestamp

      // only add if we have a valid heading and timestamp
      if (row.heading !== undefined && !isNaN(row.heading) && row.timestamp !== undefined && !isNaN(row.timestamp)) {
        subsampledPositions.push(row)
      }

      // reset
      deltaT = 0
    }
  }

  return subsampledPositions
}


/**
 * Compute heading features from subsampled positions.
 * @param {Array<Object>} subsampledPositions - array of position objects subsampled every 5s
 * @returns {Object} computed features
 */
function computeHeadingFeatures(subsampledPositions) {

  if (!subsampledPositions || subsampledPositions.length < 3) throw new Error('Not enough heading data to compute features')

  // -----------------------------
  // BASIC STATS
  // -----------------------------
  const headings = subsampledPositions.map(p => p.heading)
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
}


/**
 * Standardize features using the trained scaler.
 * @param {Array<number>} features
 * @returns {Array<number>} standardized features
 */
function standardize(features) {
  const mean = model.scaler.mean
  const scale = model.scaler.scale

  return features.map((x, i) => {
    const s = scale[i] === 0 ? 1 : scale[i]
    return (x - mean[i]) / s
  })
}

/**
 * Softmax function to convert raw scores to probabilities for multiclass classification.
 * Softmax activation function converts a vector of raw numerical scores into a
 * probability distribution, where each value is between 0 and 1, and all values sum to 1.
 * $softmax(x_i) = \frac{e^{x_i - \max(x)}}{\sum_{j} e^{x_j - \max(x)}}$$
 * @param {Array<number>} scores
 * @returns {Array<number>} probabilities corresponding to each class
 */
function softmax(scores) {
  const max = Math.max(...scores) // subtract max for numerical stability
  const exps = scores.map(s => Math.exp(s - max))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map(e => e / sum)
}

/**
 * Classify curve type using a logistic regression model.
 * @param {Object} testReport - report of the full test, containing all data (positions, events, etc.)
 * @returns {Object} classification result with label, probabilities, and features
 */
function classifyLogistic(testReport) {
  if (!testReport.positions) throw new Error('No position data available in test report')

  // 1. Subsampling
  const subsampledPositions = subsampleHeadings(testReport.positions)

  // 2. Features
  const f = computeHeadingFeatures(subsampledPositions)
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
  const x = standardize(featureVector)

  // 4. Linear scores (same as before)
  const coefs      = model.model.coef
  const intercepts = model.model.intercept
  const classes    = model.model.classes

  const rawScores = coefs.map((coefRow, i) =>
    coefRow.reduce((s, c, j) => s + c * x[j], 0) + intercepts[i]
  )

  // 5. Softmax → probabilities  (this is the only change from Ridge)
  const probabilities = softmax(rawScores)

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
    console.log('Features:',      featureVector)
    console.log('Standardized:',  x)
    console.log('Raw scores:',    rawScores)
    console.log('Probabilities:', probabilities)
  }

  return {
    label:         classes[maxIdx],
    label_txt:     labelMap[classes[maxIdx]],
    probabilities, // replaces raw `scores`
    features:      f
  }
}

/**
 * Classify curve type using a ridge regression model (original version).
 * @param {Object} testReport - report of the full test, containing all data (positions, events, etc.)
 * @returns {Object} classification result with label, probabilities, and features
 */
function classifyRidge(testReport) {
  if (!testReport.positions) throw new Error('No position data available in test report')

  // 1. Subsampling
  const { headings, timestamps } = subsampleHeadings(testReport.positions)

  // 2. Features
  const f = computeHeadingFeatures(headings, timestamps)
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
  const x = standardize(featureVector)

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
}

export default {
  classifyRidge,
  classifyLogistic,
  subsampleHeadings,
  computeHeadingFeatures
}
