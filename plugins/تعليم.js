let handler = async (m, { conn }) => {
    const slides = [
        ['.addmetaai', 'كيزيد Meta AI للكروب'],
        ['.addprem', 'كيزيد مستخدم للبريميوم'],
        ['.ai-image', 'كيصنع صورة بالذكاء الاصطناعي'],
        ['.ailabs', 'أدوات AI Labs'],
        ['.aimirror', 'مراية AI كتقلد الستايل ديالك'],
        ['.aimusic', 'كيصنع موسيقى بالـ AI'],
        ['.aljazeera', 'كيجيب اخبار الجزيرة'],
        ['.alldownload', 'تحميل من جميع المواقع'],
        ['.apk', 'كيقلب على تطبيقات APK'],
        ['.apkdog', 'تحميل APK من موقع apkdog'],
        ['.apkdogsearch', 'البحث ف apkdog'],
        ['.apkdownload', 'تحميل مباشر ديال APK'],
        ['.apkmaker', 'كيصنع تطبيق APK'],
        ['.appteka', 'متجر تطبيقات'],
        ['.arabicfont', 'كيبدل الخط للعربي'],
        ['.artly', 'فن AI Art'],
        ['.autoai', 'الرد التلقائي بالـ AI'],
        ['.banchat', 'كيحضر الشات'],
        ['.banuser', 'كيباندي مستخدم'],
        ['.bingimages', 'البحث على الصور فـ Bing'],
        ['.bingsearchimg', 'البحث العكسي بالصورة فـ Bing'],
        ['.brat', 'ستايل نص brat'],
        ['.broadcastptv', 'ارسال رسالة لكل الناس'],
        ['.capcut-dl', 'تحميل فيديو من CapCut'],
        ['.capcut', 'تعديل فيديو CapCut'],
        ['.capcutdlv3', 'تحميل CapCut v3'],
        ['.carbon', 'كيحول الكود لصورة'],
        ['.channel-id', 'كيعطيك ID ديال القناة'],
        ['.channel-list', 'ليستة القنوات'],
        ['.clearcache', 'كيمسح الكاش ديال البوت'],
        ['.cleartmp', 'كيمسح الملفات المؤقتة'],
        ['.cmd-del', 'كيمسح امر مخصص'],
        ['.cmd-list', 'ليستة الاوامر المخصصة'],
        ['.cmd-lock', 'كيقفل امر'],
        ['.cmd-set', 'كيصنع امر مخصص'],
        ['.code2img', 'تحويل الكود لصورة'],
        ['.colorize_v2', 'تلوين الصور بالابيض والاسود'],
        ['.couple', 'كيعطيك ثنائي عشوائي'],
        ['.creategroup', 'كيصنع كروب'],
        ['.dafont', 'البحث على الخطوط'],
        ['.dashboard', 'لوحة تحكم البوت'],
        ['.deletemsg', 'كيمسح رسالة'],
        ['.deleteplugin', 'كيمسح بلاغين'],
        ['.delprem', 'كينقص البريميوم'],
        ['.disk', 'كيوريك مساحة التخزين'],
        ['.dragonball', 'صور وشخصيات دراغون بول'],
        ['.editimage', 'تعديل الصور'],
        ['.enable', 'تفعيل ميزة فالكروب'],
        ['.f-droid', 'تحميل من F-Droid'],
        ['.facebook', 'تحميل من فيسبوك'],
        ['.fakechat', 'محادثة مزيفة'],
        ['.feature', 'ميزات البوت'],
        ['.fetch', 'جلب محتوى من رابط'],
        ['.firelogo', 'لوجو بالنار'],
        ['.flamingtext', 'نص ملتهب'],
        ['.fontsearch', 'البحث على الخطوط'],
        ['.gcbot', 'معلومات كروب البوت'],
        ['.gen', 'توليد نص'],
        ['.getgits', 'تحميل من Git'],
        ['.getplugin', 'تحميل بلاغين'],
        ['.ghosttag', 'منشن مخفي'],
        ['.gif-sticker', 'تحويل GIF لستيكر'],
        ['.githubstalk', 'تتبع حساب GitHub'],
        ['.githubtrend', 'الترند فـ GitHub'],
        ['.gock', 'لعبة'],
        ['.group-id', 'ID ديال الكروب'],
        ['.group-manage', 'ادارة الكروب'],
        ['.group-setcostum', 'اعدادات مخصصة للكروب'],
        ['.grouplist', 'ليستة الكروبات'],
        ['.hd', 'تحسين جودة الصورة'],
        ['.hidetag', 'منشن مخفي لكل الاعضاء'],
        ['.hidetagfakepoll', 'تصويت مزيف'],
        ['.horde', 'توليد صور AI'],
        ['.ig-post', 'تحميل منشور انستغرام'],
        ['.ig-profile', 'معلومات بروفايل انستا'],
        ['.ig', 'تحميل من انستغرام'],
        ['.igsearch', 'البحث فانستغرام'],
        ['.img2prompt', 'تحويل الصورة لنص'],
        ['.imgupload', 'رفع الصورة'],
        ['.joinchannel', 'الدخول لقناة'],
        ['.kive', 'بحث Kive'],
        ['.landsat', 'صور الاقمار الصناعية'],
        ['.lang', 'تغيير اللغة'],
        ['.list', 'ليستة'],
        ['.listpremium', 'ليستة البريميوم'],
        ['.lyric', 'كلمات الاغاني'],
        ['.main-afk', 'وضع AFK'],
        ['.mediafire-dl', 'تحميل من MediaFire'],
        ['.mediafire', 'بحث MediaFire'],
        ['.mediafiredl', 'تحميل MediaFire'],
        ['.menu', 'القائمة الرئيسية ديال البوت'],
        ['.msg-to-channel', 'ارسال رسالة للقناة'],
        ['.nanobanana', 'فلتر الموزة 😂'],
        ['.notoemoji', 'ايموجي Noto'],
        ['.owner-exec', 'تنفيذ امر للمالك'],
        ['.owner-exec2', 'تنفيذ امر 2'],
        ['.owner-simulate', 'محاكاة المالك'],
        ['.owner', 'معلومات المالك'],
        ['.pastebindl', 'تحميل من Pastebin'],
        ['.pin', 'تثبيت رسالة'],
        ['.ping', 'سرعة البوت'],
        ['.pint', 'صور Pinterest'],
        ['.pinterest', 'البحث فـ Pinterest'],
        ['.pixiv', 'صور Pixiv'],
        ['.qrcode', 'صناعة QR Code'],
        ['.quoted', 'نسخ الاقتباس'],
        ['.quran', 'القرآن الكريم'],
        ['.quranmp3', 'تلاوة mp3'],
        ['.register', 'التسجيل فالبوت'],
        ['.removal', 'ازالة عضو'],
        ['.restart', 'اعادة تشغيل البوت'],
        ['.revoke', 'رابط دعوة جديد'],
        ['.rvo', 'فتح view once'],
        ['.savetik', 'حفظ تيكتوك'],
        ['.savezip', 'حفظ كـ zip'],
        ['.screenshot', 'لقطة شاشة لموقع'],
        ['.sdxl', 'توليد صور SDXL'],
        ['.searchgroups', 'البحث على كروبات'],
        ['.seerah', 'السيرة النبوية'],
        ['.send-to-channel', 'ارسال للقناة'],
        ['.sendptvchannel', 'ارسال PTV للقناة'],
        ['.sfile', 'رفع ملف'],
        ['.sfp', 'اداة SFP'],
        ['.ssweb', 'سكرينشوت لموقع'],
        ['.ssweb2', 'سكرينشوت v2'],
        ['.sswebv2', 'سكرينشوت v3'],
        ['.sticker', 'تحويل صورة/فيديو لستيكر'],
        ['.tag', 'منشن للكل'],
        ['.test', 'اختبار البوت'],
        ['.texttrick', 'حيل النصوص'],
        ['.tibbi', 'استشارة طبية'],
        ['.tiktok', 'تحميل تيكتوك'],
        ['.tiktok2', 'تحميل تيكتوك v2'],
        ['.tiktokdown', 'تحميل تيكتوك بدون علامة'],
        ['.tiktokstat', 'احصائيات تيكتوك'],
        ['.toimg', 'تحويل ستيكر لصورة'],
        ['.totalfeatures', 'عدد الميزات'],
        ['.totaluser', 'عدد المستخدمين'],
        ['.ttdl', 'تحميل تيكتوك'],
        ['.ttsanime', 'تحويل النص لصوت انمي'],
        ['.twitter', 'تحميل من تويتر'],
        ['.unban', 'فك الباند'],
        ['.unbanchat', 'فك باند الشات'],
        ['.unregister', 'الغاء التسجيل'],
        ['.unsplash', 'صور Unsplash'],
        ['.url-short', 'اختصار الروابط'],
        ['.wallpaper', 'خلفيات'],
        ['.wavel', 'تحويل صوت'],
        ['.whatsgrouplink', 'رابط كروب واتساب'],
        ['.youtubesearch', 'البحث فاليوتيوب'],
        ['.ytdl', 'تحميل يوتيوب'],
        ['.ytmp3', 'تحميل يوتيوب mp3'],
        ['.ytmp4-gg', 'تحميل يوتيوب mp4'],
        ['.ytmp4', 'تحميل يوتيوب فيديو'],
        ['.ytpost', 'منشور يوتيوب'],
        ['.yts', 'بحث يوتيوب']
    ]

    let fullText = `📚 *دليل استعمال بوت DAMAR-MD* 📚\n\n`
    fullText += `هادو هما اوامر البوت. باش تستعمل اي امر دير نقطة قدامو.\n\n`
    fullText += `*مثال:*.menu |.sticker |.ytdl رابط\n`
    fullText += `─────────────────\n\n`

    slides.forEach((item, index) => {
        fullText += `${index + 1}. *${item[0]}*\n`
        fullText += `   ↳ ${item[1]}\n\n`
    })

    fullText += `─────────────────\n`
    fullText += `✅ *هادو هما اوامر خاصين بي بوت DAMAR-MD*`

    let msg = await conn.sendMessage(m.chat, { text: '📚 جاري كتابة الدليل... 0%' })

    let currentText = ''
    for (let i = 0; i < fullText.length; i++) {
        currentText += fullText[i]

        // كل 3 حروف ندير تعديل + نوري النسبة
        if (i % 3 === 0 || i === fullText.length - 1) {
            let percent = Math.floor((i / fullText.length) * 100)
            try {
                await conn.sendMessage(m.chat, {
                    text: currentText + (i < fullText.length - 1 ? `\n\n_جاري الكتابة... ${percent}%_` : ''),
                    edit: msg.key
                })
                await new Promise(resolve => setTimeout(resolve, 50)) // 50ms
            } catch(e) {}
        }
    }
    await conn.sendMessage(m.chat, { react: { text: '✅', key: msg.key }})
}

handler.help = ['تعليم']
handler.tags = ['info']
handler.command = ['تعليم', 'taalim']
export default handler