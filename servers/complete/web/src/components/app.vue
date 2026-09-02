<template>
  <f7-app v-bind="f7params">

    <!-- main view, should have "view-main" class -->
    <f7-view main class="view-main" url="/" :browser-history="true">
    </f7-view>

  </f7-app>
</template>
<script>
import routes from '../js/routes.js';


export default {
  setup () {

    // Framework7 Parameters
    const f7params = {
      name: 'TimedWalk Dashboard', // App name
      theme: 'auto', // Automatic theme detection
      colors: {
        primary: '#007aff',
      },
      routes: routes
    }

    return {
      f7params
    }
  }
}
</script>
