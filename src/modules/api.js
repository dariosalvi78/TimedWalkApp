const API_FAIL = false // Set to true to simulate API failure for testing error handling

const serverEndpoints = require('./apiEndpoints.json')

class ServerError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "ServerError";
    this.statusCode = statusCode;
  }
}

let mockApi = {
  // Mock API implementation
  getEndpointFromInvitationCode () {
    return {
      url: 'https://mockserver.com/api',
      name: 'MockServer'
    } // Return a mock server URL for testing
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
  async acceptInvitation (code, endpoint) {
    if (API_FAIL) {
      return Promise.reject(new ServerError('Simulated API failure', 500)) // Simulate an API failure for testing error handling
    }
    // Simulate accepting the invitation
    console.log('Invitation accepted with code: ' + code + ' and server token: ' + endpoint.serverToken)
    return 'mock-api-token'
  },
  async disconnectFromTeam (teamId, endpoint) {
    if (API_FAIL) {
      return Promise.reject(new ServerError('Simulated API failure', 500)) // Simulate an API failure for testing error handling
    }
    console.log('Disconnecting from team with ID: ' + teamId, + 'and server token: ' + endpoint.serverToken)
    return Promise.resolve()
  },
  async sendTestResult (result, endpoint) {
    if (API_FAIL) {
      return Promise.reject(new ServerError('Simulated API failure', 500)) // Simulate an API failure for testing error handling
    }
    console.log('Sending test result to mock API:', result, 'with server token:', endpoint.serverToken)
    return Promise.resolve({ success: true, sharingWith: ['mock-team-id'] })
  },
  async refreshToken (serverUrl, serverToken) {
    console.log('Refreshing token: ' + serverToken)
    return 'mock-access-token'
  },
}

let realApi = {
  // Real API implementation

  /**
   * Gets the server endpoint associated with an invitation code.
   * @param {string} code - the invitation code
   * @returns {Object} The server endpoint object
   */
  getEndpointFromInvitationCode (code) {
    // the first 2 digits of the code identify the server endpoint
    const prefix = code.substring(0, 2)
    if (process.env.VUE_APP_DEBUG) console.log('Getting server endpoint for invitation code prefix: ' + prefix)
    if (prefix == '00') {
      // local testing server, user env variable to determine the URL
      return {
        prefix: '00',
        url: process.env.VUE_APP_API_TEST_URL,
        id: 'LocalTestServer',
        apiversion: 'v0'
      }
    }
    const endpoint = serverEndpoints.find(ep => ep.prefix === prefix)
    if (!endpoint) {
      throw new Error('No server endpoint found for invitation code prefix: ' + prefix)
    }
    return endpoint
  },

  /**
   * Gets the details of an invitation code from the server.
   * @param {string} code - the invitation code
   * @returns {Promise} Resolves with invitation details if successful, rejects with ServerError if failed
   */
  async getInvitationDetails (code) {
    const endpoint = this.getEndpointFromInvitationCode(code)
    const response = await fetch(endpoint.url + '/invitations/' + code)
    if (!response.ok) {
      throw new ServerError('Failed to fetch invitation details: ' + response.statusText, response.status)
    }
    const data = await response.json()
    console.log('Fetched invitation details:', data)
    return data
  },

  /**
   * Accepts an invitation code by sending a request to the server.
   * @param {string} code - invitation code
   * @param {Object} endpoint - object containing server url and access token
   * @returns {Promise} Resolves with server token if successful, rejects with ServerError if failed
   */
  async acceptInvitation (code, endpoint) {
    let response
    if (endpoint.serverUrl && endpoint.serverToken) {
      response = await fetch(endpoint.serverUrl + '/invitations/' + code + '/accept', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${endpoint.serverToken}`
        }
      })
    } else {
      // get server URL based on the prefix of the invitation code
      const endpoint = this.getEndpointFromInvitationCode(code)
      response = await fetch(endpoint.url + '/invitations/' + code + '/accept', {
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

  /**
   * Disconnects the user from a team by sending a request to the server.
   * @param {string} teamId - the team id as a string
   * @param {Object} endpoint - endpoint details with server url and token
   * @returns {Promise} Resolves with server response if successful, rejects with ServerError if failed
   */
  async disconnectFromTeam (teamId, endpoint) {
    if (!endpoint.serverToken) {
      throw new ServerError('No server token provided for disconnecting from team', 401)
    }
    const response = await fetch(endpoint.serverUrl + '/disconnectFromTeam', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${endpoint.serverToken}`
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
   * @param {string} results - The results to be sent to the server as a string
   * @param {string} endpoint - The server endpoint object containing serverUrl and serverToken
   * @returns {Promise} Resolves with server response if successful, rejects with ServerError if failed
   */
  // The current implementation sends the entire results as a single string in the request body.
  // If the results are too large, this may cause issues. In the future, we may want to implement a streaming approach.
  // However, implementing streaming with fetch and server-side handling is more complex and may require additional setup.
  // I have tried using a readable stream to send the results, but it's more complicated than I hoped.
  // Here are some pointers in case I want to come back to this in the future:
  // - body can be a readable stream, but we need to add the option duplex: "half"
  // - on server side, we need http2, see https://github.com/vercel/next.js/discussions/85001
  // I got stuck on wrong response from the server and gave up
  async sendTestResult (results, endpoint) {
    const response = await fetch(endpoint.serverUrl + '/test-result', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Authorization': `Bearer ${endpoint.serverToken}`
      },
      body: results,
    })
    if (!response.ok) {
      throw new ServerError('Failed to send test result: ' + response.statusText, response.status)
    }
    const data = await response.json()
    console.log('Test result sent successfully, server response:', data)
    return data
  },

  /**
   * Refreshes the server token by sending a request to the server.
   * @param {Object} endpoint - The server endpoint object containing serverUrl and serverToken
   * @returns {Promise} Resolves with the new server token if successful, rejects with ServerError if failed
   */
  async refreshToken (endpoint) {
    const response = await fetch(endpoint.serverUrl + '/refresh-token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${endpoint.serverToken}`
      }
    })
    if (!response.ok) {
      throw new ServerError('Failed to refresh token: ' + response.statusText, response.status)
    }
    const data = await response.json()
    console.log('Refreshed token:', data.serverToken)
    return data.serverToken
  },
}


export default (process.env.VUE_APP_API === 'mock') ? mockApi : realApi
