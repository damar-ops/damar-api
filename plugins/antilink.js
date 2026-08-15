/*
 * 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃
 * Anti WhatsApp Group Link
 *
 * 🚫 منع روابط مجموعات واتساب
 * 🗑️ حذف الرابط
 * ⚠️ 3 تنبيهات
 * 🚪 التنبيه الثالث = طرد
 *
 * خدام تلقائياً بلا أمر
 */

const warnings = global.antiGroupLinkWarnings || new Map();

global.antiGroupLinkWarnings = warnings;


// ======================================================
// MAIN HANDLER
// ======================================================

const handler = async (m, { conn, participants, isAdmin, isBotAdmin, isOwner }) => {
    try {

        // خاص الرسالة تكون من مجموعة
        if (!m.isGroup) return;

        // المالك والأدمنية مستثنين
        if (isOwner || isAdmin) return;

        // البوت خاصو يكون Admin
        if (!isBotAdmin) return;

        // ------------------------------------------------
        // جلب النص
        // ------------------------------------------------

        let text = '';

        if (typeof m.text === 'string') {
            text = m.text;
        }

        // بعض نسخ Baileys
        if (!text && m.message) {

            text =
                m.message.conversation ||
                m.message.extendedTextMessage?.text ||
                m.message.imageMessage?.caption ||
                m.message.videoMessage?.caption ||
                m.message.documentMessage?.caption ||
                '';
        }

        if (!text) return;

        // ------------------------------------------------
        // Anti WhatsApp Group Link
        // ------------------------------------------------

        const groupLinkRegex =
            /(?:https?:\/\/)?(?:www\.)?chat\.whatsapp\.com\/[A-Za-z0-9_-]+/gi;

        const links = text.match(groupLinkRegex);

        if (!links || links.length === 0) return;

        const sender = m.sender;

        if (!sender) return;

        // ------------------------------------------------
        // التأكد أن العضو ماشي Admin
        // ------------------------------------------------

        let member = null;

        if (Array.isArray(participants)) {

            member = participants.find(p => {

                const jid =
                    p.jid ||
                    p.id ||
                    p.phoneNumber ||
                    '';

                return jid === sender;
            });
        }

        if (
            member?.admin === 'admin' ||
            member?.admin === 'superadmin'
        ) {
            return;
        }

        // ------------------------------------------------
        // مفتاح خاص بالمجموعة والعضو
        // ------------------------------------------------

        const warningKey =
            `${m.chat}:${sender}`;

        let count =
            warnings.get(warningKey) || 0;

        count++;

        warnings.set(
            warningKey,
            count
        );

        const mention =
            `@${sender.split('@')[0]}`;


        // =================================================
        // DELETE MESSAGE
        // =================================================

        try {

            await conn.sendMessage(
                m.chat,
                {
                    delete: m.key
                }
            );

        } catch (deleteError) {

            console.log(
                '⚠️ AntiLink: فشل حذف الرابط:',
                deleteError?.message || deleteError
            );
        }


        // =================================================
        // WARNING 1
        // =================================================

        if (count === 1) {

            await conn.sendMessage(
                m.chat,
                {
                    text:
`╭━━━〔 ⚠️ 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 〕━━━╮
┃
┃ 🚫 ممنوع نشر روابط المجموعات!
┃
┃ 👤 العضو: ${mention}
┃ ⚠️ التنبيه: 1/3
┃
┃ 🗑️ تحيد الرابط.
┃
┃ 🔔 عندك جوج فرص باقيين.
┃
╰━━━━━━━━━━━━━━━━━━╯`,
                    mentions: [sender]
                }
            );

            return;
        }


        // =================================================
        // WARNING 2
        // =================================================

        if (count === 2) {

            await conn.sendMessage(
                m.chat,
                {
                    text:
`╭━━━〔 🚨 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 〕━━━╮
┃
┃ 🚫 عاودتي رسلتي رابط مجموعة!
┃
┃ 👤 العضو: ${mention}
┃ ⚠️ التنبيه: 2/3
┃
┃ 🗑️ تحيد الرابط.
┃
┃ 🔴 هادي آخر فرصة!
┃
┃ 🚪 المرة الجاية = الطرد.
┃
╰━━━━━━━━━━━━━━━━━━╯`,
                    mentions: [sender]
                }
            );

            return;
        }


        // =================================================
        // WARNING 3 = KICK
        // =================================================

        if (count >= 3) {

            await conn.sendMessage(
                m.chat,
                {
                    text:
`╭━━━〔 🚪 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 〕━━━╮
┃
┃ 🚫 وصلتي لـ 3 تنبيهات!
┃
┃ 👤 العضو: ${mention}
┃ ⚠️ التنبيهات: 3/3
┃
┃ 🗑️ تحيد الرابط.
┃
┃ 🚪 غادي يتم طردك دابا.
┃
╰━━━━━━━━━━━━━━━━━━╯`,
                    mentions: [sender]
                }
            );


            // ------------------------------------------------
            // طرد العضو
            // ------------------------------------------------

            try {

                await conn.groupParticipantsUpdate(
                    m.chat,
                    [sender],
                    'remove'
                );

                console.log(
                    `✅ AntiLink: تم طرد ${sender}`
                );

            } catch (kickError) {

                console.log(
                    '❌ AntiLink: فشل الطرد:',
                    kickError?.message || kickError
                );

                try {

                    await conn.sendMessage(
                        m.chat,
                        {
                            text:
`❌ ماقدرتش نطرد ${mention}.

📌 تأكد أن 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 عندو Admin.`,
                            mentions: [sender]
                        }
                    );

                } catch {}
            }


            // تصفير التنبيهات
            warnings.delete(warningKey);
        }

    } catch (error) {

        // مهم جداً:
        // أي خطأ هنا ما يوقفش البوت
        console.log(
            '❌ AntiLink Error:',
            error?.stack || error
        );
    }
};


// ======================================================
// BEFORE
// ======================================================

handler.before = async function (m, ctx) {

    try {

        return await handler(
            m,
            ctx
        );

    } catch (error) {

        console.log(
            '❌ AntiLink Before Error:',
            error?.stack || error
        );

        return false;
    }
};


// ======================================================
// PLUGIN SETTINGS
// ======================================================

handler.group = true;

handler.botAdmin = true;

// ما عندوش أمر
handler.command = false;

export default handler;