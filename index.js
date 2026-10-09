
import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pino from 'pino'

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 8080
const BOT_NAME = 'DAMAR-MD'
const AUTH_DIR = process.env.AUTH_DIR ||
  (fs.existsSync('/data')
    ? '/data/damar-auth'
    : path.join(__dirname, 'auth'))

const logger = pino({ level: process.env.LOG_LEVEL || 'warn' })

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json({ limit: '20kb' }))
app.use(express.urlencoded({ extended: true }))

let sock = null
let authState = null
let saveCreds = null
let status = 'starting'
let lastError = null
let lastNumber = null
let reconnectTimer = null
let starting = null
let pairingInProgress = false
let reconnectAttempts = 0

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

function cleanNumber(value) {
  let number = String(value || '').replace(/\D/g, '')
  if (number.startsWith('00')) number = number.slice(2)
  return number
}

async function startWhatsApp() {
  if (starting) return starting

  starting = (async () => {
    fs.mkdirSync(AUTH_DIR, { recursive: true })

    const auth = await useMultiFileAuthState(AUTH_DIR)
    authState = auth.state
    saveCreds = auth.saveCreds

    let version
    try {
      const latest = await fetchLatestBaileysVersion()
      version = latest.version
    } catch (error) {
      console.warn('Could not fetch latest WhatsApp version:', error.message)
    }

    const options = {
      auth: authState,
      logger,
      browser: Browsers.ubuntu(BOT_NAME),
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 30000
    }

    if (version) options.version = version

    const socket = makeWASocket(options)
    sock = socket
    status = 'connecting'
    lastError = null

    socket.ev.on('creds.update', async () => {
      try {
        await saveCreds()
      } catch (error) {
        lastError = { message: error.message }
        console.error('Saving credentials failed:', error.message)
      }
    })

    socket.ev.on('connection.update', update => {
      if (sock !== socket) return

      if (update.connection === 'connecting') {
        status = 'connecting'
      }

      if (update.connection === 'open') {
        status = 'connected'
        lastError = null
        reconnectAttempts = 0
        console.log(`${BOT_NAME}: WhatsApp connected`)
      }

      if (update.connection === 'close') {
        const error = update.lastDisconnect?.error
        const code = error?.output?.statusCode ??
          error?.statusCode ?? null

        status = 'disconnected'
        lastError = {
          statusCode: code,
          message: error?.message || 'Connection closed'
        }

        console.error('WhatsApp disconnected:', lastError)

        sock = null

        if (code === DisconnectReason.loggedOut ||
            code === DisconnectReason.badSession) {
          status = code === DisconnectReason.loggedOut
            ? 'logged_out'
            : 'bad_session'
          return
        }

        scheduleReconnect()
      }
    })
  })()

  try {
    await starting
  } finally {
    starting = null
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return

  reconnectAttempts += 1
  const delay = Math.min(5000 * reconnectAttempts, 30000)

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null
    try {
      await startWhatsApp()
    } catch (error) {
      lastError = { message: error.message }
      console.error('Reconnect failed:', error.message)
      scheduleReconnect()
    }
  }, delay)
}

async function requestCode(rawNumber) {
  const number = cleanNumber(rawNumber)

  if (!/^\d{8,15}$/.test(number)) {
    throw new Error('دخل رقم واتساب صحيح مع مفتاح الدولة، بلا + ولا مسافات.')
  }

  if (pairingInProgress) {
    throw new Error('كاين طلب ربط آخر، تسنى شوية وعاود.')
  }

  pairingInProgress = true

  try {
    if (!sock) await startWhatsApp()

    // Give the socket time to initialize.
    for (let i = 0; i < 20 && !sock; i++) {
      await sleep(500)
    }

    if (!sock) throw new Error('WhatsApp socket is not ready. Check Railway logs.')

    if (authState?.creds?.registered) {
      throw new Error(
        'هاد الجلسة مربوطة من قبل. ما يمكنش توليد كود جديد لنفس الجلسة.'
      )
    }

    if (status === 'logged_out' || status === 'bad_session') {
      throw new Error('الجلسة فيها مشكل. راجع سجلات Railway والجلسة المحفوظة.')
    }

    const currentSocket = sock
    const code = await currentSocket.requestPairingCode(number)

    if (sock !== currentSocket) {
      throw new Error('تقطع الاتصال أثناء طلب الكود. عاود المحاولة.')
    }

    lastNumber = number
    return { number, code }
  } finally {
    pairingInProgress = false
  }
}

app.get('/', (_req, res) => {
  res.json({
    success: true,
    name: BOT_NAME,
    message: 'DAMAR-MD Pairing API online',
    status,
    endpoints: ['/api/status', '/api/pair?number=212XXXXXXXXX']
  })
})

app.get('/health', (_req, res) => {
  res.json({ success: true, status, uptime: process.uptime() })
})

app.get('/api/status', (_req, res) => {
  res.json({
    success: true,
    bot: BOT_NAME,
    status,
    connected: status === 'connected',
    registered: Boolean(authState?.creds?.registered),
    lastNumber,
    lastError
  })
})

app.get('/api/pair', async (req, res) => {
  try {
    const result = await requestCode(req.query.number)
    res.json({
      success: true,
      number: result.number,
      code: result.code,
      status,
      message: 'دخل الكود في واتساب > الأجهزة المرتبطة > ربط جهاز'
    })
  } catch (error) {
    console.error('Pairing request failed:', error)
    res.status(400).json({
      success: false,
      error: error.message || 'Pairing request failed',
      status,
      lastError
    })
  }
})

app.post('/api/pair', async (req, res) => {
  try {
    const result = await requestCode(req.body?.number)
    res.json({
      success: true,
      number: result.number,
      code: result.code,
      status,
      message: 'دخل الكود في واتساب > الأجهزة المرتبطة > ربط جهاز'
    })
  } catch (error) {
    console.error('Pairing request failed:', error)
    res.status(400).json({
      success: false,
      error: error.message || 'Pairing request failed',
      status,
      lastError
    })
  }
})

app.use((error, _req, res, _next) => {
  console.error('HTTP error:', error)
  res.status(500).json({ success: false, error: 'Internal server error' })
})

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`${BOT_NAME} API listening on port ${PORT}`)
  console.log(`Auth directory: ${AUTH_DIR}`)
})

startWhatsApp().catch(error => {
  status = 'error'
  lastError = { message: error.message }
  console.error('WhatsApp startup failed:', error)
  scheduleReconnect()
})

async function shutdown() {
  clearTimeout(reconnectTimer)
  server.close()
  try {
    if (sock) sock.end()
  } catch {}
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
