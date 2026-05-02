<template id="settings">
  <v-ons-page>
    <v-ons-navigator :page-stack="pageStack" @pop-page="pageStack.pop($event)" @reset-page-stack="resetPageStack"
      @push-page="pageStack.push($event)"></v-ons-navigator>

  </v-ons-page>
</template>

<script>
import menu from './settings/SettingsMenu'

export default {
  name: 'SettingsPage',
  data () {
    return {
      pageStack: [{
        extends: menu,
        onsNavigatorProps: {
          // this prop is used to trigger a refresh of the data shares list when we accept a new data share invitation
          lastDataShare: new Date()
        }
      }]
    }
  },
  methods: {
    resetPageStack (evt) {
      // Clear all pages except the first one (the main settings menu)
      this.pageStack.splice(1)

      if (evt) {
        if (evt.reason === 'acceptedDataShare') {
          // trigger a refresh of the data shares list in the main settings menu, by updating the lastDataShare prop
          this.pageStack[0].onsNavigatorProps.lastDataShare = new Date()
        }
      }
    }
  }
}
</script>
