let callback

let mockMotion = {
  motionTimer : null,
  orientationTimer : null,
  async isAvailable () {
    return Promise.resolve(true)
  },
  async getPermission () {
    return Promise.resolve(true)
  },
  startNotifications (options, cbk) {
    callback = cbk
    this.motionTimer = setInterval(() => {
      // Simulate some motion data
      const simulatedEvent = {
        type: 'motion',
        acc: {
          x: Math.random() * 2 - 1,
          y: Math.random() * 2 - 1,
          z: Math.random() * 2 - 1
        },
        accG: {
          x: Math.random() * 2 - 1,
          y: Math.random() * 2 - 1,
          z: Math.random() * 2 - 1
        },
        rotRate: {
          alpha: Math.random() * 360,
          beta: Math.random() * 360,
          gamma: Math.random() * 360
        },
        interval: 100
      }
      callback(simulatedEvent)
    }, options.interval || 100)

    this.orientationTimer = setInterval(() => {
      // Simulate some orientation data
      const simulatedEvent = {
        type: 'orientation',
        abs: Math.random() > 0.5,
        alpha: Math.random() * 360,
        beta: Math.random() * 360,
        gamma: Math.random() * 360
      }
      callback(simulatedEvent)
    }, options.interval || 100)
  },
  async stopNotifications () {
    if (this.motionTimer) {
      clearInterval(this.motionTimer)
    }
    if (this.orientationTimer) {
      clearInterval(this.orientationTimer)
    }
    callback = null
  }
}


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

export default (process.env.VUE_APP_MOTION === 'mock') ? mockMotion : realMotion
