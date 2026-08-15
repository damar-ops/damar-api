// ====================================================
// 🇲🇦 DAMAR-MD | GLOBAL WELCOME CONTROL
// 👨‍💻 ابو دمار شامل
// ====================================================

const BOT_NAME = '𝐃𝐀𝐌𝐀𝐑-𝐌𝐃'
const DEV_NAME = 'ابو دمار شامل'
const DEV_NUMBER = '+212 633-226499'

let handler = async (m, { conn, args, isOwner }) => {

if (!isOwner) {
return m.reply(`
⛔ هاد الأمر غير للمالك.

🤖 ${BOT_NAME}
👨‍💻 ${DEV_NAME}
`)
}

let option = String(args[0] || '').toLowerCase()

if (!['on','off'].includes(option)) {
return m.reply(`
🇲🇦 ${BOT_NAME} | WELCOME

طريقة الاستعمال:

✅.welcome on
تشغيل الترحيب في جميع المجموعات

🛑.welcome off
إيقاف الترحيب في جميع المجموعات

👨‍💻 ${DEV_NAME}
`)
}

let status = option === 'on'
let groups = new Set()

// المجموعات من قاعدة البيانات
for (let jid of Object.keys(global.db.data.chats || {})) {
    if (jid.endsWith('@g.us')) {
        groups.add(jid)
    }
}

// المجموعات المتصلة حاليا
for (let jid of Object.keys(conn.chats || {})) {
    if (jid.endsWith('@g.us')) {
        groups.add(jid)
    }
}

let total = 0

for (let jid of groups) {

    if (!global.db.data.chats[jid]) {
        global.db.data.chats[jid] = {}
    }

    global.db.data.chats[jid].welcome = status

    // رسالة الترحيب الجديدة
    global.db.data.chats[jid].sWelcome = `╔═══━━━─── • ───━━━═══╗
          ⟡ 𓂀 DAMAR-MD 𓂀 ⟡
       👑 مَـمْـلَـكَـة دْيَـال دَمَـار 👑
╚═══━━━─── • ───━━━═══╝
╭─┈┈┈┈┈─╮
⟡ 𓆩 مَـرْحْـبَـا بْـالْـوَحْـش 𓆪 @user
⟡ 𓂀 دْخَـلْـتِي لْـبْـلَاصَـة مَـا كَـيْـدْخْـلْـهَـا غِـيـرْ كْـبَـار 𓂀
⟡ ⚡ يَـا تْـكُـونْ نَـار… يَـا تْـتْـحْـرَقْ ⚡
⟡ 𖤐 حْـنَـا كَـنْـصْـنْـعُـو تَـارِيـخ… مَـا كَـنْـقْـرَاوْهْـش 𖤐
╰─┈┈┈┈─╯
╭─┈┈┈─╮
⟡ الـمـجـمـوعـة: ◜⏤͟͞ @subject
⟡ الـقـوانـيـن: @desc
╰─┈┈─╯
 𓆩 ضِـيَـافْـتْـنَـا… عْـمَـرْهَـا مَـا تْـتْـنْـسَـى 𓆪
   ⟡ 𓂀 لَا مُـنَـافِـس… لَا حْـدُود… لَا مُـسْـتَـحِـيـل 𓂀 ⟡
   ⟡ 🔥 دَمَـار-بُـوت | الـمُـطَـوِّر: أَبُـو دَمَـار شَـامِـل 🔥 ⟡
╚════════╝`

    // رسالة الوداع الجديدة
    global.db.data.chats[jid].sBye = `╔═══━━━─── • ───━━━═══╗
            ⟡ 𓂀 DAMAR-MD 𓂀 ⟡
╚═══━━━─── • ───━━━═══╝
╭─┈┈┈─╮
⟡ @user ♯ قَـرَّرْ يْـهْـرَبْ 😂🚪
⟡ مْـعَ الـسَّـلَامَـة… اللِّي مَـا عَـجْـبُـوشْ الـحَـالْ
⟡ بْـرَّاا… بْـرَّاا… الـزِّيـبَـالَة كَـتْـخْـرُجْ 💨🗑️
╰─┈┈─╯
╭─┈┈┈┈┈┈┈┈┈─╮
⟡ 𓆩 الـمَـجْـمُـوعَـة تْـنَـقَّـاتْ… وَاحْـدْ ضْـعِـيـفْ نَـقَـصْ 𓆪
⟡ 𓂀 حْـنَـا مَـا كَـنْـبْـكْـيـوشْ عْـلَـى حْـدّ 𓂀
⟡ ⚡ الـبَـابْ يْـفُـوتْ جْـمَـلْ… وَحْـنَـا مَـكَـمّْـلِـيـنْ ⚡
╰─┈┈─╯
   ⟡ 🔥 لَا نِـدّ… لَا حَـدّ… غِـيـرْ دَمَـار 🔥 ⟡
╚════════╝`

    total++
}

try {
    if (typeof global.db.write === 'function') {
        await global.db.write()
    }
} catch(e) {
    console.log(e)
}

if(status){
    return m.reply(`
╭━━━〔 🇲🇦 ${BOT_NAME} 〕━━━╮

✅ WELCOME ON

تم تشغيل الترحيب والوداع
في جميع المجموعات.

👥 عدد المجموعات:
${total}

🤖 ${BOT_NAME}
👨‍💻 ${DEV_NAME}

╰━━━━━━━━━━━━━━━━━━╯
`)
}else{
    return m.reply(`
╭━━━〔 🇲🇦 ${BOT_NAME} 〕━━━╮

🛑 WELCOME OFF

تم إيقاف الترحيب والوداع
في جميع المجموعات.

👥 عدد المجموعات:
${total}

🤖 ${BOT_NAME}

╰━━━━━━━━━━╯
`)
}

} // <- هنا كان ناقص هاد القوس

handler.help = ['welcome on','welcome off']
handler.tags = ['owner']
handler.command = /^welcome$/i
handler.owner = true

export default handler