import axios from "axios"
import { createDecipheriv } from "node:crypto"
import yts from "yt-search"

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const handler = async (m, { text, conn }) => {
    try {
        if (!text) {
            return m.reply(
                "⚠️ *DAMAR-MD*\n\n" +
                "شنو سميت الأغنية اللي باغي؟\n" +
                "مثال: .song maher zain"
            )
        }

        await m.react("⏳")

        const search = await yts(text)
        const metadata = search?.videos?.[0]

        if (!metadata) {
            await m.react("❌")
            return m.reply(
                "❌ *DAMAR-MD*\n\n" +
                "مالقيتش هاد الأغنية، جرب اسم آخر."
            )
        }

        const videoUrl = metadata.url
        const videoId = extractVideoId(videoUrl)

        if (!videoId) {
            throw new Error("YouTube Video ID غير صالح")
        }

        const youtubeUrl =
            `https://www.youtube.com/watch?v=${videoId}`

        const client = axios.create({
            timeout: 30000,
            headers: {
                "Accept": "application/json, text/plain, */*",
                "Content-Type": "application/json",
                "Origin": "https://yt.savetube.me",
                "Referer": "https://yt.savetube.me/",
                "User-Agent":
                    "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 " +
                    "(KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"
            }
        })

        // =========================
        // GET CDN
        // =========================

        let cdn = null

        for (let i = 1; i <= 3; i++) {
            try {
                const { data } = await client.get(
                    "https://media.savetube.vip/api/random-cdn"
                )

                if (data?.cdn) {
                    cdn = String(data.cdn)
                        .replace(/^https?:\/\//, "")
                        .replace(/\/+$/, "")

                    break
                }

                throw new Error("CDN غير موجود")
            } catch (err) {
                console.log(
                    `SaveTube CDN ${i}:`,
                    err?.message
                )

                if (i < 3) {
                    await sleep(i * 1500)
                }
            }
        }

        if (!cdn) {
            throw new Error(
                "SaveTube CDN غير متاح حالياً"
            )
        }

        // =========================
        // VIDEO INFO
        // =========================

        let infoRes = null

        for (let i = 1; i <= 3; i++) {
            try {
                const response = await client.post(
                    `https://${cdn}/v2/info`,
                    {
                        url: youtubeUrl
                    }
                )

                if (!response?.data) {
                    throw new Error(
                        "SaveTube لم يرجع معلومات"
                    )
                }

                infoRes = response.data
                break
            } catch (err) {
                console.log(
                    `SaveTube INFO ${i}:`,
                    err?.message
                )

                if (i < 3) {
                    await sleep(i * 2000)
                }
            }
        }

        if (!infoRes) {
            throw new Error(
                "فشل الحصول على معلومات الفيديو"
            )
        }

        // =========================
        // DECRYPT INFO
        // =========================

        let meta

        try {
            let encryptedData = infoRes?.data

            /*
             * SaveTube غالباً كيرجع data مشفرة
             * على شكل Base64.
             */

            if (typeof encryptedData !== "string") {
                throw new Error(
                    "SaveTube رجع بيانات غير صالحة"
                )
            }

            const encrypted = Buffer.from(
                encryptedData,
                "base64"
            )

            if (encrypted.length < 17) {
                throw new Error(
                    "البيانات المشفرة ناقصة"
                )
            }

            const key = Buffer.from(
                "C5D58EF67A7584E4A29F6C35BBC4EB12",
                "hex"
            )

            const iv = encrypted.subarray(0, 16)

            // IMPORTANT:
            // استعملنا createDecipheriv مباشرة
            // بدل crypto.createDecipheriv

            const decipher = createDecipheriv(
                "aes-128-cbc",
                key,
                iv
            )

            const decrypted = Buffer.concat([
                decipher.update(
                    encrypted.subarray(16)
                ),
                decipher.final()
            ])

            meta = JSON.parse(
                decrypted.toString("utf8")
            )

        } catch (err) {
            console.error(
                "SaveTube decrypt error:",
                err
            )

            throw new Error(
                "فشل فك معلومات SaveTube: " +
                (err?.message || "Unknown error")
            )
        }

        if (!meta) {
            throw new Error(
                "SaveTube Meta غير موجود"
            )
        }

        // =========================
        // DOWNLOAD
        // =========================

        let downloadUrl = null

        for (let i = 1; i <= 3; i++) {
            try {
                const { data } = await client.post(
                    `https://${cdn}/download`,
                    {
                        id: videoId,
                        downloadType: "audio",
                        quality: "128",
                        key: meta.key
                    }
                )

                downloadUrl =
                    data?.data?.downloadUrl ||
                    data?.downloadUrl ||
                    data?.data?.url ||
                    data?.url

                if (downloadUrl) {
                    break
                }

                throw new Error(
                    "رابط التحميل غير موجود"
                )

            } catch (err) {
                console.log(
                    `SaveTube DOWNLOAD ${i}:`,
                    err?.message
                )

                if (i < 3) {
                    await sleep(i * 2000)
                }
            }
        }

        if (!downloadUrl) {
            throw new Error(
                "SaveTube لم يرجع رابط التحميل"
            )
        }

        // =========================
        // SONG INFO
        // =========================

        const title =
            metadata.title ||
            "DAMAR-MD Song"

        const artist =
            metadata.author?.name ||
            "Unknown"

        const duration =
            metadata.timestamp ||
            "غير معروف"

        const thumbnail =
            meta.thumbnail ||
            metadata.thumbnail

        const caption =
`🎵 *DAMAR-MD SONG DOWNLOADER*
━━━━━━━━━━━━━━━━
📌 *العنوان:* ${title}
👤 *الفنان:* ${artist}
⏱ *المدة:* ${duration}
🔗 *الرابط:* ${youtubeUrl}
━━━━━━━━━━━━━━━━
👑 *المطور:* ابو دمار شامل
📞 *+212 633-226499*
━━━━━━━━━━━━━━━━
⚡ *DAMAR-MD*`

        // =========================
        // THUMBNAIL
        // =========================

        if (thumbnail) {
            try {
                await conn.sendMessage(
                    m.chat,
                    {
                        image: {
                            url: thumbnail
                        },
                        caption
                    },
                    {
                        quoted: m
                    }
                )
            } catch {
                await m.reply(caption)
            }
        } else {
            await m.reply(caption)
        }

        // =========================
        // AUDIO
        // =========================

        await conn.sendMessage(
            m.chat,
            {
                audio: {
                    url: downloadUrl
                },
                mimetype: "audio/mpeg",
                fileName:
                    `${sanitizeFileName(title)}.mp3`
            },
            {
                quoted: m
            }
        )

        await m.react("✅")

    } catch (e) {
        console.error(
            "========== DAMAR-MD SONG ERROR =========="
        )
        console.error(e)
        console.error(
            "=========================================="
        )

        await m.react("❌")

        return m.reply(
            "❌ *DAMAR-MD*\n\n" +
            "وقع خطأ فالتحميل.\n\n" +
            "📌 السبب:\n" +
            `${e?.message || "خطأ غير معروف"}\n\n` +
            "🔄 عاود جرب من بعد."
        )
    }
}

// =========================
// YouTube ID
// =========================

function extractVideoId(url) {
    try {
        const parsed = new URL(url)

        if (
            parsed.hostname === "youtu.be" ||
            parsed.hostname.endsWith("youtu.be")
        ) {
            return parsed.pathname
                .replace("/", "")
                .split("/")[0]
        }

        if (
            parsed.hostname.includes("youtube.com")
        ) {
            const v =
                parsed.searchParams.get("v")

            if (v) return v

            const parts =
                parsed.pathname.split("/")

            const index =
                parts.findIndex(x =>
                    ["shorts", "embed", "live"]
                        .includes(x)
                )

            if (
                index !== -1 &&
                parts[index + 1]
            ) {
                return parts[index + 1]
            }
        }

        return null

    } catch {
        return null
    }
}

// =========================
// Filename
// =========================

function sanitizeFileName(name) {
    return String(name)
        .replace(
            /[<>:"/\\|?*\x00-\x1F]/g,
            ""
        )
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 100)
}

handler.help = [
    "song <اسم الأغنية>"
]

handler.tags = [
    "downloader"
]

handler.command = [
    "song",
    "شغل",
    "اغنية"
]

export default handler