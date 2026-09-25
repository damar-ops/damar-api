// ═══════════════════════════════════════════════════════════════
// 🖼️ DAMAR-MD — PROFILE PICTURE
// الأوامر:
// .اون
// .On
//
// الاستعمال:
// .اون
// .اون 21234567890
// Reply على رسالة ثم .اون
// ═══════════════════════════════════════════════════════════════

let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        let target

        // ─────────────────────────────────────────────
        // 1️⃣ إذا كان الأمر Reply على رسالة
        // ─────────────────────────────────────────────
        if (m.quoted) {
            target = m.quoted.sender
        }

        // ─────────────────────────────────────────────
        // 2️⃣ إذا كان Mention
        // ─────────────────────────────────────────────
        if (!target && m.mentionedJid?.length) {
            target = m.mentionedJid[0]
        }

        // ─────────────────────────────────────────────
        // 3️⃣ إذا كتب رقم
        // ─────────────────────────────────────────────
        if (!target && text) {
            let number = text.replace(/[^\d]/g, '')

            if (!number) {
                return m.reply(
                    `❌ الرقم غير صالح.\n\n` +
                    `مثال:\n` +
                    `${usedPrefix}${command} 212600000000`
                )
            }

            target = number + '@s.whatsapp.net'
        }

        // ─────────────────────────────────────────────
        // 4️⃣ إذا لم يحدد شخصاً
        // ─────────────────────────────────────────────
        if (!target) {
            target = m.sender
        }

        // ─────────────────────────────────────────────
        // جلب صورة البروفايل
        // ─────────────────────────────────────────────
        let ppUrl

        try {
            ppUrl = await conn.profilePictureUrl(target, 'image')
        } catch {
            // بعض الحسابات لا تسمح بجلب الصورة العالية
            try {
                ppUrl = await conn.profilePictureUrl(target, 'preview')
            } catch {
                ppUrl = null
            }
        }

        // ─────────────────────────────────────────────
        // لا توجد صورة
        // ─────────────────────────────────────────────
        if (!ppUrl) {
            return m.reply(
                `❌ ما لقيتش صورة البروفايل ديال هاد الحساب.`
            )
        }

        // ─────────────────────────────────────────────
        // إرسال الصورة
        // ─────────────────────────────────────────────
        await conn.sendMessage(
            m.chat,
            {
                image: { url: ppUrl },
                caption:
                    `🖼️ *صورة البروفايل*\n\n` +
                    `👤 @${target.split('@')[0]}\n` +
                    `🤖 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃`,
                mentions: [target]
            },
            { quoted: m }
        )

    } catch (error) {
        console.error('PROFILE PICTURE ERROR:', error)

        return m.reply(
            `❌ وقع مشكل وأنا كنحاول نجيب صورة البروفايل.\n\n` +
            `🔄 عاود جرب من جديد.`
        )
    }
}

handler.help = ['اون']
handler.tags = ['tools']
handler.command = /^(اون|on)$/i

export default handler