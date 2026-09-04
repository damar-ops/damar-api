// ═══════════════════════════════════════════════
// 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 | AUTO REACTION
//
// .تفاعل اون  → تشغيل
// .تفاعل اوف  → إيقاف
//
// المالك الوحيد:
// 212717268388
// ═══════════════════════════════════════════════

const OWNER_NUMBER = '212717268388';

const EMOJIS = [
    '❤️',
    '😂',
    '🔥',
    '😍',
    '🥰',
    '😘',
    '😎',
    '🤩',
    '😱',
    '😢',
    '😡',
    '👏',
    '👍',
    '👎',
    '🙏',
    '💯',
    '✨',
    '🎉',
    '💀',
    '🤣',
    '😈',
    '🤯',
    '🥹',
    '🤭',
    '😏',
    '🤔',
    '😮',
    '😴',
    '🫡',
    '❤️‍🔥',
    '💔',
    '🫶',
    '👀',
    '🙈',
    '🤌',
    '💎',
    '🌚',
    '🌝',
    '🚀',
    '⚡'
];

// الحالة الافتراضية
global.autoReaction = global.autoReaction ?? true;

// منع التفاعل مع نفس الرسالة أكثر من مرة
global.reactedMessages = global.reactedMessages || new Set();

const reactedMessages = global.reactedMessages;


// ═══════════════════════════════════════════════
// اختيار إيموجي عشوائي
// ═══════════════════════════════════════════════

function randomEmoji() {
    return EMOJIS[
        Math.floor(Math.random() * EMOJIS.length)
    ];
}


// ═══════════════════════════════════════════════
// معرفة المالك
// ═══════════════════════════════════════════════

function isBotOwner(m) {

    const sender = String(
        m?.sender ||
        m?.key?.participant ||
        ''
    );

    const number = sender
        .split('@')[0]
        .replace(/\D/g, '');

    return number === OWNER_NUMBER;
}


// ═══════════════════════════════════════════════
// تنظيف الذاكرة
// ═══════════════════════════════════════════════

if (!global.autoReactionIntervalStarted) {

    global.autoReactionIntervalStarted = true;

    setInterval(() => {

        if (reactedMessages.size > 5000) {
            reactedMessages.clear();
        }

    }, 10 * 60 * 1000);
}


// ═══════════════════════════════════════════════
// الأمر
// ═══════════════════════════════════════════════

let handler = async (m, { conn, text }) => {

    // التحقق من المالك
    if (!isBotOwner(m)) {

        return m.reply(
            '❌ *هاد الأمر غير لمالك البوت.*'
        );
    }

    const arg = String(text || '')
        .trim()
        .toLowerCase();

    // ───────────────────────────────────────────
    // تشغيل
    // ───────────────────────────────────────────

    if (
        arg === 'اون' ||
        arg === 'on' ||
        arg === 'تشغيل'
    ) {

        global.autoReaction = true;

        return m.reply(
            '✅ *تم تشغيل التفاعل التلقائي* 🔥\n\n' +
            '🤖 غادي يتفاعل البوت تلقائياً مع الرسائل.\n\n' +
            '⛔ للإيقاف:\n' +
            '`.تفاعل اوف`'
        );
    }


    // ───────────────────────────────────────────
    // إيقاف
    // ───────────────────────────────────────────

    if (
        arg === 'اوف' ||
        arg === 'off' ||
        arg === 'إيقاف' ||
        arg === 'ايقاف'
    ) {

        global.autoReaction = false;

        // نمسحو الرسائل القديمة
        reactedMessages.clear();

        return m.reply(
            '❌ *تم إيقاف التفاعل التلقائي.*\n\n' +
            '▶️ للتشغيل:\n' +
            '`.تفاعل اون`'
        );
    }


    // ───────────────────────────────────────────
    // الحالة
    // ───────────────────────────────────────────

    if (
        arg === '' ||
        arg === 'حالة' ||
        arg === 'status'
    ) {

        return m.reply(
            `*🤖 حالة التفاعل التلقائي:*\n\n` +
            `${global.autoReaction ? '✅ شغال' : '❌ مطفي'}\n\n` +
            `▶️ تشغيل: .تفاعل اون\n` +
            `⛔ إيقاف: .تفاعل اوف`
        );
    }

    return m.reply(
        '*📌 طريقة الاستعمال:*\n\n' +
        '✅ `.تفاعل اون` — تشغيل\n' +
        '❌ `.تفاعل اوف` — إيقاف\n' +
        '📊 `.تفاعل` — الحالة'
    );
};


// ═══════════════════════════════════════════════
// التفاعل مع الرسائل
// ═══════════════════════════════════════════════

handler.all = async function (m) {

    try {

        // التفاعل مطفي
        if (!global.autoReaction) return;

        // ما كايناش رسالة صحيحة
        if (!m || !m.key) return;

        // رسائل الحالة
        if (
            m.key.remoteJid === 'status@broadcast'
        ) {
            return;
        }

        // ID الرسالة
        const messageId = m.key.id;

        if (!messageId) return;

        // منع التكرار
        if (reactedMessages.has(messageId)) {
            return;
        }

        // ───────────────────────────────────────
        // تجاهل رسائل reaction نفسها
        // ───────────────────────────────────────

        if (m.message?.reactionMessage) {
            return;
        }

        // ───────────────────────────────────────
        // تسجيل الرسالة
        // ───────────────────────────────────────

        reactedMessages.add(messageId);

        // ───────────────────────────────────────
        // اختيار إيموجي
        // ───────────────────────────────────────

        const emoji = randomEmoji();

        // ───────────────────────────────────────
        // إرسال التفاعل
        // ───────────────────────────────────────

        await this.sendMessage(
            m.key.remoteJid,
            {
                react: {
                    text: emoji,
                    key: m.key
                }
            }
        );

    } catch (e) {

        console.log(
            '❌ AUTO REACTION:',
            e?.message || e
        );

    }
};


// ═══════════════════════════════════════════════
// إعدادات الأمر
// ═══════════════════════════════════════════════

handler.command = /^تفاعل$/i;

handler.help = [
    'تفاعل',
    'تفاعل اون',
    'تفاعل اوف'
];

handler.tags = ['tools'];

handler.limit = false;

export default handler;