/**
* Wrapper of the local storage or cordova native storage plugin
* Needs this plugin: https://github.com/TheCocoaProject/cordova-plugin-nativestorage#README.md
*/

const LocalStorage = {

  callbacks: {},

  setChangeListener (key, cbk) {
    this.callbacks[key] = cbk
  },

  unsetChangeListener (key) {
    this.callbacks[key] = undefined
  },

  async getItem (key) {
    return JSON.parse(window.localStorage.getItem(key))
  },

  async setItem (key, value) {
    let promise = window.localStorage.setItem(key, JSON.stringify(value))
    if (this.callbacks[key]) this.callbacks[key](value)
    return promise
  },

  async removeItem (key) {
    let promise = window.localStorage.removeItem(key)
    if (this.callbacks[key]) this.callbacks[key](null)
    return promise
  },

  async clear () {
    return window.localStorage.clear()
  }
}

const nativeStorage = {
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

export default (process.env.VUE_APP_STORAGE === 'local') ? LocalStorage : nativeStorage
