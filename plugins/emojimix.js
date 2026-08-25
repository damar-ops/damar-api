import axios from 'axios'
import sharp from 'sharp'

function toUnicode(input) {
    const result = []

    for (let i = 0; i < input.length; i++) {
        const code = input.codePointAt(i)

        if (code === undefined) continue

        result.push(code.toString(16))

        if (code > 0xffff) i++
    }

    return result.join('-')
}

async function getEmojiMix(emoji1, emoji2) {
    const unicode1 = toUnicode(emoji1)
    const unicode2 = toUnicode(emoji2)

    const urls = [
        `https://emojik.vercel.app/s/${encodeURIComponent(emoji1)}_${encodeURIComponent(emoji2)}?size=512`,
        `https://emojik.vercel.app/s/${unicode1}_${unicode2}?size=512`,
        `https://emojik.vercel.app/s/${unicode2}_${unicode1}?size=512`
    ]

    for (const url of urls) {
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 20000,
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            })

            if (response.data && response.data.length > 100) {
                return Buffer.from(response.data)
            }
        } catch (error) {
            console.log('EmojiMix API:', error.message)
        }
    }

    return null
}

async function imageToWebp(buffer) {
    return await sharp(buffer)
        .resize(512, 512, {
            fit: 'contain',
            background: {
                r: 0,
                g: 0,
                b: 0,
                alpha: 0
            }
        })
        .webp({
            quality: 90
        })
        .toBuffer()
}

const handler = async (m, { conn, text }) => {
    try {
        if (!text) {
            return m.reply(
                '❌ استعمل الأمر هكذا:\n\n' +
                '.emojimix 😒+🥺\n' +
                '.اموجي 😒+🥺\n' +
                '.دمج 😒+🥺'
            )
        }

        const parts = text
            .split('+')
            .map(x => x.trim())
            .filter(Boolean)

        if (parts.length !== 2) {
            return m.reply(
                '❌ خاصك جوج إيموجيات مفصولين بـ +\n\n' +
                'مثال:\n' +
                '.دمج 😒+🥺'
            )
        }

        const emoji1 = parts[0]
        const emoji2 = parts[1]

        const imageBuffer = await getEmojiMix(
            emoji1,
            emoji2
        )

        if (!imageBuffer) {
            return m.reply(
                '❌ ما لقيتش Emoji Mix ديال هاد الإيموجيات.'
            )
        }

        const stickerBuffer =
            await imageToWebp(imageBuffer)

        if (!stickerBuffer || stickerBuffer.length < 100) {
            throw new Error('WebP conversion failed')
        }

        await conn.sendMessage(
            m.chat,
            {
                sticker: stickerBuffer
            },
            {
                quoted: m
            }
        )

    } catch (error) {
        console.error('EMOJIMIX ERROR:', error)

        await m.reply(
            '❌ وقع خطأ أثناء صنع الـ Sticker.'
        )
    }
}

handler.help = [
    'emojimix',
    'اموجي',
    'دمج'
]

handler.tags = [
    'sticker'
]

handler.command =
    /^(emojimix|mixemoji|اموجي|دمج)$/i

handler.limit = false

export default handler