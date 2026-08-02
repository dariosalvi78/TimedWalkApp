/**
 * This module provides a data access layer for the Timed Walk backend.
 */


/**
 * Import types from the datamodels.
 * @typedef {import("../../../../datamodel/types.js").User} User
 * @typedef {import("../../../../datamodel/types.js").LoginCode} LoginCode
 * @typedef {import("../../../../datamodel/types.js").Clinician} Clinician
 * @typedef {import("../../../../datamodel/types.js").Team} Team
 * @typedef {import("../../../../datamodel/types.js").ClinicianTeam} ClinicianTeam
 * @typedef {import("../../../../datamodel/types.js").TeamInvitation} TeamInvitation
 * @typedef {import("../../../../datamodel/types.js").Patient} Patient
 * @typedef {import("../../../../datamodel/types.js").UserSession} UserSession
 * @typedef {import("../../../../datamodel/types.js").UserDeviceId} UserDeviceId
 */

import logger from '../services/logger.js'


import { Pool } from 'pg'
const pool = new Pool()

// connection settings are read from standard environment variables
// see https://node-postgres.com/features/connecting

// the pool will emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pool.on('error', (err) => {
  logger.error(err, 'Unexpected error on idle client')
  process.exit(-1)
})



/**
 * Gets a connection from the pool.
 * The connection is wrapped and will log an error message if it is not released after 5 seconds.
 * @param {boolean} withTransaction - if true, a transaction will be started on the connection
 * @returns {Promise<Object>} - a promise that resolves to a client
 */
async function getConnection (withTransaction = false) {
  const client = await pool.connect()
  if (withTransaction) {
    logger.debug('Beginning transaction')
    await client.query('BEGIN')
  }

  let c = {
    hasTransaction: withTransaction,
    client: client,
    lastQuery: null,
    timeout: null,
    query (text, params) {
      logger.debug('Querying', text)
      this.lastQuery = text
      return this.client.query(text, params)
    },
    release () {
      clearTimeout(this.timeout)
      this.client.release()
    },
  }
  c.timeout = setTimeout(() => {
    console.error('CLIENT BLOCKING!', JSON.stringify(c.lastQuery))
    logger.error(c.lastQuery, 'A client has been checked out for more than 5 seconds!')
    this.release()
  }, 5000)

  return c
}

/**
 * Releases a connection back to the pool.
 * If a transaction was started, it will be committed first.
 * @param {Object} client - the client to release
 * @param {boolean} withTransaction - if true, a transaction will be committed before releasing the client
 */
async function releaseConnection (client) {
  if (!client) {
    logger.error('Tried to release a null client')
    return
  }
  if (client.hasTransaction) {
    logger.debug('Ending transaction')
    await client.query('COMMIT')
  }
  client.release()
}

/**
 * Aborts a transaction on the client.
 * @param {Object} client - the client to abort the transaction on
 */
async function abortConnection (client) {
  if (!client) {
    logger.error('Tried to abort a null client')
    return
  }
  if (client.hasTransaction) {
    logger.debug('Rolling back transaction')
    await client.query('ROLLBACK')
  }
  client.release()
}

/**
 * Fetches login codes from the database.
 * @param {Object} connection - the database connection
 * @param {Object} queryParams - query parameters, contains email and code for lookup
 * @returns {Promise<Array<LoginCode>>} - a promise that resolves to an array of login codes
 */
async function getLoginCodes (connection, queryParams = null) {
  const query = {
    text: 'SELECT * FROM "login_codes"',
    values: [],
  }

  if (queryParams && queryParams.code) {
    query.text += ' WHERE code = $1'
    query.values.push(queryParams.code)
    if (queryParams.email) {
      query.text += ' AND email = $2'
      query.values.push(queryParams.email)
    }
  }

  let res = await connection.query(query)
  return res.rows
}

/**
 * Creates a login code.
 * @param {Object} connection - the database connection
 * @param {LoginCode} loginCode - the logincode to be added
 */
async function createLoginCode (connection, loginCode) {
  const query = {
    text:
      'INSERT INTO "login_codes" (email, code, expires_at, created_at) ' +
      'VALUES ($1, $2, $3, NOW()) RETURNING *',
    values: [loginCode.email, loginCode.code, loginCode.expires_at],
  }
  let res = await connection.query(query)
  return res.rows[0]
}

/**
 * Deletes a single login code from the database.
 * @param {string} code - the login code to be deleted
 * @returns {Promise<boolean>} - a promise that resolves to true if the delete was successful
 * @param {Object} connection - the connection to the database
 * @returns {Promise<boolean>} - a promise that resolves to true if the delete was successful
 */
async function deleteLoginCode (connection, email, code) {
  const query = {
    text: 'DELETE FROM "login_codes" WHERE email = $1 AND code = $2',
    values: [email, code],
  }
  let res = await connection.query(query)
  return res.rowCount > 0
}

/**
 * Deletes expired login codes from the database.
 * @param {Object} connection - connection to the database
 * @param {Date} now - date of now, optional, used for testing
 */
async function deleteExpiredLoginCodes (connection, now) {
  const query = {
    text: 'DELETE FROM "login_codes" WHERE expires_at < $1',
    values: [now || new Date()],
  }
  let res = await connection.query(query)
  return res.rowCount
}


/**
 * Find users by id or email.
 * If no id or email is provided, all users are returned.
 * @param {Object} connection - the database connection
 * @param {Object} queryParams - query parameters, contains id or email
 * @returns {Promise<Array<User>>} - a promise that resolves to an array of users
 */
async function getUsers (connection, queryParams = null) {
  const query = {
    text: 'SELECT * FROM "users"',
    values: [],
  }

  if (queryParams && queryParams.id) {
    query.text += ' WHERE id = $1'
    query.values.push(queryParams.id)
  } else if (queryParams && queryParams.email) {
    query.text += ' WHERE email = $1'
    query.values.push(queryParams.email)
  }

  let res = await connection.query(query)
  return res.rows
}

/**
 * Increments the failed login attempts for a user by email.
 * @param {Object} connection - connection object
 * @param {string} email - email of the user to increment failed login attempts for
 * @returns {Promise<User>} - a promise that resolves to the updated user
 */
async function addFailedLoginAttempt (connection, email) {
  const query = {
    text: 'UPDATE "users" SET failed_login_attempts = failed_login_attempts + 1 WHERE email = $1 RETURNING *',
    values: [email],
  }
  let res = await connection.query(query)
  return res.rows[0]
}

/**
 * Creates a new user in the database.
 * @param {Client} connection - the database connection
 * @param {User} user - the user to create
 * @returns {Promise<User>} - a promise that resolves to the created user
 */
async function createUser (connection, user) {
  const query = {
    text:
      'INSERT INTO "users" (role, email, created_at, last_login_at) ' +
      'VALUES ($1, $2, NOW(), NOW()) RETURNING *',
    values: [user.role, user.email],
  }
  let res = await connection.query(query)
  return res.rows[0]
}

/**
 * Deletes a user in the database.
 * @param {Client} connection - the database connection
 * @param {string} p_id - public id of the user to be deleted
 * @param {string} email - email of the user to be deleted
 * @returns {Promise<boolean>} - a promise that resolves to true if the delete was successful
 */
async function deleteUser (connection, p_id = null, email = null) {
  const query = {
    text: '',
    values: [],
  }
  if (p_id) {
    query.text += 'DELETE FROM "users" WHERE p_id = $1'
    query.values.push(p_id)
  } else if (email) {
    query.text += 'DELETE FROM "users" WHERE email = $1'
    query.values.push(email)
  } else {
    return false
  }

  let res = await connection.query(query)
  return res.rowCount > 0
}

/**
 * Creates a new user security question in the database.
 * @param {Object} connection - database connection
 * @param {UserSecurityQuestion} question - the security question to be created
 * @returns {Promise<UserSecurityQuestion>} - a promise that resolves to the created security question
 */
async function createUserSecurityQuestion (connection, question) {
  const query = {
    text:
      'INSERT INTO "user_security_questions" (user_id, question, answer_hash) ' +
      'VALUES ($1, $2, $3) RETURNING *',
    values: [question.user_id, question.question, question.answer_hash],
  }
  let res = await connection.query(query)
  return res.rows[0]
}

/**
 * Retrieves user security questions from the database.
 * @param {Object} connection - database connection
 * @param {Object} queryParams - query parameters, can include public id (p_id) or user_id to filter the results
 * @returns {Promise<Array<UserSecurityQuestion>>} - a promise that resolves to an array of user security questions
 */
async function getUserSecurityQuestions (connection, queryParams = null) {
  const query = {
    text: 'SELECT * FROM "user_security_questions"',
    values: [],
  }

  if (queryParams && queryParams.p_id) {
    query.text += ' WHERE p_id = $1'
    query.values.push(queryParams.p_id)
  } else if (queryParams && queryParams.user_id) {
    query.text += ' WHERE user_id = $1'
    query.values.push(queryParams.user_id)
  }
  let res = await connection.query(query)
  return res.rows
}

/**
 * Deletes a user security question from the database.
 * @param {Object} connection - database connection
 * @param {string} queryParams - query parameters, can include id, p_id or user_id to identify the security question to delete
 * @returns {Promise<boolean>} - a promise that resolves to true if the delete was successful
 */
async function deleteUserSecurityQuestion (connection, queryParams = null) {
  const query = {
    text: 'DELETE FROM "user_security_questions"',
    values: [],
  }

  if (queryParams && queryParams.id) {
    query.text += ' WHERE id = $1'
    query.values.push(queryParams.id)
  } else if (queryParams && queryParams.p_id) {
    query.text += ' WHERE p_id = $1'
    query.values.push(queryParams.p_id)
  } else if (queryParams && queryParams.user_id) {
    query.text += ' WHERE user_id = $1'
    query.values.push(queryParams.user_id)
  } else {
    throw new Error('No valid query parameters provided for deleting user security question')
  }

  let res = await connection.query(query)
  return res.rowCount > 0
}

/**
 * Retrieves user sessions from the database.
 * @param {Object} connection - database connection
 * @param {Object} queryParams - query parameters, contains session_id and (optional) csrf_code and max_expiry_time as date
 * @returns {Promise<Array<UserSession>>} - a promise that resolves to an array of user sessions
 */
async function getUserSessions (connection, queryParams = null) {
  const query = {
    text: 'SELECT * FROM "user_sessions"',
    values: [],
  }

  if (queryParams && queryParams.session_id) {
    query.text += ' WHERE session_id = $1'
    query.values.push(queryParams.session_id)

    if (queryParams.csrf_code) {
      query.text += ' AND csrf_code = $2'
      query.values.push(queryParams.csrf_code)
    }
  }

  if (queryParams && queryParams.max_expiry_time) {
    query.text += query.text.includes('WHERE') ? ' AND expires_at > $3' : ' WHERE expires_at > $3'
    query.values.push(queryParams.max_expiry_time)
  }

  let res = await connection.query(query)
  return res.rows
}


/**
 * Retrieves user sessions with associated user information from the database.
 * @param {Object} connection - database connection
 * @param {Object} queryParams - query parameters, contains session_id and (optional) csrf_code and max_expiry_time as date
 * @returns {Promise<Array<UserSessionWithUser>>} - a promise that resolves to an array of user sessions with associated user information
 */
async function getUserSessionsWithUser (connection, queryParams = null) {
  const query = {
    text: 'SELECT * FROM "user_sessions" JOIN "users" ON "user_sessions".user_id = "users".id',
    values: [],
  }

  if (queryParams && queryParams.session_id) {
    query.text += ' WHERE session_id = $1'
    query.values.push(queryParams.session_id)

    if (queryParams.csrf_code) {
      query.text += ' AND csrf_code = $2'
      query.values.push(queryParams.csrf_code)
    }
  }

  if (queryParams && queryParams.max_expiry_time) {
    query.text += query.text.includes('WHERE') ? ' AND expires_at > $3' : ' WHERE expires_at > $3'
    query.values.push(queryParams.max_expiry_time)
  }

  let res = await connection.query(query)
  return res.rows
}

/**
 * Creates a new user session in the database.
 * @param {Object} connection - database connection
 * @param {UserSession} session - the user session to create
 * @returns {Promise<UserSession>} - a promise that resolves to the created user session
 */
async function createUserSession (connection, session) {
  const query = {
    text:
      'INSERT INTO "user_sessions" (session_id, user_id, csfr_code, expires_at, created_at) ' +
      'VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
    values: [session.session_id, session.user_id, session.csfr_code, session.expires_at],
  }
  let res = await connection.query(query)
  return res.rows[0]
}

/**
 * Updates a single user session in the database.
 * @param {Object} connection - database connection
 * @param {string} session_id - unique session id
 * @param {Object} updateParams - key value
 * @returns {Promise<UserSession>} - a promise that resolves to the updated user session
 */
async function updateUserSession (connection, session_id, updateParams) {
  const allowedParams = ['session_id', 'user_id', 'csfr_code', 'expires_at', 'created_at']

  const query = {
    text:
      'UPDATE "user_sessions" SET ',
    values: []
  }

  for (let param of Object.keys(updateParams)) {
    if (allowedParams.includes(param)) {
      query.text += `${param} = $${query.values.length + 1}, `
      query.values.push(updateParams[param])
    }
  }

  if (query.values.length === 0) {
    return null
  }

  query.text = query.text.slice(0, -2) // Remove trailing comma and space
  query.text += ' WHERE session_id = $' + (query.values.length + 1)
  query.values.push(session_id)
  query.text += ' RETURNING *'
  let res = await connection.query(query)
  return res.rows[0]
}

/**
 * Deletes a user session from the database.
 * @param {Object} connection - database connection
 * @param {string} session_id - unique session id
 * @returns {Promise<boolean>} - a promise that resolves to true if the delete was successful
 */
const deleteUserSession = async (connection, session_id) => {
  const query = {
    text: 'DELETE FROM "user_sessions" WHERE session_id = $1',
    values: [session_id],
  }
  let res = await connection.query(query)
  return res.rowCount > 0
}

/**
 * Deletes expired user sessions from the database.
 * @param {Object} connection - db connection
 * @param {Date} now - the current date and time, used to determine which sessions are expired
 * @returns {Promise<number>} - a promise that resolves to the number of expired sessions deleted
 */
async function deleteExpiredUserSessions (connection, now) {
  if (!now) now = new Date()
  const query = {
    text: 'DELETE FROM "user_sessions" WHERE expires_at < $1',
    values: [now],
  }
  let res = await connection.query(query)
  return res.rowCount
}

/**
 * Fetches device ids from the database by device id, p_id, or user_id.
 * @param {Object} connection - the database connection
 * @param {Object} queryParams - query parameters, contains id, p_id, or user_id
 * @returns {Promise<Array<UserDeviceId>>} - a promise that resolves to an array of device ids
 */
async function getDeviceIds (connection, queryParams = null) {
  const query = {
    text: 'SELECT * FROM "user_device_ids"',
    values: [],
  }

  if (queryParams && queryParams.user_id) {
    query.text += ' WHERE user_id = $1'
    query.values.push(queryParams.user_id)
  } else if (queryParams && queryParams.p_id) {
    query.text += ' WHERE p_id = $1'
    query.values.push(queryParams.p_id)
  } else if (queryParams && queryParams.id) {
    query.text += ' WHERE id = $1'
    query.values.push(queryParams.id)
  }

  let res = await connection.query(query)
  return res.rows
}

/**
 * Creates a new user device id in the database.
 * @param {Object} connection - database connection
 * @param {UserDeviceId} deviceId - the device id to create
 * @returns {Promise<UserDeviceId>} - a promise that resolves to the created device id
 */
async function createDeviceId (connection, deviceId) {
  const query = {
    text:
      'INSERT INTO "user_device_ids" (p_id, user_id, created_at) ' +
      'VALUES ($1, $2, NOW()) RETURNING *',
    values: [deviceId.p_id, deviceId.user_id],
  }
  let res = await connection.query(query)
  return res.rows[0]
}

/**
 * Deletes a user device id from the database.
 * @param {Object} connection - the database connection
 * @param {string} p_id - the public UUID identifier for the device installation
 * @returns {Promise<boolean>} - a promise that resolves to a boolean indicating whether the device id was deleted
 */
const deleteDeviceId = async (connection, p_id) => {
  const query = {
    text: 'DELETE FROM "user_device_ids" WHERE p_id = $1',
    values: [p_id],
  }
  let res = await connection.query(query)
  return res.rowCount > 0
}

/**
 * Purges all device ids that have not been accessed since the given date.
 * @param {Obejct} connection - database connection
 * @param {Date} date - date before which all device ids are purged
 * @returns {Promise<number>} - a promise that resolves to the number of device ids purged
 */
async function deleteDeviceIdsOlderThan (connection, date) {
  const query = {
    text: 'DELETE FROM "user_device_ids" WHERE last_accessed_at < $1',
    values: [date],
  }
  let res = await connection.query(query)
  return res.rowCount
}

/**
 * Updates a user device id in the database.
 * @param {Object} connection - the database connection
 * @param {string} p_id - the public UUID identifier for the device installation
 * @param {Object} updateParams - the parameters to update, only last_accessed_at is allowed
 * @returns {Promise<UserDeviceId>} - a promise that resolves to the updated device id
 */
async function updateDeviceId (connection, p_id, updateParams) {
  if (updateParams === null || typeof updateParams !== 'object') {
    throw new Error('updateParams must be a non-null object')
  }
  if (updateParams.last_accessed_at === undefined) {
    throw new Error('last_accessed_at is required in updateParams')
  }

  const query = {
    text: 'UPDATE "user_device_ids" SET last_accessed_at = $1 WHERE p_id = $2 RETURNING *',
    values: [updateParams.last_accessed_at, p_id],
  }
  let res = await connection.query(query)
  return res.rows[0]
}

/**
 * Gets clinicians by user id, email or team.
 * If no parameter is provided, all clinicians are returned.
 * @param {Client} connection - the database connection
 * @param {Object} queryParams - query parameters, contains p_id, user_id, email, or team_id
 * @returns {Promise<Array<Clinician>>} - a promise that resolves to an array of clinicians
 */
const getClinicians = async (
  connection,
  queryParams = null
) => {
  const query = {
    text: 'SELECT * FROM clinicians ',
    values: [],
  }

  if (queryParams && queryParams.user_id) {
    query.text += ' WHERE user_id = $1'
    query.values.push(queryParams.user_id)
  } else if (queryParams && queryParams.p_id) {
    query.text += ' WHERE p_id = $1'
    query.values.push(queryParams.p_id)
  } else if (queryParams && queryParams.email) {
    query.text = `SELECT clinicians.* FROM clinicians
        JOIN "users" ON clinicians.user_id = "users".id WHERE "users".email = $1`
    query.values = [queryParams.email]
  } else if (queryParams && queryParams.team_id) {
    query.text = ` SELECT clinicians.* FROM clinicians
            JOIN clinician_team ON clinician_team.clinician_id = clinician.id
            WHERE clinician_team.team_id = $1`
    query.values = [queryParams.team_id]
  }

  let res = await connection.query(query)
  return res.rows
}

/**
 * Creates a new clinician in the database.
 * The clinician must have a user_id that exists in the "user" table.
 * @param {Client} connection - the database connection
 * @param {Clinician} clinician - the clinician to create
 * @returns {Promise<Clinician>} - a promise that resolves to the created clinician
 */
const createClinician = async (connection, clinician) => {
  const query = {
    text:
      'INSERT INTO clinicians (user_id, first_names, second_names, created_at) ' +
      'VALUES ($1, $2, $3, NOW()) RETURNING *',
    values: [clinician.user_id, clinician.first_names, clinician.second_names],
  }
  let res = await connection.query(query)
  return res.rows[0]
}

/**
 * Deletes a clinician from the database.
 * @param {Client} connection - the database connection
 * @param {string} id - user_id of the clinician to be deleted
 * @returns {Promise<boolean>} - a promise that resolves to true if the delete was successful
 */
const deleteClinician = async (connection, id = null) => {
  const query = {
    text: '',
    values: [id],
  }

  query.text = 'DELETE FROM clinicians WHERE id = $1'
  let res = await connection.query(query)

  return res.rowCount > 0
}


/**
 * Fetches teams from the database by team_id or name.
 * team_id and name are exclusive, if both are provided, team_id will be used.
 * @param {!Object} connection - the database connection
 * @param {Object} queryParams - query parameters, contains id and name
 * @returns {Promise<Array<Team>>} - a promise that resolves to an array of teams
 */
const getTeams = async (connection, queryParams) => {
  const query = {
    text: 'SELECT * FROM teams ',
    values: [],
  }

  const { id, name } = queryParams || {}


  if (id) {
    query.text += ' WHERE teams.id = $1 '
    query.values.push(id)
  } else if (name) {
    query.text += ' WHERE teams.name = $1 '
    query.values.push(name)
  }

  let res = await connection.query(query)
  return res.rows
}

/**
 * Creates a new team in the database.
 * @param {!Object} connection - the database connection
 * @param {!Team} team - the team to create
 * @returns {Promise<Team>} - a promise that resolves to the created team
 */
const createTeam = async (connection, team) => {
  const query = {
    text: 'INSERT INTO teams (contact_details, institutions, name, created_at) ' + 'VALUES ($1, $2, $3, NOW()) RETURNING *',
    values: [team.contact_details, team.institutions, team.name],
  }
  let res = await connection.query(query)
  return res.rows[0]
}

/**
 * Deletes a team from the database.
 * @param {!Object} connection - the database connection
 * @param {!string} id - the team to delete
 * @returns {Promise<boolean>} - true if the team is deleted, false otherwise
 */
const deleteTeam = async (connection, id) => {
  let query = {
    text: 'DELETE FROM teams WHERE id = $1 RETURNING *',
    values: [id],
  }
  let res = await connection.query(query)

  return res.rowCount > 0
}


export default {
  getConnection,
  releaseConnection,
  abortConnection,
  createLoginCode,
  getLoginCodes,
  deleteLoginCode,
  deleteExpiredLoginCodes,
  getUsers,
  createUser,
  addFailedLoginAttempt,
  deleteUser,
  createUserSecurityQuestion,
  getUserSecurityQuestions,
  deleteUserSecurityQuestion,
  getUserSessions,
  createUserSession,
  updateUserSession,
  deleteUserSession,
  getUserSessionsWithUser,
  deleteExpiredUserSessions,
  getDeviceIds,
  createDeviceId,
  deleteDeviceId,
  updateDeviceId,
  deleteDeviceIdsOlderThan,
  getClinicians,
  createClinician,
  deleteClinician,
  getTeams,
  createTeam,
  deleteTeam
}

