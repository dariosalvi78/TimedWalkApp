<template id="main-page">
  <v-ons-page id="tabbar-page">
    <v-ons-tabbar swipeable position="bottom" :visible="true" :index.sync="activeIndex" :tabs="tabs">
    </v-ons-tabbar>
  </v-ons-page>
</template>

<script>
import homePage from './components/Home'
import settingsPage from './components/Settings'
import historyPage from './components/History'
import walkPage from './components/Walk'

import api from './modules/api'
import storage from './modules/storage'

export default {
  name: 'MainPage',
  data () {
    return {
      activeIndex: 0,
      tabs: [
        {
          label: this.$t('menu.home'),
          icon: 'fa-home',
          key: 'homePage',
          page: homePage
        },
        {
          label: this.$t('menu.walk'),
          icon: 'fa-walking',
          key: 'walkPage',
          page: walkPage
        },
        {
          label: this.$t('menu.history'),
          icon: 'fa-history',
          key: 'historyPage',
          page: historyPage
        },
        {
          label: this.$t('menu.settings'),
          icon: 'fa-sliders',
          key: 'settingsPage',
          page: settingsPage
        }
      ]
    }
  },
  async created () {
    // if (this.$ons.platform.isIPhoneX()) {
    //   document.documentElement.setAttribute('onsflag-iphonex-portrait', '')
    //   document.documentElement.setAttribute('onsflag-iphonex-landscape', '')
    // }

    let dataShares = await storage.getItem('dataShares')
    if (dataShares && dataShares.length > 0) {
      // refresh token for each server endpoint we have a datashare with
      for (let ds of dataShares) {
        if (ds.endpoint && ds.endpoint.serverUrl && ds.endpoint.serverToken) {
          try {
            let newToken = await api.refreshToken(ds.endpoint)
            ds.endpoint.serverToken = newToken
            // save the updated endpoint back to storage
            await storage.setItem('dataShares', dataShares)
          } catch (e) {
            console.error('Error refreshing token on app start:', JSON.stringify(e))
            if (e.statusCode && e.statusCode === 401) { // if the error is an unauthorized error, we can assume the token is no longer valid and remove it
              ds.endpoint.serverToken = null
              // TODO: the user must be prompted that the data share is no longer valid and they must re-authenticate.
              // For now, we just remove the datashare from storage and the user will see it disappear from the list of datashares in settings.
              dataShares = dataShares.filter(ds2 => ds2.team.id !== ds.team.id)
              await storage.setItem('dataShares', dataShares)
            }
          }
        }
      }
    }
  }
}
</script>

<style></style>
