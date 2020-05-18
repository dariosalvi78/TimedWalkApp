<template id="testCompleted">
  <v-ons-page>
    <div class="content" style="padding: 10px; text-align: center;">
      <h1>
        Test completed!
      </h1>
      <div style="margin-top: 20px;"><b>Distance: </b> {{ testReport.distance.toFixed(2) }} meters</div>
      <div style="margin-top: 20px;"><b>Duration: </b> {{ testReport.duration }} minutes</div>
      <div v-if="testReport.steps" style="margin-top: 20px;"><b>Steps: </b> {{ testReport.steps }}</div>
      <div style="margin-top: 40px;">
        <v-ons-button @click="save">
          Save and go back
        </v-ons-button>
      </div>
    </div>
  </v-ons-page>
</template>

<script>
import storage from '../../modules/storage'

export default {
  name: 'TestCompletedPage',
  props: [ 'testReport' ],
  methods: {
    async save () {
      console.log('saving test')
      // save the results
      let history = await storage.getItem('history')
      if (!history) history = []
      history.push(this.testReport)
      await storage.setItem('history', history)

      this.$parent.pageStack.splice(1, 2)
    }
  }
}
</script>

<style>
</style>
