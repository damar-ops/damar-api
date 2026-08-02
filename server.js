import express from 'express'
import { default as makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import cors from 'cors'
import fs from 'fs'
import path from 'path'

const app = express()
app.use(express.json())
app.use(cors())
const PORT = process.env.PORT || 3000 // مهم ل Render
const SESSIONS_DIR = '/tmp/sessions' // Render كيمسح الملفات من غير /tmp
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR)

const connections = {}

async function getConnection(serverId) {
    if (connections[serverId]) return connections[serverId]
    const sessionPath = path.join(SESSIONS_DIR, serverId)
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
    const sock = makeWASocket({ auth: state, printQRInTerminal: false, browser: ['DAMAR-MD', 'Chrome', '1.0.0'] })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode!== DisconnectReason.loggedOut
            if (shouldReconnect) { delete connections[serverId]; setTimeout(()=>getConnection(serverId), 3000) }
        }
        if (connection === 'open') console.log(`✅ ${serverId} خدام`)
    })
    connections[serverId] = sock
    return sock
}

app.post('/api/getcode', async (req, res) => {
    const { number, server } = req.body
    const cleanNumber = number.replace(/[^0-9]/g, '')
    try {
        const conn = await getConnection(server)
        if (conn.user) return res.status(400).json({ success: false, message: 'السيرفر عامر. ختار واحد اخر' })
        const code = await conn.requestPairingCode(cleanNumber)
        const formattedCode = code.match(/.{1,4}/g).join('-')
        await conn.sendMessage(cleanNumber + '@s.whatsapp.net', { text: `🔑 كود الربط DAMAR-MD: *${formattedCode}*\nدخلو فـ الاجهزة المرتبطة` }).catch(()=>{})
        res.json({ success: true, code: formattedCode })
    } catch(e) {
        console.log(e)
        res.status(500).json({ success: false, message: e.message })
    }
})

app.get('/', (req,res)=>res.send('DAMAR-MD API is running'))
app.listen(PORT, () => console.log(`🚀 خدام على ${PORT}`))