<template id="testIntro">
  <v-ons-page>
    <div class="content" style="padding: 10px;">
      <h3 style="text-align: center;">Instructions</h3>

      <p style="text-align: center;">
        <v-ons-icon icon="fa-road" size="30px"></v-ons-icon>
      </p>
      <p>
        <b>Choose a straight path outdoor with enough length (600 m and above).</b>
      </p>
      <p>
        The path should be flat, no up-hills or down-hills.
      </p>
      <p>
        You will be asked to walk along this path as far as you can go.
      </p>

      <p style="text-align: center;">
        <v-ons-icon icon="fa-sun" size="30px"></v-ons-icon>
      </p>
      <p>
        <b>Choose a day with good weather.</b>
      </p>
      <p>
        Besides being more pleasurable, it also increases the chances of getting a good GPS signal.
      </p>
      <p>
        Avoid places with tall buildings, they interfere with the GPS. A park with not many trees would be ideal.
      </p>

      <p style="text-align: center;">
        <v-ons-icon icon="fa-user-cog" size="30px"></v-ons-icon>
      </p>
      <p>
        <b>Activate the GPS.</b>
      </p>
      <p>
        You may also want to keep the Mobile Internet activated, as this will improve the accuracy of the localisation.
      </p>
      <p>
        The app may ask you to provide permission to access your position and the step counter. These are needed to compute the distance you walk.
      </p>
      <p>
        Before starting the test, it's better to have the battery well charged, if the phone runs out of power, the test will be interrupted.
      </p>

      <p style="text-align: center;">
        <v-ons-icon icon="fa-ruler" size="30px"></v-ons-icon>
      </p>
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
    async startTest() {
      console.log('starting test')
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
