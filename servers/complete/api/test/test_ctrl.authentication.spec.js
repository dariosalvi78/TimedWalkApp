import assert from 'node:assert/strict'
import { describe, test, before, after, mock } from 'node:test'
import dbaccess from '../dbaccess/dbaccess.js'
import { verifyUserSession } from '../controllers/authenticationCtrl.js'
import { MockResponse } from './MockResponse.js'


describe('When testing the authentication controller,', () => {

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
    })
  })


})
