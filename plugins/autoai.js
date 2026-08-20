import fetch from 'node-fetch';

// ============================================================
// 🤖 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 | AUTO GEMINI AI
// ============================================================

global.autoGeminiGlobal = true;

const geminiSessions = {};

// ============================================================
// 👑 SUPER OWNERS
// ============================================================

const SUPER_OWNERS = [
    '212633226499',
    '212603415919'
];

// ============================================================
// 👑 OWNERS
// ============================================================

const OWNER_NUMBERS = [
    '212603415919',
    '212680697262',
    '212633226499',
    '212702816550'
];

// ============================================================
// 🤖 شخصية البوت
// ============================================================

global.botPersonality =
    'رد علي بالدارجة المغربية، جواب قصير ومباشر، خفيف ومضحك شوية، 4 سطور فقط كحد أقصى، بلا مقدمات وبلا شرح طويل، جاوب بحال دردشة واتساب';

// ============================================================
// 👨‍💻 معلومات المطور
// ============================================================

const DEV_INFO = {
    name: 'ابو دمار شامل',
    number: '+212 633-226499',
    facebook: 'https://www.facebook.com/profile.php?id=61591783185803',
    instagram: 'https://www.instagram.com/damar_chamil3?igsh=MWk4eGpsOHRlcXV5cQ=='
};

// ============================================================
// 🖼️ جلب صورة بروفايل المستخدم
// ============================================================

async function getUserProfilePicture(conn, jid) {

    try {

        const url = await conn.profilePictureUrl(
            jid,
            'image'
        );

        return url;

    } catch (e) {

        console.log(
            '⚠️ ما قدرتش نجيب صورة البروفايل'
        );

        return null;
    }
}

// ============================================================
// 👤 اسم المستخدم
// ============================================================

function getUserName(m) {

    return (
        m.pushName ||
        m.name ||
        'المستخدم'
    );
}

// ============================================================
// 📤 إرسال رد AI مع صورة البروفايل
// ============================================================

async function sendAIReply(
    conn,
    m,
    text
) {

    const username =
        getUserName(m);

    const profilePic =
        await getUserProfilePicture(
            conn,
            m.sender
        );

    // ========================================================
    // 🖼️ بطاقة الرد
    // ========================================================

    const contextInfo = {

        externalAdReply: {

            title: '𝐃𝐀𝐌𝐀𝐑-𝐌𝐃',

            body:
                `${username}\nالمطور: ${DEV_INFO.number}`,

            mediaType: 1,

            renderLargerThumbnail: false,

            showAdAttribution: false,

            sourceUrl:
                'https://wa.me/212633226499',

            ...(profilePic
                ? {
                    thumbnailUrl: profilePic
                }
                : {})
        }
    };

    // ========================================================
    // 📤 إرسال الرسالة
    // ========================================================

    return conn.sendMessage(
        m.chat,
        {
            text: text,
            contextInfo
        },
        {
            quoted: m
        }
    );
}

// ============================================================
// 🔗 كشف الروابط
// ============================================================

function hasLink(text = '') {

    if (!text)
        return false;

    const linkRegex =
        /(https?:\/\/|http:\/\/|www\.|wa\.me\/|chat\.whatsapp\.com\/|t\.me\/|telegram\.me\/|youtu\.be\/|youtube\.com\/|instagram\.com\/|facebook\.com\/|fb\.watch\/|tiktok\.com\/|vm\.tiktok\.com\/)/i;

    return linkRegex.test(text);
}

// ============================================================
// ❤️ كشف Reaction
// ============================================================

function isReaction(m) {

    if (!m)
        return false;

    return Boolean(
        m.message?.reactionMessage ||
        m.message?.reaction ||
        m.reactionMessage
    );
}

// ============================================================
// 👨‍💻 واش سول على المطور؟
// ============================================================

function isAskingAboutDev(text = '') {

    const keywords = [
        'شكون صنعك',
        'من صنعك',
        'شكون طورك',
        'من طورك',
        'المطور',
        'الصانع',
        'شكون مول البوت',
        'creator',
        'owner',
        'dev'
    ];

    const lower =
        text.toLowerCase();

    return keywords.some(
        keyword =>
            lower.includes(keyword)
    );
}

// ============================================================
// ✂️ إجبار الجواب يكون قصير
// ============================================================

function makeShortReply(text = '') {

    if (!text)
        return '';

    let lines =
        text
            .split('\n')
            .map(x => x.trim())
            .filter(Boolean);

    lines =
        [...new Set(lines)];

    // أقصى حاجة 4 سطور
    lines =
        lines.slice(0, 4);

    let result =
        lines.join('\n').trim();

    // حماية من النص الطويل
    if (result.length > 600) {

        result =
            result
                .slice(0, 600)
                .trim();

        const lastSpace =
            result.lastIndexOf(' ');

        if (lastSpace > 400) {

            result =
                result.slice(
                    0,
                    lastSpace
                );
        }

        result += '…';
    }

    return result;
}

// ============================================================
// 🧠 GEMINI
// ============================================================

const gemini = {

    // ----------------------------------------------------------
    // 🍪 Cookie
    // ----------------------------------------------------------

    getNewCookie: async function () {

        const response =
            await fetch(
                "https://gemini.google.com/_/BardChatUi/data/batchexecute?rpcids=maGuAc&source-path=%2F&bl=boq_assistant-bard-web-server_20250814.06_p1&f.sid=-7816331052118000090&hl=ar&_reqid=173780&rt=c",
                {
                    headers: {
                        "content-type":
                            "application/x-www-form-urlencoded;charset=UTF-8"
                    },

                    body:
                        "f.req=%5B%5B%5B%22maGuAc%22%2C%22%5B0%5D%22%2Cnull%2C%22generic%22%5D%5D%5D&",

                    method: "POST"
                }
            );

        const cookieHeader =
            response.headers.get(
                'set-cookie'
            );

        if (!cookieHeader) {

            throw new Error(
                'ماجبتش الكوكي'
            );
        }

        return cookieHeader.split(';')[0];
    },

    // ----------------------------------------------------------
    // 🤖 Ask Gemini
    // ----------------------------------------------------------

    ask: async function (
        prompt,
        previousId = null
    ) {

        if (!prompt?.trim()) {

            throw new Error(
                'السؤال خاوي'
            );
        }

        let resumeArray = null;
        let cookie = null;

        // ------------------------------------------------------
        // 🔄 Session
        // ------------------------------------------------------

        if (previousId) {

            try {

                const session =
                    JSON.parse(
                        atob(previousId)
                    );

                resumeArray =
                    session.newResumeArray;

                cookie =
                    session.cookie;

            } catch {

                previousId = null;
            }
        }

        // ------------------------------------------------------
        // 📝 Prompt
        // ------------------------------------------------------

        const finalPrompt = `
${global.botPersonality}

القواعد المهمة بزاف:

- جاوب في 4 سطور فقط كحد أقصى.
- كل سطر يكون قصير.
- ما تطولش في الشرح.
- جاوب مباشرة على كلام المستخدم.
- استعمل الدارجة المغربية.
- خليك طبيعي بحال دردشة واتساب.
- خليك خفيف ومضحك شوية إلا كان الموقف مناسب.
- ممنوع مقدمات طويلة.
- ممنوع الفقرات الطويلة.
- ممنوع تكرر كلام المستخدم.
- ما تعطيش شرح زائد إلا طلبو المستخدم.
- ما تستعملش أكثر من 4 سطور.

رسالة المستخدم:
${prompt}
`;

        // ------------------------------------------------------
        // 📡 Headers
        // ------------------------------------------------------

        const headers = {

            "content-type":
                "application/x-www-form-urlencoded;charset=UTF-8",

            "cookie":
                cookie ||
                await this.getNewCookie()
        };

        // ------------------------------------------------------
        // 📦 Request
        // ------------------------------------------------------

        const b = [
            [finalPrompt],
            ["ar"],
            resumeArray
        ];

        const a = [
            null,
            JSON.stringify(b)
        ];

        const body =
            new URLSearchParams({
                "f.req":
                    JSON.stringify(a)
            });

        // ------------------------------------------------------
        // 🌐 Gemini
        // ------------------------------------------------------

        const response =
            await fetch(
                `https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate?bl=boq_assistant-bard-web-server_20250729.06_p0&f.sid=4206607810970164620&hl=ar&_reqid=2813378&rt=c`,
                {
                    headers,
                    body,
                    method: 'POST'
                }
            );

        if (!response.ok) {

            throw new Error(
                `سيرفر جوجل طاح: ${response.status}`
            );
        }

        // ------------------------------------------------------
        // 📥 Response
        // ------------------------------------------------------

        const data =
            await response.text();

        const match =
            data.matchAll(
                /^\d+\n(.+?)\n/gm
            );

        const chunks =
            Array.from(
                match,
                m => m[1]
            );

        let text = null;
        let newResumeArray = null;
        let found = false;

        // ------------------------------------------------------
        // 🔎 استخراج الجواب
        // ------------------------------------------------------

        for (
            const chunk of chunks.reverse()
        ) {

            try {

                const realArray =
                    JSON.parse(chunk);

                const parse1 =
                    JSON.parse(
                        realArray[0][2]
                    );

                if (
                    parse1?.[4]?.[0]?.[1]?.[0]
                ) {

                    newResumeArray = [
                        ...parse1[1],
                        parse1[4][0][0]
                    ];

                    text =
                        parse1[4][0][1][0]
                            .replace(
                                /\*\*(.+?)\*\*/g,
                                '*$1*'
                            );

                    found = true;

                    break;
                }

            } catch {}
        }

        if (
            !found ||
            !text
        ) {

            throw new Error(
                'ما فهمتش الجواب ديال Gemini'
            );
        }

        // ------------------------------------------------------
        // ✂️ قص الجواب
        // ------------------------------------------------------

        text =
            makeShortReply(text);

        // ------------------------------------------------------
        // 💾 Session
        // ------------------------------------------------------

        const id =
            btoa(
                JSON.stringify({
                    newResumeArray,
                    cookie:
                        headers.cookie
                })
            );

        return {
            text,
            id
        };
    }
};

// ============================================================
// 🎛️ HANDLER
// ============================================================

let handler = async (
    m,
    {
        conn,
        text,
        command
    }
) => {

    const senderNumber =
        m.sender.split('@')[0];

    const isSuperOwner =
        SUPER_OWNERS.includes(
            senderNumber
        );

    const isOwner =
        OWNER_NUMBERS.includes(
            senderNumber
        );

    // ========================================================
    // ⚙️ AUTOAI
    // ========================================================

    if (
        command === 'autoai'
    ) {

        if (!isOwner) {

            return m.reply(
                '❌ *هاد الأمر غير للمالك*'
            );
        }

        const arg =
            (text || '')
                .toLowerCase()
                .trim();

        if (arg === 'on') {

            global.autoGeminiGlobal =
                true;

            return m.reply(
                '✅ *تم تشغيل الذكاء الاصطناعي التلقائي*'
            );
        }

        if (arg === 'off') {

            global.autoGeminiGlobal =
                false;

            return m.reply(
                '❌ *تم إيقاف الذكاء الاصطناعي التلقائي*'
            );
        }

        return m.reply(
            `📢 *حالة AutoAI:*

${
    global.autoGeminiGlobal
        ? '✅ شغال'
        : '❌ مطفي'
}

.autoai on
.autoai off`
        );
    }

    // ========================================================
    // 🎭 تغيير الشخصية
    // ========================================================

    if (
        isSuperOwner &&
        text?.startsWith('شخصية ')
    ) {

        const newStyle =
            text
                .replace(
                    'شخصية ',
                    ''
                )
                .trim();

        const presets = {

            'مضحك':
                'رد علي بالدارجة المغربية، قصير بزاف، مضحك وخفيف، 4 سطور كحد أقصى',

            'حصين':
                'رد علي بالدارجة المغربية، قصير ومحترم وجدي، 4 سطور كحد أقصى',

            'قصير':
                'جاوب باختصار شديد، كلمة أو جوج إلا أمكن، وما تفوتش 4 سطور',

            'رسمي':
                'رد علي بالعربية الفصحى باختصار واحترام، 4 سطور كحد أقصى',

            'شاعر':
                'رد علي بالدارجة المغربية بأسلوب شاعري خفيف وقصير، 4 سطور كحد أقصى'
        };

        global.botPersonality =
            presets[newStyle] ||
            `رد علي بالدارجة المغربية بأسلوب ${newStyle}، قصير ومباشر، 4 سطور كحد أقصى`;

        return m.reply(
            `✅ *تم تغيير شخصية البوت*

*الشخصية:* ${newStyle}

📌 الردود غادي تبقى قصيرة في 4 سطور كحد أقصى.`
        );
    }

    // ========================================================
    // 📢 عرض الشخصية
    // ========================================================

    if (
        isSuperOwner &&
        text === 'الشخصية'
    ) {

        return m.reply(
            `📢 *الشخصية الحالية:*

${global.botPersonality}

*التغيير:*

.شخصية مضحك
.شخصية حصين
.شخصية قصير
.شخصية رسمي
.شخصية شاعر`
        );
    }

    // ========================================================
    // 📋 لوحة التحكم
    // ========================================================

    return m.reply(
        `📢 *لوحة تحكم DAMAR-MD*

*AutoAI:*

.autoai on
.autoai off

*الشخصية:*

.شخصية مضحك
.الشخصية`
    );
};

// ============================================================
// 🤖 AUTO GEMINI
// ============================================================

handler.before = async (
    m,
    { conn }
) => {

    // ========================================================
    // 🚫 AI مطفي
    // ========================================================

    if (
        !global.autoGeminiGlobal
    )
        return;

    // ========================================================
    // 🚫 رسائل البوت
    // ========================================================

    if (
        m.isBaileys &&
        m.fromMe
    )
        return;

    // ========================================================
    // 🚫 Reaction
    // ========================================================

    if (
        isReaction(m)
    )
        return;

    // ========================================================
    // 🚫 Status
    // ========================================================

    if (
        m.chat === 'status@broadcast' ||
        m.key?.remoteJid ===
            'status@broadcast'
    )
        return;

    // ========================================================
    // 🚫 ماشي نص
    // ========================================================

    if (!m.text)
        return;

    // ========================================================
    // 🚫 الأوامر
    // ========================================================

    if (
        /^[.#/\\!]/.test(
            m.text
        )
    )
        return;

    // ========================================================
    // 🚫 الروابط
    // ========================================================

    if (
        hasLink(m.text)
    )
        return;

    // ========================================================
    // 🚫 الصور والفيديو والصوت والملفات
    // ========================================================

    if (
        m.message?.imageMessage ||
        m.message?.videoMessage ||
        m.message?.audioMessage ||
        m.message?.documentMessage ||
        m.message?.stickerMessage
    )
        return;

    // ========================================================
    // 👨‍💻 سؤال المطور
    // ========================================================

    if (
        isAskingAboutDev(m.text)
    ) {

        const devMsg =
            `🤖 أنا بوت ديال ${DEV_INFO.name}

*المطور:* ${DEV_INFO.name}
*الواتساب:* ${DEV_INFO.number}
*فيسبوك:* ${DEV_INFO.facebook}
*انستغرام:* ${DEV_INFO.instagram}

إلا بغيتي شي حاجة تواصل معاه 😎`;

        return sendAIReply(
            conn,
            m,
            devMsg
        );
    }

    // ========================================================
    // ⌨️ حالة الكتابة
    // ========================================================

    try {

        await conn.sendPresenceUpdate(
            'composing',
            m.chat
        );

    } catch {}

    // ========================================================
    // 🧠 Gemini
    // ========================================================

    let attempts = 0;

    while (
        attempts < 2
    ) {

        try {

            const previous =
                geminiSessions[
                    m.sender
                ];

            const result =
                await gemini.ask(
                    m.text,
                    previous
                );

            // حفظ الجلسة
            geminiSessions[
                m.sender
            ] = result.id;

            // =================================================
            // 📤 إرسال الرد مع البروفايل
            // =================================================

            await sendAIReply(
                conn,
                m,
                result.text
            );

            return;

        } catch (error) {

            console.log(
                '❌ Gemini Error:',
                error
            );

            attempts++;

            if (
                attempts >= 2
            ) {

                await sendAIReply(
                    conn,
                    m,
                    '⚠️ *Gemini ناعس دابا 😴 عاود صيفطها من بعد شوية.*'
                );

                return;
            }

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        1500
                    )
            );
        }
    }
};

// ============================================================
// 📌 الأوامر
// ============================================================

handler.command = [
    'autoai',
    'ai تلقائي',
    'شخصية',
    'الشخصية'
];

handler.tags = [
    'ai'
];

handler.help = [
    'autoai on',
    'autoai off',
    'شخصية مضحك',
    'الشخصية'
];

handler.limit = false;

export default handler;