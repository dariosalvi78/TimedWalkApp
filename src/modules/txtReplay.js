export default {
  lines: null,
  positionCallback: null,
  motionCallback: null,
  orientationCallback: null,
  stepsCallback: null,
  eventCallback: null,
  timerid: null,

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

  loadTxtFile (fileTxt) {
    this.lines = fileTxt.split(/\r?\n/).filter(line => line.trim() !== '')
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

  registerEventCallback (callback) {
    this.eventCallback = callback
  },

  run: false,

  stopReplay () {
    // clear any pending timeouts
    if (this.timerid) {
      clearTimeout(this.timerid)
      this.timerid = null
    }
    this.run = false
  },

  startReplay (realtime) {
    console.log('Replaying test with loaded file')

    this.run = true

    let currentLineIndex = 0
    let firstTs = null
    let startTs = new Date().getTime()
    let lastSteps = null

    const processNextLine = () => {
      if (currentLineIndex >= this.lines.length) {
        console.log('Finished replaying all lines.')
        return
      }
      let line = this.lines[currentLineIndex]
      currentLineIndex++

      let parts = line.split(/( - .{1} - )/)
      let ts = new Date(parts[0])
      let type = parts[1]
      let content = parts[2]

      if (!firstTs) firstTs = ts

      // time to wait before processing the next line
      let delay = 0
      if (realtime && currentLineIndex > 1) {
        // time passed since first line in the file
        let dt = ts.getTime() - firstTs.getTime()
        // time passed since starting the replay
        let dt2 = new Date().getTime() - startTs
        // time to wait before processing the next line
        // for example, if the current line is at 10s (dt=10000ms)
        // and 8s have already passed since starting the replay (dt2=8000ms),
        // then we should wait 2s (delay= dt - dt2 = 2000ms) before processing the current line
        delay = dt - dt2
        if (delay < 0) delay = 0
      }

      if (type === ' - E - ') {
        if (content.startsWith('signal check start')) {
          if (this.eventCallback) {
            this.eventCallback('signal check start')
          }
        } else if (content.startsWith('test start')) {
          if (this.eventCallback) {
            this.eventCallback('test start')
          }
        } else if (content.startsWith('test end')) {
          if (this.eventCallback) {
            this.eventCallback('test end')
          }
        }
      } else if (type === ' - P - ') {
        if (content.startsWith('position ')) {
          if (this.positionCallback) {
            let positionObj = JSON.parse(content.split('position ')[1])
            this.positionCallback({ ...positionObj, steps: lastSteps === null ? null : lastSteps })
          }
        }

      } else if (type === ' - M - ') {
        // motion
        if (this.motionCallback) {
          let motionObj = JSON.parse(content.split('motion ')[1])
          this.motionCallback(motionObj)
        }
      } else if (type === ' - O - ') {
        // orientation
        if (this.orientationCallback) {
          let orientationObj = JSON.parse(content.split('orientation ')[1])
          this.orientationCallback(orientationObj)
        }
      } else if (type === ' - S - ') {
        // steps
        if (this.positionCallback || this.stepsCallback) {
          let stepsObj = JSON.parse(content.split('steps ')[1])
          lastSteps = stepsObj.steps
          if (this.stepsCallback) {
            this.stepsCallback(stepsObj)
          }
        }
      } else {
        console.warn('Unknown line type in replay file: ', type)
      }

      if (this.run) {
        if (realtime) {
          this.timerid = setTimeout(processNextLine, delay)
        } else {
          // process next line immediately
          processNextLine()
        }
      }
    }

    processNextLine()
  }

}

