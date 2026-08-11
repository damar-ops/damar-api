let handler = async (m, { conn }) => {
    // لائحة 100 دولة: راية + اسم + اموجي مناسب
    const countries = [
    {flag: '🇲🇦', name: 'المغرب', emoji: '🏜️'},
    {flag: '🇩🇿', name: 'الجزائر', emoji: '🏜️'},
    {flag: '🇹🇳', name: 'تونس', emoji: '🏖️'},
    {flag: '🇱🇾', name: 'ليبيا', emoji: '🛢️'},
    {flag: '🇪🇬', name: 'مصر', emoji: '🔺'},
    {flag: '🇸🇦', name: 'السعودية', emoji: '🕋'},
    {flag: '🇦🇪', name: 'الامارات', emoji: '🏙️'},
    {flag: '🇶🇦', name: 'قطر', emoji: '🏆'},
    {flag: '🇰🇼', name: 'الكويت', emoji: '🛢️'},
    {flag: '🇧🇭', name: 'البحرين', emoji: '🌴'},
    {flag: '🇮🇶', name: 'العراق', emoji: '🏛️'},
    {flag: '🇸🇾', name: 'سوريا', emoji: '🕌'},
    {flag: '🇯🇴', name: 'الاردن', emoji: '🏜️'},
    {flag: '🇱🇧', name: 'لبنان', emoji: '🌲'},
    {flag: '🇵🇸', name: 'فلسطين', emoji: '🕌'},
    {flag: '🇾🇪', name: 'اليمن', emoji: '🏔️'},
    {flag: '🇲🇷', name: 'موريتانيا', emoji: '🐪'},
    {flag: '🇸🇩', name: 'السودان', emoji: '🌊'},
    {flag: '🇹🇷', name: 'تركيا', emoji: '🕌'},
    {flag: '🇮🇷', name: 'ايران', emoji: '🏛️'},
    {flag: '🇺🇸', name: 'امريكا', emoji: '🗽'},
    {flag: '🇨🇦', name: 'كندا', emoji: '🍁'},
    {flag: '🇲🇽', name: 'المكسيك', emoji: '🌮'},
    {flag: '🇧🇷', name: 'البرازيل', emoji: '⚽'},
    {flag: '🇦🇷', name: 'الارجنتين', emoji: '🥩'},
    {flag: '🇨🇱', name: 'تشيلي', emoji: '🏔️'},
    {flag: '🇨🇴', name: 'كولومبيا', emoji: '☕'},
    {flag: '🇵🇪', name: 'البيرو', emoji: '🏔️'},
    {flag: '🇻🇪', name: 'فنزويلا', emoji: '🌊'},
    {flag: '🇪🇨', name: 'الاكوادور', emoji: '🌋'},
    {flag: '🇬🇧', name: 'بريطانيا', emoji: '👑'},
    {flag: '🇫🇷', name: 'فرنسا', emoji: '🗼'},
    {flag: '🇩🇪', name: 'المانيا', emoji: '🍻'},
    {flag: '🇪🇸', name: 'اسبانيا', emoji: '💃'},
    {flag: '🇮🇹', name: 'ايطاليا', emoji: '🍕'},
    {flag: '🇵🇹', name: 'البرتغال', emoji: '⚽'},
    {flag: '🇳🇱', name: 'هولندا', emoji: '🌷'},
    {flag: '🇧🇪', name: 'بلجيكا', emoji: '🍫'},
    {flag: '🇨🇭', name: 'سويسرا', emoji: '🏔️'},
    {flag: '🇦🇹', name: 'النمسا', emoji: '🎼'},
    {flag: '🇷🇺', name: 'روسيا', emoji: '🐻'},
    {flag: '🇺🇦', name: 'اوكرانيا', emoji: '🌻'},
    {flag: '🇵🇱', name: 'بولندا', emoji: '🏰'},
    {flag: '🇷🇴', name: 'رومانيا', emoji: '🧛'},
    {flag: '🇬🇷', name: 'اليونان', emoji: '🏛️'},
    {flag: '🇭🇺', name: 'المجر', emoji: '🌶️'},
    {flag: '🇨🇿', name: 'التشيك', emoji: '🍺'},
    {flag: '🇸🇪', name: 'السويد', emoji: '❄️'},
    {flag: '🇳🇴', name: 'النرويج', emoji: '⛰️'},
    {flag: '🇩🇰', name: 'الدنمارك', emoji: '🚲'},
    {flag: '🇫🇮', name: 'فنلندا', emoji: '🎅'},
    {flag: '🇮🇸', name: 'ايسلندا', emoji: '🧊'},
    {flag: '🇯🇵', name: 'اليابان', emoji: '🍣'},
    {flag: '🇨🇳', name: 'الصين', emoji: '🐉'},
    {flag: '🇰🇷', name: 'كوريا الجنوبية', emoji: '🎤'},
    {flag: '🇮🇳', name: 'الهند', emoji: '🕌'},
    {flag: '🇵🇰', name: 'باكستان', emoji: '🏏'},
    {flag: '🇧🇩', name: 'بنغلادش', emoji: '🌊'},
    {flag: '🇮🇩', name: 'اندونيسيا', emoji: '🏝️'},
    {flag: '🇲🇾', name: 'ماليزيا', emoji: '🐒'},
    {flag: '🇸🇬', name: 'سنغافورة', emoji: '🏙️'},
    {flag: '🇹🇭', name: 'تايلاند', emoji: '🛕'},
    {flag: '🇻🇳', name: 'فيتنام', emoji: '🍜'},
    {flag: '🇵🇭', name: 'الفلبين', emoji: '🏝️'},
    {flag: '🇦🇺', name: 'استراليا', emoji: '🦘'},
    {flag: '🇳🇿', name: 'نيوزيلندا', emoji: '🥝'},
    {flag: '🇿🇦', name: 'جنوب افريقيا', emoji: '🦁'},
    {flag: '🇳🇬', name: 'نيجيريا', emoji: '🛢️'},
    {flag: '🇰🇪', name: 'كينيا', emoji: '🦒'},
    {flag: '🇪🇹', name: 'اثيوبيا', emoji: '☕'},
    {flag: '🇬🇭', name: 'غانا', emoji: '⚽'},
    {flag: '🇨🇩', name: 'الكونغو', emoji: '🌳'},
    {flag: '🇹🇿', name: 'تنزانيا', emoji: '🦁'},
    {flag: '🇺🇬', name: 'اوغندا', emoji: '🦍'},
    {flag: '🇦🇴', name: 'انغولا', emoji: '💎'},
    {flag: '🇲🇬', name: 'مدغشقر', emoji: '🦎'},
    {flag: '🇨🇲', name: 'الكاميرون', emoji: '⚽'},
    {flag: '🇧🇫', name: 'بوركينا فاسو', emoji: '🌾'},
    {flag: '🇲🇱', name: 'مالي', emoji: '🐪'},
    {flag: '🇳🇪', name: 'النيجر', emoji: '🏜️'},
    {flag: '🇹🇩', name: 'تشاد', emoji: '🏜️'},
    {flag: '🇸🇴', name: 'الصومال', emoji: '🌊'},
    {flag: '🇷🇼', name: 'رواندا', emoji: '🦍'},
    {flag: '🇧🇮', name: 'بوروندي', emoji: '☕'},
    {flag: '🇧🇼', name: 'بوتسوانا', emoji: '🦁'},
    {flag: '🇿🇲', name: 'زامبيا', emoji: '🦛'},
    {flag: '🇿🇼', name: 'زيمبابوي', emoji: '🦁'},
    {flag: '🇲🇺', name: 'موريشيوس', emoji: '🏝️'},
    {flag: '🇸🇨', name: 'سيشل', emoji: '🏝️'},
    {flag: '🇮🇱', name: 'اسرائيل', emoji: '🕍'},
    {flag: '🇦🇫', name: 'افغانستان', emoji: '🏔️'},
    {flag: '🇰🇿', name: 'كازاخستان', emoji: '🐎'},
    {flag: '🇺🇿', name: 'اوزبكستان', emoji: '🏛️'},
    {flag: '🇹🇲', name: 'تركمانستان', emoji: '🏜️'},
    {flag: '🇰🇬', name: 'قيرغيزستان', emoji: '⛰️'},
    {flag: '🇹🇯', name: 'طاجيكستان', emoji: '⛰️'},
    {flag: '🇲🇳', name: 'منغوليا', emoji: '🐎'},
    {flag: '🇳🇵', name: 'نيبال', emoji: '🏔️'},
    {flag: '🇧🇹', name: 'بوتان', emoji: '🛕'},
    {flag: '🇱🇰', name: 'سريلانكا', emoji: '🫖'}
    ]

    // الرسالة الاولى
    let msg = await conn.sendMessage(m.chat, { text: `🌍 اي بلد تختار الذهاب اليها؟\n\n${countries[0].flag} ${countries[0].name} ${countries[0].emoji}` })

    let i = 1
    const max = countries.length

    const interval = setInterval(async () => {
        if (i >= max) {
            clearInterval(interval)
            return conn.sendMessage(m.chat, { text: "✅ سالا عرض جميع الدول" }, { quoted: msg })
        }

        try {
            // تعديل نفس الرسالة
            await conn.sendMessage(m.chat, {
                text: `🌍 اي بلد تختار الذهاب اليها؟\n\n${countries[i].flag} ${countries[i].name} ${countries[i].emoji}`,
                edit: msg.key
            })
            i++
        } catch(e) {
            clearInterval(interval)
        }
    }, 3000) // كل 3 ثواني
}

handler.help = ['الغربة']
handler.tags = ['fun']
handler.command = ['الغربة']

export default handler