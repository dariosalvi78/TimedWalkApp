<template id="history">
  <v-ons-page>
    <v-ons-toolbar>
      <div class="center">History</div>
    </v-ons-toolbar>

    <div class="padding: 10px;">
      <v-ons-card v-for="(test, index) in history" :key="index">
        <div class="content">
          <v-ons-list>
            <v-ons-list-header><b>Test date:</b> &nbsp; {{ formatDate(test.date) }}</v-ons-list-header>
            <v-ons-list-item><b>Duration:</b> &nbsp; {{ test.duration }} minutes</v-ons-list-item>
            <v-ons-list-item><b>Distance:</b> &nbsp; {{ test.distance.toFixed(2) }} meters</v-ons-list-item>
            <v-ons-list-item v-if="test.steps"><b>Steps:</b> &nbsp; {{ test.steps }}</v-ons-list-item>
          </v-ons-list>
        </div>
      </v-ons-card>
    </div>
    <v-ons-fab :visible="showShare" @click="share()" position="bottom right">
      <v-ons-icon icon="fa-share-alt"></v-ons-icon>
    </v-ons-fab>
  </v-ons-page>
</template>

<script>
import storage from '../modules/storage'

export default {
  name: 'HistoryPage',
  data () {
    return {
      history: undefined,
      showShare: !!window.plugins.socialsharing.share
    }
  },
  async created () {
    this.history = await storage.getItem('history')
    storage.setChangeListener('history', (hist) => {
      this.history = hist
    })
  },
  methods: {
    formatDate (d) {
      let date = new Date(d)
      return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate()
    },
    async share () {
      let historyTxt = ''
      if (this.history) {
        for (let test of this.history) {
          historyTxt += 'Test date: ' + this.formatDate(test.date) + '\n'
          historyTxt += 'Duration: ' + test.duration + ' minutes\n'
          historyTxt += 'Distance: ' + test.distance.toFixed(2) + ' meters\n'
          if (test.steps !== undefined) historyTxt += 'Steps: ' + test.steps + '\n'
          historyTxt += '\n\n'
        }
      }
      console.log('sharing', historyTxt)
      if (window.plugins.socialsharing.share) {
        window.plugins.socialsharing.share({
          message: historyTxt,
          subject: '6MWT history'
        })
      }
    }
  }
}
</script>

<style>
</style>
