import { promises as fs } from 'fs'
import express from 'express'
import pinoHttp from 'pino-http'
import pino from 'pino'
import { xss } from 'express-xss-sanitizer'
import helmet from "helmet"
import { SignJWT, jwtVerify } from 'jose'
import cors from 'cors'

// Log to console by default, and to file when LOG_FILE is set.
const streams = [{ stream: process.stdout }]
if (process.env.LOG_FILE) {
  streams.push({ stream: pino.destination(process.env.LOG_FILE) })
}

const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
}, pino.multistream(streams))

const app = express()
const PORT = process.env.PORT_NUMBER || 3000

app.use(pinoHttp({ logger }))
app.use(express.json())
app.use(xss())
app.use(helmet())
app.use(cors())

// Error handling middleware
app.use((err, req, res, next) => {
  req.log.error({ err }, 'Unhandled error')
  res.status(500).send('Internal Server Error')
})

if (!process.env.CONFIG_FILE) {
  logger.fatal('CONFIG_FILE environment variable is not set. Exiting.')
  process.exit(1)
}

async function authenticateToken (req, res, next) {
  const authHeader = req.headers['authorization'] // Authorization: Bearer
  const token = authHeader && authHeader.split(' ')[1] // the part after "Bearer "

  if (!token) {
    return res.status(401).json({ message: 'Token missing' })
  }

  const secret = new TextEncoder().encode(process.env.JWT_SECRET)
  try {
    const { payload } = await jwtVerify(token, secret)
    req.auth = payload
    next()
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token' })
  }
}

// load configuration file
let teamConfig = await fs.readFile(process.env.CONFIG_FILE, 'utf-8')
teamConfig = JSON.parse(teamConfig)

logger.info('Loaded team configuration')
// do some checks on the config file
if (!teamConfig.team.id || !teamConfig.team.name || !teamConfig.team.contact) {
  logger.fatal('Invalid configuration file: missing team information. Exiting.')
  process.exit(1)
}
if (!teamConfig.welcomeMessage || !teamConfig.privacyPolicy) {
  logger.fatal('Invalid configuration file: missing messages. Exiting.')
  process.exit(1)
}
if (!teamConfig.patients || !teamConfig.patients.length) {
  logger.fatal('Invalid configuration file: missing patient information. Exiting.')
  process.exit(1)
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  req.log.debug('Health check requested')
  res.json({ status: 'OK', message: 'Server is running' })
})


// accept invitation endpoint
app.post('/api/invitations/:code/accept', async (req, res) => {
  req.log.debug('Accepting invitation with code: ' + req.params.code)
  // find the patient associated with the invitation code
  const patient = teamConfig.patients.find(p => p.invitationCode.toLowerCase() === req.params.code.toLowerCase())
  if (!patient) {
    req.log.warn('Invalid invitation code: ' + req.params.code)
    return res.status(404).json({ error: 'Invitation not found' })
  }

  // set the connection status for the patient and save the updated config file
  teamConfig.patients = teamConfig.patients.map(p => {
    if (p.invitationCode.toLowerCase() === req.params.code.toLowerCase()) {
      return { ...p, connectedToTeam: true }
    }
    return p
  })
  await fs.writeFile(process.env.CONFIG_FILE, JSON.stringify(teamConfig, null, 2))

  // create a JWT token for the patient
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);

  const token = await new SignJWT({ patientId: patient.id })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('25 weeks') // about 6 months
    .sign(secret);

  console.log('Access Token:', token);

  res.json({ serverToken: token })
})

// Invitation details endpoint
app.get('/api/invitations/:code', (req, res) => {
  req.log.debug('Fetching invitation details for code: ' + req.params.code)
  // find the patient associated with the invitation code
  const patient = teamConfig.patients.find(p => p.invitationCode.toLowerCase() === req.params.code.toLowerCase())
  if (!patient) {
    req.log.warn('Invalid invitation code: ' + req.params.code)
    return res.status(404).json({ error: 'Invitation not found' })
  }
  res.json({
    team: teamConfig.team,
    welcomeMessage: teamConfig.welcomeMessage,
    privacyPolicy: teamConfig.privacyPolicy,
    patient
  })
})

app.post('/api/refresh-token', authenticateToken, async (req, res) => {
  req.log.debug('Refreshing token for patient ID: ' + req.auth.patientId)
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);

  const token = await new SignJWT({ patientId: req.auth.patientId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('25 weeks') // about 6 months
    .sign(secret);

  console.log('Refreshed Access Token:', token);

  res.json({ serverToken: token })
})

// Disconnect a patient from a team
app.post('/api/disconnectFromTeam', authenticateToken, async (req, res) => {
  req.log.debug('Disconnecting from team')

  // get patient id from token
  const patientId = req.auth.patientId

  // find the patient in the config file and set connected to false
  teamConfig.patients = teamConfig.patients.map(p => {
    if (p.id === patientId) {
      return { ...p, connectedToTeam: false }
    }
    return p
  })
  // save the updated config file
  await fs.writeFile(process.env.CONFIG_FILE, JSON.stringify(teamConfig, null, 2))

  res.json({ success: true })
})

app.post('/api/test-result', authenticateToken, async (req, res) => {
  req.log.debug('Received test result')

  // save the results on a local file
  const result = req.body
  const patientId = req.auth.patientId
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `test-result-${patientId}-${timestamp}.json`
  await fs.writeFile(process.env.TEST_RESULTS_DIR + '/' + filename, JSON.stringify(result, null, 2))

  res.json({ success: true, sharingWith: [teamConfig.team.id] })
})



// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server is listening on port ${PORT}`)
})


process.on('uncaughtException', (err) => {
  // log the exception
  logger.fatal(err, 'uncaught exception detected')

  // shutdown the server gracefully
  server.close(() => {
    process.exit(1) // then exit
  })

  // If a graceful shutdown is not achieved after 1 second,
  // shut down the process completely
  setTimeout(() => {
    process.abort() // exit immediately and generate a core dump file
  }, 1000).unref()
})

export default app
