<template id="about">
  <v-ons-page>
    <v-ons-toolbar>
      <div class="center">{{ $t('settings.title') }}</div>
    </v-ons-toolbar>

    <v-ons-card>
      <div class="title">
        {{ $t('settings.language') }}
      </div>
      <div class="content">
        <v-ons-select v-model="locale">
          <option value="en">{{ $t('settings.languages.en') }}</option>
          <option value="de">{{ $t('settings.languages.de') }}</option>
          <option value="it">{{ $t('settings.languages.it') }}</option>
          <option value="se">{{ $t('settings.languages.se') }}</option>
          <option value="dz">{{ $t('settings.languages.dz') }}</option>
        </v-ons-select>
      </div>
    </v-ons-card>

    <v-ons-card>
      <div class="title">
        {{ $t('about.title') }}
      </div>
      <div>
        <v-ons-button modifier="quiet" @click="about_smwt">{{ $t('about.smwtTitle') }}</v-ons-button>
      </div>
      <div>
        <v-ons-button modifier="quiet" @click="about_acks">{{ $t('about.acksTitle') }}</v-ons-button>
      </div>
      <div>
        <v-ons-button modifier="quiet" @click="about_pp">{{ $t('about.privacyPolicyTitle') }}</v-ons-button>
      </div>
      <div>
        <v-ons-button modifier="quiet" @click="about_license">{{ $t('about.licenseTitle') }}</v-ons-button>
      </div>
    </v-ons-card>
  </v-ons-page>
</template>

<script>
import storage from '../../modules/storage'
import smwt from './about/SMWT'
import acks from './about/Acks'
import pp from './about/PrivacyPolicy'
import license from './about/License'

export default {
  name: 'SettingsMenu',
  data () {
    return {
      locale: this.$root.$i18n.locale || 'en'
    }
  },
  watch: {
    locale: function (newLocale) {
      this.$root.$i18n.locale = newLocale
      storage.setItem('locale', newLocale)
      this.$forceUpdate()
    }
  },
  methods: {
    about_smwt () {
      this.$emit('push-page', smwt)
    },
    about_acks () {
      this.$emit('push-page', acks)
    },
    about_pp () {
      this.$emit('push-page', pp)
    },
    about_license () {
      this.$emit('push-page', license)
    }
  }
}
</script>
