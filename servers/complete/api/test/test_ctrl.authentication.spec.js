import assert from 'node:assert/strict'
import { describe, test, before, after, mock, afterEach } from 'node:test'
import dbaccess from '../dbaccess/dbaccess.js'
import dblogincodes from '../dbaccess/dba.logincodes.js'
import { verifyUserSession, refreshUserSession, logoutUserSession, requestLoginCode, loginWeb } from '../controllers/authenticationCtrl.js'
import { MockResponse } from './MockResponse.js'
import { emailSender } from '../services/emailSender.js'
import bcrypt from 'bcrypt'


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
          hard_expiry_at: new Date(Date.now() - 10000), // expired
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
          hard_expiry_at: new Date(Date.now() + 10000), // not expired
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
          hard_expiry_at: new Date(Date.now() + 10000), // not expired
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
      assert.ok(res.data.sessionExpiryTime)
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
      assert.ok(res.data.sessionExpiryTime)
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
      mock.method(dblogincodes, 'getLoginCodes', async () => {
        return null
      })
      mock.method(dbaccess, 'getUsers', async () => {
        return [{
          user_id: 1,
          email: 'test@example.com'
        }]
      })
      mock.method(dblogincodes, 'createLoginCode', async () => {
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
      assert.strictEqual(dblogincodes.getLoginCodes.mock.callCount(), 1)
      assert.strictEqual(dblogincodes.createLoginCode.mock.callCount(), 1)
      assert.strictEqual(emailSender.sendEmail.mock.callCount(), 1)
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1)
    })

    test('if email is provided but does not exist, it should not send a login code but returns 200', async () => {
      // mock db query of user session with user
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dblogincodes, 'getLoginCodes', async () => {
        return null
      })
      mock.method(dbaccess, 'getUsers', async () => {
        return []
      })
      mock.method(dblogincodes, 'createLoginCode', async () => {
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
      assert.strictEqual(dblogincodes.getLoginCodes.mock.callCount(), 1)
      assert.strictEqual(dblogincodes.createLoginCode.mock.callCount(), 0)
      assert.strictEqual(emailSender.sendEmail.mock.callCount(), 0)
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1)
    })

    test('if code exists, create a new one', async () => {
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      let codeCheckCount = 0
      mock.method(dblogincodes, 'getLoginCodes', async () => {
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
      mock.method(dblogincodes, 'createLoginCode', async () => {
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
      assert.strictEqual(dblogincodes.getLoginCodes.mock.callCount(), 2)
      assert.strictEqual(dblogincodes.createLoginCode.mock.callCount(), 1)
      assert.strictEqual(emailSender.sendEmail.mock.callCount(), 1)
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 2)
    })
  })

  describe('When testing web login,', () => {

    test('if email and code are not provided, return 400', async () => {
      const req = {
        body: {
        }
      }
      const res = new MockResponse()
      const next = mock.fn()

      await loginWeb(req, res)

      assert.strictEqual(res.code, 400)
    })

    test('if email and code are provided but invalid, return 401', async () => {
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dblogincodes, 'getLoginCodes', async () => {
        return [] // simulate code does not exist
      })
      mock.method(dbaccess, 'addFailedLoginAttempt', async () => {
        return null
      })
      mock.method(dblogincodes, 'deleteExpiredLoginCodes', async () => {
        return null
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })
      const req = {
        body: {
          email: 'dario@mau.se',
          code: '123456'
        }
      }
      const res = new MockResponse()

      await loginWeb(req, res)
      assert.strictEqual(res.code, 401)

      assert.strictEqual(dbaccess.getConnection.mock.callCount(), 1, 'connection is acquired')
      assert.strictEqual(dbaccess.addFailedLoginAttempt.mock.callCount(), 1, 'failed attempts are increased')
      assert.strictEqual(dblogincodes.getLoginCodes.mock.callCount(), 1, 'old codes are deleted')
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1, 'connection is released')
    })

    test('if email and code are correct but code is expired, return 401', async () => {
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dblogincodes, 'getLoginCodes', async () => {
        return [{
          email: 'dario@mau.se',
          code: '123456',
          expires_at: new Date(Date.now() - 10000) // simulate expired code
        }]
      })
      mock.method(dbaccess, 'addFailedLoginAttempt', async () => {
        return null
      })
      mock.method(dblogincodes, 'deleteExpiredLoginCodes', async () => {
        return null
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })
      const req = {
        body: {
          email: 'dario@mau.se',
          code: '123456'
        }
      }
      const res = new MockResponse()

      await loginWeb(req, res)
      assert.strictEqual(res.code, 401)

      assert.strictEqual(dbaccess.getConnection.mock.callCount(), 1, 'connection is acquired')
      assert.strictEqual(dbaccess.addFailedLoginAttempt.mock.callCount(), 1, 'failed attempts are increased')
      assert.strictEqual(dblogincodes.getLoginCodes.mock.callCount(), 1, 'old codes are deleted')
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1, 'connection is released')
    })

    test('if user is patient, return 403', async () => {
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dblogincodes, 'getLoginCodes', async () => {
        return [{
          email: 'dario@mau.se',
          code: '123456',
          expires_at: new Date(Date.now() + 10000) // code valid
        }]
      })
      mock.method(dbaccess, 'getUsers', async () => {
        return [{
          user_id: 1,
          email: 'dario@mau.se',
          role: 'patient'
        }]
      })
      mock.method(dbaccess, 'addFailedLoginAttempt', async () => {
        return null
      })
      mock.method(dblogincodes, 'deleteExpiredLoginCodes', async () => {
        return null
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })
      const req = {
        body: {
          email: 'dario@mau.se',
          code: '123456'
        }
      }
      const res = new MockResponse()

      await loginWeb(req, res)
      assert.strictEqual(res.code, 403)

      assert.strictEqual(dbaccess.getConnection.mock.callCount(), 1, 'connection is acquired')
      assert.strictEqual(dblogincodes.getLoginCodes.mock.callCount(), 1, 'login codes are fetched')
      assert.strictEqual(dbaccess.getUsers.mock.callCount(), 1, 'users are fetched')
      assert.strictEqual(dbaccess.addFailedLoginAttempt.mock.callCount(), 1, 'failed attempts are increased')
      assert.strictEqual(dblogincodes.getLoginCodes.mock.callCount(), 1, 'old codes are deleted')
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1, 'connection is released')
    })

    test('if user is clinician, it is not a known client and security question is not provided, return 400', async () => {
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dblogincodes, 'getLoginCodes', async () => {
        return [{
          email: 'dario@mau.se',
          code: '123456',
          expires_at: new Date(Date.now() + 10000) // code valid
        }]
      })
      mock.method(dbaccess, 'getUsers', async () => {
        return [{
          user_id: 1,
          email: 'dario@mau.se',
          role: 'clinician'
        }]
      })
      mock.method(dbaccess, 'addFailedLoginAttempt', async () => {
        return null
      })
      mock.method(dblogincodes, 'deleteExpiredLoginCodes', async () => {
        return null
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })
      const req = {
        body: {
          email: 'dario@mau.se',
          code: '123456'
        },
        cookies: {}
      }
      const res = new MockResponse()

      await loginWeb(req, res)
      assert.strictEqual(res.code, 400)

      assert.strictEqual(dbaccess.getConnection.mock.callCount(), 1, 'connection is acquired')
      assert.strictEqual(dblogincodes.getLoginCodes.mock.callCount(), 1, 'login codes are fetched')
      assert.strictEqual(dbaccess.getUsers.mock.callCount(), 1, 'users are fetched')
      assert.strictEqual(dbaccess.addFailedLoginAttempt.mock.callCount(), 0, 'failed attempts are NOT increased')
      assert.strictEqual(dblogincodes.getLoginCodes.mock.callCount(), 1, 'old codes are deleted')
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1, 'connection is released')
    })

    test('if security question is provided but not found, return 400', async () => {
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dblogincodes, 'getLoginCodes', async () => {
        return [{
          email: 'dario@mau.se',
          code: '123456',
          expires_at: new Date(Date.now() + 10000) // code valid
        }]
      })
      mock.method(dbaccess, 'getUsers', async () => {
        return [{
          user_id: 1,
          email: 'dario@mau.se',
          role: 'clinician'
        }]
      })
      mock.method(dbaccess, 'getUserSecurityQuestions', async () => {
        return []
      })
      mock.method(dbaccess, 'addFailedLoginAttempt', async () => {
        return null
      })
      mock.method(dblogincodes, 'deleteExpiredLoginCodes', async () => {
        return null
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })
      const req = {
        body: {
          email: 'dario@mau.se',
          code: '123456',
          securityQ_pID: '1234',
          securityA: 'Citroen',
          declare_private_client: false
        },
        cookies: {
        }
      }
      const res = new MockResponse()

      await loginWeb(req, res)
      assert.strictEqual(res.code, 400)

      assert.strictEqual(dbaccess.getConnection.mock.callCount(), 1, 'connection is acquired')
      assert.strictEqual(dblogincodes.getLoginCodes.mock.callCount(), 1, 'login codes are fetched')
      assert.strictEqual(dbaccess.getUsers.mock.callCount(), 1, 'users are fetched')
      assert.strictEqual(dbaccess.getUserSecurityQuestions.mock.callCount(), 1, 'security questions are fetched')
      assert.strictEqual(dbaccess.addFailedLoginAttempt.mock.callCount(), 1, 'failed attempts are increased')
      assert.strictEqual(dblogincodes.getLoginCodes.mock.callCount(), 1, 'old codes are deleted')
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1, 'connection is released')
    })

    test('if security question is found but answer is wrong, return 400', async () => {
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dblogincodes, 'getLoginCodes', async () => {
        return [{
          email: 'dario@mau.se',
          code: '123456',
          expires_at: new Date(Date.now() + 10000) // code valid
        }]
      })
      mock.method(dbaccess, 'getUsers', async () => {
        return [{
          user_id: 1,
          email: 'dario@mau.se',
          role: 'clinician'
        }]
      })
      mock.method(dbaccess, 'getUserSecurityQuestions', async () => {
        return [{
          id: '777',
          p_id: '1234',
          user_id: 1,
          question: 'What is the make of your first car?',
          answer_hash: 'aaabbbxxx'
        }]
      })
      mock.method(bcrypt, 'hash', async () => {
        return null
      })
      mock.method(bcrypt, 'compare', async () => {
        return false
      })
      mock.method(dbaccess, 'addFailedLoginAttempt', async () => {
        return null
      })
      mock.method(dblogincodes, 'deleteExpiredLoginCodes', async () => {
        return null
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })
      const req = {
        body: {
          email: 'dario@mau.se',
          code: '123456',
          securityQ_pID: '1234',
          securityA: 'Citroen',
          declare_private_client: false
        },
        cookies: {
        }
      }
      const res = new MockResponse()

      await loginWeb(req, res)
      assert.strictEqual(res.code, 400)

      assert.strictEqual(dbaccess.getConnection.mock.callCount(), 1, 'connection is acquired')
      assert.strictEqual(dblogincodes.getLoginCodes.mock.callCount(), 1, 'login codes are fetched')
      assert.strictEqual(dbaccess.getUsers.mock.callCount(), 1, 'users are fetched')
      assert.strictEqual(dbaccess.getUserSecurityQuestions.mock.callCount(), 1, 'security questions are fetched')
      assert.strictEqual(bcrypt.hash.mock.callCount(), 1, 'answer is hashed')
      assert.strictEqual(bcrypt.compare.mock.callCount(), 1, 'hash is compared')
      assert.strictEqual(dbaccess.addFailedLoginAttempt.mock.callCount(), 1, 'failed attempts are increased')
      assert.strictEqual(dblogincodes.getLoginCodes.mock.callCount(), 1, 'old codes are deleted')
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1, 'connection is released')
    })

    test('if client is not known, not a private client, security answer is OK, return 200 and set hard expiry', async () => {
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dblogincodes, 'getLoginCodes', async () => {
        return [{
          email: 'dario@mau.se',
          code: '123456',
          expires_at: new Date(Date.now() + 10000) // code valid
        }]
      })
      mock.method(dbaccess, 'getUsers', async () => {
        return [{
          user_id: 1,
          email: 'dario@mau.se',
          role: 'clinician'
        }]
      })
      mock.method(dbaccess, 'getUserSecurityQuestions', async () => {
        return [{
          id: '777',
          p_id: '1234',
          user_id: 1,
          question: 'What is the make of your first car?',
          answer_hash: 'aaabbbxxx',
          declare_private_client: false
        }]
      })
      mock.method(bcrypt, 'hash', async () => {
        return 'aaabbbxxx'
      })
      mock.method(bcrypt, 'compare', async () => {
        return true
      })
      let session = {}
      mock.method(dbaccess, 'createUserSession', async (client, us) => {
        session = us
        return us
      })
      mock.method(dbaccess, 'addFailedLoginAttempt', async () => {
        return null
      })
      mock.method(dblogincodes, 'deleteExpiredLoginCodes', async () => {
        return null
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })
      const req = {
        body: {
          email: 'dario@mau.se',
          code: '123456',
          securityQ_pID: '1234',
          securityA: 'Citroen',
          declare_private_client: false
        },
        cookies: {
        }
      }
      const res = new MockResponse()

      await loginWeb(req, res)
      assert.strictEqual(res.code, 200)

      assert.strictEqual(dbaccess.getConnection.mock.callCount(), 1, 'connection is acquired')
      assert.strictEqual(dblogincodes.getLoginCodes.mock.callCount(), 1, 'login codes are fetched')
      assert.strictEqual(dbaccess.getUsers.mock.callCount(), 1, 'users are fetched')
      assert.strictEqual(dbaccess.getUserSecurityQuestions.mock.callCount(), 1, 'security questions are fetched')
      assert.strictEqual(bcrypt.hash.mock.callCount(), 1, 'answer is hashed')
      assert.strictEqual(bcrypt.compare.mock.callCount(), 1, 'hash is compared')
      assert.ok(res.cookies['__Host-session'], 'session cookie is set')
      assert.ok(res.data.CSRFToken, 'csrf token is sent')
      assert.ok(res.data.sessionExpiryTime, 'session expire is sent')
      assert.ok(!res.cookies['__Host-Http-device-id'], 'device id cookie is not set')
      assert.ok(!session.publicClientHardExpiryTime, 'hard expiry is not set')
      assert.strictEqual(dbaccess.createUserSession.mock.callCount(), 1, 'user session is created')
      assert.strictEqual(dbaccess.addFailedLoginAttempt.mock.callCount(), 0, 'failed attempts are NOT increased')
      assert.strictEqual(dblogincodes.deleteExpiredLoginCodes.mock.callCount(), 1, 'old codes are deleted')
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1, 'connection is released')
    })


    test('if client is not known, but a new private client, security answer is OK, return 200 and register device id', async () => {
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dblogincodes, 'getLoginCodes', async () => {
        return [{
          email: 'dario@mau.se',
          code: '123456',
          expires_at: new Date(Date.now() + 10000) // code valid
        }]
      })
      mock.method(dbaccess, 'getUsers', async () => {
        return [{
          user_id: 1,
          email: 'dario@mau.se',
          role: 'clinician'
        }]
      })
      mock.method(dbaccess, 'getUserSecurityQuestions', async () => {
        return [{
          id: '777',
          p_id: '1234',
          user_id: 1,
          question: 'What is the make of your first car?',
          answer_hash: 'aaabbbxxx'
        }]
      })
      mock.method(bcrypt, 'hash', async () => {
        return 'aaabbbxxx'
      })
      mock.method(bcrypt, 'compare', async () => {
        return true
      })
      mock.method(dbaccess, 'createDeviceId', async () => {
        return null
      })
      let session = {}
      mock.method(dbaccess, 'createUserSession', async (client, us) => {
        session = us
        return us
      })
      mock.method(dbaccess, 'addFailedLoginAttempt', async () => {
        return null
      })
      mock.method(dblogincodes, 'deleteExpiredLoginCodes', async () => {
        return null
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })
      const req = {
        body: {
          email: 'dario@mau.se',
          code: '123456',
          securityQ_pID: '1234',
          securityA: 'Citroen',
          declare_private_client: true
        },
        cookies: {
        }
      }
      const res = new MockResponse()

      await loginWeb(req, res)
      assert.strictEqual(res.code, 200)

      assert.strictEqual(dbaccess.getConnection.mock.callCount(), 1, 'connection is acquired')
      assert.strictEqual(dblogincodes.getLoginCodes.mock.callCount(), 1, 'login codes are fetched')
      assert.strictEqual(dbaccess.getUsers.mock.callCount(), 1, 'users are fetched')
      assert.strictEqual(dbaccess.getUserSecurityQuestions.mock.callCount(), 1, 'security questions are fetched')
      assert.strictEqual(bcrypt.hash.mock.callCount(), 1, 'answer is hashed')
      assert.strictEqual(bcrypt.compare.mock.callCount(), 1, 'hash is compared')
      assert.strictEqual(dbaccess.createDeviceId.mock.callCount(), 1, 'device id is registered on the db')
      assert.ok(res.cookies['__Host-session'], 'session cookie is set')
      assert.ok(res.data.CSRFToken, 'csrf token is sent')
      assert.ok(res.data.sessionExpiryTime, 'session expire is sent')
      assert.ok(res.cookies['__Host-Http-device-id'], 'device id cookie is set')
      assert.ok(!session.publicClientHardExpiryTime, 'hard expiry is NOT set')
      assert.strictEqual(dbaccess.createUserSession.mock.callCount(), 1, 'user session is created')
      assert.strictEqual(dbaccess.addFailedLoginAttempt.mock.callCount(), 0, 'failed attempts are NOT increased')
      assert.strictEqual(dblogincodes.getLoginCodes.mock.callCount(), 1, 'old codes are deleted')
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1, 'connection is released')
    })

    test('if client is known and device id is not recognised, return 401', async () => {
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dblogincodes, 'getLoginCodes', async () => {
        return [{
          email: 'dario@mau.se',
          code: '123456',
          expires_at: new Date(Date.now() + 10000) // code valid
        }]
      })
      mock.method(dbaccess, 'getUsers', async () => {
        return [{
          user_id: 1,
          email: 'dario@mau.se',
          role: 'clinician'
        }]
      })
      mock.method(dbaccess, 'getDeviceIds', async () => {
        return []
      })
      let session = {}
      mock.method(dbaccess, 'createUserSession', async (client, us) => {
        session = us
        return us
      })
      mock.method(dbaccess, 'addFailedLoginAttempt', async () => {
        return null
      })
      mock.method(dblogincodes, 'deleteExpiredLoginCodes', async () => {
        return null
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })
      const req = {
        body: {
          email: 'dario@mau.se',
          code: '123456'
        },
        cookies: {
          '__Host-Http-device-id': '1234-1234-1234-1234'
        }
      }
      const res = new MockResponse()

      await loginWeb(req, res)
      assert.strictEqual(res.code, 401)

      assert.strictEqual(dbaccess.getConnection.mock.callCount(), 1, 'connection is acquired')
      assert.strictEqual(dblogincodes.getLoginCodes.mock.callCount(), 1, 'login codes are fetched')
      assert.strictEqual(dbaccess.getUsers.mock.callCount(), 1, 'users are fetched')
      assert.strictEqual(dbaccess.getDeviceIds.mock.callCount(), 1, 'device id is fetched')
      assert.ok(!res.cookies['__Host-session'], 'session cookie is NOT set')
      assert.ok(!res.data.CSRFToken, 'csrf token is NOT sent')
      assert.ok(!res.cookies['__Host-Http-device-id'], 'device id cookie is set')
      assert.strictEqual(dbaccess.createUserSession.mock.callCount(), 0, 'user session is NOT created')
      assert.strictEqual(dbaccess.addFailedLoginAttempt.mock.callCount(), 1, 'failed attempts are increased')
      assert.strictEqual(dblogincodes.getLoginCodes.mock.callCount(), 1, 'old codes are deleted')
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1, 'connection is released')
    })

    test('if client is known and device id is recognised, return 200 and update device id', async () => {
      mock.method(dbaccess, 'getConnection', async () => {
        return null
      })
      mock.method(dblogincodes, 'getLoginCodes', async () => {
        return [{
          email: 'dario@mau.se',
          code: '123456',
          expires_at: new Date(Date.now() + 10000) // code valid
        }]
      })
      mock.method(dbaccess, 'getUsers', async () => {
        return [{
          user_id: 1,
          email: 'dario@mau.se',
          role: 'clinician'
        }]
      })
      mock.method(dbaccess, 'getDeviceIds', async () => {
        return [{
          id: 99,
          p_id: '1234-1234-1234-1234',
          user_id: 1
        }]
      })
      mock.method(dbaccess, 'updateDeviceId', async () => {
        return []
      })
      let session = {}
      mock.method(dbaccess, 'createUserSession', async (client, us) => {
        session = us
        return us
      })
      mock.method(dbaccess, 'addFailedLoginAttempt', async () => {
        return null
      })
      mock.method(dblogincodes, 'deleteExpiredLoginCodes', async () => {
        return null
      })
      mock.method(dbaccess, 'releaseConnection', async () => {
        return true // simulate all ok
      })
      const req = {
        body: {
          email: 'dario@mau.se',
          code: '123456'
        },
        cookies: {
          '__Host-Http-device-id': '1234-1234-1234-1234'
        }
      }
      const res = new MockResponse()

      await loginWeb(req, res)
      assert.strictEqual(res.code, 200)

      assert.strictEqual(dbaccess.getConnection.mock.callCount(), 1, 'connection is acquired')
      assert.strictEqual(dblogincodes.getLoginCodes.mock.callCount(), 1, 'login codes are fetched')
      assert.strictEqual(dbaccess.getUsers.mock.callCount(), 1, 'users are fetched')
      assert.strictEqual(dbaccess.getDeviceIds.mock.callCount(), 1, 'device id is fetched')
      assert.strictEqual(dbaccess.updateDeviceId.mock.callCount(), 1, 'device id is updated')
      assert.ok(res.cookies['__Host-session'], 'session cookie is set')
      assert.ok(res.data.CSRFToken, 'csrf token is sent')
      assert.strictEqual(dbaccess.createUserSession.mock.callCount(), 1, 'user session is created')
      assert.strictEqual(dbaccess.addFailedLoginAttempt.mock.callCount(), 0, 'failed attempts are NOT increased')
      assert.strictEqual(dblogincodes.getLoginCodes.mock.callCount(), 1, 'old codes are deleted')
      assert.strictEqual(dbaccess.releaseConnection.mock.callCount(), 1, 'connection is released')
    })
  })

})

