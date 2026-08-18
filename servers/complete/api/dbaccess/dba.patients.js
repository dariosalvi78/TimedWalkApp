/**
 * Import types from the datamodels.
 * @typedef {import("../../../../datamodel/types.js").Patient} Patient
 */

/**
 * Retrieves patients from the database.
 * @param {Object} connection - database connection
 * @param {Object} queryParams - parameters for filtering: id, p_id, team_id
 * @returns {Promise<Array<Patient>>} - a promise that resolves to an array of patients
 */
async function getPatients (connection, queryParams = null) {
  const query = {
    text: 'SELECT patients.* FROM "patients"',
    values: [],
  }

  if (queryParams && queryParams.team_id) {
    query.text += ' JOIN "patient_team" ON "patient_team".patient_id = "patients".id WHERE "patient_team".team_id = $' + (query.values.length + 1)
    query.values.push(queryParams.team_id)
  }

  if (queryParams && queryParams.id) {
    if (query.values.length > 0) {
      query.text += ' AND patients.id = $' + (query.values.length + 1)
    } else {
      query.text += ' WHERE patients.id = $1'
    }
    query.values.push(queryParams.id)
  }

  if (queryParams && queryParams.p_id) {
    if (query.values.length > 0) {
      query.text += ' AND patients.p_id = $' + (query.values.length + 1)
    } else {
      query.text += ' WHERE patients.p_id = $1'
    }
    query.values.push(queryParams.p_id)
  }


  let res = await connection.query(query)
  return res.rows
}

/**
 * Creates a new patient in the database.
 * @param {Object} connection - database connection
 * @param {Patient} patient - the patient to create
 * @returns {Promise<Patient>} - a promise that resolves to the created patient
 */
async function createPatient (connection, patient) {

  const query = {
    text: `
      INSERT INTO "patients" (user_id, first_names, second_names, date_of_birth, sex, phone_number)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
    values: [
      patient.user_id,
      patient.first_names,
      patient.second_names,
      patient.date_of_birth,
      patient.sex,
      patient.phone_number,
    ],
  }

  let res = await connection.query(query)
  return res.rows[0]
}

/**
 * Deletes a patient from the database.
 * @param {Object} connection - database connection
 * @param {string} patientId - the ID of the patient to delete
 * @returns {Promise<boolean>} - a promise that resolves if the patient is deleted
 */
async function deletePatient (connection, patientId) {
  const query = {
    text: 'DELETE FROM "patients" WHERE id = $1',
    values: [patientId],
  }

  await connection.query(query)
  return true
}

export default {
  getPatients,
  createPatient,
  deletePatient
}

