/**
 * 🍌 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 | NANO BANANA AI V7
 * Developer: +212 633-226499
 *
 * طريقة الاستعمال:
 *
 * 1) صيفط صورة
 * 2) صيفط صورة ثانية
 * 3) صيفط الثالثة والرابعة إذا بغيتي
 *
 * من بعد:
 *
 * .nano دير هاد الأشخاص مع بعض
 *
 * أو:
 *
 * .nano دير هاد الأشخاص فقاعة أفراح
 *
 * =========================================================
 *
 * مهم:
 * ما تعتمدش هاد النسخة على handler.all
 * الصور كتتجمع باستعمال أمر nanoimg
 *
 * الطريقة:
 *
 * .nanoimg
 *
 * ثم صيفط الصور وحدة بوحدة
 *
 * من بعد:
 *
 * .nano دير هاد الأشخاص مع بعض
 *
 * =========================================================
 */

import axios from 'axios'
import FormData from 'form-data'

const BOT_NAME = '𝐃𝐀𝐌𝐀𝐑-𝐌𝐃'
const DEV_NUMBER = '+212 633-226499'

/* =========================================================
   SETTINGS
========================================================= */

const MAX_IMAGES = 4
const MIN_IMAGES = 2

const MAX_RETRIES = 3
const RETRY_DELAY = 4000

const POLL_DELAY = 4000
const MAX_POLLS = 30

const SESSION_TIME = 10 * 60 * 1000

/* =========================================================
   SESSIONS
========================================================= */

const sessions = new Map()

/*
session:

{
    images: [],
    createdAt: Date.now()
}
*/

/* =========================================================
   SLEEP
========================================================= */

const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms))

/* =========================================================
   SESSION
========================================================= */

function getSession(userId) {

    let session = sessions.get(userId)

    if (!session) {

        session = {
            images: [],
            createdAt: Date.now()
        }

        sessions.set(
            userId,
            session
        )
    }

    if (
        Date.now() -
        session.createdAt >
        SESSION_TIME
    ) {

        session = {
            images: [],
            createdAt: Date.now()
        }

        sessions.set(
            userId,
            session
        )
    }

    return session
}

/* =========================================================
   CLEAR SESSION
========================================================= */

function clearSession(userId) {

    sessions.delete(userId)
}

/* =========================================================
   MIME
========================================================= */

function getMime(message) {

    return (
        message?.mimetype ||
        message?.msg?.mimetype ||
        message?.message?.imageMessage?.mimetype ||
        ''
    )
}

/* =========================================================
   IMAGE CHECK
========================================================= */

function isImage(message) {

    return /image/i.test(
        getMime(message)
    )
}

/* =========================================================
   UPLOAD
========================================================= */

async function uploadImage(message) {

    try {

        const target =
            message?.quoted &&
            isImage(message.quoted)
                ? message.quoted
                : message

        if (!isImage(target)) {

            throw new Error(
                'الرسالة ما فيهاش صورة.'
            )
        }

        let buffer = null

        /*
         * الطريقة الأولى
         */

        if (
            typeof target.download === 'function'
        ) {

            buffer =
                await target.download()
        }

        /*
         * الطريقة الثانية
         */

        if (
            !buffer &&
            typeof target.downloadMedia === 'function'
        ) {

            buffer =
                await target.downloadMedia()
        }

        if (!buffer) {

            throw new Error(
                'ما قدرناش نهبطو الصورة.'
            )
        }

        const mime =
            getMime(target) ||
            'image/jpeg'

        const form =
            new FormData()

        form.append(
            'file',
            buffer,
            {
                filename:
                    `damar-${Date.now()}.jpg`,
                contentType:
                    mime
            }
        )

        form.append(
            'type',
            'permanent'
        )

        const response =
            await axios.post(
                'https://tmp.malvryx.dev/upload',
                form,
                {
                    headers:
                        form.getHeaders(),

                    timeout:
                        60000,

                    maxBodyLength:
                        Infinity,

                    maxContentLength:
                        Infinity
                }
            )

        const data =
            response.data || {}

        const url =
            data.cdnUrl ||
            data.directUrl ||
            data.url

        if (!url) {

            throw new Error(
                'Upload API ما رجعش رابط الصورة.'
            )
        }

        return url

    } catch (error) {

        console.error(
            '🍌 Upload:',
            error?.response?.data ||
            error.message
        )

        return null
    }
}

/* =========================================================
   GET WITH RETRY
========================================================= */

async function getWithRetry(
    url,
    options = {}
) {

    let lastError = null

    for (
        let attempt = 1;
        attempt <= MAX_RETRIES;
        attempt++
    ) {

        try {

            return await axios.get(
                url,
                options
            )

        } catch (error) {

            lastError =
                error

            const status =
                error?.response?.status

            const retry =
                status === 502 ||
                status === 503 ||
                status === 504 ||
                error.code === 'ECONNABORTED' ||
                error.code === 'ETIMEDOUT' ||
                error.code === 'ECONNRESET' ||
                !error.response

            console.log(
                `🍌 API ${attempt}/${MAX_RETRIES} - ${status || error.code || 'ERROR'}`
            )

            if (!retry) {

                throw error
            }

            if (
                attempt <
                MAX_RETRIES
            ) {

                await sleep(
                    RETRY_DELAY *
                    attempt
                )
            }
        }
    }

    throw lastError
}

/* =========================================================
   POLL
========================================================= */

async function waitResult(
    taskId
) {

    for (
        let i = 0;
        i < MAX_POLLS;
        i++
    ) {

        await sleep(
            POLL_DELAY
        )

        try {

            const response =
                await getWithRetry(
                    `https://omegatech-api.dixonomega.tech/api/ai/nano-banana2-result?task_id=${encodeURIComponent(taskId)}`,
                    {
                        timeout:
                            30000
                    }
                )

            const data =
                response.data || {}

            if (
                data.status ===
                'completed'
            ) {

                return (
                    data.image_url ||
                    data.image ||
                    data.url ||
                    null
                )
            }

            if (
                data.status ===
                'failed'
            ) {

                return null
            }

        } catch (error) {

            const status =
                error?.response?.status

            if (
                status === 502 ||
                status === 503 ||
                status === 504
            ) {

                continue
            }

            throw error
        }
    }

    return null
}

/* =========================================================
   MULTI PROMPT
========================================================= */

function multiPrompt(
    description,
    number
) {

    const variations = [

        `
Natural realistic photography.
Normal camera angle.
Natural lighting.
`,

        `
Different camera angle.
Professional composition.
Natural cinematic lighting.
`,

        `
Different framing.
Professional photography.
Natural environment and realistic proportions.
`,

        `
Creative professional composition.
Different perspective.
Realistic cinematic atmosphere.
`
    ]

    return `
USER REQUEST:

${description}

REFERENCE IMAGES:

There are multiple uploaded reference images.

USE ALL REFERENCE IMAGES.

If the reference images contain different people,
put ALL of those people together in ONE SINGLE IMAGE.

Each person must remain a separate person.

IMPORTANT:

- Preserve each person's recognizable identity.
- Preserve facial characteristics.
- Preserve hairstyle when possible.
- Do not merge faces.
- Do not replace people with random people.
- Do not remove a requested person.
- Do not invent additional people.
- Keep realistic body proportions.
- Make the people appear naturally together.
- Follow the user's description exactly.

If the user says:

"دير هاد الأشخاص مع بعض"

then place all uploaded people together
in the same realistic scene.

This is result ${number + 1} of 4.

${variations[number]}

Return ONE finished image.
`
}

/* =========================================================
   NANO PRO
========================================================= */

async function generateMulti(
    images,
    description
) {

    const results = []

    for (
        let i = 0;
        i < MAX_IMAGES;
        i++
    ) {

        try {

            const prompt =
                multiPrompt(
                    description,
                    i
                )

            let url =
                `https://omegatech-api.dixonomega.tech/api/ai/nanobana-pro-v3?prompt=${encodeURIComponent(prompt)}`

            images.forEach(
                (image, index) => {

                    url +=
                        `&image${index + 1}=${encodeURIComponent(image)}`
                }
            )

            console.log(
                `🍌 Nano Pro ${i + 1}/4`
            )

            const response =
                await getWithRetry(
                    url,
                    {
                        timeout:
                            120000
                    }
                )

            const data =
                response.data || {}

            let result = null

            if (
                data.task_id
            ) {

                result =
                    await waitResult(
                        data.task_id
                    )

            } else {

                result =
                    data.image_url ||
                    data.image ||
                    data.url ||
                    null
            }

            if (result) {

                results.push(
                    result
                )
            }

        } catch (error) {

            console.error(
                `❌ Nano Pro ${i + 1}:`,
                error?.response?.data ||
                error.message
            )
        }

        if (
            i <
            MAX_IMAGES - 1
        ) {

            await sleep(2000)
        }
    }

    return results
}

/* =========================================================
   SINGLE IMAGE EDIT
========================================================= */

async function generateSingle(
    image,
    description
) {

    const results = []

    for (
        let i = 0;
        i < MAX_IMAGES;
        i++
    ) {

        try {

            const prompt = `
USER REQUEST:

${description}

The uploaded image is the original reference.

Keep the exact same person.

Preserve:
- face
- identity
- body
- hairstyle
- important visual details

Only perform the modification requested by the user.

Do not replace the person.

Create realistic professional photography.

Variation ${i + 1} of 4.

Make this variation visually different
through camera angle, lighting or framing.
`

            const response =
                await getWithRetry(
                    `https://omegatech-api.dixonomega.tech/api/ai/nano-banana2?prompt=${encodeURIComponent(prompt)}&image=${encodeURIComponent(image)}`,
                    {
                        timeout:
                            120000
                    }
                )

            const data =
                response.data || {}

            let result = null

            if (
                data.task_id
            ) {

                result =
                    await waitResult(
                        data.task_id
                    )

            } else {

                result =
                    data.image_url ||
                    data.image ||
                    data.url ||
                    null
            }

            if (result) {

                results.push(
                    result
                )
            }

        } catch (error) {

            console.error(
                `❌ Single ${i + 1}:`,
                error.message
            )
        }

        await sleep(1500)
    }

    return results
}

/* =========================================================
   SEND RESULTS
========================================================= */

async function sendResults(
    conn,
    m,
    results,
    description
) {

    for (
        let i = 0;
        i < results.length;
        i++
    ) {

        const last =
            i ===
            results.length - 1

        const message = {

            image: {
                url:
                    results[i]
            }
        }

        /*
         * الرسالة غير فالصورة الأخيرة
         */

        if (last) {

            message.caption =
`╭━━━〔 🎨 ${BOT_NAME} 〕━━━╮
┃
┃ ✅ *النتيجة ${i + 1}/${results.length}*
┃
┃ 📝 *الوصف:*
┃ ${description}
┃
┃ 💡 اختار الصورة اللي عجباتك.
┃
┃ 👨‍💻 ${DEV_NUMBER}
┃
╰━━━━━━━━━━━━━━━━━━╯`
        }

        await conn.sendMessage(
            m.chat,
            message,
            {
                quoted: m
            }
        )

        await sleep(800)
    }
}

/* =========================================================
   COLLECT COMMAND
========================================================= */

async function collectImage(
    m,
    conn
) {

    const userId =
        `${m.chat}:${m.sender}`

    const session =
        getSession(userId)

    const url =
        await uploadImage(m)

    if (!url) {

        return conn.reply(
            m.chat,

`❌ *${BOT_NAME}*

ما قدرتش نرفع الصورة.

🔄 حاول صيفطها من جديد.`,
            m
        )
    }

    /*
     * ما نكرروش نفس الصورة
     */

    if (
        !session.images.includes(url)
    ) {

        session.images.push(
            url
        )
    }

    session.createdAt =
        Date.now()

    const count =
        session.images.length

    return conn.reply(
        m.chat,

`╭━━━〔 🍌 ${BOT_NAME} 〕━━━╮
┃
┃ ✅ *الصورة تزادت*
┃
┃ 🖼️ الصور: *${count}/${MAX_IMAGES}*
┃
┃ ${count < MAX_IMAGES
    ? 'صيفط صورة أخرى إذا بغيتي.'
    : 'وصلتي للحد الأقصى.'}
┃
┃ من بعد كتب:
┃
┃ *.nano دير هاد الأشخاص مع بعض*
┃
╰━━━━━━━━━━━━━━━━━━╯`,
        m
    )
}

/* =========================================================
   GUIDE
========================================================= */

async function guide(
    m,
    conn,
    prefix
) {

    return conn.reply(
        m.chat,

`╭━━━〔 🍌 ${BOT_NAME} 〕━━━╮
┃
┃ 🤖 *NANO BANANA AI*
┃
┃ 🖼️ جمع 2 حتى 4 صور
┃ 👥 جمع الأشخاص
┃ 🎨 تعديل الصور
┃ ✨ 4 نتائج
┃
╰━━━━━━━━━━━━━━━━━━╯

📌 *الطريقة:*

أولاً كتب:

${prefix}nanoimg

من بعد صيفط:

📷 الصورة الأولى
📷 الصورة الثانية
📷 الصورة الثالثة
📷 الصورة الرابعة

ومن بعد كتب:

${prefix}nano دير هاد الأشخاص مع بعض

مثال:

${prefix}nano دير هاد الأشخاص فقاعة أفراح

أو:

${prefix}nano دير هاد الأشخاص فطبيعة جميلة

━━━━━━━━━━━━━━━━━━

📌 *صورة وحدة فقط:*

رد على الصورة وكتب:

${prefix}nano بدل الخلفية وخليها فالطبيعة

━━━━━━━━━━━━━━━━━━

👨‍💻 ${DEV_NUMBER}
╰━━━━━━━━━━━━━━━━━━╯`,
        m
    )
}

/* =========================================================
   MAIN
========================================================= */

const handler = async (
    m,
    {
        conn,
        text,
        usedPrefix,
        command
    }
) => {

    const cmd =
        String(command || '')
            .toLowerCase()

    text =
        String(text || '')
            .trim()

    const userId =
        `${m.chat}:${m.sender}`

    /* =====================================================
       NANOIMG
    ===================================================== */

    if (
        cmd === 'nanoimg'
    ) {

        return collectImage(
            m,
            conn
        )
    }

    /* =====================================================
       NANO
    ===================================================== */

    if (
        cmd !== 'nano'
    ) {
        return
    }

    /*
     * إذا ما عطاش وصف
     */

    if (!text) {

        return guide(
            m,
            conn,
            usedPrefix
        )
    }

    const session =
        sessions.get(userId)

    await m.react('⏳')

    try {

        /*
         * =================================================
         * MULTI IMAGES
         * =================================================
         */

        if (
            session &&
            session.images.length >= MIN_IMAGES
        ) {

            const images =
                [...session.images]

            console.log(
                `🍌 Using ${images.length} images`
            )

            const results =
                await generateMulti(
                    images,
                    text
                )

            if (
                !results.length
            ) {

                throw new Error(
                    'Nano Pro ما رجع حتى نتيجة.'
                )
            }

            await sendResults(
                conn,
                m,
                results,
                text
            )

            clearSession(
                userId
            )

            await m.react('✅')

            return
        }

        /*
         * =================================================
         * SINGLE IMAGE FROM REPLY
         * =================================================
         */

        if (
            m.quoted &&
            isImage(m.quoted)
        ) {

            const image =
                await uploadImage(
                    m.quoted
                )

            if (!image) {

                throw new Error(
                    'ما قدرناش نرفع الصورة.'
                )
            }

            const results =
                await generateSingle(
                    image,
                    text
                )

            if (
                !results.length
            ) {

                throw new Error(
                    'السيرفر ما رجع حتى نتيجة.'
                )
            }

            await sendResults(
                conn,
                m,
                results,
                text
            )

            clearSession(
                userId
            )

            await m.react('✅')

            return
        }

        /*
         * =================================================
         * NO IMAGES
         * =================================================
         */

        return conn.reply(
            m.chat,

`⚠️ *${BOT_NAME}*

ما لقيتش الصور.

📸 أولاً كتب:

*${usedPrefix}nanoimg*

ومن بعد صيفط من 2 حتى 4 صور.

ثم كتب:

*${usedPrefix}nano دير هاد الأشخاص مع بعض*`,
            m
        )

    } catch (error) {

        console.error(
            '🍌 NANO ERROR:',
            error
        )

        clearSession(
            userId
        )

        await m.react('❌')

        return conn.reply(
            m.chat,

`❌ *${BOT_NAME}*

ما قدرناش نكملو العملية.

📌 *السبب:*
${error?.message || 'خطأ غير معروف'}

🔄 جرب من جديد.`,
            m
        )
    }
}

/* =========================================================
   COMMANDS
========================================================= */

handler.help = [
    'nano',
    'nanoimg'
]

handler.command = [
    'nano',
    'nanoimg'
]

handler.tags = [
    'editor'
]

handler.limit = false

export default handler