// ═══════════════════════════════════════════════
// 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 | AUTO REACTION
// .تفاعل اون  → تشغيل
// .تفاعل اوف → إيقاف
// يعمل في المجموعات والخاص، وحتى رسائل البوت نفسه
// ═══════════════════════════════════════════════

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

// نخلي الإعداد محفوظ فـ global
global.autoReaction = global.autoReaction ?? true;

// لمنع التفاعل مع نفس الرسالة أكثر من مرة
const reactedMessages = new Set();

// اختيار إيموجي عشوائي
function randomEmoji() {
    return EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
}

// تنظيف الذاكرة كل مدة
setInterval(() => {
    if (reactedMessages.size > 5000) {
        reactedMessages.clear();
    }
}, 10 * 60 * 1000);


// ═══════════════════════════════════════════════
// أمر التشغيل والإيقاف
// ═══════════════════════════════════════════════

let handler = async (m, { isOwner, command }) => {

    // غير صاحب البوت يقدر يستعمل الأمر
    if (!isOwner) {
        return m.reply('❌ هاد الأمر غير لمالك البوت.');
    }

    if (command === 'تفاعل') {
        global.autoReaction = true;

        return m.reply(
            '✅ *تم تشغيل التفاعل التلقائي* 🔥\n\n' +
            '🤖 دابا البوت غادي يتفاعل تلقائياً مع الرسائل.\n' +
            '👥 المجموعات\n' +
            '💬 الخاص\n' +
            '🤖 حتى رسائل البوت نفسه\n\n' +
            '⛔ للإيقاف:\n' +
            '`.تفاعل اوف`'
        );
    }

    if (command === 'تفاعل اوف') {
        global.autoReaction = false;

        return m.reply(
            '❌ *تم إيقاف التفاعل التلقائي.*\n\n' +
            '▶️ للتشغيل:\n' +
            '`.تفاعل اون`'
        );
    }
};


// ═══════════════════════════════════════════════
// التفاعل مع جميع الرسائل
// ═══════════════════════════════════════════════

handler.all = async function (m) {

    // إذا كان مطفياً
    if (!global.autoReaction) return;

    // لا توجد رسالة
    if (!m || !m.key) return;

    // ID الرسالة
    const messageId = m.key.id;

    if (!messageId) return;

    // منع التكرار
    if (reactedMessages.has(messageId)) return;

    reactedMessages.add(messageId);

    try {

        // تجاهل رسائل النظام
        if (
            m.key.remoteJid === 'status@broadcast' &&
            !m.message
        ) return;

        // اختيار إيموجي
        const emoji = randomEmoji();

        // التفاعل
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
            '❌ Auto Reaction Error:',
            e?.message || e
        );
    }
};


// ═══════════════════════════════════════════════
// الأوامر
// ═══════════════════════════════════════════════

handler.command = /^(تفاعل)$/i;
handler.help = ['تفاعل اون', 'تفاعل اوف'];
handler.tags = ['tools'];

export default handler;