<template id="history">
  <v-ons-page>
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
