'use strict'

/**
* Wrapper of the local storage or cordova native storage plugin
* Needs this plugin: https://github.com/TheCocoaProject/cordova-plugin-nativestorage#README.md
*/

let storage = {
  isCordova: false,

  async getItem (key) {
    if (!this.isCordova) {
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
    if (!this.isCordova) {
      return window.localStorage.setItem(key, JSON.stringify(value))
    } else {
      return new Promise((resolve, reject) => {
        window.NativeStorage.setItem(key, JSON.stringify(value), resolve, reject)
      })
    }
  },

  async removeItem (key) {
    if (!this.isCordova) {
      return window.localStorage.removeItem(key)
    } else {
      return new Promise((resolve, reject) => {
        window.NativeStorage.removeItem(key, resolve, reject)
      })
    }
  },

  async clear () {
    if (!this.isCordova) {
      return window.localStorage.clear()
    } else {
      return new Promise((resolve, reject) => {
        window.NativeStorage.clear(resolve, reject)
      })
    }
  }
}

document.addEventListener("deviceready", () => {
  storage.isCordova = true
}, false)

export default storage
