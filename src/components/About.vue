<template id="about">
  <v-ons-page>
    <v-ons-navigator
       :page-stack="pageStack"
       @push-page="pageStack.push($event)"
       ref="walkNavigator"
     ></v-ons-navigator>
  </v-ons-page>
</template>

<script>
import menu from './about/Menu'

export default {
  name: 'AboutPage',
  data() {
    return {
      pageStack: [menu]
    }
  }
}
</script>

<style>
</style>
