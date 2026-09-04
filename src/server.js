import { createApp } from './app.js'
import { prisma } from './lib/prisma.js'

const PORT = Number(process.env.PORT || 4000)
const app = createApp()

const server = app.listen(PORT, () => {
  console.log(`\n  Example Shop API`)
  console.log(`  http://localhost:${PORT}/api`)
  console.log(`  Endpointlar ro'yxati: http://localhost:${PORT}/api/docs\n`)
})

async function shutdown(signal) {
  console.log(`\n${signal} — server to'xtatilmoqda...`)
  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
