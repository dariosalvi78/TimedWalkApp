<template id="home">
  <v-ons-page>
    <v-ons-toolbar>
      <div class="center">{{$t('home.title')}}</div>
    </v-ons-toolbar>
    <div class="content" style="padding: 10px;">
      <p v-html="$t('home.intro')"/>
      <p style="text-align: center;">
        <v-ons-icon icon="fa-walking" size="30px"></v-ons-icon>
      </p>
      <p v-html="$t('home.durations')"/>
      <p style="text-align: center;">
        <v-ons-icon icon="fa-map-marker-alt" size="30px"></v-ons-icon>
      </p>
      <p v-html="$t('home.app')"/>
      <p style="text-align: center;">
        <v-ons-icon icon="fa-notes-medical" size="30px"></v-ons-icon>
      </p>
      <p v-html="$t('home.disclaimer')"/>
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
