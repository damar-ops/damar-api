import moment from 'moment-timezone'
import os from 'os'

const NEW_DAYS = 30

// 🎵 صوت المنيو
const MENU_AUDIO = 'https://litter.catbox.moe/yn9qew.opus'

// 👤 Facebook المطور
const DEVELOPER_FACEBOOK =
    'https://www.facebook.com/profile.php?id=61591783185803'

// 👑 رقم المالك بدون + أو مسافات
const OWNER_WHATSAPP = '212633226499'

// 💬 الرسالة التي تظهر جاهزة عند الضغط على تواصل مع المالك
const OWNER_MESSAGE =
    'مرحبا بيك يا مطور بوت DAMAR-MD 👑'


// ============================================================
// Bold Unicode
// ============================================================

function toBoldUnicode(str) {

    const bold = {
        a:'𝐚', b:'𝐛', c:'𝐜', d:'𝐝', e:'𝐞', f:'𝐟',
        g:'𝐠', h:'𝐡', i:'𝐢', j:'𝐣', k:'𝐤', l:'𝐥',
        m:'𝐦', n:'𝐧', o:'𝐨', p:'𝐩', q:'𝐪', r:'𝐫',
        s:'𝐬', t:'𝐭', u:'𝐮', v:'𝐯', w:'𝐰', x:'𝐱',
        y:'𝐲', z:'𝐳',

        A:'𝐀', B:'𝐁', C:'𝐂', D:'𝐃', E:'𝐄', F:'𝐅',
        G:'𝐆', H:'𝐇', I:'𝐈', J:'𝐉', K:'𝐊', L:'𝐋',
        M:'𝐌', N:'𝐍', O:'𝐎', P:'𝐏', Q:'𝐐', R:'𝐑',
        S:'𝐒', T:'𝐓', U:'𝐔', V:'𝐕', W:'𝐖', X:'𝐗',
        Y:'𝐘', Z:'𝐙',

        0:'𝟎', 1:'𝟏', 2:'𝟐', 3:'𝟑', 4:'𝟒',
        5:'𝟓', 6:'𝟔', 7:'𝟕', 8:'𝟖', 9:'𝟗'
    }

    return String(str)
        .split('')
        .map(c => bold[c] || c)
        .join('')
}


// ============================================================
// ألوان الأقسام
// ============================================================

const categoryColors = {

    main: '🔵',
    ai: '🟣',
    downloader: '🟢',
    uploader: '🟢',
    editor: '🟠',
    sticker: '🟡',
    tools: '⚪',
    infobot: '🔵',
    group: '🟢',
    owner: '🔴'

}


// ============================================================
// الترجمة
// ============================================================

const translations = {

    ar: {

        prefix: 'العلامة',
        uptime: 'الوقت ديال الخدمة',
        ram: 'الذاكرة',
        status: 'الحالة',

        commands: 'الأوامر',
        plugins: 'البلاگنات',
        users: 'المستخدمين',
        views: 'عدد المرات تحل المنيو',

        tapMenu:
            '✦ ضغط على 📂 لائحة الأوامر لتحت باش تبدل القسم',

        notFound:
            'هاد القسم مكاينش، غادي نوريك المنيو كامل.',

        empty:
            '(خاوي)',

        whatsNew:
            'الجديد',

        newDesc:
            'أوامر تزادو فهاد',

        days:
            'يوم',

        noNew:
            '(مكاين حتى أمر جديد دابا)',

        tips: [

            '💡 نصيحة: كتب .menu <القسم> باش تدخل نيشان للقسم.',

            '💡 نصيحة: 🆕 حدا الأمر كيعني تزاد مؤخرا.',

            '💡 نصيحة: 🔥 كيعني هاد الأمر مستعمل بزاف.',

            '💡 نصيحة: 🔒 كيعني عندو عدد محدود ديال الاستعمال.',

            '💡 نصيحة: 💎 كيعني خاصو بريميوم.',

            '💡 نصيحة: كتب .menu new باش تشوف الجديد كامل.',

            '💡 نصيحة: كتب .lang ar|fr|en باش تبدل اللغة.'

        ]

    },

    en: {

        prefix: 'Prefix',
        uptime: 'Uptime',
        ram: 'RAM',
        status: 'Status',

        commands: 'Commands',
        plugins: 'Plugins',
        users: 'Users',
        views: 'Menu Views',

        tapMenu:
            '✦ Tap 📂 Menu List below to switch category',

        notFound:
            'Category not found, showing full menu.',

        empty:
            '(empty)',

        whatsNew:
            "What's New",

        newDesc:
            'Commands added in the last',

        days:
            'days',

        noNew:
            '(no new commands right now)',

        tips: [

            '💡 Tip: type .menu <category> to jump to a section.',

            '💡 Tip: 🆕 means the command was added recently.',

            '💡 Tip: 🔥 marks popular commands.',

            '💡 Tip: 🔒 means the command has a usage limit.',

            '💡 Tip: 💎 means premium.',

            '💡 Tip: type .menu new to see new commands.',

            '💡 Tip: type .lang ar|fr|en to change language.'

        ]

    },

    fr: {

        prefix: 'Préfixe',
        uptime: 'Uptime',
        ram: 'RAM',
        status: 'Statut',

        commands: 'Commandes',
        plugins: 'Plugins',
        users: 'Utilisateurs',
        views: 'Vues du menu',

        tapMenu:
            '✦ Appuyez sur 📂 Menu List ci-dessous pour changer de catégorie',

        notFound:
            'Catégorie introuvable, menu complet affiché.',

        empty:
            '(vide)',

        whatsNew:
            'Nouveautés',

        newDesc:
            'Commandes ajoutées ces derniers',

        days:
            'jours',

        noNew:
            '(aucune nouvelle commande pour le moment)',

        tips: [

            '💡 Astuce : tapez .menu <catégorie>.',

            '💡 Astuce : 🆕 signifie nouveau.',

            '💡 Astuce : 🔥 signifie populaire.',

            '💡 Astuce : 🔒 signifie limite d’utilisation.',

            '💡 Astuce : 💎 signifie premium.',

            '💡 Astuce : tapez .menu new.',

            '💡 Astuce : tapez .lang ar|fr|en.'

        ]

    }

}


// ============================================================
// Translation
// ============================================================

function t(lang, key) {

    const dict =
        translations[lang] || translations.ar

    return dict[key] !== undefined
        ? dict[key]
        : translations.ar[key]

}


// ============================================================
// Uptime
// ============================================================

function clockString(ms) {

    const d =
        Math.floor(ms / 86400000)

    const h =
        Math.floor(ms / 3600000) % 24

    const m =
        Math.floor(ms / 60000) % 60

    const s =
        Math.floor(ms / 1000) % 60

    const time = [
        h,
        m,
        s
    ]
        .map(v => String(v).padStart(2, '0'))
        .join(':')

    return d > 0
        ? `${d}يوم ${time}`
        : time
}


// ============================================================
// RAM
// ============================================================

function ramUsage() {

    const used =
        process.memoryUsage().rss

    const total =
        os.totalmem()

    return `${(
        used /
        1024 /
        1024
    ).toFixed(0)}MB / ${(
        total /
        1024 /
        1024 /
        1024
    ).toFixed(0)}GB`
}


// ============================================================
// التحية
// ============================================================

function ucapan() {

    const hour =
        Number(
            moment()
                .tz('Africa/Casablanca')
                .format('HH')
        )

    if (hour >= 5 && hour < 12)
        return 'صباح الخير ☀️'

    if (hour >= 12 && hour < 18)
        return 'مساء الخير 🌤️'

    return 'مساء النور 🌙'
}


// ============================================================
// Handler
// ============================================================

const handler = async (
    m,
    {
        conn,
        usedPrefix: _p,
        command,
        isOwner,
        args
    }
) => {

    try {

        await m.react('⏳')

        // ========================================================
        // الأقسام
        // ========================================================

        const allTags = {

            main: {
                title: 'القائمة الرئيسية',
                emoji: '🏠'
            },

            ai: {
                title: 'قائمة الذكاء الاصطناعي',
                emoji: '🤖'
            },

            downloader: {
                title: 'قائمة التحميل',
                emoji: '📥'
            },

            uploader: {
                title: 'قائمة الرفع',
                emoji: '📤'
            },

            editor: {
                title: 'قائمة التعديل',
                emoji: '🎨'
            },

            sticker: {
                title: 'قائمة الملصقات',
                emoji: '🎟️'
            },

            tools: {
                title: 'قائمة الأدوات',
                emoji: '🛠️'
            },

            infobot: {
                title: 'قائمة المعلومات',
                emoji: 'ℹ️'
            },

            group: {
                title: 'قائمة المجموعات',
                emoji: '👥'
            },

            owner: {
                title: 'قائمة المالك',
                emoji: '👑'
            }

        }


        // ========================================================
        // القسم المطلوب
        // ========================================================

        let teks =
            String(args?.[0] || '').toLowerCase()

        const showNewOnly =
            teks === 'new'

        const invalidCategory =
            teks &&
            !showNewOnly &&
            !Object.keys(allTags).includes(teks)

        if (
            showNewOnly ||
            !Object.keys(allTags).includes(teks)
        ) {
            teks = 'all'
        }

        let tags =
            teks === 'all'
                ? { ...allTags }
                : { [teks]: allTags[teks] }

        if (!isOwner)
            delete tags.owner

        if (!m.isGroup)
            delete tags.group


        // ========================================================
        // المستخدم
        // ========================================================

        global.db.data.users[m.sender] =
            global.db.data.users[m.sender] || {}

        const user =
            global.db.data.users[m.sender]

        const lang =
            ['ar', 'fr', 'en'].includes(user.lang)
                ? user.lang
                : 'ar'


        // ========================================================
        // الصوت
        // ========================================================

        try {

            await conn.sendMessage(
                m.chat,
                {
                    audio: {
                        url: MENU_AUDIO
                    },
                    mimetype: 'audio/mpeg',
                    ptt: false
                },
                {
                    quoted: m
                }
            )

        } catch (e) {

            console.log('Menu audio error:', e)

        }


        // ========================================================
        // الإحصائيات
        // ========================================================

        const now =
            Date.now()

        global.db.data.stats =
            global.db.data.stats || {}

        global.db.data.stats.pluginFirstSeen =
            global.db.data.stats.pluginFirstSeen || {}

        const firstSeenMap =
            global.db.data.stats.pluginFirstSeen

        const isFirstBoot =
            Object.keys(firstSeenMap).length === 0


        // ========================================================
        // Plugins
        // ========================================================

        const help =
            Object.entries(global.plugins || {})

                .filter(
                    ([_, p]) =>
                        p &&
                        !p.disabled
                )

                .map(
                    ([filename, p]) => {

                        if (!(filename in firstSeenMap)) {

                            firstSeenMap[filename] =
                                isFirstBoot
                                    ? now - ((NEW_DAYS + 1) * 86400000)
                                    : now

                        }

                        const isNewBool =
                            now -
                            firstSeenMap[filename] <
                            NEW_DAYS * 86400000

                        const pluginHelp =
                            Array.isArray(p.help)
                                ? p.help
                                : p.help
                                    ? [p.help]
                                    : []

                        const pluginTags =
                            Array.isArray(p.tags)
                                ? p.tags
                                : p.tags
                                    ? [p.tags]
                                    : []

                        return {

                            help: pluginHelp,

                            tags: pluginTags,

                            prefix:
                                'customPrefix' in p,

                            limit:
                                p.limit
                                    ? '🔒'
                                    : '',

                            premium:
                                p.premium
                                    ? '💎'
                                    : '',

                            owner:
                                p.owner
                                    ? '🄾'
                                    : '',

                            isNew:
                                isNewBool
                                    ? '🆕'
                                    : '',

                            isNewBool,

                            popular:
                                p.popular
                                    ? '🔥'
                                    : ''

                        }

                    }
                )


        // ========================================================
        // الإحصائيات
        // ========================================================

        const totalcmd =
            help.reduce(
                (a, p) =>
                    a + p.help.length,
                0
            )

        const totalplugins =
            help.length

        const totalNew =
            help
                .filter(p => p.isNewBool)
                .reduce(
                    (a, p) =>
                        a + p.help.length,
                    0
                )

        const countsByTag =
            Object.keys(allTags)
                .map(
                    tag =>
                        help
                            .filter(
                                p =>
                                    p.tags.includes(tag)
                            )
                            .reduce(
                                (a, p) =>
                                    a + p.help.length,
                                0
                            )
                )

        const maxCount =
            Math.max(
                ...countsByTag,
                1
            )


        // ========================================================
        // Rows ديال لائحة الأوامر
        // ========================================================

        const rows = []

        for (const tag of Object.keys(allTags)) {

            if (
                tag === 'owner' &&
                !isOwner
            )
                continue

            if (
                tag === 'group' &&
                !m.isGroup
            )
                continue

            const count =
                help
                    .filter(
                        p =>
                            p.tags.includes(tag)
                    )
                    .reduce(
                        (a, p) =>
                            a + p.help.length,
                        0
                    )

            rows.push({

                title:
                    `${allTags[tag].emoji} ${allTags[tag].title}`,

                description:
                    `${count} أمر`,

                id:
                    `${_p}${command} ${tag}`

            })

        }

        rows.push({

            title:
                `🆕 ${t(lang, 'whatsNew')}`,

            description:
                `${totalNew} أمر`,

            id:
                `${_p}${command} new`

        })


        // ========================================================
        // شكل المنيو
        // ========================================================

        const defaultMenu = {

            before: `╭━━━⪩ ${toBoldUnicode('DAMAR-MD')} ⪨━━━⬣
┃ 👋 ${ucapan()}، %name
┃ 🤖 البوت: ${toBoldUnicode('DAMAR-MD')}
┃ 👑 المطور: أبو دمار شامل
┃ 📞 المالك: +212 633-226499
┃
┃ 🔧 ${t(lang, 'prefix')}: %prefix
┃ ✨ النسخة: %version
┃ 📅 %week، %date
┃ ⏱ ${t(lang, 'uptime')}: %uptime
┃ 💾 ${t(lang, 'ram')}: %ram
┃ 📡 ${t(lang, 'status')}: %status
┃
┃ 📦 ${t(lang, 'commands')}: %totalcmd
┃ 🔌 ${t(lang, 'plugins')}: %totalplugins
┃ 👥 ${t(lang, 'users')}: %rtotalreg/%totalreg
┃ 👁 ${t(lang, 'views')}: %views
╰━━━━━━━━━━━━━━━⬣
%tip
%readmore`,

            newBefore:
                `╭━━━⪩ 🆕 ${toBoldUnicode('الجديد')} ⪨━━━⬣
┃ أوامر تزادو فهاد ${NEW_DAYS} يوم
╰━━━━━━━━━━━━━━━⬣
%readmore`,

            header:
                '\n╭─⪩ %emoji %color %category ⪨─ (%count)\n│ %bar',

            body:
                '│ %index. %cmd%flags',

            footer:
                '╰────────────⬣',

            after:
                `\n> ${t(lang, 'tapMenu')}`

        }


        // ========================================================
        // بناء النص
        // ========================================================

        let text = ''


        if (showNewOnly) {

            const sections = []

            for (const tag of Object.keys(allTags)) {

                const filtered =
                    help.filter(
                        p =>
                            p.tags.includes(tag)
                    )

                const list = []

                for (const p of filtered) {

                    for (const h of p.help) {

                        if (!p.isNewBool)
                            continue

                        const cmd =
                            p.prefix
                                ? h
                                : `${_p}${h}`

                        list.push(cmd)

                    }

                }

                list.sort(
                    (a, b) =>
                        a.localeCompare(b)
                )

                if (!list.length)
                    continue

                const items =
                    list.map(
                        (cmd, i) =>
                            defaultMenu.body

                                .replace(
                                    /%index/g,
                                    String(i + 1).padStart(2, '0')
                                )

                                .replace(
                                    /%cmd/g,
                                    cmd
                                )

                                .replace(
                                    /%flags/g,
                                    ' 🆕'
                                )
                    )

                sections.push(

                    `${defaultMenu.header

                        .replace(
                            '%emoji',
                            allTags[tag].emoji
                        )

                        .replace(
                            '%color',
                            categoryColors[tag] || '⚪'
                        )

                        .replace(
                            '%category',
                            toBoldUnicode(allTags[tag].title)
                        )

                        .replace(
                            '%count',
                            list.length
                        )

                        .replace(
                            '%bar',
                            ''
                        )}

${items.join('\n')}
${defaultMenu.footer}`

                )

            }

            text = [

                defaultMenu.newBefore,

                sections.length
                    ? sections.join('\n')
                    : t(lang, 'noNew')

            ].join('\n')

        } else {

            const parts = [

                defaultMenu.before

            ]

            for (const tag of Object.keys(tags)) {

                const filtered =
                    help.filter(
                        p =>
                            p.tags.includes(tag)
                    )

                const list = []

                for (const p of filtered) {

                    for (const h of p.help) {

                        const cmd =
                            p.prefix
                                ? h
                                : `${_p}${h}`

                        const flags = [

                            p.isNew,
                            p.popular,
                            p.owner,
                            p.premium,
                            p.limit

                        ]
                            .filter(Boolean)
                            .join(' ')

                        list.push({

                            cmd,

                            flags:
                                flags
                                    ? ` ${flags}`
                                    : ''

                        })

                    }

                }

                list.sort(
                    (a, b) =>
                        a.cmd.localeCompare(b.cmd)
                )

                const items =
                    list.map(
                        (entry, i) =>
                            defaultMenu.body

                                .replace(
                                    /%index/g,
                                    String(i + 1).padStart(2, '0')
                                )

                                .replace(
                                    /%cmd/g,
                                    entry.cmd
                                )

                                .replace(
                                    /%flags/g,
                                    entry.flags
                                )
                    )

                const count =
                    list.length

                const filled =
                    Math.max(
                        1,
                        Math.round(
                            (count / maxCount) * 10
                        )
                    )

                const bar =
                    '▰'.repeat(filled) +
                    '▱'.repeat(
                        Math.max(
                            0,
                            10 - filled
                        )
                    )

                parts.push(

                    `${defaultMenu.header

                        .replace(
                            '%emoji',
                            tags[tag].emoji
                        )

                        .replace(
                            '%color',
                            categoryColors[tag] || '⚪'
                        )

                        .replace(
                            '%category',
                            toBoldUnicode(tags[tag].title)
                        )

                        .replace(
                            '%count',
                            count
                        )

                        .replace(
                            '%bar',
                            bar
                        )}

${items.join('\n') || `│ ${t(lang, 'empty')}`}
${defaultMenu.footer}`

                )

            }

            if (invalidCategory) {

                parts.push(
                    `\n⚠️ ${t(lang, 'notFound')}`
                )

            }

            parts.push(
                defaultMenu.after
            )

            text =
                parts
                    .filter(Boolean)
                    .join('\n')

        }


        // ========================================================
        // معلومات المستخدم
        // ========================================================

        const name =
            user.registered
                ? user.name
                : (
                    conn.getName
                        ? conn.getName(m.sender)
                        : 'صديقي'
                )

        const uptime =
            clockString(
                process.uptime() * 1000
            )

        const ram =
            ramUsage()

        let status =
            'Online 🟢'

        try {

            if (typeof checkStatus === 'function') {

                status =
                    await checkStatus()

            }

        } catch {

            status =
                'Online 🟢'

        }


        const totalreg =
            Object.keys(
                global.db.data.users || {}
            ).length

        const rtotalreg =
            Object.values(
                global.db.data.users || {}
            )
                .filter(
                    u =>
                        u &&
                        u.registered
                )
                .length


        global.db.data.stats.menuViews =
            (
                global.db.data.stats.menuViews ||
                0
            ) + 1

        const views =
            global.db.data.stats.menuViews


        // ========================================================
        // التاريخ
        // ========================================================

        const d =
            new Date()

        const locale =
            'ar-MA'

        const week =
            d.toLocaleDateString(
                locale,
                {
                    weekday: 'long'
                }
            )

        const date =
            d.toLocaleDateString(
                locale,
                {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                }
            )

        const dayOfYear =
            Math.floor(
                (
                    d -
                    new Date(
                        d.getFullYear(),
                        0,
                        0
                    )
                ) / 86400000
            )

        const tipList =
            t(lang, 'tips')

        const tip =
            tipList[
                dayOfYear % tipList.length
            ]


        // ========================================================
        // استبدال البيانات
        // ========================================================

        const replace = {

            prefix: _p,

            p: _p,

            uptime,

            me:
                conn.user?.name ||
                'DAMAR-MD',

            name,

            week,

            date,

            totalreg,

            rtotalreg,

            totalcmd,

            totalplugins,

            ram,

            status,

            version:
                global.version ||
                '1.0.0',

            tip,

            views,

            readmore:
                String.fromCharCode(8206).repeat(4001)

        }


        const finalText =
            text.replace(
                /%([a-zA-Z]+)/g,
                (_, key) =>
                    replace[key] !== undefined
                        ? replace[key]
                        : `%${key}`
            )


        // ========================================================
        // 🔗 رابط التواصل مع المالك
        // ========================================================

        const ownerUrl =
            `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(OWNER_MESSAGE)}`


        // ========================================================
        // إرسال المنيو
        // ========================================================

        await conn.sendButton(

            m.chat,

            {

                image: {

                    url:
                        'https://cdn.zass.in/nkPYlKd6FQ.jpeg'

                },

                caption:
                    finalText,

                footer:
                    `DAMAR-MD • أبو دمار شامل`,

                buttons: [

                    // ==================================================
                    // 1 - لائحة الأوامر
                    // ==================================================

                    {

                        name:
                            'single_select',

                        buttonParamsJson:
                            JSON.stringify({

                                title:
                                    '📂 لائحة الأوامر',

                                sections: [

                                    {

                                        title:
                                            '🤖 DAMAR-MD',

                                        rows

                                    }

                                ]

                            })

                    },


                    // ==================================================
                    // 2 - الجديد
                    // ==================================================

                    {

                        name:
                            'quick_reply',

                        buttonParamsJson:
                            JSON.stringify({

                                display_text:
                                    `🆕 ${t(lang, 'whatsNew')}`,

                                id:
                                    `${_p}${command} new`

                            })

                    },


                    // ==================================================
                    // 3 - حساب المطور
                    // ==================================================

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


                    // ==================================================
                    // 4 - تواصل مع المالك
                    // ==================================================

                    {

                        name:
                            'cta_url',

                        buttonParamsJson:
                            JSON.stringify({

                                display_text:
                                    '👑 تواصل مع المالك',

                                url:
                                    ownerUrl

                            })

                    }

                ]

            },

            {
                quoted:
                    m
            }

        )


        await m.react('✅')


    } catch (e) {

        console.error(
            'MENU ERROR:',
            e
        )

        try {

            await m.react('❌')

        } catch {}

        try {

            await m.reply(
                `❌ وقع خطأ فعرض المنيو.\n\n${e.message || e}`
            )

        } catch {}

    }

}


// ============================================================
// معلومات الأمر
// ============================================================

handler.help = [
    'menu'
]

handler.tags = [
    'main'
]

handler.command =
    /^(menu|help|\?)$/i

export default handler