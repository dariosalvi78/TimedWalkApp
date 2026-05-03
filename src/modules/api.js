const API_FAIL = false // Set to true to simulate API failure for testing error handling

let mockApi = {
  // Mock API implementation
  async refreshToken (serverToken) {
    console.log('Refreshing token: ' + serverToken)
    return 'mock-access-token'
  },
  async getInvitationDetails (code) {
    if (API_FAIL) {
      return Promise.reject(new Error('Simulated API failure')) // Simulate an API failure for testing error handling
    }
    console.log('Fetching invitation details for code: ' + code)
    // Return mock data
    return {
      teamId: 'mock-team-id',
      code: code,
      patient: {
        id: 'mock-patient-id',
        team_specific_id: 'mock-team-specific-id',
        first_names: 'John',
        last_name: 'Doe',
        phone_number: '123-456-7890',
        dob: '1980-01-01',
        sex: 'male'
      },
      team: {
        id: 'mock-team-id',
        institutions: ['Mock Institution 1', 'Mock Institution 2'],
        name: 'Mock Team',
        contact: 'mock-team-contact@example.com'
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
  async acceptInvitation (code, serverToken) {
    // Simulate accepting the invitation
    console.log('Invitation accepted with code: ' + code + ' and server token: ' + serverToken)
    return 'mock-api-token'
  },
  async disconnectFromTeam (teamId) {
    console.log('Disconnecting from team with ID: ' + teamId)
    return Promise.resolve()
  },
  async sendTestResult (result, serverToken) {
    console.log('Sending test result to mock API:', result, 'with server token:', serverToken)
    return Promise.resolve({ success: true, sharingWith: ['mock-team-id'] })
  }
}

let realApi = {
  // Real API implementation
}


export default (process.env.VUE_APP_API === 'mock') ? mockApi : realApi
