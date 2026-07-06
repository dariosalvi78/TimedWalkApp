<template id="dataShareView">
  <v-ons-page>
    <v-ons-toolbar>
      <div class="left">
        <v-ons-back-button>{{ $t('settings.title') }}</v-ons-back-button>
      </div>
      <div class="center">{{ team.name }}</div>
    </v-ons-toolbar>
    <div class="content" style="padding: 10px;">

      <v-ons-card>
        <div class="title">
          {{ $t('settings.datashareView.teamTitle') }}
        </div>
        <div class="content">
          <div> {{ $t('settings.datashareView.name') }}: {{ team.name }}</div>
          <div> {{ $t('settings.datashareView.contact') }}: {{ team.contact }}</div>
        </div>
      </v-ons-card>

      <v-ons-card>
        <div class="title">
          {{ $t('settings.datashareView.patientTitle') }}
        </div>
        <div class="content">
          <div>{{ $t('settings.datashareView.identifier') }}: {{ patient.team_specific_id }}</div>
          <div>{{ $t('settings.datashareView.name') }}: {{ patient.first_names }}</div>
          <div>{{ $t('settings.datashareView.surname') }}: {{ patient.last_name }}</div>
          <div>{{ $t('settings.datashareView.dateOfBirth') }}: {{ patient.dob }}</div>
          <div>{{ $t('settings.datashareView.sex') }}: {{ patient.sex }}</div>
        </div>
      </v-ons-card>

      <div v-if="!loggedOut" class="buttons-container">
        <ons-button modifier="quiet" @click="removeTeam">{{ $t('settings.datashareView.stopSharing') }}</ons-button>
      </div>

    </div>
  </v-ons-page>
</template>

<script>
import api from '../../modules/api'
import storage from '../../modules/storage'

export default {
  name: 'DataShareViewPage',
  props: {
    dataShare: {
      type: Object,
      required: true
    },
    loggedOut: {
      type: Boolean,
      required: true
    }
  },
  data: function () {
    let locale = this.$root.$i18n.locale || 'en'
    return {
      patient: this.dataShare.patient,
      team: this.dataShare.team,
      welcomeMessage: this.dataShare.welcomeMessage[locale],
      privacyPolicyText: this.dataShare.privacyPolicy[locale]
    }
  },
  methods: {
    async removeTeam () {
      let confirmed = await this.$ons.notification.confirm(this.$t('settings.datashareView.stopSharingConfirm'), {
        title: '⚠️ ' + this.$t('settings.confirmTitle'),
        buttonLabels: [this.$t('settings.no'), this.$t('settings.yes')],
        'cancelable': true
      })
      if (confirmed) {
        try {
          let serverToken = await storage.getItem('serverToken')
          await api.disconnectFromTeam(this.dataShare.team.id, serverToken)
          let dataShares = await storage.getItem('dataShares')
          if (dataShares) {
            dataShares = dataShares.filter(ds => ds.team.id !== this.dataShare.team.id)
            await storage.setItem('dataShares', dataShares)
          }
          this.$emit('reset-page-stack', { reason: 'removedDataShare' })
        } catch (e) {
          console.error('Error disconnecting from team:', e)
          let errorMessage = e.message ? e.message : e
          this.$ons.notification.alert(errorMessage, {
            title: '⚠️ ' + this.$t('error')
          })
          return
        }
      }
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
