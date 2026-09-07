import fetch from 'node-fetch';

global.autoGeminiGlobal = true;

const geminiSessions = {};

// =====================================================
// 👑 الملاك المسموح لهم بالتحكم في AutoAI
// =====================================================

const OWNER_NUMBERS = [
  '212709473869',
  '212708673234',
  '212717268388'
];

// =====================================================
// 🤖 شخصية البوت
// =====================================================

global.botPersonality =
  'رد علي بالدارجة المغربية يتكلم بغضب ومزعج وقبيح';

// =====================================================
// 🔐 التحقق من المالك
// =====================================================

function isAutoAIOwner(number) {
  if (!number) return false;

  const cleanNumber = String(number)
    .split('@')[0]
    .replace(/\D/g, '');

  return OWNER_NUMBERS.includes(cleanNumber);
}

// =====================================================
// 🧹 استخراج رقم المرسل
// =====================================================

function getSenderNumber(m) {
  return m.sender
    ?.split('@')[0]
    ?.replace(/\D/g, '');
}

// =====================================================
// 🧠 نظام Gemini
// =====================================================

const gemini = {

  getNewCookie: async function () {

    const r = await fetch(
      'https://gemini.google.com/_/BardChatUi/data/batchexecute?rpcids=maGuAc&source-path=%2F&bl=boq_assistant-bard-web-server_20250814.06_p1&f.sid=-7816331052118000090&hl=ar&_reqid=173780&rt=c',
      {
        headers: {
          'content-type':
            'application/x-www-form-urlencoded;charset=UTF-8'
        },

        body:
          'f.req=%5B%5B%5B%22maGuAc%22%2C%22%5B0%5D%22%2Cnull%2C%22generic%22%5D%5D%5D&',

        method: 'POST'
      }
    );

    const cookieHeader =
      r.headers.get('set-cookie');

    if (!cookieHeader) {
      throw new Error('ماجبتش الكوكي');
    }

    return cookieHeader.split(';')[0];
  },

  ask: async function (
    prompt,
    previousId = null
  ) {

    if (!prompt?.trim()) {
      throw new Error('السؤال خاوي اخويا.');
    }

    let resumeArray = null;
    let cookie = null;

    // =================================================
    // 🔄 استرجاع الجلسة السابقة
    // =================================================

    if (previousId) {

      try {

        const j =
          JSON.parse(atob(previousId));

        resumeArray =
          j.newResumeArray;

        cookie =
          j.cookie;

      } catch {

        previousId = null;
      }
    }

    // =================================================
    // 🤖 البرومبت
    // =================================================

    const finalPrompt =
      `${global.botPersonality}. ` +
      `ممنوع تجاوب على التفاعل أو الإيموجيات. ` +
      `جاوب غير على الكلام المفيد: ${prompt}`;

    // =================================================
    // 📡 Headers
    // =================================================

    const headers = {

      'content-type':
        'application/x-www-form-urlencoded;charset=UTF-8',

      cookie:
        cookie || await this.getNewCookie()
    };

    // =================================================
    // 📦 البيانات
    // =================================================

    const b = [
      [finalPrompt],
      ['ar'],
      resumeArray
    ];

    const a = [
      null,
      JSON.stringify(b)
    ];

    const obj = {
      'f.req': JSON.stringify(a)
    };

    const body =
      new URLSearchParams(obj);

    // =================================================
    // 🚀 إرسال إلى Gemini
    // =================================================

    const response = await fetch(
      'https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate?bl=boq_assistant-bard-web-server_20250729.06_p0&f.sid=4206607810970164620&hl=ar&_reqid=2813378&rt=c',
      {
        headers,
        body,
        method: 'POST'
      }
    );

    if (!response.ok) {

      throw new Error(
        `سيرفر جوجل طاح: ${response.status}`
      );
    }

    const data =
      await response.text();

    // =================================================
    // 🔎 استخراج الجواب
    // =================================================

    const match =
      data.matchAll(
        /^\d+\n(.+?)\n/gm
      );

    const chunks =
      Array.from(
        match,
        m => m[1]
      );

    let text;
    let newResumeArray;
    let found = false;

    for (
      const chunk of chunks.reverse()
    ) {

      try {

        const realArray =
          JSON.parse(chunk);

        const parse1 =
          JSON.parse(
            realArray[0][2]
          );

        if (
          parse1?.[4]?.[0]?.[1]?.[0]
        ) {

          newResumeArray = [
            ...parse1[1],
            parse1[4][0][0]
          ];

          text =
            parse1[4][0][1][0]
              .replace(
                /\*\*(.+?)\*\*/g,
                '*$1*'
              );

          found = true;

          break;
        }

      } catch {}
    }

    if (!found) {

      throw new Error(
        'ما فهمتش الجواب ديال Gemini'
      );
    }

    // =================================================
    // 🆔 إنشاء Session ID
    // =================================================

    const id =
      btoa(
        JSON.stringify({
          newResumeArray,
          cookie: headers.cookie
        })
      );

    return {
      text,
      id
    };
  }
};

// =====================================================
// 👨‍💻 معلومات المطور
// =====================================================

const DEV_INFO = {

  name: 'ابو دمار شامل',

  number: '+212 717-268388'
};

// =====================================================
// 🔎 معرفة واش سول على المطور
// =====================================================

function isAskingAboutDev(text) {

  if (!text) return false;

  const keywords = [

    'شكون صنعك',
    'من صنعك',
    'شكون طورك',
    'من طورك',
    'المطور',
    'الصانع',
    'شكون مول البوت',
    'مول البوت',
    'صاحب البوت',
    'creator',
    'owner',
    'dev'

  ];

  const msg =
    text.toLowerCase();

  return keywords.some(
    k => msg.includes(k)
  );
}

// =====================================================
// 🎛️ الهاندلر الرئيسي
// =====================================================

let handler = async (
  m,
  {
    text,
    command
  }
) => {

  // =================================================
  // 📱 رقم المرسل
  // =================================================

  const senderNumber =
    getSenderNumber(m);

  // =================================================
  // 👑 هل هو واحد من الملاك؟
  // =================================================

  const isOwner =
    isAutoAIOwner(senderNumber);

  // =================================================
  // 🤖 أمر AutoAI
  // =================================================

  if (command === 'autoai') {

    // ===============================================
    // 🔐 منع غير الملاك
    // ===============================================

    if (!isOwner) {

      return m.reply(
        '❌ *هاد الأمر غير مسموح ليك.*\n\n' +
        '👑 غير الملاك المصرح لهم يقدرو يتحكمو فـ AutoAI.'
      );
    }

    // ===============================================
    // 📥 الأمر
    // ===============================================

    const arg =
      (text || '')
        .toLowerCase()
        .trim();

    // ===============================================
    // 🟢 تشغيل
    // ===============================================

    if (
      arg === 'on' ||
      arg === 'تشغيل' ||
      arg === 'اون'
    ) {

      global.autoGeminiGlobal = true;

      return m.reply(
        '✅ *تم تشغيل AutoAI بنجاح.*\n\n' +
        '🤖 دابا البوت غادي يرد تلقائياً على الرسائل النصية.\n' +
        '🚫 الروابط والأوامر والإيموجيات كيتجاهلهم.'
      );
    }

    // ===============================================
    // 🔴 إيقاف
    // ===============================================

    if (
      arg === 'off' ||
      arg === 'إيقاف' ||
      arg === 'ايقاف' ||
      arg === 'اوف'
    ) {

      global.autoGeminiGlobal = false;

      return m.reply(
        '❌ *تم إيقاف AutoAI.*\n\n' +
        '🤖 البوت ما غاديش يبقى يجاوب تلقائياً.'
      );
    }

    // ===============================================
    // 📊 الحالة
    // ===============================================

    return m.reply(

      `*🤖 حالة AutoAI*\n\n` +

      `الحالة: ${
        global.autoGeminiGlobal
          ? '🟢 شغال'
          : '🔴 مطفي'
      }\n\n` +

      `*طريقة الاستعمال:*\n` +
      `.autoai on\n` +
      `.autoai off\n\n` +

      `👑 *الملاك المصرح لهم:*\n` +
      `• +212 709-473869\n` +
      `• +212 708-673234\n` +
      `• +212 717-268388`
    );
  }

  // =================================================
  // 📋 لوحة التحكم
  // =================================================

  return m.reply(

    `*👑 لوحة تحكم DAMAR-MD*\n\n` +

    `*🤖 AutoAI:* ${
      global.autoGeminiGlobal
        ? '🟢 شغال'
        : '🔴 مطفي'
    }\n\n` +

    `*الأوامر:*\n` +
    `.autoai on\n` +
    `.autoai off\n\n` +

    `*👑 الملاك:*\n` +
    `+212 709-473869\n` +
    `+212 708-673234\n` +
    `+212 717-268388`
  );
};

// =====================================================
// 🤖 الرد التلقائي
// =====================================================

handler.before = async (
  m,
  {
    conn
  }
) => {

  // =================================================
  // 🔴 AutoAI مطفي
  // =================================================

  if (
    !global.autoGeminiGlobal
  ) return;

  // =================================================
  // 🚫 تجاهل رسائل البوت
  // =================================================

  if (
    m.isBaileys &&
    m.fromMe
  ) return;

  // =================================================
  // 📝 غير النصوص
  // =================================================

  if (!m.text) return;

  const text =
    m.text.trim();

  if (!text) return;

  // =================================================
  // 🚫 تجاهل الأوامر
  // =================================================

  if (
    /^[.#/\\!]/.test(text)
  ) return;

  // =================================================
  // 🚫 تجاهل الروابط
  // =================================================

  const hasLink =
    /(https?:\/\/|http:\/\/|www\.|wa\.me\/|chat\.whatsapp\.com\/|t\.me\/|telegram\.me\/|instagram\.com\/|facebook\.com\/|youtube\.com\/|youtu\.be\/|vm\.tiktok\.com\/|tiktok\.com\/)/i
      .test(text);

  if (hasLink) return;

  // =================================================
  // 😄 تجاهل الإيموجيات فقط
  // =================================================

  const withoutEmoji =
    text
      .replace(
        /[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F]/gu,
        ''
      )
      .trim();

  if (!withoutEmoji) return;

  // =================================================
  // 🚫 تجاهل الرياكشن
  // =================================================

  if (
    m.message?.reactionMessage ||
    m.message?.pollUpdateMessage ||
    m.message?.protocolMessage
  ) {
    return;
  }

  // =================================================
  // 👨‍💻 معلومات المطور
  // =================================================

  if (
    isAskingAboutDev(text)
  ) {

    const devMsg =

      `*🤖 أنا بوت ديال ${DEV_INFO.name}*\n\n` +

      `*👨‍💻 المطور:* ${DEV_INFO.name}\n` +

      `*📱 الواتساب:* ${DEV_INFO.number}\n\n` +

      `👑 *الملاك المصرح لهم بالتحكم:*\n` +

      `• +212 709-473869\n` +
      `• +212 708-673234\n` +
      `• +212 717-268388`;

    return conn.sendMessage(

      m.chat,

      {
        text: devMsg
      },

      {
        quoted: m
      }
    );
  }

  // =================================================
  // ⏳ حالة الكتابة
  // =================================================

  try {

    await conn.sendPresenceUpdate(
      'composing',
      m.chat
    );

  } catch {}

  // =================================================
  // 🔄 المحاولة مرتين
  // =================================================

  let attempts = 0;

  while (
    attempts < 2
  ) {

    try {

      const prev =
        geminiSessions[m.sender];

      // =============================================
      // 🤖 إرسال إلى Gemini
      // =============================================

      const result =
        await gemini.ask(
          text,
          prev
        );

      // =============================================
      // 💾 حفظ الجلسة
      // =============================================

      geminiSessions[m.sender] =
        result.id;

      // =============================================
      // 📤 إرسال الرد
      // =============================================

      await conn.sendMessage(

        m.chat,

        {
          text: result.text
        },

        {
          quoted: m
        }
      );

      return;

    } catch (e) {

      console.log(
        'Gemini Error:',
        e?.message || e
      );

      attempts++;

      // =============================================
      // ⚠️ فشل بعد محاولتين
      // =============================================

      if (
        attempts >= 2
      ) {

        await conn.sendMessage(

          m.chat,

          {
            text:
              '⚠️ *خوادم Gemini ناعسة دابا* 😴\n' +
              'عاود جرب من بعد شوية.'
          },

          {
            quoted: m
          }
        );

      } else {

        // ===========================================
        // ⏱️ انتظار قبل المحاولة الثانية
        // ===========================================

        await new Promise(
          r => setTimeout(r, 1500)
        );
      }
    }
  }
};

// =====================================================
// 📌 الأوامر
// =====================================================

handler.command = [
  'autoai',
  'ai تلقائي'
];

handler.tags = [
  'ai'
];

handler.help = [
  'autoai on',
  'autoai off'
];

handler.limit = false;

export default handler;