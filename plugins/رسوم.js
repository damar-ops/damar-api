/**
 * 🎨 DAMAR-MD AUTO DRAW
 *
 * Bot: 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃
 * Developer: أبو دمار شامل
 *
 * 📷 الصور فقط → ✏️ رسم بالقلم
 *
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
// حالة الرسم التلقائي
// ============================================================

if (typeof global.damarDrawEnabled === 'undefined') {
    global.damarDrawEnabled = true
}


// ============================================================
// جلسات تغيير الرسم
// ============================================================

global.damarDrawSessions =
    global.damarDrawSessions || new Map()


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
        ''
    ).trim()
}


// ============================================================
// استخراج MIME
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
// التأكد أنها صورة حقيقية
// ============================================================
//
// مهم:
// image/webp = غالباً Sticker
// لذلك ممنوع يدخل للرسم.
//
// المسموح:
// image/jpeg
// image/jpg
// image/png
// image/heic
// image/heif
//
// ============================================================

function isRealPhoto(m) {

    if (!m) {
        return false
    }


    // --------------------------------------------------------
    // Sticker = ممنوع
    // --------------------------------------------------------

    const mime =
        getMime(m)

    if (
        mime === 'image/webp' ||
        mime === 'image/x-webp'
    ) {
        return false
    }


    // --------------------------------------------------------
    // صورة Baileys مباشرة
    // --------------------------------------------------------

    if (
        m?.message?.imageMessage
    ) {
        return true
    }


    // --------------------------------------------------------
    // View Once
    // --------------------------------------------------------

    if (
        m?.message
            ?.viewOnceMessage
            ?.message
            ?.imageMessage
    ) {
        return true
    }


    // --------------------------------------------------------
    // View Once V2
    // --------------------------------------------------------

    if (
        m?.message
            ?.viewOnceMessageV2
            ?.message
            ?.imageMessage
    ) {
        return true
    }


    // --------------------------------------------------------
    // Gaff / Baileys normalized message
    // --------------------------------------------------------

    if (
        m?.mtype === 'imageMessage'
    ) {
        return true
    }


    // --------------------------------------------------------
    // MIME فقط للصور الحقيقية
    // --------------------------------------------------------

    if (
        mime === 'image/jpeg' ||
        mime === 'image/jpg' ||
        mime === 'image/png' ||
        mime === 'image/heic' ||
        mime === 'image/heif'
    ) {
        return true
    }


    return false
}


// ============================================================
// التحقق من صورة البوت
// ============================================================
//
// باش ما يدخلش فحلقة:
// البوت يرسل صورة → البوت يعالجها مرة أخرى
//

function isBotGeneratedImage(m) {

    const text =
        getText(m)

    if (!text) {
        return false
    }

    return (
        text.includes(BOT_NAME) &&
        text.includes(
            'تم تحويل الصورة إلى رسم'
        )
    )
}


// ============================================================
// رفع الصورة
// ============================================================

async function uploadImage(m) {

    try {

        let target =
            m


        // --------------------------------------------------------
        // إذا كان Reply على صورة
        // --------------------------------------------------------
        //
        // هذا غير مفيد للـAUTO.
        // لكن خليه موجود باش يبقى الكود متوافق.
        //

        if (m?.quoted) {

            const quotedMime =
                getMime(m.quoted)

            if (
                quotedMime === 'image/jpeg' ||
                quotedMime === 'image/jpg' ||
                quotedMime === 'image/png' ||
                quotedMime === 'image/heic' ||
                quotedMime === 'image/heif'
            ) {

                target =
                    m.quoted
            }
        }


        // --------------------------------------------------------
        // لازم تكون صورة حقيقية
        // --------------------------------------------------------

        if (
            !isRealPhoto(target)
        ) {
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

        let mime =
            getMime(target)


        if (
            !mime ||
            mime === 'image/webp'
        ) {
            mime =
                'image/jpeg'
        }


        // --------------------------------------------------------
        // FormData
        // --------------------------------------------------------

        const form =
            new FormData()


        form.append(
            'file',
            buffer,
            {
                filename:
                    'damar-draw.jpg',

                contentType:
                    mime
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

async function generateDrawing(
    imageUrl
) {

    const prompt = `
Transform the provided photograph into a highly detailed realistic graphite pencil drawing.

IMPORTANT:
Keep exactly the same person, face, identity, hairstyle, pose and composition.

The result must look like a real artist manually drew the original photograph on white paper.

STYLE:
realistic graphite pencil drawing
professional hand drawn portrait
fine pencil lines
detailed facial features
realistic eyes
realistic eyebrows
realistic lips
detailed hair strokes
soft graphite shading
cross hatching
natural shadows
white paper
high detail
realistic sketch

DO NOT:
change the person's identity
change the face
change the pose
add another person
remove the person
add text
add watermark
add logo
add frame
add decorations
use anime
use cartoon
use 3D
use colorful painting
use digital painting

Keep the original composition.

Make the final result look like a real pencil drawing made by a professional artist.
`


    const apiUrl =
        'https://omegatech-api.dixonomega.tech/api/ai/nano-banana2' +
        `?prompt=${encodeURIComponent(prompt)}` +
        `&image=${encodeURIComponent(imageUrl)}`


    // --------------------------------------------------------
    // Start
    // --------------------------------------------------------

    const start =
        await axios.get(
            apiUrl,
            {
                timeout:
                    30000
            }
        )


    const taskId =
        start.data?.task_id


    if (!taskId) {

        console.error(
            '[DAMAR DRAW API START]',
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
    // 20 × 3 ثواني
    // حوالي دقيقة كحد أقصى
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

            const response =
                await axios.get(
                    'https://omegatech-api.dixonomega.tech/api/ai/nano-banana2-result' +
                    `?task_id=${encodeURIComponent(taskId)}`,
                    {
                        timeout:
                            15000
                    }
                )


            const data =
                response.data


            // --------------------------------------------------
            // نجح
            // --------------------------------------------------

            if (
                data?.status === 'completed' &&
                data?.image_url
            ) {

                return data.image_url
            }


            // --------------------------------------------------
            // فشل
            // --------------------------------------------------

            if (
                data?.status === 'failed'
            ) {

                throw new Error(
                    'generation_failed'
                )
            }

        } catch (error) {

            if (
                error?.message ===
                'generation_failed'
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
        'generation_timeout'
    )
}


// ============================================================
// إرسال النتيجة
// ============================================================

async function sendDrawing(
    m,
    conn,
    imageUrl,
    sender
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
                'No result image'
            )
        }


        // --------------------------------------------------------
        // Session
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
                    sender,

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
                    url:
                        resultUrl
                },


                caption:
`╭━━━⪩ 🎨 ${BOT_NAME} ⪨━━━⬣
┃
┃ ✏️ تم تحويل الصورة إلى رسم
┃ 🖼️ رسم بالقلم الرصاص
┃ ⚡ AUTO DRAW
┃
┃ 👑 المطور: ${DEVELOPER}
┃
╰━━━━━━━━━━━━━━⬣`,

                footer:
                    `${BOT_NAME} • ${DEVELOPER}`,


                buttons: [

                    // ==================================================
                    // تغيير الرسم
                    // ==================================================

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


                    // ==================================================
                    // حساب المطور
                    // ==================================================

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
        // Success
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

`❌ ${BOT_NAME}

ما قدرتش نصايب الرسم دابا.

جرب بصورة أخرى من فضلك.`,
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

        // --------------------------------------------------------
        // Buttons
        // --------------------------------------------------------

        const button =
            m?.message
                ?.buttonsResponseMessage
                ?.selectedButtonId


        if (button) {
            return button
        }


        // --------------------------------------------------------
        // Template
        // --------------------------------------------------------

        const template =
            m?.message
                ?.templateButtonReplyMessage
                ?.selectedId


        if (template) {
            return template
        }


        // --------------------------------------------------------
        // Interactive
        // --------------------------------------------------------

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
// Handler ديال الأوامر
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
        // .رسوم فقط
        // ======================================================

        if (
            /^(?:[.!/])?رسوم$/iu
                .test(text)
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
┃ 📷 كيفاش تخدم؟
┃ صيفط أي صورة فقط
┃ وغادي تتحول تلقائياً لرسم بالقلم ✏️
┃
┃ 🟢 تشغيل:
┃ .رسوم اون
┃
┃ 🔴 إيقاف:
┃ .رسوم اوف
┃
┃ 👑 المطور:
┃ ${DEVELOPER}
┃
╰━━━━━━━━━━━━━━⬣`,
                m
            )
        }


        // ======================================================
        // .رسوم اون
        // ======================================================

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
┃ 📷 أي صورة حقيقية
┃ ✏️ غادي تتحول تلقائياً لرسم
┃
┃ 👑 المطور: ${DEVELOPER}
┃
╰━━━━━━━━━━━━━━⬣`,
                m
            )
        }


        // ======================================================
        // .رسوم اوف
        // ======================================================

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


        // ======================================================
        // OFF
        // ======================================================

        if (
            global.damarDrawEnabled !== true
        ) {
            return
        }


        // ======================================================
        // تجاهل رسائل النظام
        // ======================================================

        if (
            m?.isBaileys
        ) {
            return
        }


        // ======================================================
        // تجاهل الصور الناتجة ديال البوت
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
            // غير صاحب الصورة
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


        // ======================================================
        // مهم:
        // غير الصور الحقيقية
        //
        // Sticker = image/webp
        // وغادي يتجاهلو.
        // ======================================================

        if (
            !isRealPhoto(m)
        ) {
            return
        }


        // ======================================================
        // ⌛
        // ======================================================

        try {
            await m.react('⌛')
        } catch {}


        // ======================================================
        // Upload
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
        // Generate
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