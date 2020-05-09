<template id="home">
  <v-ons-navigator swipeable
     :page-stack="pageStack"
     @push-page="pageStack.push($event)"
   ></v-ons-navigator>
</template>

<script>
import testIntro from './TestIntro'

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
