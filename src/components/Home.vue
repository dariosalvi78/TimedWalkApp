<template id="home">
  <v-ons-page>
    <v-ons-toolbar>
      <div class="center">Timed walk app</div>
    </v-ons-toolbar>
    <div class="content" style="padding: 10px;">
      <p>
        This app measures the distance you walk in a given amount of time.
        This is sometimes called "Timed walk test". The distance you walk in the
        chosen time can be used as an indication of your exercise capacity and
        general health status.
      </p>
      <p style="text-align: center;">
        <v-ons-icon icon="fa-walking" size="30px"></v-ons-icon>
      </p>
      <p>
        The most commonly used timed walk is the 6-minute walk test, but other
        durations, like 3 minutes or 12 minutes have also been used. The app
        allows you to set the length of time you prefer for your test.
      </p>
      <p style="text-align: center;">
        <v-ons-icon icon="fa-map-marker-alt" size="30px"></v-ons-icon>
      </p>
      <p>
        The app measures the distance using the positioning systems embedded
        in your phone, like the GPS. You therefore need to <b>perform the test
        outdoor</b> or it may be not possible to measure the distance.
      </p>
      <p style="text-align: center;">
        <v-ons-icon icon="fa-notes-medical" size="30px"></v-ons-icon>
      </p>
      <p>
        Even though the algorithm that estimates the walked distance has been
        validated in clinical settings, this app is <b>not a medical device</b>.
        It should be used for general well-being or as a home-based complement
        to conventional clinical assessment.
      </p>
    </div>
  </v-ons-page>
</template>

<script>
export default {
  name: 'HomePage'
}
</script>

<style>
</style>
