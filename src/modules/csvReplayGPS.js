import Papa from 'papaparse'
let csvReplayGPS = {
  timerid: null,
  data: [],
  index: 0,
  startTime: null,

  async loadCSV (path) {
    return new Promise((resolve, reject) => {
      Papa.parse(path, {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: (results) => {

          this.data = results.data
            .filter(row =>
              row.ms !== undefined &&
              row.ms > 0 &&
              row.latitude &&
              row.longitude &&
              row.heading
            )
            .sort((a, b) => a.ms - b.ms)

          this.index = 0
          resolve()
        },
        error: reject
      })
    })
  },

  async isAvailable () {
    return Promise.resolve(true)
  },

  startNotifications (cbk) {
    const fileInput = document.getElementById('csv-file-input')
    fileInput.onchange = async (event) => {
      // get the file from the input
      const file = event.target.files[0]
      if (!file) {
        console.error('No file selected')
        return
      }
      // parse the file with papaparse
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: (results) => {
          this.data = results.data
            .filter(row =>
              row.ms !== undefined &&
              row.ms > 0 &&
              row.latitude &&
              row.longitude &&
              row.heading
            )
            .sort((a, b) => a.ms - b.ms)

          this.index = 0
          console.log('Loaded samples:', this.data.length)
          // start the replay
          if (!this.data.length) {
            throw new Error('No CSV data loaded')
          }

          if (this.timerid) clearTimeout(this.timerid)

          this.index = 0
          // this.startTime = Date.now()
          this.startTime = 0
          console.log("Start notifications csvReplayGPS, StartTime : ", this.startTime)

          const run = () => {
            if (this.index >= this.data.length - 1) return

            const current = this.data[this.index]
            const next = this.data[this.index + 1]

            // convert relative ms → real timestamp
            const timestamp = this.startTime + current.ms

            cbk({
              timestamp: timestamp,
              coords: {
                latitude: current.latitude,
                longitude: current.longitude,
                altitude: current.altitude || 0,
                accuracy: current.confInterval || 10,
                heading: current.heading >= 0 ? current.heading : null,
                speed: current.speed >= 0 ? current.speed : null
              }
            })

            // preserve real timing
            const dt = Math.max(0, next.ms - current.ms)

            this.index++
            this.timerid = setTimeout(run, dt)
          }

          run()
        },
        error: (err) => {
          console.error('Error parsing CSV file:', err)
        }
      })
    }

    fileInput.click()
  },


  async stopNotifications () {
    clearTimeout(this.timerid)
    return Promise.resolve()
  }
}

export default csvReplayGPS
