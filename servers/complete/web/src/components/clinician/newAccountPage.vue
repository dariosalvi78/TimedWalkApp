<template>
  <f7-page name="newAccount">
    <f7-navbar title="Create New Account" back-link></f7-navbar>
    <f7-block small-inset class="content-block">
      <f7-block-title>Create new clinician account</f7-block-title>
      <p>Please fill in the following information to create a new clinician account.</p>
      <p>You need an invitation code sent by a clinician.</p>
      <f7-list>
        <f7-list-input type="text" label="Invitation Code" floating-label placeholder="Code sent by email"
          autocomplete="off" v-model="invitation_code" required validate error-message="Please enter a valid code"
          :onValidate="(v) => setInputValid('code', v)"></f7-list-input>
        <f7-list-input type="email" label="Email" floating-label placeholder="Email address" autocomplete="email"
          v-model="email" required validate error-message="Please enter a valid email address"
          :onValidate="(v) => setInputValid('email', v)"></f7-list-input>
        <f7-list-input label="First name(s)" type="text" v-model="first_names" placeholder="Given name(s)" required
          autocomplete="on" validate error-message="Please enter your first names"
          :onValidate="(v) => setInputValid('first_names', v)"></f7-list-input>
        <f7-list-input label="Second name(s)" type="text" v-model="second_names" placeholder="Family name(s)" required
          autocomplete="on" validate error-message="Please enter your second names"
          :onValidate="(v) => setInputValid('second_names', v)"></f7-list-input>
        <f7-list-input type="select" label="Preferred language" required @input="validateLang" autocomplete="on"
          error-message="Please enter your preferred language" :error-message-force="!laguangeValid">
          <option value="en">English</option>
        </f7-list-input>
      </f7-list>

      <p>Security questions required for additional verification. Please answer at least one of the following questions:
      </p>
      <f7-list>
        <f7-list-input type="text" label="Question 1: name of your first pet" floating-label placeholder="Your answer"
          autocomplete="off" :value="securityAnswers[0]" error-message="At least one answer is required"
          :error-message-force="securityAnswersValidatedOnce && !securityAnswersValid"
          @input="validateSecurityAnswers(0, $event)"></f7-list-input>
        <f7-list-input type="text" label="Question 2: model of your first car" floating-label placeholder="Your answer"
          autocomplete="off" :value="securityAnswers[1]" error-message="At least one answer is required"
          @input="validateSecurityAnswers(1, $event)"></f7-list-input>
        <f7-list-input type="text" label="Question 3: elementary school you attended" floating-label
          placeholder="Your answer" autocomplete="off" :value="securityAnswers[2]"
          @input="validateSecurityAnswers(2, $event)"></f7-list-input>
      </f7-list>

      <f7-button fill @click="createAccount" :disabled="!allFieldsValid">
        Create account
      </f7-button>
    </f7-block>
  </f7-page>
</template>

<style scoped>
.content-block {
  padding: 0px;
  max-width: 600px;
  margin-inline: auto;
}
</style>

<script>
import { ref } from 'vue';
import api from '../../js/api.js';
import { f7 } from 'framework7-vue';

export default {
  setup () {
    let language = 'en'
    const invitation_code = ref('')
    const email = ref('')
    const first_names = ref('')
    const second_names = ref('')
    const securityAnswersValidatedOnce = ref(false)
    const securityAnswersValid = ref(false)
    const securityAnswers = ref(['', '', ''])
    const laguangeValid = ref(true)
    const allFieldsValid = ref(false)

    const createAccount = async () => {
      try {
        await api.createClinicianAccount(invitation_code.value, email.value, first_names.value, second_names.value, language)
        f7.dialog.alert('Account created successfully. You can now login.', 'Success', () => {
          f7.views.main.router.navigate('/login/')
        })
      } catch (error) {
        f7.dialog.alert(error.message || 'An error occurred while creating the account.', 'Error')
      }
    }

    let validInputs = {
      code: false,
      email: false,
      first_names: false,
      second_names: false,
      language: false,
      security_answers: false
    }

    const setInputValid = (inputName, isValid) => {
      validInputs[inputName] = isValid
      allFieldsValid.value = Object.values(validInputs).every(v => v === true)
      laguangeValid.value = validInputs.language
    }

    const validateLang = (evt) => {
      const lang = evt.target.value
      if (!lang) {
        validInputs['language'] = false
        laguangeValid.value = false
        language = lang
      } else {
        validInputs['language'] = true
        laguangeValid.value = true
      }
      allFieldsValid.value = Object.values(validInputs).every(v => v === true)
    }

    const validateSecurityAnswers = (answerNumber, evt) => {
      const answer = evt.target.value
      securityAnswers.value[answerNumber] = answer
      securityAnswersValidatedOnce.value = true
      const hasAtLeastOneAnswer = securityAnswers.value.some(answer => answer && answer.trim() !== '')
      validInputs['security_answers'] = hasAtLeastOneAnswer
      securityAnswersValid.value = hasAtLeastOneAnswer
      allFieldsValid.value = Object.values(validInputs).every(v => v === true)
    }

    return {
      invitation_code,
      email,
      first_names,
      second_names,
      securityAnswers,
      laguangeValid,
      allFieldsValid,
      setInputValid,
      validateLang,
      validateSecurityAnswers,
      securityAnswersValidatedOnce,
      securityAnswersValid,
      createAccount
    }
  }
}
</script>
