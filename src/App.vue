<template id="main-page">
  <v-ons-page id="tabbar-page">
    <v-ons-tabbar
      swipeable
      position="bottom"
      :visible="true"
      :index.sync="activeIndex"
      :tabs="tabs"
    >
    </v-ons-tabbar>
  </v-ons-page>
</template>

<script>
import homePage from './components/Home'
import aboutPage from './components/About'
import historyPage from './components/History'
import walkPage from './components/Walk'

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
          label: this.$t('menu.about'),
          icon: 'fa-question',
          key: 'aboutPage',
          page: aboutPage
        }
      ]
    }
  },
  created () {
    // if (this.$ons.platform.isIPhoneX()) {
    //   document.documentElement.setAttribute('onsflag-iphonex-portrait', '')
    //   document.documentElement.setAttribute('onsflag-iphonex-landscape', '')
    // }
  }
}
</script>

<style>
</style>
