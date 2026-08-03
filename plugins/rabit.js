/**
 * ╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
 *       🔗 RABIT - DAMAR-MD
 * ╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
 *
 * .rabit
 *
 * Reply على:
 * 🎙️ Vocal WhatsApp
 * 🎵 Audio
 * 🖼️ Image
 * 🎬 Video
 *
 * يرفع الميديا مباشرة إلى Catbox
 *
 * ❌ بدون FFmpeg
 * ❌ بدون تحويل
 * ✅ Vocal يبقى Opus
 */

const MAX_SIZE = 200 * 1024 * 1024
const SESSION_TIME = 5 * 60 * 1000

const sessions = new Map()


// ═══════════════════════════════
// Session
// ═══════════════════════════════

function getKey(m) {
    return `${m.chat}:${m.sender}`
}


function cleanSessions() {

    const now = Date.now()

    for (const [key, data] of sessions.entries()) {

        if (
            now - data.time >
            SESSION_TIME
        ) {
            sessions.delete(key)
        }
    }
}


// ═══════════════════════════════
// اكتشاف نوع الميديا
// ═══════════════════════════════

function getMediaInfo(m) {

    if (!m) return null

    /*
     * بعض نسخ البوتات كتخزن النوع هنا:
     *
     * m.mtype
     */

    const mtype = m.mtype || ''

    /*
     * وبعض النسخ:
     *
     * m.msg
     */

    const msg = m.msg || {}

    /*
     * وبعض نسخ quoted:
     *
     * m.message
     */

    const message = m.message || {}

    /*
     * وبعض النسخ:
     *
     * m.quoted.message
     */

    const quotedMessage =
        m.quoted?.message || {}

    // ━━━━━━━━━━━━━━━━━━━━━━━
    // Audio
    // ━━━━━━━━━━━━━━━━━━━━━━━

    const audio =
        mtype === 'audioMessage' ||
        !!msg.audioMessage ||
        !!message.audioMessage ||
        !!quotedMessage.audioMessage ||
        !!m.audioMessage

    if (audio) {

        const audioMsg =
            msg.audioMessage ||
            message.audioMessage ||
            quotedMessage.audioMessage ||
            m.audioMessage ||
            msg

        const ptt =
            audioMsg?.ptt === true ||
            msg?.ptt === true ||
            m?.ptt === true

        const mimetype =
            audioMsg?.mimetype ||
            msg?.mimetype ||
            m?.mimetype ||
            'audio/ogg; codecs=opus'

        /*
         * WhatsApp Vocal
         */

        if (
            ptt ||
            mimetype.includes('opus') ||
            mimetype.includes('ogg')
        ) {

            return {
                type: 'voice',
                name: 'DAMAR-MD.opus',
                ext: 'opus',
                mime: 'audio/ogg; codecs=opus'
            }
        }

        /*
         * Audio عادي
         */

        return {
            type: 'audio',
            name: 'DAMAR-MD.audio',
            ext: 'audio',
            mime: mimetype
        }
    }


    // ═══════════════════════════════
    // Image
    // ═══════════════════════════════

    const image =
        mtype === 'imageMessage' ||
        !!msg.imageMessage ||
        !!message.imageMessage ||
        !!quotedMessage.imageMessage ||
        !!m.imageMessage

    if (image) {

        return {
            type: 'image',
            name: 'DAMAR-MD.jpg',
            ext: 'jpg',
            mime: 'image/jpeg'
        }
    }


    // ═══════════════════════════════
    // Video
    // ═══════════════════════════════

    const video =
        mtype === 'videoMessage' ||
        !!msg.videoMessage ||
        !!message.videoMessage ||
        !!quotedMessage.videoMessage ||
        !!m.videoMessage

    if (video) {

        return {
            type: 'video',
            name: 'DAMAR-MD.mp4',
            ext: 'mp4',
            mime: 'video/mp4'
        }
    }


    // ═══════════════════════════════
    // fallback حسب mimetype
    // ═══════════════════════════════

    const mimetype =
        m.mimetype ||
        msg.mimetype ||
        m.quoted?.mimetype ||
        ''

    if (
        typeof mimetype === 'string' &&
        mimetype.startsWith('audio/')
    ) {

        const isVoice =
            m.ptt === true ||
            msg.ptt === true ||
            m.quoted?.ptt === true ||
            mimetype.includes('opus') ||
            mimetype.includes('ogg')

        if (isVoice) {

            return {
                type: 'voice',
                name: 'DAMAR-MD.opus',
                ext: 'opus',
                mime: 'audio/ogg; codecs=opus'
            }
        }

        return {
            type: 'audio',
            name: 'DAMAR-MD.audio',
            ext: 'audio',
            mime: mimetype
        }
    }


    return null
}


// ═══════════════════════════════
// Catbox Upload
// ═══════════════════════════════

async function uploadCatbox(buffer, filename) {

    if (!buffer) {
        throw new Error(
            'ما قدرتش نحمل الميديا.'
        )
    }

    if (!Buffer.isBuffer(buffer)) {
        throw new Error(
            'بيانات الميديا غير صالحة.'
        )
    }

    if (buffer.length === 0) {
        throw new Error(
            'الملف فارغ.'
        )
    }

    if (buffer.length > MAX_SIZE) {
        throw new Error(
            'حجم الملف أكبر من 200MB.'
        )
    }


    const form = new FormData()

    form.append(
        'reqtype',
        'fileupload'
    )

    form.append(
        'fileToUpload',
        new Blob([buffer]),
        filename
    )


    const response = await fetch(
        'https://catbox.moe/user/api.php',
        {
            method: 'POST',
            body: form,

            headers: {
                'User-Agent':
                    'DAMAR-MD-RABIT/1.0'
            }
        }
    )


    const result =
        (await response.text()).trim()


    if (!response.ok) {

        throw new Error(
            `Catbox HTTP ${response.status}`
        )
    }


    if (!result) {

        throw new Error(
            'Catbox ما رجع حتى رابط.'
        )
    }


    if (
        !result.startsWith('http')
    ) {

        throw new Error(
            `Catbox رجع رد غير صالح:\n${result}`
        )
    }


    return result
}


// ═══════════════════════════════
// تحميل الميديا
// ═══════════════════════════════

async function downloadMedia(m) {

    /*
     * الطريقة العادية
     */

    if (
        typeof m.download === 'function'
    ) {

        const buffer =
            await m.download()

        if (buffer) {
            return buffer
        }
    }


    /*
     * بعض النسخ كتستعمل downloadMediaMessage
     * ولكن غالباً download() كافية.
     */

    throw new Error(
        'البوت ما قدرش يحمل الميديا من WhatsApp.'
    )
}


// ═══════════════════════════════
// معالجة الميديا
// ═══════════════════════════════

async function processMedia(m) {

    const info =
        getMediaInfo(m)


    if (!info) {

        throw new Error(
            'ما قدرتش نتعرف على نوع الميديا.'
        )
    }


    const buffer =
        await downloadMedia(m)


    if (!buffer) {

        throw new Error(
            'الميديا ما تحمّلاتش.'
        )
    }


    let filename =
        info.name


    /*
     * Vocal WhatsApp
     *
     * يبقى Opus
     */

    if (info.type === 'voice') {

        filename =
            'DAMAR-MD.opus'
    }


    /*
     * إذا كان Audio بصيغة OGG/Opus
     * كذلك نخليه .opus
     */

    if (
        info.type === 'audio' &&
        (
            info.mime.includes('opus') ||
            info.mime.includes('ogg')
        )
    ) {

        filename =
            'DAMAR-MD.opus'
    }


    const url =
        await uploadCatbox(
            buffer,
            filename
        )


    return {
        info,
        url,
        size: buffer.length,
        filename
    }
}


// ═══════════════════════════════
// شكل النتيجة
// ═══════════════════════════════

function resultText(result) {

    let type =
        '📁 ملف'


    if (
        result.info.type === 'voice'
    ) {

        type =
            '🎙️ فوكال WhatsApp'
    }


    if (
        result.info.type === 'audio'
    ) {

        type =
            '🎵 أوديو'
    }


    if (
        result.info.type === 'image'
    ) {

        type =
            '🖼️ صورة'
    }


    if (
        result.info.type === 'video'
    ) {

        type =
            '🎬 فيديو'
    }


    return `
╭━━━〔 🔗 RABIT - DAMAR-MD 〕━━━╮
┃
┃ ✅ تم الرفع بنجاح
┃
┃ ${type}
┃
┃ 📦 الحجم:
┃ ${(result.size / 1024 / 1024).toFixed(2)} MB
┃
┃ 📄 الملف:
┃ ${result.filename}
┃
┃ 🔗 الرابط:
┃
┃ ${result.url}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯
`
}


// ═══════════════════════════════
// القائمة
// ═══════════════════════════════

function menu() {

    return `
╭━━━〔 🔗 RABIT - DAMAR-MD 〕━━━╮
┃
┃ 📥 طاكّي على الميديا أو جاوب
┃ عليها بـ:
┃
┃ 🖼️ صورة
┃ 🎬 فيديو
┃ 🎵 أوديو
┃ 🎙️ فوكال
┃
┃ 🔗 وسيتم إعطاؤك رابط Catbox
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯
`
}


// ═══════════════════════════════
// Handler
// ═══════════════════════════════

const handler = async (
    m,
    {
        conn,
        text
    }
) => {

    cleanSessions()

    const key =
        getKey(m)


    // ═══════════════════════════════
    // Reply على الميديا
    // ═══════════════════════════════

    if (m.quoted) {

        const info =
            getMediaInfo(m.quoted)


        if (info) {

            try {

                await m.reply(
                    '⏳ جاري رفع الميديا إلى Catbox...'
                )


                const result =
                    await processMedia(
                        m.quoted
                    )


                sessions.delete(key)


                return m.reply(
                    resultText(result)
                )


            } catch (error) {

                console.error(
                    '[RABIT REPLY ERROR]',
                    error
                )


                return m.reply(`
❌ فشل الرفع.

📌 السبب:
${error.message}
`)
            }
        }
    }


    // ═══════════════════════════════
    // إذا الميديا جات مباشرة
    // ═══════════════════════════════

    const direct =
        getMediaInfo(m)


    if (direct) {

        try {

            await m.reply(
                '⏳ جاري رفع الميديا إلى Catbox...'
            )


            const result =
                await processMedia(m)


            sessions.delete(key)


            return m.reply(
                resultText(result)
            )


        } catch (error) {

            console.error(
                '[RABIT DIRECT ERROR]',
                error
            )


            return m.reply(`
❌ فشل الرفع.

📌 السبب:
${error.message}
`)
        }
    }


    // ═══════════════════════════════
    // .rabit بدون ميديا
    // ═══════════════════════════════

    sessions.set(key, {

        step: 'waiting',
        time: Date.now()

    })


    return m.reply(
        menu()
    )
}


// ═══════════════════════════════
// استقبال الميديا من بعد .rabit
// ═══════════════════════════════

handler.before = async function (m) {

    cleanSessions()


    const key =
        getKey(m)


    const session =
        sessions.get(key)


    if (!session) {
        return false
    }


    if (
        Date.now() - session.time >
        SESSION_TIME
    ) {

        sessions.delete(key)

        return false
    }


    if (
        session.step !== 'waiting'
    ) {

        return false
    }


    const info =
        getMediaInfo(m)


    if (!info) {

        return false
    }


    try {

        await m.reply(
            '⏳ جاري رفع الميديا إلى Catbox...'
        )


        const result =
            await processMedia(m)


        sessions.delete(key)


        await m.reply(
            resultText(result)
        )


    } catch (error) {

        console.error(
            '[RABIT BEFORE ERROR]',
            error
        )


        sessions.delete(key)


        await m.reply(`
❌ فشل الرفع.

📌 السبب:
${error.message}
`)
    }


    return true
}


// ═══════════════════════════════
// إعدادات الأمر
// ═══════════════════════════════

handler.help = [
    'rabit'
]

handler.tags = [
    'tools'
]

handler.command =
    /^rabit$/i


export default handler