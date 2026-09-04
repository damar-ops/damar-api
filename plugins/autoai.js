import fetch from 'node-fetch';

global.autoGeminiGlobal = true;

const geminiSessions = {};

// 👑 المالك الوحيد
const OWNER_NUMBER = '212717268388';

// 🤖 شخصية البوت
global.botPersonality =
  'رد علي بالدارجة المغربية وباسلوب قصير وخفيف ومضحك شوية';

// ====== نظام Gemini ======
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

    const cookieHeader = r.headers.get('set-cookie');

    if (!cookieHeader) {
      throw new Error('ماجبتش الكوكي');
    }

    return cookieHeader.split(';')[0];
  },

  ask: async function (prompt, previousId = null) {
    if (!prompt?.trim()) {
      throw new Error('السؤال خاوي اخويا.');
    }

    let resumeArray = null;
    let cookie = null;

    if (previousId) {
      try {
        const j = JSON.parse(atob(previousId));
        resumeArray = j.newResumeArray;
        cookie = j.cookie;
      } catch {
        previousId = null;
      }
    }

    const finalPrompt =
      `${global.botPersonality}. ` +
      `ممنوع تجاوب على التفاعل أو الإيموجيات. ` +
      `جاوب غير على الكلام المفيد: ${prompt}`;

    const headers = {
      'content-type':
        'application/x-www-form-urlencoded;charset=UTF-8',
      cookie: cookie || await this.getNewCookie()
    };

    const b = [[finalPrompt], ['ar'], resumeArray];
    const a = [null, JSON.stringify(b)];

    const obj = {
      'f.req': JSON.stringify(a)
    };

    const body = new URLSearchParams(obj);

    const response = await fetch(
      'https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate?bl=boq_assistant-bard-web-server_20250729.06_p0&f.sid=4206607810970164620&hl=ar&_reqid=2813378&rt=c',
      {
        headers,
        body,
        method: 'POST'
      }
    );

    if (!response.ok) {
      throw new Error(`سيرفر جوجل طاح: ${response.status}`);
    }

    const data = await response.text();

    const match = data.matchAll(/^\d+\n(.+?)\n/gm);
    const chunks = Array.from(match, m => m[1]);

    let text;
    let newResumeArray;
    let found = false;

    for (const chunk of chunks.reverse()) {
      try {
        const realArray = JSON.parse(chunk);
        const parse1 = JSON.parse(realArray[0][2]);

        if (parse1?.[4]?.[0]?.[1]?.[0]) {
          newResumeArray = [
            ...parse1[1],
            parse1[4][0][0]
          ];

          text = parse1[4][0][1][0]
            .replace(/\*\*(.+?)\*\*/g, '*$1*');

          found = true;
          break;
        }
      } catch {}
    }

    if (!found) {
      throw new Error('ما فهمتش الجواب ديال Gemini');
    }

    const id = btoa(
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

// ====== معلومات المطور ======
const DEV_INFO = {
  name: 'ابو دمار شامل',
  number: '+212 717-268388'
};

// ====== معرفة واش سول على المطور ======
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

  const msg = text.toLowerCase();

  return keywords.some(k => msg.includes(k));
}

// ====== الهاندلر الرئيسي ======
let handler = async (m, { text, command }) => {

  const senderNumber =
    m.sender?.split('@')[0]?.replace(/\D/g, '');

  const isOwner =
    senderNumber === OWNER_NUMBER;

  // ===== أمر autoai =====
  if (command === 'autoai') {

    if (!isOwner) {
      return m.reply('❌ *هاد الأمر غير للمالك.*');
    }

    const arg = (text || '').toLowerCase().trim();

    if (arg === 'on') {
      global.autoGeminiGlobal = true;

      return m.reply(
        '✅ *تم تشغيل الذكاء الاصطناعي التلقائي.*\n\n' +
        'دابا البوت غادي يرد غير على الرسائل النصية وبدون الروابط.'
      );
    }

    if (arg === 'off') {
      global.autoGeminiGlobal = false;

      return m.reply(
        '❌ *تم إيقاف الذكاء الاصطناعي التلقائي.*'
      );
    }

    return m.reply(
      `*📢 حالة AutoAI:*\n\n` +
      `${global.autoGeminiGlobal ? '✅ شغال' : '❌ مطفي'}\n\n` +
      `*الاستعمال:*\n` +
      `.autoai on\n` +
      `.autoai off`
    );
  }

  // ===== لوحة التحكم =====
  return m.reply(
    `*👑 لوحة تحكم DAMAR-MD*\n\n` +
    `*المالك:*\n` +
    `+212 717-268388\n\n` +
    `*AutoAI:*\n` +
    `.autoai on\n` +
    `.autoai off`
  );
};

// ====== الرد التلقائي ======
handler.before = async (m, { conn }) => {

  // AI مطفي
  if (!global.autoGeminiGlobal) return;

  // تجاهل رسائل البوت
  if (m.isBaileys && m.fromMe) return;

  // =========================
  // تجاهل أي حاجة ماشي نص
  // =========================

  if (!m.text) return;

  const text = m.text.trim();

  if (!text) return;

  // =========================
  // تجاهل الأوامر
  // =========================

  if (/^[.#/\\!]/.test(text)) return;

  // =========================
  // 🚫 تجاهل أي رسالة فيها رابط
  // =========================

  const hasLink =
    /(https?:\/\/|http:\/\/|www\.|wa\.me\/|chat\.whatsapp\.com\/|t\.me\/|telegram\.me\/|instagram\.com\/|facebook\.com\/|youtube\.com\/|youtu\.be\/|vm\.tiktok\.com\/|tiktok\.com\/)/i
      .test(text);

  if (hasLink) return;

  // =========================
  // تجاهل الإيموجيات فقط
  // =========================

  const withoutEmoji = text
    .replace(
      /[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F]/gu,
      ''
    )
    .trim();

  if (!withoutEmoji) return;

  // =========================
  // تجاهل التفاعل / الرياكشن
  // =========================

  if (
    m.message?.reactionMessage ||
    m.message?.pollUpdateMessage ||
    m.message?.protocolMessage
  ) {
    return;
  }

  // =========================
  // معلومات صاحب البوت
  // =========================

  if (isAskingAboutDev(text)) {

    const devMsg =
      `*🤖 أنا بوت ديال ${DEV_INFO.name}*\n\n` +
      `*المطور:* ${DEV_INFO.name}\n` +
      `*الواتساب:* ${DEV_INFO.number}\n\n` +
      `👑 المالك الوحيد هو صاحب البوت.`;

    return conn.sendMessage(
      m.chat,
      { text: devMsg },
      { quoted: m }
    );
  }

  // =========================
  // AI
  // =========================

  await conn.sendPresenceUpdate(
    'composing',
    m.chat
  );

  let attempts = 0;

  while (attempts < 2) {

    try {

      const prev = geminiSessions[m.sender];

      const result = await gemini.ask(
        text,
        prev
      );

      geminiSessions[m.sender] =
        result.id;

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

      if (attempts >= 2) {

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

        await new Promise(
          r => setTimeout(r, 1500)
        );

      }
    }
  }
};

// ====== الأوامر ======
handler.command = [
  'autoai',
  'ai تلقائي'
];

handler.tags = ['ai'];

handler.help = [
  'autoai on',
  'autoai off'
];

handler.limit = false;

export default handler;