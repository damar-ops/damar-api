import express from 'express'
import cors from 'cors'
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import fs from 'fs'
import path from 'path'
import P from 'pino'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({ origin: "*" }))
app.use(express.json())

const SESSIONS_DIR = '/tmp/sessions'
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR)
const connections = {}

async function getConnection(serverId) {
    if (connections[serverId]) return connections[serverId]
    const sessionPath = path.join(SESSIONS_DIR, serverId)
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
    const { version } = await fetchLatestBaileysVersion() // مهم باش ما يحضركش

    const sock = makeWASocket({
        version,
        auth: state,
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['DAMAR-MD', 'Chrome', '120.0.0'], // بدلنا الاصدار
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
    })

    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', (u) => {
        const { connection, lastDisconnect } = u
        if (connection === 'close') {
            const code = lastDisconnect.error?.output?.statusCode
            console.log("Connection Closed:", code)
            if (code!== DisconnectReason.loggedOut) {
                delete connections[serverId]
            }
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

        await new Promise(resolve => setTimeout(resolve, 2000)) // نعطيو 2 ثواني باش الاتصال يستقر

        const code = await conn.requestPairingCode(cleanNumber)
        const formattedCode = code.match(/.{1,4}/g).join('-')

        await conn.sendMessage(cleanNumber + '@s.whatsapp.net', {text: `🔑 كود ${botName}: ${formattedCode}`}).catch(()=>{})
        await conn.sendMessage(ownerJid, {text: `🚨 طلب جديد\n👤 النمرة: ${cleanNumber}\n🖥️ السيرفر: ${server}\n🔑 الكود: ${formattedCode}`}).catch(()=>{})

        res.json({ success: true, code: formattedCode })
    }catch(e){
        console.log("ERROR:", e)
        res.status(500).json({ success: false, message: e.message })
    }
})

setInterval(() => { fetch(`http://localhost:${PORT}/`).catch(()=>{}) }, 280000)

app.listen(PORT, () => console.log(`🚀 DAMAR-API خدام على ${PORT}`))