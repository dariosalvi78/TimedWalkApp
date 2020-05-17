let realStepCounter = {
  firstSteps: -1,
  async isAvailable () {
    return new Promise((resolve, reject) => {
      window.pedometer.isStepCountingAvailable(resolve, reject)
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

let MOCK = true
export default MOCK? mockStepCounter:realStepCounter
