let mockGPS = {
  timerid: null,
  async isAvailable () {
    return Promise.resolve(true)
  },
  startNotifications (options, cbk) {
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
          accuracy: counter < 5 ? 60 : 10
        }
      })
    }, 1000)
  },
  async stopNotifications () {
    clearInterval(this.timerid)
    return Promise.resolve()
  }
}

let realGPS = {
  watchid: null,
  startNotifications (options, cbk, error) {
    this.watchid = navigator.geolocation.watchPosition((position) => {
      // we need to create a copy of the position object because
      // Chromium does something strange that is not serialisable as JSON
      var copyPos = {}
      copyPos.timestamp = new Date().getTime() // use current timestamp because some phones mess up the timestamps
      copyPos.coords = {}
      copyPos.coords.latitude = position.coords.latitude
      copyPos.coords.longitude = position.coords.longitude
      copyPos.coords.altitude = position.coords.altitude
      if (position.coords.accuracy) copyPos.coords.accuracy = position.coords.accuracy
      if (position.coords.altitudeAccuracy) copyPos.coords.altitudeAccuracy = position.coords.altitudeAccuracy
      if (position.coords.heading) copyPos.coords.heading = position.coords.heading
      if (position.coords.speed) copyPos.coords.speed = position.coords.speed

      cbk(copyPos)
    }, error, options)
  },
  async stopNotifications () {
    navigator.geolocation.clearWatch(this.watchid)
    return Promise.resolve()
  }
}

// use MOCK for testing in the browser, mockGPS for the real data
let MOCK = true
export default MOCK ? mockGPS : realGPS
