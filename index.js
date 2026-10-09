
import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pino from 'pino'
import * as baileys from '@whiskeysockets/baileys'

const makeWASocket = baileys.default || baileys.makeWASocket

const {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion
} = baileys

if (typeof makeWASocket !== 'function') {
  throw new Error(
    'Baileys import failed: makeWASocket is not a function. Check installed package version.'
  )
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = Number(process.env.PORT) || 8080
const BOT_NAME = 'DAMAR-MD'

const AUTH_DIR = process.env.AUTH_DIR ||
  (fs.existsSync('/data')
    ? '/data/damar-auth'
    : path.join(__dirname, 'auth'))

const logger = pino({ level: process.env.LOG_LEVEL || 'warn' })

app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

let sock = null
let authState = null
let saveCreds = null
let status = 'starting'
let lastError = null
let pairingNumber = null
let pairingCode = null
let reconnectTimer = null
let reconnectAttempts = 0
let startPromise = null
let stopping = false

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

function cleanNumber(value) {
  let number = String(value || '').replace(/\D/g, '')
  if (number.startsWith('00')) number = number.slice(2)
  return number
}

function prepareAuthDir() {
  fs.mkdirSync(AUTH_DIR, { recursive: true })
}

async function startWhatsApp() {
  if (stopping) return
  if (startPromise) return startPromise

  startPromise = (async () => {
    try {
      prepareAuthDir()

      const auth = await useMultiFileAuthState(AUTH_DIR)
      authState = auth.state
      saveCreds = auth.saveCreds

      let version
      try {
        const latest = await fetchLatestBaileysVersion()
        if (latest?.version) version = latest.version
      } catch (error) {
        console.warn('Could not fetch latest WhatsApp version:', error.message)
      }

      const options = {
        auth: authState,
        logger,
        browser: Browsers.ubuntu(BOT_NAME),
        markOnlineOnConnect: false,
        syncFullHistory: false,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 30000
      }

      if (version) options.version = version

      sock = makeWASocket(options)
      const currentSocket = sock
      status = 'connecting'
      lastError = null

      currentSocket.ev.on('creds.update', async () => {
        try {
          await saveCreds()
        } catch (error) {
          console.error('Save credentials error:', error.message)
        }
      })

      currentSocket.ev.on('connection.update', update => {
        if (sock !== currentSocket) return

        if (update.connection === 'connecting') {
          status = 'connecting'
        }

        if (update.connection === 'open') {
          status = 'connected'
          lastError = null
          reconnectAttempts = 0
          pairingCode = null
          console.log(`[${BOT_NAME}] WhatsApp connected`)
        }

        if (update.connection === 'close') {
          status = 'disconnected'

          const error = update.lastDisconnect?.error
          const code = error?.output?.statusCode ??
            error?.statusCode ?? null

          lastError = {
            statusCode: code,
            message: error?.message || 'WhatsApp connection closed'
          }

          console.error('WhatsApp disconnected:', lastError)

          sock = null

          if (code === DisconnectReason.loggedOut) {
            status = 'logged_out'
            console.error('Session logged out. Re-link WhatsApp.')
            return
          }

          if (code === DisconnectReason.badSession) {
            status = 'bad_session'
            console.error('Bad session. Check saved authentication files.')
            return
          }

          scheduleReconnect()
        }
      })
    } catch (error) {
      status = 'error'
      lastError = {
        message: error?.message || String(error),
        statusCode: error?.statusCode ?? null
      }
      console.error('WhatsApp startup error:', error)
      scheduleReconnect()
    } finally {
      startPromise = null
    }
  })()

  return startPromise
}

function scheduleReconnect() {
  if (stopping || reconnectTimer) return

  reconnectAttempts++
  const delay = Math.min(5000 * reconnectAttempts, 30000)

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null
    if (!stopping) await startWhatsApp()
  }, delay)
}

async function getPairingCode(input) {
  const number = cleanNumber(input)

  if (!/^\d{8,15}$/.test(number)) {
    throw new Error('دخل رقم واتساب دولي صحيح بلا + ولا مسافات.')
  }

  prepareAuthDir()

  if (authState?.creds?.registered) {
    return {
      registered: true,
      number,
      code: null,
      message: 'الجلسة مسجلة من قبل. ما محتاجش كود ربط جديد.'
    }
  }

  // Ensure the socket startup has finished.
  await startWhatsApp()

  for (let i = 0; i < 30; i++) {
    if (authState?.creds?.registered) {
      return {
        registered: true,
        number,
        code: null,
        message: 'الجلسة مسجلة من قبل.'
      }
    }

    if (sock && status !== 'error' && status !== 'logged_out') break
    await sleep(1000)
  }

  if (!sock) {
    throw new Error(
      `WhatsApp socket unavailable. Current status: ${status}`
    )
  }

  if (authState?.creds?.registered) {
    return {
      registered: true,
      number,
      code: null,
      message: 'الجلسة مسجلة من قبل.'
    }
  }

  // Give the websocket a moment to initialize before requesting a code.
  await sleep(2000)

  const currentSocket = sock
  const code = await currentSocket.requestPairingCode(number)

  pairingNumber = number
  pairingCode = code

  return {
    registered: false,
    number,
    code,
    message: 'دخل الكود فواتساب > الأجهزة المرتبطة > ربط جهاز.'
  }
}

function statusData() {
  return {
    success: true,
    bot: BOT_NAME,
    status,
    connected: status === 'connected',
    registered: !!authState?.creds?.registered,
    number: pairingNumber,
    lastError
  }
}

app.get('/', (req, res) => {
  res.json({
    success: true,
    bot: BOT_NAME,
    message: 'DAMAR-MD API is online',
    endpoints: ['/health', '/api/status', '/api/pair?number=212XXXXXXXXX']
  })
})

app.get('/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime(), status })
})

app.get('/api/status', (req, res) => {
  res.json(statusData())
})

app.get('/status', (req, res) => {
  res.json(statusData())
})

app.get('/api/pair', async (req, res) => {
  try {
    const result = await getPairingCode(req.query.number)

    if (result.registered) {
      return res.json({
        success: true,
        registered: true,
        status,
        message: result.message
      })
    }

    return res.json({
      success: true,
      registered: false,
      number: result.number,
      code: result.code,
      pairingCode: result.code,
      status,
      message: result.message
    })
  } catch (error) {
    console.error('Pairing request failed:', error)
    return res.status(500).json({
      success: false,
      error: error?.message || String(error),
      status,
      lastError
    })
  }
})

app.post('/api/pair', async (req, res) => {
  try {
    const result = await getPairingCode(req.body?.number)

    if (result.registered) {
      return res.json({
        success: true,
        registered: true,
        status,
        message: result.message
      })
    }

    return res.json({
      success: true,
      registered: false,
      number: result.number,
      code: result.code,
      pairingCode: result.code,
      status,
      message: result.message
    })
  } catch (error) {
    console.error('Pairing request failed:', error)
    return res.status(500).json({
      success: false,
      error: error?.message || String(error),
      status,
      lastError
    })
  }
})

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  })
})

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`${BOT_NAME} API listening on port ${PORT}`)
  console.log(`Authentication directory: ${AUTH_DIR}`)
})

startWhatsApp()

async function shutdown() {
  stopping = true
  if (reconnectTimer) clearTimeout(reconnectTimer)
  try {
    if (sock) sock.end(undefined)
  } catch {}
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 5000).unref()
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
