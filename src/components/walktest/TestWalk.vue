<template id="testWalk">
  <v-ons-page>
    <div class="content" style="padding: 10px; text-align: center">
      <walking-man ref="walkingMan" />
      <div class="messageBox">
        <div style="text-align: center">
          <v-ons-icon :icon="messageIcon" size="30px"></v-ons-icon>
        </div>
        <h3>
          {{ messageText }}
        </h3>
      </div>
      <div class="timer">{{ minutes }} : {{ seconds }}</div>
      <div style="margin-top: 40px">
        <v-ons-button @click="cancelTest">
          {{ $t("walk.cancel") }}
        </v-ons-button>
      </div>
    </div>
  </v-ons-page>
</template>

<script>
import testCompletedPage from './TestCompleted'
import WalkingMan from './WalkingMan'
import storage from '../../modules/storage'
import gps from '../../modules/gps'
import stepcounter from '../../modules/stepcounter'
import motion from '../../modules/motion'
import distanceAlgo from '../../modules/outdoorDistance'
import files from '../../modules/files'

// from https://stackoverflow.com/questions/10073699/pad-a-number-with-leading-zeros-in-javascript
let padToTwo = (number) => (number <= 99 ? `0${number}`.slice(-2) : number)
const TMP_FILENAME = 'timedwalk.txt'
let logger

export default {
  name: 'TestWalkPage',
  components: { WalkingMan },
  data () {
    return {
      duration: 6,
      countdown: 10,
      timer: undefined,
      isSignalCheck: true,
      lastStep: undefined,
      messageText: null,
      messageIcon: null
    }
  },
  async mounted () {
    console.log('Mounted, starting GPS')
    let dur = await storage.getItem('duration')
    if (dur) {
      this.duration = dur
      this.countdown = dur * 60
    }

    this.isSignalCheck = true
    this.messageText = this.$t('walk.signalCheck')
    this.messageIcon = 'fa-satellite'

    // avoid screen going to sleep
    if (window.plugins && window.plugins.insomnia) {
      window.plugins.insomnia.keepAwake()
    }

    try {
      await files.deleteLog(TMP_FILENAME)
    } catch (e) {
      console.error('cannot delete log, but thats OK')
    }
    try {
      logger = await files.createLog(TMP_FILENAME)
    } catch (e) {
      console.error(e)
    }
    logger.log('E - signal check start')

    // start getting GPS
    gps.startNotifications((position) => {
      logger.log('P - position ' + JSON.stringify(position))
      if (this.lastStep) {
        position.steps = this.lastStep
      }
      distanceAlgo.addPosition(position)

      if (this.isSignalCheck) {
        // start if the signal is OK
        if (distanceAlgo.isSignalOK()) {
          // start the next phase
          this.testStarted()
        }
      }
    }, (err) => {
      logger.log('P - error ' + JSON.stringify(err))
    })
  },
  beforeDestroy () {
    // remove logger callbacks, these should not be needed, but better safe than sorry!
    motion.stopNotifications()
    gps.stopNotifications()
    stepcounter.stopNotifications()

    // cancel UI stuff, again shouldn't be needed
    if (window.plugins && window.plugins.insomnia) {
      window.plugins.insomnia.allowSleepAgain()
    }
    clearInterval(this.timer)
    if (this.$refs.walkingMan) this.$refs.walkingMan.stop()
  },
  computed: {
    minutes () {
      return Math.floor(this.countdown / 60)
    },
    seconds () {
      return padToTwo(Math.floor(this.countdown % 60))
    }
  },
  methods: {
    voiceMessage (txt) {
      if ('speechSynthesis' in window) {
        var msg = new SpeechSynthesisUtterance()
        msg.text = txt
        msg.lang = navigator.language.split('-')[0]
        speechSynthesis.speak(msg)
      } else {
        window.TTS.speak(
          {
            text: txt,
            locale: navigator.language
          },
          (a) => a,
          (error) => console.log(error)
        )
      }
    },
    sendMessage () {
      let durSecs = this.duration * 60
      let ctdwnRmn = this.countdown % 60
      if (!this.isSignalCheck) {
        if (durSecs >= this.countdown && this.countdown >= durSecs - 3) {
          this.messageText = this.$t('walk.startNow')
          this.messageIcon = 'fa-exclamation'
          if (this.countdown === durSecs) {
            this.voiceMessage(this.$t('walk.startNow'))
          }
        } else if (
          this.countdown < durSecs - 50 &&
          this.countdown > 50 &&
          (ctdwnRmn === 0 || ctdwnRmn >= 57)
        ) {
          let minsRmn = Math.floor(this.countdown / 60)
          let mins = ctdwnRmn === 0 ? minsRmn : minsRmn + 1
          let msg
          if (mins % 2) msg = this.$t('walk.doingWell')
          else msg = this.$t('walk.keepUp')
          msg += ' ' + this.$t('walk.minutesToGo', { mins })
          this.messageText = msg
          this.messageIcon = 'fa-exclamation-triangle'
          if (ctdwnRmn === 0) this.voiceMessage(msg)
        } else if (this.countdown === 1) {
          this.voiceMessage(this.$t('walk.completed'))
        } else {
          this.messageText = null
          this.messageIcon = null
        }
      }
    },
    async testStarted () {
      logger.log('E - test start')

      if (await motion.isAvailable()) {
        motion.startNotifications({}, (event) => {
          let pre = ''
          if (event.type == 'motion') pre = 'M - motion '
          else if (event.type == 'orientation') pre = 'O - orientation '
          delete event.type
          logger.log(pre + JSON.stringify(event))
        })
      }

      if (await stepcounter.isAvailable()) {
        stepcounter.startNotifications({}, async (steps) => {
          logger.log('S - steps ' + JSON.stringify(steps))
          this.lastStep = steps.numberOfSteps
        })
      }

      this.isSignalCheck = false
      this.countdown = this.duration * 60

      this.sendMessage()

      if (this.$refs.walkingMan) this.$refs.walkingMan.play()
      distanceAlgo.startTest()

      if (this.timer) clearInterval(this.timer)
      this.timer = setInterval(() => {
        if (this.countdown >= 1) {
          this.countdown--
          this.sendMessage()
        } else {
          this.sendMessage()
          this.testCompleted()
        }
      }, 1000)
    },
    async testCompleted () {
      motion.stopNotifications()

      clearInterval(this.timer)
      gps.stopNotifications()
      this.$refs.walkingMan.stop()
      stepcounter.stopNotifications()

      distanceAlgo.stopTest()
      let distance = distanceAlgo.getDistance()
      let testReport = {
        duration: this.duration,
        date: new Date(),
        distance: distance,
        steps: this.lastStep
      }

      logger.log('E - test end ' + JSON.stringify(testReport))

      if (window.plugins && window.plugins.insomnia) {
        window.plugins.insomnia.allowSleepAgain()
      }

      this.$emit('push-page', {
        extends: testCompletedPage,
        onsNavigatorProps: {
          testReport
        }
      })
    },
    async cancelTest () {
      clearInterval(this.timer)
      motion.stopNotifications()
      gps.stopNotifications()
      stepcounter.stopNotifications()

      // we don't need to keep the log any longer
      try {
        await files.deleteLog(TMP_FILENAME)
      } catch (e) {
        console.error(e)
      }
      this.$parent.popPage()
    }
  }
}
</script>

<style>
.timer {
  font-weight: bold;
  font-size: 3rem;
}

.messageBox {
  margin-top: 40px;
  height: 135px;
}
</style>
