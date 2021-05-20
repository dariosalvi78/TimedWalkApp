<template id="aboutlicense">
  <v-ons-page>
    <v-ons-toolbar>
      <div class="left">
        <v-ons-back-button>{{$t('about.title')}}</v-ons-back-button>
      </div>
      <div class="center">{{$t('about.licenseTitle')}}</div>
    </v-ons-toolbar>
    <div class="content" style="padding: 10px;" v-html="$t('about.license')">
    </div>
  </v-ons-page>
</template>

<script>
export default {
  name: 'AboutLicensePage'
}
</script>

<style>
</style>
