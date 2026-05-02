let mockApi = {
  // Mock API implementation
  async getInvitationDetails (code) {
    console.log('Fetching invitation details for code: ' + code)
    // Return mock data
    return {
      teamId: 'mock-team-id',
      code: code,
      patient: {
        id: 'mock-patient-id',
        first_names: 'John',
        last_name: 'Doe'
      },
      teamName: {
        en: 'Mock Team',
        de: 'Mock Team',
        it: 'Mock Team',
        se: 'Mock Team',
        dz: 'Mock Team',
      },
      welcomeMessage: {
        en: 'Welcome to the Mock Team!',
        de: 'Willkommen im Mock Team!',
        it: 'Benvenuto nel Mock Team!',
        se: 'Välkommen till Mock Team!',
        dz: 'Mock Team ལ་ཕེབས་པའི་བཀྲ་ཤིས་!',
      },
      privacyPolicy: {
        en: 'This is the mock privacy policy.',
        de: 'Dies ist die Mock-Datenschutzrichtlinie.',
        it: 'Questa è la politica sulla privacy mock.',
        se: 'Detta är den mock integritetspolicyn.',
        dz: 'འདི་ནི་མཐུན་པའི་གསར་འགྱོ་བའི་གསར་འགྱོ་བ།',
      }
    }
  },
  async acceptInvitation (code) {
    // Simulate accepting the invitation
    console.log('Invitation accepted with code: ' + code)
    return true
  },
  async getTeamsSharedWith () {
    return Promise.resolve([
      {
        teamId: 'mock-team-id',
        teamName: {
          en: 'Mock Team',
          de: 'Mock Team',
          it: 'Mock Team',
          se: 'Mock Team',
          dz: 'Mock Team',
        },
      }
    ])
  },
  async getPastTests () {
    return Promise.resolve([])
  },
  async sendTestResult (result) {
    console.log('Sending test result to mock API:', result)
    return Promise.resolve({ success: true, sharingWith: ['mock-team-id'] })
  }
}

let realApi = {
  // Real API implementation
}


export default (process.env.VUE_APP_API === 'mock') ? mockApi : realApi
