<template id="home">
  <v-ons-page id="tabbar-page">
    <v-ons-toolbar>
      <div class="center">Walk test</div>
    </v-ons-toolbar>
    <v-ons-navigator
       :page-stack="pageStack"
       @push-page="pageStack.push($event)"
       ref="walkNavigator"
     ></v-ons-navigator>
  </v-ons-page>
</template>

<script>
import testIntro from './walktest/TestIntro'

export default {
  name: 'WalkPage',
  data() {
    return {
      pageStack: [testIntro]
    }
  }
}
</script>

<style>
</style>
