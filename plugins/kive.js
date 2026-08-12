import axios from "axios";

// ═══════════════════════════════════════════════════════
// 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 | KIVE AI IMAGE GENERATOR
// ═══════════════════════════════════════════════════════

// الحالة العامة
if (global.kiveEnabled === undefined) {
    global.kiveEnabled = false;
}


// ═══════════════════════════════════════════════════════
// KIVE CLIENT
// ═══════════════════════════════════════════════════════

class KiveClient {

    constructor() {
        this.firebaseKey = "AIzaSyBYwZOIHYtiMznRurZI9TtJDhW0b-m97tI";
        this.graphqlURL =
            "https://kive-graphql-auu6epeciq-uc.a.run.app/api";

        this.email = null;
        this.password = null;
        this.idToken = null;
        this.localId = null;
        this.workspaceId = null;
    }


    genName() {

        const firstNames = [
            "Alex",
            "Sam",
            "Taylor",
            "Jordan",
            "Casey",
            "Jamie",
            "Morgan",
            "Riley",
            "Quinn",
            "Dakota"
        ];

        const lastNames = [
            "Smith",
            "Johnson",
            "Brown",
            "Lee",
            "Wang",
            "Garcia",
            "Miller",
            "Davis",
            "Rodriguez",
            "Wilson"
        ];

        return {
            first:
                firstNames[
                    Math.floor(
                        Math.random() * firstNames.length
                    )
                ],

            last:
                lastNames[
                    Math.floor(
                        Math.random() * lastNames.length
                    )
                ]
        };
    }


    genEmail() {

        return `user${Math.floor(
            Math.random() * 1000000
        )}@mail.com`;

    }


    genPass() {

        return `Pass${Math.floor(
            Math.random() * 100000
        )}`;

    }


    fbHeaders() {

        return {

            "content-type": "application/json",

            "user-agent":
                "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/127.0.0.0 Mobile Safari/537.36"

        };

    }


    gqlHeaders() {

        const headers = {

            "content-type": "application/json",

            "user-agent":
                "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/127.0.0.0 Mobile Safari/537.36",

            "origin":
                "https://kive.ai"

        };


        if (this.idToken) {

            headers.authorization =
                `Bearer ${this.idToken}`;

        }


        return headers;

    }


    // ═══════════════════════════════════════════════════
    // SIGN UP
    // ═══════════════════════════════════════════════════

    async signup() {

        this.email =
            this.genEmail();

        this.password =
            this.genPass();


        const url =
            `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.firebaseKey}`;


        const response =
            await axios.post(

                url,

                {

                    returnSecureToken: true,

                    email: this.email,

                    password: this.password

                },

                {

                    headers:
                        this.fbHeaders(),

                    timeout: 30000

                }

            );


        this.idToken =
            response.data.idToken;

        this.localId =
            response.data.localId;


        return response.data;

    }


    // ═══════════════════════════════════════════════════
    // PROFILE
    // ═══════════════════════════════════════════════════

    async setupProfile() {

        const name =
            this.genName();


        const mutation = `

            mutation userProfileUpdate(
                $firstName: String!,
                $lastName: String!
            ) {

                userProfileUpdate(
                    input: {
                        firstName: $firstName,
                        lastName: $lastName
                    }
                ) {

                    id
                    uid
                    email
                    firstName
                    lastName
                    displayName
                    handle

                }

            }

        `;


        return await axios.post(

            this.graphqlURL,

            {

                operationName:
                    "userProfileUpdate",

                variables: {

                    firstName:
                        name.first,

                    lastName:
                        name.last

                },

                query:
                    mutation

            },

            {

                headers:
                    this.gqlHeaders(),

                timeout:
                    30000

            }

        );

    }


    // ═══════════════════════════════════════════════════
    // WORKSPACE
    // ═══════════════════════════════════════════════════

    async createWorkspace() {

        const mutation = `

            mutation addWorkspace {

                addWorkspace(
                    input: {}
                ) {

                    id
                    title
                    url
                    adminEmails
                    permissions

                }

            }

        `;


        const response =
            await axios.post(

                this.graphqlURL,

                {

                    operationName:
                        "addWorkspace",

                    variables: {},

                    query:
                        mutation

                },

                {

                    headers:
                        this.gqlHeaders(),

                    timeout:
                        30000

                }

            );


        if (
            response.data?.data?.addWorkspace?.id
        ) {

            this.workspaceId =
                response.data.data.addWorkspace.id;

        }


        return response.data;

    }


    // ═══════════════════════════════════════════════════
    // IMAGE GENERATION
    // ═══════════════════════════════════════════════════

    async genImgPreview(
        prompt,
        aspectRatio = "9:16",
        seed = Math.floor(
            Math.random() * 999999
        )
    ) {

        const query = `

            query imageGenerationPreview(
                $prompt: String!,
                $aspectRatio: String!,
                $seed: Int!
            ) {

                imageGenerationPreview(
                    input: {
                        prompt: $prompt,
                        aspectRatio: $aspectRatio,
                        seed: $seed
                    }
                ) {

                    url

                }

            }

        `;


        const headers =
            this.gqlHeaders();


        headers["x-tracking-context"] =
            JSON.stringify({

                platform:
                    "web",

                url:
                    "https://kive.ai/generate-image",

                workspaceId:
                    this.workspaceId

            });


        return await axios.post(

            this.graphqlURL,

            {

                operationName:
                    "imageGenerationPreview",

                variables: {

                    prompt,

                    aspectRatio,

                    seed

                },

                query

            },

            {

                headers,

                timeout:
                    90000

            }

        );

    }


    // ═══════════════════════════════════════════════════
    // TXT TO IMAGE
    // ═══════════════════════════════════════════════════

    async txt2img({
        prompt,
        aspectRatio = "9:16"
    }) {

        if (!this.idToken) {

            await this.signup();

            await this.setupProfile();

            await this.createWorkspace();

        }


        const response =
            await this.genImgPreview(
                prompt,
                aspectRatio
            );


        return {

            success: true,

            preview:
                response.data
                    ?.data
                    ?.imageGenerationPreview || null

        };

    }

}


// ═══════════════════════════════════════════════════════
// كلمات تشغيل توليد الصور
// ═══════════════════════════════════════════════════════

const IMAGE_TRIGGERS = [

    "اصنع",
    "صنع",

    "ارسم",
    "رسم",

    "اعطني",
    "أعطني",

    "قوم",
    "قم",

    "صاوب",
    "صايب",

    "دير",
    "ديرلي",
    "دير لي",

    "أنشئ",
    "انشئ",
    "انشاء",
    "إنشاء",

    "خلق"

];


// ═══════════════════════════════════════════════════════
// التحقق من طلب الصورة
// ═══════════════════════════════════════════════════════

function isImageRequest(text) {

    if (!text)
        return false;


    const clean =
        text
            .trim()
            .toLowerCase();


    return IMAGE_TRIGGERS.some(
        trigger => {

            return (

                clean === trigger ||

                clean.startsWith(
                    trigger + " "
                ) ||

                clean.startsWith(
                    trigger + "،"
                ) ||

                clean.startsWith(
                    trigger + ":"
                )

            );

        }
    );

}


// ═══════════════════════════════════════════════════════
// استخراج الوصف
// ═══════════════════════════════════════════════════════

function getPrompt(text) {

    let prompt =
        text.trim();


    for (
        const trigger of IMAGE_TRIGGERS
    ) {

        const regex =
            new RegExp(
                `^${trigger}\\s*[:،,\\-]?\\s*`,
                "i"
            );


        if (
            regex.test(prompt)
        ) {

            prompt =
                prompt
                    .replace(
                        regex,
                        ""
                    )
                    .trim();

            break;

        }

    }


    return prompt;

}


// ═══════════════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════════════

let handler = async (
    m,
    { conn, text, isOwner }
) => {

    // الأوامر ما نخدموهمش هنا
    return;

};


// ═══════════════════════════════════════════════════════
// BEFORE
// مهم جداً: كيتنفذ مع كل رسالة
// ═══════════════════════════════════════════════════════

handler.before = async (
    m,
    {
        conn,
        text,
        isOwner
    }
) => {

    try {

        // ─────────────────────────────────────────────
        // حماية من رسائل البوت
        // ─────────────────────────────────────────────

        if (
            m.fromMe
        )
            return;


        // ─────────────────────────────────────────────
        // إلا الخدمة مطفية
        // ─────────────────────────────────────────────

        if (
            !global.kiveEnabled
        )
            return;


        // ─────────────────────────────────────────────
        // خدم غير فالمجموعات
        // ─────────────────────────────────────────────

        if (
            !m.isGroup
        )
            return;


        // ─────────────────────────────────────────────
        // النص
        // ─────────────────────────────────────────────

        const body =
            (
                text ||
                m.text ||
                m.body ||
                ""
            ).trim();


        if (!body)
            return;


        // ─────────────────────────────────────────────
        // ما تولدش على .kive
        // ─────────────────────────────────────────────

        if (
            body.toLowerCase()
                .startsWith(".kive")
        )
            return;


        // ─────────────────────────────────────────────
        // التحقق واش طلب صورة
        // ─────────────────────────────────────────────

        if (
            !isImageRequest(body)
        )
            return;


        const prompt =
            getPrompt(body);


        if (!prompt) {

            await m.reply(

                `🎨 *𝐃𝐀𝐌𝐀𝐑-𝐌𝐃*\n\n` +

                `قول ليا شنو بغيتي نرسم ليك 😎\n\n` +

                `مثال:\n` +

                `اصنع قطة وسط الغابة 🐱🌳`

            );

            return;

        }


        // ─────────────────────────────────────────────
        // رسالة الانتظار
        // ─────────────────────────────────────────────

        await m.reply(

            `🎨 *𝐃𝐀𝐌𝐀𝐑-𝐌𝐃*\n\n` +

            `⏳ صبر شوية خويا، كنصاوب ليك الصورة... 🎨\n\n` +

            `📝 *الوصف:*\n${prompt}`

        );


        // ─────────────────────────────────────────────
        // إنشاء الصورة
        // ─────────────────────────────────────────────

        const client =
            new KiveClient();


        const result =
            await client.txt2img({

                prompt,

                aspectRatio:
                    "9:16"

            });


        // ─────────────────────────────────────────────
        // التأكد من الرابط
        // ─────────────────────────────────────────────

        if (
            !result?.preview?.url
        ) {

            throw new Error(
                "لم يتم الحصول على رابط الصورة"
            );

        }


        // ─────────────────────────────────────────────
        // إرسال الصورة
        // ─────────────────────────────────────────────

        const caption =

            `✨ *𝐃𝐀𝐌𝐀𝐑-𝐌𝐃* ✨\n\n` +

            `🎨 *تم إنشاء الصورة بنجاح!*\n\n` +

            `📝 *الوصف:*\n` +

            `${prompt}\n\n` +

            `━━━━━━━━━━━━━━\n` +

            `🤖 *البوت:* 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃\n` +

            `👨‍💻 *المطور:* ابو دمار شامل\n` +

            `📱 *رقم المطور:* +212 633-226499\n` +

            `🔵 *Facebook:* https://www.facebook.com/profile.php?id=61591783185803`;


        await conn.sendMessage(

            m.chat,

            {

                image: {
                    url:
                        result.preview.url
                },

                caption

            },

            {
                quoted: m
            }

        );


    } catch (error) {

        console.error(
            "𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 KIVE ERROR:",
            error
        );


        await m.reply(

            `❌ *وقع مشكل وأنا كنصايب الصورة* 😅\n\n` +

            `جرب مرة أخرى من بعد شوية.\n\n` +

            `🤖 *𝐃𝐀𝐌𝐀𝐑-𝐌𝐃*\n` +

            `👨‍💻 *المطور:* ابو دمار شامل`

        );

    }

};


// ═══════════════════════════════════════════════════════
// .kive on / .kive off
// ═══════════════════════════════════════════════════════

handler.command = [

    "kive"

];


// ═══════════════════════════════════════════════════════
// COMMAND
// ═══════════════════════════════════════════════════════

handler = Object.assign(

    async (
        m,
        {
            conn,
            text,
            isOwner
        }
    ) => {

        const args =
            (text || "")
                .trim()
                .toLowerCase();


        // ─────────────────────────────────────────────
        // ON
        // ─────────────────────────────────────────────

        if (
            args === "on"
        ) {

            // السماح للمالك فقط
            if (
                !isOwner
            ) {

                return m.reply(

                    `❌ هاد الأمر غير متاح ليك.\n\n` +

                    `👨‍💻 غير المالك يقدر يشغل AI.`

                );

            }


            global.kiveEnabled =
                true;


            return m.reply(

                `✅ *𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 | KIVE AI*\n\n` +

                `🟢 تم تشغيل توليد الصور تلقائياً.\n\n` +

                `دابا فـ جميع المجموعات، إلا كتب شي واحد:\n\n` +

                `🎨 اصنع قطة وسط الغابة\n` +

                `🖌️ ارسم سيارة سوداء\n` +

                `🤖 اعطني روبوت فالمستقبل\n\n` +

                `غادي نولد ليه الصورة تلقائياً 😎\n\n` +

                `━━━━━━━━━━━━━━\n` +

                `👨‍💻 ابو دمار شامل\n` +

                `🤖 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃`

            );

        }


        // ─────────────────────────────────────────────
        // OFF
        // ─────────────────────────────────────────────

        if (
            args === "off"
        ) {

            if (
                !isOwner
            ) {

                return m.reply(

                    `❌ هاد الأمر غير متاح ليك.`

                );

            }


            global.kiveEnabled =
                false;


            return m.reply(

                `🔴 *𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 | KIVE AI*\n\n` +

                `تم إيقاف توليد الصور التلقائي فـ جميع المجموعات.\n\n` +

                `إلى بغيتي تشغلو من جديد كتب:\n\n` +

                `*.kive on*`

            );

        }


        // ─────────────────────────────────────────────
        // HELP
        // ─────────────────────────────────────────────

        return m.reply(

            `🎨 *𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 | KIVE AI*\n\n` +

            `الحالة الحالية: ` +

            `${global.kiveEnabled ? "🟢 ON" : "🔴 OFF"}\n\n` +

            `• *.kive on* — تشغيل\n` +

            `• *.kive off* — إيقاف\n\n` +

            `منين يكون ON كتب مباشرة:\n` +

            `• اصنع قطة فالطبيعة\n` +

            `• ارسم سيارة فاخرة\n` +

            `• اعطني روبوت\n` +

            `• قوم برسم مدينة مستقبلية\n\n` +

            `🤖 *𝐃𝐀𝐌𝐀𝐑-𝐌𝐃*\n` +

            `👨‍💻 ابو دمار شامل`

        );

    },

    handler
);


handler.command = ["kive"];

handler.help = ["kive on", "kive off"];

handler.tags = ["ai"];

handler.limit = false;


export default handler;