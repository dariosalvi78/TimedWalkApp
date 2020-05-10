<template id="testCompleted">
  <v-ons-page>
    <p style="text-align: center">
      Test completed!
    </p>
    <div style="text-align: center">
      <v-ons-button @click="restart">
        Restart
      </v-ons-button>
    </div>
  </v-ons-page>
</template>

<script>
export default {
  name: 'TestCompletedPage',
  created () {
    console.log('parent', this.$parent)
  },
  methods: {
    async restart () {
      console.log('restarting test')
      this.$parent.pageStack.splice(1, 2)
    }
  }
}
</script>

<style>
</style>
