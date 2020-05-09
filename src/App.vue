<template id="main-page">
  <ons-page id="tabbar-page">
    <v-ons-toolbar>
      <div class="center">Timed walk app</div>
    </v-ons-toolbar>
    <v-ons-tabbar swipeable position="auto" :visible="true" :index.sync="activeIndex" :tabs="tabs">
    </v-ons-tabbar>
  </ons-page>
</template>

<script>
import homePage from './components/Home'
import helpPage from './components/Help'
import historyPage from './components/History'
import walkPage from './components/Walk'

export default {
  name: 'MainPage',
  data() {
    return {
      activeIndex: 0,
      tabs: [
        {
          label: 'Home',
          icon: 'fa-home',
          key:  'homePage',
          page: homePage
        },
        {
          label: 'Walk',
          icon: 'fa-walking',
          key:  'walkPage',
          page: walkPage
        },
        {
          label: 'History',
          icon: 'fa-history',
          key:  'historyPage',
          page: historyPage
        },
        {
          label: 'Help',
          icon: 'fa-question',
          key:  'helpPage',
          page: helpPage
        }
      ]
    }
  },
  created () {
    if (this.$ons.platform.isIPhoneX()) {
      document.documentElement.setAttribute('onsflag-iphonex-portrait', '')
      document.documentElement.setAttribute('onsflag-iphonex-landscape', '')
    }
  }
}
</script>

<style>
</style>
