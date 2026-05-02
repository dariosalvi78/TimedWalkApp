<template id="settingsMenu">
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
        {{ $t('settings.datashare') }}
      </div>
      <v-ons-list>
        <v-ons-list-header>{{ dataSharingHeader }}</v-ons-list-header>

        <v-ons-list-item v-for="(share, index) in dataShares" :key="index" modifier="chevron" tappable>{{
          share.teamName[locale]
        }}</v-ons-list-item>
      </v-ons-list>
      <v-ons-button style="margin-top: 0.5em;" :disabled="sendingCode" @click="addDataShare">{{ $t('settings.shareAdd')
        }}</v-ons-button>
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
import api from '../../modules/api'
import dataShareWelcome from './DataShareWelcome'
import smwt from './about/SMWT'
import acks from './about/Acks'
import pp from './about/PrivacyPolicy'
import license from './about/License'

export default {
  name: 'SettingsMenu',
  props: {
    lastDataShare: {
      type: Date,
      required: true
    }
  },
  data () {
    return {
      dataShares: [],
      locale: this.$root.$i18n.locale || 'en',
      sendingCode: false,
      dataSharingHeader: ''
    }
  },
  watch: {
    locale: function (newLocale) {
      this.$root.$i18n.locale = newLocale
      storage.setItem('locale', newLocale)
      this.$forceUpdate()
    },
    lastDataShare: function () {
      // when the datashare changes, we refresh the list of datashares to show the new one
      this.refreshDataShares()
    }
  },
  created () {
    this.refreshDataShares()
  },
  methods: {
    async refreshDataShares () {
      let dataShares = await storage.getItem('dataShares')
      this.dataShares = dataShares || []

      if (this.dataShares.length === 0) {
        this.dataSharingHeader = this.$t('settings.teamsListHeaderNoTeams')
      } else {
        this.dataSharingHeader = this.$t('settings.teamsListHeader')
      }
    },
    async addDataShare () {
      this.sendingCode = true
      let code = await this.$ons.notification.prompt(this.$t('settings.shareInvitationCode'), {
        title: this.$t('settings.datashare'),
        cancelable: true
      })
      console.log('Code entered: ' + code)
      if (code) {
        let invitaiton = await api.getInvitationDetails((code))
        this.sendingCode = false
        this.$emit('push-page', {
          extends: dataShareWelcome,
          onsNavigatorProps: {
            invitation: invitaiton
          }
        })
      }
    },
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
