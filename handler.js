import { smsg } from './lib/simple.js';
import { format } from 'util';
import { fileURLToPath } from 'url';
import path from 'path';
import { unwatchFile, watchFile } from 'fs';
import chalk from 'chalk';

/**
 * ═══════════════════════════════════════════════
 * 🔐 LID / USERNAME SUPPORT
 * ═══════════════════════════════════════════════
 *
 * هذا الملف يدعم:
 * 📱 123456789@s.whatsapp.net
 * 🔐 123456789@lid
 *
 * إذا كان LID عنده رقم معروف:
 *     LID → Phone JID
 *
 * إذا ما كانش عنده mapping:
 *     LID يبقى LID ويتم إنشاء قاعدة بيانات له.
 *
 * لا يحتاج package إضافية.
 * ═══════════════════════════════════════════════
 */

/**
 * Normalize JID
 */
function normalizeJid(jid) {
	if (!jid || typeof jid !== 'string') return null;

	jid = jid.trim();

	if (jid.includes('@')) return jid;

	const number = jid.replace(/\D/g, '');

	if (!number) return null;

	return `${number}@s.whatsapp.net`;
}

/**
 * Check if JID is LID
 */
function isLidJid(jid) {
	return typeof jid === 'string' && jid.endsWith('@lid');
}

/**
 * Resolve LID -> Phone JID
 *
 * يعتمد أولاً على conn.getJid()
 * الموجود أصلاً في lib/simple.js
 *
 * ثم يحاول Baileys lidMapping إذا كان متوفراً.
 *
 * ثم يبحث في المشاركين الموجودين في الكاش.
 */
async function resolveLid(conn, jid) {
	if (!jid) return null;

	jid = conn.decodeJid(jid);

	if (!isLidJid(jid)) {
		return normalizeJid(jid);
	}

	// ═══════════════════════════════════════════════
	// 1️⃣ استعمال getJid الموجود في simple.js
	// ═══════════════════════════════════════════════
	try {
		if (typeof conn.getJid === 'function') {
			const result = conn.getJid(jid);

			if (result && result !== jid && !isLidJid(result)) {
				return normalizeJid(result);
			}
		}
	} catch {}

	// ═══════════════════════════════════════════════
	// 2️⃣ Baileys LID mapping
	// ═══════════════════════════════════════════════
	try {
		const mapping = conn.signalRepository?.lidMapping;

		if (mapping && typeof mapping.getPNForLID === 'function') {
			const result = await mapping.getPNForLID(jid);

			if (result) {
				return normalizeJid(result);
			}
		}
	} catch {}

	// ═══════════════════════════════════════════════
	// 3️⃣ بعض نسخ Baileys
	// ═══════════════════════════════════════════════
	try {
		if (typeof conn.getPNForLID === 'function') {
			const result = await conn.getPNForLID(jid);

			if (result) {
				return normalizeJid(result);
			}
		}
	} catch {}

	// ═══════════════════════════════════════════════
	// 4️⃣ البحث داخل group participants
	// ═══════════════════════════════════════════════
	try {
		for (const chat of Object.values(conn.chats || {})) {
			const participants = chat?.metadata?.participants || [];

			for (const participant of participants) {
				if (
					participant?.lid === jid ||
					participant?.id === jid
				) {
					const phone =
						participant.phoneNumber ||
						(
							typeof participant.id === 'string' &&
							participant.id.endsWith('@s.whatsapp.net')
								? participant.id
								: null
						);

					if (phone) {
						return normalizeJid(phone);
					}
				}
			}
		}
	} catch {}

	return null;
}

/**
 * Compare two JIDs safely
 */
function sameJid(conn, a, b) {
	if (!a || !b) return false;

	try {
		if (a === b) return true;

		const da = conn.decodeJid(a);
		const db = conn.decodeJid(b);

		if (da === db) return true;

		const ja = typeof conn.getJid === 'function' ? conn.getJid(da) : da;
		const jb = typeof conn.getJid === 'function' ? conn.getJid(db) : db;

		return ja === jb;
	} catch {
		return false;
	}
}

/**
 * Create temporary database JID for LID
 *
 * database.js الحالي ينشئ users فقط إذا انتهى JID بـ:
 * @s.whatsapp.net
 *
 * لذلك إذا كان عندنا LID بدون mapping:
 * LID → temporary PN
 *
 * database.js ينشئ الحساب
 * ثم نرجعه إلى LID.
 */
function createTemporaryJid(lid) {
	let hash = 0;

	for (let i = 0; i < lid.length; i++) {
		hash = (hash * 31 + lid.charCodeAt(i)) >>> 0;
	}

	const part = String(hash).padStart(10, '0');

	return `999${part.slice(-10)}@s.whatsapp.net`;
}

/**
 * Handle messages upsert
 * @param {import('baileys').BaileysEventMap<unknown>['messages.upsert']} groupsUpdate
 */
export async function handler(chatUpdate) {
	if (!chatUpdate) return;

	this.pushMessage(chatUpdate.messages).catch(console.error);

	let m = chatUpdate.messages[chatUpdate.messages.length - 1];

	if (!m) return;

	if (global.db.data == null) {
		await global.loadDatabase();
	}

	try {
		// ═══════════════════════════════════════════════
		// Serialize message
		// ═══════════════════════════════════════════════

		m = smsg(this, m) || m;

		if (!m) return;

		m.exp = 0;
		m.limit = false;

		// ═══════════════════════════════════════════════
		// 🔐 LID / USERNAME RESOLVER
		// ═══════════════════════════════════════════════

		const originalSender = m.sender;

		if (!originalSender) return;

		// نخلي الـLID محفوظ
		m.lid = isLidJid(originalSender)
			? originalSender
			: null;

		// نحاول نلقى رقم الهاتف
		let phoneSender = null;

		if (isLidJid(originalSender)) {
			phoneSender = await resolveLid(this, originalSender);
		} else {
			phoneSender = normalizeJid(originalSender);
		}

		/*
		 * إذا وجدنا الرقم:
		 *
		 * LID → 212xxxxxxxx@s.whatsapp.net
		 *
		 * إذا ما وجدناش:
		 *
		 * LID → 123456@lid
		 */
		const databaseSender = phoneSender || originalSender;

		m.phoneNumber = phoneSender;

		// مهم:
		// نحافظ على الـsender الأصلي حتى plugins تعرف LID
		m.originalSender = originalSender;

		// نستعمل الرقم إذا معروف،
		// وإلا نستعمل LID.
		m.sender = databaseSender;

		// ═══════════════════════════════════════════════
		// Broadcast / Newsletter
		// ═══════════════════════════════════════════════

		if (
			m.sender.endsWith('@broadcast') ||
			m.sender.endsWith('@newsletter')
		) {
			return;
		}

		// ═══════════════════════════════════════════════
		// 🔐 Database LID compatibility
		// ═══════════════════════════════════════════════

		let temporaryDatabaseJid = null;

		/*
		 * إذا كان LID وما عندوش رقم:
		 *
		 * database.js القديم ما غاديش ينشئ user.
		 *
		 * نعطيه JID مؤقت فقط أثناء database initialization.
		 */
		if (
			isLidJid(m.sender) &&
			!global.db.data.users[m.sender]
		) {
			temporaryDatabaseJid = createTemporaryJid(m.sender);

			/*
			 * إذا بالصدفة JID موجود،
			 * نستعمل JID آخر.
			 */
			let tries = 0;

			while (
				global.db.data.users[temporaryDatabaseJid] &&
				tries < 10
			) {
				temporaryDatabaseJid =
					createTemporaryJid(
						m.sender + Date.now() + tries
					);

				tries++;
			}

			// database.js سيقوم بإنشاء user هنا
			m.sender = temporaryDatabaseJid;
		}

		// ═══════════════════════════════════════════════
		// Database
		// ═══════════════════════════════════════════════

		await (
			await import(`./lib/database.js?v=${Date.now()}`)
		).default(m, this);

		/*
		 * رجع LID بعد إنشاء user
		 */
		if (temporaryDatabaseJid) {
			const createdUser =
				global.db.data.users[temporaryDatabaseJid];

			if (createdUser) {
				global.db.data.users[m.originalSender] =
					createdUser;

				delete global.db.data.users[
					temporaryDatabaseJid
				];
			}

			m.sender = m.originalSender;
		}

		// ═══════════════════════════════════════════════
		// Text
		// ═══════════════════════════════════════════════

		if (typeof m.text !== 'string') {
			m.text = '';
		}

		// ═══════════════════════════════════════════════
		// 👑 OWNER SYSTEM
		// ═══════════════════════════════════════════════

		const ownerJids = [
			conn.decodeJid(global.conn.user.id),
			...global.owner.map(([number]) => number)
		]
			.filter(Boolean)
			.map((value) => normalizeJid(value))
			.filter(Boolean);

		let isROwner = false;

		// الرقم أو JID العادي
		for (const ownerJid of ownerJids) {
			if (sameJid(this, ownerJid, m.sender)) {
				isROwner = true;
				break;
			}
		}

		// إذا كان LID نحاول نربطو بالرقم
		if (!isROwner && isLidJid(m.sender)) {
			try {
				const mapped = await resolveLid(
					this,
					m.sender
				);

				if (mapped) {
					for (const ownerJid of ownerJids) {
						if (
							sameJid(
								this,
								ownerJid,
								mapped
							)
						) {
							isROwner = true;
							break;
						}
					}
				}
			} catch {}
		}

		const isOwner = isROwner || m.fromMe;

		// ═══════════════════════════════════════════════
		// 💎 Premium
		// ═══════════════════════════════════════════════

		const isPrems =
			isROwner ||
			!!global.db.data.users[m.sender]?.premiumTime ||
			!!global.db.data.users[m.originalSender]?.premiumTime;

		// ═══════════════════════════════════════════════
		// Settings
		// ═══════════════════════════════════════════════

		const settings =
			global.db.data.settings[this.user.jid] ||
			(global.db.data.settings[this.user.jid] = {
				public: true,
				autoread: true,
				anticall: true,
				gconly: true,
			});

		if (
			settings.gconly &&
			!m.isGroup &&
			!isOwner &&
			!isPrems
		) {
			return;
		}

		if (
			!settings.public &&
			!isOwner &&
			!m.fromMe
		) {
			return;
		}

		if (m.isBaileys) return;

		m.exp += Math.ceil(Math.random() * 10);

		// ═══════════════════════════════════════════════
		// 👤 User database
		// ═══════════════════════════════════════════════

		let usedPrefix;

		let _user =
			global.db.data &&
			global.db.data.users &&
			global.db.data.users[m.sender];

		/*
		 * حماية إضافية:
		 * إذا المستخدم LID ولم يتم إنشاء الحساب لأي سبب،
		 * نحاول استعمال حسابه القديم أو إنشاء حساب أساسي.
		 */
		if (!_user) {
			_user =
				global.db.data.users[m.originalSender];

			if (_user) {
				global.db.data.users[m.sender] = _user;
			}
		}

		if (!_user) {
			_user = {
				name: m.name || m.pushName || 'User',
				exp: 0,
				limit: 20,
				level: 1,
				registered: false,
				premium: false,
				premiumTime: 0,
				warn: 0,
				money: 0,
				health: 100,
				role: 'Newbie',
				age: -1,
				regTime: -1,
				afk: -1,
				afkReason: '',
				banned: false,
				autolevelup: false,
			};

			global.db.data.users[m.sender] = _user;
		}

		// تأكد من وجود القيم المهمة
		if (typeof _user.exp !== 'number') _user.exp = 0;
		if (typeof _user.limit !== 'number') _user.limit = 20;
		if (typeof _user.level !== 'number') _user.level = 1;
		if (typeof _user.warn !== 'number') _user.warn = 0;

		// ═══════════════════════════════════════════════
		// 👥 Group metadata
		// ═══════════════════════════════════════════════

		const groupMetadata =
			(
				m.isGroup
					? (
							conn.chats[m.chat] || {}
						).metadata ||
						(
							await this
								.groupMetadata(m.chat)
								.catch(() => null)
						)
					: {}
			) || {};

		const participants =
			(m.isGroup
				? groupMetadata.participants
				: []) || [];

		// ═══════════════════════════════════════════════
		// 👤 User participant
		// ═══════════════════════════════════════════════

		const user =
			(
				m.isGroup
					? participants.find((u) => {
							if (!u) return false;

							const id =
								u.id ||
								u.jid ||
								u.lid;

							return (
								sameJid(
									this,
									id,
									m.sender
								) ||
								sameJid(
									this,
									id,
									m.originalSender
								) ||
								u.lid === m.originalSender ||
								u.id === m.originalSender
							);
						})
					: {}
			) || {};

		// ═══════════════════════════════════════════════
		// 🤖 Bot participant
		// ═══════════════════════════════════════════════

		const bot =
			(
				m.isGroup
					? participants.find((u) => {
							if (!u) return false;

							const id =
								u.id ||
								u.jid ||
								u.lid;

							return sameJid(
								this,
								id,
								this.user.jid
							);
						})
					: {}
			) || {};

		const isRAdmin =
			user?.admin === 'superadmin' ||
			false;

		const isAdmin =
			isRAdmin ||
			user?.admin === 'admin' ||
			false;

		const isBotAdmin =
			bot?.admin || false;

		// ═══════════════════════════════════════════════
		// 📁 Plugins directory
		// ═══════════════════════════════════════════════

		const ___dirname = path.join(
			path.dirname(
				fileURLToPath(import.meta.url)
			),
			'./plugins'
		);

		// ═══════════════════════════════════════════════
		// 🔌 Plugins
		// ═══════════════════════════════════════════════

		for (let name in global.plugins) {
			let plugin = global.plugins[name];

			if (!plugin) continue;
			if (plugin.disabled) continue;

			const __filename = path.join(
				___dirname,
				name
			);

			// ═══════════════════════════════════════════
			// Plugin ALL
			// ═══════════════════════════════════════════

			if (typeof plugin.all === 'function') {
				try {
					await plugin.all.call(this, m, {
						chatUpdate,
						__dirname: ___dirname,
						__filename,
					});
				} catch (e) {
					console.error(e);

					for (
						let [jid] of global.owner.filter(
							([number, , isDeveloper]) =>
								isDeveloper && number
						)
					) {
						try {
							let data =
								(
									await conn.onWhatsApp(
										jid
									)
								)[0] || {};

							if (data.exists) {
								m.reply(
									`*Plugin:* ${name}\n*Sender:* ${m.sender}\n*Original:* ${m.originalSender || '-'}\n*Chat:* ${m.chat}\n*Command:* ${m.text}\n\n\`\`\`${format(e)}\`\`\``
										.trim(),
									data.jid
								);
							}
						} catch {}
					}
				}
			}

			// ═══════════════════════════════════════════
			// Admin tagged plugins
			// ═══════════════════════════════════════════

			if (
				plugin.tags &&
				plugin.tags.includes('admin')
			) {
				continue;
			}

			// ═══════════════════════════════════════════
			// Prefix
			// ═══════════════════════════════════════════

			const str2Regex = (str) =>
				str.replace(
					/[|\\{}()[\]^$+*?.]/g,
					'\\$&'
				);

			let _prefix = plugin.customPrefix
				? plugin.customPrefix
				: conn.prefix
					? conn.prefix
					: global.prefix;

			let match = (
				_prefix instanceof RegExp
					? [
							[
								_prefix.exec(m.text),
								_prefix,
							],
						]
					: Array.isArray(_prefix)
						? _prefix.map((p) => {
								let re =
									p instanceof RegExp
										? p
										: new RegExp(
												str2Regex(p)
											);

								return [
									re.exec(m.text),
									re,
								];
							})
						: typeof _prefix === 'string'
							? [
									[
										new RegExp(
											str2Regex(
												_prefix
											)
										).exec(
											m.text
										),
										new RegExp(
											str2Regex(
												_prefix
											)
										),
									],
								]
							: [[[], new RegExp()]]
			).find((p) => p[1]);

			// ═══════════════════════════════════════════
			// Plugin BEFORE
			// ═══════════════════════════════════════════

			if (typeof plugin.before === 'function') {
				if (
					await plugin.before.call(this, m, {
						match,
						conn: this,
						participants,
						groupMetadata,
						user,
						bot,
						isROwner,
						isOwner,
						isRAdmin,
						isAdmin,
						isBotAdmin,
						isPrems,
						chatUpdate,
						__dirname: ___dirname,
						__filename,
					})
				) {
					continue;
				}
			}

			if (typeof plugin !== 'function') continue;

			// ═══════════════════════════════════════════
			// Command
			// ═══════════════════════════════════════════

			if ((usedPrefix = (match[0] || '')[0])) {
				let noPrefix = m.text.replace(
					usedPrefix,
					''
				);

				let [command, ...args] =
					noPrefix
						.trim()
						.split` `
						.filter((v) => v);

				args = args || [];

				let _args = noPrefix
					.trim()
					.split` `
					.slice(1);

				let text = _args.join` `;

				command = (command || '').toLowerCase();

				let fail =
					plugin.fail ||
					global.dfail;

				let isAccept =
					plugin.command instanceof RegExp
						? plugin.command.test(
								command
							)
						: Array.isArray(
								plugin.command
							)
							? plugin.command.some(
									(cmd) =>
										cmd instanceof RegExp
											? cmd.test(
													command
												)
											: cmd ===
												command
								)
							: typeof plugin.command ===
									'string'
								? plugin.command === command
								: false;

				if (!isAccept) continue;

				m.plugin = name;

				// ═══════════════════════════════════════
				// Chat ban
				// ═══════════════════════════════════════

				if (
					!isOwner &&
					(
						m.chat in
							global.db.data.chats ||
						m.sender in
							global.db.data.users ||
						m.originalSender in
							global.db.data.users
					)
				) {
					let chat =
						global.db.data.chats[m.chat];

					if (
						name !== 'tools-delete.js' &&
						chat?.isBanned
					) {
						return;
					}
				}

				// ═══════════════════════════════════════
				// Owner
				// ═══════════════════════════════════════

				if (
					plugin.rowner &&
					plugin.owner &&
					!(isROwner || isOwner)
				) {
					fail('owner', m, this);
					continue;
				}

				if (
					plugin.rowner &&
					!isROwner
				) {
					fail('rowner', m, this);
					continue;
				}

				if (
					plugin.owner &&
					!isOwner
				) {
					fail('owner', m, this);
					continue;
				}

				// ═══════════════════════════════════════
				// Premium
				// ═══════════════════════════════════════

				if (
					plugin.premium &&
					!isPrems
				) {
					fail('premium', m, this);
					continue;
				}

				// ═══════════════════════════════════════
				// Group
				// ═══════════════════════════════════════

				if (
					plugin.group &&
					!m.isGroup
				) {
					fail('group', m, this);
					continue;
				}

				if (
					plugin.botAdmin &&
					!isBotAdmin
				) {
					fail(
						'botAdmin',
						m,
						this
					);
					continue;
				}

				if (
					plugin.admin &&
					!isAdmin
				) {
					fail('admin', m, this);
					continue;
				}

				// ═══════════════════════════════════════
				// Private
				// ═══════════════════════════════════════

				if (
					plugin.private &&
					m.isGroup
				) {
					fail('private', m, this);
					continue;
				}

				// ═══════════════════════════════════════
				// Register
				// ═══════════════════════════════════════

				if (
					plugin.register === true &&
					_user.registered === false
				) {
					fail('unreg', m, this);
					continue;
				}

				m.isCommand = true;

				// ═══════════════════════════════════════
				// XP
				// ═══════════════════════════════════════

				let xp =
					'exp' in plugin
						? parseInt(plugin.exp)
						: 17;

				if (xp > 200) {
					m.reply('Ngecit -_-');
				} else {
					m.exp += xp;
				}

				// ═══════════════════════════════════════
				// Limit
				// ═══════════════════════════════════════

				if (
					!isPrems &&
					plugin.limit &&
					_user.limit <
						plugin.limit * 1
				) {
					this.reply(
						m.chat,
						`[❗]Your limit has run out, please buy via *${usedPrefix}buy limit*`,
						m
					);

					continue;
				}

				// ═══════════════════════════════════════
				// Level
				// ═══════════════════════════════════════

				if (
					plugin.level &&
					plugin.level > _user.level
				) {
					this.reply(
						m.chat,
						`[💬] Level required ${plugin.level} to use this command\n*Your level:* ${_user.level} 📊`,
						m
					);

					continue;
				}

				// ═══════════════════════════════════════
				// Extra
				// ═══════════════════════════════════════

				let extra = {
					match,
					usedPrefix,
					noPrefix,
					_args,
					args,
					command,
					text,
					conn: this,
					participants,
					groupMetadata,
					user,
					bot,
					isROwner,
					isOwner,
					isRAdmin,
					isAdmin,
					isBotAdmin,
					isPrems,
					chatUpdate,
					__dirname: ___dirname,
					__filename,

					// إضافات LID
					sender: m.sender,
					originalSender: m.originalSender,
					lid: m.lid,
					phoneNumber: m.phoneNumber,
				};

				// ═══════════════════════════════════════
				// Execute plugin
				// ═══════════════════════════════════════

				try {
					await plugin.call(
						this,
						m,
						extra
					);

					if (!isPrems) {
						m.limit =
							m.limit ||
							plugin.limit ||
							false;
					}
				} catch (e) {
					m.error = e;

					console.error(e);

					if (e) {
						let errorText = format(e);

						if (e.name) {
							for (
								let [jid] of global.owner.filter(
									([
										number,
										,
										isDeveloper,
									]) =>
										isDeveloper &&
										number
								)
							) {
								try {
									let data =
										(
											await conn.onWhatsApp(
												jid
											)
										)[0] || {};

									if (
										data.exists
									) {
										m.reply(
											`*🗂️ Plugin:* ${m.plugin}\n*👤 Sender:* ${m.sender}\n*🔐 Original:* ${m.originalSender || '-'}\n*💬 Chat:* ${m.chat}\n*💻 Command:* ${usedPrefix}${command} ${args.join(' ')}\n📄 *Error Logs:*\n\n\`\`\`${errorText}\`\`\``
												.trim(),
											data.jid
										);
									}
								} catch {}
							}
						}

						m.reply(errorText);
					}
				} finally {
					if (
						typeof plugin.after ===
						'function'
					) {
						try {
							await plugin.after.call(
								this,
								m,
								extra
							);
						} catch (e) {
							console.error(e);
						}
					}

					if (m.limit) {
						m.reply(
							+m.limit +
								' Limit used ✔️'
						);
					}
				}

				break;
			}
		}
	} catch (e) {
		console.error(e);
	} finally {
		let user;
		let stats =
			global.db.data.stats;

		if (m) {
			if (
				m.sender &&
				(
					user =
						global.db.data.users[
							m.sender
						]
				)
			) {
				user.exp += Number(
					m.exp || 0
				);

				user.limit -= Number(
					m.limit || 0
				);

				if (user.limit < 0) {
					user.limit = 0;
				}
			}

			if (m.plugin) {
				const now = Date.now();

				stats[m.plugin] = {
					total: 0,
					success: 0,
					last: 0,
					lastSuccess: 0,
					...stats[m.plugin],
				};

				stats[m.plugin].total++;

				stats[m.plugin].last = now;

				if (!m.error) {
					stats[m.plugin].success++;

					stats[
						m.plugin
					].lastSuccess = now;
				}
			}
		}

		// ═══════════════════════════════════════════════
		// Print
		// ═══════════════════════════════════════════════

		try {
			await (
				await import(
					`./lib/print.js?v=${Date.now()}`
				)
			).default(m, this);
		} catch (e) {
			console.log(
				m,
				m?.quoted,
				e
			);
		}

		// ═══════════════════════════════════════════════
		// Auto read
		// ═══════════════════════════════════════════════

		try {
			if (
				global.db.data.settings[
					this.user.jid
				]?.autoread
			) {
				await conn.readMessages([
					m.key,
				]);
			}
		} catch {}
	}
}

/**
 * ═══════════════════════════════════════════════
 * 👥 GROUP PARTICIPANTS UPDATE
 * ═══════════════════════════════════════════════
 */
export async function participantsUpdate({
	id,
	participants,
	action,
	simulate = false,
}) {
	try {
		if (this.isInit && !simulate) return;

		if (global.db.data == null) {
			await loadDatabase();
		}

		let chat =
			global.db.data.chats[id] || {};

		let text = '';

		const groupMetadata =
			(conn.chats[id] || {}).metadata ||
			(await this.groupMetadata(id));

		switch (action) {
			case 'add':
			case 'remove':
				if (chat.welcome) {
					for (let participant of participants) {
						const original =
							participant?.phoneNumber ||
							participant?.id ||
							participant?.lid;

						let user =
							typeof original === 'string'
								? (
										await resolveLid(
											this,
											original
										)
									) ||
									original
								: original;

						let tamnel;

						try {
							tamnel =
								await this.profilePictureUrl(
									user,
									'image',
									'buffer'
								);
						} catch {
							tamnel = null;
						}

						text =
							(
								action === 'add'
									? chat.sWelcome ||
										this.welcome ||
										conn.welcome ||
										'Welcome, @user!'
									: chat.sBye ||
										this.bye ||
										conn.bye ||
										'Bye, @user!'
							)
								.replace(
									'@user',
									`@${user.split('@')[0]}`
								)
								.replace(
									'@subject',
									this.getName(id)
								)
								.replace(
									'@desc',
									groupMetadata.desc ||
										''
								);

						this.adReply(
							id,
							text,
							tamnel,
							null,
							{
								title:
									action === 'add'
										? '💌 WELCOME'
										: '🐾 BYE',
								description:
									action === 'add'
										? 'YES THE LOAD OF THE GROUP INCREASED1 :('
										: 'BYE ! :)',
							}
						);
					}
				}
				break;

			case 'promote':
			case 'demote':
				for (let participant of participants) {
					const original =
						participant?.phoneNumber ||
						participant?.id ||
						participant?.lid;

					let user =
						typeof original === 'string'
							? (
									await resolveLid(
										this,
										original
									)
								) ||
								original
							: original;

					text = (
						action === 'promote'
							? chat.sPromote ||
								this.spromote ||
								conn.spromote ||
								'@user ```is now Admin```'
							: chat.sDemote ||
								this.sdemote ||
								conn.sdemote ||
								'@user ```is no longer Admin```'
					)
						.replace(
							'@user',
							'@' +
								user.split('@')[0]
						)
						.replace(
							'@subject',
							this.getName(id)
						)
						.replace(
							'@desc',
							groupMetadata.desc ||
								''
						);

					if (chat.detect) {
						this.sendMessage(id, {
							text,
							mentions:
								this.parseMention(
									text
								),
						});
					}
				}
				break;
		}
	} catch (e) {
		console.error(
			'participantsUpdate:',
			e
		);
	}
}

/**
 * ═══════════════════════════════════════════════
 * 👥 GROUPS UPDATE
 * ═══════════════════════════════════════════════
 */
export async function groupsUpdate(
	groupsUpdate
) {
	try {
		for (const groupUpdate of groupsUpdate) {
			const id = groupUpdate.id;

			if (!id) continue;

			let chats =
				global.db.data.chats[id];

			let text = '';

			if (!chats?.detect) continue;

			if (groupUpdate.desc) {
				text = (
					chats.sDesc ||
					this.sDesc ||
					conn.sDesc ||
					'```Description has been changed to```\n@desc'
				).replace(
					'@desc',
					groupUpdate.desc
				);
			}

			if (groupUpdate.subject) {
				text = (
					chats.sSubject ||
					this.sSubject ||
					conn.sSubject ||
					'```Subject has been changed to```\n@subject'
				).replace(
					'@subject',
					groupUpdate.subject
				);
			}

			if (groupUpdate.icon) {
				text = (
					chats.sIcon ||
					this.sIcon ||
					conn.sIcon ||
					'```Icon has been changed to```'
				).replace(
					'@icon',
					groupUpdate.icon
				);
			}

			if (groupUpdate.revoke) {
				text = (
					chats.sRevoke ||
					this.sRevoke ||
					conn.sRevoke ||
					'```Group link has been changed to```\n@revoke'
				).replace(
					'@revoke',
					groupUpdate.revoke
				);
			}

			if (!text) continue;

			await this.sendMessage(id, {
				text,
				mentions:
					this.parseMention(text),
			});
		}
	} catch (e) {
		console.error(
			'groupsUpdate:',
			e
		);
	}
}

/**
 * ═══════════════════════════════════════════════
 * 🗑️ DELETE MESSAGE
 * ═══════════════════════════════════════════════
 */
export async function deleteUpdate(
	message
) {
	try {
		const {
			fromMe,
			id,
			participant,
	} = message;

		if (fromMe) return;

		let msg = this.serializeM(
			this.loadMessage(id)
		);

		if (!msg) return;

		let chat =
			global.db.data.chats[msg.chat];

		if (!chat?.delete) return;

		const participantId =
			participant ||
			msg.sender ||
			'';

		await this.reply(
			msg.chat,
			`Detected @${participantId.split('@')[0]} has deleted a message
To disable this feature, type
*.enable delete*

تم رصد @${participantId.split('@')[0]} قام بحذف رسالة
لإيقاف هذه الميزة، اكتب
*.enable delete*`.trim(),
			msg,
			{
				mentions: participant
					? [participant]
					: [],
			}
		);

		this.copyNForward(
			msg.chat,
			msg
		).catch((e) =>
			console.log(e, msg)
		);
	} catch (e) {
		console.error(
			'deleteUpdate:',
			e
		);
	}
}

/**
 * ═══════════════════════════════════════════════
 * ❌ DEFAULT FAIL MESSAGES
 * ═══════════════════════════════════════════════
 */
global.dfail = (
	type,
	m,
	conn
) => {
	let msg = {
		rowner:
			'Only Developer - This command is for the bot developer only\nهذا الأمر مخصص للمطور فقط',

		owner:
			'Only Owner - This command is for the bot owner only\nهذا الأمر مخصص لمالك البوت فقط',

		premium:
			'Only Premium - This command is for premium users only\nهذا الأمر مخصص للمستخدمين المميزين فقط',

		group:
			'Group Chat - This command can only be used in groups\nهذا الأمر يعمل داخل المجموعات فقط',

		private:
			'Private Chat - This command can only be used in private chat\nهذا الأمر يعمل في المحادثة الخاصة فقط',

		admin:
			'Only Admin - This command is for group admins only\nهذا الأمر مخصص للمشرفين فقط',

		botAdmin:
			'Only Bot Admin - This command requires the bot to be an admin\nهذا الأمر يتطلب أن يكون البوت مشرفاً',

		unreg:
			'Hello! 👋 You need to register in the bot database first before using this feature\nWrite .daftar Name.age to register\n\nمرحباً! 👋 يجب عليك التسجيل في قاعدة بيانات البوت أولاً قبل استخدام هذه الميزة\nاكتب .daftar الاسم.العمر للتسجيل',

		restrict:
			'Restrict - This feature has not been activated in this chat\nهذه الميزة غير مفعّلة في هذه المحادثة',
	}[type];

	if (msg) {
		return conn.reply(
			m.chat,
			msg,
			m
		);
	}
};

/**
 * ═══════════════════════════════════════════════
 * 🔄 HOT RELOAD
 * ═══════════════════════════════════════════════
 */

let file = global.__filename(
	import.meta.url,
	true
);

watchFile(
	file,
	async () => {
		unwatchFile(file);

		console.log(
			chalk.redBright(
				"Update 'handler.js'"
			)
		);

		if (global.reloadHandler) {
			console.log(
				await global.reloadHandler()
			);
		}
	}
);