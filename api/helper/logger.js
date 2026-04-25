import pino from "pino"
import path from 'path'
import { fileURLToPath } from "url"

// ✅ Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ✅ Go one level up to project root if logger.js is in /api/helper/
const rootDir = path.resolve(__dirname, "../../") 

const fileTransport = pino.transport({
  target: 'pino/file',
  options: { destination: path.join(rootDir, "app.log") },
})

const isProd = process.env.NODE_ENV === 'production'

const transport = pino.transport({
  targets: [
    isProd
      ? { target: "pino/file", options: { destination: 1 }, level: "info" }
      : { target: "pino-pretty", options: { colorize: true }, level: "info" },
    {
      target: "pino/file",
      options: { destination: path.join(rootDir, "app.log") },
      level: "info",
    },
  ],
})

export const logger = pino({
    level: process.env.PINO_LOG_LEVEL || 'info',
    formatters: {
        bindings: (bindings) => {
            return { 
                pid: bindings.pid,
                host: bindings.hostname,
                node_version: process.version,
            }
        },
        level: (label) => {
            return { level: label.toUpperCase() }
        },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
}, transport)

export const loggerMiddleware = (req, res, next) => {
    const start = Date.now()

    res.on("finish", () => {
        logger.info({
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            time: Date.now(),
            responseTime: `${Date.now() - start}ms`,
        })
    })

    next()
}
