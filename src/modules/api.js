const API_FAIL = false // Set to true to simulate API failure for testing error handling

class ServerError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = statusCode;
  }
}

let mockApi = {
  // Mock API implementation
  async refreshToken (serverToken) {
    console.log('Refreshing token: ' + serverToken)
    return 'mock-access-token'
  },
  async getInvitationDetails (code) {
    if (API_FAIL) {
      return Promise.reject(new ServerError('Simulated API failure', 500)) // Simulate an API failure for testing error handling
    }
    console.log('Fetching invitation details for code: ' + code)
    // Return mock data
    return {
      invitationCode: code,
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
    if (API_FAIL) {
      return Promise.reject(new ServerError('Simulated API failure', 500)) // Simulate an API failure for testing error handling
    }
    // Simulate accepting the invitation
    console.log('Invitation accepted with code: ' + code + ' and server token: ' + serverToken)
    return 'mock-api-token'
  },
  async disconnectFromTeam (teamId, serverToken) {
    if (API_FAIL) {
      return Promise.reject(new ServerError('Simulated API failure', 500)) // Simulate an API failure for testing error handling
    }
    console.log('Disconnecting from team with ID: ' + teamId, + 'and server token: ' + serverToken)
    return Promise.resolve()
  },
  async sendTestResult (result, serverToken) {
    if (API_FAIL) {
      return Promise.reject(new ServerError('Simulated API failure', 500)) // Simulate an API failure for testing error handling
    }
    console.log('Sending test result to mock API:', result, 'with server token:', serverToken)
    return Promise.resolve({ success: true, sharingWith: ['mock-team-id'] })
  }
}

let realApi = {
  // Real API implementation
  async refreshToken (serverToken) {
    const response = await fetch(process.env.VUE_APP_API_URL + '/api/refresh-token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serverToken}`
      }
    })
    if (!response.ok) {
      throw new ServerError('Failed to refresh token: ' + response.statusText, response.status)
    }
    const data = await response.json()
    console.log('Refreshed token:', data.serverToken)
    return data.serverToken
  },

  async getInvitationDetails (code) {
    const response = await fetch(process.env.VUE_APP_API_URL + '/api/invitations/' + code)
    if (!response.ok) {
      throw new ServerError('Failed to fetch invitation details: ' + response.statusText, response.status)
    }
    const data = await response.json()
    console.log('Fetched invitation details:', data)
    return data
  },

  async acceptInvitation (code, serverToken) {
    let response
    if (serverToken) {
      response = await fetch(process.env.VUE_APP_API_URL + '/api/invitations/' + code + '/accept', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serverToken}`
        }
      })
    } else {
      response = await fetch(process.env.VUE_APP_API_URL + '/api/invitations/' + code + '/accept', {
        method: 'POST'
      })
    }

    if (!response.ok) {
      throw new ServerError('Failed to accept invitation: ' + response.statusText, response.status)
    }
    const data = await response.json()
    console.log('Fetched invitation details:', data)
    return data.serverToken
  },

  async disconnectFromTeam (teamId, serverToken) {
    if (!serverToken) {
      throw new ServerError('No server token provided for disconnecting from team', 401)
    }
    const response = await fetch(process.env.VUE_APP_API_URL + '/api/disconnectFromTeam', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serverToken}`
      },
      body: JSON.stringify({ teamId })
    })
    if (!response.ok) {
      throw new ServerError('Failed to disconnect from team: ' + response.statusText, response.status)
    }
    const data = await response.json()
    console.log('Disconnected from team successfully, server response:', data)
    return data
  },

  /**
   * Sends the results to the server.
   * I have tried using a readable stream to send the results, but it's more complicated than I hoped.
   * Here are some pointers in case I want to come back to this in the future:
   * - body can be a readable stream, but we need to add the option duplex: "half"
   * - on server side, we need http2, see https://github.com/vercel/next.js/discussions/85001
   * I got stuck on wrong response from the server and gave up
   * @param {string} results
   * @param {string} serverToken
   * @returns {Promise} Resolves with server response if successful, rejects with ServerError if failed
   */
  async sendTestResult (results, serverToken) {
    const response = await fetch(process.env.VUE_APP_API_URL + '/api/test-result', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Authorization': `Bearer ${serverToken}`
      },
      body: results,
    })
    if (!response.ok) {
      throw new ServerError('Failed to send test result: ' + response.statusText, response.status)
    }
    const data = await response.json()
    console.log('Test result sent successfully, server response:', data)
    return data
  }
}


export default (process.env.VUE_APP_API === 'mock') ? mockApi : realApi
