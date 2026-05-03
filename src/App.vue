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

    let serverToken = await storage.getItem('serverToken')
    if (serverToken) {
      try {
        let newToken = await api.refreshToken(serverToken)
        await storage.setItem('serverToken', newToken)
      } catch (e) {
        console.error('Error refreshing token on app start:', e)
        if (e.code && e.code === 401) { // if the error is an unauthorized error, we can assume the token is no longer valid and remove it
          await storage.removeItem('serverToken')
        }
      }
    }
  }
}
</script>

<style></style>
