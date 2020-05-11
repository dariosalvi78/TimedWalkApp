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
            <v-ons-list-item><b>Distance:</b> &nbsp; {{ test.distance.toFixed(2) }} m</v-ons-list-item>
            <v-ons-list-item v-if="test.steps"><b>Steps:</b> &nbsp; {{ test.steps }} meters</v-ons-list-item>
          </v-ons-list>
        </div>
      </v-ons-card>
    </div>
  </v-ons-page>
</template>

<script>
import storage from '../modules/storage'

export default {
  name: 'HistoryPage',
  data () {
    return {
      history: undefined
    }
  },
  async created () {
    this.history = await storage.getItem('history')
  },
  methods: {
    formatDate(d) {
      let date = new Date(d)
      return date.getFullYear() + '-' + (date.getMonth()+1) + '-' + date.getDate()
    }
  }
}
</script>

<style>
</style>
