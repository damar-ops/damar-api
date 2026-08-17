import axios from "axios"
import { createDecipheriv } from "node:crypto"
import yts from "yt-search"

// ============================================================
// 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 MUSIC DOWNLOADER
// ============================================================

const BOT_NAME = "𝐃𝐀𝐌𝐀𝐑-𝐌𝐃"
const DEVELOPER = "أبو دمار شامل"
const DEVELOPER_NUMBER = "+212 633-226499"

const DEVELOPER_FACEBOOK = "https://www.facebook.com/profile.php?id=61591783185803"
const SONG_IMAGE = "https://cdn.zass.in/BkzOSUi6ba.jpeg"
const SEARCH_TTL = 10 * 60 * 1000
const MAX_RESULTS = 10
const MAX_AUDIO_SIZE = 100 * 1024 * 1024

// ============================================================
// SEARCH CACHE
// ============================================================

global.damarSongSearches = global.damarSongSearches || new Map()

// ============================================================
// SAFE STRING
// ============================================================

function safeString(value, fallback = "") {
    try {
        if (value === undefined || value === null) return fallback
        if (typeof value === "string") return value
        if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value)
        if (typeof value === "object") {
            if (typeof value.title === "string") return value.title
            if (typeof value.name === "string") return value.name
            if (typeof value.text === "string") return value.text
            if (typeof value.value === "string") return value.value
            try { return JSON.stringify(value) } catch { return fallback }
        }
        return String(value)
    } catch { return fallback }
}

// ============================================================
// CHECK STATUS
// ============================================================

function isStatus(m) {
    const jid = safeString(m?.key?.remoteJid || m?.chat || "")
    return jid.includes("status@broadcast")
}

// ============================================================
// SAFE ID
// ============================================================

function getUserId(m) {
    return safeString(m?.sender || m?.participant || m?.key?.participant || m?.chat || "unknown")
}

// ============================================================
// YOUTUBE ID
// ============================================================

function extractVideoId(url) {
    try {
        const value = safeString(url)
        if (!value) return null
        const parsed = new URL(value)
        const host = safeString(parsed.hostname).toLowerCase()

        if (host === "youtu.be" || host.endsWith(".youtu.be")) {
            return safeString(parsed.pathname.replace(/^\/+/, "").split("/")[0]) || null
        }

        if (host.includes("youtube.com")) {
            const v = parsed.searchParams.get("v")
            if (v) return safeString(v)
            const parts = parsed.pathname.split("/").filter(Boolean)
            const index = parts.findIndex(part => ["shorts","embed","live"].includes(safeString(part).toLowerCase()))
            if (index >= 0 && parts[index + 1]) return safeString(parts[index + 1])
        }
        return null
    } catch { return null }
}

// ============================================================
// DURATION
// ============================================================

function formatDuration(seconds) {
    const number = Number(seconds)
    if (!Number.isFinite(number) || number < 0) return "غير معروف"
    const h = Math.floor(number / 3600)
    const m = Math.floor((number % 3600) / 60)
    const s = Math.floor(number % 60)
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    return `${m}:${String(s).padStart(2, "0")}`
}

// ============================================================
// FILE NAME
// ============================================================

function sanitizeFileName(name) {
    return safeString(name, "DAMAR-MD SONG")
       .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
       .replace(/\s+/g, " ")
       .trim()
       .substring(0, 100) || "DAMAR-MD SONG"
}

// ============================================================
// SAVE / GET SEARCH
// ============================================================

function saveSearch(user, results) {
    global.damarSongSearches.set(getUserId({sender: user}), { results: Array.isArray(results)? results : [], created: Date.now() })
}

function getSearch(user) {
    const key = getUserId({sender: user})
    const data = global.damarSongSearches.get(key)
    if (!data) return null
    if (Date.now() - Number(data.created || 0) > SEARCH_TTL) {
        global.damarSongSearches.delete(key)
        return null
    }
    return Array.isArray(data.results)? data.results : null
}

// ============================================================
// SEARCH YOUTUBE
// ============================================================

async function searchSongs(query) {
    const cleanQuery = safeString(query).trim()
    if (!cleanQuery) return []
    const result = await yts(cleanQuery)
    const videos = Array.isArray(result?.videos)? result.videos : []
    return videos.filter(video => video && safeString(video.url) && extractVideoId(video.url))
       .slice(0, MAX_RESULTS)
       .map(video => {
            const url = safeString(video.url)
            return {
                title: safeString(video.title, "بدون عنوان"),
                artist: safeString(video.author?.name, "Unknown"),
                url,
                videoId: extractVideoId(url),
                thumbnail: safeString(video.thumbnail) || SONG_IMAGE,
                duration: safeString(video.timestamp) || formatDuration(video.seconds),
                views: Number(video.views) || 0
            }
        })
}

// ============================================================
// SAVETUBE CLIENT
// ============================================================

function createSaveTubeClient() {
    return axios.create({
        timeout: 30000,
        maxContentLength: MAX_AUDIO_SIZE,
        maxBodyLength: MAX_AUDIO_SIZE,
        headers: {
            Accept: "application/json, text/plain, */*",
            "Content-Type": "application/json",
            Origin: "https://yt.savetube.me",
            Referer: "https://yt.savetube.me/",
            "User-Agent": "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36"
        }
    })
}

// ============================================================
// GET CDN / INFO / DECRYPT / AUDIO
// ============================================================

async function getCDN(client) {
    const response = await client.get("https://media.savetube.vip/api/random-cdn", { timeout: 20000 })
    const cdn = safeString(response?.data?.cdn)
    if (!cdn) throw new Error("SaveTube CDN غير متاح")
    return cdn.replace(/^https?:\/\//, "").replace(/\/+$/, "")
}

async function getVideoInfo(client, cdn, youtubeUrl) {
    const response = await client.post(`https://${cdn}/v2/info`, { url: safeString(youtubeUrl) }, { timeout: 30000 })
    if (!response?.data) throw new Error("SaveTube لم يرجع معلومات")
    return response.data
}

function decryptSaveTubeInfo(info) {
    const encryptedData = safeString(info?.data)
    if (!encryptedData) throw new Error("SaveTube رجع بيانات فارغة")
    let encrypted
    try { encrypted = Buffer.from(encryptedData, "base64") } catch { throw new Error("بيانات SaveTube غير صالحة") }
    if (encrypted.length < 17) throw new Error("بيانات SaveTube ناقصة")
    const key = Buffer.from("C5D58EF67A7584E4A29F6C35BBC4EB12", "hex")
    const iv = encrypted.subarray(0, 16)
    try {
        const decipher = createDecipheriv("aes-128-cbc", key, iv)
        const decrypted = Buffer.concat([decipher.update(encrypted.subarray(16)), decipher.final()])
        return JSON.parse(decrypted.toString("utf8"))
    } catch { throw new Error("تعذر فك بيانات SaveTube") }
}

async function getAudioDownload(client, cdn, videoId, meta) {
    const id = safeString(videoId)
    const key = safeString(meta?.key)
    if (!id) throw new Error("YouTube ID غير موجود")
    if (!key) throw new Error("SaveTube key غير موجود")
    const response = await client.post(`https://${cdn}/download`, { id, downloadType: "audio", quality: "128", key }, { timeout: 40000 })
    const data = response?.data
    const downloadUrl = safeString(data?.data?.downloadUrl) || safeString(data?.downloadUrl) || safeString(data?.data?.url) || safeString(data?.url)
    if (!downloadUrl) throw new Error("رابط الصوت غير موجود")
    return downloadUrl
}

// ============================================================
// SEND SEARCH MENU
// ============================================================

async function sendSongSearchMenu(m, conn, query, results) {
    const safeResults = Array.isArray(results)? results : []
    const rows = safeResults.map((song, index) => ({
        title: String(`🎵 ${index + 1}. ${safeString(song?.title, `الأغنية ${index + 1}`)}`),
        description: String(`👤 ${safeString(song?.artist, "Unknown")} • ⏱ ${safeString(song?.duration, "?")}`),
        id: String(`.songpick ${index + 1}`)
    }))

    const caption = `╭━━━⪩ ${BOT_NAME} ⪨━━━╮
┃ 🎵 *اختيار الأغنية*
┃
┃ 🔎 *البحث:* ${safeString(query)}
┃ 📀 *النتائج:* ${safeResults.length}
┃
┃ 👇 ضغط على الزر واختار
┃ الأغنية اللي بغيتي.
┃
┃ 👑 *المطور:* ${DEVELOPER}
┃ 📞 *${DEVELOPER_NUMBER}*
╰━━━━━━━━━━╯`

    try {
        if (typeof conn.sendButton!== "function") throw new Error("sendButton غير موجود")
        await conn.sendButton(m.chat, {
            image: { url: String(SONG_IMAGE) },
            caption: String(caption),
            footer: String(`${BOT_NAME} • Music`),
            buttons: [
                { name: "single_select", buttonParamsJson: JSON.stringify({ title: "🎵 اختيار الأغنية", sections: [{ title: "🎧 نتائج البحث", rows }] }) },
                { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "👤 المطور", url: String(DEVELOPER_FACEBOOK) }) }
            ]
        }, { quoted: m })
        return true
    } catch (error) {
        console.log(`[${BOT_NAME}] BUTTON ERROR:`, error?.message)
    }

    let text = `${caption}\n\n🎧 *لائحة الأغاني:*\n\n`
    safeResults.forEach((song, index) => {
        text += `*${index + 1}.* ${safeString(song?.title, "بدون عنوان")}\n👤 ${safeString(song?.artist, "Unknown")}\n⏱ ${safeString(song?.duration, "غير معروف")}\n\n`
    })
    text += `📌 للاختيار:\n.songpick 1`
    await conn.sendMessage(m.chat, { image: { url: String(SONG_IMAGE) }, caption: String(text) }, { quoted: m })
    return false
}

// ============================================================
// DOWNLOAD + SEND
// ============================================================

async function downloadAndSendSong(m, conn, song) {
    const title = safeString(song?.title, "DAMAR-MD SONG")
    const artist = safeString(song?.artist, "Unknown")
    const duration = safeString(song?.duration, "غير معروف")
    const thumbnail = safeString(song?.thumbnail) || SONG_IMAGE
    const url = safeString(song?.url)
    const videoId = safeString(song?.videoId) || extractVideoId(url)
    if (!videoId) throw new Error("YouTube Video ID غير صالح")
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`

    const client = createSaveTubeClient()
    const cdn = await getCDN(client)
    const info = await getVideoInfo(client, cdn, youtubeUrl)
    const meta = decryptSaveTubeInfo(info)
    const downloadUrl = await getAudioDownload(client, cdn, videoId, meta)

    const caption = `╭━━━⪩ ${BOT_NAME} ⪨━━━╮
┃ 🎵 *تم تحميل الأغنية*
┃
┃ 📌 *العنوان:* ${title}
┃ 👤 *الفنان:* ${artist}
┃ ⏱ *المدة:* ${duration}
┃
┃ 👑 *المطور:* ${DEVELOPER}
┃ 📞 *${DEVELOPER_NUMBER}*
╰━━━━━━━━━━━━━━━━━━╯`

    try {
        await conn.sendMessage(m.chat, { image: { url: String(thumbnail) }, caption: String(caption) }, { quoted: m })
    } catch (error) {
        console.log(`[${BOT_NAME}] IMAGE ERROR:`, error?.message)
        try { await m.reply(String(caption)) } catch {}
    }

    await conn.sendMessage(m.chat, { audio: { url: String(downloadUrl) }, mimetype: "audio/mpeg", fileName: `${sanitizeFileName(title)}.mp3`, ptt: false }, { quoted: m })
}

// ============================================================
// HANDLER
// ============================================================

const handler = async (m, { text, conn, args, command }) => {
    try {
        // منع العمل في الحالة
        if (isStatus(m)) {
            return m.reply(`❌ *Group Status ما مدعومش فنسخة Baileys الحالية.*\n\n📌 خاص تحديث مكتبة Baileys.`)
        }

        const cmd = safeString(command).toLowerCase()

        if (cmd === "songpick" || cmd === "اختيار") {
            const number = parseInt(safeString(args?.[0] || text || "0"), 10)
            if (!Number.isInteger(number) || number < 1) {
                return m.reply(`❌ *${BOT_NAME}*\n\nكتب رقم الأغنية.\n\nمثال:\n.songpick 1`)
            }
            const results = getSearch(m)
            if (!Array.isArray(results) ||!results.length) {
                return m.reply(`⚠️ *${BOT_NAME}*\n\nاللائحة سالات أو منتهية.\n\nعاود دير:\n.song اسم الأغنية`)
            }
            const song = results[number - 1]
            if (!song) return m.reply(`❌ *${BOT_NAME}*\n\nهاد الرقم ماكاينش.\n\nاختار من 1 حتى ${results.length}.`)

            try { await m.react("⏳") } catch {}
            try {
                await downloadAndSendSong(m, conn, song)
                try { await m.react("✅") } catch {}
            } catch (error) {
                console.error(`[${BOT_NAME}] DOWNLOAD ERROR:`, error)
                try { await m.react("❌") } catch {}
                return m.reply(`❌ *${BOT_NAME}*\n\nماقدرش نحمل هاد الأغنية.\n\n🎵 ${safeString(song?.title, "بدون عنوان")}\n\n📌 *السبب:*\n${safeString(error?.message, "خطأ غير معروف")}\n\n🔄 جرب أغنية أخرى من اللائحة.`)
            }
            return
        }

        const query = safeString(text).trim()
        if (!query) {
            return m.reply(`╭━━━⪩ ${BOT_NAME} ⪨━━━╮
┃ 🎵 *تحميل الأغاني*
┃
┃ كتب اسم الأغنية.
┃
┃ 📌 مثال:
┃.song TFLOW
┃
┃ أو:
┃.song Maher Zain
┃
┃ 👇 غادي نعطيك لائحة
┃ وتختار الأغنية بالزر.
┃
┃ 👑 *المطور:* ${DEVELOPER}
┃ 📞 *${DEVELOPER_NUMBER}*
╰━━━━━━━━━━━━━━━━━━╯`)
        }

        try { await m.react("🔎") } catch {}
        const results = await searchSongs(query)
        if (!Array.isArray(results) ||!results.length) {
            try { await m.react("❌") } catch {}
            return m.reply(`❌ *${BOT_NAME}*\n\nمالقيتش نتائج لـ:\n\n🔎 ${query}\n\nجرب اسم أغنية آخر.`)
        }

        saveSearch(m, results)
        await sendSongSearchMenu(m, conn, query, results)
        try { await m.react("✅") } catch {}

    } catch (error) {
        console.error("================================")
        console.error(`${BOT_NAME} ERROR`)
        console.error(error)
        console.error("================================")
        try { await m.react("❌") } catch {}
        return m.reply(`❌ *${BOT_NAME}*\n\nوقع مشكل فالعملية.\n\n📌 *السبب:*\n${safeString(error?.message, "خطأ غير معروف")}\n\n🔄 عاود جرب مرة أخرى.`)
    }
}

// ============================================================
// COMMANDS
// ============================================================

handler.help = ["song <اسم الأغنية>", "songpick <رقم>"]
handler.tags = ["downloader"]
handler.command = ["song", "شغل", "اغنية", "أغنية", "songpick", "اختيار"]
handler.limit = false

export default handler