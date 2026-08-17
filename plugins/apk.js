// ============================================================
// 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 APK DOWNLOADER
// Aptoide Search + Interactive Buttons
// دعم APK كبيرة
// بدون صلاحية / بدون Limit
// بدون externalAdReply
// بدون Thumbnail مع ملف APK
// Developer: +212 633-226499
// ============================================================

import axios from 'axios'

const MAX_RESULTS = 10

// ============================================================
// صورة واجهة APK
// ============================================================

const APK_IMAGE =
    'https://cdn.zass.in/BkzOSUi6ba.jpeg'

// ============================================================
// معلومات المطور
// ============================================================

const DEVELOPER_NUMBER =
    '212633226499'

const DEVELOPER_PHONE =
    '+212 633-226499'

const DEVELOPER_FACEBOOK =
    'https://www.facebook.com/profile.php?id=61591783185803'

// ============================================================
// جلسات البحث
// بدون انتهاء صلاحية
// ============================================================

global.apkSessions =
    global.apkSessions || {}


// ============================================================
// تنظيف اسم APK
// ============================================================

function safeFileName(name) {

    return String(name || 'application')
        .replace(/[\\/:*?"<>|]/g, '')
        .trim()
        .slice(0, 100)

}


// ============================================================
// تحويل الحجم
// ============================================================

function formatSize(bytes) {

    if (
        bytes === undefined ||
        bytes === null ||
        isNaN(bytes)
    ) {
        return 'غير معروف'
    }

    const n =
        Number(bytes)

    if (n < 1024)
        return `${n} B`

    if (n < 1024 * 1024)
        return `${(n / 1024).toFixed(1)} KB`

    if (n < 1024 * 1024 * 1024)
        return `${(n / 1024 / 1024).toFixed(2)} MB`

    return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`

}


// ============================================================
// Aptoide API
// ============================================================

const aptoide = {

    search: async function (query) {

        const url =
            `https://ws75.aptoide.com/api/7/apps/search?query=${encodeURIComponent(query)}&limit=${MAX_RESULTS}`

        const response =
            await axios.get(
                url,
                {
                    timeout: 30000
                }
            )

        const list =
            response.data?.datalist?.list

        if (!Array.isArray(list))
            return []

        return list
            .slice(0, MAX_RESULTS)
            .map(app => {

                const file =
                    app.file || {}

                return {

                    name:
                        app.name ||
                        'Unknown',

                    package:
                        app.package ||
                        '',

                    icon:
                        app.icon ||
                        null,

                    version:
                        file.vername ||
                        file.vercode ||
                        'N/A',

                    size:
                        file.filesize ||
                        app.size ||
                        0,

                    download:
                        app.stats?.downloads ||
                        0,

                    developer:
                        app.store?.name ||
                        app.developer?.name ||
                        'Unknown',

                    path:
                        file.path ||
                        null,

                    path_alt:
                        file.path_alt ||
                        file.path ||
                        null,

                    updated:
                        app.updated ||
                        'N/A'

                }

            })
            .filter(
                app => app.name
            )

    }

}


// ============================================================
// إرسال APK
// ============================================================

async function sendApk(
    conn,
    m,
    app
) {

    if (!app)
        throw new Error(
            'التطبيق غير موجود.'
        )


    // ========================================================
    // اختيار رابط APK
    // ========================================================

    const downloadUrl =
        app.path_alt ||
        app.path


    if (!downloadUrl)
        throw new Error(
            'رابط تحميل APK غير متوفر.'
        )


    // ========================================================
    // معلومات التطبيق
    // ========================================================

    const caption = `
╭━━━〔 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 〕━━━╮
┃ 📱 الاسم: ${app.name}
┃ 📦 الإصدار: ${app.version}
┃ 📦 Package: ${app.package || 'N/A'}
┃ 👨‍💻 المطور: ${app.developer}
┃ 💾 الحجم: ${formatSize(app.size)}
┃ 📥 التحميلات: ${app.download || 0}
┃ 📅 التحديث: ${app.updated}
┃
┃ 🤖 البوت: 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃
┃ 📞 ${DEVELOPER_PHONE}
╰━━━━━━━━━━━━━━━━━━╯
`.trim()


    // ========================================================
    // إرسال معلومات التطبيق
    // ========================================================

    if (app.icon) {

        try {

            await conn.sendMessage(
                m.chat,
                {
                    image: {
                        url: app.icon
                    },
                    caption: caption
                },
                {
                    quoted: m
                }
            )

        } catch {

            await m.reply(
                caption
            )

        }

    } else {

        await m.reply(
            caption
        )

    }


    // ========================================================
    // React فقط
    // لا توجد رسالة "جاري التحميل"
    // ========================================================

    try {

        await m.react('⬇️')

    } catch {}


    // ========================================================
    // إرسال APK مباشرة
    // مناسب أكثر للملفات الكبيرة
    // ========================================================

    await conn.sendMessage(
        m.chat,
        {

            document: {
                url: downloadUrl
            },

            fileName:
                `${safeFileName(app.name)}.apk`,

            mimetype:
                'application/vnd.android.package-archive',

            caption:
                `📱 ${app.name}\n\n` +
                `🚀 بواسطة 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃\n` +
                `📞 ${DEVELOPER_PHONE}`

            // لا externalAdReply
            // لا thumbnail
            // لا صورة مع APK

        },
        {
            quoted: m
        }
    )


    // ========================================================
    // نجاح
    // ========================================================

    try {

        await m.react('✅')

    } catch {}

}


// ============================================================
// Handler
// ============================================================

let handler = async (
    m,
    {
        conn,
        usedPrefix,
        command,
        text
    }
) => {

    try {

        const sender =
            m.sender

        const input =
            String(text || '').trim()


        // ====================================================
        // بدون بحث
        // ====================================================

        if (!input) {

            const introCaption = `
╭━━━〔 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 APK 〕━━━╮
┃
┃ 📱 محرك تحميل التطبيقات
┃ 🔎 قلب على أي تطبيق
┃ 📦 دعم APK كبيرة
┃
┃ 📝 أمثلة:
┃
┃ ${usedPrefix}${command} facebook
┃ ${usedPrefix}${command} whatsapp
┃ ${usedPrefix}${command} pixellab
┃ ${usedPrefix}${command} capcut
┃
┃ 👇 اختار التطبيق من اللائحة
┃
┃ 🤖 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃
┃ 📞 ${DEVELOPER_PHONE}
╰━━━━━━━━━━━━━━━━━━╯
`.trim()


            try {

                await conn.sendButton(
                    m.chat,
                    {

                        image: {
                            url: APK_IMAGE
                        },

                        caption:
                            introCaption,

                        footer:
                            `𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 • APK Downloader`,

                        buttons: [

                            {
                                name:
                                    'quick_reply',

                                buttonParamsJson:
                                    JSON.stringify({

                                        display_text:
                                            '🔎 بحث عن تطبيق',

                                        id:
                                            `${usedPrefix}${command} facebook`

                                    })

                            },

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

                            },

                            {
                                name:
                                    'cta_url',

                                buttonParamsJson:
                                    JSON.stringify({

                                        display_text:
                                            '📞 تواصل مع المطور',

                                        url:
                                            `https://wa.me/${DEVELOPER_NUMBER}`

                                    })

                            }

                        ]

                    },
                    {
                        quoted: m
                    }
                )

            } catch (error) {

                console.log(
                    'APK INTRO BUTTON ERROR:',
                    error
                )

                await conn.sendMessage(
                    m.chat,
                    {
                        image: {
                            url: APK_IMAGE
                        },
                        caption:
                            introCaption
                    },
                    {
                        quoted: m
                    }
                )

            }

            return

        }


        // ====================================================
        // اختيار التطبيق
        // الزر يرسل:
        // .apk 1
        // .apk 2
        // إلخ
        // ====================================================

        if (
            /^\d+$/.test(input) &&
            global.apkSessions[sender]
        ) {

            const number =
                parseInt(input)


            const session =
                global.apkSessions[sender]


            const app =
                session.data[number - 1]


            if (!app) {

                return m.reply(
                    `❌ الرقم غير صحيح.\n\n` +
                    `📱 عندك ${session.data.length} تطبيقات متوفرة.`
                )

            }


            // ==================================================
            // منع تحميل تطبيقين بنفس الوقت
            // ==================================================

            if (
                session.downloading
            ) {

                return m.reply(
                    `⏳ كاين APK كيتحمّل دابا.\n` +
                    `صبر شوية حتى يكمل.`
                )

            }


            session.downloading =
                true


            try {

                await sendApk(
                    conn,
                    m,
                    app
                )

            } catch (error) {

                console.error(
                    'APK DOWNLOAD ERROR:',
                    error
                )

                await m.reply(
                    `╭━━━〔 ❌ APK ERROR 〕━━━╮
┃ ❌ ماقدرتش نهبط التطبيق.
┃
┃ 📱 ${app.name}
┃
┃ 🔎 السبب:
┃ ${error.message || error}
┃
┃ 🤖 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃
┃ 📞 ${DEVELOPER_PHONE}
╰━━━━━━━━━━━━━━━━━━╯`
                )

                try {

                    await m.react('❌')

                } catch {}

            } finally {

                session.downloading =
                    false

            }

            return

        }


        // ====================================================
        // البحث
        // ====================================================

        try {

            await m.react('🔎')

        } catch {}


        let results


        try {

            results =
                await aptoide.search(
                    input
                )

        } catch (error) {

            console.error(
                'APK SEARCH ERROR:',
                error
            )

            return m.reply(
                `╭━━━〔 ❌ APK SEARCH 〕━━━╮
┃ وقع مشكل وأنا كنقلب.
┃
┃ 🔄 عاود جرب من بعد.
┃
┃ 🤖 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃
╰━━━━━━━━━━━━━━━━━━╯`
            )

        }


        // ====================================================
        // لا توجد نتائج
        // ====================================================

        if (
            !results ||
            results.length === 0
        ) {

            return m.reply(
                `╭━━━〔 🔎 APK SEARCH 〕━━━╮
┃ ❌ ما لقيتش التطبيق:
┃
┃ "${input}"
┃
┃ 💡 جرب اسم آخر.
╰━━━━━━━━━━━━━━━━━━╯`
            )

        }


        // ====================================================
        // حفظ النتائج
        // بدون Timeout
        // بدون انتهاء صلاحية
        // ====================================================

        global.apkSessions[sender] = {

            data:
                results,

            downloading:
                false

        }


        // ====================================================
        // إنشاء Rows
        // ====================================================

        const rows =
            results.map(
                (app, index) => {

                    return {

                        title:
                            `${index + 1}. ${app.name}`,

                        description:
                            `📦 ${app.version} • 💾 ${formatSize(app.size)}`,

                        id:
                            `${usedPrefix}${command} ${index + 1}`

                    }

                }
            )


        // ====================================================
        // هنا فقط رسالة مختصرة
        // لا توجد لائحة نصية
        // لا يوجد:
        //
        // أو كتب:
        // .apk 1
        //
        // ولا أسماء التطبيقات تحت الزر
        // ====================================================

        const caption = `
╭━━━〔 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 APK 〕━━━╮
┃ 🔎 البحث: ${input}
┃ 📱 النتائج: ${results.length}
┃
┃ 👇 ضغط على الزر واختار
┃ التطبيق اللي بغيتي تحمّلو.
┃
╰━━━━━━━━━━━━━━━━━━╯

🤖 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃
📞 ${DEVELOPER_PHONE}
`.trim()


        // ====================================================
        // إرسال صورة المكتب + زر اختيار فقط
        // ====================================================

        try {

            await conn.sendButton(
                m.chat,
                {

                    image: {
                        url: APK_IMAGE
                    },

                    caption:
                        caption,

                    footer:
                        `𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 • APK Downloader`,

                    buttons: [

                        {

                            name:
                                'single_select',

                            buttonParamsJson:
                                JSON.stringify({

                                    title:
                                        '📱 اختار التطبيق',

                                    sections: [

                                        {

                                            title:
                                                `🔎 نتائج البحث: ${input}`,

                                            rows:
                                                rows

                                        }

                                    ]

                                })

                        },

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

        } catch (buttonError) {

            console.log(
                'APK BUTTON ERROR:',
                buttonError
            )


            // =================================================
            // Fallback
            // صورة + رسالة مختصرة فقط
            // =================================================

            await conn.sendMessage(
                m.chat,
                {

                    image: {
                        url: APK_IMAGE
                    },

                    caption:
                        caption

                },
                {
                    quoted:
                        m
                }
            )

        }


        try {

            await m.react('✅')

        } catch {}

    } catch (error) {

        console.error(
            'APK HANDLER ERROR:',
            error
        )


        try {

            await m.react('❌')

        } catch {}


        await m.reply(
            `❌ وقع خطأ غير متوقع.\n\n` +
            `${error.message || error}\n\n` +
            `🤖 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃`
        )

    }

}


// ============================================================
// معلومات الأمر
// ============================================================

handler.help = [
    'apk <اسم التطبيق>',
    'apk <رقم>'
]

handler.tags = [
    'downloader'
]

handler.command =
    /^(apk)$/i


// ============================================================
// بدون صلاحية / بدون Limit
// ============================================================

handler.limit =
    false

handler.args =
    false


export default handler