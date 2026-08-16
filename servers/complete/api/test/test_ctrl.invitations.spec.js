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

})
