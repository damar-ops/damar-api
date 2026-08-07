// plugins/damar.js - DAMAR-MD - يخدم عند الكل
const DEVELOPER_FACEBOOK = 'https://www.facebook.com/profile.php?id=61591783185803'
const OWNER_WHATSAPP = '212633226499'
const OWNER_MESSAGE = 'مرحبا بيك يا مطور بوت DAMAR-MD 👑'
const BOT_IMAGE = 'https://cdn.zass.in/aNYvZObIsN.jpeg'

function toBoldUnicode(str) {
    const bold = { a:'𝐚',b:'𝐛',c:'𝐜',d:'𝐝',e:'𝐞',f:'𝐟',g:'𝐠',h:'𝐡',i:'𝐢',j:'𝐣',k:'𝐤',l:'𝐥',m:'𝐦',n:'𝐧',o:'𝐨',p:'𝐩',q:'𝐪',r:'𝐫',s:'𝐬',t:'𝐭',u:'𝐮',v:'𝐯',w:'𝐰',x:'𝐱',y:'𝐲',z:'𝐳',A:'𝐀',B:'𝐁',C:'𝐂',D:'𝐃',E:'𝐄',F:'𝐅',G:'𝐆',H:'𝐇',I:'𝐈',J:'𝐉',K:'𝐊',L:'𝐋',M:'𝐌',N:'𝐍',O:'𝐎',P:'𝐏',Q:'𝐐',R:'𝐑',S:'𝐒',T:'𝐓',U:'𝐔',V:'𝐕',W:'𝐖',X:'𝐗',Y:'𝐘',Z:'𝐙',0:'𝟎',1:'𝟏',2:'𝟐',3:'𝟑',4:'𝟒',5:'𝟓',6:'𝟔',7:'𝟕',8:'𝟖',9:'𝟗' }
    return String(str).split('').map(c => bold[c] || c).join('')
}

let handler = async (m, { conn, args, usedPrefix, isOwner }) => {
    try { await m.react('⏳') } catch {}
    let who
    if (m.mentionedJid && m.mentionedJid[0]) who = m.mentionedJid[0]
    else if (m.quoted) who = m.quoted.sender
    else if (args[0] && args[0].replace(/[^0-9]/g, '').length >= 7) who = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net'
    else who = m.sender

    let name = who.split('@')[0]
    try { name = await conn.getName(who) } catch {}
    let ppUrl = BOT_IMAGE
    try { let url = await conn.profilePictureUrl(who, 'image'); if(url) ppUrl = url } catch {}

    const allTags = {
        main: { title: 'القائمة الرئيسية', emoji: '🏠' }, ai: { title: 'الذكاء الاصطناعي', emoji: '🤖' },
        downloader: { title: 'التحميل', emoji: '📥' }, uploader: { title: 'الرفع', emoji: '📤' },
        editor: { title: 'التعديل', emoji: '🎨' }, sticker: { title: 'الملصقات', emoji: '🎟️' },
        tools: { title: 'الأدوات', emoji: '🛠️' }, infobot: { title: 'المعلومات', emoji: 'ℹ️' },
        group: { title: 'المجموعات', emoji: '👥' }, owner: { title: 'المالك', emoji: '👑' }
    }
    let rows = []
    for (let tag in allTags) {
        if (tag === 'owner' &&!isOwner) continue
        if (tag === 'group' &&!m.isGroup) continue
        rows.push({ title: `${allTags[tag].emoji} ${allTags[tag].title}`, description: `${allTags[tag].title}`, id: `${usedPrefix}menu ${tag}` })
    }

    let caption = `╭━━━⪩ ${toBoldUnicode('DAMAR-MD')} ⪨━━━⬣
┃ 👤 الاسم: ${name}
┃ 📞 الرقم: @${who.split('@')[0]}
┃ 🤖 البوت: ${toBoldUnicode('DAMAR-MD')}
┃ 👑 المطور: ابو دمار شامل
┃ 📱 رقم المطور: +212 633-226499
╰━━━━━━━━━━━━━━━⬣`

    const ownerUrl = `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(OWNER_MESSAGE)}`

    await conn.sendButton(m.chat, {
        image: { url: ppUrl },
        caption, footer: `DAMAR-MD • ابو دمار شامل`, mentions: [who],
        contextInfo: { externalAdReply: { title: toBoldUnicode('DAMAR-MD'), body: name, thumbnailUrl: ppUrl, sourceUrl: DEVELOPER_FACEBOOK, mediaType: 1 } },
        buttons: [
            { name: 'single_select', buttonParamsJson: JSON.stringify({ title: '📂 لائحة الأوامر', sections: [{ title: '🤖 DAMAR-MD', rows }] }) },
            { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: '👤 حساب المطور', url: DEVELOPER_FACEBOOK }) },
            { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: '👑 تواصل مع المالك', url: ownerUrl }) }
        ]
    }, { quoted: m })
    try { await m.react('✅') } catch {}
}

handler.help = ['damar']
handler.tags = ['main']
handler.command = /^(damar|دمار|Damar)$/i

// هادو هوما لي كيخليوه يخدم عند الكل
handler.owner = false
handler.mods = false
handler.premium = false
handler.group = false
handler.private = false
handler.admin = false
handler.botAdmin = false
handler.fail = null

export default handler