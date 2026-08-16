/**
 * Import types from the datamodels.
 * @typedef {import("../../../../datamodel/types.js").User} User
 */

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

export default {
  getUsers,
  createUser,
  addFailedLoginAttempt,
  deleteUser,
}