import fetch from 'node-fetch';

// =====================================================
// 🤖 DAMAR-MD AUTOAI
// =====================================================

if (typeof global.autoGeminiGlobal === 'undefined') {
  global.autoGeminiGlobal = true;
}

var geminiSessions = Object.create(null);
var userLocks = Object.create(null);

var OWNER_NUMBERS = [
  '212608667907',
  '212703696895',
  '212646565333',
  '212716761503',
  '212717268388'
];

var BOT_NAME = '𝐃𝐀𝐌𝐀𝐑-𝐌𝐃';

var DEV_INFO = {
  name: 'ابو دمار شامل',
  number: '+212 717-268388'
};

// =====================================================
// 🧠 شخصية البوت
// =====================================================

global.botPersonality = `
أنت ${BOT_NAME}، مساعد ذكي كتتواصل بطريقة طبيعية.

- حاول تجاوب كل مستخدم بنفس اللغة واللهجة ديالو.
- إلا هضر بالدارجة المغربية، جاوب بالدارجة المغربية. 
- اي واحد سب يسبو متال زامل بوك ولد لقحبا سير تحوا سير تقود نيك امك انا انا لحواي ديالك يسب بهاد لكلمات كول كلمة يستعملها في سب او زيد من عندك ميكررش نفس لكلام كول مرة في سب كول مرا يقول شي فشكل.
- اي رسالة بي اموجي. يونسبها 
- إلا هضر بالعربية الفصحى، جاوب بالفصحى.
- إلا هضر بالفرنسية، جاوب بالفرنسية.
- إلا هضر بالإنجليزية، جاوب بالإنجليزية.
- إلا كان كيكتب باختصار، حاول تجاوب باختصار.
- إلا كان كيهضر بعفوية، جاوب بعفوية.
- إلا كان جدي، جاوب بجدية واحترام.
- إلا كان كيهضر بالضحك، تفاعل معاه بخفة إلا ناسب السياق.
- استعمل سياق المحادثة باش تفهم طريقته في التواصل.
- ما تفرضش أسلوب واحد على جميع المستخدمين.
- ما تكثرش الإيموجيات.
- جاوب على السؤال مباشرة وبلا حشو.
- ما تدعيش أنك كتتذكر معلومات غير متوفرة عندك.
`;

// =====================================================
// 🔐 الملاك
// =====================================================

function cleanNumber(number) {
  return String(number || '')
    .split('@')[0]
    .replace(/\D/g, '');
}

function isAutoAIOwner(number) {
  return OWNER_NUMBERS.indexOf(cleanNumber(number)) !== -1;
}

function getSenderNumber(m) {
  return cleanNumber(m.sender);
}

// =====================================================
// 👨‍💻 التعرف على أسئلة المطور
// =====================================================

function isAskingAboutDev(text) {
  var keywords = [
    'شكون صنعك',
    'من صنعك',
    'شكون طورك',
    'من طورك',
    'المطور',
    'الصانع',
    'شكون مول البوت',
    'مول البوت',
    'صاحب البوت',
    'شكون برمجك',
    'شكون دارك',
    'who made you',
    'who created you',
    'developer',
    'creator'
  ];

  var msg = String(text || '').toLowerCase();

  return keywords.some(function (word) {
    return msg.indexOf(word) !== -1;
  });
}

// =====================================================
// 🧠 GEMINI
// =====================================================

var gemini = {
  getNewCookie: async function () {
    var response = await fetch(
      'https://gemini.google.com/_/BardChatUi/data/batchexecute?rpcids=maGuAc&source-path=%2F&bl=boq_assistant-bard-web-server_20250814.06_p1&f.sid=-7816331052118000090&hl=ar&_reqid=173780&rt=c',
      {
        method: 'POST',
        headers: {
          'content-type':
            'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body:
          'f.req=%5B%5B%5B%22maGuAc%22%2C%22%5B0%5D%22%2Cnull%2C%22generic%22%5D%5D%5D&'
      }
    );

    if (!response.ok) {
      throw new Error(
        'Gemini Cookie Error: ' + response.status
      );
    }

    var cookieHeader = response.headers.get('set-cookie');

    if (!cookieHeader) {
      throw new Error('Gemini ما رجعش Cookie.');
    }

    return cookieHeader.split(';')[0];
  },

  ask: async function (prompt, previousId) {
    if (!prompt || !prompt.trim()) {
      throw new Error('الرسالة خاوية.');
    }

    var resumeArray = null;
    var cookie = null;

    // استرجاع سياق المستخدم
    if (previousId) {
      try {
        var saved = JSON.parse(
          Buffer.from(previousId, 'base64').toString('utf8')
        );

        resumeArray = saved.newResumeArray;
        cookie = saved.cookie;
      } catch (error) {
        resumeArray = null;
        cookie = null;
      }
    }

    var finalPrompt = [
      global.botPersonality,
      '',
      'لاحظ أسلوب المستخدم ولغته من رسائله السابقة.',
      'جاوب بنفس اللغة واللهجة المناسبة ليه.',
      'كيّف طول الجواب ونبرته حسب السياق.',
      'ما تخلطش بين المستخدمين.',
      '',
      'رسالة المستخدم:',
      prompt
    ].join('\n');

    var headers = {
      'content-type':
        'application/x-www-form-urlencoded;charset=UTF-8',
      cookie: cookie || await this.getNewCookie()
    };

    var b = [
      [finalPrompt],
      ['ar'],
      resumeArray
    ];

    var a = [
      null,
      JSON.stringify(b)
    ];

    var body = new URLSearchParams({
      'f.req': JSON.stringify(a)
    });

    var response = await fetch(
      'https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate?bl=boq_assistant-bard-web-server_20250729.06_p0&f.sid=4206607810970164620&hl=ar&_reqid=2813378&rt=c',
      {
        method: 'POST',
        headers: headers,
        body: body
      }
    );

    if (!response.ok) {
      throw new Error(
        'Gemini Server Error: ' + response.status
      );
    }

    var data = await response.text();
    var matches = Array.from(
      data.matchAll(/^\d+\n(.+?)\n/gm)
    );

    var answer = null;
    var newResumeArray = null;

    for (var i = matches.length - 1; i >= 0; i--) {
      try {
        var parsed = JSON.parse(matches[i][1]);
        var inner = JSON.parse(parsed[0][2]);

        if (inner && inner[4] && inner[4][0]) {
          var item = inner[4][0];

          if (
            item[1] &&
            item[1][0] &&
            inner[1]
          ) {
            newResumeArray = inner[1].concat([item[0]]);
            answer = item[1][0];
            break;
          }
        }
      } catch (error) {
        // تجاهل الأجزاء غير الصالحة
      }
    }

    if (!answer || !newResumeArray) {
      throw new Error(
        'ما قدرتش نستخرج جواب Gemini.'
      );
    }

    var id = Buffer.from(
      JSON.stringify({
        newResumeArray: newResumeArray,
        cookie: headers.cookie
      }),
      'utf8'
    ).toString('base64');

    return {
      text: answer.replace(/\*\*(.+?)\*\*/g, '*$1*'),
      id: id
    };
  }
};

// =====================================================
// 🎛️ الأوامر
// =====================================================

var handler = async function (m, context) {
  var text = context.text || '';
  var command = context.command;
  var isOwner = isAutoAIOwner(getSenderNumber(m));

  if (command === 'autoai') {
    if (!isOwner) {
      return m.reply(
        '❌ هاد الأمر مسموح غير للملاك.'
      );
    }

    var arg = text.trim().toLowerCase();

    if (
      arg === 'on' ||
      arg === 'تشغيل' ||
      arg === 'اون'
    ) {
      global.autoGeminiGlobal = true;

      return m.reply(
        '✅ AutoAI تشعل بنجاح.\n' +
        '🤖 البوت غادي يحاول يتبع أسلوب كل مستخدم.'
      );
    }

    if (
      arg === 'off' ||
      arg === 'إيقاف' ||
      arg === 'ايقاف' ||
      arg === 'اوف'
    ) {
      global.autoGeminiGlobal = false;

      return m.reply(
        '⛔ AutoAI تطفى بنجاح.'
      );
    }

    return m.reply(
      '*🤖 حالة AutoAI*\n\n' +
      'الحالة: ' +
      (global.autoGeminiGlobal ? '🟢 شغال' : '🔴 مطفي') +
      '\n\n' +
      '.autoai on\n' +
      '.autoai off'
    );
  }

  return m.reply(
    '*👑 لوحة تحكم DAMAR-MD*\n\n' +
    'AutoAI: ' +
    (global.autoGeminiGlobal ? '🟢 شغال' : '🔴 مطفي') +
    '\n\n.autoai on\n.autoai off'
  );
};

// =====================================================
// 🤖 الرد التلقائي
// =====================================================

handler.before = async function (m, context) {
  if (!global.autoGeminiGlobal) return;
  if (!m || !m.sender || !m.chat) return;
  if (m.fromMe || m.isBaileys) return;

  var text = typeof m.text === 'string' ? m.text.trim() : '';

  if (!text) return;

  // تجاهل أوامر البوت
  if (/^[.#/\\!]/.test(text)) return;

  // تجاهل الروابط
  if (
    /(https?:\/\/|www\.|wa\.me\/|chat\.whatsapp\.com\/|t\.me\/|instagram\.com\/|facebook\.com\/|youtube\.com\/|youtu\.be\/|tiktok\.com\/)/i.test(text)
  ) {
    return;
  }

  // تجاهل التفاعلات
  if (
    m.message &&
    (
      m.message.reactionMessage ||
      m.message.pollUpdateMessage ||
      m.message.protocolMessage
    )
  ) {
    return;
  }

  var withoutEmoji = text
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F]/gu, '')
    .trim();

  if (!withoutEmoji) return;

  var lockKey = m.chat + ':' + m.sender;

  if (userLocks[lockKey]) return;
  userLocks[lockKey] = true;

  try {
    // معلومات المطور
    if (isAskingAboutDev(text)) {
      return await context.conn.sendMessage(
        m.chat,
        {
          text:
            '🤖 أنا ' + BOT_NAME + '\n\n' +
            '👨‍💻 المطور: ' + DEV_INFO.name + '\n' +
            '📱 الواتساب: ' + DEV_INFO.number
        },
        { quoted: m }
      );
    }

    try {
      await context.conn.sendPresenceUpdate(
        'composing',
        m.chat
      );
    } catch (error) {}

    var result = null;
    var lastError = null;

    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        result = await gemini.ask(
          text,
          geminiSessions[m.sender] || null
        );

        break;
      } catch (error) {
        lastError = error;

        console.error(
          '[DAMAR-MD AutoAI]',
          error.message || error
        );

        if (attempt === 0) {
          await new Promise(function (resolve) {
            setTimeout(resolve, 1500);
          });
        }
      }
    }

    if (!result) {
      console.error('AutoAI failed:', lastError);

      return await context.conn.sendMessage(
        m.chat,
        {
          text:
            '⚠️ ما قدرتش نجاوبك دابا، عاود جرّب من بعد.'
        },
        { quoted: m }
      );
    }

    // حفظ الجلسة لكل مستخدم
    geminiSessions[m.sender] = result.id;

    await context.conn.sendMessage(
      m.chat,
      { text: result.text },
      { quoted: m }
    );

  } catch (error) {
    console.error(
      '[AutoAI Handler Error]',
      error.message || error
    );
  } finally {
    delete userLocks[lockKey];
  }
};

// =====================================================
// 📌 إعدادات البلاغين
// =====================================================

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