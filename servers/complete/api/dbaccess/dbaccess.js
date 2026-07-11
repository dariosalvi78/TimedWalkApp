/**
 * This module provides a data access layer for the Timed Walk backend.
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
 * @returns {Promise<Client>} - a promise that resolves to a client
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
 * @param {Client} client - the client to release
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
 * @param {Client} client - the client to abort the transaction on
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
 * @param {Client} connection - the database connection
 * @param {string} id
 * @param {string} email
 * @returns {Promise<Array<User>>} - a promise that resolves to an array of users
 */
async function getUsers (connection, id = null, email = null) {
  const query = {
    text: 'SELECT * FROM "user"',
    values: [],
  }

  if (id) {
    query.text += ' WHERE id = $1'
    query.values.push(id)
  } else if (email) {
    query.text += ' WHERE email = $1'
    query.values.push(email)
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
 * @param {string} id - id of the user to be deleted
 * @param {string} email - email of the user to be deleted
 * @returns {Promise<boolean>} - a promise that resolves to true if the delete was successful
 */
async function deleteUser (connection, id = null, email = null) {
  const query = {
    text: '',
    values: [],
  }
  if (id) {
    query.text += 'DELETE FROM "users" WHERE id = $1'
    query.values.push(id)
  } else if (email) {
    query.text += 'DELETE FROM "users" WHERE email = $1'
    query.values.push(email)
  } else {
    return false
  }

  let res = await connection.query(query)
  return res.rowCount > 0
}

export {
  getConnection,
  releaseConnection,
  abortConnection,
  getUsers,
  createUser,
  deleteUser
}
