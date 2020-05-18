<template id="testWalk">
  <v-ons-page>
    <div class="content" style="padding: 10px; text-align: center;">
      <walking-man ref="walkingMan"/>
      <div style="margin-top: 40px;">
        <h2 v-show="isSignalCheck" >Waiting for GPS signal, make sure you are outdoor and the GPS is activated on the phone</h2>
        <h2 v-show="!isSignalCheck" >Walk!</h2>
        <div class="timer"> {{ minutes }} : {{ seconds }} </div>
      </div>
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
      lastStep: undefined
    }
  },
  async mounted () {
    console.log('Mounted, starting GPS')
    let dur = await storage.getItem('duration')
    if (dur) {
      this.duration = dur
      this.countdown = dur * 60
    }

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
    async testStarted () {
      if (await stepcounter.isAvailable()) {
        stepcounter.startNotifications({}, (steps) => {
          console.log('Got steps', steps)
          this.lastStep = steps.numberOfSteps
        })
      }
      console.log('Test started')
      this.isSignalCheck = false
      if (this.$refs.walkingMan) this.$refs.walkingMan.play()
      distanceAlgo.startTest()
      if (this.timer) clearInterval(this.timer)
      this.timer = setInterval(() => {
        if (this.countdown >= 1) {
          this.countdown--
        } else {
          this.testCompleted()
        }
      }, 1000)
    },
    async testCompleted () {
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
</style>
