<template id="testIntro">
  <v-ons-page>
    <div class="content" style="padding: 10px;">
      <h3 style="text-align: center;">Instructions</h3>

      <p style="text-align: center;">
        <v-ons-icon icon="fa-walking" size="30px"></v-ons-icon>
      </p>
      <p>
        The object of this test is to walk <b>as far as possible</b> for the
        duration of your choice, between 5 and 15 minutes.
      </p>
      <p>
        By walking for several minutes you will be exerting yourself.
      </p>
      <p>
        You should rest for at least 10 minutes before the test starts, preferably sitting.
      </p>

      <div style="text-align: center; margin-top: 10px;">
        <v-ons-icon icon="fa-dizzy" size="30px"></v-ons-icon>
      </div>
      <p>
        Depending on your conditions, you may get out of breath or become exhausted.
      </p>
      <p>
        You are permitted to slow down, to stop, and to rest as necessary.
      </p>
      <p>
        If you feel unwell, stop immediately and cancel the test.
      </p>
      <p>
        Contact your doctor if you feel any uncomfortable symptom.
      </p>

      <p style="text-align: center;">
        <v-ons-icon icon="fa-road" size="30px"></v-ons-icon>
      </p>
      <p>
        Choose a <b>path outdoor</b> with enough length (600 m and above).
      </p>
      <p>
        The path should be <b>flat</b>, no up-hills or down-hills.
      </p>
      <p>
        The path should be <b>straight</b> or gently curved. Avoid U-turns, they
        affect the accuracy of the measurement.
      </p>

      <div style="text-align: center; margin-top: 10px;">
        <v-ons-icon icon="fa-sun" size="30px"></v-ons-icon>
      </div>
      <p>
        Choose a day with <b>good weather.</b> Besides being more pleasurable,
        it also increases the chances of getting a good satellite signal.
      </p>
      <p>
        Avoid places with tall buildings, they interfere with the satellites reception.
      </p>
      <p>
        A park with not many trees would be ideal.
      </p>

      <div style="text-align: center; margin-top: 10px;">
        <v-ons-icon icon="fa-map-marker-alt" size="30px"></v-ons-icon>
      </div>
      <p>
        <b>Activate satellite positioning</b> on your phone.
      </p>
      <p>
        You may also want to keep the mobile Internet activated, as this will
        make the finding of satellites faster.
      </p>
      <p>
        The app may ask you to provide permission to access your position and
        the step counter. These are needed to compute the distance you walk.
      </p>
      <p>
        Before starting the test, it's better to have the battery well charged,
        if the phone runs out of power, the test will be interrupted.
      </p>

      <div style="text-align: center; margin-top: 10px;">
        <v-ons-icon icon="fa-ruler" size="30px"></v-ons-icon>
      </div>
      <p>
        <b>Choose how many minutes you want to walk.</b>
      </p>
      <p>
        Six minutes is the most commonly used duration.
      </p>

      <div style="text-align: center;">
        Minutes: {{ duration }}
        <v-ons-range v-model="duration" style="width: 100%;" min="3" max="15" step="1"></v-ons-range>
      </div>

      <div style="text-align: center; margin-top: 20px;">
        <v-ons-button @click="startTest">Start</v-ons-button>
      </div>
    </div>
  </v-ons-page>
</template>

<script>
import testWalk from './TestWalk'
import storage from '../../modules/storage'

export default {
  name: 'TestIntroPage',
  data () {
    return {
      duration: 6
    }
  },
  methods: {
    async startTest () {
      // store duration so the next time is already set by default
      await storage.setItem('duration', this.duration)
      this.$emit('push-page', testWalk)
    }
  },
  async created () {
    // get last stored duration
    let dur = await storage.getItem('duration')
    if (dur) {
      this.duration = dur
    }
  }
}
</script>

<style>
</style>
