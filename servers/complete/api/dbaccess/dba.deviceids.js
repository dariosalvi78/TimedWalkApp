/**
 * Import types from the datamodels.
 * @typedef {import("../../../../datamodel/types.js").UserDeviceId} UserDeviceId
 */

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
async function deleteDeviceId (connection, p_id) {
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

export default {
    getDeviceIds,
    createDeviceId,
    deleteDeviceId,
    updateDeviceId,
    deleteDeviceIdsOlderThan,
}
