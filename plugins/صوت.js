// 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 | فصل الصوت عن الموسيقى
// Developer: https://www.facebook.com/profile.php?id=61591783185803

import axios from "axios";
import * as cheerio from "cheerio";
import FormData from "form-data";

const BOT_NAME = "𝐃𝐀𝐌𝐀𝐑-𝐌𝐃";

const DEVELOPER_FACEBOOK =
  "https://www.facebook.com/profile.php?id=61591783185803";

class XMinus {

  // =========================
  // جلب التوكن
  // =========================

  async t() {
    try {
      const r = await axios.get("https://x-minus.pro/ai", {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
        }
      });

      const $ = cheerio.load(r.data);

      const token =
        $("input#vocal-cut-auth-key").attr("value");

      const cookie =
        r.headers["set-cookie"]?.join(";") || "";

      if (!token || !cookie) {
        throw new Error("ما قدرناش نجيبو معلومات الخدمة");
      }

      return {
        token,
        cookie
      };

    } catch (e) {
      console.error("❌ Token Error:", e.message);
      return null;
    }
  }

  // =========================
  // مراقبة حالة المهمة
  // =========================

  async c(id, key) {

    const url =
      "https://x-minus.pro/upload/vocalCutAi?check-job-status";

    const f = new FormData();

    f.append("job_id", id);
    f.append("auth_key", key);
    f.append("locale", "en_US");

    try {

      const r = await axios.post(url, f, {
        headers: {
          ...f.getHeaders(),
          "User-Agent":
            "Mozilla/5.0 Chrome/120 Safari/537.36"
        }
      });

      return r.data;

    } catch (e) {

      console.error(
        "❌ Check Error:",
        e.response?.data || e.message
      );

      return null;
    }
  }

  // =========================
  // انتظار انتهاء المعالجة
  // =========================

  async p(id, key, interval = 5000) {

    return new Promise((resolve, reject) => {

      let attempts = 0;

      const timer = setInterval(async () => {

        attempts++;

        // حماية من الانتظار اللانهائي
        if (attempts > 120) {
          clearInterval(timer);
          return reject(
            new Error("المعالجة خذات وقت بزاف")
          );
        }

        const data = await this.c(id, key);

        console.log(
          `🔄 XMinus Status ${attempts}:`,
          data
        );

        if (data?.status === "done") {

          clearInterval(timer);

          resolve(data);

        } else if (data?.status === "error") {

          clearInterval(timer);

          reject(
            new Error("فشل فصل الصوت")
          );
        }

      }, interval);
    });
  }

  // =========================
  // تجهيز روابط التحميل
  // =========================

  async d(id, stem) {

    try {

      const url =
        `https://mmd.uvronline.app/dl/vocalCutAi?job-id=${id}&stem=${stem}&fmt=mp3&cdn=0`;

      await axios.get(url, {
        maxRedirects: 0,

        validateStatus:
          status => status === 302
      });

      console.log(
        `✅ ${stem} واجد`
      );

    } catch (e) {

      console.error(
        `❌ Download Trigger ${stem}:`,
        e.message
      );
    }
  }

  // =========================
  // معالجة الأغنية
  // =========================

  async e(buf) {

    try {

      const auth = await this.t();

      if (!auth?.token || !auth?.cookie) {
        throw new Error(
          "ما قدرناش نجيبو التوكن"
        );
      }

      const {
        token,
        cookie
      } = auth;

      console.log(
        "📤 كنرفع الأغنية..."
      );

      const f = new FormData();

      f.append(
        "auth_key",
        token
      );

      f.append(
        "locale",
        "en_US"
      );

      f.append(
        "separation",
        "inst_vocal"
      );

      f.append(
        "separation_type",
        "vocals_music"
      );

      f.append(
        "format",
        "mp3"
      );

      f.append(
        "version",
        "3-4-0"
      );

      f.append(
        "model",
        "mdx_v2_vocft"
      );

      f.append(
        "aggressiveness",
        "2"
      );

      f.append(
        "lvpanning",
        "center"
      );

      f.append(
        "uvrbve_ct",
        "auto"
      );

      f.append(
        "pre_rate",
        "100"
      );

      f.append(
        "bve_preproc",
        "auto"
      );

      f.append(
        "show_setting_format",
        "0"
      );

      f.append(
        "hostname",
        "x-minus.pro"
      );

      f.append(
        "client_fp",
        "-"
      );

      f.append(
        "myfile",
        buf,
        {
          filename:
            `damar_${Date.now()}.mp3`,

          contentType:
            "audio/mpeg"
        }
      );

      const response = await axios.post(
        "https://x-minus.pro/upload/vocalCutAi?catch-file",
        f,
        {
          headers: {
            ...f.getHeaders(),
            accept: "*",
            cookie
          },

          maxContentLength:
            Infinity,

          maxBodyLength:
            Infinity,

          timeout:
            120000
        }
      );

      console.log(
        "📥 Upload Response:",
        response.data
      );

      const jobId =
        response.data?.job_id;

      const similarJobId =
        response.data?.similar_job_id;

      if (!jobId) {
        throw new Error(
          "ما تلقيناش Job ID"
        );
      }

      // انتظار انتهاء فصل الصوت

      await this.p(
        jobId,
        token
      );

      console.log(
        "✅ سالات المعالجة"
      );

      // تجهيز الصوت والموسيقى

      await this.d(
        jobId,
        "vocal"
      );

      await this.d(
        jobId,
        "inst"
      );

      const worker =
        response.data?.worker_sd;

      if (!worker) {
        throw new Error(
          "Worker ما موجودش"
        );
      }

      const base =
        `https://${worker}.uvronline.app/separated/`;

      const id =
        similarJobId || jobId;

      const source =
        encodeURIComponent(
          response.data?.source_filename ||
          "DAMAR-MD"
        );

      return {

        vocal:
          `${base}${id}_Vocals.mp3?fn=${source}%20(Vocals).mp3`,

        music:
          `${base}${id}_Instruments.mp3?fn=${source}%20(Instrumental).mp3`
      };

    } catch (e) {

      console.error(
        "❌ XMinus Error:",
        e.response?.data ||
        e.message
      );

      return null;
    }
  }

  // =========================
  // استقبال الرابط أو Buffer
  // =========================

  async generate({ input }) {

    try {

      let buffer;

      if (typeof input === "string") {

        if (
          input.startsWith("http://") ||
          input.startsWith("https://")
        ) {

          const response =
            await axios.get(input, {
              responseType:
                "arraybuffer",

              timeout:
                120000,

              maxContentLength:
                Infinity,

              maxBodyLength:
                Infinity
            });

          buffer =
            Buffer.from(response.data);

        } else if (
          input.startsWith("data:")
        ) {

          const base64 =
            input.split(",")[1];

          buffer =
            Buffer.from(
              base64,
              "base64"
            );

        } else {

          throw new Error(
            "الرابط غير صالح"
          );
        }

      } else if (
        Buffer.isBuffer(input)
      ) {

        buffer = input;

      } else {

        throw new Error(
          "الملف غير صالح"
        );
      }

      if (
        !buffer ||
        !buffer.length
      ) {
        throw new Error(
          "الملف خاوي"
        );
      }

      console.log(
        `📦 حجم الملف: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`
      );

      return await this.e(
        buffer
      );

    } catch (e) {

      console.error(
        "❌ Generate Error:",
        e.message
      );

      return null;
    }
  }
}


// =======================================
// WhatsApp Plugin
// =======================================

let handler = async (
  m,
  {
    conn,
    text,
    usedPrefix,
    command
  }
) => {

  try {

    const quoted =
      m.quoted
        ? m.quoted
        : m;

    const mime =
      (quoted.msg || quoted)
        .mimetype || "";

    const isAudio =
      /audio|video/.test(
        mime
      );

    // ===================================
    // التحقق من الإدخال
    // ===================================

    if (!text?.trim() && !isAudio) {

      return m.reply(
`🎵 *${BOT_NAME}*

بغيت تفصل الصوت على الموسيقى؟ 🎤🎶

📌 *طريقة الاستعمال:*

1️⃣ صيفط أغنية ودير عليها Reply وكتب:
${usedPrefix + command}

2️⃣ أو صيفط رابط مباشر ديال الأغنية:
${usedPrefix + command} https://example.com/song.mp3

🎤 غادي نعطيك الصوت بوحدو
🎶 وغادي نعطيك الموسيقى بوحدها

👑 *المطور:*
${DEVELOPER_FACEBOOK}`
      );
    }

    // ===================================
    // رسالة الانتظار
    // ===================================

    await m.reply(
`⏳ *${BOT_NAME}*

خليها عليا خويا، كنخدم على الأغنية دابا... 🎵

🎤 كنحاول نفصل الصوت
🎶 ونفصل الموسيقى

⚡ صبر شوية...`
    );

    const api =
      new XMinus();

    let input;

    // ===================================
    // إذا كان Reply على Audio / Video
    // ===================================

    if (isAudio) {

      console.log(
        "📥 كنحمل الملف من WhatsApp..."
      );

      input =
        await quoted.download();

    } else {

      // =================================
      // إذا كان رابط
      // =================================

      input =
        text.trim();
    }

    // ===================================
    // معالجة الأغنية
    // ===================================

    const result =
      await api.generate({
        input
      });

    if (!result) {

      return m.reply(
`❌ *${BOT_NAME}*

ما قدرتش نفصل الصوت من الأغنية.

جرب أغنية أخرى أو عاود المحاولة من بعد.`
      );
    }

    // ===================================
    // تحميل الصوت
    // ===================================

    console.log(
      "📥 كنحمل Vocal..."
    );

    const vocal =
      await axios.get(
        result.vocal,
        {
          responseType:
            "arraybuffer",

          timeout:
            120000,

          maxContentLength:
            Infinity,

          maxBodyLength:
            Infinity
        }
      );

    // ===================================
    // تحميل الموسيقى
    // ===================================

    console.log(
      "📥 كنحمل Instrumental..."
    );

    const music =
      await axios.get(
        result.music,
        {
          responseType:
            "arraybuffer",

          timeout:
            120000,

          maxContentLength:
            Infinity,

          maxBodyLength:
            Infinity
        }
      );

    // ===================================
    // إرسال صوت المغني
    // ===================================

    await conn.sendMessage(
      m.chat,
      {
        audio:
          Buffer.from(
            vocal.data
          ),

        mimetype:
          "audio/mpeg",

        fileName:
          "𝐃𝐀𝐌𝐀𝐑-𝐌𝐃-Vocals.mp3",

        ptt:
          false
      },
      {
        quoted:
          m
      }
    );

    // ===================================
    // إرسال الموسيقى
    // ===================================

    await conn.sendMessage(
      m.chat,
      {
        audio:
          Buffer.from(
            music.data
          ),

        mimetype:
          "audio/mpeg",

        fileName:
          "𝐃𝐀𝐌𝐀𝐑-𝐌𝐃-Instrumental.mp3",

        ptt:
          false
      },
      {
        quoted:
          m
      }
    );

    // ===================================
    // رسالة النهاية
    // ===================================

    await m.reply(
`✅ *${BOT_NAME}*

سالينا من الخدمة بنجاح 🎉

🎤 الصوت: تفرّق بوحدو
🎶 الموسيقى: تفرّقات بوحدها

👑 المطور:
${DEVELOPER_FACEBOOK}`
    );

  } catch (e) {

    console.error(
      "❌ Plugin Error:",
      e
    );

    await m.reply(
`❌ *${BOT_NAME}*

وقع مشكل وأنا كنحاول نفصل الأغنية.

🔄 عاود جرب من بعد أو جرب ملف صوتي آخر.`
    );
  }
};


// =======================================
// Commands
// =======================================

handler.help = [
  "صوت",
  "Sot"
];

handler.command = [
  "صوت",
  "Sot"
];

handler.tags = [
  "ai"
];

handler.limit = true;

export default handler;