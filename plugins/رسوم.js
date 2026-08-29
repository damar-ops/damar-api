/**
 * 🎨 DAMAR-MD AUTO DRAW
 *
 * Bot: 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃
 * Developer: أبو دمار شامل
 *
 * الخدمة:
 * 📷 أي صورة → 🎨 رسم بالقلم الرصاص
 *
 * التحكم:
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
// الحالة
// ============================================================

if (typeof global.damarDrawEnabled === 'undefined') {
    global.damarDrawEnabled = true
}


// ============================================================
// جلسات الصور
// ============================================================

global.damarDrawSessions =
    global.damarDrawSessions || new Map()


// ============================================================
// معرفة النص
// ============================================================

function getText(m) {

    return String(
        m?.text ||
        m?.body ||
        m?.message?.conversation ||
        m?.message?.extendedTextMessage?.text ||
        m?.message?.imageMessage?.caption ||
        ''
    ).trim()
}


// ============================================================
// معرفة MIME
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
// واش الميساج فيه صورة
// ============================================================

function isImageMessage(m) {

    const mime = getMime(m)

    if (mime.startsWith('image/')) {
        return true
    }

    if (m?.message?.imageMessage) {
        return true
    }

    if (
        m?.message?.viewOnceMessage?.message
            ?.imageMessage
    ) {
        return true
    }

    if (
        m?.message?.viewOnceMessageV2?.message
            ?.imageMessage
    ) {
        return true
    }

    return false
}


// ============================================================
// واش الصورة ديال البوت نفسه
// ============================================================
//
// مهم جداً باش ما يدخلش البوت فحلقة:
// البوت يصيفط صورة → يلقاها → يحولها → يصيفط صورة → ...
//

function isBotGeneratedImage(m) {

    const text = getText(m)

    if (!text) {
        return false
    }

    return (
        text.includes(BOT_NAME) &&
        text.includes('تم تحويل الصورة إلى رسم')
    )
}


// ============================================================
// رفع الصورة
// ============================================================

async function uploadImage(m) {

    try {

        let target = m

        // --------------------------------------------------------
        // إذا كان المستخدم دار Reply على صورة
        // --------------------------------------------------------

        if (m?.quoted) {

            const quotedMime =
                getMime(m.quoted)

            if (
                quotedMime.startsWith('image/')
            ) {
                target = m.quoted
            }
        }


        // --------------------------------------------------------
        // نتأكد أنها صورة
        // --------------------------------------------------------

        if (!isImageMessage(target)) {
            return null
        }


        // --------------------------------------------------------
        // تحميل الصورة
        // --------------------------------------------------------

        const buffer =
            await target.download()

        if (!buffer) {
            return null
        }


        // --------------------------------------------------------
        // MIME
        // --------------------------------------------------------

        const mime =
            getMime(target) ||
            'image/jpeg'


        // --------------------------------------------------------
        // FormData
        // --------------------------------------------------------

        const form =
            new FormData()

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


        // --------------------------------------------------------
        // Upload
        // --------------------------------------------------------

        const response =
            await axios.post(
                'https://tmp.malvryx.dev/upload',
                form,
                {
                    headers:
                        form.getHeaders(),

                    timeout:
                        30000,

                    maxBodyLength:
                        Infinity,

                    maxContentLength:
                        Infinity
                }
            )


        return (
            response.data?.cdnUrl ||
            response.data?.directUrl ||
            response.data?.url ||
            null
        )

    } catch (error) {

        console.error(
            '[DAMAR DRAW UPLOAD]',
            error?.message || error
        )

        return null
    }
}


// ============================================================
// إنشاء الرسم
// ============================================================

async function generateDrawing(imageUrl) {

    const prompt = `
Transform this image into a highly detailed realistic graphite pencil drawing.

IMPORTANT:
Keep the same person, face, identity, pose, hairstyle and composition.

The result must look like a real artist manually drew the original photograph.

STYLE:
realistic pencil sketch
graphite pencil
white paper
fine pencil lines
detailed face
realistic eyes
realistic eyebrows
realistic lips
detailed hair strokes
soft graphite shading
cross hatching
professional hand drawing
natural shadows
high detail

DO NOT:
change the person's identity
change the face
add another person
remove the person
add text
add watermark
add logo
add decorations
add frame
use anime style
use cartoon style
use 3D style
use colorful painting

Keep the original composition and make it look like a real pencil portrait drawn on paper.
`

    const apiUrl =
        'https://omegatech-api.dixonomega.tech/api/ai/nano-banana2' +
        `?prompt=${encodeURIComponent(prompt)}` +
        `&image=${encodeURIComponent(imageUrl)}`


    // --------------------------------------------------------
    // بدء المهمة
    // --------------------------------------------------------

    const start =
        await axios.get(
            apiUrl,
            {
                timeout: 30000
            }
        )


    const taskId =
        start.data?.task_id


    if (!taskId) {

        console.error(
            '[DAMAR DRAW API]',
            start.data
        )

        throw new Error(
            'API ما رجعاتش task_id'
        )
    }


    // --------------------------------------------------------
    // انتظار النتيجة
    // --------------------------------------------------------
    //
    // 20 × 3 ثواني = تقريباً دقيقة
    //

    for (
        let attempt = 0;
        attempt < 20;
        attempt++
    ) {

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    3000
                )
        )


        try {

            const result =
                await axios.get(
                    'https://omegatech-api.dixonomega.tech/api/ai/nano-banana2-result' +
                    `?task_id=${encodeURIComponent(taskId)}`,
                    {
                        timeout: 15000
                    }
                )


            const data =
                result.data


            if (
                data?.status === 'completed' &&
                data?.image_url
            ) {

                return data.image_url
            }


            if (
                data?.status === 'failed'
            ) {

                throw new Error(
                    'السيرفر فشل فصناعة الرسم'
                )
            }

        } catch (error) {

            if (
                error?.message ===
                'السيرفر فشل فصناعة الرسم'
            ) {
                throw error
            }

            console.log(
                '[DAMAR DRAW CHECK]',
                error?.message || error
            )
        }
    }


    throw new Error(
        'انتهت مدة الانتظار بدون نتيجة'
    )
}


// ============================================================
// إرسال الرسم
// ============================================================

async function sendDrawing(
    m,
    conn,
    imageUrl,
    originalSender
) {

    try {

        // --------------------------------------------------------
        // إنشاء الرسم
        // --------------------------------------------------------

        const resultUrl =
            await generateDrawing(
                imageUrl
            )


        if (!resultUrl) {
            throw new Error(
                'ما توصلناش بالصورة الناتجة'
            )
        }


        // --------------------------------------------------------
        // Session ID
        // --------------------------------------------------------

        const sessionId =
            Date.now().toString(36) +
            Math.random()
                .toString(36)
                .substring(2, 8)


        global.damarDrawSessions.set(
            sessionId,
            {
                image:
                    imageUrl,

                sender:
                    originalSender,

                created:
                    Date.now()
            }
        )


        // --------------------------------------------------------
        // حذف الجلسة بعد 10 دقائق
        // --------------------------------------------------------

        setTimeout(
            () => {

                global.damarDrawSessions.delete(
                    sessionId
                )

            },
            10 * 60 * 1000
        )


        // --------------------------------------------------------
        // إرسال الصورة
        // --------------------------------------------------------

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
┃ 🖼️ رسم بالقلم الرصاص
┃ ⚡ DAMAR-MD AUTO DRAW
┃
┃ 👑 المطور: ${DEVELOPER}
┃
╰━━━━━━━━━━━━━━⬣`,

                footer:
                    `${BOT_NAME} • ${DEVELOPER}`,

                buttons: [

                    // ------------------------------------------------
                    // تغيير الرسم
                    // ------------------------------------------------

                    {
                        name:
                            'quick_reply',

                        buttonParamsJson:
                            JSON.stringify({

                                display_text:
                                    '🔄 تغيير الرسم',

                                id:
                                    `damar_draw_again_${sessionId}`

                            })
                    },


                    // ------------------------------------------------
                    // حساب المطور
                    // ------------------------------------------------

                    {
                        name:
                            'cta_url',

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
                quoted:
                    m
            }
        )


        // --------------------------------------------------------
        // نجاح
        // --------------------------------------------------------

        try {
            await m.react('✅')
        } catch {}


    } catch (error) {

        console.error(
            '[DAMAR DRAW GENERATE]',
            error?.message || error
        )


        try {
            await m.react('❌')
        } catch {}


        try {

            await conn.reply(
                m.chat,
                `❌ *${BOT_NAME}*

ما قدرتش نصايب الرسم دابا.

جرب بصورة أخرى من فضلك.`,
                m
            )

        } catch {}
    }
}


// ============================================================
// استخراج ID ديال الزر
// ============================================================

function getButtonId(m) {

    try {

        // Buttons response
        const button =
            m?.message
                ?.buttonsResponseMessage
                ?.selectedButtonId

        if (button) {
            return button
        }


        // Template button
        const template =
            m?.message
                ?.templateButtonReplyMessage
                ?.selectedId

        if (template) {
            return template
        }


        // Interactive
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
// الأمر ON / OFF
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


        // ======================================================
        // تشغيل
        // ======================================================

        if (
            /^(?:[.!/])?رسوم\s+(اون|on)$/iu
                .test(text)
        ) {

            if (!isOwner) {

                return conn.reply(
                    m.chat,

`❌ غير صاحب البوت يقدر يتحكم فـ Auto Draw.

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
┃ 📷 أي واحد يصيفط صورة
┃ ✏️ غادي تتحول تلقائياً لرسم
┃
┃ 👑 المطور: ${DEVELOPER}
┃
╰━━━━━━━━━━━━━━⬣`,
                m
            )
        }


        // ======================================================
        // إيقاف
        // ======================================================

        if (
            /^(?:[.!/])?رسوم\s+(اوف|off)$/iu
                .test(text)
        ) {

            if (!isOwner) {

                return conn.reply(
                    m.chat,

`❌ غير صاحب البوت يقدر يتحكم فـ Auto Draw.

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
┃ باش تشغلو:
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


        // ======================================================
        // الخدمة OFF
        // ======================================================

        if (
            global.damarDrawEnabled !== true
        ) {
            return
        }


        // ======================================================
        // ما نعالجوش رسائل Baileys الداخلية
        // ======================================================

        if (
            m?.isBaileys
        ) {
            return
        }


        // ======================================================
        // ما نعالجوش صور البوت الناتجة
        // ======================================================

        if (
            isBotGeneratedImage(m)
        ) {
            return
        }


        // ======================================================
        // زر تغيير الرسم
        // ======================================================

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


            // --------------------------------------------------
            // غير صاحب الصورة يستعمل الزر
            // --------------------------------------------------

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


            // --------------------------------------------------
            // React
            // --------------------------------------------------

            try {
                await m.react('⌛')
            } catch {}


            // --------------------------------------------------
            // إعادة الرسم
            // --------------------------------------------------

            return sendDrawing(
                m,
                conn,
                session.image,
                m.sender
            )
        }


        // ======================================================
        // واش الميساج صورة؟
        // ======================================================

        if (
            !isImageMessage(m)
        ) {
            return
        }


        // ======================================================
        // ⌛ مباشرة
        // ======================================================

        try {
            await m.react('⌛')
        } catch {}


        // ======================================================
        // رفع الصورة
        // ======================================================

        const imageUrl =
            await uploadImage(m)


        if (!imageUrl) {

            try {
                await m.react('❌')
            } catch {}

            return
        }


        // ======================================================
        // إنشاء الرسم
        // ======================================================

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
            await m.react('❌')
        } catch {}
    }
}


// ============================================================
// معلومات Plugin
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