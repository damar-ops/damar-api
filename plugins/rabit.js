// ==========================================================
// DAMAR-MD | CATBOX UPLOADER
// Command: .Rabit
// Developer: ابو دمار شامل
// ==========================================================

import axios from "axios"
import { fileTypeFromBuffer } from "file-type"

// Catbox API
const CATBOX_API = "https://catbox.moe/user/api.php"

// ----------------------------------------------------------
// رفع Buffer إلى Catbox
// ----------------------------------------------------------
async function uploadToCatbox(buffer, fileName, mimeType) {
    if (!buffer || !buffer.length) {
        throw new Error("الملف فارغ")
    }

    // Node.js 18+ فيه FormData و Blob بشكل مدمج
    const form = new FormData()

    form.append("reqtype", "fileupload")

    const blob = new Blob(
        [buffer],
        {
            type: mimeType || "application/octet-stream"
        }
    )

    form.append(
        "fileToUpload",
        blob,
        fileName
    )

    const response = await axios.post(
        CATBOX_API,
        form,
        {
            timeout: 120000,
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            headers: {
                ...Object.fromEntries(form.entries())
            },
            validateStatus: () => true
        }
    )

    const result = String(
        response.data || ""
    ).trim()

    console.log(
        "CATBOX STATUS:",
        response.status
    )

    console.log(
        "CATBOX RESPONSE:",
        result
    )

    if (
        response.status < 200 ||
        response.status >= 300
    ) {
        throw new Error(
            `Catbox HTTP ${response.status}: ${result}`
        )
    }

    if (
        !result.startsWith(
            "https://files.catbox.moe/"
        )
    ) {
        throw new Error(
            `Catbox رفض الرفع: ${result}`
        )
    }

    return result
}

// ----------------------------------------------------------
// معرفة الملف المرفق
// ----------------------------------------------------------
function getQuotedMedia(m) {
    if (!m.quoted) return null

    const msg = m.quoted

    const mime =
        msg.mimetype ||
        msg.msg?.mimetype ||
        ""

    const type =
        msg.mtype ||
        msg.type ||
        ""

    if (
        mime.startsWith("image/")
    ) {
        return {
            type: "image",
            mime,
            message: msg
        }
    }

    if (
        mime.startsWith("audio/")
    ) {
        return {
            type: "audio",
            mime,
            message: msg
        }
    }

    if (
        type === "imageMessage"
    ) {
        return {
            type: "image",
            mime:
                "image/jpeg",
            message: msg
        }
    }

    if (
        type === "audioMessage"
    ) {
        return {
            type: "audio",
            mime:
                "audio/ogg; codecs=opus",
            message: msg
        }
    }

    return null
}

// ----------------------------------------------------------
// Extension
// ----------------------------------------------------------
function getExtension(type, mime, detected) {
    if (type === "image") {
        return "jpg"
    }

    if (type === "audio") {
        // إذا كان Audio WhatsApp بصيغة Opus
        if (
            mime.includes("opus") ||
            mime.includes("ogg")
        ) {
            return "opus"
        }

        if (detected?.ext === "opus") {
            return "opus"
        }

        // لا نكذب على الملف:
        // إذا لم يكن Opus، نستعمل الامتداد الحقيقي
        return detected?.ext || "bin"
    }

    return detected?.ext || "bin"
}

// ----------------------------------------------------------
// Handler
// ----------------------------------------------------------
const handler = async (m, { conn }) => {
    try {
        await m.react("⏳")

        // --------------------------------------------------
        // خاص المستخدم يكون راد على صورة أو Audio
        // --------------------------------------------------
        const media = getQuotedMedia(m)

        if (!media) {
            await m.react("❌")

            return m.reply(
                "⚠️ *DAMAR-MD CATBOX*\n\n" +
                "خاصك ترد على صورة أو Audio بـ:\n\n" +
                "📌 *.Rabit*\n\n" +
                "🖼️ صورة → رابط `.jpg`\n" +
                "🎵 Audio/Voice → رابط `.opus`"
            )
        }

        // --------------------------------------------------
        // Download media
        // --------------------------------------------------
        let buffer

        try {
            if (
                typeof media.message.download ===
                "function"
            ) {
                buffer =
                    await media.message.download()
            } else if (
                typeof m.quoted.download ===
                "function"
            ) {
                buffer =
                    await m.quoted.download()
            } else {
                throw new Error(
                    "download() غير موجود"
                )
            }
        } catch (downloadError) {
            console.error(
                "MEDIA DOWNLOAD ERROR:",
                downloadError
            )

            throw new Error(
                "ماقدرتش نحمل الملف من WhatsApp"
            )
        }

        if (
            !buffer ||
            !Buffer.isBuffer(buffer) ||
            buffer.length === 0
        ) {
            throw new Error(
                "الملف اللي تحمل فارغ"
            )
        }

        // --------------------------------------------------
        // Detect real file
        // --------------------------------------------------
        let detected = null

        try {
            detected =
                await fileTypeFromBuffer(buffer)
        } catch {}

        const extension =
            getExtension(
                media.type,
                media.mime,
                detected
            )

        // --------------------------------------------------
        // Image always JPG filename
        // --------------------------------------------------
        let fileName

        if (media.type === "image") {
            fileName =
                `damar_${Date.now()}.jpg`
        } else {
            fileName =
                `damar_${Date.now()}.${extension}`
        }

        // --------------------------------------------------
        // Upload
        // --------------------------------------------------
        const url =
            await uploadToCatbox(
                buffer,
                fileName,
                media.mime
            )

        // --------------------------------------------------
        // Success
        // --------------------------------------------------
        await m.react("✅")

        return m.reply(
            "✅ *DAMAR-MD CATBOX*\n\n" +
            "تم رفع الملف بنجاح 🎉\n\n" +
            "🔗 *الرابط:*\n" +
            url +
            "\n\n" +
            "📁 *النوع:* ." +
            extension
        )

    } catch (error) {
        console.error(
            "========== DAMAR-MD RABIT ERROR =========="
        )
        console.error(error)
        console.error(
            "==========================================="
        )

        await m.react("❌")

        return m.reply(
            "❌ *DAMAR-MD*\n\n" +
            "فشل رفع الملف إلى Catbox.\n\n" +
            "📌 السبب:\n" +
            `${error?.message || "خطأ غير معروف"}\n\n` +
            "🔄 عاود جرب من بعد."
        )
    }
}

// ----------------------------------------------------------
// Command
// ----------------------------------------------------------
handler.help = [
    "Rabit"
]

handler.tags = [
    "uploader"
]

handler.command = [
    "rabit",
    "رابط"
]

export default handler