<template>
  <f7-page no-toolbar no-navbar no-swipeback login-screen>

    <f7-login-screen-title>Log-in</f7-login-screen-title>
    <f7-block>
      In order to login, you must first request a code to be sent to your email address. If you are logging in from a
      new or untrusted device, you may be asked to answer an additional security question.
    </f7-block>
    <f7-block strong>
      <f7-block-header v-if="highSecurityAuthFlowRequested">Logging in from an untrusted or new device: please answer
        at least one additional security question</f7-block-header>
      <f7-list form>
        <f7-list-input type="email" name="email" label="Email" floating-label placeholder="Email address"
          autocomplete="email" v-model:value="email" validate error-message="Please enter a valid email address"
          :onValidate="(v) => setInputValid('email', v)"></f7-list-input>
        <f7-list-input type="password" name="code" label="Code" floating-label placeholder="Code sent by email"
          autocomplete="off" v-model:value="logincode" v-show="codeRequested" validate
          error-message="Please enter a valid code" pattern="[0-9]*"
          :onValidate="(v) => setInputValid('code', v)"></f7-list-input>

        <f7-list-input v-if="highSecurityAuthFlowRequested" v-for="question in highSecurityQuestions"
          :key="question.p_id" type="text" :name="`securityQuestion_${question.p_id}`" :label="question.question"
          floating-label autocomplete="off" placeholder="Your answer" v-model:value="securityAnswers[question.p_id]"
          validate error-message="Please enter a valid answer" pattern="(.|\s)*\S(.|\s)*"
          :onValidate="(v) => setInputValid(question.p_id, v)"></f7-list-input>
        <f7-list-item v-if="highSecurityAuthFlowRequested" checkbox title="Trust this device in the future"
          name="trustDevice" :checked="trustedDevice"></f7-list-item>

      </f7-list>
    </f7-block>
    <f7-block>
      <div class="grid grid-cols-1 grid-gap">
        <f7-button fill @click="requestCode" v-show="!codeRequested" :disabled="!allFieldsValid">
          Request Code
        </f7-button>
        <f7-button fill @click="tryLogin" v-show="codeRequested" :disabled="!allFieldsValid">
          Log In
        </f7-button>
        <f7-button tonal @click="reset" v-show="codeRequested">Reset</f7-button>
      </div>
    </f7-block>

    <f7-block>
      <f7-block-header>
        If you do not have an account, create one by clicking here below.
        You need an invitation email.
      </f7-block-header>
      <f7-button outline href="/clinicians/new-account/">Create new account</f7-button>
    </f7-block>

  </f7-page>
</template>


<script>
import { ref } from 'vue';
import api from '../js/api.js';

export default {
  setup () {
    const email = ref('')
    const logincode = ref('')
    const codeRequested = ref(false)
    const highSecurityAuthFlowRequested = ref(false)
    const highSecurityQuestions = ref([])
    const securityAnswers = ref({})
    const trustedDevice = ref(false)
    const allFieldsValid = ref(true)

    let validInputs = {}

    const setInputValid = (inputName, isValid) => {
      validInputs[inputName] = isValid
      allFieldsValid.value = Object.values(validInputs).every(v => v === true)
    }

    const reset = () => {
      email.value = ''
      logincode.value = ''
      codeRequested.value = false
      highSecurityAuthFlowRequested.value = false
      highSecurityQuestions.value = []
      securityAnswers.value = {}
      trustedDevice.value = false
    }

    const requestCode = async () => {
      console.log('Requesting login code for email:', email.value)
      try {
        await api.requestLoginCode(email.value)
        codeRequested.value = true
      } catch (error) {
        console.error('Error requesting login code:', error)
      }
    }

    const tryLogin = async () => {
      try {
        if (highSecurityAuthFlowRequested.value) {
          await api.loginWithCodeAndSecurityAnswers(email.value, logincode.value, securityAnswers.value, trustedDevice.value)
        } else {
          await api.loginWithCode(email.value, logincode.value)
        }
        alert('logged in!')
      } catch (error) {
        console.error('Error logging in', error)

        if (error.requireHighSecurityAuthFlow) {
          highSecurityAuthFlowRequested.value = true
          highSecurityQuestions.value = error.securityQuestions
          securityAnswers.value = {}
        } else {
          alert('An error occurred during login. Please try again later.')
        }
      }
    }

    return {
      allFieldsValid,
      setInputValid,
      email,
      logincode,
      codeRequested,
      requestCode,
      reset,
      highSecurityAuthFlowRequested,
      highSecurityQuestions,
      securityAnswers,
      trustedDevice,
      tryLogin
    }
  }
}
</script>
