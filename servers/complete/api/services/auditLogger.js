/**
 * Audit Logger Service
 *
 * This service provides functionality to log audit events in a structured format.
 * Each log entry includes a timestamp, actor, action, resource, field differences, and reason for change.
 *
 * Example log entry:
 * [ Audit Log Entry ]
├── Timestamp: 2026-08-15T10:45:00Z
├── Actor: clinician 2345
├── Action: UPDATE
├── Resource: team_invitation 44
├── Field_diff:
└── Reason_For_Change: "Dose adjustment per lab results"
 */

const AUDIT_LOG_FILE_PATH = process.env.AUDIT_LOG_FILE_PATH || 'audit.log'
const AUDIT_LOG_MAX_SIZE = process.env.AUDIT_LOG_MAX_SIZE || '10M' // 10 Megabytes

import { createStream } from "rotating-file-stream"

// Initialize the audit logger
let stream = createStream(AUDIT_LOG_FILE_PATH, {
  size: AUDIT_LOG_MAX_SIZE, // rotate every X MegaBytes written
  // interval: "1d", // rotate daily
  compress: "gzip" // compress rotated files
})

export default {
  close () {
    // Close the audit logger, if needed
    stream.end()
  },
  log (actor, action, resource, field_diff, reason_for_change) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      Timestamp: timestamp,
      Actor: actor,
      Action: action,
      Resource: resource,
      Field_diff: field_diff,
      Reason_For_Change: reason_for_change
    }
    stream.write(JSON.stringify(logEntry) + '\n')
  }
}
