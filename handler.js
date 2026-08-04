import { smsg } from './lib/simple.js'
import { format } from 'util'
import { fileURLToPath } from 'url'
import path from 'path'
import { unwatchFile, watchFile } from 'fs'
import chalk from 'chalk'

/**
 * Handle messages upsert
 */
export async function handler(chatUpdate) {
    if (!chatUpdate) return

    const sock = this

    try {
        if (
            chatUpdate.messages &&
            typeof sock.pushMessage === 'function'
        ) {
            sock.pushMessage(chatUpdate.messages).catch(() => {})
        }

        let m =
            chatUpdate.messages?.[
                chatUpdate.messages.length - 1
            ]

        if (!m) return

        if (!global.db?.data) {
            if (typeof global.loadDatabase === 'function') {
                await global.loadDatabase()
            }
        }

        if (!global.db?.data) return

        try {
            m = smsg(sock, m) || m

            if (!m) return

            m.exp = 0
            m.limit = false

            if (
                m.sender?.endsWith('@broadcast') ||
                m.sender?.endsWith('@newsletter')
            ) {
                return
            }

            await (
                await import(
                    `./lib/database.js?v=${Date.now()}`
                )
            ).default(m, sock)

            if (typeof m.text !== 'string') {
                m.text = ''
            }

            // ═══════════════════════════════
            // CONN
            // ═══════════════════════════════

            const oldConn = global.conn

            global.conn = sock

            try {

                // ═══════════════════════════════
                // SETTINGS
                // ═══════════════════════════════

                global.db.data.settings =
                    global.db.data.settings || {}

                const botJid =
                    sock.user?.jid ||
                    sock.user?.id ||
                    ''

                const decodedJid =
                    typeof sock.decodeJid === 'function'
                        ? sock.decodeJid(botJid)
                        : botJid

                if (
                    decodedJid &&
                    !global.db.data.settings[decodedJid]
                ) {
                    global.db.data.settings[decodedJid] = {
                        public: true,
                        autoread: true,
                        anticall: true,
                        gconly: false
                    }
                }

                const settings =
                    global.db.data.settings[
                        decodedJid
                    ] || {
                        public: true,
                        autoread: true,
                        anticall: true,
                        gconly: false
                    }

                // ═══════════════════════════════
                // OWNER
                // ═══════════════════════════════

                global.owner =
                    Array.isArray(global.owner)
                        ? global.owner
                        : []

                const ownerNumbers =
                    global.owner.map(
                        ([number]) =>
                            String(number)
                                .replace(/[^0-9]/g, '')
                    )

                const senderNumber =
                    String(m.sender || '')
                        .split('@')[0]
                        .replace(/[^0-9]/g, '')

                const botNumber =
                    String(decodedJid || '')
                        .split('@')[0]
                        .replace(/[^0-9]/g, '')

                const isROwner =
                    ownerNumbers.includes(senderNumber) ||
                    senderNumber === botNumber

                const isOwner =
                    isROwner ||
                    m.fromMe === true

                const isPrems =
                    isROwner ||
                    global.db.data.users?.[
                        m.sender
                    ]?.premiumTime > 0

                // ═══════════════════════════════
                // PUBLIC / GROUP ONLY
                // ═══════════════════════════════

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

                if (m.isBaileys) return

                m.exp += Math.ceil(
                    Math.random() * 10
                )

                // ═══════════════════════════════
                // USER
                // ═══════════════════════════════

                let usedPrefix

                let _user =
                    global.db.data.users?.[
                        m.sender
                    ]

                if (!_user) {
                    global.db.data.users[m.sender] = {
                        exp: 0,
                        limit: 10,
                        level: 0,
                        registered: false
                    }

                    _user =
                        global.db.data.users[
                            m.sender
                        ]
                }

                // ═══════════════════════════════
                // GROUP
                // ═══════════════════════════════

                let groupMetadata = {}

                if (m.isGroup) {
                    groupMetadata =
                        (
                            sock.chats?.[m.chat] || {}
                        ).metadata ||
                        await sock
                            .groupMetadata(m.chat)
                            .catch(() => null) ||
                        {}
                }

                const participants =
                    m.isGroup
                        ? groupMetadata.participants || []
                        : []

                const getJid = user => {
                    if (!user) return ''

                    if (
                        typeof sock.getJid === 'function'
                    ) {
                        return sock.getJid(
                            user.id ||
                            user.phoneNumber ||
                            ''
                        )
                    }

                    return (
                        user.id ||
                        user.phoneNumber ||
                        ''
                    )
                }

                const user =
                    m.isGroup
                        ? participants.find(
                            u =>
                                getJid(u) ===
                                m.sender
                        ) || {}
                        : {}

                const bot =
                    m.isGroup
                        ? participants.find(
                            u =>
                                getJid(u) ===
                                decodedJid
                        ) || {}
                        : {}

                const isRAdmin =
                    user?.admin === 'superadmin'

                const isAdmin =
                    isRAdmin ||
                    user?.admin === 'admin'

                const isBotAdmin =
                    !!bot?.admin

                // ═══════════════════════════════
                // PLUGINS
                // ═══════════════════════════════

                const ___dirname =
                    path.join(
                        path.dirname(
                            fileURLToPath(import.meta.url)
                        ),
                        './plugins'
                    )

                for (
                    let name in global.plugins
                ) {

                    let plugin =
                        global.plugins[name]

                    if (!plugin) continue

                    if (plugin.disabled) continue

                    const __filename =
                        path.join(
                            ___dirname,
                            name
                        )

                    // ═══════════════════════════
                    // ALL
                    // ═══════════════════════════

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

                        } catch (e) {

                            console.error(
                                `PLUGIN ALL ERROR ${name}:`,
                                e
                            )
                        }
                    }

                    // ═══════════════════════════
                    // ADMIN TAG
                    // ═══════════════════════════

                    if (
                        plugin.tags &&
                        plugin.tags.includes('admin')
                    ) {
                        continue
                    }

                    const str2Regex = str =>
                        String(str).replace(
                            /[|\\{}()[\]^$+*?.]/g,
                            '\\$&'
                        )

                    let _prefix =
                        plugin.customPrefix
                            ? plugin.customPrefix
                            : sock.prefix
                                ? sock.prefix
                                : global.prefix

                    let match

                    if (
                        _prefix instanceof RegExp
                    ) {

                        match = [
                            [
                                _prefix.exec(m.text),
                                _prefix
                            ]
                        ]

                    } else if (
                        Array.isArray(_prefix)
                    ) {

                        match =
                            _prefix
                                .map(p => {

                                    let re =
                                        p instanceof RegExp
                                            ? p
                                            : new RegExp(
                                                str2Regex(p)
                                            )

                                    return [
                                        re.exec(m.text),
                                        re
                                    ]

                                })
                                .find(
                                    p => p[0]
                                )

                    } else if (
                        typeof _prefix ===
                        'string'
                    ) {

                        const re =
                            new RegExp(
                                str2Regex(_prefix)
                            )

                        match = [
                            [
                                re.exec(m.text),
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

                    // ═══════════════════════════
                    // BEFORE
                    // ═══════════════════════════

                    if (
                        typeof plugin.before ===
                        'function'
                    ) {

                        try {

                            if (
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
                            ) {
                                continue
                            }

                        } catch (e) {

                            console.error(
                                `PLUGIN BEFORE ERROR ${name}:`,
                                e
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

                    // ═══════════════════════════
                    // COMMAND
                    // ═══════════════════════════

                    if (
                        match &&
                        match[0] &&
                        match[0][0]
                    ) {

                        usedPrefix =
                            match[0][0]

                        let noPrefix =
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

                        args = args || []

                        let _args =
                            noPrefix
                                .trim()
                                .split(/\s+/)
                                .slice(1)

                        let text =
                            _args.join(' ')

                        command =
                            (
                                command || ''
                            ).toLowerCase()

                        let fail =
                            plugin.fail ||
                            global.dfail

                        let isAccept = false

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
                                    cmd =>
                                        cmd instanceof RegExp
                                            ? cmd.test(
                                                command
                                            )
                                            : cmd ===
                                                command
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

                        m.plugin = name

                        // ═══════════════════════════
                        // BANNED CHAT
                        // ═══════════════════════════

                        if (
                            !isOwner &&
                            (
                                m.chat in
                                global.db.data.chats ||
                                m.sender in
                                global.db.data.users
                            )
                        ) {

                            let chat =
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

                        // ═══════════════════════════
                        // PERMISSIONS
                        // ═══════════════════════════

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

                        m.isCommand = true

                        let xp =
                            'exp' in plugin
                                ? parseInt(
                                    plugin.exp
                                )
                                : 17

                        if (xp > 200) {

                            m.reply(
                                'Ngecit -_-'
                            )

                        } else {

                            m.exp += xp
                        }

                        // ═══════════════════════════
                        // LIMIT
                        // ═══════════════════════════

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
                                `[❗] Your limit has run out.`,
                                m
                            )

                            continue
                        }

                        // ═══════════════════════════
                        // LEVEL
                        // ═══════════════════════════

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

                        // ═══════════════════════════
                        // EXTRA
                        // ═══════════════════════════

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

                        } catch (e) {

                            m.error = e

                            console.error(
                                `PLUGIN ERROR ${name}:`,
                                e
                            )

                            try {

                                if (
                                    e &&
                                    m.reply
                                ) {
                                    await m.reply(
                                        format(e)
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

                                } catch (e) {

                                    console.error(
                                        e
                                    )
                                }
                            }

                            if (m.limit) {

                                try {

                                    await m.reply(
                                        `+${m.limit} Limit used ✔️`
                                    )

                                } catch {}
                            }
                        }

                        break
                    }
                }

            } finally {

                global.conn = oldConn
            }

        } catch (e) {

            console.error(
                'HANDLER ERROR:',
                e
            )
        }

    } catch (e) {

        console.error(
            'MESSAGE ERROR:',
            e
        )
    }

    // ═══════════════════════════════
    // DATABASE / STATS
    // ═══════════════════════════════

    try {

        if (
            !global.db?.data
        ) return

        let user

        const stats =
            global.db.data.stats ||
            (
                global.db.data.stats = {}
            )

        if (
            m &&
            m.sender &&
            (
                user =
                global.db.data.users?.[
                    m.sender
                ]
            )
        ) {

            user.exp =
                Number(user.exp || 0) +
                Number(m.exp || 0)

            user.limit =
                Number(user.limit || 0) -
                Number(m.limit || 0)
        }

        if (m?.plugin) {

            const now = Date.now()

            stats[m.plugin] = {
                total: 0,
                success: 0,
                last: 0,
                lastSuccess: 0,
                ...stats[m.plugin]
            }

            stats[m.plugin].total++

            stats[m.plugin].last =
                now

            if (!m.error) {

                stats[m.plugin].success++

                stats[m.plugin].lastSuccess =
                    now
            }
        }

        try {

            await (
                await import(
                    `./lib/print.js?v=${Date.now()}`
                )
            ).default(
                m,
                sock
            )

        } catch (e) {

            console.log(
                'PRINT ERROR:',
                e
            )
        }

        try {

            const jid =
                sock.user?.jid ||
                sock.user?.id

            const settings =
                global.db.data.settings?.[
                    jid
                ]

            if (
                settings?.autoread &&
                m?.key
            ) {

                await sock.readMessages([
                    m.key
                ])
            }

        } catch {}

    } catch (e) {

        console.error(
            'HANDLER FINAL ERROR:',
            e
        )
    }
}


/**
 * Handle groups participants update
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

    if (!global.db?.data) return

    let chat =
        global.db.data.chats?.[id] ||
        {}

    let text = ''

    try {

        const groupMetadata =
            (
                this.chats?.[id] || {}
            ).metadata ||
            await this
                .groupMetadata(id)
                .catch(() => null) ||
            {}

        switch (action) {

            case 'add':
            case 'remove':

                if (chat.welcome) {

                    for (
                        let user of participants
                    ) {

                        const jid =
                            user?.phoneNumber ||
                            user?.id

                        if (!jid) continue

                        const userJid =
                            typeof this.getJid ===
                            'function'
                                ? this.getJid(jid)
                                : jid

                        let tamnel = null

                        try {

                            tamnel =
                                await this.profilePictureUrl(
                                    userJid,
                                    'image'
                                )

                        } catch {}

                        text =
                            (
                                action === 'add'
                                    ? chat.sWelcome ||
                                      this.welcome ||
                                      global.conn?.welcome ||
                                      'Welcome, @user!'
                                    : chat.sBye ||
                                      this.bye ||
                                      global.conn?.bye ||
                                      'Bye, @user!'
                            )
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

                            if (
                                typeof this.sendMessage ===
                                'function'
                            ) {

                                await this.sendMessage(
                                    id,
                                    {
                                        text,
                                        mentions: [
                                            userJid
                                        ]
                                    }
                                )
                            }

                        } catch {}
                    }
                }

                break

            case 'promote':
            case 'demote':

                for (
                    let users of participants
                ) {

                    const jid =
                        users?.phoneNumber ||
                        users?.id

                    if (!jid) continue

                    const userJid =
                        typeof this.getJid ===
                        'function'
                            ? this.getJid(jid)
                            : jid

                    text =
                        (
                            action === 'promote'
                                ? chat.sPromote ||
                                  this.spromote ||
                                  global.conn?.spromote ||
                                  '@user is now Admin'
                                : chat.sDemote ||
                                  this.sdemote ||
                                  global.conn?.sdemote ||
                                  '@user is no longer Admin'
                        )
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

    } catch (e) {

        console.error(
            'PARTICIPANTS ERROR:',
            e
        )
    }
}


/**
 * Handle groups update
 */
export async function groupsUpdate(
    groupsUpdate
) {

    if (!Array.isArray(groupsUpdate)) {
        return
    }

    for (
        const groupUpdate of groupsUpdate
    ) {

        try {

            const id =
                groupUpdate.id

            if (!id) continue

            const chats =
                global.db.data.chats?.[id]

            if (!chats?.detect) {
                continue
            }

            let text = ''

            if (groupUpdate.desc) {

                text =
                    (
                        chats.sDesc ||
                        this.sDesc ||
                        global.conn?.sDesc ||
                        'Description changed:\n@desc'
                    ).replace(
                        '@desc',
                        groupUpdate.desc
                    )
            }

            if (groupUpdate.subject) {

                text =
                    (
                        chats.sSubject ||
                        this.sSubject ||
                        global.conn?.sSubject ||
                        'Subject changed:\n@subject'
                    ).replace(
                        '@subject',
                        groupUpdate.subject
                    )
            }

            if (groupUpdate.icon) {

                text =
                    (
                        chats.sIcon ||
                        this.sIcon ||
                        global.conn?.sIcon ||
                        'Group icon changed'
                    ).replace(
                        '@icon',
                        groupUpdate.icon
                    )
            }

            if (groupUpdate.revoke) {

                text =
                    (
                        chats.sRevoke ||
                        this.sRevoke ||
                        global.conn?.sRevoke ||
                        'Group link changed:\n@revoke'
                    ).replace(
                        '@revoke',
                        groupUpdate.revoke
                    )
            }

            if (!text) continue

            await this.sendMessage(
                id,
                {
                    text
                }
            )

        } catch (e) {

            console.error(
                'GROUP UPDATE ERROR:',
                e
            )
        }
    }
}


/**
 * Handle deleted messages
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

        if (fromMe) return

        if (
            typeof this.loadMessage !==
            'function'
        ) {
            return
        }

        const loaded =
            this.loadMessage(id)

        if (!loaded) return

        const msg =
            typeof this.serializeM ===
            'function'
                ? this.serializeM(loaded)
                : loaded

        if (!msg) return

        const chat =
            global.db.data.chats?.[
                msg.chat
            ]

        if (!chat?.delete) return

        const participantNumber =
            String(
                participant || ''
            ).split('@')[0]

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
                mentions: participant
                    ? [participant]
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
            ).catch(() => {})
        }

    } catch (e) {

        console.error(
            'DELETE UPDATE ERROR:',
            e
        )
    }
}


// ═══════════════════════════════════════
// DFAIL
// ═══════════════════════════════════════

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


// ═══════════════════════════════════════
// HOT RELOAD
// ═══════════════════════════════════════

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