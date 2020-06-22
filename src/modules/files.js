'use strict'
import VueOnsen from 'vue-onsenui'

let Platform = VueOnsen._ons.platform

/**
* Utility function that translates the error code to a string
*/
let errorCodeToString = (code) => {
  switch (code) {
    case 1:
      return 'NOT_FOUND_ERR'
    case 2:
      return 'SECURITY_ERR'
    case 3:
      return 'ABORT_ERR'
    case 4:
      return 'NOT_READABLE_ERR'
    case 5:
      return 'ENCODING_ERR'
    case 6:
      return 'NO_MODIFICATION_ALLOWED_ERR'
    case 7:
      return 'INVALID_STATE_ERR'
    case 8:
      return 'SYNTAX_ERR'
    case 9:
      return 'INVALID_MODIFICATION_ERR'
    case 10:
      return 'QUOTA_EXCEEDED_ERR'
    case 11:
      return 'TYPE_MISMATCH_ERR'
    case 12:
      return 'PATH_EXISTS_ERR'
    default:
      return 'Unknown Error ' + code
  }
}

export default {

  /**
  * Opens a file.
  * @param {string} filename - filename to be opened
  * @param {string} forcecreate - if true the file is created if does not exist
  */
  async openFile (filename, forcecreate) {
    if (!Platform.isWebView()) {
      console.log('Opening file: ' + filename)
      return
    }
    // use the temporary directory
    let folder = window.cordova.file.tempDirectory

    return new Promise((resolve, reject) => {
      window.resolveLocalFileSystemURL(folder, function (dir) {
        dir.getFile(filename, { create: true }, function (file) {
          resolve(file)
        }, function (e) {
          reject(new Error('Cannot open file ' + filename + ', ' + errorCodeToString(e.code)))
        })
      })
    })
  },

  /**
  * Reads a file and delivers the content as an object
  * @param {string} filename - the file to be opened
  */
  async load (filename) {
    if (!Platform.isWebView()) {
      console.log('Loading file: ' + filename)
      return 'xxx'
    }

    let file = await this.openFile(filename)

    return new Promise((resolve, reject) => {
      file.file(function (file) {
        var reader = new FileReader()
        reader.onloadend = function () {
          resolve(JSON.parse(this.result))
        }
        reader.readAsText(file)
      }, function (e) {
        reject(new Error('Cannot read file ' + filename + ': ' + errorCodeToString(e.code)))
      })
    })
  },

  /**
  * Deletes a file from the file system.
  * @param {string} filename - the file to be deleted
  */
  async deleteFile (filename) {
    if (!Platform.isWebView()) {
      console.log('Deleting file: ' + filename)
      return
    }

    let file = await this.openFile(filename)
    return new Promise((resolve, reject) => {
      file.remove(resolve, function (e) {
        reject(new Error('Cannot delete file ' + filename + ', ' + errorCodeToString(e.code)))
      })
    })
  },

  /**
  * Saves txt into the file
  * @param {string} filename - filename is the name of the file
  * @param {string} txt - is the text to be saved
  */
  async save (filename, txt) {
    if (!Platform.isWebView()) {
      console.log('Saving file: ' + filename, txt)
      return
    }

    if (typeof txt !== 'string') txt = txt.toString()
    let file = await this.openFile(filename)
    return new Promise((resolve, reject) => {
      file.createWriter(function (fileWriter) {
        fileWriter.onwriteend = function (e) {
          resolve()
        }
        fileWriter.onerror = function (e) {
          reject(new Error('Cannot write to file: ' + errorCodeToString(e.code)))
        }
        fileWriter.write(txt)
      })
    })
  },

  /**
  * Creates a persistent log and appends text in it.
  * It works asynchronously, data is NOT buffered and the writer can be busy
  * @param {string} filename - the file name
  * @param {string} txt - the text to be appended
  */
  async log (filename, txt) {
    if (!Platform.isWebView()) {
      console.log('Appending to file: ' + filename, txt)
      return
    }

    if (typeof txt !== 'string') txt = txt.toString()
    let file = await this.openFile(filename)

    return new Promise((resolve, reject) => {
      file.createWriter(function (fileWriter) {
        fileWriter.onerror = function (e) {
          reject(new Error('Cannot append to file ' + filename + ', ' + errorCodeToString(e.code)))
        }

        fileWriter.onwriteend = resolve

        fileWriter.seek(fileWriter.length)
        fileWriter.write(new Date().toISOString() + ' - ' + txt)
      }, reject)
    })
  }

}
