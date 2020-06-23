'use strict'
import VueOnsen from 'vue-onsenui'

let Platform = VueOnsen._ons.platform

export default {

  /**
  * Utility function that translates the error code to a string
  */
  errorCodeToString (code) {
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
  },

  /**
  * Opens a file.
  * @param {string} filename - filename to be opened
  * @param {boolean} forcecreate - if true the file is created if does not exist
  * @param {boolean} temporary - uses the temporary folder
  */
  async openFile (filename, temporary, forcecreate) {
    if (!Platform.isWebView()) {
      return filename
    }
    let folder
    if (temporary) folder = window.TEMPORARY
    else folder = window.LocalFileSystem.PERSISTENT
    return new Promise((resolve, reject) => {
      window.requestFileSystem(folder, 5 * 1024 * 1024, function (fs) {
        fs.root.getFile(filename, { create: forcecreate, exclusive: false }, resolve, reject)
      }, reject)
    })
  },

  /**
  * Reads a file and delivers the content as an object
  * @param {Object} file - the file to be opened
  */
  async read (file) {
    if (!Platform.isWebView()) {
      return window.localStorage.getItem(file)
    }

    return new Promise((resolve, reject) => {
      file.file(function (file) {
        var reader = new FileReader()
        reader.onloadend = resolve
        reader.readAsText(file)
      }, reject)
    })
  },

  /**
  * Deletes a file from the file system.
  * @param {Object} file - the file to be deleted
  */
  async deleteFile (file) {
    if (!Platform.isWebView()) {
      return window.localStorage.removeItem(file)
    }

    return new Promise((resolve, reject) => {
      file.remove(resolve, reject)
    })
  },

  /**
  * Saves txt into the file
  * @param {Object} file - file where to save
  * @param {string} txt - is the text to be saved
  */
  async save (file, txt) {
    if (!Platform.isWebView()) {
      return window.localStorage.setItem(file, txt)
    }

    if (typeof txt !== 'string') txt = txt.toString()
    return new Promise((resolve, reject) => {
      file.createWriter(function (fileWriter) {
        fileWriter.onwriteend = resolve
        fileWriter.onerror = reject
        fileWriter.write(txt)
      })
    })
  },

  /**
  * Creates a temporary logfile where to append text
  * @param {string} filename - the file name
  */
  async createLog (filename) {
    /**
    * Appends lines to the logger
    * It works asynchronously, data is NOT buffered and the writer can be busy
    * @param {string} line - the text to be appended, a timestamp and newline are added to it
    */
    let log = async function (line, writer) {
      line = new Date().toISOString() + ' - ' + line + '\n'
      if (!Platform.isWebView()) {
        let pretxt = window.localStorage.getItem(filename)
        if (pretxt) line = pretxt + line
        return window.localStorage.setItem(filename, line)
      }

      return new Promise((resolve, reject) => {
        writer.onerror = reject
        writer.onwriteend = resolve
        writer.write(line)
      })
    }
    if (!Platform.isWebView()) {
      return {
        async log (line) {
          console.log('LOG:', line)
          log(line, null)
        }
      }
    }
    let file = await this.openFile(filename, true, true)
    return new Promise((resolve, reject) => {
      file.createWriter(function (fileWriter) {
        fileWriter.seek(fileWriter.length)
        resolve({
          async log (line) {
            log(line, fileWriter)
          }
        })
      }, reject)
    })
  },

  /**
  * Reads a temporary logfile.
  * @param {string} filename - the file name
  */
  async readLog (filename) {
    let file = await this.openFile(filename, true, true)
    return this.read(file)
  },

  /**
  * Deletes a temporary logfile.
  * @param {string} filename - the file name
  */
  async deleteLog (filename) {
    let file = await this.openFile(filename, true, true)
    return this.deleteFile(file)
  }

}
