import assert from 'node:assert/strict'
import { describe, test, before, after, mock, afterEach } from 'node:test'
import dbaccess from '../dbaccess/dbaccess.js'
import { sendTeamInvitation, createPatient, createClinicianWithTeamInvitation, acceptTeamInvitation, loginPatientAndAcceptInvitation } from '../controllers/invitationsCtrl.js'
import { MockResponse } from './MockResponse.js'
import { emailSender } from '../services/emailSender.js'
import auditlogger from '../services/auditLogger.js'
import bcrypt from 'bcrypt'


describe('When testing the invitation controller,', () => {

  afterEach(() => {
    mock.reset()
  })

  describe('when testing the team invitation sending,', () => {

    test('user must be logged in, else 401', async () => {
      const req = {
        userSession: null,
        body: {
          email: 'test@example.com',
          team_p_id: 'team123',
          role: 'patient'
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
          role: 'patient'
        }
      }
      const res = new MockResponse()

      await sendTeamInvitation(req, res)

      assert.strictEqual(res.code, 403)
    })

    test('team, email and role must be specified in request, else 400', async () => {
      const req = {
        userSession: {
          session_id: 'session123',
          user_id: 'user123',
          user_role: 'clinician',
          isWebClient: false
        },
        body: {
          email: 'test@example.com',
          team_p_id: 'team123'
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
          role: 'clinician'
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
          language: 'en'
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
          language: 'en'
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
          language: 'en'
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
          language: 'en'
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
          language: 'en'
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
      mock.method(dbaccess, 'getClinicians', async () => {
        return [{
          id: 44,
          p_id: 'clinician123',
          role: 'clinician_owner',
        }] // simulate clinician found for the team and user
      })
      mock.method(dbaccess, 'getUsers', async () => {
        return [] // simulate no existing user found for the invited email
      })
      let createdInvite
      let sentEmailSubject
      let sentEmailBody
      mock.method(dbaccess, 'createTeamInvitation', async (conn, i) => {
        createdInvite = i
        return i
      })
      mock.method(emailSender, 'sendEmail', async (to, subject, body) => {
        sentEmailSubject = subject
        sentEmailBody = body
        return true // simulate email sent
      })
      mock.method(auditlogger, 'log', async (actor, action, resource, field_diff, reason_for_change) => {
        return true // simulate audit log entry created
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
          language: 'en'
        }
      }
      const res = new MockResponse()

      await sendTeamInvitation(req, res)

      assert.strictEqual(res.code, 200)
      assert.strictEqual(dbaccess.getTeams.mock.callCount(), 1)
      assert.strictEqual(dbaccess.getClinicians.mock.callCount(), 1)
      assert.strictEqual(dbaccess.getUsers.mock.callCount(), 1)
      assert.strictEqual(dbaccess.createTeamInvitation.mock.callCount(), 1)
      assert.strictEqual(createdInvite.email, 'clinician@example.com')
      assert.strictEqual(createdInvite.team_id, 33)
      assert.strictEqual(createdInvite.role, 'clinician_member')
      assert.strictEqual(createdInvite.language, 'en')
      assert.strictEqual(createdInvite.user_id, null)
      assert.ok(createdInvite.code)
      assert.strictEqual(createdInvite.code.length, 8)
      assert.strictEqual(createdInvite.failed_attempts, 0)
      assert.ok(createdInvite.expires_at)
      assert.strictEqual(auditlogger.log.mock.callCount(), 1)
      assert.strictEqual(emailSender.sendEmail.mock.callCount(), 1)
      assert.strictEqual(sentEmailSubject, 'You have been invited to join a TimedWalk team')
      assert.ok(sentEmailBody.includes(createdInvite.code))
      assert.ok(sentEmailBody.includes('Test Team'))
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
      let sentEmailSubject
      let sentEmailBody
      mock.method(dbaccess, 'createTeamInvitation', async (conn, i) => {
        createdInvite = i
        return i
      })
      mock.method(auditlogger, 'log', async (actor, action, resource, field_diff, reason_for_change) => {
        return true // simulate audit log entry created
      })
      mock.method(emailSender, 'sendEmail', async (to, subject, body) => {
        sentEmailSubject = subject
        sentEmailBody = body
        return true // simulate email sent
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
          language: 'en'
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
      assert.strictEqual(createdInvite.language, 'en')
      assert.strictEqual(createdInvite.user_id, null)
      assert.ok(createdInvite.code)
      assert.strictEqual(createdInvite.code.length, 8)
      assert.strictEqual(createdInvite.failed_attempts, 0)
      assert.ok(createdInvite.expires_at)
      assert.strictEqual(auditlogger.log.mock.callCount(), 1)
      assert.strictEqual(emailSender.sendEmail.mock.callCount(), 1)
      assert.strictEqual(sentEmailSubject, 'You have been invited to join a TimedWalk team')
      assert.ok(sentEmailBody.includes(createdInvite.code))
      assert.ok(sentEmailBody.includes('Test Team'))
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1)
    })

  })


  describe('when testing the patient creation,', () => {
    test('user must be logged in, else 401', async () => {
      const req = {
        userSession: null,
        body: {
          email: 'patient@example.com',
          language: 'en',
          first_names: 'John',
          second_names: 'Doe',
          date_of_birth: '1990-01-01',
          sex: 'male',
          phone_number: '1234567890'
        }
      }
      const res = new MockResponse()

      await createPatient(req, res)

      assert.strictEqual(res.code, 401)
    })

    test('user must be admin or clinician, else 403', async () => {
      const req = {
        userSession: {
          session_id: 'session123',
          user_id: 'user123',
          user_role: 'patient',
          isWebClient: false
        },
        body: {
          email: 'patient@example.com',
          language: 'en',
          first_names: 'John',
          second_names: 'Doe',
          date_of_birth: '1990-01-01',
          sex: 'male',
          phone_number: '1234567890'
        }
      }
      const res = new MockResponse()

      await createPatient(req, res)

      assert.strictEqual(res.code, 403)
    })

    test('all required fields must be provided, else 400', async () => {
      const req = {
        userSession: {
          session_id: 'session123',
          user_id: 'user123',
          user_role: 'admin',
          isWebClient: false
        },
        body: {
          // email, language, first_names, second_names, date_of_birth, sex, phone_number
          email: 'patient@example.com',
          language: 'en',
          first_names: 'John',
          second_names: 'Doe',
          date_of_birth: '1990-01-01',
          sex: 'male'
          // missing phone number
        }
      }
      const res = new MockResponse()

      await createPatient(req, res)

      assert.strictEqual(res.code, 400)
    })

    test('if user already exists, 409', async () => {
      // mock db query of user session with user
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dbaccess, 'getUsers', async () => {
        return [{ id: 1, email: 'patient@example.com' }]
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })

      const req = {
        userSession: {
          session_id: 'session123',
          user_id: 'user123',
          user_role: 'admin',
          isWebClient: false
        },
        body: {
          email: 'patient@example.com',
          language: 'en',
          first_names: 'John',
          second_names: 'Doe',
          date_of_birth: '1990-01-01',
          sex: 'male',
          phone_number: '1234567890'
        }
      }
      const res = new MockResponse()

      await createPatient(req, res)

      assert.strictEqual(res.code, 409, 'return 409')
    })

    test('if patient with same details already exists, 409', async () => {
      // mock db query of user session with user
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dbaccess, 'getUsers', async () => {
        return [] // no existing user
      })
      mock.method(dbaccess, 'getPatients', async () => {
        return [{ id: 1, first_names: 'John', second_names: 'Doe', date_of_birth: '1990-01-01', sex: 'male', phone_number: '1234567890' }]
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })

      const req = {
        userSession: {
          session_id: 'session123',
          user_id: 'user123',
          user_role: 'admin',
          isWebClient: false
        },
        body: {
          email: 'patient@example.com',
          language: 'en',
          first_names: 'John',
          second_names: 'Doe',
          date_of_birth: '1990-01-01',
          sex: 'male',
          phone_number: '1234567890'
        }
      }
      const res = new MockResponse()

      await createPatient(req, res)

      assert.strictEqual(res.code, 409, 'return 409')
      assert.strictEqual(dbaccess.getConnection.mock.callCount(), 1)
      assert.strictEqual(dbaccess.getUsers.mock.callCount(), 1)
      assert.strictEqual(dbaccess.getPatients.mock.callCount(), 1)
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1)
    })

    test('if all required fields are provided and user does not exist, patient is created and 201', async () => {
      let createdUser, createdPatient
      // mock db query of user session with user
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dbaccess, 'getUsers', async () => {
        return [] // no existing user
      })
      mock.method(dbaccess, 'getPatients', async () => {
        return [] // no existing patient
      })
      mock.method(dbaccess, 'createUser', async (conn, user) => {
        createdUser = user
        return { id: 1, ...user }
      })
      mock.method(dbaccess, 'createPatient', async (conn, patient) => {
        createdPatient = patient
        return { id: 1, ...patient }
      })
      mock.method(emailSender, 'sendEmail', async (to, subject, body) => {
        return true // simulate email sent
      })
      mock.method(auditlogger, 'log', async (actor, action, resource, field_diff, reason_for_change) => {
        return true // simulate audit log entry created
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })

      const req = {
        userSession: {
          session_id: 'session123',
          user_id: 'user123',
          user_role: 'admin',
          isWebClient: false
        },
        body: {
          email: 'patient@example.com',
          language: 'en',
          first_names: 'John',
          second_names: 'Doe',
          date_of_birth: '1990-01-01',
          sex: 'male',
          phone_number: '1234567890'
        }
      }
      const res = new MockResponse()

      await createPatient(req, res)

      assert.strictEqual(res.code, 201, 'return 201')
      assert.strictEqual(createdUser.email, 'patient@example.com', 'created user has correct email')
      assert.strictEqual(createdPatient.first_names, 'John', 'created patient has correct first names')

      assert.strictEqual(dbaccess.getConnection.mock.callCount(), 1)
      assert.strictEqual(dbaccess.getUsers.mock.callCount(), 1)
      assert.strictEqual(dbaccess.getPatients.mock.callCount(), 1)
      assert.strictEqual(dbaccess.createUser.mock.callCount(), 1)
      assert.strictEqual(dbaccess.createPatient.mock.callCount(), 1)
      assert.strictEqual(auditlogger.log.mock.callCount(), 2)
      assert.strictEqual(emailSender.sendEmail.mock.callCount(), 1)
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1)
    })
  })

  describe('when testing creating clinician with team invitation,', () => {

    test('all fields must be provided, else 400', async () => {
      const req = {
        body: {
          invitation_code: 'code123',
          email: 'clinician@example.com',
          first_names: 'Jane',
          language: 'en'
        }
      }
      const res = new MockResponse()

      await createClinicianWithTeamInvitation(req, res)

      assert.strictEqual(res.code, 400, 'return 400')
    })

    test('if invitation is not found get a 404', async () => {
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dbaccess, 'deleteExpiredTeamInvitations', async () => {
        return true // simulate all ok
      })
      mock.method(dbaccess, 'getTeamInvitations', async () => {
        return [] // simulate no invitation found
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return [] // simulate no invitation found
      })

      const req = {
        body: {
          invitation_code: 'code123',
          email: 'clinician@example.com',
          first_names: 'Jane',
          second_names: 'Doe',
          language: 'en'
        }
      }
      const res = new MockResponse()

      await createClinicianWithTeamInvitation(req, res)

      assert.strictEqual(res.code, 404, 'return 404')
      assert.strictEqual(dbaccess.getConnection.mock.callCount(), 1)
      assert.strictEqual(dbaccess.deleteExpiredTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(dbaccess.getTeamInvitations.mock.callCount(), 2)
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1)
    })

    test('if code is wrong for email, get a 404 and increase failed attempts', async () => {
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dbaccess, 'deleteExpiredTeamInvitations', async () => {
        return true // simulate all ok
      })
      let attempts = 0
      mock.method(dbaccess, 'getTeamInvitations', async () => {
        attempts++
        if (attempts === 1) {
          // return no invitations for email and code
          return []
        } else {
          // return an invitation for email only, to simulate that the code is wrong
          return [{
            id: 1,
            team_id: 1,
            clinician_id: null,
            patient_id: null,
            role: 'clinician_member',
            code: 'wrongcode',
            email: 'clinician@example.com',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            failed_attempts: 0
          }]
        }
      })
      mock.method(dbaccess, 'increaseTeamInvitationFailedAttempts', async () => {
        return true // simulate all ok
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return [] // simulate no invitation found
      })

      const req = {
        body: {
          invitation_code: 'code123',
          email: 'clinician@example.com',
          first_names: 'Jane',
          second_names: 'Doe',
          language: 'en'
        }
      }
      const res = new MockResponse()

      await createClinicianWithTeamInvitation(req, res)

      assert.strictEqual(res.code, 404, 'return 404')
      assert.strictEqual(dbaccess.getConnection.mock.callCount(), 1)
      assert.strictEqual(dbaccess.deleteExpiredTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(dbaccess.getTeamInvitations.mock.callCount(), 2)
      assert.strictEqual(dbaccess.increaseTeamInvitationFailedAttempts.mock.callCount(), 1)
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1)
    })

    test('if code ok but too many attempts, get a 403', async () => {
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dbaccess, 'deleteExpiredTeamInvitations', async () => {
        return true // simulate all ok
      })
      mock.method(dbaccess, 'getTeamInvitations', async () => {
        return [{
          id: 1,
          team_id: 1,
          clinician_id: null,
          patient_id: null,
          role: 'clinician_member',
          code: 'code123',
          email: 'clinician@example.com',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          failed_attempts: 100
        }]
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return [] // simulate no invitation found
      })

      const req = {
        body: {
          invitation_code: 'code123',
          email: 'clinician@example.com',
          first_names: 'Jane',
          second_names: 'Doe',
          language: 'en'
        }
      }
      const res = new MockResponse()

      await createClinicianWithTeamInvitation(req, res)

      assert.strictEqual(res.code, 403, 'return 403')
      assert.strictEqual(dbaccess.getConnection.mock.callCount(), 1)
      assert.strictEqual(dbaccess.deleteExpiredTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(dbaccess.getTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1)
    })

    test('if code ok, create user, clinician, associate clinician to team and get a 201', async () => {
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dbaccess, 'deleteExpiredTeamInvitations', async () => {
        return true // simulate all ok
      })
      mock.method(dbaccess, 'getTeamInvitations', async () => {
        return [{
          id: 1,
          team_id: 1,
          clinician_id: null,
          patient_id: null,
          role: 'clinician_member',
          code: 'code123',
          email: 'clinician@example.com',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          failed_attempts: 0
        }]
      })
      mock.method(dbaccess, 'getTeams', async () => {
        return [{
          id: 1,
          p_id: 'team123',
          name: 'Test Team',
          contact_details: 'Test Contact Details'
        }]
      })
      let createdUser, createdClinician
      mock.method(dbaccess, 'createUser', async () => {
        createdUser = true
        return true // simulate all ok
      })
      mock.method(dbaccess, 'createClinician', async () => {
        createdClinician = true
        return true // simulate all ok
      })
      mock.method(dbaccess, 'addClinicianToTeam', async () => {
        return true // simulate all ok
      })
      mock.method(dbaccess, 'deleteTeamInvitations', async () => {
        return true // simulate all ok
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return [] // simulate no invitation found
      })
      mock.method(auditlogger, 'log', async (actor, action, resource, field_diff, reason_for_change) => {
        return true // simulate audit log entry created
      })
      mock.method(emailSender, 'sendEmail', async () => {
        return true // simulate email sent
      })

      const req = {
        body: {
          invitation_code: 'code123',
          email: 'clinician@example.com',
          first_names: 'Jane',
          second_names: 'Doe',
          language: 'en'
        }
      }
      const res = new MockResponse()

      await createClinicianWithTeamInvitation(req, res)

      assert.strictEqual(res.code, 201, 'return 201')
      assert.strictEqual(dbaccess.getConnection.mock.callCount(), 1)
      assert.strictEqual(dbaccess.deleteExpiredTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(dbaccess.getTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(dbaccess.createUser.mock.callCount(), 1)
      assert.strictEqual(dbaccess.createClinician.mock.callCount(), 1)
      assert.strictEqual(dbaccess.addClinicianToTeam.mock.callCount(), 1)
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1)
      assert.strictEqual(auditlogger.log.mock.callCount(), 2, 'one for user creation, one for clinician creation')
      assert.strictEqual(emailSender.sendEmail.mock.callCount(), 1)
    })
  })

  describe('when testing accepting team invitation,', () => {
    test('if invitation code is missing get a 400', async () => {
      const req = {
        userSession: {
          session_id: 'session123',
          user_id: 'user123',
          user_role: 'clinician',
          isWebClient: false
        },
        body: {
          invitation_code: null
        }
      }
      const res = new MockResponse()

      await acceptTeamInvitation(req, res)

      assert.strictEqual(res.code, 400, 'return 400')
    })

    test('if invitation code is specified byt not found, get a 404', async () => {
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dbaccess, 'deleteExpiredTeamInvitations', async () => {
        return true // simulate all ok
      })
      mock.method(dbaccess, 'getTeamInvitations', async () => {
        return [] // simulate no invitation found
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
          invitation_code: 'code123'
        }
      }
      const res = new MockResponse()

      await acceptTeamInvitation(req, res)

      assert.strictEqual(res.code, 404, 'return 404')
      assert.strictEqual(dbaccess.getConnection.mock.callCount(), 1)
      assert.strictEqual(dbaccess.deleteExpiredTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(dbaccess.getTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1)
    })

    test('if invitation code is specified byt not found, get a 404', async () => {
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dbaccess, 'deleteExpiredTeamInvitations', async () => {
        return true // simulate all ok
      })
      mock.method(dbaccess, 'getTeamInvitations', async () => {
        return [] // simulate no invitation found
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
          invitation_code: 'code123'
        }
      }
      const res = new MockResponse()

      await acceptTeamInvitation(req, res)

      assert.strictEqual(res.code, 404, 'return 404')
      assert.strictEqual(dbaccess.getConnection.mock.callCount(), 1)
      assert.strictEqual(dbaccess.deleteExpiredTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(dbaccess.getTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1)
    })

    test('if invitation code is ok but wrong role, get a 403', async () => {
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dbaccess, 'deleteExpiredTeamInvitations', async () => {
        return true // simulate all ok
      })
      mock.method(dbaccess, 'getTeamInvitations', async () => {
        return [{
          id: 1,
          team_id: 1,
          user_id: 'user123',
          role: 'patient',
          code: 'code123',
          email: 'patient@test.com',
          role: 'patient'
        }]
      })
      mock.method(dbaccess, 'increaseTeamInvitationFailedAttempts', async () => {
        return true // simulate all ok
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
          invitation_code: 'code123'
        }
      }
      const res = new MockResponse()

      await acceptTeamInvitation(req, res)

      assert.strictEqual(res.code, 403, 'return 403')
      assert.strictEqual(dbaccess.getConnection.mock.callCount(), 1)
      assert.strictEqual(dbaccess.deleteExpiredTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(dbaccess.getTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(dbaccess.increaseTeamInvitationFailedAttempts.mock.callCount(), 1)
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1)
    })

    test('if attempts are exceeded, get a 403', async () => {
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dbaccess, 'deleteExpiredTeamInvitations', async () => {
        return true // simulate all ok
      })
      mock.method(dbaccess, 'getTeamInvitations', async () => {
        return [{
          id: 1,
          team_id: 1,
          user_id: 'user123',
          role: 'patient',
          code: 'code123',
          email: 'patient@test.com',
          role: 'patient',
          failed_attempts: 100
        }]
      })
      mock.method(dbaccess, 'increaseTeamInvitationFailedAttempts', async () => {
        return true // simulate all ok
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })
      const req = {
        userSession: {
          session_id: 'session123',
          user_id: 'user123',
          user_role: 'patient',
          isWebClient: false
        },
        body: {
          invitation_code: 'code123'
        }
      }
      const res = new MockResponse()

      await acceptTeamInvitation(req, res)

      assert.strictEqual(res.code, 403, 'return 403')
      assert.strictEqual(dbaccess.getConnection.mock.callCount(), 1)
      assert.strictEqual(dbaccess.deleteExpiredTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(dbaccess.getTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(dbaccess.increaseTeamInvitationFailedAttempts.mock.callCount(), 0)
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1)
    })

    test('if invitaiton has expired, get a 403 and increase failed attempts', async () => {
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dbaccess, 'deleteExpiredTeamInvitations', async () => {
        return true // simulate all ok
      })
      mock.method(dbaccess, 'getTeamInvitations', async () => {
        return [{
          id: 1,
          team_id: 1,
          user_id: 'user123',
          role: 'patient',
          code: 'code123',
          email: 'patient@test.com',
          role: 'patient',
          failed_attempts: 0,
          expires_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // expired yesterday
        }]
      })
      mock.method(dbaccess, 'increaseTeamInvitationFailedAttempts', async () => {
        return true // simulate all ok
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })
      const req = {
        userSession: {
          session_id: 'session123',
          user_id: 'user123',
          user_role: 'patient',
          isWebClient: false
        },
        body: {
          invitation_code: 'code123'
        }
      }
      const res = new MockResponse()

      await acceptTeamInvitation(req, res)

      assert.strictEqual(res.code, 403, 'return 403')
      assert.strictEqual(dbaccess.getConnection.mock.callCount(), 1)
      assert.strictEqual(dbaccess.deleteExpiredTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(dbaccess.getTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(dbaccess.increaseTeamInvitationFailedAttempts.mock.callCount(), 1)
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1)
    })

    test('if all ok, associate patient to team and get a 200', async () => {
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dbaccess, 'deleteExpiredTeamInvitations', async () => {
        return true // simulate all ok
      })
      mock.method(dbaccess, 'getTeamInvitations', async () => {
        return [{
          id: 90,
          team_id: 300, // team id!
          user_id: 'user123',
          role: 'patient',
          code: 'code123',
          email: 'patient@test.com',
          role: 'patient'
        }]
      })
      mock.method(dbaccess, 'getPatients', async () => {
        return [{
          user_id: 'user123',
          id: 100, // patient id!
          p_id: 'patient123',
          first_names: 'John',
          second_names: 'Doe',
          date_of_birth: '1990-01-01',
          sex: 'male'
        }]
      })
      mock.method(dbaccess, 'addPatientToTeam', async () => {
        return true // simulate all ok
      })
      mock.method(dbaccess, 'deleteTeamInvitations', async () => {
        return true // simulate all ok
      })
      mock.method(dbaccess, 'getUsers', async () => {
        return [{
          id: 'user123',
          email: 'patient@test.com'
        }]
      })
      mock.method(dbaccess, 'getTeams', async () => {
        return [{
          id: 300,
          name: 'Test Team'
        }]
      })
      mock.method(dbaccess, 'increaseTeamInvitationFailedAttempts', async () => {
        return true // simulate all ok
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })
      mock.method(emailSender, 'sendEmail', async () => {
        return true // simulate email sent
      })
      mock.method(auditlogger, 'log', async (actor, action, resource, field_diff, reason_for_change) => {
        return true // simulate audit log entry created
      })


      const req = {
        userSession: {
          session_id: 'session123',
          user_id: 'user123',
          user_role: 'patient',
          isWebClient: false
        },
        body: {
          invitation_code: 'code123'
        }
      }
      const res = new MockResponse()

      await acceptTeamInvitation(req, res)

      assert.strictEqual(res.code, 200, 'return 200')
      assert.strictEqual(dbaccess.getConnection.mock.callCount(), 1)
      assert.strictEqual(dbaccess.deleteExpiredTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(dbaccess.getTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(dbaccess.getPatients.mock.callCount(), 1)
      assert.strictEqual(dbaccess.addPatientToTeam.mock.callCount(), 1)
      assert.strictEqual(dbaccess.addPatientToTeam.mock.calls[0].arguments[1], 300) // team id
      assert.strictEqual(dbaccess.addPatientToTeam.mock.calls[0].arguments[2], 100) // patient id
      assert.strictEqual(dbaccess.deleteTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(dbaccess.increaseTeamInvitationFailedAttempts.mock.callCount(), 0)
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1, 'connection is always released')
      assert.strictEqual(auditlogger.log.mock.callCount(), 1, 'one for user creation, one for clinician creation')
      assert.strictEqual(emailSender.sendEmail.mock.callCount(), 1)
    })

  })

  describe('when testing patient invitation and login, ', async () => {
    test('user must NOT be logged in, else 404', async () => {
      const req = {
        userSession: {
          session_id: 'session123',
          user_id: 'user123',
          user_role: 'patient',
          isWebClient: false
        },
        body: {
          invitation_code: 'code123'
        }
      }
      const res = new MockResponse()

      await loginPatientAndAcceptInvitation(req, res)

      assert.strictEqual(res.code, 404)
    })

    test('code must be sent else, else 404', async () => {
      const req = {
        userSession: {
          session_id: 'session123',
          user_id: 'user123',
          user_role: 'patient',
          isWebClient: false
        },
        body: {
        }
      }
      const res = new MockResponse()

      await loginPatientAndAcceptInvitation(req, res)

      assert.strictEqual(res.code, 404)
    })

    test('if code is not found, get a 404', async () => {
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dbaccess, 'deleteExpiredTeamInvitations', async () => {
        return true // simulate all ok
      })
      mock.method(dbaccess, 'getTeamInvitations', async () => {
        return [] // simulate no invitation found
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })
      const req = {
        body: {
          invitation_code: 'code123'
        }
      }
      const res = new MockResponse()

      await loginPatientAndAcceptInvitation(req, res)

      assert.strictEqual(res.code, 404, 'return 404')
      assert.strictEqual(dbaccess.getConnection.mock.callCount(), 1)
      assert.strictEqual(dbaccess.deleteExpiredTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(dbaccess.getTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1)
    })

    test('if too many failed attempts, get a 403', async () => {
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dbaccess, 'deleteExpiredTeamInvitations', async () => {
        return true // simulate all ok
      })
      mock.method(dbaccess, 'getTeamInvitations', async () => {
        return [{
          id: 1,
          team_id: 1,
          user_id: null,
          role: 'patient',
          code: 'code123',
          email: 'patient@example.com',
          failed_attempts: 5
        }]
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })
      const req = {
        body: {
          invitation_code: 'code123'
        }
      }
      const res = new MockResponse()

      await loginPatientAndAcceptInvitation(req, res)

      assert.strictEqual(res.code, 403, 'return 403')
      assert.strictEqual(dbaccess.getConnection.mock.callCount(), 1)
      assert.strictEqual(dbaccess.deleteExpiredTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(dbaccess.getTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1)
    })


    test('if invitation has expired, get a 403', async () => {
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dbaccess, 'deleteExpiredTeamInvitations', async () => {
        return true // simulate all ok
      })
      mock.method(dbaccess, 'getTeamInvitations', async () => {
        return [{
          id: 1,
          team_id: 1,
          user_id: null,
          role: 'patient',
          code: 'code123',
          email: 'patient@example.com',
          failed_attempts: 0,
          expires_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // expired yesterday
        }]
      })
      mock.method(dbaccess, 'increaseTeamInvitationFailedAttempts', async () => {
        return true // simulate all ok
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })
      const req = {
        body: {
          invitation_code: 'code123'
        }
      }
      const res = new MockResponse()

      await loginPatientAndAcceptInvitation(req, res)

      assert.strictEqual(res.code, 403, 'return 403')
      assert.strictEqual(dbaccess.getConnection.mock.callCount(), 1)
      assert.strictEqual(dbaccess.deleteExpiredTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(dbaccess.getTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(dbaccess.increaseTeamInvitationFailedAttempts.mock.callCount(), 1)
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1)
    })

    test('if invitation is not for patient, get a 403', async () => {
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dbaccess, 'deleteExpiredTeamInvitations', async () => {
        return true // simulate all ok
      })
      mock.method(dbaccess, 'getTeamInvitations', async () => {
        return [{
          id: 1,
          team_id: 1,
          user_id: null,
          role: 'clinician',
          code: 'code123',
          email: 'clinician@example.com',
          failed_attempts: 0,
          expires_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // expired yesterday
        }]
      })
      mock.method(dbaccess, 'increaseTeamInvitationFailedAttempts', async () => {
        return true // simulate all ok
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })
      const req = {
        body: {
          invitation_code: 'code123'
        }
      }
      const res = new MockResponse()

      await loginPatientAndAcceptInvitation(req, res)

      assert.strictEqual(res.code, 403, 'return 403')
      assert.strictEqual(dbaccess.getConnection.mock.callCount(), 1)
      assert.strictEqual(dbaccess.deleteExpiredTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(dbaccess.getTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(dbaccess.increaseTeamInvitationFailedAttempts.mock.callCount(), 1)
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1)
    })

    test('if all OK, get a 201 and login tokens', async () => {
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dbaccess, 'deleteExpiredTeamInvitations', async () => {
        return true // simulate all ok
      })
      mock.method(dbaccess, 'getTeamInvitations', async () => {
        return [{
          id: 1,
          team_id: 1,
          user_id: 'user123',
          role: 'patient',
          code: 'code123',
          email: 'patient@example.com',
          failed_attempts: 0,
          expires_at: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString() // not expired
        }]
      })
      mock.method(dbaccess, 'increaseTeamInvitationFailedAttempts', async () => {
        return true // simulate all ok
      })
      mock.method(dbaccess, 'getPatientWithUser', async () => {
        return {
          id: 1,
          user_id: 'user123',
          first_names: 'John',
          second_names: 'Doe',
          date_of_birth: '1990-01-01',
          sex: 'male',
          language: 'en',
          email: 'patient@example.com'
        }
      })
      mock.method(dbaccess, 'addPatientToTeam', async (dba, teamid, pid) => {
        return {
          id: 1,
          team_id: teamid,
          patient_id: pid,
          role: 'patient'
        } // simulate all ok
      })
      mock.method(dbaccess, 'getTeams', async () => {
        return [{
          id: 1,
          p_id: 'team123',
          name: 'Test Team',
          contact_details: 'Test Contact Details'
        }]
      })
      mock.method(dbaccess, 'deleteTeamInvitations', async () => {
        return 1 // simulate all ok
      })
      mock.method(emailSender, 'sendEmail', async () => {
        return true // simulate email sent
      })
      mock.method(dbaccess, 'createDeviceId', async () => {
        return 'device123' // simulate all ok
      })
      mock.method(dbaccess, 'createUserSession', async () => {
        return {
          session_id: 'session123',
          user_id: 'user123'
        }
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })
      const req = {
        body: {
          invitation_code: 'code123'
        }
      }
      const res = new MockResponse()

      await loginPatientAndAcceptInvitation(req, res)

      assert.strictEqual(res.code, 201, 'return 201')
      assert.strictEqual(dbaccess.getConnection.mock.callCount(), 1)
      assert.strictEqual(dbaccess.deleteExpiredTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(dbaccess.getTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(dbaccess.increaseTeamInvitationFailedAttempts.mock.callCount(), 0)
      assert.strictEqual(dbaccess.getPatientWithUser.mock.callCount(), 1)
      assert.strictEqual(dbaccess.addPatientToTeam.mock.callCount(), 1)
      assert.strictEqual(dbaccess.getTeams.mock.callCount(), 1)
      assert.strictEqual(dbaccess.deleteTeamInvitations.mock.callCount(), 1)
      assert.strictEqual(emailSender.sendEmail.mock.callCount(), 1, 'confirmation email is sent')
      assert.strictEqual(dbaccess.createDeviceId.mock.callCount(), 1, 'device ID is created')
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1)

    })
  })
})
