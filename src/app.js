import path from 'node:path'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import routes from './routes/index.js'
import { chaos } from './middleware/chaos.js'
import { errorHandler, notFoundHandler } from './middleware/error.js'
import { docs } from './docs.js'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN === '*' ? true : process.env.CORS_ORIGIN?.split(','),
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true }))
  app.use(morgan('dev'))

  // Yuklangan rasmlar: http://localhost:4000/uploads/xxx.jpg
  app.use('/uploads', express.static(path.resolve('uploads')))

  app.get('/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }))
  app.get('/api/docs', (_req, res) => res.json(docs))

  app.use('/api', chaos, routes)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
