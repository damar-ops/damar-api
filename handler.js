// ═══════════════════════════════════════════════
// 🔐 دعم المستخدمين العاديين + LID / Username
// ═══════════════════════════════════════════════

const normalizeJid = (jid) => {
	if (!jid || typeof jid !== 'string') return null;
	jid = jid.trim();

	if (jid.includes('@')) return jid;

	const number = jid.replace(/\D/g, '');
	return number ? `${number}@s.whatsapp.net` : null;
};

const getLidPhone = async (jid) => {
	if (!jid || !jid.endsWith('@lid')) return null;

	// Baileys 7.x
	try {
		const resolver = this.signalRepository?.lidMapping?.getPNForLID;
		if (typeof resolver === 'function') {
			const result = await resolver.call(
				this.signalRepository.lidMapping,
				jid
			);

			if (result) return normalizeJid(result);
		}
	} catch {}

	// بعض نسخ Baileys توفرها مباشرة
	try {
		if (typeof this.getPNForLID === 'function') {
			const result = await this.getPNForLID(jid);
			if (result) return normalizeJid(result);
		}
	} catch {}

	// البحث في المشاركين الموجودين في الكاش
	try {
		for (const chat of Object.values(this.chats || {})) {
			const participants = chat?.metadata?.participants || [];

			for (const participant of participants) {
				if (
					participant?.lid === jid ||
					participant?.id === jid
				) {
					const phone =
						participant.phoneNumber ||
						(participant.id?.endsWith('@s.whatsapp.net')
							? participant.id
							: null);

					if (phone) return normalizeJid(phone);
				}
			}
		}
	} catch {}

	return null;
};

const originalSender = m.sender;

if (!originalSender) return;

const phoneSender = await getLidPhone(originalSender);

// نخلي الـJID الأصلي محفوظ
m.lid = originalSender.endsWith('@lid')
	? originalSender
	: null;

m.phoneNumber = phoneSender;

// إذا وجدنا الرقم نستعمله، وإذا ما وجدناش نخلي الـLID
const databaseSender = phoneSender || originalSender;

// إنشاء هوية موحدة للمستخدم
m.sender = databaseSender;

// ═══════════════════════════════════════════════
// 👑 OWNER
// ═══════════════════════════════════════════════

const ownerJids = [
	conn.decodeJid(global.conn.user.id),
	...global.owner.map(([number]) => number)
]
	.filter(Boolean)
	.map((value) => normalizeJid(value))
	.filter(Boolean);

let isROwner = ownerJids.includes(m.sender);

// إذا كان المستخدم LID وما قدرناش نحولو للرقم
if (!isROwner && originalSender.endsWith('@lid')) {
	try {
		const mapped = await getLidPhone(originalSender);

		if (mapped && ownerJids.includes(mapped)) {
			isROwner = true;
		}
	} catch {}
}

const isOwner = isROwner || m.fromMe;

// Premium يدعم الرقم وLID
const isPrems =
	isROwner ||
	!!global.db.data.users[m.sender]?.premiumTime ||
	!!global.db.data.users[originalSender]?.premiumTime;

// ═══════════════════════════════════════════════
// 👤 USER DATABASE
// ═══════════════════════════════════════════════

let _user =
	global.db.data.users[m.sender] ||
	global.db.data.users[originalSender];

if (!_user) {
	// المستخدم LID جديد
	_user = global.db.data.users[m.sender] = {
		name: m.name || m.pushName || 'User',
		exp: 0,
		money: 0,
		health: 100,
		level: 1,
		limit: 20,
		age: -1,
		regTime: -1,
		afk: -1,
		afkReason: '',
		warn: 0,
		role: 'Newbie',
		premium: false,
		premiumTime: 0,
		registered: false,
		banned: false,
		autolevelup: false,

		// الألعاب
		bibitapel: 0,
		bibitjeruk: 0,
		bibitdurian: 0,
		bibitmangga: 0,
		bibitpisang: 0,

		apel: 0,
		jeruk: 0,
		durian: 0,
		mangga: 0,
		pisang: 0,

		banteng: 0,
		harimau: 0,
		gajah: 0,
		kambing: 0,
		panda: 0,
		buaya: 0,
		kerbau: 0,
		sapi: 0,
		monyet: 0,
		babihutan: 0,
		babi: 0,
		ayam: 0,
		ikan: 0,
		lele: 0,
		nila: 0,
		bawal: 0,
		udang: 0,
		paus: 0,
		kepiting: 0,

		sword: 0,
		pickaxe: 0,
		axe: 0,
		fishingrod: 0,
		armor: 0,

		sworddurability: 0,
		pickaxedurability: 0,
		axedurability: 0,
		fishingroddurability: 0,
		armordurability: 0,

		atm: 0,
		fullatm: 0,

		potion: 0,
		string: 0,
		wood: 0,
		rock: 0,
		coal: 0,
		iron: 0,
		diamond: 0,
		emerald: 0,

		trash: 0,
		common: 0,
		uncommon: 0,
		mythic: 0,
		legendary: 0,

		ayambakar: 0,
		ayamgoreng: 0,
		oporayam: 0,
		gulaiayam: 0,
		steak: 0,
		rendang: 0,
		babipanggang: 0,
		ikanbakar: 0,
		lelebakar: 0,
		nilabakar: 0,
		bawalbakar: 0,
		udangbakar: 0,
		pausbakar: 0,
		kepitingbakar: 0,

		lastadventure: 0,
		lastbansos: 0,
		lastberburu: 0,
		lastdagang: 0,
		lastduel: 0,
		lastrampok: 0,
		lastmining: 0,
		lastnebang: 0,
		lastnguli: 0,
		lastclaim: 0,
		lastweekly: 0,
		lastmonthly: 0,
	};
}

global.db.data.users[m.sender] = _user;