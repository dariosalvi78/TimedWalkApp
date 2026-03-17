// src/modules/signalCheck.js
const QUALITY_THRESHOLDS = {
  minSamplingFrequency: 0.9,  // Hz
  maxAllowedGap: 3,           // seconds
  maxMeanDt: 1.5              // seconds (optional)
}

let lastTimestamp = null

let qualityState = {
  sampleCount: 0,
  meanDt: 0,
  maxDt: 0,
  minDt: null
}

function reset() {
  lastTimestamp = null
  qualityState = {
    sampleCount: 0,
    meanDt: 0,
    maxDt: 0,
    minDt: null
  }
}

function update(position) {
  if (!position.timestamp) {
    position.timestamp = Date.now()
  }

  if (lastTimestamp !== null) {
    const dt = (position.timestamp - lastTimestamp) / 1000
    if (dt > 0) {
      qualityState.sampleCount++
      qualityState.meanDt +=
        (dt - qualityState.meanDt) / qualityState.sampleCount

      if (dt > qualityState.maxDt) qualityState.maxDt = dt
      if (qualityState.minDt === null || dt < qualityState.minDt)
        qualityState.minDt = dt
    }
  }
  
  console.log("Mean delta timestamp: ", qualityState.meanDt.toFixed(3), "milliseconds, in seconds: ", qualityState.meanDt.toFixed(3) / 1000)
  lastTimestamp = position.timestamp
}

function getReport() {
  const samplingFrequency =
    qualityState.meanDt > 0 ? 1 / qualityState.meanDt : 0

  const warningLowSampling = samplingFrequency <  QUALITY_THRESHOLDS.minSamplingFrequency
  const warningLargeGap = qualityState.maxDt > QUALITY_THRESHOLDS.maxAllowedGap   // example threshold (3 sec)
  const hasWarning = warningLowSampling || warningLargeGap

  let warningMessages = []

  if (warningLowSampling)
    warningMessages.push("Sampling frequency too low")

  if (warningLargeGap)
    warningMessages.push("Large data gap detected")

  return {
    meanDt: qualityState.meanDt,
    maxDt: qualityState.maxDt,
    minDt: qualityState.minDt,
    samplingFrequency: samplingFrequency,
    samplePairs: qualityState.sampleCount,
    warningLowSampling,
    warningLargeGap,
    hasWarning, 
    warningMessages
  }
}

export default {
  reset,
  update,
  getReport
}
