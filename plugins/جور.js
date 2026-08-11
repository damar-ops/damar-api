let handler = async (m, { conn, text }) => {
    // الى مكتبش والو من بعد النقطة
    if (!text) {
        return conn.reply(
            m.chat,
`🟨 *مول النص الصفر* 🟨

هاد الأمر كيرد عليك بالكلمة لي كتبتي فخلفية صفراء

📖 *طريقة الاستعمال:*
.جور النص ديالك هنا

✅ *مثال:*
.جور مرحبا بيك

البوت غادي يرد:
🟨 مرحبا بيك`,
            m
        )
    }

    // صيفط النص بين 2 == باش يبان هايلايت اصفر فبعض التطبيقات المعدلة
    await new AIRich(conn)
        .addText(`=={ ${text} }==`)
        .send(m.chat, { quoted: m })
}

handler.help = ['جور']
handler.command = ['جور', 'yellow'] // تقدر تستعمل .جور ولا .yellow
handler.tags = ['tools']
handler.limit = false
export default handler