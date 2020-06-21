<template id="aboutMenu">
  <v-ons-page>
    <v-ons-toolbar>
      <div class="center">{{$t('about.title')}}</div>
    </v-ons-toolbar>

    <div class="content" style="padding: 10px;">
      <div>
        <v-ons-button modifier="quiet" @click="smwt">{{$t('about.smwtTitle')}}</v-ons-button>
      </div>
      <div>
        <v-ons-button modifier="quiet" @click="acks">{{$t('about.acksTitle')}}</v-ons-button>
      </div>
      <div>
        <v-ons-button modifier="quiet" @click="pp">{{$t('about.privacyPolicyTitle')}}</v-ons-button>
      </div>
      <div>
        <v-ons-button modifier="quiet" @click="license">{{$t('about.licenseTitle')}}</v-ons-button>
      </div>
    </div>

  </v-ons-page>
</template>

<script>
import smwt from './SMWT'
import acks from './Acks'
import pp from './PrivacyPolicy'
import license from './License'

export default {
  name: 'AboutMenuPage',
  methods: {
    smwt () {
      this.$emit('push-page', smwt)
    },
    acks () {
      this.$emit('push-page', acks)
    },
    pp () {
      this.$emit('push-page', pp)
    },
    license () {
      this.$emit('push-page', license)
    }
  }
}
</script>

<style>
</style>
