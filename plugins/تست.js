let handler = async (m, { conn, command }) => {
    
    let user = global.db.data.users[m.sender]
    if (!user) {
        user = global.db.data.users[m.sender] = {
            name: m.pushName,
            exp: 0,
            level: 1,
            testCount: 0
        }
    }

    let devName = 'ابو دمار شامل'
    let devPhone = '+212 633-226499'
    let devFb = 'https://www.facebook.com/profile.php?id=61591783185803'
    let img = 'https://cdn.zass.in/nkPYlKd6FQ.jpeg'
    let botName = 'DAMAR-MD'
    let version = '2026.1.0'

    if(command == 'تست' || command == 'test' || command == 'ping'){
        user.testCount += 1
        user.exp += 10

        let totalUsers = Object.keys(global.db.data.users).length
        let runtime = process.uptime()
        let hours = Math.floor(runtime / 3600)
        let minutes = Math.floor(runtime / 60) % 60

        let txt = `╭───『 *${botName}* 』───╮
│ 🤖 *الحالة:* شغال 100% ✅
│ 📦 *الاصدار:* v${version}
│ ⏱️ *مدة التشغيل:* ${hours}h ${minutes}m
│ 👥 *المستخدمين:* ${totalUsers}
╰──────────────────╯

╭───『 *معلوماتك* 』───╮
│ 👤 *الاسم:* ${user.name}
│ 📊 *المستوى:* ${user.level}
│ ⚡ *الخبرة:* ${user.exp}
│ 🔁 *عدد الفحص:* ${user.testCount}
╰──────────────────╯

╭───『 *المطور* 』───╮
│ 👑 *الاسم:* ${devName}
│ 📱 *الواتساب:* ${devPhone}
│ 📘 *الفيسبوك:* اضغط الصورة لتحت
╰──────────────────╯`.trim()

        if(user.testCount % 10 == 0){
            user.level += 1
            await conn.reply(m.chat, `🎊 تهانينا ${user.name} لقد ارتقيت الى المستوى ${user.level} 🎊`, m)
        }

        await conn.sendMessage(m.chat, {
            image: { url: img },
            caption: txt,
            footer: `© ${botName} - 2026`,
            buttons: [
                { buttonId: '.menu', buttonText: { displayText: '📜 القائمة' }, type: 1 },
                { buttonId: '.owner', buttonText: { displayText: '👑 المطور' }, type: 1 }
            ],
            headerType: 4,
            contextInfo: {
                externalAdReply: {
                    title: `${botName} - الصفحة الرسمية`,
                    body: "تابع ابو دمار شامل على فيسبوك",
                    thumbnailUrl: img,
                    sourceUrl: devFb,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m })
    }

    if(command == 'owner'){
        let txt = `╭───『 *المطور الرسمي* 』───╮
│
│ 👑 *الاسم:* ${devName}
│ 📱 *واتساب:* ${devPhone}
│ 📘 *فيسبوك:* اضغط على الصورة
│ 🤖 *البوت:* ${botName} v${version}
│
│ _اي مشكل او اقتراح تواصل معايا_
╰──────────────────╯`.trim()

        await conn.sendMessage(m.chat, {
            image: { url: img },
            caption: txt,
            footer: botName,
            headerType: 4,
            contextInfo: {
                externalAdReply: {
                    title: "ابو دمار شامل",
                    body: "المطور الرسمي لبوت DAMAR-MD",
                    thumbnailUrl: img,
                    sourceUrl: devFb,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m })
    }
}

handler.command = ['تست','test','ping','owner','المطور']
handler.help = ['تست', 'owner']
handler.tags = ['main']
handler.limit = false
export default handler