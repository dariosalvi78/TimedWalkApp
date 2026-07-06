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

        <v-ons-list-item v-for="(share, index) in dataShares" :key="index" modifier="chevron" tappable
          @click="showTeam(share)" :class="{ inactiveDS: share.loggedOut }">{{
            share.team.name
          }}
          <div v-if="share.loggedOut" class="loggeddOffMessage"> <b>{{ $t('settings.teamsListLoggedOutTitle') }}</b>
            <br> {{ $t('settings.teamsListLoggedOutMessage') }}
          </div>
        </v-ons-list-item>
      </v-ons-list>
      <v-ons-button style="margin-top: 0.5em;" @click="addDataShare">{{ $t('settings.shareAdd') }}</v-ons-button>
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


<style>
.inactiveDS {
  opacity: 0.5;
  color: rgb(66, 66, 66);
}

.loggeddOffMessage {
  padding: 10px;
  background-color: rgba(254, 0, 0, 0.5);
}
</style>

<script>
import storage from '../../modules/storage'
import api from '../../modules/api'

import dataShareWelcome from './DataShareWelcome'
import dataShareView from './DataShareView'

import smwt from './about/SMWT'
import acks from './about/Acks'
import pp from './about/PrivacyPolicy'
import license from './about/License'

export default {
  name: 'SettingsMenu',
  props: {
    lastDataShareUpdate: {
      type: Date,
      required: true
    }
  },
  data () {
    return {
      dataShares: [],
      locale: this.$root.$i18n.locale || 'en',
      dataSharingHeader: '',
    }
  },
  watch: {
    locale: function (newLocale) {
      this.$root.$i18n.locale = newLocale
      storage.setItem('locale', newLocale)
      this.$forceUpdate()
    },
    lastDataShareUpdate: function () {
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

        // refresh token for each server endpoint we have a datashare with
        for (let dsi = 0; dsi < dataShares.length; dsi++) {
          if (process.env.VUE_APP_DEBUG) {
            console.log('Settings view, refreshing token for endpoint: ' + dataShares[dsi].endpoint.url)
          }
          if (!dataShares[dsi].endpoint || !dataShares[dsi].endpoint.serverToken || dataShares[dsi].loggedOut) {
            console.warn('No server token found for datashare, data sharing is logged off')
            dataShares[dsi].loggedOut = true
          } else {
            dataShares[dsi].loggedOut = false
            // renew token for this datashare
            try {
              let newToken = await api.refreshToken(dataShares[dsi].endpoint)
              dataShares[dsi].endpoint.serverToken = newToken
              // save the updated endpoint back to storage
              await storage.setItem('dataShares', dataShares)
            } catch (e) {
              console.error('Error refreshing token on app start:', JSON.stringify(e))
              if (e.statusCode && e.statusCode === 401) {
                // if the error is an unauthorized error, we can assume the token is no longer valid and remove it
                dataShares[dsi].loggedOut = true
                dataShares[dsi].endpoint.serverToken = null

                // also warn the user
                console.warn('No server token found, data sharing is logged off')
                dataShares[dsi].loggedOut = true
              }
            }
          }
          await storage.setItem('dataShares', dataShares)

        }
      }
    },
    async addDataShare () {
      let code = await this.$ons.notification.prompt(this.$t('settings.shareInvitationCode'), {
        title: this.$t('settings.datashare'),
        cancelable: true
      })
      if (code) {
        try {
          let invitaiton = await api.getInvitationDetails((code))
          this.$emit('push-page', {
            extends: dataShareWelcome,
            onsNavigatorProps: {
              invitation: invitaiton,
              code: code
            }
          })
        } catch (e) {
          console.error(e)
          let errorMessage = e.message ? e.message : e
          this.$ons.notification.alert(errorMessage, {
            title: '⚠️ ' + this.$t('error')
          })
          return
        }
      }
    },
    showTeam (share) {
      this.$emit('push-page', {
        extends: dataShareView,
        onsNavigatorProps: {
          dataShare: share
        }
      })
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
