import fetch from 'node-fetch';

global.autoGeminiGlobal = true; // الحالة الافتراضية شغال
const geminiSessions = {};

// الارقام ديال الملاك اللي يقدرو يتحكمو فالشخصية و autoai
const SUPER_OWNERS = ['212633226499', '212603415919']

// الارقام ديال الملاك كاملين
const OWNER_NUMBERS = [
    '212603415919',
    '212680697262',
    '212633226499',
    '212702816550'
]

// الشخصية الافتراضية - يقدر يبدلها المالك
global.botPersonality = 'رد علي بالدارجة المغربية وباسلوب قصير وخفيف ومضحك شوية'

// معلومات المطور
const DEV_INFO = {
    name: 'ابو دمار شامل',
    number: '+212 633-226499',
    facebook: 'https://www.facebook.com/profile.php?id=61591783185803',
    instagram: 'https://www.instagram.com/damar_chamil3?igsh=MWk4eGpsOHRlcXV5cQ=='
}

// ====== 1. نظام Gemini ======
const gemini = {
  getNewCookie: async function () {
    const r = await fetch("https://gemini.google.com/_/BardChatUi/data/batchexecute?rpcids=maGuAc&source-path=%2F&bl=boq_assistant-bard-web-server_20250814.06_p1&f.sid=-7816331052118000090&hl=ar&_reqid=173780&rt=c", {
      headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: "f.req=%5B%5B%5B%22maGuAc%22%2C%22%5B0%5D%22%2Cnull%2C%22generic%22%5D%5D%5D&",
      method: "POST"
    });
    const cookieHeader = r.headers.get('set-cookie');
    if (!cookieHeader) throw new Error('ماجبتش الكوكي');
    return cookieHeader.split(';')[0];
  },

  ask: async function (prompt, previousId = null) {
    if (!prompt?.trim()) throw new Error("السؤال خاوي اخويا.");
    let resumeArray = null, cookie = null;
    if (previousId) {
      try { const j = JSON.parse(atob(previousId)); resumeArray = j.newResumeArray; cookie = j.cookie; } catch { previousId = null; }
    }
    const finalPrompt = `${global.botPersonality}. ممنوع تطاكي الناس: ${prompt}`
    const headers = { "content-type": "application/x-www-form-urlencoded;charset=UTF-8", "cookie": cookie || await this.getNewCookie() };
    const b = [[finalPrompt], ["ar"], resumeArray];
    const a = [null, JSON.stringify(b)];
    const obj = { "f.req": JSON.stringify(a) };
    const body = new URLSearchParams(obj);
    const response = await fetch(`https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate?bl=boq_assistant-bard-web-server_20250729.06_p0&f.sid=4206607810970164620&hl=ar&_reqid=2813378&rt=c`, { headers, body, method: 'POST' });
    if (!response.ok) throw new Error(`سيرفر جوجل طاح: ${response.status}`);
    const data = await response.text();
    const match = data.matchAll(/^\d+\n(.+?)\n/gm);
    const chunks = Array.from(match, m => m[1]);
    let text, newResumeArray, found = false;
    for (const chunk of chunks.reverse()) {
      try {
        const realArray = JSON.parse(chunk);
        const parse1 = JSON.parse(realArray[0][2]);
        if (parse1?.[4]?.[0]?.[1]?.[0]) {
          newResumeArray = [...parse1[1], parse1[4][0][0]];
          text = parse1[4][0][1][0].replace(/\*\*(.+?)\*\*/g, `*$1*`);
          found = true;
          break;
        }
      } catch {}
    }
    if (!found) throw new Error("ما فهمتش الجواب ديال Gemini");
    const id = btoa(JSON.stringify({ newResumeArray, cookie: headers.cookie }));
    return { text, id };
  }
};

// ====== 2. دالة تحويل الصورة ======
async function toCartoon(buffer) {
    try {
        const base64 = buffer.toString('base64');
        const res = await fetch(`https://api.siputzx.my.id/api/ai/toon?image=data:image/jpeg;base64,${encodeURIComponent(base64)}`);
        const json = await res.json();
        if (json.status && json.data) return json.data;
        throw new Error("API رجع خطأ")
    } catch(e) {
        console.log("خطأ تحويل الصورة:", e)
        return null;
    }
}

async function downloadImage(conn, m) {
    for(let i = 0; i < 3; i++) {
        try {
            const buffer = await conn.downloadMediaMessage(m, 'buffer');
            if(buffer) return buffer;
        } catch(e) {
            console.log(`محاولة التحميل ${i+1} فشلت`)
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    return null;
}

function isAskingAboutDev(text) {
    const keywords = ['شكون صنعك', 'من صنعك', 'شكون طورك', 'من طورك', 'المطور', 'الصانع', 'شكون مول البوت', 'creator', 'owner', 'dev']
    return keywords.some(k => text.toLowerCase().includes(k))
}

// ====== 3. الهاندلر الرئيسي ======
let handler = async (m, { conn, text, usedPrefix, command }) => {
  const senderNumber = m.sender.split('@')[0]
  const isSuperOwner = SUPER_OWNERS.includes(senderNumber)
  const isOwner = OWNER_NUMBERS.includes(senderNumber)

  // امر التحكم في autoai - غير للاونر
  if (command === 'autoai') {
    if (!isOwner) return m.reply('❌ *هاد الأمر غير للمالك*')

    const arg = text.toLowerCase()
    if (arg === 'on') {
      global.autoGeminiGlobal = true
      return m.reply('✅ *تم تشغيل الذكاء الاصطناعي التلقائي*\nدابا البوت غادي يرد على اي رسالة بوحدو')
    }
    if (arg === 'off') {
      global.autoGeminiGlobal = false
      return m.reply('❌ *تم إيقاف الذكاء الاصطناعي التلقائي*\nدابا البوت مغاديش يرد تلقائيا')
    }
    return m.reply(`*📢 حالة autoai: ${global.autoGeminiGlobal? '✅ شغال' : '❌ مطفي'}*\n\n*الاستعمال:*\n.autoai on = تشغيل\n.autoai off = إيقاف`)
  }

  // امر التحكم في الشخصية - غير للسوبر اونر
  if (isSuperOwner && text.startsWith('شخصية ')) {
    const newStyle = text.replace('شخصية ', '').trim()
    const presets = {
      'مضحك': 'رد علي بالدارجة المغربية وباسلوب نكت وضحك وخفة دم',
      'حصين': 'رد علي بالدارجة المغربية وباسلوب رسمي ومحترم وجدي',
      'قصير': 'جاوب بكلمة وحدة ولا جوج بالدارجة المغربية',
      'رسمي': 'رد علي باللغة العربية الفصحى وباحترام',
      'شاعر': 'رد علي بالدارجة المغربية وباسلوب شاعري ومدح'
    }
    global.botPersonality = presets[newStyle] || `رد علي بالدارجة المغربية وباسلوب: ${newStyle}`
    return m.reply(`✅ *تم تغيير شخصية البوت*\n\n*الشخصية الجديدة:* ${newStyle}\n\nدابا غادي يهضر بهاد الستايل مع الناس كاملين`)
  }

  // امر عرض الشخصية الحالية
  if (isSuperOwner && text === 'الشخصية') {
    return m.reply(`*📢 الشخصية الحالية للبوت:*\n${global.botPersonality}\n\n*للتبديل:*\n.شخصية مضحك\n.شخصية حصين\n.شخصية {اي اسلوب بغيتي}`)
  }

  return m.reply(`*📢 لوحة تحكم DAMAR-MD:*\n\n*للكل:*\n.autoai on = تشغيل AI\n.autoai off = إيقاف AI\n\n*للسوبر اونر فقط:*\n.شخصية مضحك\n.الشخصية = عرض الشخصية`);
};

handler.before = async (m, { conn }) => {
  if (!global.autoGeminiGlobal) return; // الى كان مطفي يخرج
  if (m.isBaileys && m.fromMe) return;

  // ===== حالة 0: إلا سول على المطور =====
  if (m.text && isAskingAboutDev(m.text)) {
    const devMsg = `*🤖 أنا بوت ديال ${DEV_INFO.name}*\n\n` +
                   `*المطور:* ${DEV_INFO.name}\n` +
                   `*الواتساب:* ${DEV_INFO.number}\n` +
                   `*فيسبوك:* ${DEV_INFO.facebook}\n` +
                   `*انستغرام:* ${DEV_INFO.instagram}\n\n` +
                   `إلا بغيتي شي حاجة تواصل معاه 😎`
    return conn.sendMessage(m.chat, { text: devMsg }, { quoted: m })
  }

  // ===== حالة 1: إلا كانت صورة =====
  if (m.message?.imageMessage) {
    await conn.sendPresenceUpdate('recording', m.chat)
    m.reply("⏳ *كنحولها لك لرسوم كارتون... صبر 10 ثواني* 🎨")
    const buffer = await downloadImage(conn, m);
    if(!buffer) return m.reply("⚠️ ما قدرتش نحمل الصورة. عاود صيفطها وتكون أقل من 5MB")
    const cartoonUrl = await toCartoon(buffer);
    if (cartoonUrl) {
        await conn.sendMessage(m.chat, {
            image: { url: cartoonUrl },
            caption: "*ها النتيجة ديالك* 😄"
        }, { quoted: m });
    } else {
        await conn.sendMessage(m.chat, { text: "⚠️ سيرفر التحويل مشغول دابا. عاود من بعد 1 دقيقة" }, { quoted: m });
    }
    return;
  }

  // ===== حالة 2: إلا كان نص =====
  if (!m.text) return;
  if (/^[.#/\\!]/.test(m.text)) return; // الى بدا ب. او # ما يجاوبش

  await conn.sendPresenceUpdate('composing', m.chat)

  let attempts = 0;
  while (attempts < 2) {
    try {
      const prev = geminiSessions[m.sender];
      const result = await gemini.ask(m.text, prev);
      geminiSessions[m.sender] = result.id;
      await conn.sendMessage(m.chat, { text: result.text }, { quoted: m });
      return;
    } catch (e) {
      attempts++;
      if (attempts >= 2) {
        await conn.sendMessage(m.chat, { text: "⚠️ *خوادم Gemini ناعسة دابا* 😴" }, { quoted: m });
      } else {
        await new Promise(r => setTimeout(r, 1500));
      }
    }
  }
};

handler.command = ["autoai", "ai تلقائي", "شخصية", "الشخصية"];
handler.tags = ["ai"];
handler.help = ["autoai on", "autoai off", "شخصية مضحك"];
handler.limit = false;

export default handler;