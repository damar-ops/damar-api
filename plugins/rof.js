// ====================================================
// 🇲🇦 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 | ROF MENU V4
// 👨‍💻 Developer: أبو دمار شامل
// ====================================================

const BOT_NAME = '𝐃𝐀𝐌𝐀𝐑-𝐌𝐃'
const BOT_OWNER = '+212 633-226499'

const FACEBOOK =
    'https://www.facebook.com/profile.php?id=61591783185803'

const PIC =
    'https://cdn.zass.in/TDXRM6hs2U.jpeg'

const OWNER_WHATSAPP =
    '212633226499'

const OWNER_MESSAGE =
    'مرحبا بيك يا مطور بوت DAMAR-MD 👑'


// ====================================================
// 🔤 Bold Unicode
// ====================================================

function bold(str) {

    const map = {

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
        .map(c => map[c] || c)
        .join('')
}


// ====================================================
// 🎨 أيقونات الأقسام
// ====================================================

const TAG_ICONS = {

    main: '🏠',

    ai: '🤖',

    downloader: '📥',

    uploader: '📤',

    editor: '🎨',

    sticker: '🎟️',

    tools: '🛠️',

    infobot: 'ℹ️',

    group: '👥',

    owner: '👑',

    search: '🔎',

    internet: '🌐',

    game: '🎮',

    fun: '😂',

    premium: '💎'

}


// ====================================================
// 📝 أوصاف افتراضية حسب القسم
// ====================================================

const DEFAULT_DESCRIPTIONS = {

    main:
        '⚙️ أمر من أدوات DAMAR-MD الرئيسية',

    ai:
        '🤖 أداة خاصة بالذكاء الاصطناعي',

    downloader:
        '📥 تحميل وتنزيل الفيديوهات أو الصور أو الملفات',

    uploader:
        '📤 رفع وإرسال الملفات والوسائط',

    editor:
        '🎨 تعديل وتحسين الصور والوسائط',

    sticker:
        '🎟️ إنشاء وتحويل الملصقات',

    tools:
        '🛠️ أداة مساعدة داخل البوت',

    infobot:
        'ℹ️ عرض معلومات وإحصائيات البوت',

    group:
        '👥 أداة خاصة بإدارة المجموعات',

    owner:
        '👑 أمر خاص بمالك البوت',

    search:
        '🔎 البحث عن المحتوى',

    internet:
        '🌐 أداة تعتمد على الإنترنت',

    game:
        '🎮 لعبة أو أمر ترفيهي',

    fun:
        '😂 أمر للترفيه والتسلية',

    premium:
        '💎 أمر خاص بمستخدمي Premium'

}


// ====================================================
// 🧠 وصف حسب اسم الأمر
// ====================================================

function getCommandDescription(command, tags, plugin) {

    // --------------------------------------------------
    // إذا كان Plugin فيه description
    // --------------------------------------------------

    let description =
        plugin?.description ||
        plugin?.desc ||
        plugin?.info ||
        plugin?.usage ||
        ''

    if (Array.isArray(description)) {

        description =
            description[0] || ''

    }

    description =
        String(description || '').trim()


    if (description)
        return description


    // --------------------------------------------------
    // أوصاف خاصة لبعض الأوامر
    // --------------------------------------------------

    const custom = {

        ai:
            '🤖 محادثة مع الذكاء الاصطناعي',

        'ai-image':
            '🎨 توليد الصور بالذكاء الاصطناعي',

        ailabs:
            '🤖 استعمال أدوات AI Labs',

        aimirror:
            '🪞 إنشاء أو تعديل الصور باستعمال AI Mirror',

        aimusic:
            '🎵 إنشاء أو معالجة الموسيقى بالذكاء الاصطناعي',

        addprem:
            '💎 إضافة مستخدم إلى قائمة Premium',

        delprem:
            '💎 حذف مستخدم من قائمة Premium',

        add:
            '👤 إضافة عضو أو مستخدم',

        afk:
            '💤 تفعيل وضع عدم التواجد',

        antilink:
            '🔗 حماية المجموعة من الروابط',

        apk:
            '📱 البحث عن تطبيقات Android',

        apkdog:
            '📱 البحث عن تطبيقات APK',

        apkdownload:
            '📥 تحميل تطبيق APK',

        appleMusic:
            '🎵 البحث عن الموسيقى في Apple Music',

        arabicfont:
            '🔤 تحويل النص إلى خطوط عربية',

        autoai:
            '🤖 تشغيل الذكاء الاصطناعي التلقائي',

        banchat:
            '🚫 حظر محادثة',

        banuser:
            '🚫 حظر مستخدم',

        bingimages:
            '🖼️ البحث عن الصور في Bing',

        bingsearchimg:
            '🖼️ البحث عن الصور',

        brat:
            '📝 إنشاء صورة Brat من النص',

        capcut:
            '🎬 تحميل محتوى CapCut',

        'capcut-dl':
            '📥 تحميل فيديو CapCut',

        carbon:
            '💻 تحويل الكود إلى صورة Carbon',

        'channel-id':
            '📢 معرفة معرف القناة',

        'channel-list':
            '📢 عرض قائمة القنوات',

        clearcache:
            '🧹 مسح Cache البوت',

        cleartmp:
            '🧹 حذف الملفات المؤقتة',

        code2img:
            '💻 تحويل الكود إلى صورة',

        couple:
            '💑 إنشاء صورة Couple',

        creategroup:
            '👥 إنشاء مجموعة WhatsApp',

        dashboard:
            '📊 عرض لوحة تحكم البوت',

        deletemsg:
            '🗑️ حذف رسالة',

        deleteplugin:
            '🧩 حذف Plugin',

        disk:
            '💾 عرض معلومات مساحة التخزين',

        editimage:
            '🎨 تعديل صورة',

        fakechat:
            '💬 إنشاء Fake Chat',

        fb:
            '📘 تحميل فيديوهات Facebook',

        fetch:
            '🌐 جلب محتوى من رابط',

        flamingtext:
            '🔥 إنشاء شعار Flaming Text',

        fontsearch:
            '🔤 البحث عن الخطوط',

        gen:
            '🤖 توليد محتوى بالذكاء الاصطناعي',

        getplugin:
            '🧩 جلب Plugin',

        githubstalk:
            '🐙 عرض معلومات حساب GitHub',

        githubtrend:
            '🔥 عرض GitHub Trending',

        'group-id':
            '👥 معرفة معرف المجموعة',

        grouplist:
            '👥 عرض قائمة المجموعات',

        hidetag:
            '📢 منشن جميع أعضاء المجموعة',

        ig:
            '📸 تحميل محتوى Instagram',

        'ig-post':
            '📸 تحميل منشور Instagram',

        'ig-profile':
            '👤 عرض معلومات حساب Instagram',

        igsearch:
            '🔎 البحث في Instagram',

        img2prompt:
            '🤖 استخراج وصف من الصورة',

        imgupload:
            '📤 رفع صورة',

        joinchannel:
            '📢 الانضمام إلى قناة WhatsApp',

        kive:
            '🎨 توليد الصور باستعمال Kive AI',

        lang:
            '🌐 تغيير لغة البوت',

        listpremium:
            '💎 عرض مستخدمي Premium',

        lyric:
            '🎵 البحث عن كلمات الأغاني',

        mediafire:
            '📥 تحميل ملفات MediaFire',

        mediafiredl:
            '📥 تحميل ملف MediaFire',

        menu:
            '📋 عرض قائمة أوامر البوت',

        nano:
            '🤖 استعمال Nano AI',

        nanobanana:
            '🍌 توليد أو تعديل الصور بالذكاء الاصطناعي',

        notoemoji:
            '😀 إنشاء Emoji',

        owner:
            '👑 عرض معلومات المالك',

        ping:
            '🏓 فحص سرعة استجابة البوت',

        pinterest:
            '📌 البحث والتحميل من Pinterest',

        profile:
            '👤 عرض الملف الشخصي',

        qrcode:
            '📱 إنشاء QR Code',

        quran:
            '📖 البحث في القرآن الكريم',

        quranmp3:
            '🎧 تشغيل القرآن الكريم صوتياً',

        register:
            '📝 تسجيل المستخدم',

        restart:
            '🔄 إعادة تشغيل البوت',

        screenshot:
            '📸 أخذ Screenshot من موقع',

        song:
            '🎵 البحث وتحميل الأغاني',

        sticker:
            '🎟️ تحويل الصور والفيديو إلى Sticker',

        tag:
            '📢 منشن عضو أو أعضاء المجموعة',

        tiktok:
            '🎵 تحميل فيديو TikTok',

        tiktok2:
            '📥 تحميل فيديو TikTok',

        tiktokdown:
            '📥 تنزيل فيديو TikTok',

        twitter:
            '🐦 تحميل محتوى Twitter / X',

        unsplash:
            '🖼️ البحث عن الصور في Unsplash',

        wallpaper:
            '🖼️ البحث عن خلفيات',

        welcome:
            '👋 إعداد رسالة الترحيب',

        youtubesearch:
            '🔎 البحث عن فيديوهات YouTube',

        ytdl:
            '📥 تحميل فيديو من YouTube',

        ytmp3:
            '🎵 تحميل صوت من YouTube',

        ytmp4:
            '🎬 تحميل فيديو من YouTube',

        yts:
            '🔎 البحث في YouTube'

    }


    const key =
        String(command).toLowerCase()


    if (custom[key])
        return custom[key]


    // --------------------------------------------------
    // الوصف حسب Tags
    // --------------------------------------------------

    for (const tag of tags) {

        if (DEFAULT_DESCRIPTIONS[tag])
            return DEFAULT_DESCRIPTIONS[tag]

    }


    // --------------------------------------------------
    // وصف أخير
    // --------------------------------------------------

    return '⚙️ أمر من أدوات بوت DAMAR-MD'

}


// ====================================================
// 🎨 اختيار الأيقونة
// ====================================================

function getCommandIcon(tags, command) {

    const key =
        String(command).toLowerCase()


    // أوامر خاصة

    if (
        key.includes('ai') ||
        key.includes('nano') ||
        key.includes('kive') ||
        key.includes('gen')
    )
        return '🤖'


    if (
        key.includes('tiktok') ||
        key.includes('youtube') ||
        key.includes('yt')
    )
        return '📥'


    if (
        key.includes('ig') ||
        key.includes('instagram')
    )
        return '📸'


    if (
        key.includes('fb') ||
        key.includes('facebook')
    )
        return '📘'


    for (const tag of tags) {

        if (TAG_ICONS[tag])
            return TAG_ICONS[tag]

    }


    return '⚙️'

}


// ====================================================
// 🚀 Handler
// ====================================================

const handler = async (
    m,
    {
        conn,
        usedPrefix
    }
) => {

    try {

        // ==================================================
        // ⏳ Reaction
        // ==================================================

        await m.react('⏳')


        // ==================================================
        // 🔗 رابط المالك
        // ==================================================

        const ownerUrl =
            `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(OWNER_MESSAGE)}`


        // ==================================================
        // 📦 Plugins
        // ==================================================

        const plugins =
            Object.entries(
                global.plugins || {}
            )
            .filter(
                ([_, plugin]) =>
                    plugin &&
                    !plugin.disabled
            )


        // ==================================================
        // 📋 الأوامر
        // ==================================================

        const commands = []


        for (
            const [filename, plugin]
            of plugins
        ) {

            if (!plugin)
                continue


            let helps =
                Array.isArray(plugin.help)
                    ? plugin.help
                    : plugin.help
                        ? [plugin.help]
                        : []


            let tags =
                Array.isArray(plugin.tags)
                    ? plugin.tags
                    : plugin.tags
                        ? [plugin.tags]
                        : []


            // ------------------------------------------------
            // إذا ماكانش help
            // ------------------------------------------------

            if (!helps.length)
                continue


            for (const help of helps) {

                if (!help)
                    continue


                let command =
                    String(help)
                        .replace(/^\./, '')
                        .trim()


                if (!command)
                    continue


                // ------------------------------------------------
                // منع التكرار
                // ------------------------------------------------

                const exists =
                    commands.some(
                        item =>
                            item.command.toLowerCase() ===
                            command.toLowerCase()
                    )


                if (exists)
                    continue


                // ------------------------------------------------
                // Icon
                // ------------------------------------------------

                const icon =
                    getCommandIcon(
                        tags,
                        command
                    )


                // ------------------------------------------------
                // Description
                // ------------------------------------------------

                const description =
                    getCommandDescription(
                        command,
                        tags,
                        plugin
                    )


                commands.push({

                    command,

                    id:
                        `${usedPrefix}${command}`,

                    icon,

                    description,

                    tags,

                    filename

                })

            }

        }


        // ==================================================
        // 🔤 ترتيب
        // ==================================================

        commands.sort(
            (a, b) =>
                a.command.localeCompare(
                    b.command
                )
        )


        // ==================================================
        // ❌ ماكايناش أوامر
        // ==================================================

        if (!commands.length) {

            await m.react('❌')

            return await m.reply(
                `❌ *${BOT_NAME}*\n\nماقدرتش نلقى الأوامر فـ global.plugins.`
            )

        }


        // ==================================================
        // 📂 Rows
        // ==================================================

        const rows =
            commands.map(
                (item, index) => ({

                    title:
                        `${String(index + 1).padStart(2, '0')} • ${item.icon} ${item.command}`,

                    description:
                        item.description,

                    id:
                        item.id

                })
            )


        // ==================================================
        // 📝 Caption
        // ==================================================

        const caption = `

╭━━━⪩ ${bold('DAMAR-MD')} ⪨━━━⬣
┃ 👋 مرحبا بك فـ ${bold('DAMAR-MD')}
┃
┃ 👑 المطور: أبو دمار شامل
┃ 📞 المالك: +212 633-226499
┃
┃ 📦 عدد الأوامر: ${commands.length}
┃
┃ 📂 ضغط على لائحة الأوامر
┃ باش تشوف الأوامر والوصف ديال كل واحد.
╰━━━━━━━━━━━━━━━⬣

✨ اختار الأمر اللي بغيتي من اللائحة 👇
`


        // ==================================================
        // 📤 إرسال
        // ==================================================

        await conn.sendButton(

            m.chat,

            {

                image: {
                    url: PIC
                },

                caption,

                footer:
                    `© ${BOT_NAME} | أبو دمار شامل`,

                buttons: [

                    // ==========================================
                    // 📂 لائحة الأوامر
                    // ==========================================

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
                                            `🤖 ${BOT_NAME} • ${commands.length} أمر`,

                                        rows

                                    }

                                ]

                            })

                    },


                    // ==========================================
                    // 📘 Facebook
                    // ==========================================

                    {

                        name:
                            'cta_url',

                        buttonParamsJson:
                            JSON.stringify({

                                display_text:
                                    '📘 Facebook المطور',

                                url:
                                    FACEBOOK

                            })

                    },


                    // ==========================================
                    // 👑 تواصل
                    // ==========================================

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


        // ==================================================
        // ✅ Done
        // ==================================================

        await m.react('✅')


    } catch (e) {

        console.error(
            'ROF MENU ERROR:',
            e
        )


        try {

            await m.react('❌')

        } catch {}


        try {

            await m.reply(
                `❌ *${BOT_NAME}*\n\nوقع مشكل فإظهار المنيو.\n\n📌 السبب:\n${e.message || e}`
            )

        } catch {}

    }

}


// ====================================================
// ⚙️ Command Settings
// ====================================================

handler.help = [
    'rof'
]

handler.tags = [
    'main'
]

handler.command =
    /^rof$/i

handler.owner =
    false


export default handler