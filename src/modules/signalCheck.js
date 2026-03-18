// src/modules/signalCheck.js
const QUALITY_THRESHOLDS = {
  minSamplingFrequency: 0.2,     // Hz
  maxAllowedGap: 5000,           // milliseconds
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

  if (lastTimestamp !== null) {
    const dt = (position.timestamp - lastTimestamp) // This is in milliseconds 
    console.log("--------------------")
    console.log("Position at latitude ", position.coords.latitude)
    console.log("Position with timestamp ", position.timestamp)
    console.log("Previous timestamp: ", lastTimestamp)
    console.log("Delta timestamp: ", position.timestamp, " - ", lastTimestamp, " = ", dt.toFixed(3), "milliseconds, in seconds: ", dt.toFixed(3) / 1000)

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

function getReport(curvature = null) {
  const samplingFrequency =
    qualityState.meanDt > 0 ? 1 / (qualityState.meanDt/1000) : 0

  const warningLowSampling = samplingFrequency <  QUALITY_THRESHOLDS.minSamplingFrequency
  const warningLargeGap = qualityState.maxDt > QUALITY_THRESHOLDS.maxAllowedGap  
  const warningCurvature = curvature.label === 2
  const hasWarning = warningLowSampling || warningLargeGap || warningCurvature

  let warningMessages = []

  if (warningLowSampling)
    warningMessages.push("Sampling frequency too low")

  if (warningLargeGap)
    warningMessages.push("Large data gap detected")

  if (warningCurvature)
    warningMessages.push("You may have turned too many times in your walk")

  return {
    meanDt: qualityState.meanDt,
    maxDt: qualityState.maxDt,
    minDt: qualityState.minDt,
    samplingFrequency: samplingFrequency,
    samplePairs: qualityState.sampleCount,
    warningLowSampling,
    warningLargeGap,
    warningCurvature,
    hasWarning, 
    warningMessages
  }
}

export default {
  reset,
  update,
  getReport
}
