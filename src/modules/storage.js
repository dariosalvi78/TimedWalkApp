/**
* Wrapper of the local storage or cordova native storage plugin
* Needs this plugin: https://github.com/TheCocoaProject/cordova-plugin-nativestorage#README.md
*/

let storage = {
  useNative: false,

  callbacks: {},

  setChangeListener (key, cbk) {
    this.callbacks[key] = cbk
  },

  unsetChangeListener (key) {
    this.callbacks[key] = undefined
  },

  async getItem (key) {
    if (!this.useNative) {
      return JSON.parse(window.localStorage.getItem(key))
    } else {
      return new Promise((resolve, reject) => {
        window.NativeStorage.getItem(key, (data) => {
          resolve(data)
        }, (err) => {
          if (err.code === 2) resolve(null)
          else reject(err)
        })
      })
    }
  },

  async setItem (key, value) {
    let promise
    if (!this.useNative) {
      promise = window.localStorage.setItem(key, JSON.stringify(value))
    } else {
      promise = new Promise((resolve, reject) => {
        window.NativeStorage.setItem(key, value, resolve, reject)
      })
    }
    if (this.callbacks[key]) this.callbacks[key](value)
    return promise
  },

  async removeItem (key) {
    let promise
    if (!this.useNative) {
      promise = window.localStorage.removeItem(key)
    } else {
      promise = new Promise((resolve, reject) => {
        window.NativeStorage.removeItem(key, resolve, reject)
      })
    }
    if (this.callbacks[key]) this.callbacks[key](null)
    return promise
  },

  async clear () {
    if (!this.useNative) {
      return window.localStorage.clear()
    } else {
      return new Promise((resolve, reject) => {
        window.NativeStorage.clear(resolve, reject)
      })
    }
  }
}

// set the following to false to use the browser storage (deleted after a week
// on iOS!!!)
storage.useNative = (process.env.NODE_ENV === 'production')
export default storage
