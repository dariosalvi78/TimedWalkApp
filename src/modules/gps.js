import csvReplay from './csvReplay'
import txtReplay from './txtReplay'

let mockGPS = {
  timerid: null,
  async isAvailable () {
    return Promise.resolve(true)
  },
  startNotifications (cbk) {
    let startLat = 51.751985
    let startLong = -1.257609
    let counter = 0
    if (this.timerid) clearInterval(this.timerid)
    this.timerid = setInterval(function () {
      counter++
      cbk({
        timestamp: new Date().getTime(),
        coords: {
          latitude: startLat + (counter * 2.1055e-6),
          longitude: startLong + (counter * 1.83055e-5),
          altitude: 69.82,
          heading: 100 + (Math.random() * 10),
          accuracy: counter < 5 ? 60 : 10 // simulates low accuracy at startup
        }
      })
    }, 1000)
  },
  async stopNotifications () {
    clearInterval(this.timerid)
    return Promise.resolve()
  }
}

let csvReplayGPS = {
  async isAvailable () {
    return Promise.resolve(true)
  },
  startNotifications: (cbk) => {
    const fileInput = document.getElementById('replay-file-input')
    fileInput.onchange = async (event) => {
      // get the file from the input
      const file = event.target.files[0]
      if (!file) {
        console.error('No file selected')
        return
      }

      let text = await csvReplay.readWebTextFile(file)
      await csvReplay.loadCsvFiles(text)
      csvReplay.registerPositionCallback((p) => {
        cbk(p)
      })
      csvReplay.startReplay(true)
    }

    fileInput.click()
  },

  stopNotifications: () => {
    csvReplay.stopReplay()
    return Promise.resolve()
  }
}

let txtReplayGPS = {
  async isAvailable () {
    return Promise.resolve(true)
  },
  startNotifications: (cbk) => {
    const fileInput = document.getElementById('replay-file-input')
    fileInput.onchange = async (event) => {
      // get the file from the input
      const file = event.target.files[0]
      if (!file) {
        console.error('No file selected')
        return
      }

      let txt = await txtReplay.readWebTextFile(file)
      txtReplay.loadTxtFile(txt)

      txtReplay.registerPositionCallback((p) => {
        cbk(p)
      })
      txtReplay.startReplay(true)
    }

    fileInput.click()
  },

  stopNotifications: () => {
    txtReplay.stopReplay()
    return Promise.resolve()
  }
}


let realGPS = {
  async isAvailable () {
    return window.cordova.plugins.geolocationPlus.isLocationServiceEnabled('gps')
  },
  startNotifications (cbk, error) {

    window.cordova.plugins.geolocationPlus.startPositionUpdates(
      (position) => {
        // we need to create a copy of the position object because
        // Chromium does something strange that is not serialisable as JSON
        var copyPos = {}
        if (position.provider) copyPos.provider = position.provider
        copyPos.timestamp = position.timestamp // new Date().getTime() // use current timestamp because some phones mess up the timestamps
        copyPos.coords = {}
        copyPos.coords.latitude = position.coords.latitude
        copyPos.coords.longitude = position.coords.longitude
        copyPos.coords.altitude = position.coords.altitude
        if (position.coords.accuracy) copyPos.coords.accuracy = position.coords.accuracy
        if (position.coords.altitudeAccuracy) copyPos.coords.altitudeAccuracy = position.coords.altitudeAccuracy
        if (position.coords.heading) copyPos.coords.heading = position.coords.heading
        if (position.coords.speed) copyPos.coords.speed = position.coords.speed

        cbk(copyPos)
      },
      {
        distanceFilter: 1,
        provider: "gps",
        minTime: 1000,
        desiredAccuracy: 1,
      }).catch(error)
  },
  async stopNotifications () {
    return window.cordova.plugins.geolocationPlus.stopPositionUpdates()
  }
}

export default (process.env.VUE_APP_GPS === 'mock') ? mockGPS : (process.env.VUE_APP_GPS === 'csv') ? csvReplayGPS : (process.env.VUE_APP_GPS === 'txt') ? txtReplayGPS : realGPS
