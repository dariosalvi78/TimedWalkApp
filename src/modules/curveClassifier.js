import model from '../modules/pipeline_params.json'

/* =========================
   --- BASIC UTILITIES -----
   ========================= */

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function variance(arr) {
  const m = mean(arr)
  return mean(arr.map(x => (x - m) ** 2))
}

function std(arr) {
  return Math.sqrt(variance(arr))
}

function skewness(arr) {
  const m = mean(arr)
  const s = std(arr)
  if (s === 0) return 0
  return mean(arr.map(x => ((x - m) / s) ** 3))
}

function kurtosis(arr) {
  const m = mean(arr)
  const s = std(arr)
  if (s === 0) return 0
  return mean(arr.map(x => ((x - m) / s) ** 4)) - 3
}

/* =========================
   --- AUTOCORRELATION -----
   ========================= */

// function autocorrelation(x, lag) {
//   const n = x.length
//   const m = mean(x)

//   let num = 0
//   let denom = 0

//   for (let i = 0; i < n; i++) {
//     denom += (x[i] - m) ** 2
//   }

//   for (let i = 0; i < n - lag; i++) {
//     num += (x[i] - m) * (x[i + lag] - m)
//   }

//   return denom === 0 ? 0 : num / denom
// }

// function computingAutocorrelation(x) {
//   const maxLag = Math.min(20, Math.floor(x.length / 2))
//   let bestLag = 1
//   let bestVal = -Infinity

//   for (let lag = 1; lag <= maxLag; lag++) {
//     const val = autocorrelation(x, lag)
//     if (val > bestVal) {
//       bestVal = val
//       bestLag = lag
//     }
//   }

//   return [bestVal, bestLag]
// }

/* =========================
   --- SUBSAMPLING ---------
   ========================= */

function subsampleHeadings(positions) {
  let buffer = []
  let deltaT = 0
  let prevMs = 0
  
  const ordered = [...positions].reverse() 
  const subsampledHeadings = []
  const subsampledTimestamps = []

  for (let i = 0; i < ordered.length; i++) {
    
    const row = ordered[i]

    const timestamp = row.timestamp
    if (timestamp <= 0) continue

    // FIRST VALID SAMPLE
    if (prevMs === 0) {
      prevMs = timestamp
      buffer.push(row)
      continue
    }
    
    const dt = timestamp - prevMs

    if (deltaT < 5000) {
      deltaT += dt
      buffer.push(row)
      prevMs = timestamp
    } else {
      deltaT += dt
      buffer.push(row)
      prevMs = timestamp

      subsampledHeadings.push(buffer[0].heading)
      subsampledTimestamps.push(buffer[0].timestamp)

      // reset
      deltaT = 0
      buffer = []
    }
  }

  return {
    headings: subsampledHeadings,
    timestamps: subsampledTimestamps
  }
}

/* =========================
   --- FEATURE EXTRACTION --
   ========================= */

function computeHeadingFeatures(headings, timestamps) {
  if (!headings || headings.length < 3) return null

  // remove NaNs
  const clean = []
  for (let i = 0; i < headings.length; i++) {
    if (!isNaN(headings[i]) && !isNaN(timestamps[i])) {
      clean.push({ h: headings[i], t: timestamps[i] })
    }
  }

  if (clean.length < 3) return null

  headings = clean.map(x => x.h)

  // -----------------------------
  // BASIC STATS
  // -----------------------------
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

/* =========================
   --- MODEL INFERENCE -----
   ========================= */

function standardize(features) {
  const mean = model.scaler.mean
  const scale = model.scaler.scale

  return features.map((x, i) => {
    const s = scale[i] === 0 ? 1 : scale[i]
    return (x - mean[i]) / s
  })
}

// ─── Softmax ──────────────────────────────────────────────────────────────────
function softmax(scores) {
  const max = Math.max(...scores)          // subtract max for numerical stability
  const exps = scores.map(s => Math.exp(s - max))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map(e => e / sum)
}

function classifyLogistic(testReport) {
  if (!testReport.positions) return null

  // 1. Subsampling
  const { headings, timestamps } = subsampleHeadings(testReport.positions)

  // 2. Features
  const f = computeHeadingFeatures(headings, timestamps)
  if (!f) return null

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

  console.log('Features:',      featureVector)
  console.log('Standardized:',  x)
  console.log('Raw scores:',    rawScores)
  console.log('Probabilities:', probabilities)

  return {
    label:         classes[maxIdx],
    label_txt:     labelMap[classes[maxIdx]],
    probabilities,                          // replaces raw `scores`
    features:      f
  }
}

/**
 * MAIN ENTRY POINT
 */
function classifyRidge(testReport) {
  if (!testReport.positions) return null

  // 1. Subsampling
  const { headings, timestamps } = subsampleHeadings(testReport.positions)

  // 2. Features
  const f = computeHeadingFeatures(headings, timestamps)
  if (!f) return null

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

    console.log('Features:', featureVector)
    console.log('Standardized:', x)
    console.log('Scores:', scores)

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