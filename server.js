import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pino from 'pino'

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// ==========================================
// DAMAR-MD CONFIG
// ==========================================

const PORT = process.env.PORT || 8080

// Railway Volume:
// خاص Volume يكون mounted فـ /data
const AUTH_DIR =
  process.env.AUTH_DIR ||
  (fs.existsSync('/data')
    ? '/data/damar-auth'
    : path.join(__dirname, 'auth'))

const BOT_NAME = 'DAMAR-MD'

// ==========================================
// EXPRESS
// ==========================================

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json())
app.use(express.urlencoded({
  extended: true
}))

// ==========================================
// LOGGER
// ==========================================

const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
})

// ==========================================
// GLOBAL STATE
// ==========================================

let sock = null
let state = null
let saveCreds = null

let connectionStatus = 'starting'
let lastError = null

let pairingCode = null
let pairingNumber = null

let reconnectTimer = null
let starting = false
let reconnectAttempts = 0

// ==========================================
// PREPARE AUTH
// ==========================================

function prepareAuthDir() {

  try {

    if (!fs.existsSync(AUTH_DIR)) {

      fs.mkdirSync(AUTH_DIR, {
        recursive: true
      })

    }

    console.log(
      `[${BOT_NAME}] 📁 Auth folder: ${AUTH_DIR}`
    )

  } catch (error) {

    console.error(
      `[${BOT_NAME}] ❌ Auth folder error:`,
      error.message
    )

  }

}

// ==========================================
// CLEAN NUMBER
// ==========================================

function cleanNumber(number) {

  if (!number) {
    return null
  }

  let value = String(number)

  value = value.replace(/\D/g, '')

  if (value.startsWith('00')) {
    value = value.substring(2)
  }

  return value

}

// ==========================================
// START WHATSAPP
// ==========================================

async function startWhatsApp() {

  if (starting) {

    console.log(
      `[${BOT_NAME}] ⏳ WhatsApp already starting`
    )

    return

  }

  starting = true

  try {

    prepareAuthDir()

    console.log('')
    console.log('======================================')
    console.log(`🚀 ${BOT_NAME} WhatsApp Starting`)
    console.log('======================================')

    const auth =
      await useMultiFileAuthState(AUTH_DIR)

    state = auth.state
    saveCreds = auth.saveCreds

    let version = null

    try {

      const latest =
        await fetchLatestBaileysVersion()

      if (
        latest &&
        latest.version
      ) {

        version = latest.version

        console.log(
          `[${BOT_NAME}] 📦 WhatsApp version: ${version.join('.')}`
        )

      }

    } catch {

      console.log(
        `[${BOT_NAME}] ⚠️ Using default Baileys version`
      )

    }

    const options = {

      auth: state,

      logger,

      printQRInTerminal: false,

      browser: Browsers.ubuntu(BOT_NAME),

      markOnlineOnConnect: false,

      syncFullHistory: false,

      generateHighQualityLinkPreview: false,

      connectTimeoutMs: 60000,

      defaultQueryTimeoutMs: 60000,

      keepAliveIntervalMs: 30000,

      retryRequestDelayMs: 1000

    }

    if (version) {

      options.version = version

    }

    sock = makeWASocket(options)

    connectionStatus = 'connecting'
    lastError = null

    console.log(
      `[${BOT_NAME}] 📡 WhatsApp: connecting`
    )

    // ========================================
    // SAVE CREDENTIALS
    // ========================================

    sock.ev.on(
      'creds.update',
      async () => {

        try {

          await saveCreds()

        } catch (error) {

          console.error(
            `[${BOT_NAME}] ❌ Save credentials error:`,
            error.message
          )

        }

      }
    )

    // ========================================
    // CONNECTION UPDATE
    // ========================================

    sock.ev.on(
      'connection.update',
      async update => {

        const {
          connection,
          lastDisconnect
        } = update

        // -------------------------------
        // CONNECTING
        // -------------------------------

        if (connection === 'connecting') {

          connectionStatus = 'connecting'

          console.log(
            `[${BOT_NAME}] 📡 WhatsApp: connecting`
          )

        }

        // -------------------------------
        // OPEN
        // -------------------------------

        if (connection === 'open') {

          connectionStatus = 'connected'

          lastError = null

          reconnectAttempts = 0

          pairingCode = null

          console.log('')
          console.log('======================================')
          console.log(`✅ ${BOT_NAME} WhatsApp CONNECTED`)
          console.log('======================================')
          console.log('')

        }

        // -------------------------------
        // CLOSE
        // -------------------------------

        if (connection === 'close') {

          connectionStatus = 'disconnected'

          let statusCode = 'unknown'
          let errorMessage = 'Unknown error'

          try {

            const error =
              lastDisconnect?.error

            if (error) {

              statusCode =
                error?.output?.statusCode ||
                error?.statusCode ||
                'unknown'

              errorMessage =
                error?.message ||
                String(error)

            }

          } catch (error) {

            console.error(
              `[${BOT_NAME}] Error reading disconnect:`,
              error.message
            )

          }

          lastError = {

            statusCode,

            message: errorMessage

          }

          console.log(
            `[${BOT_NAME}] ❌ WhatsApp disconnected: ${statusCode}`
          )

          console.log(
            `[${BOT_NAME}] ❌ ERROR MESSAGE: ${errorMessage}`
          )

          // 401 = session logged out
          if (
            statusCode === DisconnectReason.loggedOut
          ) {

            console.log(
              `[${BOT_NAME}] 🔒 Account logged out.`
            )

            connectionStatus = 'logged_out'

            sock = null

            return

          }

          // Bad session
          if (
            statusCode === DisconnectReason.badSession
          ) {

            console.log(
              `[${BOT_NAME}] ⚠️ Bad session detected.`
            )

            connectionStatus = 'bad_session'

            sock = null

            return

          }

          scheduleReconnect()

        }

      }
    )

  } catch (error) {

    connectionStatus = 'error'

    lastError = {

      statusCode:
        error?.statusCode ||
        'unknown',

      message:
        error?.message ||
        String(error)

    }

    console.error(
      `[${BOT_NAME}] ❌ WhatsApp startup error:`,
      error
    )

    scheduleReconnect()

  } finally {

    starting = false

  }

}

// ==========================================
// RECONNECT
// ==========================================

function scheduleReconnect() {

  if (reconnectTimer) {
    return
  }

  reconnectAttempts++

  const delay =
    Math.min(
      5000 * reconnectAttempts,
      30000
    )

  console.log(
    `[${BOT_NAME}] 🔄 Reconnecting after ${delay / 1000}s...`
  )

  reconnectTimer =
    setTimeout(
      async () => {

        reconnectTimer = null

        try {

          if (sock) {

            try {
              sock.end(undefined)
            } catch {}

          }

        } catch {}

        sock = null

        await startWhatsApp()

      },
      delay
    )

}

// ==========================================
// GET PAIRING CODE
// ==========================================

async function getPairingCode(number) {

  number = cleanNumber(number)

  if (!number) {

    throw new Error(
      'WhatsApp number is required'
    )

  }

  if (!/^\d{8,15}$/.test(number)) {

    throw new Error(
      'Invalid WhatsApp number'
    )

  }

  prepareAuthDir()

  // ========================================
  // IF ALREADY REGISTERED
  // ========================================

  if (
    state?.creds?.registered
  ) {

    return {

      alreadyRegistered: true,

      code: null

    }

  }

  // ========================================
  // START SOCKET IF NEEDED
  // ========================================

  if (!sock) {

    await startWhatsApp()

  }

  // ========================================
  // WAIT FOR SOCKET
  // ========================================

  for (
    let i = 0;
    i < 20;
    i++
  ) {

    if (sock) {
      break
    }

    await new Promise(
      resolve =>
        setTimeout(resolve, 1000)
    )

  }

  if (!sock) {

    throw new Error(
      'WhatsApp socket is not available'
    )

  }

  // ========================================
  // CHECK AGAIN
  // ========================================

  if (
    state?.creds?.registered
  ) {

    return {

      alreadyRegistered: true,

      code: null

    }

  }

  pairingNumber = number

  console.log('')
  console.log('======================================')
  console.log(
    `🔑 Requesting pairing code for ${number}`
  )
  console.log('======================================')

  // ========================================
  // REQUEST CODE
  // ========================================

  const code =
    await sock.requestPairingCode(number)

  pairingCode = code

  console.log('')
  console.log('======================================')
  console.log(`🔑 PAIRING CODE: ${code}`)
  console.log(`📱 NUMBER: ${number}`)
  console.log('======================================')
  console.log('')

  return {

    alreadyRegistered: false,

    code

  }

}

// ==========================================
// HOME
// ==========================================

app.get('/', (req, res) => {

  res.json({

    success: true,

    name: BOT_NAME,

    message:
      'DAMAR-MD API is online 🚀',

    status:
      connectionStatus,

    endpoints: {

      status:
        '/api/status',

      pair:
        '/api/pair?number=212XXXXXXXXX'

    }

  })

})

// ==========================================
// STATUS
// ==========================================

app.get(
  '/api/status',
  (req, res) => {

    res.json({

      success: true,

      bot: BOT_NAME,

      status:
        connectionStatus,

      connected:
        connectionStatus === 'connected',

      registered:
        !!state?.creds?.registered,

      number:
        pairingNumber || null,

      pairingCode:
        pairingCode || null,

      lastError

    })

  }
)

// ==========================================
// STATUS ALIAS
// ==========================================

app.get(
  '/status',
  (req, res) => {

    res.json({

      success: true,

      bot: BOT_NAME,

      status:
        connectionStatus,

      connected:
        connectionStatus === 'connected',

      registered:
        !!state?.creds?.registered,

      number:
        pairingNumber || null,

      pairingCode:
        pairingCode || null,

      lastError

    })

  }
)

// ==========================================
// GET PAIR
// ==========================================

app.get(
  '/api/pair',
  async (req, res) => {

    try {

      const number =
        cleanNumber(
          req.query.number
        )

      if (!number) {

        return res.status(400).json({

          success: false,

          error:
            'ضع رقم الواتساب بدون +'

        })

      }

      const result =
        await getPairingCode(number)

      if (
        result.alreadyRegistered
      ) {

        return res.json({

          success: true,

          registered: true,

          connected:
            connectionStatus === 'connected',

          message:
            'هذا الرقم مربوط مسبقا بالجلسة'

        })

      }

      return res.json({

        success: true,

        registered: false,

        number,

        code: result.code,

        pairingCode: result.code,

        status:
          connectionStatus,

        message:
          'دخل هذا الكود في WhatsApp > الأجهزة المرتبطة'

      })

    } catch (error) {

      console.error(
        `[${BOT_NAME}] ❌ Pairing error:`,
        error
      )

      return res.status(500).json({

        success: false,

        error:
          error?.message ||
          'Failed to generate pairing code',

        status:
          connectionStatus

      })

    }

  }
)

// ==========================================
// POST PAIR
// ==========================================

app.post(
  '/api/pair',
  async (req, res) => {

    try {

      const number =
        cleanNumber(
          req.body?.number
        )

      if (!number) {

        return res.status(400).json({

          success: false,

          error:
            'WhatsApp number required'

        })

      }

      const result =
        await getPairingCode(number)

      if (
        result.alreadyRegistered
      ) {

        return res.json({

          success: true,

          registered: true,

          connected:
            connectionStatus === 'connected',

          message:
            'هذا الرقم مربوط مسبقا بالجلسة'

        })

      }

      return res.json({

        success: true,

        number,

        code: result.code,

        pairingCode: result.code,

        registered: false,

        status:
          connectionStatus,

        message:
          'دخل الكود في WhatsApp > الأجهزة المرتبطة'

      })

    } catch (error) {

      console.error(
        `[${BOT_NAME}] POST pairing error:`,
        error
      )

      return res.status(500).json({

        success: false,

        error:
          error?.message ||
          String(error),

        status:
          connectionStatus

      })

    }

  }
)

// ==========================================
// HEALTH
// ==========================================

app.get(
  '/health',
  (req, res) => {

    res.json({

      ok: true,

      bot: BOT_NAME,

      status:
        connectionStatus,

      uptime:
        process.uptime()

    })

  }
)

// ==========================================
// 404
// ==========================================

app.use(
  (req, res) => {

    res.status(404).json({

      success: false,

      error:
        'Endpoint not found',

      bot:
        BOT_NAME

    })

  }
)

// ==========================================
// SERVER
// ==========================================

app.listen(
  PORT,
  '0.0.0.0',
  () => {

    console.log('')
    console.log('======================================')
    console.log(`🚀 ${BOT_NAME} API STARTED`)
    console.log('======================================')
    console.log(`📡 PORT: ${PORT}`)
    console.log(
      `🌐 Railway PORT: ${process.env.PORT || 'auto'}`
    )
    console.log(`📁 AUTH: ${AUTH_DIR}`)
    console.log('======================================')
    console.log('')

  }
)

// ==========================================
// START WHATSAPP
// ==========================================

startWhatsApp()

// ==========================================
// SHUTDOWN
// ==========================================

async function shutdown(signal) {

  console.log(
    `[${BOT_NAME}] 🛑 ${signal} received`
  )

  try {

    if (sock) {
      sock.end(undefined)
    }

  } catch {}

  process.exit(0)

}

process.on(
  'SIGTERM',
  () => shutdown('SIGTERM')
)

process.on(
  'SIGINT',
  () => shutdown('SIGINT')
)

process.on(
  'uncaughtException',
  error => {

    console.error(
      `[${BOT_NAME}] ❌ UNCAUGHT EXCEPTION:`,
      error
    )

  }
)

process.on(
  'unhandledRejection',
  error => {

    console.error(
      `[${BOT_NAME}] ❌ UNHANDLED REJECTION:`,
      error
    )

  }
)