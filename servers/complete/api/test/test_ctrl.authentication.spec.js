import assert from 'node:assert/strict'
import { describe, test, before, after, mock, afterEach } from 'node:test'
import dbaccess from '../dbaccess/dbaccess.js'
import { verifyUserSession, refreshUserSession, logoutUserSession, requestLoginCode } from '../controllers/authenticationCtrl.js'
import { MockResponse } from './MockResponse.js'
import { emailSender } from '../services/emailSender.js'


describe('When testing the authentication controller,', () => {


  afterEach(() => {
    mock.reset()
  })

  test('verifyUserSession should return 401 if no session token is provided', async () => {
    const req = {
      cookies: {},
      headers: {}
    }
    const res = new MockResponse()
    const next = mock.fn()

    await verifyUserSession(req, res, next)

    assert.strictEqual(res.code, 401)
    assert.deepStrictEqual(res.data, { error: 'Unauthorized' })
  })

  describe('When testing verifyUserSession with app access,', () => {
    test('if no session is found, it should return 401', async () => {

      // mock db query of user session with user
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dbaccess, 'getUserSessionsWithUser', async () => {
        return null // simulate no session found
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })


      const req = {
        cookies: {},
        headers: {
          authorization: 'Bearer test-session-token'
        }
      }
      const res = new MockResponse()
      const next = mock.fn()

      await verifyUserSession(req, res, next)

      assert.strictEqual(dbaccess.getUserSessionsWithUser.mock.callCount(), 1);
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1);

      assert.strictEqual(res.code, 401)
    })

    test('if a session is found it should call next', async () => {

      // mock db query of user session with user
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })

      // return a correct session
      mock.method(dbaccess, 'getUserSessionsWithUser', async () => {
        return [{
          user_id: 1,
          is_public_client: false,
          user: {
            role: 'clinician',
          }
        }]
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })

      const req = {
        cookies: {},
        headers: {
          authorization: 'Bearer test-session-token'
        }
      }
      const res = new MockResponse()
      const next = mock.fn()

      await verifyUserSession(req, res, next)

      assert.strictEqual(dbaccess.getUserSessionsWithUser.mock.callCount(), 1);
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1);

      assert.strictEqual(next.mock.callCount(), 1);
    })
  })


  describe('When testing verifyUserSession with web access,', () => {

    test('if no session is found, return 401', async () => {
      // mock db query of user session with user
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dbaccess, 'getUserSessionsWithUser', async () => {
        return null // simulate no session found
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })


      const req = {
        cookies: {
          '__Host-session': 'test-session-token'
        },
        headers: {
        }
      }
      const res = new MockResponse()
      const next = mock.fn()

      await verifyUserSession(req, res, next)
      assert.strictEqual(res.code, 401)
    })

    test('if session is found but no CSFR, return 401', async () => {
      // mock db query of user session with user
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      // return no for that CSFR session
      mock.method(dbaccess, 'getUserSessionsWithUser', async () => {
        return [] // simulate no session found
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })

      const req = {
        cookies: {
          '__Host-session': 'test-session-token'
        },
        headers: {
          'X-CSRF-Token': 'test-csrf-token'
        }
      }
      const res = new MockResponse()
      const next = mock.fn()

      await verifyUserSession(req, res, next)

      assert.strictEqual(dbaccess.getUserSessionsWithUser.mock.callCount(), 1)
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1)
      assert.strictEqual(res.code, 401)
      assert.strictEqual(next.mock.callCount(), 0)
    })


    test('if a session is found AND CSRF passes AND it is a public client AND hard expiration is met, call next', async () => {

      // mock db query of user session with user
      // return a correct session
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dbaccess, 'getUserSessionsWithUser', async () => {
        return [{
          user_id: 1,
          is_public_client: true,
          public_client_hard_expiry_at: new Date(Date.now() - 10000), // expired
          user: {
            role: 'clinician',
          }
        }]
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })

      const req = {
        cookies: {
          '__Host-session': 'test-session-token'
        },
        headers: {
          'X-CSRF-Token': 'test-csrf-token'
        }
      }
      const res = new MockResponse()
      const next = mock.fn()

      await verifyUserSession(req, res, next)

      assert.strictEqual(dbaccess.getUserSessionsWithUser.mock.callCount(), 1);
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1);
      assert.strictEqual(res.code, 401)
    })


    test('if a session is found AND CSRF passes AND it is a public client AND hard expiration is OK, next is called', async () => {

      // mock db query of user session with user
      // return a correct session
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dbaccess, 'getUserSessionsWithUser', async () => {
        return [{
          user_id: 1,
          is_public_client: true,
          public_client_hard_expiry_at: new Date(Date.now() + 10000), // not expired
          user: {
            role: 'clinician',
          }
        }]
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })

      const req = {
        cookies: {
          '__Host-session': 'test-session-token'
        },
        headers: {
          'X-CSRF-Token': 'test-csrf-token'
        }
      }
      const res = new MockResponse()
      const next = mock.fn()

      await verifyUserSession(req, res, next)

      assert.strictEqual(dbaccess.getUserSessionsWithUser.mock.callCount(), 1);
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1);
      assert.strictEqual(next.mock.callCount(), 1);
    })


    test('if 10 minutes pass since last cleanup of sessions, a new cleanup is called', async (context) => {

      // forward the time 12 minutes in the future to trigger clenaup
      context.mock.timers.enable({ apis: ['Date'], now: Date.now() + 12 * 60 * 1000 })

      // mock db query of user session with user
      // return a correct session
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dbaccess, 'getUserSessionsWithUser', async () => {
        return [{
          user_id: 1,
          is_public_client: true,
          public_client_hard_expiry_at: new Date(Date.now() + 10000), // not expired
          user: {
            role: 'clinician',
          }
        }]
      })
      mock.method(dbaccess, 'deleteExpiredUserSessions', async () => {
        return 2
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })

      const req = {
        cookies: {
          '__Host-session': 'test-session-token'
        },
        headers: {
          'X-CSRF-Token': 'test-csrf-token'
        }
      }
      const res = new MockResponse()
      const next = mock.fn()

      await verifyUserSession(req, res, next)

      assert.strictEqual(dbaccess.getUserSessionsWithUser.mock.callCount(), 1);
      assert.strictEqual(dbaccess.deleteExpiredUserSessions.mock.callCount(), 1);
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1);
    })
  })

  describe('When testing refreshUserSession,', () => {

    test('if user is not logged in, it should return 401', async () => {
      const req = {
        userSession: null,
        cookies: {},
        headers: {}
      }
      const res = new MockResponse()
      const next = mock.fn()

      await refreshUserSession(req, res)

      assert.strictEqual(res.code, 401)
    })


    test('if user is logged in and web client, the user session is updated on the db and sent to the client', async () => {

      // mock db query of user session with user
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dbaccess, 'updateUserSession', async () => {
        return null // simulate no session found
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })


      const req = {
        userSession: {
          session_id: 'test-session-id',
          user_id: 1,
          isWebClient: true
        },
        cookies: {},
        headers: {}
      }
      const res = new MockResponse()
      const next = mock.fn()

      await refreshUserSession(req, res)

      assert.strictEqual(dbaccess.updateUserSession.mock.callCount(), 1);
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1);
      assert.ok(res.cookies['__Host-session'])
      assert.ok(res.data.CSRFToken)
      assert.ok(res.data.newExpiryTime)
      assert.strictEqual(res.code, 200)
    })

    test('if user is logged in and app client, the user session is updated on the db and sent to the client', async () => {

      // mock db query of user session with user
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dbaccess, 'updateUserSession', async () => {
        return null // simulate no session found
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })


      const req = {
        userSession: {
          session_id: 'test-session-id',
          user_id: 1,
          isWebClient: false
        },
        cookies: {},
        headers: {}
      }
      const res = new MockResponse()
      const next = mock.fn()

      await refreshUserSession(req, res)

      assert.strictEqual(dbaccess.updateUserSession.mock.callCount(), 1);
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1);
      assert.ok(!res.cookies['__Host-session'])
      assert.ok(res.data.sessionToken)
      assert.ok(!res.data.CSRFToken)
      assert.ok(res.data.newExpiryTime)
      assert.strictEqual(res.code, 200)
    })

  })


  describe('When testing logoutUserSession,', () => {

    test('if user is not logged in, it should return 401', async () => {
      const req = {
        userSession: null,
        cookies: {},
        headers: {}
      }
      const res = new MockResponse()
      const next = mock.fn()

      await refreshUserSession(req, res)

      assert.strictEqual(res.code, 401)
    })


    test('if user is logged in, the user session is removed from the db', async () => {

      // mock db query of user session with user
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dbaccess, 'deleteUserSession', async () => {
        return true // simulate session deleted
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })


      const req = {
        userSession: {
          session_id: 'test-session-id',
          user_id: 1,
          isWebClient: true
        },
        cookies: {},
        headers: {}
      }
      const res = new MockResponse()
      const next = mock.fn()

      await logoutUserSession(req, res)

      assert.strictEqual(dbaccess.deleteUserSession.mock.callCount(), 1);
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1);
      assert.ok(!res.headers['Set-Cookie'])
      assert.ok(!res.data.CSRFToken)
      assert.ok(!res.data.newExpiryTime)
      assert.strictEqual(res.code, 200)
    })
  })

  describe('When testing requesting login code,', () => {

    test('if if no email, return 400', async () => {
      const req = {
        body: {}
      }
      const res = new MockResponse()
      const next = mock.fn()

      await requestLoginCode(req, res)

      assert.strictEqual(res.code, 400)
    })

    test('if email is provided and exists, it should send a login code to the user', async () => {
      // mock db query of user session with user
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dbaccess, 'getLoginCodes', async () => {
        return null
      })
      mock.method(dbaccess, 'getUsers', async () => {
        return [{
          user_id: 1,
          email: 'test@example.com'
        }]
      })
      mock.method(dbaccess, 'createLoginCode', async () => {
        return { email: 'test@example.com', code: '123456', expires_at: new Date(Date.now() + 5 * 60 * 1000) }
      })
      mock.method(emailSender, 'sendEmail', async () => {
        return true // simulate all ok
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })

      const req = {
        body: {
          email: 'test@example.com'
        }
      }
      const res = new MockResponse()
      const next = mock.fn()

      await requestLoginCode(req, res)

      assert.strictEqual(res.code, 200)
      assert.strictEqual(dbaccess.getUsers.mock.callCount(), 1)
      assert.strictEqual(dbaccess.getLoginCodes.mock.callCount(), 1)
      assert.strictEqual(dbaccess.createLoginCode.mock.callCount(), 1)
      assert.strictEqual(emailSender.sendEmail.mock.callCount(), 1)
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1)
    })

    test('if email is provided but does not exist, it should not send a login code but returns 200', async () => {
      // mock db query of user session with user
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dbaccess, 'getLoginCodes', async () => {
        return null
      })
      mock.method(dbaccess, 'getUsers', async () => {
        return []
      })
      mock.method(dbaccess, 'createLoginCode', async () => {
        return { email: 'test@example.com', code: '123456', expires_at: new Date(Date.now() + 5 * 60 * 1000) }
      })
      mock.method(emailSender, 'sendEmail', async () => {
        return true // simulate all ok
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })

      const req = {
        body: {
          email: 'test@example.com'
        }
      }
      const res = new MockResponse()
      const next = mock.fn()

      await requestLoginCode(req, res)

      assert.strictEqual(res.code, 200)
      assert.strictEqual(dbaccess.getUsers.mock.callCount(), 1)
      assert.strictEqual(dbaccess.getLoginCodes.mock.callCount(), 1)
      assert.strictEqual(dbaccess.createLoginCode.mock.callCount(), 0)
      assert.strictEqual(emailSender.sendEmail.mock.callCount(), 0)
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1)
    })

    test('if code exists, create a new one', async () => {
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      let codeCheckCount = 0
      mock.method(dbaccess, 'getLoginCodes', async () => {
        codeCheckCount++
        if (codeCheckCount === 1) {
          return [{ code: '123456' }] // simulate code already exists
        } else {
          return [] // simulate code does not exist
        }
      })
      mock.method(dbaccess, 'getUsers', async () => {
        return [{
          user_id: 1,
          email: 'test@example.com'
        }]
      })
      mock.method(dbaccess, 'createLoginCode', async () => {
        return { email: 'test@example.com', code: '123456', expires_at: new Date(Date.now() + 5 * 60 * 1000) }
      })
      mock.method(emailSender, 'sendEmail', async () => {
        return true // simulate all ok
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })

      const req = {
        body: {
          email: 'test@example.com'
        }
      }
      const res = new MockResponse()
      const next = mock.fn()

      await requestLoginCode(req, res)

      assert.strictEqual(res.code, 200)
      assert.strictEqual(dbaccess.getConnection.mock.callCount(), 2)
      assert.strictEqual(dbaccess.getUsers.mock.callCount(), 1)
      assert.strictEqual(dbaccess.getLoginCodes.mock.callCount(), 2)
      assert.strictEqual(dbaccess.createLoginCode.mock.callCount(), 1)
      assert.strictEqual(emailSender.sendEmail.mock.callCount(), 1)
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 2)
    })
  })

})
