import {
    default as makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers
} from 'baileys'

import fs from 'fs'
import path from 'path'
import { Boom } from '@hapi/boom'

const sessionsDir = path.join(process.cwd(), 'sessions')

// إنشاء مجلد sessions
if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true })
}

// الاتصالات الحالية
const activeBots = new Map()

async function startUserBot(phoneNumber, ownerJid) {
    const cleanNumber = phoneNumber.replace(/\D/g, '')

    if (!cleanNumber) {
        throw new Error('رقم غير صالح')
    }

    const sessionPath = path.join(sessionsDir, cleanNumber)

    // إذا كان البوت يعمل مسبقاً
    if (activeBots.has(cleanNumber)) {
        return {
            alreadyConnected: true,
            socket: activeBots.get(cleanNumber)
        }
    }

    if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true })
    }

    const { state, saveCreds } =
        await useMultiFileAuthState(sessionPath)

    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Chrome'),
        markOnlineOnConnect: false
    })

    activeBots.set(cleanNumber, sock)

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async update => {
        const {
            connection,
            lastDisconnect
        } = update

        if (connection === 'open') {
            console.log(
                `✅ Bot connected: ${cleanNumber}`
            )

            // إشعار للمستخدم بعد نجاح الربط
            try {
                await sock.sendMessage(ownerJid, {
                    text:
`╭━━〔 ✅ تم التنصيب 〕━━╮

🤖 رقمك أصبح بوتاً بنجاح!

📱 الرقم:
+${cleanNumber}

🟢 الحالة: متصل

╰━━━━━━━━━━━━━━━━━━╯`
                })
            } catch (e) {
                console.log(e)
            }
        }

        if (connection === 'close') {
            activeBots.delete(cleanNumber)

            const statusCode =
                new Boom(lastDisconnect?.error)
                    ?.output?.statusCode

            if (
                statusCode === DisconnectReason.loggedOut
            ) {
                console.log(
                    `❌ ${cleanNumber} قام بتسجيل الخروج`
                )

                try {
                    fs.rmSync(sessionPath, {
                        recursive: true,
                        force: true
                    })
                } catch {}

                return
            }

            console.log(
                `⚠️ ${cleanNumber} disconnected`
            )
        }
    })

    return {
        alreadyConnected: false,
        socket: sock
    }
}

let handler = async (m, {
    conn
}) => {

    const jid = m.sender

    // رقم المستخدم الذي أرسل الأمر
    const number =
        jid.split('@')[0].replace(/\D/g, '')

    if (!number) {
        return m.reply(
            '❌ لم أستطع معرفة رقم هاتفك.'
        )
    }

    // التحقق هل لديه Session موجودة
    const sessionPath =
        path.join(sessionsDir, number)

    if (
        fs.existsSync(sessionPath) &&
        fs.readdirSync(sessionPath).length > 0
    ) {
        if (activeBots.has(number)) {
            return m.reply(
`╭━━〔 🤖 بوتك يعمل 〕━━╮

رقمك مرتبط بالفعل ببوت.

📱 +${number}

🟢 الحالة: متصل

╰━━━━━━━━━━━━━━━━━━╯`
            )
        }
    }

    try {

        await m.reply(
`⏳ جارٍ إنشاء بوت خاص برقمك...

📱 الرقم:
+${number}

انتظر قليلاً...`
        )

        const result =
            await startUserBot(number, jid)

        if (result.alreadyConnected) {
            return m.reply(
                '✅ رقمك مرتبط بالفعل.'
            )
        }

        const sock = result.socket

        // إعطاء WhatsApp وقتاً لتهيئة الاتصال
        await new Promise(resolve =>
            setTimeout(resolve, 2500)
        )

        // طلب Pairing Code
        const code =
            await sock.requestPairingCode(number)

        const formatted =
            code
                ?.match(/.{1,4}/g)
                ?.join('-') || code

        await conn.sendMessage(
            jid,
            {
                text:
`╭━━〔 🔐 كود التنصيب 〕━━╮

🤖 تم إنشاء بوت خاص برقمك.

🔑 الكود:

*${formatted}*

━━━━━━━━━━━━━━━━

📱 الآن افتح WhatsApp في هاتفك:

1️⃣ الإعدادات
2️⃣ الأجهزة المرتبطة
3️⃣ ربط جهاز
4️⃣ الربط باستخدام رقم الهاتف
5️⃣ أدخل الكود الموجود فوق

⏳ بعد إدخال الكود انتظر حتى تظهر رسالة نجاح الربط.

⚠️ لا تشارك هذا الكود مع أي شخص.

╰━━━━━━━━━━━━━━━━━━╯`
            },
            {
                quoted: m
            }
        )

    } catch (error) {

        console.error(
            'INSTALL ERROR:',
            error
        )

        activeBots.delete(number)

        await m.reply(
`❌ حدث خطأ أثناء إنشاء البوت.

السبب:
${error?.message || 'خطأ غير معروف'}

حاول مرة أخرى بعد قليل.`
        )
    }
}

handler.help = ['تنصيب']
handler.tags = ['main']
handler.command = ['تنصيب', 'install']

export default handler