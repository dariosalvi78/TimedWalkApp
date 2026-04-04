export default {
  events: [],
  positionCallback: null,
  motionCallback: null,
  orientationCallback: null,
  stepsCallback: null,
  eventCallback: null,
  timerid: null,
  run: false,


  // mini CSV parser that also tries to guess the type of the values
  parseCSV (txt, additionalFields = {}) {
    let lines = txt.split('\n')
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header and one data line')
    }
    let headers = lines[0].split(',').map(h => h.trim())
    let data = []
    for (const line of lines.slice(1)) {
      if (line.trim() === '') continue // skip empty lines
      // avoid splitting on commas inside quotes by using a regex that matches either quoted strings or non-comma sequences
      const regex = /,(?=(?:[^"]*"[^"]*")*[^"]*$)/
      let values = line.split(regex)//.map(v => v.trim().replace(/^"(.*)"$/, '$1')) // remove surrounding quotes if present
      if (values.length !== headers.length) continue // skip lines with wrong number of values
      let obj = additionalFields ? { ...additionalFields } : {}
      headers.forEach((h, i) => {
        // try to guess the type of the value:
        if (values[i] === '') {
          obj[h] = null
        } else if (!isNaN(values[i])) {
          obj[h] = parseFloat(values[i])
        } else if (values[i].toLowerCase() === 'true' || values[i].toLowerCase() === 'false') {
          obj[h] = values[i].toLowerCase() === 'true'
        } else {
          obj[h] = values[i]
        }
      })
      data.push(obj)
    }
    return data
  },

  async readWebTextFile (file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.addEventListener("load", () => {
        resolve(reader.result)
      })
      reader.addEventListener("error", () => {
        reject(reader.error)
      })
      reader.readAsText(file, 'UTF-8')
    })
  },

  async loadCsvFiles (positionsTxt, stepsTxt, motionTxt, orientationTxt) {
    this.events = this.parseCSV(positionsTxt, { type: 'position' })

    if (stepsTxt) {
      // merge steps with positions based on timestamp (ms field)
      let steps = this.parseCSV(stepsTxt, { type: 'step' })
      this.events = this.events.concat(steps)
    }

    if (motionTxt) {
      let motion = this.parseCSV(motionTxt, { type: 'motion' })
      this.events = this.events.concat(motion)

    }

    if (orientationTxt) {
      let orientation = this.parseCSV(orientationTxt, { type: 'orientation' })
      this.events = this.events.concat(orientation)
    }

    this.events.sort((a, b) => a.ms - b.ms) // sort by timestamp
  },

  registerPositionCallback (callback) {
    this.positionCallback = callback
  },

  registerMotionCallback (callback) {
    this.motionCallback = callback
  },

  registerOrientationCallback (callback) {
    this.orientationCallback = callback
  },

  registerStepsCallback (callback) {
    this.stepsCallback = callback
  },

  stopReplay () {
    // clear any pending timeouts
    if (this.timerid) {
      clearTimeout(this.timerid)
      this.timerid = null
    }
    this.run = false
  },

  startReplay (realtime) {
    this.run = true

    let currentEventIndex = 0
    let prevTs = null
    let signalCheckStarted = false
    let testStarted = false
    let lastSteps = null

    const processNextEvent = () => {
      if (currentEventIndex >= this.events.length) {
        console.log('Finished replaying all events.')
        return
      }
      let event = this.events[currentEventIndex]
      currentEventIndex++

      let delay = 0
      if (realtime && currentEventIndex > 1) {
        delay = event.ms - prevTs
      }
      prevTs = event.ms

      if (!signalCheckStarted && event.ms < 0) {
        if (this.eventCallback) {
          this.eventCallback('signal check start')
          signalCheckStarted = true
        }
      } else if (!testStarted && event.ms >= 0) {
        if (this.eventCallback) {
          this.eventCallback('test start')
          testStarted = true
        }
      }

      if (event.type === 'position') {
        if (this.positionCallback) {
          this.positionCallback({
            timestamp: event.ms,
            coords: {
              latitude: event.latitude,
              longitude: event.longitude,
              altitude: event.altitude,
              accuracy: event.confInterval,
              heading: event.heading,
              speed: event.speed
            },
            steps: lastSteps == null ? undefined : lastSteps
          })
        }
      } else if (event.type === 'motion') {
        if (this.motionCallback) {
          this.motionCallback({
            type: 'motion',
            acc: {
              x: event.accelX,
              y: event.accelY,
              z: event.accelZ
            },
            accG: {
              x: event.accelWithGX,
              y: event.accelWithGY,
              z: event.accelWithGZ
            },
            rotRate: {
              alpha: event.rotRateAlpha,
              beta: event.rotRateBeta,
              gamma: event.rotRateGamma
            },
            interval: event.interval
          })
        }
      } else if (event.type === 'orientation') {
        if (this.orientationCallback) {
          this.orientationCallback({
            type: 'orientation',
            abs: event.abs,
            alpha: event.alpha,
            beta: event.beta,
            gamma: event.gamma
          })
        }

      } else if (event.type === 'steps') {
        if (this.stepsCallback) {
          this.stepsCallback({
            startDate: event.startDate,
            endDate: event.endDate,
            numberOfSteps: event.steps,
            floorsUp: event.floorsUp,
            floorsDown: event.floorsDown,
            distance: event.distance
          })
        }
      }

      if (this.run) {
        if (realtime) {
          this.timerid = setTimeout(processNextEvent, delay)
        } else {
          // process next line immediately
          processNextEvent()
        }
      }
    }

    processNextEvent()
  }
}
