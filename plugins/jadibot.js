
// ======================================================
// 🇲🇦 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 | JADIBOT SYSTEM V2
// Developer: أبو دمار شامل
// ======================================================

import {
    useMultiFileAuthState,
    makeCacheableSignalKeyStore,
    fetchLatestWaWebVersion,
    Browsers,
    DisconnectReason
} from 'baileys'

import { makeWASocket } from '../lib/simple.js'

import {
    handler as mainHandler,
    participantsUpdate,
    groupsUpdate
} from '../handler.js'

import pino from 'pino'
import fs from 'node:fs'
import path from 'node:path'

const MAX_SERBOTS = 10
const BASE_DIR = path.join(process.cwd(), 'serbot')

const PIC = 'https://cdn.zass.in/9gr2ADAc8B.jpeg'

const FACEBOOK =
    'https://www.facebook.com/profile.php?id=61591783185803'

const logger = pino({ level: 'silent' })

if (!globalThis.__serbots) {
    globalThis.__serbots = new Map()
}

const registry = globalThis.__serbots

const digits = (s) =>
    String(s || '').replace(/[^0-9]/g, '')

const userJid = (phone) =>
    `${phone}@s.whatsapp.net`

// ======================================================
// 🔒 أوامر المالك الرئيسي الممنوعة على البوتات الفرعية
// ======================================================

const OWNER_ONLY_COMMANDS = [
    'sfp',
    'deleteplugin',
    'getplugin',
    'restart',
    'shutdown',
    'addowner',
    'delowner',
    'addprem',
    'delprem',
    'listbots',
    'blockserbot',
    'unblockserbot',
    'clearcache',
    'cleartmp',
    'exec',
    'eval'
]

function getMessageText(msg) {
    let m = msg?.message || {}

    while (
        m.ephemeralMessage ||
        m.viewOnceMessage ||
        m.viewOnceMessageV2 ||
        m.documentWithCaptionMessage
    ) {
        m =
            m.ephemeralMessage?.message ||
            m.viewOnceMessage?.message ||
            m.viewOnceMessageV2?.message ||
            m.documentWithCaptionMessage?.message ||
            m
    }

    return (
        m.conversation ||
        m.extendedTextMessage?.text ||
        m.imageMessage?.caption ||
        m.videoMessage?.caption ||
        m.documentMessage?.caption ||
        ''
    )
}

function isProtectedCommand(text) {
    const match = String(text || '')
        .trim()
        .match(/^[.!#/،]([^\s]+)/)

    if (!match) return false

    const command = match[1].toLowerCase()

    if (OWNER_ONLY_COMMANDS.includes(command)) {
        return true
    }

    for (const plugin of Object.values(global.plugins || {})) {
        if (!plugin) continue

        const helps = Array.isArray(plugin.help)
            ? plugin.help
            : plugin.help
                ? [plugin.help]
                : []

        const aliases = helps.map(x =>
            String(x)
                .replace(/^[.!#/،]/, '')
                .toLowerCase()
        )

        if (
            aliases.includes(command) &&
            (
                plugin.owner === true ||
                plugin.rowner === true
            )
        ) {
            return true
        }
    }

    return false
}

// ======================================================
// 🚫 المجموعات المحظورة
// ======================================================

const DEFAULT_BLOCKED_GROUPS = [
    '120363409475224628@g.us'
]

function blockedGroups() {
    try {
        const saved =
            globalThis.db?.data?.settings?.serbotBlocked

        if (Array.isArray(saved)) return saved
    } catch {}

    return DEFAULT_BLOCKED_GROUPS
}

function saveBlockedGroups(list) {
    try {
        globalThis.db.data.settings =
            globalThis.db.data.settings || {}

        globalThis.db.data.settings.serbotBlocked =
            [...new Set(list)]

        return true
    } catch {
        return false
    }
}

// ======================================================
// 📱 تحديد الرقم
// ======================================================

function senderPhone(m, text) {
    const fromText = digits(
        String(text || '').trim().split(/\s+/)[0]
    )

    if (fromText.length >= 9 && fromText.length <= 15) {
        return fromText
    }

    if (m?.sender?.endsWith('@s.whatsapp.net')) {
        return digits(m.sender)
    }

    return ''
}

// ======================================================
// 📩 إرسال رسالة للخاص عند الحاجة
// ======================================================

async function notify(mainConn, phone, text) {
    try {
        await mainConn.sendMessage(
            userJid(phone),
            { text }
        )

        return true
    } catch (e) {
        console.error('[JADIBOT PRIVATE NOTIFY]', e)
        return false
    }
}

// ======================================================
// 📢 إرسال إشعار داخل مجموعة التنصيب
// ======================================================

async function notifyInstallGroup(conn, entry, message) {
    try {
        const chat = entry.installChat

        if (!chat || !chat.endsWith('@g.us')) {
            console.error('[JADIBOT] Install group not found')
            return false
        }

        await conn.sendMessage(chat, {
            text: message
        })

        return true
    } catch (e) {
        console.error('[JADIBOT GROUP NOTIFY]', e)
        return false
    }
}

// ======================================================
// 📋 بطاقة كود التنصيب
// ======================================================

async function sendPairingCard(conn, m, code) {
    const caption = `
╭━━━⪩ 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 ⪨━━━⬣

👑 مرحبا بك في نظام تنصيب البوت

🔗 كود الربط ديالك:

${code}

📱 طريقة التنصيب في واتساب:

1️⃣ افتح WhatsApp.
2️⃣ ادخل إلى الإعدادات.
3️⃣ اختر الأجهزة المرتبطة.
4️⃣ اضغط على ربط جهاز.
5️⃣ اختر الربط برقم الهاتف.
6️⃣ انسخ الكود أعلاه.
7️⃣ أدخل الكود في واتساب.

⏳ الكود صالح لمدة قصيرة.

━━━━━━━━━━━━━━━━

👨‍💻 حساب المطور:
أبو دمار شامل

╰━━━━━━━━━━━━━━━━⬣

© 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃
`

    const buttons = [
        {
            name: 'cta_copy',
            buttonParamsJson: JSON.stringify({
                display_text: '📋 نسخ كود الربط',
                copy_code: code.replace(/-/g, '')
            })
        },
        {
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
                display_text: '👨‍💻 حساب المطور',
                url: FACEBOOK
            })
        }
    ]

    if (typeof conn.sendButton === 'function') {
        try {
            return await conn.sendButton(
                m.chat,
                {
                    image: { url: PIC },
                    caption,
                    footer: '𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 | أبو دمار شامل',
                    buttons
                },
                { quoted: m }
            )
        } catch (e) {
            console.error('[JADIBOT BUTTON]', e?.message)
        }
    }

    try {
        await conn.sendMessage(
            m.chat,
            {
                image: { url: PIC },
                caption: caption + '\n\n📋 الكود للنسخ:\n' + code
            },
            { quoted: m }
        )
    } catch {
        await m.reply(caption + '\n\n📋 ' + code)
    }
}

// ======================================================
// 🔌 إنشاء اتصال البوت الفرعي
// ======================================================

async function connectSocket(entry, mainConn) {
    const { state, saveCreds } =
        await useMultiFileAuthState(entry.dir)

    entry.registered = !!state.creds.registered

    let version

    try {
        version = (await fetchLatestWaWebVersion()).version
    } catch (e) {
        console.error('[JADIBOT VERSION]', e?.message)
    }

    const sock = makeWASocket({
        ...(version ? { version } : {}),
        logger,
        printQRInTerminal: false,

        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(
                state.keys,
                logger
            )
        },

        browser: Browsers?.ubuntu
            ? Browsers.ubuntu('Chrome')
            : ['DAMAR-MD', 'Chrome', '1.0.0'],

        markOnlineOnConnect: false,
        syncFullHistory: false
    })

    sock.isSerbot = true
    sock.serbotPhone = entry.phone

    entry.sock = sock

    // ==================================================
    // 🔒 حماية أوامر المالك
    // ==================================================

    sock.handler = async (chatUpdate) => {
        const messages = (
            chatUpdate?.messages || []
        ).filter(msg => {
            const jid = msg?.key?.remoteJid || ''

            if (blockedGroups().includes(jid)) {
                return false
            }

            return true
        })

        if (!messages.length) return

        const allowed = []

        for (const msg of messages) {
            const text = getMessageText(msg)

            if (isProtectedCommand(text)) {
                try {
                    await sock.sendMessage(
                        msg.key.remoteJid,
                        {
                            text:
                                '⛔ هاد الأمر خاص بمالك البوت الرئيسي DAMAR-MD.\n' +
                                '🤖 البوتات الفرعية ما عندهاش صلاحية استعماله.'
                        },
                        { quoted: msg }
                    )
                } catch {}

                continue
            }

            allowed.push(msg)
        }

        if (!allowed.length) return

        return mainHandler.call(
            sock,
            {
                ...chatUpdate,
                messages: allowed
            }
        )
    }

    sock.ev.on('messages.upsert', sock.handler)

    sock.ev.on('group-participants.update', upd => {
        if (blockedGroups().includes(upd?.id || '')) {
            return
        }

        return participantsUpdate.call(sock, upd)
    })

    sock.ev.on('groups.update', updates => {
        const allowed = (updates || []).filter(
            u => !blockedGroups().includes(u?.id || '')
        )

        if (!allowed.length) return

        return groupsUpdate.call(sock, allowed)
    })

    sock.ev.on('creds.update', saveCreds)

    // ==================================================
    // 🔄 الاتصال وإعادة الربط
    // ==================================================

    sock.ev.on(
        'connection.update',
        async ({ connection, lastDisconnect }) => {

            if (connection === 'open') {
                entry.wasOpen = true
                entry.attempts = 0

                if (!entry.openNotified) {
                    entry.openNotified = true

                    // الإشعار يمشي لمجموعة التنصيب فقط
                    await notifyInstallGroup(
                        mainConn,
                        entry,
                        '╭━━━⪩ 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 ⪨━━━⬣\n\n' +
                        '✅ تم ربط البوت الفرعي بنجاح!\n\n' +
                        '🤖 البوت دابا خدام.\n' +
                        '📱 رقم البوت: +' + entry.phone + '\n\n' +
                        '⏸️ للإيقاف: .stopserbot\n' +
                        '🗑️ للحذف: .delserbot\n\n' +
                        '╰━━━━━━━━━━━━━━━━⬣'
                    )
                }

                return
            }

            if (
                connection !== 'close' ||
                entry.stopping
            ) return

            const code =
                lastDisconnect?.error?.output?.statusCode

            if (
                code === DisconnectReason.loggedOut &&
                entry.wasOpen
            ) {
                registry.delete(entry.phone)

                try {
                    fs.rmSync(
                        entry.dir,
                        { recursive: true, force: true }
                    )
                } catch (e) {
                    console.error('[JADIBOT REMOVE]', e)
                }

                await notify(
                    mainConn,
                    entry.phone,
                    '⚠️ تم تسجيل خروج البوت الفرعي. استعمل .Jadibot للربط من جديد.'
                )

                return
            }

            entry.attempts++

            const cap = entry.wasOpen ? 5 : 3

            if (entry.attempts > cap) {
                registry.delete(entry.phone)

                try {
                    sock.end?.(undefined)
                } catch {}

                await notify(
                    mainConn,
                    entry.phone,
                    '❌ تعذر إعادة اتصال البوت الفرعي.\nاستعمل .Jadibot للمحاولة من جديد.'
                )

                return
            }

            entry.sock = null

            const delay = entry.wasOpen
                ? 3000 * entry.attempts
                : 2000

            entry.timer = setTimeout(async () => {
                if (
                    entry.stopping ||
                    registry.get(entry.phone) !== entry
                ) return

                try {
                    const res = await connectSocket(
                        entry,
                        mainConn
                    )

                    if (res?.code) {
                        await notify(
                            mainConn,
                            entry.phone,
                            '🔗 كود ربط جديد:\n\n' +
                            res.code +
                            '\n\nأدخله في الأجهزة المرتبطة.'
                        )
                    }
                } catch (e) {
                    console.error(
                        '[JADIBOT RECONNECT]',
                        e?.message || e
                    )
                }
            }, delay)
        }
    )

    // ==================================================
    // 🔑 طلب كود الربط
    // ==================================================

    if (!state.creds.registered) {
        await new Promise(resolve =>
            setTimeout(resolve, 2500)
        )

        let pairingCode

        try {
            pairingCode = await sock.requestPairingCode(
                entry.phone
            )
        } catch {
            await new Promise(resolve =>
                setTimeout(resolve, 3000)
            )

            pairingCode = await sock.requestPairingCode(
                entry.phone
            )
        }

        return {
            code:
                String(pairingCode || '')
                    .match(/.{1,4}/g)
                    ?.join('-') ||
                String(pairingCode || '')
        }
    }

    return {}
}

// ======================================================
// 🚀 بدء البوت الفرعي
// ======================================================

async function startSerbot(phone, mainConn, installChat) {
    const existing = registry.get(phone)

    if (existing) {
        return { status: 'already' }
    }

    if (registry.size >= MAX_SERBOTS) {
        return { status: 'full' }
    }

    if (
        !installChat ||
        !installChat.endsWith('@g.us')
    ) {
        return { status: 'invalid_group' }
    }

    const dir = path.join(BASE_DIR, phone)

    fs.mkdirSync(dir, { recursive: true })

    const entry = {
        sock: null,
        phone,
        dir,
        installChat,
        startedAt: Date.now(),
        wasOpen: false,
        stopping: false,
        attempts: 0,
        timer: null,
        openNotified: false,
        registered: false
    }

    registry.set(phone, entry)

    try {
        const res = await connectSocket(
            entry,
            mainConn
        )

        if (res?.code) {
            return {
                status: 'code',
                code: res.code
            }
        }

        return { status: 'reconnecting' }

    } catch (e) {
        registry.delete(phone)

        try {
            entry.sock?.end?.(undefined)
        } catch {}

        throw e
    }
}

// ======================================================
// ⏹️ إيقاف أو حذف البوت الفرعي
// ======================================================

async function stopSerbot(phone, options = {}) {
    const logout = options.logout === true

    const entry = registry.get(phone)

    const dir = path.join(BASE_DIR, phone)

    if (!entry && !fs.existsSync(dir)) {
        return false
    }

    if (entry) {
        entry.stopping = true

        if (entry.timer) {
            clearTimeout(entry.timer)
        }

        try {
            if (logout) {
                await entry.sock?.logout()
            }
        } catch {}

        try {
            entry.sock?.end?.(undefined)
            entry.sock?.ws?.close()
        } catch {}

        registry.delete(phone)
    }

    if (logout) {
        fs.rmSync(
            dir,
            { recursive: true, force: true }
        )
    }

    return true
}

// ======================================================
// 🎯 MAIN HANDLER
// ======================================================

const handler = async (
    m,
    {
        conn,
        text,
        command,
        isOwner,
        usedPrefix
    }
) => {

    // منع التنصيب من بوت فرعي
    if (conn?.isSerbot) {
        return m.reply(
            '⛔ التنصيب مسموح فقط من البوت الرئيسي DAMAR-MD.'
        )
    }

    // ==================================================
    // 📋 لائحة البوتات
    // ==================================================

    if (command === 'listbots') {
        if (!isOwner) {
            return m.reply('⛔ هذا الأمر خاص بالمالك.')
        }

        if (!registry.size) {
            return m.reply('📭 لا توجد بوتات فرعية متصلة.')
        }

        const list = [...registry.values()]
            .map((e, i) =>
                `${i + 1}. +${e.phone} — ${e.wasOpen ? '🟢 خدام' : '🟡 كيتربط'}`
            )
            .join('\n')

        return m.reply(
            `🤖 *البوتات الفرعية (${registry.size}/${MAX_SERBOTS})*\n\n${list}`
        )
    }

    // ==================================================
    // 🚫 حظر مجموعة
    // ==================================================

    if (
        command === 'blockserbot' ||
        command === 'unblockserbot'
    ) {
        if (!isOwner) {
            return m.reply('⛔ الأمر خاص بالمالك.')
        }

        const arg = (text || '').trim()

        const target = arg.includes('@g.us')
            ? arg
            : m.chat?.endsWith('@g.us')
                ? m.chat
                : ''

        if (!target) {
            return m.reply(
                '⚠️ استعمل الأمر داخل المجموعة أو أرسل JID.'
            )
        }

        const list = blockedGroups()

        if (command === 'blockserbot') {
            if (list.includes(target)) {
                return m.reply('ℹ️ المجموعة محظورة مسبقاً.')
            }

            if (!saveBlockedGroups([...list, target])) {
                return m.reply('❌ تعذر حفظ الإعدادات.')
            }

            return m.reply(
                '✅ تم حظر المجموعة من البوتات الفرعية.'
            )
        }

        if (!list.includes(target)) {
            return m.reply('ℹ️ المجموعة غير محظورة.')
        }

        if (!saveBlockedGroups(
            list.filter(g => g !== target)
        )) {
            return m.reply('❌ تعذر حفظ الإعدادات.')
        }

        return m.reply('✅ تم إلغاء حظر المجموعة.')
    }

    // ==================================================
    // 🗑️ حذف وإيقاف
    // ==================================================

    if (
        command === 'delserbot' ||
        command === 'stopserbot'
    ) {
        const phone = senderPhone(m, text)

        if (!phone) {
            return m.reply(
                `⚠️ استعمل:\n${usedPrefix + command} 212XXXXXXXXX`
            )
        }

        const done = await stopSerbot(
            phone,
            { logout: command === 'delserbot' }
        )

        if (!done) {
            return m.reply('📭 لا يوجد بوت فرعي بهذا الرقم.')
        }

        return m.reply(
            command === 'delserbot'
                ? '🗑️ تم حذف الجلسة نهائياً.'
                : '⏸️ تم إيقاف البوت الفرعي مع الاحتفاظ بالجلسة.'
        )
    }

    // ==================================================
    // 📱 أوامر التنصيب
    // ==================================================

    // التنصيب خاصو يكون داخل مجموعة
    if (
        !m.chat ||
        !m.chat.endsWith('@g.us')
    ) {
        return m.reply(
            '⚠️ خاصك تستعمل أمر التنصيب داخل المجموعة.\n\n' +
            '📢 رسالة نجاح الربط غادي تتصيفط لنفس المجموعة.'
        )
    }

    const phone = senderPhone(m, text)

    if (!phone) {
        return m.reply(
            '⚠️ لم أستطع معرفة رقمك.\n\n' +
            `استعمل:\n${usedPrefix + command} 212XXXXXXXXX\n\n` +
            '📱 أرسل رقم حسابك مع رمز الدولة.'
        )
    }

    if (phone === digits(conn?.user?.id)) {
        return m.reply(
            '😄 هذا رقم البوت الرئيسي. اختر رقم واتساب آخر تملكه.'
        )
    }

    await m.react?.('⏳').catch(() => {})

    try {
        // تمرير المجموعة مباشرة إلى نظام التنصيب
        const res = await startSerbot(
            phone,
            conn,
            m.chat
        )

        if (res.status === 'already') {
            return m.reply(
                'ℹ️ هذا الرقم مربوط أو قيد الاتصال بالفعل.'
            )
        }

        if (res.status === 'full') {
            return m.reply(
                `⚠️ وصلنا للحد الأقصى (${MAX_SERBOTS}) من البوتات الفرعية.`
            )
        }

        if (res.status === 'invalid_group') {
            return m.reply(
                '❌ تعذر تحديد مجموعة التنصيب.'
            )
        }

        if (res.status === 'code') {
            await sendPairingCard(
                conn,
                m,
                res.code
            )

            await m.react?.('✅').catch(() => {})

            return
        }

        await m.react?.('✅').catch(() => {})

        return m.reply(
            '♻️ الجلسة محفوظة، جاري إعادة الاتصال.'
        )

    } catch (e) {
        console.error('[DAMAR JADIBOT ERROR]', e)

        registry.delete(phone)

        await m.react?.('❌').catch(() => {})

        return m.reply(
            '❌ وقع مشكل أثناء التنصيب.\n' +
            'تأكد من اتصال الإنترنت وحاول مرة أخرى.\n\n' +
            (
                isOwner
                    ? 'التفاصيل: ' + String(e?.message || e).slice(0, 200)
                    : ''
            )
        )
    }
}

// ======================================================
// ⚙️ COMMANDS
// ======================================================

handler.help = [
    'تنصيب',
    'Code',
    'Jadibot',
    'serbot',
    'jadibot',
    'stopserbot',
    'delserbot',
    'listbots',
    'blockserbot',
    'unblockserbot'
]

handler.tags = ['main', 'owner']

handler.command =
    /^(تنصيب|code|jadibot|serbot|stopserbot|delserbot|listbots|blockserbot|unblockserbot)$/i

handler.limit = false
handler.owner = false

export default handler
