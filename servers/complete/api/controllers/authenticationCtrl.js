/**
 * Authentication controller for handling user login and code requests.
 *
 */

import logger from '../services/logger.js'
import dbaccess from '../dbaccess/dbaccess.js'
import { emailSender } from '../services/emailSender.js'
import { randomBytes } from 'node:crypto'

const LOGIN_CODE_EXPIRY_MINUTES = process.env.LOGIN_CODE_EXPIRY_MINUTES || 5

const WEB_CLIENT_SESSION_EXPIRY_MINUTES = process.env.WEB_CLIENT_SESSION_EXPIRY_MINUTES || 15
const WEB_PUBLIC_CLIENT_SESSION_HARD_EXPIRY_MINUTES = process.env.WEB_PUBLIC_CLIENT_SESSION_HARD_EXPIRY_MINUTES || 60 * 12
const MOBILE_CLIENT_SESSION_EXPIRY_MINUTES = process.env.MOBILE_CLIENT_SESSION_EXPIRY_MINUTES || 60 * 24 * 30 // 1 month

const MAX_FAILED_LOGIN_ATTEMPTS = process.env.MAX_FAILED_LOGIN_ATTEMPTS || 5

const SESSION_COOKIE_NAME = '__Host-session'
const CSRF_HEADER_NAME = 'X-CSRF-Token'
const SESSION_TOKEN_SIZE_BYTES = process.env.SESSION_TOKEN_SIZE_BYTES || 32
const CSRF_TOKEN_SIZE_BYTES = process.env.CSFR_TOKEN_SIZE_BYTES || 32

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

  dbaccess.releaseConnection(dbclient) // release the connection now that it is not needed anymore

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
      session_id: userSession.session_id,
      user_id: userSession.user_id,
      userType: userSession.user.role,
      isWebClient
    }
    next()
  }

  return res.status(401).json({ error: 'Unauthorized' })
}

/**
 * Just a wrapper to generate random bytes
 */
const generateRandomString = (nBytes) => {
  return randomBytes(nBytes).toString('hex')
}

/**
 * Generates a random number with the specified number of digits.
 * Padded with zeros if necessary to ensure the correct length.
 * @param {number} nDigits - number of digits required
 * @returns {string} - a random number with the specified number of digits, as a string
 */
const generateRandomCode = (nDigits) => {
  let max = Math.pow(10, nDigits) - 1
  return Math.floor(Math.random() * max).toString().padStart(nDigits, '0')
}

/**
 * Used to refresh the session token on the database.
 * This generates a new session token and a new CSRF token.
 * Session token is renewed as cookie on web, or sent in API call on app, CSRF token is always sent in API call.
 * Tokens and expiry timestamps are also refreshed on the database.
 *
 * This API call shall be called only in a secure context.
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
export const refreshUserSession = async (req, res) => {
  if (!req.userSession) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  // generate new session token
  let sessionToken = generateRandomString(SESSION_TOKEN_SIZE_BYTES)

  // generate new CSRF token
  let CSRFToken = generateRandomString(CSRF_TOKEN_SIZE_BYTES)

  // update the session on the database
  let dbclient = await dbaccess.getConnection()

  let newExpiryTime = new Date(Date.now() + (req.userSession.isWebClient ? WEB_CLIENT_SESSION_EXPIRY_MINUTES : MOBILE_CLIENT_SESSION_EXPIRY_MINUTES) * 60 * 1000)

  let updatedSession = await dbaccess.updateUserSession(dbclient, req.userSession.session_id, {
    session_id: sessionToken,
    csrf_code: CSRFToken,
    expires_at: newExpiryTime
  })

  await dbaccess.releaseConnection(dbclient) // release the connection now that it is not needed anymore

  if (req.userSession.isWebClient) {
    // set the cookie
    res
      .cookie(SESSION_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        path: '/',
      })
      .status(200)
      // send the CSRF token in the reply
      .json({
        newExpiryTime,
        CSRFToken
      })
  } else {
    // if app, send everything in the reply
    res
      .status(200)
      .json({
        newExpiryTime,
        sessionToken
      })
  }
}

/**
 * Logs out the user and deletes their session from the database.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Object} The response object.
 */
export const logoutUserSession = async (req, res) => {
  if (!req.userSession) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  let dbclient = await dbaccess.getConnection()

  let deleted = await dbaccess.deleteUserSession(dbclient, req.userSession.session_id)

  await dbaccess.releaseConnection(dbclient) // release the connection now that it is not needed anymore

  if (deleted) {
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' }).status(200).json({ message: 'Logged out successfully' })
  } else {
    res.status(500).json({ error: 'Failed to log out' })
  }
}

/**
 * Requests a login code for the given email. If the email exists in the database, a login code is generated and sent to the user's email.
 * The login code is stored in the database with an expiration time.
 * If the email does not exist, a 200 response is still sent to avoid revealing whether the email exists in the system.
 * @param {Object} req - request obect
 * @param {Object} res - express response object
 * @returns {Promise} - a promise that resolves to the response object
 */
export const requestLoginCode = async (req, res) => {
  const { email } = req.body

  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }

  logger.info(`Login code requested for ${email}`)


  let codeAvailable = false

  while (!codeAvailable) {
    let code = generateRandomCode(6) // generate a 6-digit code

    let dbclient = await dbaccess.getConnection()
    try {
      // Check if the code is already in use
      let existingCode = await dbaccess.getLoginCodes(dbclient, { code: code })
      if (existingCode && existingCode.length > 0) {
        codeAvailable = false
        continue // generate a new code
      } else {
        codeAvailable = true
      }

      // Check if the user exists
      let user = await dbaccess.getUsers(dbclient, { email: email })
      if (user && user.length > 0) {

        // Store the code in the database with an expiration time (e.g., 5 minutes)
        let expiresAt = new Date(Date.now() + LOGIN_CODE_EXPIRY_MINUTES * 60 * 1000)
        await dbaccess.createLoginCode(dbclient, { email: email, code: code, expires_at: expiresAt })

        // Here you send the code to the user's email
        await emailSender.sendEmail(email, 'Your Login Code', `Your login code is: ${code}. It will expire in ${LOGIN_CODE_EXPIRY_MINUTES} minutes.`)

        logger.info(`Login code sent to ${email}: ${code}`)

        return res.status(200)
      } else {
        logger.warn(`Login code requested for non-existent email: ${email}`)
        // always send a 200 response to avoid revealing whether the email exists in the system
        return res.status(200)
      }

    } catch (error) {
      logger.error('Error requesting login code:', error)
      return res.status(500).json({ error: 'Internal server error' })
    } finally {
      await dbaccess.releaseConnection(dbclient)
    }
  }
}
