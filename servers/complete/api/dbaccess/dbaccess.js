/**
 * This module provides a data access layer for the Timed Walk backend.
 */


/**
 * Import types from the datamodels.
 * @typedef {import("../../../../datamodel/types.js").User} User
 * @typedef {import("../../../../datamodel/types.js").Clinician} Clinician
 * @typedef {import("../../../../datamodel/types.js").Team} Team
 * @typedef {import("../../../../datamodel/types.js").ClinicianTeam} ClinicianTeam
 * @typedef {import("../../../../datamodel/types.js").TeamInvitation} TeamInvitation
 * @typedef {import("../../../../datamodel/types.js").Patient} Patient
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
 * Creates a new user in the database.
 * @param {Client} connection - the database connection
 * @param {User} user - the user to create
 * @returns {Promise<User>} - a promise that resolves to the created user
 */
async function createUser (connection, user) {
  const query = {
    text:
      'INSERT INTO "users" (role, email, hashed_password, created_at, last_login_at) ' +
      'VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *',
    values: [user.role, user.email, user.hashed_password],
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
 * Gets clinicians by user id, email or team.
 * If no parameter is provided, all clinicians are returned.
 * @param {Client} connection - the database connection
 * @param {Object} queryParams - query parameters, contains p_id, user_id, email, or team_id
 * @returns {Promise<Array<Clinician>>} - a promise that resolves to an array of clinicians
 */
async function getClinicians (
  connection,
  queryParams = null
) {
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
async function createClinician (connection, clinician) {
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
async function deleteClinician (connection, id = null) {
  const query = {
    text: '',
    values: [id],
  }

  query.text = 'DELETE FROM clinicians WHERE id = $1'
  let res = await connection.query(query)

  return res.rowCount > 0
}


/**
 * Deletes a clinician from the database and associated invitations and team memberships.
 * THIS SHOULD NOT BE USED IN A TRANSACTION
 * @param {Client} connection - the database connection
 * @param {string} id - id of the clinician to be deleted
 * @returns {Promise<boolean>} - a promise that resolves to true if the delete was successful
 */
async function cleanUpClinician (connection, id = null) {
  const query = {
    text: '',
    values: [id],
  }

  await connection.query('BEGIN')

  query.text = 'DELETE FROM clinician_team WHERE clinician_id = $1'
  await connection.query(query)

  query.text = 'DELETE FROM team_invitation WHERE clinician_id = $1'
  await connection.query(query)

  query.text = 'DELETE FROM clinicians WHERE id = $1'
  let res = await connection.query(query)

  await connection.query('COMMIT')

  return res.rowCount > 0
}

export {
  getConnection,
  releaseConnection,
  abortConnection,
  getUsers,
  createUser,
  deleteUser,
  getClinicians,
  createClinician,
  deleteClinician,
  cleanUpClinician
}
