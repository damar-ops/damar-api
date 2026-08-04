import { smsg } from './lib/simple.js'
import { format } from 'util'
import { fileURLToPath } from 'url'
import path from 'path'
import { unwatchFile, watchFile } from 'fs'
import chalk from 'chalk'

/**
 * ═══════════════════════════════════════════════
 * DAMAR-MD HANDLER
 * Auto Read + Sub Bot Compatible
 * ═══════════════════════════════════════════════
 */

export async function handler(chatUpdate) {
    if (!chatUpdate) return

    const sock = this
    let m = null
    let oldConn = global.conn

    try {

        // ═══════════════════════════════════════
        // PUSH MESSAGE
        // ═══════════════════════════════════════

        if (
            chatUpdate.messages &&
            typeof sock.pushMessage === 'function'
        ) {
            try {
                sock.pushMessage(
                    chatUpdate.messages
                ).catch(() => {})
            } catch {}
        }

        // ═══════════════════════════════════════
        // GET MESSAGE
        // ═══════════════════════════════════════

        m =
            chatUpdate.messages?.[
                chatUpdate.messages.length - 1
            ]

        if (!m) return

        // ═══════════════════════════════════════
        // DATABASE
        // ═══════════════════════════════════════

        if (!global.db?.data) {
            if (
                typeof global.loadDatabase ===
                'function'
            ) {
                await global.loadDatabase()
            }
        }

        if (!global.db?.data) {
            console.error(
                '❌ DATABASE NOT READY'
            )
            return
        }

        // ═══════════════════════════════════════
        // SERIALIZE MESSAGE
        // ═══════════════════════════════════════

        m =
            smsg(sock, m) ||
            m

        if (!m) return

        m.exp = 0
        m.limit = false

        // ═══════════════════════════════════════
        // IGNORE BROADCAST / NEWSLETTER
        // ═══════════════════════════════════════

        if (
            m.sender?.endsWith('@broadcast') ||
            m.sender?.endsWith('@newsletter')
        ) {
            return
        }

        // ═══════════════════════════════════════
        // AUTO READ
        // ═══════════════════════════════════════

        try {

            if (
                m.key &&
                typeof sock.readMessages ===
                'function'
            ) {

                await sock.readMessages([
                    m.key
                ])

            }

        } catch (error) {

            console.error(
                '⚠️ AUTO READ ERROR:',
                error?.message || error
            )

        }

        // ═══════════════════════════════════════
        // GLOBAL CONNECTION
        // ═══════════════════════════════════════

        oldConn = global.conn

        global.conn = sock

        try {

            // ═══════════════════════════════════
            // DATABASE PLUGIN
            // ═══════════════════════════════════

            try {

                const database =
                    await import(
                        `./lib/database.js?v=${Date.now()}`
                    )

                if (
                    typeof database.default ===
                    'function'
                ) {

                    await database.default(
                        m,
                        sock
                    )

                }

            } catch (error) {

                console.error(
                    '❌ DATABASE PLUGIN ERROR:',
                    error
                )

            }

            // ═══════════════════════════════════
            // MESSAGE TEXT
            // ═══════════════════════════════════

            if (
                typeof m.text !==
                'string'
            ) {
                m.text = ''
            }

            // ═══════════════════════════════════
            // SETTINGS
            // ═══════════════════════════════════

            global.db.data.settings =
                global.db.data.settings ||
                {}

            const rawBotJid =
                sock.user?.jid ||
                sock.user?.id ||
                ''

            let botJid =
                rawBotJid

            try {

                if (
                    typeof sock.decodeJid ===
                    'function'
                ) {

                    botJid =
                        sock.decodeJid(
                            rawBotJid
                        )

                }

            } catch {

                botJid =
                    rawBotJid

            }

            if (
                botJid &&
                !global.db.data.settings[
                    botJid
                ]
            ) {

                global.db.data.settings[
                    botJid
                ] = {

                    public: true,

                    autoread: true,

                    anticall: true,

                    gconly: false

                }

            }

            const settings =
                global.db.data.settings[
                    botJid
                ] ||
                {

                    public: true,

                    autoread: true,

                    anticall: true,

                    gconly: false

                }

            // ═══════════════════════════════════
            // FORCE AUTO READ
            // ═══════════════════════════════════

            settings.autoread = true

            // ═══════════════════════════════════
            // OWNER
            // ═══════════════════════════════════

            global.owner =
                Array.isArray(
                    global.owner
                )
                    ? global.owner
                    : []

            const ownerNumbers =
                global.owner
                    .map(
                        item =>
                            Array.isArray(item)
                                ? String(
                                    item[0] || ''
                                )
                                : ''
                    )
                    .map(
                        number =>
                            number.replace(
                                /[^0-9]/g,
                                ''
                            )
                    )

            const senderNumber =
                String(
                    m.sender || ''
                )
                    .split('@')[0]
                    .replace(
                        /[^0-9]/g,
                        ''
                    )

            const botNumber =
                String(
                    botJid || ''
                )
                    .split('@')[0]
                    .replace(
                        /[^0-9]/g,
                        ''
                    )

            const isROwner =
                ownerNumbers.includes(
                    senderNumber
                ) ||
                (
                    botNumber &&
                    senderNumber ===
                    botNumber
                )

            const isOwner =
                isROwner ||
                m.fromMe === true

            // ═══════════════════════════════════
            // USER DATABASE
            // ═══════════════════════════════════

            global.db.data.users =
                global.db.data.users ||
                {}

            let _user =
                global.db.data.users[
                    m.sender
                ]

            if (!_user) {

                global.db.data.users[
                    m.sender
                ] = {

                    exp: 0,

                    limit: 10,

                    level: 0,

                    registered: false,

                    premiumTime: 0

                }

                _user =
                    global.db.data.users[
                        m.sender
                    ]

            }

            const isPrems =
                isROwner ||
                Number(
                    _user.premiumTime ||
                    0
                ) > 0

            // ═══════════════════════════════════
            // PUBLIC / GROUP
            // ═══════════════════════════════════

            if (
                settings.gconly &&
                !m.isGroup &&
                !isOwner &&
                !isPrems
            ) {
                return
            }

            if (
                !settings.public &&
                !isOwner &&
                !m.fromMe
            ) {
                return
            }

            // ═══════════════════════════════════
            // BAILEYS MESSAGE
            // ═══════════════════════════════════

            if (m.isBaileys) {
                return
            }

            // ═══════════════════════════════════
            // EXP
            // ═══════════════════════════════════

            m.exp +=
                Math.ceil(
                    Math.random() * 10
                )

            let usedPrefix

            // ═══════════════════════════════════
            // GROUP METADATA
            // ═══════════════════════════════════

            let groupMetadata = {}

            if (m.isGroup) {

                groupMetadata =
                    (
                        sock.chats?.[
                            m.chat
                        ] || {}
                    ).metadata ||
                    await sock
                        .groupMetadata(
                            m.chat
                        )
                        .catch(
                            () => null
                        ) ||
                    {}

            }

            const participants =
                m.isGroup
                    ? (
                        groupMetadata.participants ||
                        []
                    )
                    : []

            // ═══════════════════════════════════
            // GET JID
            // ═══════════════════════════════════

            const getJid = user => {

                if (!user) {
                    return ''
                }

                const jid =
                    user.id ||
                    user.phoneNumber ||
                    ''

                if (
                    typeof sock.getJid ===
                    'function'
                ) {

                    try {

                        return sock.getJid(
                            jid
                        )

                    } catch {}

                }

                return jid
            }

            // ═══════════════════════════════════
            // GROUP USER
            // ═══════════════════════════════════

            const user =
                m.isGroup
                    ? (
                        participants.find(
                            u =>
                                getJid(u) ===
                                m.sender
                        ) ||
                        {}
                    )
                    : {}

            // ═══════════════════════════════════
            // BOT USER
            // ═══════════════════════════════════

            const bot =
                m.isGroup
                    ? (
                        participants.find(
                            u =>
                                getJid(u) ===
                                botJid
                        ) ||
                        {}
                    )
                    : {}

            // ═══════════════════════════════════
            // ADMIN
            // ═══════════════════════════════════

            const isRAdmin =
                user?.admin ===
                'superadmin'

            const isAdmin =
                isRAdmin ||
                user?.admin ===
                'admin'

            const isBotAdmin =
                !!bot?.admin

            // ═══════════════════════════════════
            // PLUGINS DIRECTORY
            // ═══════════════════════════════════

            const ___dirname =
                path.join(
                    path.dirname(
                        fileURLToPath(
                            import.meta.url
                        )
                    ),
                    './plugins'
                )

            // ═══════════════════════════════════
            // PLUGINS
            // ═══════════════════════════════════

            for (
                let name in global.plugins
            ) {

                const plugin =
                    global.plugins[name]

                if (!plugin) {
                    continue
                }

                if (
                    plugin.disabled
                ) {
                    continue
                }

                const __filename =
                    path.join(
                        ___dirname,
                        name
                    )

                // ═══════════════════════════════
                // PLUGIN ALL
                // ═══════════════════════════════

                if (
                    typeof plugin.all ===
                    'function'
                ) {

                    try {

                        await plugin.all.call(
                            sock,
                            m,
                            {

                                chatUpdate,

                                __dirname:
                                    ___dirname,

                                __filename

                            }
                        )

                    } catch (error) {

                        console.error(
                            `PLUGIN ALL ERROR ${name}:`,
                            error
                        )

                    }

                }

                // ═══════════════════════════════
                // ADMIN TAG
                // ═══════════════════════════════

                if (
                    plugin.tags &&
                    plugin.tags.includes(
                        'admin'
                    )
                ) {
                    continue
                }

                // ═══════════════════════════════
                // PREFIX
                // ═══════════════════════════════

                const str2Regex =
                    str =>
                        String(
                            str
                        ).replace(
                            /[|\\{}()[\]^$+*?.]/g,
                            '\\$&'
                        )

                const _prefix =
                    plugin.customPrefix ||
                    sock.prefix ||
                    global.prefix

                let match

                if (
                    _prefix instanceof RegExp
                ) {

                    match = [

                        [
                            _prefix.exec(
                                m.text
                            ),

                            _prefix

                        ]

                    ]

                } else if (
                    Array.isArray(
                        _prefix
                    )
                ) {

                    match =
                        _prefix
                            .map(
                                p => {

                                    const re =
                                        p instanceof RegExp
                                            ? p
                                            : new RegExp(
                                                str2Regex(
                                                    p
                                                )
                                            )

                                    return [

                                        re.exec(
                                            m.text
                                        ),

                                        re

                                    ]

                                }
                            )
                            .find(
                                p =>
                                    p[0]
                            )

                } else if (
                    typeof _prefix ===
                    'string'
                ) {

                    const re =
                        new RegExp(
                            str2Regex(
                                _prefix
                            )
                        )

                    match = [

                        [
                            re.exec(
                                m.text
                            ),

                            re

                        ]

                    ]

                } else {

                    match = [

                        [
                            [],
                            new RegExp()
                        ]

                    ]

                }

                // ═══════════════════════════════
                // BEFORE
                // ═══════════════════════════════

                if (
                    typeof plugin.before ===
                    'function'
                ) {

                    try {

                        const stop =
                            await plugin.before.call(
                                sock,
                                m,
                                {

                                    match,

                                    conn: sock,

                                    participants,

                                    groupMetadata,

                                    user,

                                    bot,

                                    isROwner,

                                    isOwner,

                                    isRAdmin,

                                    isAdmin,

                                    isBotAdmin,

                                    isPrems,

                                    chatUpdate,

                                    __dirname:
                                        ___dirname,

                                    __filename

                                }
                            )

                        if (stop) {
                            continue
                        }

                    } catch (error) {

                        console.error(
                            `PLUGIN BEFORE ERROR ${name}:`,
                            error
                        )

                        continue
                    }

                }

                if (
                    typeof plugin !==
                    'function'
                ) {
                    continue
                }

                // ═══════════════════════════════
                // COMMAND
                // ═══════════════════════════════

                if (
                    !match ||
                    !match[0] ||
                    !match[0][0]
                ) {
                    continue
                }

                usedPrefix =
                    match[0][0]

                const noPrefix =
                    m.text.replace(
                        usedPrefix,
                        ''
                    )

                let [
                    command,
                    ...args
                ] =
                    noPrefix
                        .trim()
                        .split(/\s+/)
                        .filter(Boolean)

                args =
                    args || []

                const _args =
                    noPrefix
                        .trim()
                        .split(/\s+/)
                        .slice(1)

                const text =
                    _args.join(' ')

                command =
                    String(
                        command || ''
                    ).toLowerCase()

                const fail =
                    plugin.fail ||
                    global.dfail

                let isAccept = false

                // ═══════════════════════════════
                // COMMAND REGEX
                // ═══════════════════════════════

                if (
                    plugin.command
                    instanceof RegExp
                ) {

                    isAccept =
                        plugin.command.test(
                            command
                        )

                } else if (
                    Array.isArray(
                        plugin.command
                    )
                ) {

                    isAccept =
                        plugin.command.some(
                            cmd => {

                                if (
                                    cmd instanceof
                                    RegExp
                                ) {

                                    return cmd.test(
                                        command
                                    )

                                }

                                return (
                                    cmd ===
                                    command
                                )

                            }
                        )

                } else if (
                    typeof plugin.command ===
                    'string'
                ) {

                    isAccept =
                        plugin.command ===
                        command

                }

                if (!isAccept) {
                    continue
                }

                m.plugin =
                    name

                // ═══════════════════════════════
                // CHATS
                // ═══════════════════════════════

                global.db.data.chats =
                    global.db.data.chats ||
                    {}

                if (
                    !isOwner &&
                    (
                        m.chat in
                        global.db.data.chats ||
                        m.sender in
                        global.db.data.users
                    )
                ) {

                    const chat =
                        global.db.data.chats[
                            m.chat
                        ]

                    if (
                        name !==
                        'tools-delete.js' &&
                        chat?.isBanned
                    ) {
                        return
                    }

                }

                // ═══════════════════════════════
                // ROW OWNER
                // ═══════════════════════════════

                if (
                    plugin.rowner &&
                    plugin.owner &&
                    !(
                        isROwner ||
                        isOwner
                    )
                ) {

                    fail?.(
                        'owner',
                        m,
                        sock
                    )

                    continue
                }

                if (
                    plugin.rowner &&
                    !isROwner
                ) {

                    fail?.(
                        'rowner',
                        m,
                        sock
                    )

                    continue
                }

                if (
                    plugin.owner &&
                    !isOwner
                ) {

                    fail?.(
                        'owner',
                        m,
                        sock
                    )

                    continue
                }

                if (
                    plugin.premium &&
                    !isPrems
                ) {

                    fail?.(
                        'premium',
                        m,
                        sock
                    )

                    continue
                }

                if (
                    plugin.group &&
                    !m.isGroup
                ) {

                    fail?.(
                        'group',
                        m,
                        sock
                    )

                    continue
                }

                if (
                    plugin.botAdmin &&
                    !isBotAdmin
                ) {

                    fail?.(
                        'botAdmin',
                        m,
                        sock
                    )

                    continue
                }

                if (
                    plugin.admin &&
                    !isAdmin
                ) {

                    fail?.(
                        'admin',
                        m,
                        sock
                    )

                    continue
                }

                if (
                    plugin.private &&
                    m.isGroup
                ) {

                    fail?.(
                        'private',
                        m,
                        sock
                    )

                    continue
                }

                if (
                    plugin.register === true &&
                    _user.registered === false
                ) {

                    fail?.(
                        'unreg',
                        m,
                        sock
                    )

                    continue
                }

                // ═══════════════════════════════
                // COMMAND XP
                // ═══════════════════════════════

                m.isCommand =
                    true

                const xp =
                    'exp' in plugin
                        ? parseInt(
                            plugin.exp
                        )
                        : 17

                if (
                    xp > 200
                ) {

                    await m.reply(
                        'Ngecit -_-'
                    )

                } else {

                    m.exp +=
                        xp

                }

                // ═══════════════════════════════
                // LIMIT
                // ═══════════════════════════════

                if (
                    !isPrems &&
                    plugin.limit &&
                    Number(
                        _user.limit || 0
                    ) <
                    Number(
                        plugin.limit
                    )
                ) {

                    await sock.reply(
                        m.chat,
                        '[❗] Your limit has run out.',
                        m
                    )

                    continue
                }

                // ═══════════════════════════════
                // LEVEL
                // ═══════════════════════════════

                if (
                    plugin.level &&
                    Number(
                        plugin.level
                    ) >
                    Number(
                        _user.level || 0
                    )
                ) {

                    await sock.reply(
                        m.chat,
                        `[💬] Level required ${plugin.level}\nYour level: ${_user.level || 0}`,
                        m
                    )

                    continue
                }

                // ═══════════════════════════════
                // EXTRA
                // ═══════════════════════════════

                const extra = {

                    match,

                    usedPrefix,

                    noPrefix,

                    _args,

                    args,

                    command,

                    text,

                    conn: sock,

                    participants,

                    groupMetadata,

                    user,

                    bot,

                    isROwner,

                    isOwner,

                    isRAdmin,

                    isAdmin,

                    isBotAdmin,

                    isPrems,

                    chatUpdate,

                    __dirname:
                        ___dirname,

                    __filename

                }

                // ═══════════════════════════════
                // RUN PLUGIN
                // ═══════════════════════════════

                try {

                    await plugin.call(
                        sock,
                        m,
                        extra
                    )

                    if (!isPrems) {

                        m.limit =
                            m.limit ||
                            plugin.limit ||
                            false

                    }

                } catch (error) {

                    m.error =
                        error

                    console.error(
                        `PLUGIN ERROR ${name}:`,
                        error
                    )

                    try {

                        if (
                            error &&
                            m.reply
                        ) {

                            await m.reply(
                                format(
                                    error
                                )
                            )

                        }

                    } catch {}

                } finally {

                    if (
                        typeof plugin.after ===
                        'function'
                    ) {

                        try {

                            await plugin.after.call(
                                sock,
                                m,
                                extra
                            )

                        } catch (error) {

                            console.error(
                                `PLUGIN AFTER ERROR ${name}:`,
                                error
                            )

                        }

                    }

                    if (
                        m.limit
                    ) {

                        try {

                            await m.reply(
                                `+${m.limit} Limit used ✔️`
                            )

                        } catch {}

                    }

                }

                break
            }

        } finally {

            // مهم جداً للـ Sub Bot
            global.conn =
                oldConn

        }

    } catch (error) {

        console.error(
            '❌ HANDLER ERROR:',
            error
        )

        try {

            if (
                m?.chat &&
                m?.reply &&
                error
            ) {

                console.error(
                    format(error)
                )

            }

        } catch {}

    }

    // ═══════════════════════════════════════
    // DATABASE / STATS
    // ═══════════════════════════════════════

    try {

        if (
            !global.db?.data
        ) {
            return
        }

        global.db.data.users =
            global.db.data.users ||
            {}

        global.db.data.stats =
            global.db.data.stats ||
            {}

        // ═══════════════════════════════════
        // USER STATS
        // ═══════════════════════════════════

        if (
            m?.sender &&
            global.db.data.users[
                m.sender
            ]
        ) {

            const user =
                global.db.data.users[
                    m.sender
                ]

            user.exp =
                Number(
                    user.exp || 0
                )

            user.limit =
                Number(
                    user.limit || 0
                )

        }

        // ═══════════════════════════════════
        // PLUGIN STATS
        // ═══════════════════════════════════

        if (
            m?.plugin
        ) {

            const now =
                Date.now()

            const stats =
                global.db.data.stats

            stats[m.plugin] = {

                total: 0,

                success: 0,

                last: 0,

                lastSuccess: 0,

                ...(
                    stats[m.plugin] ||
                    {}
                )

            }

            stats[
                m.plugin
            ].total++

            stats[
                m.plugin
            ].last =
                now

            if (!m.error) {

                stats[
                    m.plugin
                ].success++

                stats[
                    m.plugin
                ].lastSuccess =
                    now

            }

        }

        // ═══════════════════════════════════
        // PRINT
        // ═══════════════════════════════════

        try {

            const print =
                await import(
                    `./lib/print.js?v=${Date.now()}`
                )

            if (
                typeof print.default ===
                'function'
            ) {

                await print.default(
                    m,
                    sock
                )

            }

        } catch (error) {

            console.error(
                'PRINT ERROR:',
                error
            )

        }

        // ═══════════════════════════════════
        // AUTO READ AGAIN
        // ═══════════════════════════════════

        try {

            if (
                m?.key &&
                typeof sock.readMessages ===
                'function'
            ) {

                await sock.readMessages([
                    m.key
                ])

            }

        } catch {}

    } catch (error) {

        console.error(
            '❌ HANDLER FINAL ERROR:',
            error
        )

    }
}


/**
 * ═══════════════════════════════════════════════
 * GROUP PARTICIPANTS UPDATE
 * ═══════════════════════════════════════════════
 */

export async function participantsUpdate({
    id,
    participants,
    action,
    simulate = false
}) {

    if (
        this.isInit &&
        !simulate
    ) {
        return
    }

    try {

        if (
            !global.db?.data
        ) {

            if (
                typeof global.loadDatabase ===
                'function'
            ) {

                await global.loadDatabase()

            }

        }

        if (
            !global.db?.data
        ) {
            return
        }

        global.db.data.chats =
            global.db.data.chats ||
            {}

        const chat =
            global.db.data.chats[
                id
            ] || {}

        const groupMetadata =
            (
                this.chats?.[id] || {}
            ).metadata ||
            await this
                .groupMetadata(id)
                .catch(
                    () => null
                ) ||
            {}

        switch (action) {

            case 'add':

            case 'remove':

                if (
                    !chat.welcome
                ) {
                    return
                }

                for (
                    const user of participants
                ) {

                    const jid =
                        user?.phoneNumber ||
                        user?.id

                    if (!jid) {
                        continue
                    }

                    const userJid =
                        typeof this.getJid ===
                        'function'
                            ? this.getJid(jid)
                            : jid

                    let text =
                        action === 'add'
                            ? (
                                chat.sWelcome ||
                                this.welcome ||
                                'Welcome, @user!'
                            )
                            : (
                                chat.sBye ||
                                this.bye ||
                                'Bye, @user!'
                            )

                    text =
                        text
                            .replace(
                                '@user',
                                `@${userJid.split('@')[0]}`
                            )
                            .replace(
                                '@subject',
                                groupMetadata.subject ||
                                ''
                            )
                            .replace(
                                '@desc',
                                groupMetadata.desc ||
                                ''
                            )

                    try {

                        await this.sendMessage(
                            id,
                            {
                                text,
                                mentions: [
                                    userJid
                                ]
                            }
                        )

                    } catch {}

                }

                break

            case 'promote':

            case 'demote':

                for (
                    const user of participants
                ) {

                    const jid =
                        user?.phoneNumber ||
                        user?.id

                    if (!jid) {
                        continue
                    }

                    const userJid =
                        typeof this.getJid ===
                        'function'
                            ? this.getJid(jid)
                            : jid

                    let text =
                        action === 'promote'
                            ? (
                                chat.sPromote ||
                                this.spromote ||
                                '@user is now Admin'
                            )
                            : (
                                chat.sDemote ||
                                this.sdemote ||
                                '@user is no longer Admin'
                            )

                    text =
                        text
                            .replace(
                                '@user',
                                `@${userJid.split('@')[0]}`
                            )
                            .replace(
                                '@subject',
                                groupMetadata.subject ||
                                ''
                            )
                            .replace(
                                '@desc',
                                groupMetadata.desc ||
                                ''
                            )

                    if (
                        chat.detect
                    ) {

                        try {

                            await this.sendMessage(
                                id,
                                {
                                    text,
                                    mentions: [
                                        userJid
                                    ]
                                }
                            )

                        } catch {}

                    }

                }

                break

        }

    } catch (error) {

        console.error(
            '❌ PARTICIPANTS ERROR:',
            error
        )

    }

}


/**
 * ═══════════════════════════════════════════════
 * GROUP UPDATE
 * ═══════════════════════════════════════════════
 */

export async function groupsUpdate(
    groupsUpdate
) {

    if (
        !Array.isArray(
            groupsUpdate
        )
    ) {
        return
    }

    for (
        const groupUpdate of groupsUpdate
    ) {

        try {

            const id =
                groupUpdate.id

            if (!id) {
                continue
            }

            const chats =
                global.db.data.chats?.[
                    id
                ]

            if (
                !chats?.detect
            ) {
                continue
            }

            let text = ''

            if (
                groupUpdate.desc
            ) {

                text =
                    (
                        chats.sDesc ||
                        this.sDesc ||
                        'Description changed:\n@desc'
                    ).replace(
                        '@desc',
                        groupUpdate.desc
                    )

            }

            if (
                groupUpdate.subject
            ) {

                text =
                    (
                        chats.sSubject ||
                        this.sSubject ||
                        'Subject changed:\n@subject'
                    ).replace(
                        '@subject',
                        groupUpdate.subject
                    )

            }

            if (
                groupUpdate.icon
            ) {

                text =
                    (
                        chats.sIcon ||
                        this.sIcon ||
                        'Group icon changed'
                    ).replace(
                        '@icon',
                        groupUpdate.icon
                    )

            }

            if (
                groupUpdate.revoke
            ) {

                text =
                    (
                        chats.sRevoke ||
                        this.sRevoke ||
                        'Group link changed:\n@revoke'
                    ).replace(
                        '@revoke',
                        groupUpdate.revoke
                    )

            }

            if (!text) {
                continue
            }

            await this.sendMessage(
                id,
                {
                    text
                }
            )

        } catch (error) {

            console.error(
                '❌ GROUP UPDATE ERROR:',
                error
            )

        }

    }

}


/**
 * ═══════════════════════════════════════════════
 * DELETE UPDATE
 * ═══════════════════════════════════════════════
 */

export async function deleteUpdate(
    message
) {

    try {

        const {
            fromMe,
            id,
            participant
        } = message

        if (fromMe) {
            return
        }

        if (
            typeof this.loadMessage !==
            'function'
        ) {
            return
        }

        const loaded =
            this.loadMessage(id)

        if (!loaded) {
            return
        }

        const msg =
            typeof this.serializeM ===
            'function'
                ? this.serializeM(
                    loaded
                )
                : loaded

        if (!msg) {
            return
        }

        const chat =
            global.db.data.chats?.[
                msg.chat
            ]

        if (
            !chat?.delete
        ) {
            return
        }

        const participantNumber =
            String(
                participant || ''
            )
                .split('@')[0]

        await this.reply(

            msg.chat,

`Detected @${participantNumber} has deleted a message

To disable this feature, type
*.enable delete*

تم رصد @${participantNumber} قام بحذف رسالة

لإيقاف هذه الميزة، اكتب
*.enable delete*`,

            msg,

            {
                mentions:
                    participant
                        ? [
                            participant
                        ]
                        : []
            }

        )

        if (
            typeof this.copyNForward ===
            'function'
        ) {

            this.copyNForward(
                msg.chat,
                msg
            ).catch(
                () => {}
            )

        }

    } catch (error) {

        console.error(
            '❌ DELETE UPDATE ERROR:',
            error
        )

    }

}


/**
 * ═══════════════════════════════════════════════
 * DFAIL
 * ═══════════════════════════════════════════════
 */

global.dfail = (
    type,
    m,
    conn
) => {

    const msg = {

        rowner:
`Only Developer - This command is for the bot developer only
هذا الأمر مخصص للمطور فقط`,

        owner:
`Only Owner - This command is for the bot owner only
هذا الأمر مخصص لمالك البوت فقط`,

        premium:
`Only Premium - This command is for premium users only
هذا الأمر مخصص للمستخدمين المميزين فقط`,

        group:
`Group Chat - This command can only be used in groups
هذا الأمر يعمل داخل المجموعات فقط`,

        private:
`Private Chat - This command can only be used in private chat
هذا الأمر يعمل في المحادثة الخاصة فقط`,

        admin:
`Only Admin - This command is for group admins only
هذا الأمر مخصص للمشرفين فقط`,

        botAdmin:
`Only Bot Admin - This command requires the bot to be an admin
هذا الأمر يتطلب أن يكون البوت مشرفاً`,

        unreg:
`Hello! 👋 You need to register in the bot database first before using this feature

Write .daftar Name.age to register

مرحباً! 👋 يجب عليك التسجيل في قاعدة بيانات البوت أولاً قبل استخدام هذه الميزة

اكتب .daftar الاسم.العمر للتسجيل`,

        restrict:
`Restrict - This feature has not been activated in this chat
هذه الميزة غير مفعّلة في هذه المحادثة`

    }[type]

    if (
        msg &&
        conn?.reply
    ) {

        return conn.reply(
            m.chat,
            msg,
            m
        )

    }

}


/**
 * ═══════════════════════════════════════════════
 * HOT RELOAD
 * ═══════════════════════════════════════════════
 */

const file =
    global.__filename(
        import.meta.url,
        true
    )

watchFile(
    file,
    async () => {

        unwatchFile(file)

        console.log(
            chalk.redBright(
                "Update 'handler.js'"
            )
        )

        if (
            global.reloadHandler
        ) {

            console.log(
                await global.reloadHandler()
            )

        }

    }
)