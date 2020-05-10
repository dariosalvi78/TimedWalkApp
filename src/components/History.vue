<template id="history">
  <v-ons-page>
    <v-ons-toolbar>
      <div class="center">History</div>
    </v-ons-toolbar>
    <p style="text-align: center">
      History
    </p>
  </v-ons-page>
</template>

<script>
import storage from '../modules/storage'

export default {
  name: 'HistoryPage',
  async created () {
    await storage.getItem('history')
  }
}
</script>

<style>
</style>
