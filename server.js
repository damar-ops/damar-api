import express from 'express'
import cors from 'cors'
import { default as makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import fs from 'fs'
import path from 'path'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({ origin: "*" }))
app.use(express.json())

const SESSIONS_DIR = '/tmp/sessions' // مهم ل Railway باش ما يتمسحش
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR)
const connections = {}

async function getConnection(serverId) {
    if (connections[serverId]) return connections[serverId]
    const sessionPath = path.join(SESSIONS_DIR, serverId)
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['DAMAR-MD', 'Chrome', '1.0.0'],
        markOnlineOnConnect: false // زدتها باش ما يبانش اونلاين
    })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', (u) => {
        const { connection, lastDisconnect } = u
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode!== DisconnectReason.loggedOut
            if(shouldReconnect) delete connections[serverId] // عاود الربط الى طاح
        }
    })
    connections[serverId] = sock
    return sock
}

app.get('/', (req,res)=> res.json({status: "DAMAR-API 50 Servers Running"}))

app.post('/code', async (req, res) => {
    try{
        const { number, server, owner, botName } = req.body
        if(!number ||!server ||!owner) return res.status(400).json({message: 'ناقصين معلومات'})

        const cleanNumber = number.replace(/[^0-9]/g, '')
        const ownerJid = owner.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
        const conn = await getConnection(server)

        if (conn.user) return res.status(400).json({ success: false, message: 'هاد السيرفر عامر. ختار واحد اخر' })

        const code = await conn.requestPairingCode(cleanNumber)
        const formattedCode = code.match(/.{1,4}/g).join('-')

        await conn.sendMessage(cleanNumber + '@s.whatsapp.net', {text: `🔑 كود ${botName}: ${formattedCode}\nدخلو فـ الاجهزة المرتبطة`}).catch(()=>{})
        await conn.sendMessage(ownerJid, {text: `🚨 طلب جديد!\n👤 النمرة: ${cleanNumber}\n🖥️ السيرفر: ${server}\n🔑 الكود: ${formattedCode}\n\n${botName}`}).catch(()=>{})

        res.json({ success: true, code: formattedCode })
    }catch(e){
        console.log(e)
        res.status(500).json({ success: false, message: e.message })
    }
})

// باش Railway ما يطفيش - خلي غير وحدة
setInterval(() => {
    fetch(`http://localhost:${PORT}/`).catch(()=>{})
}, 280000) // كل 4 دقايق

app.listen(PORT, () => console.log(`🚀 50 Server API خدام على ${PORT}`))