<template id="aboutsmwt">
  <v-ons-page>
    <v-ons-toolbar>
      <div class="left">
        <v-ons-back-button>{{$t('about.title')}}</v-ons-back-button>
      </div>
      <div class="center">{{$t('about.smwtTitle')}}</div>
    </v-ons-toolbar>
    <div class="content" style="padding: 10px;" v-html="$t('about.smwt')">
    </div>
  </v-ons-page>
</template>

<script>
export default {
  name: 'AboutSMWTPage'
}
</script>

<style>
</style>
