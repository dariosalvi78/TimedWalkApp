<template id="aboutacks">
  <v-ons-page>
    <v-ons-toolbar>
      <div class="left">
        <v-ons-back-button>About</v-ons-back-button>
      </div>
      <div class="center">Acknowledgments</div>
    </v-ons-toolbar>
    <div class="content" style="padding: 10px;">
      <p>
        This app was developed by Dario Salvi within his research work at
        the University of Malmö.
      </p>
      <p>
        If you want to get in contact with its author,
        please send an email to dario.salvi@mau.se.
        Acknowledgments, research collaborations and donations are very welcome.
      </p>
      <p>
        The app uses the following open source libraries and frameworks:
      </p>
      <ul>
        <li>VueJS</li>
        <li>Apache Cordova</li>
        <li>OnsenUI 2</li>
        <li>cordova-plugin-nativestorage</li>
        <li>cordova-plugin-geolocation</li>
        <li>cordova-plugin-pedometer</li>
      </ul>
      <p>
        The following free icons and images are used:
      </p>
      <ul>
        <li>Font awesome, available at https://fontawesome.com/</li>
        <li>The main icon of this app is taken from Font Awesome, at https://fontawesome.com/icons/shoe-prints?style=solid</li>
        <li>Walk cycle by Guerreiro (2011), available at https://openclipart.org/detail/103975/walk-cycle-by-guerreiro</li>
      </ul>
    </div>
  </v-ons-page>
</template>

<script>
export default {
  name: 'AboutAcksPage'
}
</script>

<style>
</style>
