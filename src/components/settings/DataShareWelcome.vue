<template id="dataShareWelcome">
  <v-ons-page>
    <v-ons-toolbar>
      <div class="left">
        <v-ons-back-button>{{ $t('settings.title') }}</v-ons-back-button>
      </div>
      <div class="center">{{ $t('settings.shareAdd') }}</div>
    </v-ons-toolbar>
    <div class="content" style="padding: 10px;">
      <div v-html="welcomeMessage">
      </div>
      <div class="buttons-container">
        <v-ons-button modifier="outline" @click="cancel">{{ $t('settings.cancel') }}</v-ons-button>
        <v-ons-button @click="next">{{ $t('settings.next') }}</v-ons-button>
      </div>

    </div>
  </v-ons-page>
</template>

<script>
import DataSharePrivacyPolicy from './DataSharePrivacyPolicy.vue'

export default {
  name: 'DataShareWelcomePage',
  props: {
    invitation: {
      type: Object,
      required: true
    }
  },
  data: function () {
    let locale = this.$root.$i18n.locale || 'en'
    return {
      teamName: this.invitation.teamName[locale],
      welcomeMessage: this.invitation.welcomeMessage[locale]
    }
  },
  methods: {
    cancel () {
      this.$emit('pop-page')
    },
    next () {
      this.$emit('push-page', {
        extends: DataSharePrivacyPolicy,
        onsNavigatorProps: {
          invitation: this.invitation
        }
      })
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
