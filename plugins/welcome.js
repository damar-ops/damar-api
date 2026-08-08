// ====================================================
// 🇲🇦 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 | WELCOME SYSTEM
// ====================================================

import axios from 'axios'
import sharp from 'sharp'

const BOT_NAME = '𝐃𝐀𝐌𝐀𝐑-𝐌𝐃'
const DEV_NAME = 'ابو دمار شامل'
const DEV_NUMBER = '+212 633-226499'

// ====================================================
// 🖼️ التصميم الأصلي
// ====================================================

const TEMPLATE_URL =
'https://litter.catbox.moe/4kzwti.jpg'

// ====================================================
// 📱 تحويل JID إلى رقم
// ====================================================

function getNumber(jid) {

    if (!jid)
        return '+212 XXXXXXXX'

    let n = String(jid)
        .split('@')[0]
        .replace(/\D/g, '')

    if (!n)
        return '+212 XXXXXXXX'

    if (n.startsWith('212'))
        return '+' + n

    if (n.startsWith('0'))
        return '+212' + n.substring(1)

    return '+' + n
}

// ====================================================
// 👤 اسم المستخدم
// ====================================================

async function getName(conn, jid) {

    try {

        const name =
            await conn.getName(jid)

        if (name)
            return String(name)

    } catch {}

    return getNumber(jid)
}

// ====================================================
// 🖼️ صورة البروفايل
// ====================================================

async function getProfile(conn, jid) {

    try {

        const url =
            await conn.profilePictureUrl(
                jid,
                'image'
            )

        const res =
            await axios.get(
                url,
                {
                    responseType:
                        'arraybuffer',
                    timeout: 15000
                }
            )

        return Buffer.from(
            res.data
        )

    } catch {

        return null
    }
}

// ====================================================
// 🔵 عمل صورة دائرية
// ====================================================

async function circleImage(buffer) {

    if (!buffer)
        return null

    const size = 500

    const mask = Buffer.from(`
<svg width="${size}" height="${size}">
    <circle
        cx="250"
        cy="250"
        r="250"
        fill="white"
    />
</svg>
`)

    return await sharp(buffer)
        .resize(
            size,
            size,
            {
                fit: 'cover',
                position: 'centre'
            }
        )
        .composite([
            {
                input: mask,
                blend: 'dest-in'
            }
        ])
        .png()
        .toBuffer()
}

// ====================================================
// 🖼️ إنشاء التصميم النهائي
// ====================================================

async function makeWelcomeImage(
    conn,
    jid,
    type
) {

    const name =
        await getName(
            conn,
            jid
        )

    const number =
        getNumber(jid)

    const profile =
        await getProfile(
            conn,
            jid
        )

    // ------------------------------------------------
    // تحميل التصميم الأصلي
    // ------------------------------------------------

    const response =
        await axios.get(
            TEMPLATE_URL,
            {
                responseType:
                    'arraybuffer',
                timeout: 20000
            }
        )

    const background =
        Buffer.from(
            response.data
        )

    // ------------------------------------------------
    // صورة العضو
    // ------------------------------------------------

    const avatar =
        await circleImage(
            profile
        )

    // ------------------------------------------------
    // دخول / خروج
    // ------------------------------------------------

    const isJoin =
        type === 'add'

    const mainColor =
        isJoin
            ? '#00ff00'
            : '#ff2222'

    const symbol =
        isJoin
            ? '+'
            : '−'

    // ------------------------------------------------
    // SVG
    // ------------------------------------------------

    const overlay = Buffer.from(`
<svg
    width="1536"
    height="864"
    xmlns="http://www.w3.org/2000/svg"
>

    <!-- ================================= -->
    <!-- تغطية الاسم القديم فقط -->
    <!-- ================================= -->

    <rect
        x="555"
        y="375"
        width="430"
        height="105"
        rx="20"
        fill="#160014"
        opacity="0.92"
    />

    <!-- ================================= -->
    <!-- اسم العضو -->
    <!-- ================================= -->

    <text
        x="770"
        y="445"
        text-anchor="middle"
        fill="${mainColor}"
        font-family="Arial"
        font-size="48"
        font-weight="bold"
        direction="rtl"
    >
        ${escapeXml(name)}
    </text>


    <!-- ================================= -->
    <!-- تغطية الرقم القديم -->
    <!-- ================================= -->

    <rect
        x="40"
        y="690"
        width="570"
        height="85"
        rx="20"
        fill="#070014"
        opacity="0.90"
    />

    <!-- ================================= -->
    <!-- رقم العضو -->
    <!-- ================================= -->

    <text
        x="325"
        y="750"
        text-anchor="middle"
        fill="white"
        font-family="Arial"
        font-size="44"
        font-weight="bold"
        direction="ltr"
    >
        ${escapeXml(number)}
    </text>


    <!-- ================================= -->
    <!-- دائرة صغيرة + / - -->
    <!-- ================================= -->

    <circle
        cx="495"
        cy="495"
        r="45"
        fill="${mainColor}"
        stroke="#ffffff"
        stroke-width="6"
    />

    <text
        x="495"
        y="512"
        text-anchor="middle"
        fill="white"
        font-family="Arial"
        font-size="62"
        font-weight="bold"
    >
        ${symbol}
    </text>

</svg>
`)

    // ------------------------------------------------
    // تركيب العناصر
    // ------------------------------------------------

    let layers = [
        {
            input: overlay,
            top: 0,
            left: 0
        }
    ]

    // ------------------------------------------------
    // تركيب صورة البروفايل فوق الدائرة الخضراء
    // ------------------------------------------------

    if (avatar) {

        layers.push({
            input: avatar,
            top: 50,
            left: 47
        })

    }

    // ------------------------------------------------
    // إخراج التصميم
    // ------------------------------------------------

    return await sharp(background)
        .resize(
            1536,
            864,
            {
                fit: 'fill'
            }
        )
        .composite(layers)
        .jpeg({
            quality: 95
        })
        .toBuffer()
}

// ====================================================
// حماية XML
// ====================================================

function escapeXml(text) {

    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

// ====================================================
// 🎛️ أمر WELCOME
// ====================================================

let handler = async (
    m,
    {
        conn,
        args,
        isOwner
    }
) => {

    if (!isOwner) {

        return m.reply(
`⛔ هاد الأمر خاص بمالك البوت.

🤖 البوت: ${BOT_NAME}
👨‍💻 المطور: ${DEV_NAME}`
        )
    }

    const option =
        String(
            args[0] || ''
        ).toLowerCase()

    if (
        !['on', 'off'].includes(option)
    ) {

        return m.reply(
`🇲🇦 ${BOT_NAME} | WELCOME

استعمل:

✅ .welcome on

🛑 .welcome off

👨‍💻 ${DEV_NAME}
📱 ${DEV_NUMBER}`
        )
    }

    const enabled =
        option === 'on'

    let groups =
        new Set()

    // ----------------------------------------------
    // قاعدة البيانات
    // ----------------------------------------------

    for (
        const jid of Object.keys(
            global.db?.data?.chats || {}
        )
    ) {

        if (
            jid.endsWith('@g.us')
        ) {

            groups.add(jid)

        }
    }

    // ----------------------------------------------
    // المجموعات الحالية
    // ----------------------------------------------

    for (
        const jid of Object.keys(
            conn.chats || {}
        )
    ) {

        if (
            jid.endsWith('@g.us')
        ) {

            groups.add(jid)

        }
    }

    let total = 0

    // ----------------------------------------------
    // تشغيل / إيقاف
    // ----------------------------------------------

    for (
        const jid of groups
    ) {

        if (
            !global.db.data.chats[jid]
        ) {

            global.db.data.chats[jid] = {}

        }

        global.db.data.chats[jid].welcome =
            enabled

        global.db.data.chats[jid].sWelcome =
`🇲🇦 مرحبا بيك @user ❤️`

        global.db.data.chats[jid].sBye =
`👋 بالسلامة @user ❤️`

        total++

    }

    // ----------------------------------------------
    // حفظ
    // ----------------------------------------------

    try {

        if (
            typeof global.db.write ===
            'function'
        ) {

            await global.db.write()

        }

    } catch (e) {

        console.log(
            'DB ERROR:',
            e
        )

    }

    // ----------------------------------------------
    // النتيجة
    // ----------------------------------------------

    return m.reply(

enabled

? `╭━━━〔 🇲🇦 ${BOT_NAME} 〕━━━╮

✅ WELCOME ON

خدام دابا.

👥 المجموعات:
${total}

🖼️ صورة العضو:
تدخل داخل الدائرة.

👤 الاسم:
يظهر تلقائياً.

📱 الرقم:
يظهر تلقائياً.

🟢 دخول = +

🔴 خروج = −

╰━━━━━━━━━━━━━━━━━━╯`

:

`╭━━━〔 🇲🇦 ${BOT_NAME} 〕━━━╮

🛑 WELCOME OFF

تم إيقاف الترحيب والوداع.

👥 المجموعات:
${total}

╰━━━━━━━━━━━━━━━━━━╯`

    )
}

// ====================================================
// 🔥 EVENT دخول / خروج
// ====================================================

function setupWelcome(conn) {

    if (!conn?.ev)
        return

    // مهم: ما نركبوش Event أكثر من مرة
    if (conn.__DAMAR_WELCOME)
        return

    conn.__DAMAR_WELCOME = true

    conn.ev.on(
        'group-participants.update',
        async update => {

            try {

                const {
                    id,
                    participants,
                    action
                } = update

                // ------------------------------------
                // لازم مجموعة
                // ------------------------------------

                if (
                    !id ||
                    !id.endsWith('@g.us')
                )
                    return

                // ------------------------------------
                // لازم add/remove
                // ------------------------------------

                if (
                    action !== 'add' &&
                    action !== 'remove'
                )
                    return

                // ------------------------------------
                // التحقق من WELCOME
                // ------------------------------------

                const chat =
                    global.db?.data?.chats?.[id]

                if (!chat?.welcome)
                    return

                // ------------------------------------
                // معلومات المجموعة
                // ------------------------------------

                let metadata

                try {

                    metadata =
                        await conn.groupMetadata(
                            id
                        )

                } catch {

                    return
                }

                const subject =
                    metadata.subject ||
                    'المجموعة'

                // ------------------------------------
                // الأعضاء
                // ------------------------------------

                for (
                    const participant
                    of participants
                ) {

                    const user =
                        typeof participant ===
                        'string'
                            ? participant
                            : participant.id

                    if (!user)
                        continue

                    // --------------------------------
                    // إنشاء التصميم
                    // --------------------------------

                    const image =
                        await makeWelcomeImage(
                            conn,
                            user,
                            action
                        )

                    const name =
                        await getName(
                            conn,
                            user
                        )

                    const number =
                        getNumber(
                            user
                        )

                    // --------------------------------
                    // رسالة
                    // --------------------------------

                    let caption

                    if (
                        action === 'add'
                    ) {

                        caption =
`🇲🇦 *مرحبا بيك* ❤️

👤 ${name}
📱 ${number}

🏠 نورت مجموعة:
*${subject}*

🤖 ${BOT_NAME}`

                    } else {

                        caption =
`👋 *بالسلامة*

👤 ${name}
📱 ${number}

🏠 مجموعة:
*${subject}*

🤖 ${BOT_NAME}

❤️ الله يعاونك فين ما كنت`

                    }

                    // --------------------------------
                    // إرسال الصورة
                    // --------------------------------

                    await conn.sendMessage(
                        id,
                        {
                            image: image,
                            caption: caption,
                            mentions: [
                                user
                            ]
                        }
                    )

                }

            } catch (e) {

                console.log(
                    'WELCOME ERROR:',
                    e
                )

            }

        }
    )
}

// ====================================================
// تفعيل Event عند تحميل الأمر
// ====================================================

handler.before = async function (
    m,
    {
        conn
    }
) {

    setupWelcome(conn)

}

// ====================================================
// معلومات الأمر
// ====================================================

handler.help = [
    'welcome on',
    'welcome off'
]

handler.tags = [
    'owner'
]

handler.command =
    /^welcome$/i

handler.owner = true

export default handler