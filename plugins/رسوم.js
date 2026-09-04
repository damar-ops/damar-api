/**
 * 🎨 DAMAR-MD AUTO DRAW
 *
 * 📷 صورة حقيقية
 *      ↓
 * ✏️ رسم بالقلم الرصاص
 *      ↓
 * 📖 ورقة دفتر حقيقية
 *      ↓
 * ✏️ قلم بجانب الورقة
 *
 * الأوامر:
 * .رسوم
 * .رسوم اون
 * .رسوم اوف
 */

import axios from 'axios'
import FormData from 'form-data'

// ============================================================
// الإعدادات
// ============================================================

const BOT_NAME = '𝐃𝐀𝐌𝐀𝐑-𝐌𝐃'
const DEVELOPER = 'أبو دمار شامل'

const DEVELOPER_FACEBOOK =
    'https://www.facebook.com/profile.php?id=61591783185803'

// ============================================================
// API
// ============================================================

const UPLOAD_API =
    'https://tmp.malvryx.dev/upload'

const DRAW_API =
    'https://omegatech-api.dixonomega.tech/api/ai/nano-banana2'

const RESULT_API =
    'https://omegatech-api.dixonomega.tech/api/ai/nano-banana2-result'

// ============================================================
// الإعدادات السريعة
// ============================================================

const POLL_INTERVAL = 2000
const MAX_WAIT = 55000

// ============================================================
// الحالة
// ============================================================

if (typeof global.damarDrawEnabled === 'undefined') {
    global.damarDrawEnabled = true
}

global.damarDrawSessions =
    global.damarDrawSessions || new Map()

// ============================================================
// النوم
// ============================================================

const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms))

// ============================================================
// استخراج النص
// ============================================================

function getText(m) {

    return String(
        m?.text ||
        m?.body ||
        m?.message?.conversation ||
        m?.message?.extendedTextMessage?.text ||
        m?.message?.imageMessage?.caption ||
        m?.message?.viewOnceMessage?.message?.imageMessage?.caption ||
        m?.message?.viewOnceMessageV2?.message?.imageMessage?.caption ||
        ''
    ).trim()
}

// ============================================================
// MIME
// ============================================================

function getMime(m) {

    return String(
        m?.mimetype ||
        m?.msg?.mimetype ||
        m?.message?.imageMessage?.mimetype ||
        m?.message?.viewOnceMessage?.message?.imageMessage?.mimetype ||
        m?.message?.viewOnceMessageV2?.message?.imageMessage?.mimetype ||
        ''
    ).toLowerCase()
}

// ============================================================
// صورة حقيقية فقط
// ============================================================

function isRealPhoto(m) {

    if (!m) return false

    const mime = getMime(m)

    // منع الستيكيرات
    if (
        mime === 'image/webp' ||
        mime === 'image/x-webp'
    ) {
        return false
    }

    // صورة عادية
    if (m?.message?.imageMessage) {
        return true
    }

    // View Once
    if (
        m?.message
            ?.viewOnceMessage
            ?.message
            ?.imageMessage
    ) {
        return true
    }

    // View Once V2
    if (
        m?.message
            ?.viewOnceMessageV2
            ?.message
            ?.imageMessage
    ) {
        return true
    }

    // Baileys normalized
    if (m?.mtype === 'imageMessage') {
        return true
    }

    // MIME
    return [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/heic',
        'image/heif'
    ].includes(mime)
}

// ============================================================
// منع معالجة صورة البوت
// ============================================================

function isBotGeneratedImage(m) {

    const text = getText(m)

    if (!text) return false

    return (
        text.includes(BOT_NAME) &&
        (
            text.includes('Graphite Sketch') ||
            text.includes('AUTO DRAW') ||
            text.includes('تم تحويل الصورة')
        )
    )
}

// ============================================================
// تحميل الصورة ورفعها
// ============================================================

async function uploadImage(m) {

    try {

        let target = m

        // ====================================================
        // إذا كانت Reply لصورة
        // ====================================================

        if (m?.quoted && isRealPhoto(m.quoted)) {
            target = m.quoted
        }

        // ====================================================
        // تأكيد الصورة
        // ====================================================

        if (!isRealPhoto(target)) {
            return null
        }

        // ====================================================
        // تحميل الصورة
        // ====================================================

        const buffer =
            await target.download()

        if (!buffer || !buffer.length) {
            console.log('[DAMAR DRAW] الصورة فارغة')
            return null
        }

        // ====================================================
        // MIME
        // ====================================================

        let mime = getMime(target)

        if (
            !mime ||
            mime === 'image/webp'
        ) {
            mime = 'image/jpeg'
        }

        // ====================================================
        // FormData
        // ====================================================

        const form = new FormData()

        form.append(
            'file',
            buffer,
            {
                filename: 'damar-draw.jpg',
                contentType: mime
            }
        )

        form.append(
            'type',
            'permanent'
        )

        // ====================================================
        // Upload
        // ====================================================

        const response =
            await axios.post(
                UPLOAD_API,
                form,
                {
                    headers: form.getHeaders(),

                    timeout: 20000,

                    maxBodyLength:
                        Infinity,

                    maxContentLength:
                        Infinity
                }
            )

        const data =
            response?.data || {}

        const url =
            data?.cdnUrl ||
            data?.directUrl ||
            data?.url ||
            data?.data?.url ||
            data?.data?.cdnUrl ||
            null

        if (!url) {

            console.log(
                '[DAMAR DRAW UPLOAD RESULT]',
                JSON.stringify(data).slice(0, 1000)
            )

            return null
        }

        return url

    } catch (error) {

        console.error(
            '[DAMAR DRAW UPLOAD ERROR]',
            error?.response?.data ||
            error?.message ||
            error
        )

        return null
    }
}

// ============================================================
// Prompt سريع
// ============================================================

const DRAW_PROMPT = `
Edit the reference photo into a highly realistic graphite pencil portrait
drawn by hand on a real vertical notebook page.

IMPORTANT:
Preserve the exact person's identity, face, hairstyle, facial structure,
clothing, pose and recognizable features from the reference photo.

The result must look like a real photograph of a physical notebook.

Create:
- warm white notebook paper
- subtle horizontal notebook lines
- realistic paper fibers
- realistic spiral notebook binding
- detailed graphite pencil portrait
- fine pencil strokes
- realistic facial shading
- natural cross-hatching
- realistic graphite texture
- a real wooden pencil lying beside the notebook
- realistic desk and soft natural lighting

Near the pencil write exactly:

𝐃𝐀𝐌𝐀𝐑-𝐌𝐃

The text must be readable.

Do not add another person.
Do not change the person's identity.
Do not use anime, cartoon, manga, CGI, 3D, watercolor or colorful painting.

The final image must look like a real photograph of a real pencil drawing
on a real notebook page.

Output only one image.
Use a fast 1K generation.
`

// ============================================================
// استخراج URL من أي شكل محتمل
// ============================================================

function extractImageUrl(data) {

    if (!data) {
        return null
    }

    // ========================================================
    // الشكل المباشر
    // ========================================================

    if (typeof data === 'string') {

        if (
            data.startsWith('http://') ||
            data.startsWith('https://')
        ) {
            return data
        }

        // JSON string
        try {

            const parsed =
                JSON.parse(data)

            return extractImageUrl(parsed)

        } catch {}
    }

    // ========================================================
    // URLs مباشرة
    // ========================================================

    const direct =
        data?.image_url ||
        data?.imageUrl ||
        data?.url ||
        data?.result_url ||
        data?.resultUrl ||
        data?.file_url ||
        data?.fileUrl ||
        data?.output_url ||
        data?.outputUrl

    if (
        typeof direct === 'string' &&
        (
            direct.startsWith('http://') ||
            direct.startsWith('https://')
        )
    ) {
        return direct
    }

    // ========================================================
    // arrays
    // ========================================================

    const arrays = [
        data?.result_urls,
        data?.resultUrls,
        data?.image_urls,
        data?.imageUrls,
        data?.images,
        data?.urls,
        data?.files,
        data?.outputFiles,
        data?.output_files
    ]

    for (const arr of arrays) {

        if (!Array.isArray(arr)) {
            continue
        }

        for (const item of arr) {

            if (typeof item === 'string') {

                if (
                    item.startsWith('http://') ||
                    item.startsWith('https://')
                ) {
                    return item
                }

            }

            if (item && typeof item === 'object') {

                const found =
                    item?.url ||
                    item?.fileUrl ||
                    item?.file_url ||
                    item?.image_url ||
                    item?.imageUrl

                if (
                    typeof found === 'string' &&
                    (
                        found.startsWith('http://') ||
                        found.startsWith('https://')
                    )
                ) {
                    return found
                }
            }
        }
    }

    // ========================================================
    // resultJson
    // ========================================================

    if (data?.resultJson) {

        try {

            const result =
                typeof data.resultJson === 'string'
                    ? JSON.parse(data.resultJson)
                    : data.resultJson

            const found =
                extractImageUrl(result)

            if (found) {
                return found
            }

        } catch {}
    }

    // ========================================================
    // response
    // ========================================================

    if (data?.response) {

        try {

            const result =
                typeof data.response === 'string'
                    ? JSON.parse(data.response)
                    : data.response

            const found =
                extractImageUrl(result)

            if (found) {
                return found
            }

        } catch {}
    }

    // ========================================================
    // data داخل data
    // ========================================================

    if (
        data?.data &&
        typeof data.data === 'object'
    ) {

        const found =
            extractImageUrl(data.data)

        if (found) {
            return found
        }
    }

    return null
}

// ============================================================
// تحديد حالة المهمة
// ============================================================

function getTaskStatus(data) {

    if (!data) {
        return ''
    }

    return String(
        data?.status ||
        data?.state ||
        data?.data?.status ||
        data?.data?.state ||
        ''
    ).toLowerCase()
}

// ============================================================
// إنشاء الرسم
// ============================================================

async function generateDrawing(imageUrl) {

    console.log('[DAMAR DRAW] بدء إنشاء الرسم')

    // ========================================================
    // إنشاء الرابط
    // ========================================================

    const apiUrl =
        DRAW_API +
        `?prompt=${encodeURIComponent(DRAW_PROMPT)}` +
        `&image=${encodeURIComponent(imageUrl)}`

    // ========================================================
    // إرسال المهمة
    // ========================================================

    const start =
        await axios.get(
            apiUrl,
            {
                timeout: 20000,
                validateStatus: status =>
                    status >= 200 &&
                    status < 500
            }
        )

    const startData =
        start?.data || {}

    console.log(
        '[DAMAR DRAW START]',
        JSON.stringify(startData).slice(0, 1500)
    )

    // ========================================================
    // استخراج Task ID من عدة أشكال
    // ========================================================

    const taskId =
        startData?.task_id ||
        startData?.taskId ||
        startData?.data?.task_id ||
        startData?.data?.taskId ||
        startData?.id

    // ========================================================
    // إذا API رجع الصورة مباشرة
    // ========================================================

    const directImage =
        extractImageUrl(startData)

    if (directImage) {
        console.log('[DAMAR DRAW] الصورة رجعات مباشرة')
        return directImage
    }

    // ========================================================
    // لا يوجد Task ID
    // ========================================================

    if (!taskId) {

        console.error(
            '[DAMAR DRAW] API لم ترجع task_id',
            JSON.stringify(startData).slice(0, 2000)
        )

        throw new Error(
            'API_NO_TASK'
        )
    }

    console.log(
        '[DAMAR DRAW] Task:',
        taskId
    )

    // ========================================================
    // Polling سريع
    // ========================================================

    const startedAt =
        Date.now()

    let lastStatus = ''

    while (
        Date.now() - startedAt <
        MAX_WAIT
    ) {

        await sleep(
            POLL_INTERVAL
        )

        try {

            const response =
                await axios.get(
                    RESULT_API +
                    `?task_id=${encodeURIComponent(taskId)}`,
                    {
                        timeout: 10000,
                        validateStatus:
                            status =>
                                status >= 200 &&
                                status < 500
                    }
                )

            const data =
                response?.data || {}

            const status =
                getTaskStatus(data)

            // ==================================================
            // Log فقط عند تغير الحالة
            // ==================================================

            if (status !== lastStatus) {

                console.log(
                    '[DAMAR DRAW STATUS]',
                    status || 'unknown'
                )

                lastStatus =
                    status
            }

            // ==================================================
            // الصورة جاهزة
            // ==================================================

            const result =
                extractImageUrl(data)

            if (result) {

                console.log(
                    '[DAMAR DRAW] تم إنشاء الصورة في',
                    Math.round(
                        (Date.now() - startedAt) / 1000
                    ),
                    'ثانية'
                )

                return result
            }

            // ==================================================
            // حالات النجاح حتى لو ماكانش status موحد
            // ==================================================

            if (
                [
                    'completed',
                    'complete',
                    'finished',
                    'success',
                    'succeeded',
                    'done'
                ].includes(status)
            ) {

                console.log(
                    '[DAMAR DRAW] المهمة انتهت بدون رابط واضح'
                )

                // نعطي دورة إضافية لاستخراج الرابط
                await sleep(1000)

                continue
            }

            // ==================================================
            // حالات الفشل
            // ==================================================

            if (
                [
                    'failed',
                    'fail',
                    'error',
                    'cancelled',
                    'canceled'
                ].includes(status)
            ) {

                console.error(
                    '[DAMAR DRAW FAILED]',
                    JSON.stringify(data).slice(0, 2000)
                )

                throw new Error(
                    'GENERATION_FAILED'
                )
            }

        } catch (error) {

            if (
                error?.message ===
                'GENERATION_FAILED'
            ) {
                throw error
            }

            // أخطاء الشبكة المؤقتة لا توقف المهمة
            console.log(
                '[DAMAR DRAW POLL]',
                error?.message || error
            )
        }
    }

    throw new Error(
        'GENERATION_TIMEOUT'
    )
}

// ============================================================
// إرسال الرسم
// ============================================================

async function sendDrawing(
    m,
    conn,
    imageUrl,
    sender
) {

    try {

        // ====================================================
        // إنشاء الصورة
        // ====================================================

        const resultUrl =
            await generateDrawing(
                imageUrl
            )

        if (!resultUrl) {
            throw new Error(
                'NO_RESULT_IMAGE'
            )
        }

        // ====================================================
        // Session
        // ====================================================

        const sessionId =
            Date.now().toString(36) +
            Math.random()
                .toString(36)
                .slice(2, 8)

        global.damarDrawSessions.set(
            sessionId,
            {
                image: imageUrl,
                sender,
                created: Date.now()
            }
        )

        // ====================================================
        // حذف Session
        // ====================================================

        setTimeout(
            () => {

                global.damarDrawSessions.delete(
                    sessionId
                )

            },
            10 * 60 * 1000
        )

        // ====================================================
        // إرسال الصورة
        // ====================================================

        await conn.sendButton(
            m.chat,
            {
                image: {
                    url: resultUrl
                },

                caption:
`╭━━━⪩ 🎨 ${BOT_NAME} ⪨━━━⬣
┃
┃ ✏️ تم تحويل الصورة إلى رسم
┃ 📖 فوق ورقة دفتر
┃ 🖊️ قلم رصاص بجانب الرسم
┃
┃ ⚡ AUTO DRAW
┃ 🖼️ Graphite Sketch
┃
┃ 👑 ${DEVELOPER}
┃
╰━━━━━━━━━━━━━━⬣`,

                footer:
                    `${BOT_NAME} • AUTO DRAW`,

                buttons: [

                    {
                        name: 'quick_reply',

                        buttonParamsJson:
                            JSON.stringify({
                                display_text:
                                    '🔄 تغيير الرسم',

                                id:
                                    `damar_draw_again_${sessionId}`
                            })
                    },

                    {
                        name: 'cta_url',

                        buttonParamsJson:
                            JSON.stringify({
                                display_text:
                                    '👤 حساب المطور',

                                url:
                                    DEVELOPER_FACEBOOK
                            })
                    }

                ]
            },

            {
                quoted: m
            }
        )

        try {
            await m.react('✅')
        } catch {}

    } catch (error) {

        console.error(
            '[DAMAR DRAW GENERATE ERROR]',
            error?.message || error
        )

        try {
            await m.react('⚠️')
        } catch {}

        // ====================================================
        // ما نرسلش رسالة ❌ القديمة
        // ====================================================

        try {

            await conn.reply(
                m.chat,

`⚠️ ${BOT_NAME}

وقع مشكل مؤقت فخدمة الرسم.
عاود صيفط الصورة من جديد.`,

                m
            )

        } catch {}
    }
}

// ============================================================
// استخراج ID ديال الأزرار
// ============================================================

function getButtonId(m) {

    try {

        const button =
            m?.message
                ?.buttonsResponseMessage
                ?.selectedButtonId

        if (button) {
            return button
        }

        const template =
            m?.message
                ?.templateButtonReplyMessage
                ?.selectedId

        if (template) {
            return template
        }

        const params =
            m?.message
                ?.interactiveResponseMessage
                ?.nativeFlowResponseMessage
                ?.paramsJson

        if (params) {

            const data =
                JSON.parse(params)

            return (
                data?.id ||
                data?.selectedId ||
                ''
            )
        }

    } catch (error) {

        console.log(
            '[DAMAR DRAW BUTTON]',
            error?.message || error
        )
    }

    return ''
}

// ============================================================
// Handler
// ============================================================

const handler = async (
    m,
    {
        conn,
        isOwner
    }
) => {

    try {

        const text =
            getText(m)

        // ====================================================
        // .رسوم
        // ====================================================

        if (
            /^(?:[.!/])?رسوم$/iu.test(text)
        ) {

            const status =
                global.damarDrawEnabled === true
                    ? '🟢 ON'
                    : '🔴 OFF'

            return conn.reply(
                m.chat,

`╭━━━⪩ 🎨 ${BOT_NAME} ⪨━━━⬣
┃
┃ ✏️ الرسم التلقائي
┃ الحالة: ${status}
┃
┃ 📷 صيفط صورة حقيقية
┃
┃ غادي تتحول إلى:
┃ ✏️ رسم بالقلم
┃ 📖 فوق ورقة دفتر
┃ 🖊️ قلم بجانبها
┃
┃ 🟢 .رسوم اون
┃ 🔴 .رسوم اوف
┃
╰━━━━━━━━━━━━━━⬣`,

                m
            )
        }

        // ====================================================
        // ON
        // ====================================================

        if (
            /^(?:[.!/])?رسوم\s+(اون|on)$/iu
                .test(text)
        ) {

            if (!isOwner) {

                return conn.reply(
                    m.chat,

`❌ هاد الأمر خاص بصاحب البوت فقط.

👑 ${DEVELOPER}`,

                    m
                )
            }

            global.damarDrawEnabled =
                true

            try {
                await m.react('✅')
            } catch {}

            return conn.reply(
                m.chat,

`╭━━━⪩ 🎨 ${BOT_NAME} ⪨━━━⬣
┃
┃ 🟢 الرسم التلقائي: ON
┃
┃ 📷 صيفط صورة حقيقية
┃ ⚡ توليد سريع
┃
╰━━━━━━━━━━━━━━⬣`,

                m
            )
        }

        // ====================================================
        // OFF
        // ====================================================

        if (
            /^(?:[.!/])?رسوم\s+(اوف|off)$/iu
                .test(text)
        ) {

            if (!isOwner) {

                return conn.reply(
                    m.chat,

`❌ هاد الأمر خاص بصاحب البوت فقط.

👑 ${DEVELOPER}`,

                    m
                )
            }

            global.damarDrawEnabled =
                false

            try {
                await m.react('🛑')
            } catch {}

            return conn.reply(
                m.chat,

`╭━━━⪩ 🎨 ${BOT_NAME} ⪨━━━⬣
┃
┃ 🔴 الرسم التلقائي: OFF
┃
┃ باش ترجع تشغلو:
┃ .رسوم اون
┃
╰━━━━━━━━━━━━━━⬣`,

                m
            )
        }

    } catch (error) {

        console.error(
            '[DAMAR DRAW COMMAND]',
            error?.message || error
        )
    }
}

// ============================================================
// AUTO DRAW
// ============================================================

handler.all = async function (m) {

    try {

        const conn =
            this

        // ====================================================
        // OFF
        // ====================================================

        if (
            global.damarDrawEnabled !== true
        ) {
            return
        }

        // ====================================================
        // Baileys
        // ====================================================

        if (m?.isBaileys) {
            return
        }

        // ====================================================
        // صورة مولدة
        // ====================================================

        if (
            isBotGeneratedImage(m)
        ) {
            return
        }

        // ====================================================
        // زر تغيير الرسم
        // ====================================================

        const buttonId =
            getButtonId(m)

        if (
            buttonId &&
            buttonId.startsWith(
                'damar_draw_again_'
            )
        ) {

            const sessionId =
                buttonId.replace(
                    'damar_draw_again_',
                    ''
                )

            const session =
                global.damarDrawSessions.get(
                    sessionId
                )

            if (!session) {

                return conn.reply(
                    m.chat,

`⚠️ ${BOT_NAME}

هاد الزر سالات الصلاحية ديالو.

📷 صيفط الصورة من جديد.`,

                    m
                )
            }

            if (
                session.sender !==
                m.sender
            ) {

                return conn.reply(
                    m.chat,
                    '❌ هاد الزر ديال صاحب الصورة فقط.',
                    m
                )
            }

            try {
                await m.react('⌛')
            } catch {}

            return sendDrawing(
                m,
                conn,
                session.image,
                m.sender
            )
        }

        // ====================================================
        // الصور فقط
        // ====================================================

        if (
            !isRealPhoto(m)
        ) {
            return
        }

        // ====================================================
        // بدء المعالجة
        // ====================================================

        try {
            await m.react('⌛')
        } catch {}

        // ====================================================
        // رفع الصورة
        // ====================================================

        const imageUrl =
            await uploadImage(m)

        if (!imageUrl) {

            try {
                await m.react('⚠️')
            } catch {}

            return
        }

        // ====================================================
        // إنشاء الرسم
        // ====================================================

        return sendDrawing(
            m,
            conn,
            imageUrl,
            m.sender
        )

    } catch (error) {

        console.error(
            '[DAMAR AUTO DRAW ERROR]',
            error?.message || error
        )

        try {
            await m.react('⚠️')
        } catch {}
    }
}

// ============================================================
// Plugin
// ============================================================

handler.help = [
    'رسوم'
]

handler.tags = [
    'editor'
]

handler.command =
    /^(رسوم|draw)$/iu

handler.limit =
    false

handler.owner =
    false

export default handler