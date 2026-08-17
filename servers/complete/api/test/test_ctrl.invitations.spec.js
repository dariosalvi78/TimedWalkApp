import assert from 'node:assert/strict'
import { describe, test, before, after, mock, afterEach } from 'node:test'
import dbaccess from '../dbaccess/dbaccess.js'
import { sendTeamInvitation } from '../controllers/invitationsCtrl.js'
import { MockResponse } from './MockResponse.js'
import { emailSender } from '../services/emailSender.js'
import bcrypt from 'bcrypt'


describe('When testing the invitation controller,', () => {

  afterEach(() => {
    mock.reset()
  })

  test('user must be logged in, else 401', async () => {
    const req = {
      userSession: null,
      body: {
        email: 'test@example.com',
        team_p_id: 'team123',
        role: 'patient',
        invitation_message: {
          title: 'Invitation to join team',
          message: 'Please join our team!'
        }
      }
    }
    const res = new MockResponse()

    await sendTeamInvitation(req, res)

    assert.strictEqual(res.code, 401)
  })

  test('user must be clinician or admin, else 403', async () => {
    const req = {
      userSession: {
        session_id: 'session123',
        user_id: 'user123',
        user_role: 'patient',
        isWebClient: false
      },
      body: {
        email: 'test@example.com',
        team_p_id: 'team123',
        role: 'patient',
        invitation_message: {
          title: 'Invitation to join team',
          message: 'Please join our team!'
        }
      }
    }
    const res = new MockResponse()

    await sendTeamInvitation(req, res)

    assert.strictEqual(res.code, 403)
  })

  test('team, email, role and message must be specified in request, else 400', async () => {
    const req = {
      userSession: {
        session_id: 'session123',
        user_id: 'user123',
        user_role: 'clinician',
        isWebClient: false
      },
      body: {
        email: 'test@example.com',
        team_p_id: 'team123',
        role: 'clinician_member'
      }
    }
    const res = new MockResponse()

    await sendTeamInvitation(req, res)

    assert.strictEqual(res.code, 400)
  })

  test('message must contain title, message, else 400', async () => {
    const req = {
      userSession: {
        session_id: 'session123',
        user_id: 'user123',
        user_role: 'clinician',
        isWebClient: false
      },
      body: {
        email: 'test@example.com',
        team_p_id: 'team123',
        role: 'clinician_member',
        invitation_message: {
          title: 'Invitation to join team'
        }
      }
    }
    const res = new MockResponse()

    await sendTeamInvitation(req, res)

    assert.strictEqual(res.code, 400)
  })

  test('if role is not valid, message, else 400', async () => {
    const req = {
      userSession: {
        session_id: 'session123',
        user_id: 'user123',
        user_role: 'clinician',
        isWebClient: false
      },
      body: {
        email: 'test@example.com',
        team_p_id: 'team123',
        role: 'clinician',
        invitation_message: {
          title: 'Invitation to join team',
          message: 'Please join our team!'
        }
      }
    }
    const res = new MockResponse()

    await sendTeamInvitation(req, res)

    assert.strictEqual(res.code, 400)
  })

  test('if team is not found, 404', async () => {
    // mock db query of user session with user
    mock.method(dbaccess, 'getConnection', async () => {
      return null
    })
    mock.method(dbaccess, 'getTeams', async () => {
      return [] // simulate no team found
    })
    mock.method(dbaccess, 'releaseConnection', async () => {
      return true // simulate all ok
    })

    const req = {
      userSession: {
        session_id: 'session123',
        user_id: 'user123',
        user_role: 'clinician',
        isWebClient: false
      },
      body: {
        email: 'test@example.com',
        team_p_id: 'team123',
        role: 'clinician_member',
        invitation_message: {
          title: 'Invitation to join team',
          message: 'Please join our team!'
        }
      }
    }
    const res = new MockResponse()

    await sendTeamInvitation(req, res)

    assert.strictEqual(res.code, 404)
    assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1)
  })

  test('if clinician is not member of team, 403', async () => {
    // mock db query of user session with user
    mock.method(dbaccess, 'getConnection', async () => {
      return null
    })
    mock.method(dbaccess, 'getTeams', async () => {
      return [{ id: 33, p_id: 'team123', name: 'Test Team', contact_details: 'test@example.com', institutions: [], created_at: '2023-01-01' }] // simulate team found
    })
    mock.method(dbaccess, 'getClinicians', async () => {
      return [] // simulate no clinicians found for the team and user
    })
    mock.method(dbaccess, 'releaseConnection', async () => {
      return true // simulate all ok
    })

    const req = {
      userSession: {
        session_id: 'session123',
        user_id: 'user123',
        user_role: 'clinician',
        isWebClient: false
      },
      body: {
        email: 'test@example.com',
        team_p_id: 'team123',
        role: 'clinician_member',
        invitation_message: {
          title: 'Invitation to join team',
          message: 'Please join our team!'
        }
      }
    }
    const res = new MockResponse()

    await sendTeamInvitation(req, res)

    assert.strictEqual(res.code, 403)
    assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1)
  })

  test('if inviting a clinician and user is not owner of team, 403', async () => {
    // mock db query of user session with user
    mock.method(dbaccess, 'getConnection', async () => {
      return null
    })
    mock.method(dbaccess, 'getTeams', async () => {
      return [{ id: 33, p_id: 'team123', name: 'Test Team', contact_details: 'test@example.com', institutions: [], created_at: '2023-01-01' }] // simulate team found
    })
    mock.method(dbaccess, 'getClinicians', async () => {
      return [{
        id: 44,
        p_id: 'clinician123',
        role: 'clinician_member',
      }] // simulate clinician found for the team and user
    })
    mock.method(dbaccess, 'releaseConnection', async () => {
      return true // simulate all ok
    })

    const req = {
      userSession: {
        session_id: 'session123',
        user_id: 'user123',
        user_role: 'clinician',
        isWebClient: false
      },
      body: {
        email: 'test@example.com',
        team_p_id: 'team123',
        role: 'clinician_member',
        invitation_message: {
          title: 'Invitation to join team',
          message: 'Please join our team!'
        }
      }
    }
    const res = new MockResponse()

    await sendTeamInvitation(req, res)

    assert.strictEqual(res.code, 403)
    assert.strictEqual(dbaccess.getTeams.mock.callCount(), 1)
    assert.strictEqual(dbaccess.getClinicians.mock.callCount(), 1)
    assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1)
  })

  test('if inviting a patient without patient_p_id, 400', async () => {
    // mock db query of user session with user
    mock.method(dbaccess, 'getConnection', async () => {
      return null
    })
    mock.method(dbaccess, 'getTeams', async () => {
      return [{ id: 33, p_id: 'team123', name: 'Test Team', contact_details: 'test@example.com', institutions: [], created_at: '2023-01-01' }] // simulate team found
    })
    mock.method(dbaccess, 'getClinicians', async () => {
      return [{
        id: 44,
        p_id: 'clinician123',
        role: 'clinician_member',
      }] // simulate clinician found for the team and user
    })
    mock.method(dbaccess, 'releaseConnection', async () => {
      return true // simulate all ok
    })

    const req = {
      userSession: {
        session_id: 'session123',
        user_id: 'user123',
        user_role: 'clinician',
        isWebClient: false
      },
      body: {
        email: 'patient@example.com',
        team_p_id: 'team123',
        role: 'patient',
        patient_p_id: null, // patient_p_id is missing
        invitation_message: {
          title: 'Invitation to join team',
          message: 'Please join our team!'
        }
      }
    }
    const res = new MockResponse()

    await sendTeamInvitation(req, res)

    assert.strictEqual(res.code, 400)
    assert.strictEqual(dbaccess.getTeams.mock.callCount(), 1)
    assert.strictEqual(dbaccess.getClinicians.mock.callCount(), 1)
    assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1)
  })

  test('if inviting a patient that does not exist, 404', async () => {
    // mock db query of user session with user
    mock.method(dbaccess, 'getConnection', async () => {
      return null
    })
    mock.method(dbaccess, 'getTeams', async () => {
      return [{ id: 33, p_id: 'team123', name: 'Test Team', contact_details: 'test@example.com', institutions: [], created_at: '2023-01-01' }] // simulate team found
    })
    mock.method(dbaccess, 'getClinicians', async () => {
      return [{
        id: 44,
        p_id: 'clinician123',
        role: 'clinician_member',
      }] // simulate clinician found for the team and user
    })
    mock.method(dbaccess, 'getPatients', async () => {
      return [] // simulate patient not found
    })
    mock.method(dbaccess, 'releaseConnection', async () => {
      return true // simulate all ok
    })

    const req = {
      userSession: {
        session_id: 'session123',
        user_id: 'user123',
        user_role: 'clinician',
        isWebClient: false
      },
      body: {
        email: 'patient@example.com',
        team_p_id: 'team123',
        role: 'patient',
        patient_p_id: 'p3232',
        invitation_message: {
          title: 'Invitation to join team',
          message: 'Please join our team!'
        }
      }
    }
    const res = new MockResponse()

    await sendTeamInvitation(req, res)

    assert.strictEqual(res.code, 404)
    assert.strictEqual(dbaccess.getTeams.mock.callCount(), 1)
    assert.strictEqual(dbaccess.getClinicians.mock.callCount(), 1)
    assert.strictEqual(dbaccess.getPatients.mock.callCount(), 1)
    assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1)
  })

  test('if inviting a clinician and all ok, invitation is created and 200', async () => {
    // mock db query of user session with user
    mock.method(dbaccess, 'getConnection', async () => {
      return null
    })
    mock.method(dbaccess, 'getTeams', async () => {
      return [{ id: 33, p_id: 'team123', name: 'Test Team', contact_details: 'test@example.com', institutions: [], created_at: '2023-01-01' }] // simulate team found
    })
    let cliniciansRespN = 0
    mock.method(dbaccess, 'getClinicians', async () => {
      cliniciansRespN++
      if (cliniciansRespN === 1) {
        // first call is to check if the user is a clinician in the team
        return [{
          id: 44,
          p_id: 'clinician123',
          role: 'clinician_owner',
        }] // simulate clinician found for the team and user
      } else {
        // second call is to check if the invited clinician is already in the team
        return [] // simulate no clinicians found for the team and invited email
      }

    })
    let createdInvite
    mock.method(dbaccess, 'createTeamInvitation', async (conn, i) => {
      createdInvite = i
      return i
    })
    mock.method(dbaccess, 'releaseConnection', async () => {
      return true // simulate all ok
    })

    const req = {
      userSession: {
        session_id: 'session123',
        user_id: 'user123',
        user_role: 'clinician',
        isWebClient: false
      },
      body: {
        email: 'clinician@example.com',
        team_p_id: 'team123',
        role: 'clinician_member',
        invitation_message: {
          title: 'Invitation to join team',
          message: 'Please join our team!'
        }
      }
    }
    const res = new MockResponse()

    await sendTeamInvitation(req, res)

    assert.strictEqual(res.code, 200)
    assert.strictEqual(dbaccess.getTeams.mock.callCount(), 1)
    assert.strictEqual(dbaccess.getClinicians.mock.callCount(), 2)
    assert.strictEqual(dbaccess.createTeamInvitation.mock.callCount(), 1)
    assert.strictEqual(createdInvite.email, 'clinician@example.com')
    assert.strictEqual(createdInvite.team_id, 33)
    assert.strictEqual(createdInvite.role, 'clinician_member')
    assert.strictEqual(createdInvite.clinician_id, null)
    assert.strictEqual(createdInvite.invitation_message.title, 'Invitation to join team')
    assert.strictEqual(createdInvite.invitation_message.message, 'Please join our team!')
    assert.ok(createdInvite.code)
    assert.strictEqual(createdInvite.code.length, 6)
    assert.strictEqual(createdInvite.failed_attempts, 0)
    assert.ok(createdInvite.expires_at)
    assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1)
  })

  test('if inviting a patient and all ok, invitation is created and 200', async () => {
    // mock db query of user session with user
    mock.method(dbaccess, 'getConnection', async () => {
      return null
    })
    mock.method(dbaccess, 'getTeams', async () => {
      return [{ id: 33, p_id: 'team123', name: 'Test Team', contact_details: 'test@example.com', institutions: [], created_at: '2023-01-01' }] // simulate team found
    })
    mock.method(dbaccess, 'getClinicians', async () => {
      return [{
        id: 44,
        p_id: 'clinician123',
        role: 'clinician_owner',
      }] // simulate clinician found for the team and user
    })
    mock.method(dbaccess, 'getPatients', async () => {
      return [{
        id: 55,
        p_id: 'p3232',
        first_names: 'John',
        second_names: 'Doe',
        date_of_birth: '1990-01-01',
        sex: 'male',
        email: 'patient@example.com'
      }] // simulate patient found
    })
    let createdInvite
    mock.method(dbaccess, 'createTeamInvitation', async (conn, i) => {
      createdInvite = i
      return i
    })
    mock.method(dbaccess, 'releaseConnection', async () => {
      return true // simulate all ok
    })

    const req = {
      userSession: {
        session_id: 'session123',
        user_id: 'user123',
        user_role: 'clinician',
        isWebClient: false
      },
      body: {
        email: 'patient@example.com',
        team_p_id: 'team123',
        role: 'patient',
        patient_p_id: 'p3232',
        invitation_message: {
          title: 'Invitation to join team',
          message: 'Please join our team!'
        }
      }
    }
    const res = new MockResponse()

    await sendTeamInvitation(req, res)

    assert.strictEqual(res.code, 200)
    assert.strictEqual(dbaccess.getTeams.mock.callCount(), 1)
    assert.strictEqual(dbaccess.getClinicians.mock.callCount(), 1)
    assert.strictEqual(dbaccess.getPatients.mock.callCount(), 1)
    assert.strictEqual(dbaccess.createTeamInvitation.mock.callCount(), 1)
    assert.strictEqual(createdInvite.email, 'patient@example.com')
    assert.strictEqual(createdInvite.team_id, 33)
    assert.strictEqual(createdInvite.role, 'patient')
    assert.strictEqual(createdInvite.clinician_id, null)
    assert.strictEqual(createdInvite.invitation_message.title, 'Invitation to join team')
    assert.strictEqual(createdInvite.invitation_message.message, 'Please join our team!')
    assert.ok(createdInvite.code)
    assert.strictEqual(createdInvite.code.length, 6)
    assert.strictEqual(createdInvite.failed_attempts, 0)
    assert.ok(createdInvite.expires_at)
    assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1)
  })

})
