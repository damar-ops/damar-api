import moment from 'moment-timezone'

const DEVELOPER_FACEBOOK = 'https://www.facebook.com/profile.php?id=61591783185803'
const OWNER_WHATSAPP = '212633226499'
const OWNER_MESSAGE = 'مرحبا بيك يا مطور بوت DAMAR-MD 👑'
const BOT_IMAGE = 'https://cdn.zass.in/aNYvZObIsN.jpeg'

function toBoldUnicode(str) {
    const bold = { a:'𝐚',b:'𝐛',c:'𝐜',d:'𝐝',e:'𝐞',f:'𝐟',g:'𝐠',h:'𝐡',i:'𝐢',j:'𝐣',k:'𝐤',l:'𝐥',m:'𝐦',n:'𝐧',o:'𝐨',p:'𝐩',q:'𝐪',r:'𝐫',s:'𝐬',t:'𝐭',u:'𝐮',v:'𝐯',w:'𝐰',x:'𝐱',y:'𝐲',z:'𝐳',A:'𝐀',B:'𝐁',C:'𝐂',D:'𝐃',E:'𝐄',F:'𝐅',G:'𝐆',H:'𝐇',I:'𝐈',J:'𝐉',K:'𝐊',L:'𝐋',M:'𝐌',N:'𝐍',O:'𝐎',P:'𝐏',Q:'𝐐',R:'𝐑',S:'𝐒',T:'𝐓',U:'𝐔',V:'𝐕',W:'𝐖',X:'𝐗',Y:'𝐘',Z:'𝐙',0:'𝟎',1:'𝟏',2:'𝟐',3:'𝟑',4:'𝟒',5:'𝟓',6:'𝟔',7:'𝟕',8:'𝟖',9:'𝟗' }
    return String(str).split('').map(c => bold[c] || c).join('')
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    try { await m.react('⏳') } catch {}

    // تحديد الشخص
    let who
    if (m.mentionedJid && m.mentionedJid[0]) who = m.mentionedJid[0]
    else if (m.quoted) who = m.quoted.sender
    else if (args[0]) {
        let num = args[0].replace(/[^0-9]/g, '')
        if (num.length >= 7) who = num + '@s.whatsapp.net'
    } else who = m.sender

    let name = who.split('@')[0]
    try { name = await conn.getName(who) || name } catch {}

    let ppUrl = BOT_IMAGE
    try {
        let url = await conn.profilePictureUrl(who, 'image')
        if(url) ppUrl = url
    } catch {}

    let caption = `╭━━━⪩ ${toBoldUnicode('DAMAR-MD')} ⪨━━━⬣
┃ 👤 الاسم: ${name}
┃ 📞 الرقم: @${who.split('@')[0]}
┃
┃ 🤖 البوت: ${toBoldUnicode('DAMAR-MD')}
┃ 👑 المطور: ابو دمار شامل
┃ 📱 رقم المطور: +212 633-226499
╰━━━━━━━━━━━━━━━⬣
👇 اضغط على الأزرار لتحت`

    const ownerUrl = `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(OWNER_MESSAGE)}`

    await conn.sendButton(m.chat, {
        image: { url: ppUrl },
        caption: caption,
        footer: `DAMAR-MD • ابو دمار شامل`,
        mentions: [who],
        // نفس الأزرار لي فالمنيو ديالك بالضبط
        buttons: [
            {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: '📸 بروفايلي',
                    id: `${usedPrefix}profile`
                })
            },
            {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: '📜 المنيو',
                    id: `${usedPrefix}menu`
                })
            },
            {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '👤 حساب المطور',
                    url: DEVELOPER_FACEBOOK
                })
            },
            {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '👑 تواصل مع المالك',
                    url: ownerUrl
                })
            }
        ],
        contextInfo: {
            externalAdReply: {
                title: toBoldUnicode('DAMAR-MD'),
                body: name,
                thumbnailUrl: ppUrl,
                sourceUrl: DEVELOPER_FACEBOOK,
                mediaType: 1,
                renderLargerThumbnail: false
            }
        }
    }, { quoted: m })

    try { await m.react('✅') } catch {}
}

handler.help = ['profile']
handler.tags = ['tools']
handler.command = /^(profile|pp|getpp|بروفايل)$/i
export default handler