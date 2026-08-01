import moment from 'moment-timezone'
import os from 'os'

const NEW_DAYS = 30 // 🆕 كيختافي من بعد هاد عدد الايام
const STATUS_CACHE_MS = 5 * 60 * 1000 // 5 دقايق كاش

// تحويل للحروف الغليظة باش تبان زوينة فالواتساب
function toBoldUnicode(str) {
        const bold = {
                a:'𝐚',b:'𝐛',c:'𝐜',d:'𝐝',e:'𝐞',f:'𝐟',g:'𝐠',h:'𝐡',i:'𝐢',j:'𝐣',
                k:'𝐤',l:'𝐥',m:'𝐦',n:'𝐧',o:'𝐨',p:'𝐩',q:'𝐪',r:'𝐫',s:'𝐬',t:'𝐭',
                u:'𝐮',v:'𝐯',w:'𝐰',x:'𝐱',y:'𝐲',z:'𝐳',
                A:'𝐀',B:'𝐁',C:'𝐂',D:'𝐃',E:'𝐄',F:'𝐅',G:'𝐆',H:'𝐇',I:'𝐈',J:'𝐉',
                K:'𝐊',L:'𝐋',M:'𝐌',N:'𝐍',O:'𝐎',P:'𝐏',Q:'𝐐',R:'𝐑',S:'𝐒',T:'𝐓',
                U:'𝐔',V:'𝐕',W:'𝐖',X:'𝐗',Y:'𝐘',Z:'𝐙',
                0:'𝟎',1:'𝟏',2:'𝟐',3:'𝟑',4:'𝟒',5:'𝟓',6:'𝟔',7:'𝟕',8:'𝟖',9:'𝟗',
        }
        return str.split('').map(c => bold[c] || c).join('')
}

// الالوان ديال الاقسام
const categoryColors = {
        main: '🔵', ai: '🟣', downloader: '🟢', uploader: '🟢',
        editor: '🟠', sticker: '🟡', tools: '⚪', infobot: '🔵',
        group: '🟢', owner: '🔴',
}

// ---------------- الترجمة بالدارجة ----------------
const translations = {
        ar: { // خليتها "ar" باش تبقى متوافقة مع.lang ar
                prefix: 'العلامة', uptime: 'الوقت ديال الخدمة', ram: 'الذاكرة', status: 'الحالة',
                commands: 'الاوامر', plugins: 'البلاگنات', users: 'المستخدمين', views: 'عدد المرات تحل المنيو',
                tapMenu: '✦ ضغط على 📂 لائحة الاوامر لتحت باش تبدل القسم',
                notFound: 'هاد القسم مكاينش، غادي نوريك المنيو كامل.', empty: '(خاوي)',
                whatsNew: 'الجديد', newDesc: 'اوامر تزادو فهاد', days: 'يوم',
                noNew: '(مكاين حتى امر جديد دابا)',
                tips: [
                        '💡 نصيحة: كتب.menu <القسم> باش تدخل نيشان للقسم.',
                        '💡 نصيحة: 🆕 حدا الامر كيعني تزاد مؤخرا.',
                        '💡 نصيحة: 🔥 كيعني هاد الامر مستعمل بزاف.',
                        '💡 نصيحة: 🔒 كيعني عندو عدد محدود ديال الاستعمال.',
                        '💡 نصيحة: 💎 كيعني خاصو بريميوم.',
                        '💡 نصيحة: كتب.menu new باش تشوف الجديد كامل.',
                        '💡 نصيحة: كتب.lang ar|fr|en باش تبدل اللغة.',
                ],
        },
        en: {
                prefix: 'Prefix', uptime: 'Uptime', ram: 'RAM', status: 'Status',
                commands: 'Commands', plugins: 'Plugins', users: 'Users', views: 'Menu Views',
                tapMenu: '✦ Tap 📂 Menu List below to switch category',
                notFound: 'Category not found, showing full menu.', empty: '(empty)',
                whatsNew: "What's New", newDesc: 'Commands added in the last', days: 'days',
                noNew: '(no new commands right now)',
                tips: [
                        '💡 Tip: type.menu <category> to jump straight to a section.',
                        '💡 Tip: 🆕 next to a command means it was added recently.',
                        '💡 Tip: 🔥 marks the most used commands right now.',
                        '💡 Tip: 🔒 means the command has a usage limit.',
                        '💡 Tip: 💎 means the command is premium-only.',
                        '💡 Tip: type.menu new to see everything added recently.',
                        '💡 Tip: type.lang ar|fr|en to change the menu language.',
                ],
        },
        fr: {
                prefix: 'Préfixe', uptime: 'Uptime', ram: 'RAM', status: 'Statut',
                commands: 'Commandes', plugins: 'Plugins', users: 'Utilisateurs', views: 'Vues du menu',
                tapMenu: '✦ Appuyez sur 📂 Menu List ci-dessous pour changer de catégorie',
                notFound: 'Catégorie introuvable, menu complet affiché.', empty: '(vide)',
                whatsNew: 'Nouveautés', newDesc: 'Commandes ajoutées ces derniers', days: 'jours',
                noNew: '(aucune nouvelle commande pour le moment)',
                tips: [
                        '💡 Astuce : tapez.menu <catégorie> pour accéder directement à une section.',
                        '💡 Astuce : 🆕 signifie que la commande a été ajoutée récemment.',
                        '💡 Astuce : 🔥 marque les commandes les plus utilisées.',
                        "💡 Astuce : 🔒 signifie que la commande a une limite d'utilisation.",
                        '💡 Astuce : 💎 signifie que la commande est réservée aux membres premium.',
                        '💡 Astuce : tapez.menu new pour voir tout ce qui a été ajouté récemment.',
                        '💡 Astuce : tapez.lang ar|fr|en pour changer la langue du menu.',
                ],
        },
}

function t(lang, key) {
        const dict = translations[lang] || translations.ar // دابا الافتراضي هو العربية
        return dict[key]!== undefined? dict[key] : translations.ar[key]
}

const handler = async (m, { conn, usedPrefix: _p, command, isOwner, args }) => {

        const allTags = {
                main: { title: 'القائمة الرئيسية', emoji: '🏠' },
                ai: { title: 'قائمة الذكاء الاصطناعي', emoji: '🤖' },
                downloader: { title: 'قائمة التحميل', emoji: '📥' },
                uploader: { title: 'قائمة الرفع', emoji: '📤' },
                editor: { title: 'قائمة التعديل', emoji: '🎨' },
                sticker: { title: 'قائمة الملصقات', emoji: '🎟' },
                tools: { title: 'قائمة الادوات', emoji: '🛠' },
                infobot: { title: 'قائمة المعلومات', emoji: 'ℹ️' },
                group: { title: 'قائمة المجموعات', emoji: '👥' },
                owner: { title: 'قائمة المالك', emoji: '👑' },
        }

        let teks = (args[0] || '').toLowerCase()
        const showNewOnly = teks === 'new'
        let invalidCategory = teks &&!showNewOnly &&!Object.keys(allTags).includes(teks)
        let tags = {}

        if (showNewOnly ||!Object.keys(allTags).includes(teks)) teks = 'all'

        tags = teks === 'all'
               ? {...allTags }
                : { [teks]: allTags[teks] }

        if (!isOwner) delete tags.owner
        if (!m.isGroup) delete tags.group

        try {
                await m.react('⏳')

                const now = Date.now()

                global.db.data.users[m.sender] = global.db.data.users[m.sender] || {}
                let user = global.db.data.users[m.sender]
                const lang = ['ar', 'fr', 'en'].includes(user.lang)? user.lang : 'ar' // الافتراضي عربية

                const defaultMenu = {
                        before: `
╭━━━⪩ ${toBoldUnicode(conn.user.name)} ⪨━━━⬣
┃ 👋 ${ucapan()}، %name
┃ 🔧 ${t(lang, 'prefix')}: %prefix ✨ النسخة %version
┃
┃ 📅 %week، %date
┃ ⏱ ${t(lang, 'uptime')}: %uptime
┃ 💾 ${t(lang, 'ram')}: %ram
┃ 📡 ${t(lang, 'status')}: %status
┃
┃ 📦 ${t(lang, 'commands')}: %totalcmd | ${t(lang, 'plugins')}: %totalplugins
┃ 👥 ${t(lang, 'users')}: %rtotalreg/%totalreg
┃ 👁 ${t(lang, 'views')}: %views
╰━━━━━━━━━━━━━━━⬣
%tip
%readmore`.trim(),

                        newBefore: `
╭━━━⪩ 🆕 ${toBoldUnicode(t(lang, 'whatsNew'))} ⪨━━━⬣
┃ ${t(lang, 'newDesc')} ${NEW_DAYS} ${t(lang, 'days')}
╰━━━━━━━━━━━━━━━⬣
%readmore`.trim(),

                        header: '\n╭─⪩ %emoji %color %category ⪨─ (%count)\n│ %bar',
                        body: '│ %index. %cmd%flags',
                        footer: '╰────────────⬣',
                        after: `\n> ${t(lang, 'tapMenu')}`,
                }

                global.db.data.stats = global.db.data.stats || {}
                global.db.data.stats.pluginFirstSeen = global.db.data.stats.pluginFirstSeen || {}
                const firstSeenMap = global.db.data.stats.pluginFirstSeen
                const isFirstBoot = Object.keys(firstSeenMap).length === 0

                const help = Object.entries(global.plugins)
                       .filter(([_, p]) =>!p.disabled)
                       .map(([filename, p]) => {
                                if (!(filename in firstSeenMap)) {
                                        firstSeenMap[filename] = isFirstBoot? now - (NEW_DAYS + 1) * 86400000 : now
                                }
                                const isNewBool = now - firstSeenMap[filename] < NEW_DAYS * 86400000
                                return {
                                        help: Array.isArray(p.help)? p.help : [p.help],
                                        tags: Array.isArray(p.tags)? p.tags : [p.tags],
                                        prefix: 'customPrefix' in p,
                                        limit: p.limit? '🔒' : '',
                                        premium: p.premium? '💎' : '',
                                        owner: p.owner? '🄾' : '',
                                        isNew: isNewBool? '🆕' : '',
                                        isNewBool,
                                        popular: p.popular? '🔥' : '',
                                }
                        })

                const totalcmd = help.reduce((a, p) => a + p.help.length, 0)
                const totalplugins = help.length
                const totalNew = help.filter(p => p.isNewBool).reduce((a, p) => a + p.help.length, 0)

                const countsByTag = Object.keys(allTags).map(tag =>
                        help.filter(p => p.tags.includes(tag)).reduce((a, p) => a + p.help.length, 0)
                )
                const maxCount = Math.max(...countsByTag, 1)

                const rows = [
                       ...Object.keys(allTags).map(tag => {
                                const count = help.filter(p => p.tags.includes(tag)).reduce((a, p) => a + p.help.length, 0)
                                return {
                                        title: `${allTags[tag].emoji} ${allTags[tag].title}`,
                                        description: `${count} امر`,
                                        id: `${_p + command} ${tag}`,
                                }
                        }),
                        {
                                title: `🆕 ${t(lang, 'whatsNew')}`,
                                description: `${totalNew} امر`,
                                id: `${_p + command} new`,
                        },
                ]

                let text

                if (showNewOnly) {
                        const sections = Object.keys(allTags).map(tag => {
                                const filtered = help.filter(p => p.tags.includes(tag))
                                const list = []
                                for (const p of filtered) {
                                        for (const h of p.help) {
                                                if (!p.isNewBool) continue
                                                const cmd = p.prefix? h : `${_p}${h}`
                                                list.push(cmd)
                                        }
                                }
                                list.sort((a, b) => a.localeCompare(b))
                                if (!list.length) return ''
                                const items = list.map((cmd, i) =>
                                        defaultMenu.body
                                               .replace(/%index/g, String(i + 1).padStart(2, '0'))
                                               .replace(/%cmd/g, cmd)
                                               .replace(/%flags/g, ' 🆕')
                                )
                                return `${defaultMenu.header
                                       .replace('%emoji', allTags[tag].emoji)
                                       .replace('%color', categoryColors[tag] || '⚪')
                                       .replace('%category', toBoldUnicode(allTags[tag].title))
                                       .replace('%count', list.length)
                                       .replace('%bar', '')}\n${items.join('\n')}\n${defaultMenu.footer}`
                        }).filter(Boolean)

                        text = [
                                defaultMenu.newBefore,
                               ...(sections.length? sections : [`\n${t(lang, 'noNew')}`]),
                        ].join('\n')
                } else {
                        text = [
                                defaultMenu.before,
                               ...Object.keys(tags).map(tag => {
                                        const filtered = help.filter(p => p.tags.includes(tag))
                                        const list = []
                                        for (const p of filtered) {
                                                for (const h of p.help) {
                                                        const cmd = p.prefix? h : `${_p}${h}`
                                                        const flags = [p.isNew, p.popular, p.owner, p.premium, p.limit].filter(Boolean).join(' ')
                                                        list.push({ cmd, flags: flags? ` ${flags}` : '' })
                                                }
                                        }
                                        list.sort((a, b) => a.cmd.localeCompare(b.cmd))
                                        const items = list.map((entry, i) =>
                                                defaultMenu.body
                                                       .replace(/%index/g, String(i + 1).padStart(2, '0'))
                                                       .replace(/%cmd/g, entry.cmd)
                                                       .replace(/%flags/g, entry.flags)
                                        )
                                        const count = list.length
                                        const filled = Math.max(1, Math.round((count / maxCount) * 10))
                                        const bar = '▰'.repeat(filled) + '▱'.repeat(10 - filled)
                                        return `${defaultMenu.header
                                               .replace('%emoji', tags[tag].emoji)
                                               .replace('%color', categoryColors[tag] || '⚪')
                                               .replace('%category', toBoldUnicode(tags[tag].title))
                                               .replace('%count', count)
                                               .replace('%bar', bar)}\n${items.join('\n') || `│ ${t(lang, 'empty')}`}\n${defaultMenu.footer}`
                                }),
                                invalidCategory? `\n⚠️ ${t(lang, 'notFound')}` : '',
                                defaultMenu.after,
                        ].filter(Boolean).join('\n')
                }

                let { registered } = user
                let name = registered? user.name : conn.getName(m.sender)
                let uptime = clockString(process.uptime() * 1000)
                let ram = ramUsage()
                let status = await checkStatus()

                let totalreg = Object.keys(global.db.data.users).length
                let rtotalreg = Object.values(global.db.data.users).filter(u => u.registered).length

                global.db.data.stats.menuViews = (global.db.data.stats.menuViews || 0) + 1
                let views = global.db.data.stats.menuViews

                let d = new Date()
                let locale = 'ar-MA' // ديما بالتاريخ المغربي

                let week = d.toLocaleDateString(locale, { weekday: 'long' })
                let date = d.toLocaleDateString(locale, {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                })

                const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000)
                const tipList = t(lang, 'tips')
                const tip = tipList[dayOfYear % tipList.length]

                const replace = {
                        '%': '',
                        p: _p,
                        prefix: _p,
                        uptime,
                        me: conn.user.name,
                        name,
                        week,
                        date,
                        totalreg,
                        rtotalreg,
                        totalcmd,
                        totalplugins,
                        ram,
                        status,
                        version: global.version || '1.0.0',
                        tip,
                        views,
                        readmore: readMore,
                }

                await conn.sendButton(
                        m.chat,
                        {
                                image: { url: 'https://cdn.phototourl.com/free/2026-07-26-838589b9-3c52-4c21-99fd-1e7109054e63.png' },
                                caption: text.replace(
                                        new RegExp(`%(${Object.keys(replace).join('|')})`, 'g'),
                                        (_, key) => replace[key]
                                ),
                                footer: `${global.namebot} • ${new Date().toLocaleTimeString('ar-MA')}`,
                                buttons: [
                                        {
                                                name: 'single_select',
                                                buttonParamsJson: JSON.stringify({
                                                        title: '📂 لائحة الاوامر',
                                                        sections: [{ rows }],
                                                }),
                                        },
                                        {
                                                name: 'quick_reply',
                                                buttonParamsJson: JSON.stringify({
                                                        display_text: `🆕 ${t(lang, 'whatsNew')}`,
                                                        id: _p + command + ' new',
                                                }),
                                        },
                                        {
                                                name: 'quick_reply',
                                                buttonParamsJson: JSON.stringify({
                                                        display_text: '👑 تواصل مع المالك',
                                                        id: _p + 'owner',
                                                }),
                                        },
                                ],
                        },
                        { quoted: m }
                )

                await m.react('✅')

        } catch (e) {
                console.error(e)
                await m.react('❌')
                m.reply('وقع خطأ فعرض المنيو.')
        }
}

handler.help = ['menu']
handler.tags = ['main']
handler.command = /^(menu|help|\?)$/i

export default handler

const more = String.fromCharCode(8206)
const readMore = more.repeat(4001)

function clockString(ms) {
        let d = Math.floor(ms / 86400000)
        let h = Math.floor(ms / 3600000) % 24
        let m = Math.floor(ms / 60000) % 60
        let s = Math.floor(ms / 1000) % 60
        let parts = [h, m, s].map(v => v.toString().padStart(2, '0')).join(':')
        return d > 0? `${d}يوم ${parts}` : parts
}

function ramUsage() {
        const used = process.memoryUsage().rss
        const total = os.totalmem()
        return `${(used / 1024 / 1024).toFixed(0)}MB / ${(total / 1024 / 1024 / 1024).toFixed(1)}GB`
}

function ucapan() {
        const time = moment.tz('Africa/Casablanca').format('HH') // بدلتها لتوقيت المغرب
        if (time < 4) return 'تصبح على خير'
        if (time < 10) return 'صباح الخير'
        if (time < 15) return 'نهارك زوين'
        if (time < 18) return 'العشية'
        return 'مساء الخير'
}

async function checkStatus() {
        global.db.data.stats = global.db.data.stats || {}
        const cache = global.db.data.stats.statusCache
        if (cache && Date.now() - cache.checkedAt < STATUS_CACHE_MS) {
                return cache.result
        }
        const services = [
                { name: 'واتساب', check: async () => true },
                { name: 'قاعدة البيانات', check: async () =>!!(global.db && global.db.data) },
        ]
        const results = {}
        for (const s of services) {
                try {
                        results[s.name] = (await s.check())? '🟢' : '🔴'
                } catch {
                        results[s.name] = '🔴'
                }
        }
        const resultText = Object.entries(results).map(([k, v]) => `${v} ${k}`).join(' | ')
        global.db.data.stats.statusCache = { checkedAt: Date.now(), result: resultText }
        return resultText
			}
