let callback

let realMotion = {
  async isAvailable () {
    if (typeof DeviceMotionEvent !== 'undefined') return Promise.resolve(true)
    else return Promise.resolve(false)
  },
  async getPermission () {
    if (typeof DeviceMotionEvent.requestPermission !== 'undefined') {
      let response = await DeviceMotionEvent.requestPermission()
      if (response !== 'granted') return false
    }

    if (typeof DeviceOrientationEvent.requestPermission !== 'undefined') {
      let response = await DeviceOrientationEvent.requestPermission()
      if (response !== 'granted') return false
    }

    return true
  },
  motionHandler (event) {
    let simplifiedEvent = {
      type: 'motion',
      acc: {
        x: event.acceleration.x,
        y: event.acceleration.y,
        z: event.acceleration.z
      },
      accG: {
        x: event.accelerationIncludingGravity.x,
        y: event.accelerationIncludingGravity.y,
        z: event.accelerationIncludingGravity.z
      },
      rotRate: {
        alpha: event.rotationRate.alpha,
        beta: event.rotationRate.beta,
        gamma: event.rotationRate.gamma
      },
      interval: event.interval
    }
    callback(simplifiedEvent)
  },
  orientationHandler (event) {
    let simplifiedEvent = {
      type: 'orientation',
      abs: event.absolute,
      alpha: event.alpha,
      beta: event.beta,
      gamma: event.gamma
    }
    if (event.webkitCompassHeading) simplifiedEvent.heading = event.webkitCompassHeading
    callback(simplifiedEvent)
  },
  startNotifications (options, cbk) {
    callback = cbk
    window.addEventListener('devicemotion', this.motionHandler, false)
    window.addEventListener('deviceorientation', this.orientationHandler, false)
  },
  async stopNotifications () {
    window.removeEventListener('devicemotion', this.motionHandler)
    window.removeEventListener('deviceorientation', this.orientationHandler)
    callback = null
  }
}

export default realMotion
