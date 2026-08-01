//translate and modified by ابو دمار شامل
//plugin by Izuku-mi
//Bot: DAMAR-MD | +212 633-226499

import axios from "axios"
import crypto from "crypto"
import yts from "yt-search"

const handler = async (m, { text, conn }) => {
    try {
        if (!text) return m.reply("⚠️ *DAMAR-MD* \nشنو سميت الاغنية اللي باغي؟\nمثال:.song maher zain")

        await m.react('⏳') // تفاعل ملي كيبدا التحميل

        const { all } = await yts(text)
        const metadata = all[0]
        if (!metadata) {
            await m.react('❌')
            return m.reply("❌ *DAMAR-MD* \nمالقيتش هاد الاغنية، جرب سميتها بالانجليزية")
        }

        const url = metadata.url

        const client = axios.create({
            headers: {
                "content-type": "application/json",
                "origin": "https://yt.savetube.me",
                "user-agent": "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36"
            }
        })

        // نجيبو ID ديال الفيديو
        const idMatch = url.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/)
        if (!idMatch) throw new Error("رابط يوتيوب خاطئ")

        const videoId = idMatch[1]

        // نجيبو CDN
        const { data: cdnRes } = await client.get("https://media.savetube.vip/api/random-cdn")
        const cdn = cdnRes.cdn

        // نجيبو المعلومات مشفرة
        const { data: infoRes } = await client.post(`https://${cdn}/v2/info`, {
            url: `https://www.youtube.com/watch?v=${videoId}`
        })

        // نفكو التشفير
        const encrypted = Buffer.from(infoRes.data, "base64")
        const key = Buffer.from("C5D58EF67A7584E4A29F6C35BBC4EB12", "hex")
        const iv = encrypted.subarray(0, 16)

        const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv)
        const decrypted = Buffer.concat([
            decipher.update(encrypted.subarray(16)),
            decipher.final()
        ])

        const meta = JSON.parse(decrypted.toString())

        // نطلبو الرابط ديال التحميل
        const { data: dlRes } = await client.post(`https://${cdn}/download`, {
            id: videoId,
            downloadType: "audio",
            quality: "128",
            key: meta.key
        })

        const download = dlRes?.data?.downloadUrl
        if (!download) throw new Error("ماقدرتش نجيب رابط التحميل")

        const caption = `🎵 *DAMAR-MD SONG DOWNLOADER*
━━━━━━━━
📌 *العنوان:* ${metadata.title || "مجهول"}
👤 *الفنان:* ${metadata.author?.name || "مجهول"}
⏱ *المدة:* ${metadata.timestamp || "مجهول"}
🔗 *الرابط:* ${metadata.url}
━━━━━━━━
*👑 المطور: ابو دمار شامل*
*📞 +212 633-226499*`

        // نصيفطو الصورة ديال الاغنية
        await conn.sendMessage(
            m.chat,
            {
                image: { url: meta.thumbnail },
                caption
            },
            { quoted: m }
        )

        // نصيفطو الاغنية MP3 عادي
        await conn.sendMessage(
            m.chat,
            {
                audio: { url: download },
                mimetype: "audio/mpeg", // MP3 عادي
                fileName: `${metadata.title}.mp3` // سميت الملف
            },
            { quoted: m }
        )

        await m.react('✅') // تفاعل ملي كيسالي

    } catch (e) {
        console.error(e)
        await m.react('❌')
        m.reply("❌ *DAMAR-MD* \nوقع خطأ فالتحميل \nيمكن الضغط بزاف على السيرفر، عاود جرب من بعد")
    }
}

handler.help = ["song <سمية الاغنية>"] // تبدلت هنا
handler.tags = ["DAMAR-MD"]
handler.command = ["song", "شغل", "اغنية"] // حذفت music وزدت song
export default handler