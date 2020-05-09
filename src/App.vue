<template id="main-page">
  <v-ons-navigator swipeable
     :page-stack="pageStack"
     @push-page="pageStack.push($event)"
   ></v-ons-navigator>
</template>

<script>
import menu from './components/Menu'

export default {
  name: 'MainPage',
  data() {
    return {
      pageStack: [menu]
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
