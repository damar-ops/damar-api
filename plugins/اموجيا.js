let handler = async (m, { conn }) => {
    // لائحة الإيموجيات لي بغيتي
    const emojis = ['😍','😘','😔','🥺','😂','❤️','😭','😡','🤩','😎','🥰','😴','🤗','😱','😈']

    // صيفط أول رسالة و شد الـ key ديالها
    let msg = await conn.sendMessage(m.chat, { text: emojis[0] })

    let i = 1
    const max = emojis.length // غادي يدور على كاع الإيموجيات

    const interval = setInterval(async () => {
        if (i >= max) {
            clearInterval(interval)
            return conn.sendMessage(m.chat, { text: "✅ سالا العرض" }, { quoted: msg })
        }

        try {
            // عدل نفس الرسالة و بدل الإيموجي
            await conn.sendMessage(m.chat, {
                text: emojis[i],
                edit: msg.key
            })
            i++
        } catch(e) {
            clearInterval(interval) // إلا تحبس الكونيكسيون يحبس
        }
    }, 1000) // كل 1 ثانية يتبدل. بدلها ل 500 إلا بغيتيه سريع
}

handler.help = ['اموجيا']
handler.tags = ['fun']
handler.command = ['اموجيا']

export default handler