let isIOS = function () {
  return [
    'iPad Simulator',
    'iPhone Simulator',
    'iPod Simulator',
    'iPad',
    'iPhone',
    'iPod'
  ].includes(navigator.platform)
    // iPad on iOS 13 detection
    || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
}


let realStepCounter = {
  firstSteps: -1,
  async isAvailable () {
    return new Promise((resolve, reject) => {
      window.pedometer.isStepCountingAvailable(resolve, reject)
    })
  },
  async getPermission () {

    return new Promise((resolve, reject) => {
      if (isIOS()) {
        // on iOS we can use the query of old data,
        // so no need to wait for actual steps
        window.pedometer.queryData(function () {
          resolve()
        }, function () {
          reject()
        }, {
          // query the last 10 seconds
          startDate: new Date(new Date().getTime() - 10000),
          endDate: new Date()
        })
      } else {
        // TODO: to make it more robust, it could stop updates before this
        // in case the updates are running (very unlikely)
        window.pedometer.startPedometerUpdates(function () {
          resolve()
          window.pedometer.stopPedometerUpdates()
        }, function (err) {
          reject(err)
        })
      }
    })
  },
  startNotifications (options, cbk, error) {
    this.firstSteps = -1
    window.pedometer.startPedometerUpdates((data) => {
      if (this.firstSteps === -1) {
        this.firstSteps = data.numberOfSteps - 1
      }
      data.numberOfSteps -= this.firstSteps
      cbk(data)
    }, error)
  },
  async stopNotifications () {
    return new Promise((resolve, reject) => {
      window.pedometer.stopPedometerUpdates(resolve, reject)
    })
  }
}

let mockStepCounter = {
  timer: null,
  steps: 0,
  async isAvailable () {
    return Promise.resolve(true)
  },
  async getPermission () {
    return Promise.resolve(true)
  },
  startNotifications (options, cbk) {
    this.steps = 0
    if (this.timer) clearInterval(this.timer)
    this.timer = setInterval(() => {
      this.steps++
      cbk({
        startDate: new Date().getTime(),
        endDate: new Date().getTime(),
        numberOfSteps: this.steps
      })
    }, 1000)
  },
  async stopNotifications () {
    clearInterval(this.timer)
    return Promise.resolve()
  }
}

export default (process.env.NODE_ENV === 'production') ? realStepCounter : mockStepCounter
