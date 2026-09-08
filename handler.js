import { smsg } from './lib/simple.js';
import { format } from 'util';
import { fileURLToPath } from 'url';
import path from 'path';
import { unwatchFile, watchFile } from 'fs';
import chalk from 'chalk';

/**
 * Handle messages upsert
 * @param {import('baileys').BaileysEventMap<unknown>['messages.upsert']} chatUpdate
 */
export async function handler(chatUpdate) {
	if (!chatUpdate) return;

	try {
		this.pushMessage(chatUpdate.messages).catch(console.error);
	} catch (e) {
		console.error('pushMessage error:', e);
	}

	let m = chatUpdate.messages[chatUpdate.messages.length - 1];
	if (!m) return;

	if (global.db.data == null) await global.loadDatabase();

	try {
		m = smsg(this, m) || m;
		if (!m) return;

		m.exp = 0;
		m.limit = false;

		// حماية من الرسائل الخاصة بالنظام
		if (
			m.sender?.endsWith('@broadcast') ||
			m.sender?.endsWith('@newsletter')
		) return;

		// معالجة قاعدة البيانات
		await (await import(`./lib/database.js?v=${Date.now()}`)).default(m, this);

		if (typeof m.text !== 'string') m.text = '';

		/*
		 * ============================================
		 * OWNER / PREMIUM
		 * ============================================
		 */

		const senderJid = m.sender || '';

		const ownerNumbers = [
			conn.decodeJid(global.conn.user.id),
			...global.owner.map(([number]) => number)
		];

		const ownerJids = ownerNumbers.map(v => {
			const number = String(v).replace(/[^0-9]/g, '');
			return number ? `${number}@s.whatsapp.net` : '';
		}).filter(Boolean);

		/*
		 * إذا كان المستخدم @lid نحاول الحصول على JID الحقيقي
		 * باستعمال getJid الموجود أصلاً في lib/simple.js
		 */
		let realSender = senderJid;

		try {
			if (
				senderJid.endsWith('@lid') &&
				typeof conn.getJid === 'function'
			) {
				const resolved = conn.getJid(senderJid);

				if (
					resolved &&
					resolved !== senderJid
				) {
					realSender = resolved;
				}
			}
		} catch (e) {
			console.log('LID resolve warning:', e);
		}

		const isROwner =
			ownerJids.includes(senderJid) ||
			ownerJids.includes(realSender);

		const isOwner = isROwner || m.fromMe;

		const isPrems =
			isROwner ||
			db.data.users[senderJid]?.premiumTime > 0 ||
			db.data.users[realSender]?.premiumTime > 0;

		/*
		 * ============================================
		 * CHAT SETTINGS
		 * ============================================
		 */

		const settings =
			global.db.data.settings[this.user.jid] ||
			(global.db.data.settings[this.user.jid] = {});

		if (
			settings.gconly &&
			!m.isGroup &&
			!isOwner &&
			!isPrems
		) return;

		if (
			settings.public === false &&
			!isOwner &&
			!m.fromMe
		) return;

		if (m.isBaileys) return;

		m.exp += Math.ceil(Math.random() * 10);

		/*
		 * ============================================
		 * USER DATABASE
		 * ============================================
		 */

		let usedPrefix;

		let _user =
			global.db.data &&
			global.db.data.users &&
			(
				global.db.data.users[senderJid] ||
				global.db.data.users[realSender]
			);

		/*
		 * إذا كان @lid وما عندوش user entry،
		 * نستخدم الحساب الحقيقي إذا قدرنا نلقاوه.
		 */
		if (!_user && realSender !== senderJid) {
			_user = global.db.data.users[realSender];
		}

		/*
		 * ============================================
		 * GROUP DATA
		 * ============================================
		 */

		const groupMetadata = (
			m.isGroup
				? (
					(conn.chats[m.chat] || {}).metadata ||
					(await this.groupMetadata(m.chat).catch(() => null))
				)
				: {}
		) || {};

		const participants =
			(m.isGroup ? groupMetadata.participants : []) || [];

		const user =
			(
				m.isGroup
					? participants.find(u => {
						const id = u?.id || '';
						const jid = conn.getJid(id);

						return (
							jid === senderJid ||
							jid === realSender ||
							id === senderJid ||
							id === realSender
						);
					})
					: {}
			) || {};

		const bot =
			(
				m.isGroup
					? participants.find(u =>
						conn.getJid(u.id) == this.user.jid
					)
					: {}
			) || {};

		const isRAdmin =
			user?.admin == 'superadmin' || false;

		const isAdmin =
			isRAdmin ||
			user?.admin == 'admin' ||
			false;

		const isBotAdmin =
			bot?.admin || false;

		/*
		 * ============================================
		 * PLUGINS
		 * ============================================
		 */

		const ___dirname = path.join(
			path.dirname(fileURLToPath(import.meta.url)),
			'./plugins'
		);

		for (let name in global.plugins) {
			let plugin = global.plugins[name];

			if (!plugin) continue;
			if (plugin.disabled) continue;

			const __filename = path.join(___dirname, name);

			/*
			 * ============================================
			 * PLUGIN ALL
			 * ============================================
			 */

			if (typeof plugin.all === 'function') {
				try {
					await plugin.all.call(this, m, {
						chatUpdate,
						__dirname: ___dirname,
						__filename
					});
				} catch (e) {
					console.error(e);

					for (let [jid] of global.owner.filter(
						([number, _, isDeveloper]) =>
							isDeveloper && number
					)) {
						try {
							let data =
								(await conn.onWhatsApp(jid))[0] || {};

							if (data.exists) {
								m.reply(
									`*Plugin:* ${name}
*Sender:* ${m.sender}
*Chat:* ${m.chat}
*Command:* ${m.text}

\`\`\`${format(e)}\`\`\``,
									data.jid
								);
							}
						} catch {}
					}
				}
			}

			if (
				plugin.tags &&
				plugin.tags.includes('admin')
			) {
				continue;
			}

			/*
			 * ============================================
			 * PREFIX
			 * ============================================
			 */

			const str2Regex = str =>
				str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');

			let _prefix =
				plugin.customPrefix
					? plugin.customPrefix
					: conn.prefix
						? conn.prefix
						: global.prefix;

			let match = (
				_prefix instanceof RegExp

					? [[_prefix.exec(m.text), _prefix]]

					: Array.isArray(_prefix)

						? _prefix.map(p => {
							let re =
								p instanceof RegExp
									? p
									: new RegExp(str2Regex(p));

							return [re.exec(m.text), re];
						})

						: typeof _prefix === 'string'

							? [[
								new RegExp(str2Regex(_prefix))
									.exec(m.text),
								new RegExp(str2Regex(_prefix))
							]]

							: [[[], new RegExp()]]
			).find(p => p[1]);

			/*
			 * ============================================
			 * BEFORE
			 * ============================================
			 */

			if (typeof plugin.before === 'function') {
				try {
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
							__filename
						})
					) continue;
				} catch (e) {
					console.error(e);
				}
			}

			if (typeof plugin !== 'function') continue;

			/*
			 * ============================================
			 * COMMAND
			 * ============================================
			 */

			if ((usedPrefix = (match?.[0] || '')[0])) {
				let noPrefix =
					m.text.replace(usedPrefix, '');

				let [command, ...args] =
					noPrefix
						.trim()
						.split` `
						.filter(v => v);

				args = args || [];

				let _args =
					noPrefix
						.trim()
						.split` `
						.slice(1);

				let text = _args.join` `;

				command =
					(command || '').toLowerCase();

				let fail =
					plugin.fail ||
					global.dfail;

				let isAccept =
					plugin.command instanceof RegExp

						? plugin.command.test(command)

						: Array.isArray(plugin.command)

							? plugin.command.some(cmd =>
								cmd instanceof RegExp
									? cmd.test(command)
									: cmd === command
							)

							: typeof plugin.command === 'string'

								? plugin.command === command

								: false;

				if (!isAccept) continue;

				m.plugin = name;

				/*
				 * ============================================
				 * BANNED CHAT
				 * ============================================
				 */

				if (
					!isOwner &&
					(
						m.chat in global.db.data.chats ||
						m.sender in global.db.data.users ||
						realSender in global.db.data.users
					)
				) {
					let chat =
						global.db.data.chats[m.chat];

					if (
						name != 'tools-delete.js' &&
						chat?.isBanned
					) return;
				}

				/*
				 * ============================================
				 * PERMISSIONS
				 * ============================================
				 */

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

				if (
					plugin.premium &&
					!isPrems
				) {
					fail('premium', m, this);
					continue;
				}

				if (
					plugin.group &&
					!m.isGroup
				) {
					fail('group', m, this);
					continue;

				} else if (
					plugin.botAdmin &&
					!isBotAdmin
				) {
					fail('botAdmin', m, this);
					continue;

				} else if (
					plugin.admin &&
					!isAdmin
				) {
					fail('admin', m, this);
					continue;
				}

				if (
					plugin.private &&
					m.isGroup
				) {
					fail('private', m, this);
					continue;
				}

				/*
				 * ============================================
				 * REGISTER
				 * ============================================
				 */

				if (
					plugin.register == true &&
					_user &&
					_user.registered == false
				) {
					fail('unreg', m, this);
					continue;
				}

				m.isCommand = true;

				let xp =
					'exp' in plugin
						? parseInt(plugin.exp)
						: 17;

				if (xp > 200) {
					m.reply('Ngecit -_-');
				} else {
					m.exp += xp;
				}

				/*
				 * ============================================
				 * LIMIT
				 * ============================================
				 */

				const currentUser =
					global.db.data.users[m.sender] ||
					global.db.data.users[realSender];

				if (
					!isPrems &&
					plugin.limit &&
					currentUser &&
					currentUser.limit <
						plugin.limit * 1
				) {
					this.reply(
						m.chat,
						`[❗]Your limit has run out, please buy via *${usedPrefix}buy limit*`,
						m
					);
					continue;
				}

				/*
				 * ============================================
				 * LEVEL
				 * ============================================
				 */

				if (
					_user &&
					plugin.level > _user.level
				) {
					this.reply(
						m.chat,
						`[💬] Level required ${plugin.level} to use this command
*Your level:* ${_user.level} 📊`,
						m
					);
					continue;
				}

				/*
				 * ============================================
				 * EXTRA
				 * ============================================
				 */

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
					__filename
				};

				/*
				 * ============================================
				 * RUN PLUGIN
				 * ============================================
				 */

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
						let textError = format(e);

						if (e.name) {
							for (let [jid] of global.owner.filter(
								([number, _, isDeveloper]) =>
									isDeveloper && number
							)) {
								try {
									let data =
										(await conn.onWhatsApp(jid))[0] ||
										{};

									if (data.exists) {
										m.reply(
											`*🗂️ Plugin:* ${m.plugin}
*👤 Sender:* ${m.sender}
*💬 Chat:* ${m.chat}
*💻 Command:* ${usedPrefix}${command} ${args.join(' ')}
📄 *Error Logs:*

\`\`\`${textError}\`\`\``,
											data.jid
										);
									}
								} catch {}
							}
						}

						m.reply(textError);
					}
				} finally {
					if (
						typeof plugin.after === 'function'
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
		console.error('Handler error:', e);

	} finally {

		let user;
		let stats =
			global.db.data.stats;

		if (m) {

			/*
			 * إذا كان LID نحاول استعمال الحساب
			 * الحقيقي في قاعدة البيانات
			 */
			const sender =
				m.sender ||
				'';

			let realSender =
				sender;

			try {
				if (
					sender.endsWith('@lid') &&
					typeof conn.getJid === 'function'
				) {
					const resolved =
						conn.getJid(sender);

					if (
						resolved &&
						resolved !== sender
					) {
						realSender = resolved;
					}
				}
			} catch {}

			if (
				m.sender &&
				(
					user =
						global.db.data.users[m.sender] ||
						global.db.data.users[realSender]
				)
			) {
				user.exp +=
					Number(m.exp || 0);

				user.limit -=
					Number(m.limit || 0);
			}

			/*
			 * ============================================
			 * STATS
			 * ============================================
			 */

			if (m.plugin) {
				const now =
					Date.now();

				stats[m.plugin] = {
					total: 0,
					success: 0,
					last: 0,
					lastSuccess: 0,
					...stats[m.plugin]
				};

				stats[m.plugin].total++;

				stats[m.plugin].last =
					now;

				if (!m.error) {
					stats[m.plugin].success++;

					stats[m.plugin].lastSuccess =
						now;
				}
			}
		}

		/*
		 * ============================================
		 * PRINT
		 * ============================================
		 */

		try {
			await (
				await import(
					`./lib/print.js`
				)
			).default(m, this);

		} catch (e) {
			console.log(
				m,
				m?.quoted,
				e
			);
		}

		/*
		 * ============================================
		 * AUTOREAD
		 * ============================================
		 */

		try {
			if (
				m &&
				global.db.data.settings[
					this.user.jid
				]?.autoread
			) {
				await conn.readMessages([
					m.key
				]);
			}
		} catch (e) {
			console.log(
				'autoread error:',
				e
			);
		}
	}
}

/**
 * Handle groups participants update
 * @param {import('baileys').BaileysEventMap<unknown>['group-participants.update']} groupsUpdate
 */
export async function participantsUpdate({
	id,
	participants,
	action,
	simulate = false
}) {
	if (this.isInit && !simulate) return;

	if (global.db.data == null)
		await loadDatabase();

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

				for (let user of participants) {

					user =
						this.getJid(
							user?.phoneNumber ||
							user.id
						);

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
								groupMetadata.desc || ''
							);

					this.adReply(
						id,
						text,
						tamnel,
						null,
						{
							title:
								action == 'add'
									? '💌 WELCOME'
									: '🐾 BYE',

							description:
								action == 'add'
									? 'YES THE LOAD OF THE GROUP INCREASED1 :('
									: 'BYE ! :)'
						}
					);
				}
			}

			break;

		case 'promote':
		case 'demote':

			for (let users of participants) {

				let user =
					this.getJid(
						users?.phoneNumber ||
						users.id
					);

				text =
					(
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
							groupMetadata.desc || ''
						);

				if (chat.detect) {
					this.sendMessage(
						id,
						{
							text,
							mentions:
								this.parseMention(text)
						}
					);
				}
			}

			break;
	}
}

/**
 * Handle groups update
 * @param {import('baileys').BaileysEventMap<unknown>['groups.update']} groupsUpdate
 */
export async function groupsUpdate(groupsUpdate) {

	for (const groupUpdate of groupsUpdate) {

		const id =
			groupUpdate.id;

		if (!id) continue;

		let chats =
			global.db.data.chats[id];

		let text = '';

		if (!chats?.detect) continue;

		if (groupUpdate.desc) {
			text =
				(
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
			text =
				(
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
			text =
				(
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
			text =
				(
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

		await this.sendMessage(
			id,
			{
				text,
				mentions:
					this.parseMention(text)
			}
		);
	}
}

/**
 * Handle deleted messages
 */
export async function deleteUpdate(message) {

	try {

		const {
			fromMe,
			id,
			participant
		} = message;

		if (fromMe) return;

		let msg =
			this.serializeM(
				this.loadMessage(id)
			);

		if (!msg) return;

		let chat =
			global.db.data.chats[
				msg.chat
			];

		if (!chat.delete) return;

		await this.reply(
			msg.chat,

			`Detected @${participant.split`@`[0]} has deleted a message
To disable this feature, type
*.enable delete*

تم رصد @${participant.split`@`[0]} قام بحذف رسالة
لإيقاف هذه الميزة، اكتب
*.enable delete*`.trim(),

			msg,

			{
				mentions: [
					participant
				]
			}
		);

		this.copyNForward(
			msg.chat,
			msg
		).catch(e =>
			console.log(e, msg)
		);

	} catch (e) {
		console.error(e);
	}
}

/*
 * ============================================
 * DEFAULT FAIL
 * ============================================
 */

global.dfail = (type, m, conn) => {

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
			'Restrict - This feature has not been activated in this chat\nهذه الميزة غير مفعّلة في هذه المحادثة'

	}[type];

	if (msg)
		return conn.reply(
			m.chat,
			msg,
			m
		);
};

/*
 * ============================================
 * HOT RELOAD
 * ============================================
 */

let file =
	global.__filename(
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