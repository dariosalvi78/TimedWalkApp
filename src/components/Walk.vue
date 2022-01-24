<template id="home">
  <v-ons-page id="tabbar-page">
    <v-ons-toolbar>
      <div class="center">{{$t('walk.title')}}</div>
    </v-ons-toolbar>
    <div class="content">
      <v-ons-navigator
        :page-stack="pageStack"
        @push-page="pageStack.push($event)"
        ref="walkNavigator"
        swipeable="false"
      ></v-ons-navigator>
    </div>
  </v-ons-page>
</template>

<script>
import testIntro from './walktest/TestIntro'

export default {
  name: 'WalkPage',
  data () {
    return {
      pageStack: [testIntro]
    }
  }
}
</script>

<style>
</style>
