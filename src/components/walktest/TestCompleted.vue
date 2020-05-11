<template id="testCompleted">
  <v-ons-page>
    <p style="text-align: center">
      Test completed!
    </p>
    <div style="text-align: center">
      <v-ons-button @click="save">
        Save
      </v-ons-button>
    </div>
  </v-ons-page>
</template>

<script>
import storage from '../../modules/storage'

export default {
  name: 'TestCompletedPage',
  props: [ 'testReport' ],
  created () {
    console.log('parent', this.$parent)
  },
  methods: {
    async save () {
      console.log('saving test')
      // save the results
      let history = await storage.getItem('history')
      if (!history) history = {}
      history.push(this.testReport)
      await storage.setItem('history')

      this.$parent.pageStack.splice(1, 2)
    }
  }
}
</script>

<style>
</style>
