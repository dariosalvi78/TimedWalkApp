export default {
  getCSRFToken () {
    return Promise.reject(new Error('Not implemented'));
  },
  async requestLoginCode (email) {
    return Promise.resolve()
  },
  async loginWithCode (email, code, answers) {
    // return Promise.reject(new Error('Not implemented'));

    if (!answers) {
      let error = new Error('High security flow required')
      error.requireHighSecurityAuthFlow = true
      error.securityQuestions = [{
        p_id: '1',
        question: 'What is your favorite color?'
      }]
      return Promise.reject(error);
    } else {
      return Promise.resolve({
        displayName: 'John Doe',
        userType: 'clinician'
      })
    }
  },

  async loginWithCodeAndSecurityAnswers (email, code, answers, trustedDevice) {
    if (!answers || Object.keys(answers).length === 0) {
      let error = new Error('Answers to at least one security question are required')
      return Promise.reject(error);
    } else {
      return Promise.resolve({
        displayName: 'John Doe',
        userType: 'clinician'
      })
    }
  },

  async createClinicianAccount (invitation_code, email, first_names, second_names, language) {
    return Promise.resolve()
    // return Promise.reject(new Error('Not implemented'));
  }
}
