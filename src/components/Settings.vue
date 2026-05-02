<template id="settings">
  <v-ons-page>
    <v-ons-navigator :page-stack="pageStack" @push-page="pageStack.push($event)" ref="walkNavigator"></v-ons-navigator>

  </v-ons-page>
</template>

<script>
import menu from './settings/SettingsMenu'

export default {
  name: 'SettingsPage',
  data () {
    return {
      pageStack: [menu]
    }
  }
}
</script>
