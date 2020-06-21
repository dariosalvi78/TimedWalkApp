<template id="aboutacks">
  <v-ons-page>
    <v-ons-toolbar>
      <div class="left">
        <v-ons-back-button>{{$t('about.title')}}</v-ons-back-button>
      </div>
      <div class="center">{{$t('about.acksTitle')}}</div>
    </v-ons-toolbar>
    <div class="content" style="padding: 10px;" v-html="$t('about.acks')">
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
