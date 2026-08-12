// ====================================================
// 🇲🇦 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 | AUTO STICKER - FIX PACK NAME
// 👨‍💻 Developer: ابو دمار شامل | +212 633-226499
// ====================================================

import sharp from 'sharp'
import { randomBytes } from 'crypto'

const BOT_NAME = '𝐃𝐀𝐌𝐀𝐑-𝐌𝐃'
const DEV_INFO = '+212 633-226499'
const DEV_NAME = 'ابو دمار شامل'

// دالة باش نكتبو اسم البوت والنمرة داخل الستيكر
function addExif(buffer, packname, author) {
    const json = {
        "sticker-pack-id": `damar-md-${randomBytes(3).toString('hex')}`,
        "sticker-pack-name": packname,
        "sticker-pack-publisher": author,
        "emojis": ["🤖","🇲🇦"]
    }
    let exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
    let jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8')
    let exif = Buffer.concat([exifAttr, jsonBuffer])
    exif.writeUIntLE(jsonBuffer.length, 14, 4)
    return exif
}

async function writeExifImg(imgBuffer, packname, author) {
    const exif = addExif(imgBuffer, packname, author)
    const webpWithExif = await sharp(imgBuffer)
        .withMetadata({
            exif: {
                IFD0: {
                    Copyright: exif.toString('base64')
                }
            }
        })
        .toBuffer()

    // طريقة تانية مضمونة 100% باش واتساب يقرا الاسم (دمج الـ exif يدويا)
    // كنستعملو هاد الطريقة البسيطة
    return webpWithExif
}

// 1. التحكم on / off
let handler = async (m, { conn, args, isOwner }) => {
if (!isOwner) return m.reply(`⛔ خاص بمالك البوت فقط.`)

const option = String(args[0] || '').toLowerCase()
if (!['on', 'off'].includes(option)) {
    const status = global.db.data.settings?.autosticker? '✅ شاعل' : '❌ طافي'
    return m.reply(`🇲🇦 ${BOT_NAME}\nالحالة: ${status}\n\n✅ .sticker on\n🛑 .sticker off`)
}

const enabled = option === 'on'
global.db.data.settings = global.db.data.settings || {}
global.db.data.settings.autosticker = enabled
try { if (typeof global.db.write === 'function') await global.db.write() } catch (e) {}

return m.reply(enabled ? `✅ AUTO STICKER ON` : `🛑 AUTO STICKER OFF`)
}

// 2. النظام التلقائي - صامت وبالاسم ديالك
handler.before = async (m, { conn }) => {
    if (!global.db.data.settings?.autosticker) return false
    if (!m.isGroup || m.fromMe) return false
    
    const mime = m.mimetype || m.msg?.mimetype || m.message?.imageMessage?.mimetype || ''
    if (!/image/.test(mime)) return false
    
    try {
        const media = await m.download()
        if (!media) return false

        // --- هنا حيدنا ديك الرسالة ديال كنحول الصورة ---

        // تحويل ل webp 512
        let stickerBuffer = await sharp(media)
            .rotate()
            .resize({ width: 512, height: 512, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .webp({ quality: 85 })
            .toBuffer()

        // نضيف الاسم والنمرة فمعلومات الستيكر
        // هنا فين كتبدل الاسم
        const packname = BOT_NAME // هذا لي غيبان فالعنوان الفوق
        const author = DEV_INFO  // هذا لي غيبان فبلاصة damar chamil

        const exif = addExif(stickerBuffer, packname, author)
        
        // نرسلوه
        await conn.sendMessage(m.chat, { sticker: stickerBuffer, ...{ packname, author } }, { quoted: m })
        
        // إلا ما خدمش معاك packname فوق، استعمل هاد الطريقة البديلة بالـ exif الخام
        // await conn.sendMessage(m.chat, { sticker: { url: stickerBuffer } }, { quoted: m })

        // طريقة مضمونة 100% باستعمال baileys exif
        const { default: { Image } } = await import('node-webpmux').catch(()=>({default:{}}))
        if (Image) {
            const img = new Image()
            await img.load(stickerBuffer)
            img.exif = exif
            const finalSticker = await img.save(null)
            await conn.sendMessage(m.chat, { sticker: finalSticker }, { quoted: m })
            return true
        }

    } catch (e) {
        console.error('❌ AUTO STICKER ERROR:', e)
    }
    return true
}

handler.help = ['sticker on', 'sticker off']
handler.tags = ['owner']
handler.command = /^sticker$/i
handler.owner = true
export default handler