<template id="test2">
  <v-ons-page>
    <p style="text-align: center">
      adasdads
    </p>
    <div style="text-align: center">
      <v-ons-back-button @click="cancelTest">
        Cancel
      </v-ons-back-button>
    </div>
  </v-ons-page>
</template>

<script>
export default {
  name: 'TestWalkPage',
  methods: {
    async cancelTest () {
      console.log('test cancelled')
    }
  }
}
</script>

<style>
</style>
