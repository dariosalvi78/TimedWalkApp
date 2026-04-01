export default {
  lines: null,
  positionCallback: null,
  motionCallback: null,
  orientationCallback: null,
  stepsCallback: null,
  eventCallback: null,
  timerid: null,

  async loadTxtFile (file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.addEventListener("load", () => {
        resolve(reader.result)
        this.lines = reader.result.split('\n')
      })
      reader.addEventListener("error", () => {
        reject(reader.error)
      })
      reader.readAsText(file, 'UTF-8')
    })
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
    let prevTs = null

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

      let delay = 0
      if (realtime && currentLineIndex > 1) {
        delay = ts - prevTs
      }
      prevTs = ts

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
          let positionObj = JSON.parse(content.split('position ')[1])

          if (this.positionCallback) {
            this.positionCallback(positionObj)
          }
        }

      } else if (type === ' - M - ') {
        // motion
        let motionObj = JSON.parse(content.split('motion ')[1])

        if (this.motionCallback) {
          this.motionCallback(motionObj)
        }
      } else if (type === ' - O - ') {
        // orientation
        let orientationObj = JSON.parse(content.split('orientation ')[1])

        if (this.orientationCallback) {
          this.orientationCallback(orientationObj)
        }
      } else if (type === ' - S - ') {
        // steps
        let stepsObj = JSON.parse(content.split('steps ')[1])

        if (this.stepsCallback) {
          this.stepsCallback(stepsObj)
        }
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

