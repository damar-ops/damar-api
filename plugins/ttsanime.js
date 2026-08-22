// instagram.com/noureddine_ouafy

import axios from "axios";

// ===============================
// دالة تحويل النص إلى حروف مزخرفة
// ===============================

async function generate(text) {
  const xstr =
    "abcdefghijklmnopqrstuvwxyz1234567890".split("");

  const xput =
    "𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵𝟬".split("");

  return text
    .toLowerCase()
    .split("")
    .map(ch => {
      const i = xstr.indexOf(ch);
      return i !== -1 ? xput[i] : ch;
    })
    .join("");
}

// ===============================
// قائمة الأصوات
// ===============================

const models = {
  miku: {
    voice_id: "67aee909-5d4b-11ee-a861-00163e2ac61b",
    voice_name: "Hatsune Miku"
  },

  goku: {
    voice_id: "67aed50c-5d4b-11ee-a861-00163e2ac61b",
    voice_name: "Goku"
  },

  eminem: {
    voice_id: "c82964b9-d093-11ee-bfb7-e86f38d7ec1a",
    voice_name: "Eminem"
  }
};

// ===============================
// IP عشوائي
// ===============================

function getRandomIp() {
  return Array.from(
    { length: 4 },
    () => Math.floor(Math.random() * 256)
  ).join(".");
}

// ===============================
// User Agents
// ===============================

const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",

  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15",

  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36"
];

// ===============================
// TTS
// ===============================

async function tts(text) {
  const agent =
    userAgents[
      Math.floor(Math.random() * userAgents.length)
    ];

  const tasks = Object.entries(models).map(
    async ([key, { voice_id, voice_name }]) => {

      const payload = {
        raw_text: text,

        url:
          "https://filme.imyfone.com/text-to-speech/anime-text-to-speech/",

        product_id: "200054",

        convert_data: [
          {
            voice_id,
            speed: "1",
            volume: "50",
            text,
            pos: 0
          }
        ]
      };

      try {
        const res = await axios.post(
          "https://voxbox-tts-api.imyfone.com/pc/v1/voice/tts",
          payload,
          {
            headers: {
              "Content-Type": "application/json",
              "Accept": "*/*",
              "X-Forwarded-For": getRandomIp(),
              "User-Agent": agent
            },

            timeout: 60000
          }
        );

        const result =
          res?.data?.data?.convert_result?.[0];

        if (!result?.oss_url) {
          return {
            model: key,
            voice_name,
            error: "لم يتم الحصول على رابط الصوت"
          };
        }

        return {
          model: key,
          voice_name,
          oss_url: result.oss_url
        };

      } catch (err) {
        console.error(
          `[TTS ${key}]`,
          err?.response?.data || err.message
        );

        return {
          model: key,
          voice_name,
          error:
            err?.response?.data?.message ||
            err.message
        };
      }
    }
  );

  return Promise.all(tasks);
}

// ===============================
// فحص نوع الملف الصوتي
// ===============================

async function getAudioType(url) {
  try {
    const response = await axios.head(url, {
      timeout: 20000,
      maxRedirects: 5
    });

    const type =
      response.headers["content-type"] || "";

    return type.toLowerCase();

  } catch (e) {
    console.log(
      "لم يتم تحديد نوع الصوت:",
      e.message
    );

    return "";
  }
}

// ===============================
// Handler
// ===============================

let handler = async (m, { conn, text }) => {

  if (!text || !text.trim()) {
    return m.reply(
      "❌ من فضلك أرسل النص الذي تريد تحويله إلى صوت.\n\nمثال:\n.ttsanime مرحبا كيف حالك"
    );
  }

  const msg = await m.reply(
    "🔄 جاري إنشاء الصوت..."
  );

  try {

    const results = await tts(text.trim());

    // أول صوت ناجح
    const first = results.find(
      r => r?.oss_url
    );

    if (!first) {

      console.error(
        "TTS RESULTS:",
        results
      );

      return m.reply(
        "❌ لم أستطع إنشاء الصوت.\nحاول مرة أخرى."
      );
    }

    const audioUrl = first.oss_url;

    console.log(
      "🔊 Audio URL:",
      audioUrl
    );

    // ===============================
    // معرفة نوع الصوت
    // ===============================

    const contentType =
      await getAudioType(audioUrl);

    console.log(
      "🎵 Content-Type:",
      contentType
    );

    // ===============================
    // إذا كان الصوت Opus
    // ===============================

    if (
      contentType.includes("ogg") ||
      contentType.includes("opus")
    ) {

      await conn.sendMessage(
        m.chat,
        {
          audio: {
            url: audioUrl
          },

          mimetype: "audio/ogg; codecs=opus",

          ptt: true
        },
        {
          quoted: m
        }
      );

    }

    // ===============================
    // إذا كان MP3
    // ===============================

    else {

      await conn.sendMessage(
        m.chat,
        {
          audio: {
            url: audioUrl
          },

          mimetype:
            contentType.includes("mpeg")
              ? "audio/mpeg"
              : "audio/mpeg",

          // مهم:
          // لا نحوله إلى Voice Note
          // لأن ذلك قد يحتاج FFmpeg
          ptt: false
        },
        {
          quoted: m
        }
      );

    }

    // ===============================
    // حذف رسالة الانتظار
    // ===============================

    try {

      if (msg?.key) {

        await conn.sendMessage(
          m.chat,
          {
            delete: msg.key
          }
        );

      }

    } catch {}

  } catch (error) {

    console.error(
      "TTS ERROR:",
      error?.response?.data ||
      error?.message ||
      error
    );

    return m.reply(
      "❌ وقع خطأ أثناء إنشاء الصوت."
    );
  }
};

// ===============================
// معلومات الأمر
// ===============================

handler.help = [
  "ttsanime <النص>"
];

handler.tags = [
  "ai"
];

handler.command = [
  "ttsanime"
];

handler.limit = false;

export default handler;