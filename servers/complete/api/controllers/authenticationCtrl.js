/**
 * Authentication controller for handling user login and code requests.
 *
 */

import logger from '../services/logger.js'
import dbaccess from '../dbaccess/dbaccess.js'


const WEB_CLIENT_SESSION_EXPIRY_MINUTES = process.env.WEB_CLIENT_SESSION_EXPIRY_MINUTES || 15
const WEB_PUBLIC_CLIENT_SESSION_HARD_EXPIRY_MINUTES = process.env.WEB_PUBLIC_CLIENT_SESSION_HARD_EXPIRY_MINUTES || 60 * 12
const MOBILE_CLIENT_SESSION_EXPIRY_MINUTES = process.env.MOBILE_CLIENT_SESSION_EXPIRY_MINUTES || 60 * 24 * 30 // 1 month

const MAX_FAILED_LOGIN_ATTEMPTS = process.env.MAX_FAILED_LOGIN_ATTEMPTS || 5

const SESSION_COOKIE_NAME = '__Host-session'
const CSRF_HEADER_NAME = 'X-CSRF-Token'

/**
 * Every this amount, expired sessions are cleared
 */
const CLEAN_EXPIRED_SESSIONS_PERIOD_MINS = 10
let last_expired_sessions_cleanup_ms = Date.now()


/**
 * Authenticaiton middleware based on stored sessions. At every API call it checks:
 * 1. that a valid session ID is present (either as cookie or header)
 * 2. that a valid CSRF token is also present (this is always sent as header, and only by web clients)
 * 3. that the session has not expired (also hard expiration on web clients)
 * It will also delete expired sessions from the database perioducally
 * @param {Object} req - request object
 * @param {Object} res - response object
 * @param {Object} next - callback for next processing
 * @returns
 */
export const verifyUserSession = async (req, res, next) => {
  // user sessions are stored either as a cookie or in the Authorization header as a Bearer token

  let sessionToken, csrfToken, isWebClient
  if (req.cookies[SESSION_COOKIE_NAME]) {
    // it's a web client
    isWebClient = true
    sessionToken = req.cookies[SESSION_COOKIE_NAME]

    // also extract CSFR token from the request headers for web clients
    let csrfToken = req.headers[CSRF_HEADER_NAME]

    if (!sessionToken || !csrfToken) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    // it's a mobile client
    isWebClient = false
    sessionToken = req.headers.authorization.split(' ')[1]
    if (!sessionToken) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  } else {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  let dbclient = await dbaccess.getConnection()

  // clean up expired sessions if enough time has passed
  if (Date.now() - last_expired_sessions_cleanup_ms > (CLEAN_EXPIRED_SESSIONS_PERIOD_MINS * 60 * 1000)) {
    dbaccess.deleteExpiredUserSessions()
    last_expired_sessions_cleanup_ms = Date.now()
  }

  // verify session token, CSRF token (if present) and expiration date
  // TODO: consider adding a cache layer for session validation to reduce database load
  let userSessions = await dbaccess.getUserSessionsWithUser(dbclient,
    { session_id: sessionToken, csrf_code: csrfToken, max_expiry_time: new Date() })
  if (!userSessions || userSessions.length != 1) {
    return res.status(401).json({ error: 'Unauthorized' })
  } else {

    let userSession = userSessions[0]

    // additional check against hard expiry for public clients
    if (userSession.is_public_client && userSession.public_client_hard_expiry_at && userSession.public_client_hard_expiry_at < new Date()) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // attach the user session to the request object for downstream handlers
    req.userSession = {
      user_id: userSession.user_id,
      userType: userSession.user.role,
      isWebClient
    }
    next()
  }

  return res.status(401).json({ error: 'Unauthorized' })
}

// export const refreshSession = async (req, res) => { }
