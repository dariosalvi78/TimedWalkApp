<template id="testWalk">
  <v-ons-page>
    <p style="text-align: center">
      adasdads
    </p>
    <div style="text-align: center">
      <v-ons-button @click="endTest">
        End
      </v-ons-button>
    </div>
    <div style="text-align: center">
      <v-ons-button @click="cancelTest">
        Cancel
      </v-ons-button>
    </div>
  </v-ons-page>
</template>

<script>
import testCompleted from './TestCompleted'

export default {
  name: 'TestWalkPage',
  methods: {
    async endTest () {
      this.$emit('push-page', testCompleted)
    },
    async cancelTest () {
      console.log('test cancelled')
      this.$parent.popPage()
    }
  }
}
</script>

<style>
</style>
