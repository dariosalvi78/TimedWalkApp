<template id="testWalk">
  <v-ons-page>
    <div class="content" style="padding: 10px; text-align: center;">
      <walking-man ref="walkingMan"/>
        <div class="messageBox">
          <div style="text-align: center;">
            <v-ons-icon :icon="messageIcon" size="30px"></v-ons-icon>
          </div>
          <h3>
            {{messageText}}
          </h3>
        </div>
        <div class="timer"> {{ minutes }} : {{ seconds }} </div>
      <div style="margin-top: 40px;">
        <v-ons-button @click="cancelTest">
          Cancel
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
import distanceAlgo from '../../modules/outdoorDistance'

// from https://stackoverflow.com/questions/10073699/pad-a-number-with-leading-zeros-in-javascript
let padToTwo = number => number <= 99 ? `0${number}`.slice(-2) : number

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
    if (window.plugins && window.plugins.insomnia) window.plugins.insomnia.keepAwake()

    // start getting GPS
    gps.startNotifications(async (position) => {
      console.log('Got position: ', position)
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
      console.error('Cannot retrieve GPS position', err)
    })
  },
  beforeDestroy () {
    console.log('stopping stuff')
    if (window.plugins && window.plugins.insomnia) window.plugins.insomnia.allowSleepAgain()
    clearInterval(this.timer)
    if (this.$refs.walkingMan) this.$refs.walkingMan.stop()
    gps.stopNotifications()
    stepcounter.stopNotifications()
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
      var msg = new SpeechSynthesisUtterance()

      msg.text = txt
      msg.lang = navigator.language.split('-')[0]

      speechSynthesis.speak(msg)
    },
    sendMessage () {
      let durSecs = this.duration * 60
      let ctdwnRmn = this.countdown % 60
      if (!this.isSignalCheck) {
        if (durSecs >= this.countdown && this.countdown >= durSecs - 3) {
          this.messageText = this.$t('walk.startNow')
          this.messageIcon = 'fa-exclamation'
          if (this.countdown === durSecs) this.voiceMessage(this.$t('walk.startNow'))
        } else if (this.countdown < (durSecs - 50) && this.countdown > 50 && (ctdwnRmn === 0 || ctdwnRmn >= 57)) {
          let minsRmn = Math.floor(this.countdown / 60)
          let mins = ctdwnRmn === 0 ? minsRmn : minsRmn + 1
          let msg
          if (mins % 2) msg = this.$t('walk.doingWell')
          else msg = this.$t('walk.keepUp')
          msg += ' ' + this.$t('walk.minutesToGo', {mins})
          this.messageText = msg
          this.messageIcon = 'fa-exclamation-triangle'
          if (ctdwnRmn === 0) this.voiceMessage(msg)
        } else {
          this.messageText = null
          this.messageIcon = null
        }
      }
    },
    async testStarted () {
      if (await stepcounter.isAvailable()) {
        stepcounter.startNotifications({}, (steps) => {
          console.log('Got steps', steps)
          this.lastStep = steps.numberOfSteps
        })
      }
      console.log('Test started')
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
          this.testCompleted()
        }
      }, 1000)
    },
    async testCompleted () {
      if (window.plugins && window.plugins.insomnia) window.plugins.insomnia.allowSleepAgain()
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

      this.$emit('push-page', {
        extends: testCompletedPage,
        onsNavigatorProps: {
          testReport
        }
      })
    },
    async cancelTest () {
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
  height: 130px;
}
</style>
