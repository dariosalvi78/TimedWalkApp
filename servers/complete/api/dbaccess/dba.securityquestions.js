/**
 * Import types from the datamodels.
 * @typedef {import("../../../../datamodel/types.js").UserSecurityQuestion} UserSecurityQuestion
 */

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
 * Updates a user security question in the database.
 * @param {Object} connection - database connection
 * @param {string} id - ID of the security question to be updated
 * @param {Object} updateParams - parameters to update
 * @returns {Promise<UserSecurityQuestion>} - a promise that resolves to the updated security question
 */
async function updateUserSecurityQuestion (connection, id, updateParams) {
    const allowedParams = ['question', 'answer_hash']

    const query = {
        text: 'UPDATE "user_security_questions" SET ',
        values: [],
    }

    const updateEntries = []
    for (const [key, value] of Object.entries(updateParams)) {
        if (allowedParams.includes(key)) {
            updateEntries.push(`${key} = $${query.values.length + 1}`)
            query.values.push(value)
        }
    }

    if (updateEntries.length === 0) {
        throw new Error('No valid parameters to update')
    }

    query.text += updateEntries.join(', ')
    query.text += ' WHERE id = $' + (query.values.length + 1)
    query.text += ' RETURNING *'
    query.values.push(id)

    let res = await connection.query(query)
    return res.rows[0]
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

export default {
    createUserSecurityQuestion,
    getUserSecurityQuestions,
    deleteUserSecurityQuestion,
    updateUserSecurityQuestion,
}
