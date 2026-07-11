import { Client } from 'pg'
import fs from 'fs'

const rootConfig = {
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'postgres',
  password: process.env.PGPASSWORD || 'mysecretpassword',
  port: process.env.PGPORT || 5432
}

/**
 * Gets a client for a specific database.
 * @returns {Promise<Client>} - a promise that resolves to a client
 */
async function getPostgresClient (config) {

  const client = new Client(config);
  await client.connect();
  return client;
}

async function closePostgresClient (client) {
  if (client) {
    await client.end();
  }
}

async function getDatabaseNames (client) {
  const res = await client.query("SELECT datname FROM pg_database WHERE datistemplate = false;")
  return res.rows.map(row => row.datname);
}

async function createTestDBAndReturnClient (dbname = 'timedwalk_test') {
  let client = await getPostgresClient(rootConfig)

  await client.query(`DROP DATABASE IF EXISTS ${dbname};`)
  await client.query(`CREATE DATABASE ${dbname};`)
  client.end()

  const config = {
    ...rootConfig,
    database: dbname
  }
  client = await getPostgresClient(config)
  await executeSQLFile(client, '../../../datamodel/schema.sql')

  return client
}

async function dropTestDB (dbname = 'timedwalk_test') {
  const client = await getPostgresClient(rootConfig)
  await client.query(`DROP DATABASE IF EXISTS ${dbname};`);

  client.end();
}

async function getTestDBClient (dbname = 'timedwalk_test') {
  const config = {
    ...rootConfig,
    database: dbname
  }
  return getPostgresClient(config)
}

async function getTestDBConnection () {
  const client = await getTestDBClient();
  return client;
}


/**
 * Generic query function that executes a SQL query on the database.
 * @param {Client} client
 * @param {string} text - query text
 * @param {Object} params - query parameters
 * @returns
 */
async function query (client, text, params) {
  return client.query(text, params)
}

async function executeSQLFile (client, file) {
  if (!client) {
    throw new Error('must call connectToDatabase first')
  }
  const data = fs.readFileSync(file, 'utf8')
  return client.query(data)
}

export {
  rootConfig,
  getPostgresClient,
  closePostgresClient,
  getDatabaseNames,
  createTestDBAndReturnClient,
  dropTestDB,
  getTestDBClient,
  getTestDBConnection,
  query,
  executeSQLFile
}
