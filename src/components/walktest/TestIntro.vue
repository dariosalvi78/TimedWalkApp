<template id="testIntro">
  <v-ons-page>
    <p style="text-align: center">
      Instructions here
    </p>
    <div style="text-align: center">
      <v-ons-button @click="startTest">Start</v-ons-button>
    </div>
  </v-ons-page>
</template>

<script>
import testWalk from './TestWalk'

export default {
  name: 'TestIntroPage',
  methods: {
    startTest() {
      console.log('starting test')
      this.$emit('push-page', testWalk)
    }
  }
}
</script>

<style>
</style>
