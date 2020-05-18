'use strict'

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
          resolve(JSON.parse(data))
        }, reject)
      })
    }
  },

  async setItem (key, value) {
    if (this.callbacks[key]) this.callbacks[key](value)
    if (!this.useNative) {
      return window.localStorage.setItem(key, JSON.stringify(value))
    } else {
      return new Promise((resolve, reject) => {
        window.NativeStorage.setItem(key, JSON.stringify(value), resolve, reject)
      })
    }
  },

  async removeItem (key) {
    if (this.callbacks[key]) this.callbacks[key](undefined)
    if (!this.useNative) {
      return window.localStorage.removeItem(key)
    } else {
      return new Promise((resolve, reject) => {
        window.NativeStorage.removeItem(key, resolve, reject)
      })
    }
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
storage.useNative = false
export default storage
