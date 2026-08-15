/*
 * 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃
 * WhatsApp Group Link Protection
 *
 * أي واحد يرسل chat.whatsapp.com
 * 1 = تحذير
 * 2 = تحذير
 * 3 = طرد
 */

const warnings = new Map();

const handler = async (m, { participants, isAdmin, isBotAdmin }) => {
	try {
		// غير داخل المجموعات
		if (!m.isGroup) return;

		// البوت خاصو يكون Admin
		if (!isBotAdmin) return;

		// الأدمنية ما يتعاقبوش
		if (isAdmin) return;

		// ------------------------------------------------
		// الحصول على النص
		// ------------------------------------------------

		let text = '';

		if (typeof m.text === 'string') {
			text = m.text;
		} else if (m.message) {
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
		// اكتشاف رابط مجموعة واتساب
		// ------------------------------------------------

		const linkRegex =
			/(?:https?:\/\/)?(?:www\.)?chat\.whatsapp\.com\/[A-Za-z0-9_-]+/i;

		if (!linkRegex.test(text)) return;

		const sender = m.sender;

		if (!sender) return;

		// ------------------------------------------------
		// تأكيد أن المرسل ليس Admin
		// ------------------------------------------------

		const member = participants?.find((p) => {
			const jid =
				p.jid ||
				p.id ||
				p.phoneNumber ||
				'';

			return jid === sender;
		});

		if (
			member?.admin === 'admin' ||
			member?.admin === 'superadmin'
		) {
			return;
		}

		// ------------------------------------------------
		// حساب التحذيرات
		// ------------------------------------------------

		const key = `${m.chat}:${sender}`;

		let count = warnings.get(key) || 0;

		count++;

		warnings.set(key, count);

		const tag = `@${sender.split('@')[0]}`;

		// ------------------------------------------------
		// حذف الرسالة
		// ------------------------------------------------

		try {
			await conn.sendMessage(m.chat, {
				delete: m.key
			});
		} catch (e) {
			console.log(
				'AntiLink Delete Error:',
				e?.message || e
			);
		}

		// ------------------------------------------------
		// التنبيه الأول
		// ------------------------------------------------

		if (count === 1) {
			await m.reply(
				`╭━━━〔 ⚠️ 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 〕━━━╮
┃
┃ 🚫 ممنوع نشر روابط المجموعات
┃
┃ 👤 العضو: ${tag}
┃ ⚠️ التنبيه: 1/3
┃
┃ 🗑️ تم حذف الرابط.
┃
┃ 🔔 عندك جوج فرص باقيين.
┃
╰━━━━━━━━━━━━━━━━━━╯`,
				null,
				{
					mentions: [sender]
				}
			);

			return;
		}

		// ------------------------------------------------
		// التنبيه الثاني
		// ------------------------------------------------

		if (count === 2) {
			await m.reply(
				`╭━━━〔 🚨 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 〕━━━╮
┃
┃ 🚫 عاودتي رسلتي رابط مجموعة!
┃
┃ 👤 العضو: ${tag}
┃ ⚠️ التنبيه: 2/3
┃
┃ 🗑️ تم حذف الرابط.
┃
┃ 🔴 المرة الجاية = الطرد.
┃
╰━━━━━━━━━━━━━━━━━━╯`,
				null,
				{
					mentions: [sender]
				}
			);

			return;
		}

		// ------------------------------------------------
		// التنبيه الثالث = طرد
		// ------------------------------------------------

		if (count >= 3) {
			await m.reply(
				`╭━━━〔 🚪 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 〕━━━╮
┃
┃ 🚫 وصلتي لـ 3 تنبيهات!
┃
┃ 👤 العضو: ${tag}
┃ ⚠️ التنبيهات: 3/3
┃
┃ 🚪 غادي يتم طردك دابا.
┃
╰━━━━━━━━━━━━━━━━━━╯`,
				null,
				{
					mentions: [sender]
				}
			);

			try {
				await conn.groupParticipantsUpdate(
					m.chat,
					[sender],
					'remove'
				);

				console.log(
					`✅ AntiLink: ${sender} removed from ${m.chat}`
				);

			} catch (e) {
				console.log(
					'AntiLink Kick Error:',
					e?.message || e
				);
			}

			warnings.delete(key);
		}

	} catch (e) {
		console.log(
			'❌ AntiLink Error:',
			e?.stack || e
		);
	}
};

handler.before = true;

handler.group = true;
handler.botAdmin = true;

export default handler;