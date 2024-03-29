export default {

  /**
  * Utility function that translates the error code to a string
  */
  errorCodeToString(code) {
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
  async openFile(filename, temporary, forcecreate) {
    if (process.env.NODE_ENV !== 'production') {
      return filename
    }
    let folder
    if (temporary) folder = window.TEMPORARY
    else folder = window.LocalFileSystem.PERSISTENT
    return new Promise((resolve, reject) => {
      // test code start
      // window.resolveLocalFileSystemURL(window.cordova.file.externalDataDirectory, function (dirEntry) {
      //   console.log('file system opened')
      //   dirEntry.getFile(filename, { create: forcecreate, exclusive: false }, resolve, reject)
      // }, reject)
      // test code stop

      window.requestFileSystem(folder, 5 * 1024 * 1024, function (fs) {
        fs.root.getFile(filename, { create: forcecreate, exclusive: false }, resolve, reject)
      }, reject)
    })
  },

  async getFilePath(filename, temporary) {
    if (process.env.NODE_ENV !== 'production') {
      return filename
    }
    let file = await this.openFile(filename, temporary, false)
    return file.nativeURL
  },

  /**
  * Reads a file and delivers the content as an object
  * @param {Object} file - the file to be opened
  */
  async read(file) {
    if (process.env.NODE_ENV !== 'production') {
      return window.localStorage.getItem(file)
    }

    return new Promise((resolve, reject) => {
      file.file(function (file) {
        var reader = new FileReader()
        reader.onloadend = function () {
          resolve(this.result)
        }
        reader.readAsText(file)
      }, reject)
    })
  },

  /**
  * Deletes a file from the file system.
  * @param {Object} file - the file to be deleted
  */
  async deleteFile(file) {
    if (process.env.NODE_ENV !== 'production') {
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
  async save(file, txt) {
    if (process.env.NODE_ENV !== 'production') {
      return window.localStorage.setItem(file, txt)
    }

    if (typeof txt !== 'string') txt = txt.toString()
    return new Promise((resolve, reject) => {
      file.createWriter(function (fileWriter) {
        fileWriter.onwriteend = resolve
        fileWriter.onerror = (err) => {
          console.error(err)
          if (reject) reject()
        }
        fileWriter.write(txt)
      })
    })
  },

  /**
  * Creates a temporary logfile where to append text
  * @param {string} filename - the file name
  */
  async createLog(filename) {
    let file = null
    if (process.env.NODE_ENV === 'production') file = await this.openFile(filename, true, true)

    return {
      buffer: '',
      writing: false,
      writeBuffer(completed, error) {
        this.writing = true
        let toWrite = this.buffer
        this.buffer = ''

        file.createWriter((fileWriter) => {
          fileWriter.seek(fileWriter.length)
          fileWriter.onerror = error
          fileWriter.onwriteend = () => {
            if (this.buffer.length > 0) {
              // buffer not empty, keep writing
              this.writeBuffer(completed, error)
            } else {
              // buffer empty, completed!
              this.writing = false
              if (completed) completed()
            }
          }
          fileWriter.write(toWrite)
        }, error)
      },
      /**
      * Appends lines to the logger
      * If the logger is busy writing, the promise resolves immediately
      * @param {string} line - the text to be appended, a timestamp and newline are added to it
      */
      async log(line) {
        // add the line to the buffer
        this.buffer += new Date().toISOString() + ' - ' + line + '\n'

        return new Promise((resolve, reject) => {
          // simulation in browser
          if (process.env.NODE_ENV !== 'production') {
            let pretxt = window.localStorage.getItem(filename)
            if (pretxt) this.buffer = pretxt + this.buffer
            window.localStorage.setItem(filename, this.buffer)
            this.buffer = ''
            resolve()
          }

          // if writing, return immediately
          if (this.writing) resolve()
          else this.writeBuffer(resolve, reject)
        })
      }
    }
  },

  /**
  * Reads a temporary logfile.
  * @param {string} filename - the file name
  */
  async readLog(filename) {
    let file = await this.openFile(filename, true, true)
    let txt = await this.read(file)
    return txt
  },

  /**
  * Deletes a temporary logfile.
  * @param {string} filename - the file name
  */
  async deleteLog(filename) {
    let file = await this.openFile(filename, true, false)
    return this.deleteFile(file)
  }

}
