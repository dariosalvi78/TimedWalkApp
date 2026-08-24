import winston from 'winston'
import { createStream } from "rotating-file-stream"
import path from 'node:path'

const LOG_FILE_PATH = process.env.LOG_FILE_PATH || 'log.log'
const LOG_MAX_SIZE = process.env.LOG_MAX_SIZE || '10M' // 10 Megabytes

const rotatingStream = createStream(LOG_FILE_PATH, {
  size: LOG_MAX_SIZE,      // rotate every X MegaBytes written
  // interval: '1d',   // rotate daily
  compress: 'gzip', // compress rotated files
})

const logger = winston.createLogger({
  level: process.env.LOGLEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Stream({ stream: rotatingStream }),
  ]
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }))
}

export default logger
