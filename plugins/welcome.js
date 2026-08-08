// ====================================================
// 🇲🇦 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 | GLOBAL WELCOME CONTROL
// 👨‍💻 Developer: ابو دمار شامل
// 📱 +212 633-226499
// ====================================================

const BOT_NAME = '𝐃𝐀𝐌𝐀𝐑-𝐌𝐃'
const DEV_NAME = 'ابو دمار شامل'
const DEV_NUMBER = '+212 633-226499'

let handler = async (m, { conn, args, isOwner }) => {

    // الأمر خاص بمالك البوت
    if (!isOwner) {
        return m.reply(
`⛔ *هاد الأمر خاص بمالك البوت.*

🤖 البوت: ${BOT_NAME}
👨‍💻 المطور: ${DEV_NAME}`
        )
    }

    const option = String(args[0] || '').toLowerCase()

    if (!['on', 'off'].includes(option)) {
        return m.reply(
`🇲🇦 *${BOT_NAME} | WELCOME*

استعمل:

✅ *.welcome on*
لتشغيل الترحيب والوداع فـ جميع المجموعات.

🛑 *.welcome off*
لإيقاف الترحيب والوداع فـ جميع المجموعات.

👨‍💻 ${DEV_NAME}
📱 ${DEV_NUMBER}`
        )
    }

    const enabled = option === 'on'

    let groups = new Set()

    // المجموعات الموجودة في قاعدة البيانات
    for (const jid of Object.keys(global.db.data.chats || {})) {
        if (jid.endsWith('@g.us')) {
            groups.add(jid)
        }
    }

    // المجموعات الموجودة حالياً في الاتصال
    for (const jid of Object.keys(conn.chats || {})) {
        if (jid.endsWith('@g.us')) {
            groups.add(jid)
        }
    }

    let total = 0

    // تفعيل / إيقاف جميع المجموعات
    for (const jid of groups) {

        if (!global.db.data.chats[jid]) {
            global.db.data.chats[jid] = {}
        }

        global.db.data.chats[jid].welcome = enabled

        // النص المغربي
        global.db.data.chats[jid].sWelcome =
`🇲🇦 *مرحبا بيك @user*

نورت مجموعة *@subject* ❤️

👥 عدد الأعضاء: *@members*

🤖 *${BOT_NAME}*

📌 مرحبا بيك بين خوتك، قرا قوانين المجموعة واستمتع معانا 🇲🇦❤️`

        global.db.data.chats[jid].sBye =
`👋 *بالسلامة @user*

غادي توحشنا خويا 😔

📌 مجموعة: *@subject*

🤖 *${BOT_NAME}*

❤️ الله يعاونك فين ما كنت.`

        total++
    }

    // حفظ قاعدة البيانات
    try {
        if (typeof global.db.write === 'function') {
            await global.db.write()
        }
    } catch (e) {
        console.log('DB WRITE ERROR:', e)
    }

    if (enabled) {

        return m.reply(
`╭━━━〔 🇲🇦 ${BOT_NAME} 〕━━━╮

✅ *WELCOME ON*

خدام دابا فـ جميع المجموعات.

👥 عدد المجموعات: *${total}*

👋 ملي يدخل شي واحد:
*غادي يوصله الترحيب.*

👋 ملي يخرج شي واحد:
*غادي توصله رسالة الوداع.*

🤖 البوت: *${BOT_NAME}*
👨‍💻 المطور: *${DEV_NAME}*
📱 ${DEV_NUMBER}

╰━━━━━━━━━━━━━━━━━━╯`
        )

    } else {

        return m.reply(
`╭━━━〔 🇲🇦 ${BOT_NAME} 〕━━━╮

🛑 *WELCOME OFF*

توقف الترحيب والوداع فـ جميع المجموعات.

👥 عدد المجموعات: *${total}*

🤖 البوت: *${BOT_NAME}*
👨‍💻 المطور: *${DEV_NAME}*

╰━━━━━━━━━━━━━━━━━━╯`
        )
    }
}

handler.help = [
    'welcome on',
    'welcome off'
]

handler.tags = [
    'owner'
]

handler.command = /^welcome$/i

handler.owner = true

export default handler