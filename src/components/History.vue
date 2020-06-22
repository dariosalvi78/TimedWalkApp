<template id="history">
  <v-ons-page>
    <v-ons-toolbar>
      <div class="center">{{$t('history.title')}}</div>
    </v-ons-toolbar>

    <div class="padding: 10px;">
      <v-ons-card v-for="(test, index) in history" :key="index">
        <div class="content">
          <v-ons-list>
            <v-ons-list-header><b>{{$t('history.item.date')}}:</b> &nbsp; {{ formatDate(test.date) }}</v-ons-list-header>
            <v-ons-list-item><b>{{$t('history.item.date')}}:</b> &nbsp; {{ test.duration }} minutes</v-ons-list-item>
            <v-ons-list-item><b>{{$t('history.item.distance')}}:</b> &nbsp; {{ test.distance.toFixed(2) }} meters</v-ons-list-item>
            <v-ons-list-item v-if="test.steps"><b>{{$t('history.item.steps')}}:</b> &nbsp; {{ test.steps }}</v-ons-list-item>
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

const socialsharingExists = window.plugins && window.plugins.socialsharing && window.plugins.socialsharing.share

export default {
  name: 'HistoryPage',
  data () {
    return {
      history: undefined,
      showShare: socialsharingExists
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
      if (socialsharingExists) {
        window.plugins.socialsharing.share(historyTxt, this.$t('history.shareTopic'))
      }
    }
  }
}
</script>

<style>
</style>
