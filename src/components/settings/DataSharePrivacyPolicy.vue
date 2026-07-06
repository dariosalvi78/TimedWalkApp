<template id="dataSharePrivacyPolicy">
  <v-ons-page>
    <v-ons-toolbar>
      <div class="left">
        <v-ons-back-button>{{ $t('settings.shareAdd') }}</v-ons-back-button>
      </div>
      <div class="center">{{ $t('settings.privacyPolicy') }}</div>
    </v-ons-toolbar>
    <div class="content" style="padding: 10px;">
      <div v-html="privacyPolicyText">
      </div>
      <div class="buttons-container">
        <v-ons-button modifier="outline" @click="cancel">{{ $t('settings.cancel') }}</v-ons-button>
        <v-ons-button @click="next">{{ $t('settings.next') }}</v-ons-button>
      </div>
    </div>

    <v-ons-alert-dialog modifier="rowfooter" :visible.sync="confirmationDialogVisible">
      <span slot="title">{{ $t('settings.confirmTitle') }}</span>
      <p>{{ $t('settings.confirm') }}</p>
      <template slot="footer">
        <v-ons-alert-dialog-button modifier="outline" @click="confirmReject">{{ $t('settings.no')
          }}</v-ons-alert-dialog-button>
        <v-ons-alert-dialog-button @click="confirmAccept">{{ $t('settings.yes') }}</v-ons-alert-dialog-button>
      </template>
    </v-ons-alert-dialog>

  </v-ons-page>
</template>


<script>
import api from '../../modules/api'
import storage from '../../modules/storage'

export default {
  name: 'DataSharePrivacyPolicyPage',
  props: {
    invitation: {
      type: Object,
      required: true
    },
    code: {
      type: String,
      required: true
    }
  },
  data: function () {
    let locale = this.$root.$i18n.locale || 'en'
    return {
      teamName: this.invitation.team.name,
      privacyPolicyText: this.invitation.privacyPolicy[locale],
      confirmationDialogVisible: false,
    }
  },
  methods: {
    cancel () {
      this.$emit('reset-page-stack') // Go back to the main settings page
    },
    async next () {
      this.confirmationDialogVisible = true
    },
    async confirmAccept () {
      this.confirmationDialogVisible = false

      try {
        // retrieve the server token for this server, if any
        let endpoint = null
        let server = api.getEndpointFromInvitationCode(this.code)
        let dataShares = await storage.getItem('dataShares')
        if (dataShares && dataShares.length > 0) {
          dataShares.find(ds => {
            if (ds.endpoint.id === server.id) {
              endpoint = ds.endpoint
            }
          })
        }

        let token = await api.acceptInvitation(this.code, endpoint)
        dataShares = dataShares || []
        // first check that the team is not already in the list
        if (!dataShares.some(ds => ds.team.id === this.invitation.team.id)) {
          // add the new data share to the list
          // the data share object is the same as the invitation object, but with the url and serverToken added
          let datashare = Object.assign({}, this.invitation)
          datashare.endpoint = server
          datashare.endpoint.serverToken = token
          datashare.loggedOut = false
          dataShares.push(datashare)
        }
        await storage.setItem('dataShares', dataShares)
      } catch (e) {
        console.error(e)
        let errorMessage = e.message ? e.message : e
        this.$ons.notification.alert(errorMessage, {
          title: '⚠️ ' + this.$t('error')
        })
        return
      }
      this.$emit('reset-page-stack', { reason: 'acceptedDataShare' }) // Go back to the main settings page, with info that we accepted an invitation
    },

    async confirmReject () {
      this.confirmationDialogVisible = false
      this.$emit('reset-page-stack') // Go back to the main settings page
    }
  }
}
</script>

<style>
.buttons-container {
  display: flex;
  /* or inline-flex */
  margin-top: 1em;
  flex-direction: row;
  justify-content: space-around;
}
</style>
