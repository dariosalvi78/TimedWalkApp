<template id="main-page">
  <v-ons-page id="tabbar-page">
    <v-ons-tabbar swipeable position="auto" :visible="true" :index.sync="activeIndex" :tabs="tabs">
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
          label: 'Home',
          icon: 'fa-home',
          key: 'homePage',
          page: homePage
        },
        {
          label: 'Walk',
          icon: 'fa-walking',
          key: 'walkPage',
          page: walkPage
        },
        {
          label: 'History',
          icon: 'fa-history',
          key: 'historyPage',
          page: historyPage
        },
        {
          label: 'About',
          icon: 'fa-question',
          key: 'aboutPage',
          page: aboutPage
        }
      ]
    }
  },
  created () {
    console.log('isWebview? ', this.$ons.platform.isWebView())
    console.log('isIPhone? ', this.$ons.platform.isIPhone())
    console.log('isIPhoneX? ', this.$ons.platform.isIPhoneX())
    console.log('isIOSSafari? ', this.$ons.platform.isWebView())
    console.log('isWKWebView? ', this.$ons.platform.isWebView())
    console.log('isUIWebView? ', this.$ons.platform.isUIWebView())
    console.log('isAndroidPhone? ', this.$ons.platform.isAndroidPhone())

    // if (this.$ons.platform.isIPhoneX()) {
    //   document.documentElement.setAttribute('onsflag-iphonex-portrait', '')
    //   document.documentElement.setAttribute('onsflag-iphonex-landscape', '')
    // }
  }
}
</script>

<style>
</style>
