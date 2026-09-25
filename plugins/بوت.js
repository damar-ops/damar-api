// ═══════════════════════════════════════════════════════════════
// 👑 DAMAR-MD — BOT STATUS
// .بوت | .البوت | .اين
// ═══════════════════════════════════════════════════════════════

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

let handler = async (m, { conn }) => {
    try {
        const imageUrl = 'https://cdn.zass.in/61qmqsMwI8.jpeg'

        const text = `*╭━─━─━─━─━─━─━─━─━╮*
*┃ ⚡ 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 𝐎𝐍𝐋𝐈𝐍𝐄 ⚡ ┃*
*╰━─━─━─━─━─━─━─━─━╯*

*أنا هنا معك الآن يا أسطورة 👑🔥*

*أنا اسمي 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃*
*البوت الأقوى والأسرع على الإطلاق 🚀*
*صممـني وصنعـني بكل فخر الأب الروحي*
*👑 أبو دمار شامل 👑*

*أنا لم أصنع لكي أكون مجرد بوت عادي ❌*
*أنا صنعت لكي أكون جيشك، سلاحك، ودراعك اليمين في كل شي 💪*

*تحتاج تحميل؟ أنا موجود 📥*
*تحتاج بحث؟ أنا موجود 🔍*
*تحتاج ألعاب، ملصقات، تعديل صور، ذكاء اصطناعي؟*
*أنا موجود لكل شي 😎*

*فقط اؤمرني وانا اطبق*
*اطلب ما تريده، واترك الباقي علي*
*أنا هنا لخدمتك 24 ساعة بدون توقف ⚡*

*『 اطلب.. تمنى.. وأنا أنفذ 🚩 』*`

        // ─────────────────────────────────────────
        // 📸 إرسال الصورة
        // ─────────────────────────────────────────

        await conn.sendMessage(
            m.chat,
            {
                image: { url: imageUrl }
            },
            { quoted: m }
        )

        // ─────────────────────────────────────────
        // 📝 إرسال رسالة البداية
        // ─────────────────────────────────────────

        const msg = await conn.sendMessage(
            m.chat,
            {
                text: '⚡ 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 𝐎𝐍𝐋𝐈𝐍𝐄 ⚡'
            },
            { quoted: m }
        )

        // ─────────────────────────────────────────
        // ⌨️ الكتابة تدريجياً
        // ─────────────────────────────────────────

        let current = ''

        // نخلي التعديل كل حرفين باش ما نضغطوش
        // على WhatsApp بزاف ديال التعديلات
        let counter = 0

        for (const char of text) {
            current += char
            counter++

            if (counter >= 2 || char === '\n') {
                try {
                    await conn.sendMessage(
                        m.chat,
                        {
                            text: current,
                            edit: msg.key
                        }
                    )
                } catch (e) {
                    console.log('EDIT ERROR:', e.message)
                    break
                }

                counter = 0
                await sleep(70)
            }
        }

        // ─────────────────────────────────────────
        // ✅ النص النهائي
        // ─────────────────────────────────────────

        try {
            await conn.sendMessage(
                m.chat,
                {
                    text: text,
                    edit: msg.key
                }
            )
        } catch (e) {
            console.log('FINAL EDIT ERROR:', e.message)
        }

    } catch (error) {
        console.error('BOT ERROR:', error)

        await m.reply(
            `❌ *𝐃𝐀𝐌𝐀𝐑-𝐌𝐃*\n\n` +
            `وقع خطأ أثناء تشغيل الأمر.\n\n` +
            `📌 ${error?.message || 'خطأ غير معروف'}`
        )
    }
}

handler.help = ['بوت', 'البوت', 'اين']
handler.tags = ['info']
handler.command = /^(بوت|البوت|اين)$/i

export default handler