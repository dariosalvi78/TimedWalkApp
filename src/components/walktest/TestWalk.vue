<template id="testWalk">
  <v-ons-page>
    <div class="content">
      <walking-man ref="walkingMan"/>
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
    </div>
  </v-ons-page>
</template>

<script>
import testCompleted from './TestCompleted'
import WalkingMan from './WalkingMan'

export default {
  name: 'TestWalkPage',
  components: { WalkingMan },
  mounted () {

    this.$refs.walkingMan.play()
  },
  methods: {
    async endTest () {
      this.$refs.walkingMan.stop()
      this.$emit('push-page', testCompleted)
    },
    async cancelTest () {
      this.$refs.walkingMan.stop()
      this.$parent.popPage()
    }
  }
}
</script>

<style>
</style>
