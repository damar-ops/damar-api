import axios from "axios";
import * as cheerio from "cheerio";

const BOT_NAME = "𝐃𝐀𝐌𝐀𝐑-𝐌𝐃";
const DEVELOPER = "+212 633-226499";

if (global.igAutoDownload === undefined) {
  global.igAutoDownload = false;
}

/* =========================================================
   Instagram API
========================================================= */

class InstaSave {
  constructor() {
    this.client = axios.create({
      baseURL: "https://api.instasave.website",

      timeout: 30000,

      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",

        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",

        Referer:
          "https://instasave.website/download",

        "Accept-Language":
          "en-US,en;q=0.9"
      }
    });
  }

  async download(url) {
    try {
      const response = await this.client.post(
        "/media",
        `url=${encodeURIComponent(url)}&lang=en`
      );

      let html = String(response.data || "");

      console.log(
        `[${BOT_NAME}] API response length:`,
        html.length
      );

      /*
       * فك الترميز
       */
      html = html
        .replace(/\\"/g, '"')
        .replace(/\\\//g, "/")
        .replace(/\\x22/g, '"')
        .replace(/\\x20/g, " ")
        .replace(/&quot;/g, '"')
        .replace(/&#x2F;/g, "/")
        .replace(/\\u0026/g, "&");

      const results = [];

      /*
       * =====================================================
       * الطريقة 1: HTML القديم ديال Instasave
       * =====================================================
       */

      try {
        const $ = cheerio.load(html);

        $(".download-box .download-items").each(
          (_, el) => {
            const download =
              $(el)
                .find(".download-items__btn a")
                .attr("href");

            const thumb =
              $(el)
                .find(".download-items__thumb img")
                .attr("src");

            if (download) {
              results.push({
                download,
                thumb: thumb || ""
              });
            }
          }
        );
      } catch (e) {
        console.log(
          `[${BOT_NAME}] Cheerio parser error:`,
          e.message
        );
      }

      /*
       * =====================================================
       * الطريقة 2: استخراج روابط مباشرة من response
       * =====================================================
       */

      if (!results.length) {
        const matches =
          html.match(
            /https?:\/\/[^\s"'<>]+/gi
          ) || [];

        for (let link of matches) {
          link = link
            .replace(/\\+$/g, "")
            .replace(/[\\'")\]}>]+$/g, "");

          /*
           * تجاهل روابط المواقع العادية
           */
          if (
            link.includes("instasave.website") ||
            link.includes("google.com") ||
            link.includes("facebook.com")
          ) {
            continue;
          }

          /*
           * نقبل روابط الفيديو والصور
           */
          if (
            /\.(mp4|m4v|mov|jpg|jpeg|png|webp)(\?|&|$)/i.test(
              link
            )
          ) {
            if (
              !results.some(
                x => x.download === link
              )
            ) {
              results.push({
                download: link,
                thumb: ""
              });
            }
          }
        }
      }

      /*
       * =====================================================
       * الطريقة 3: البحث على أي URL داخل JSON
       * =====================================================
       */

      if (!results.length) {
        const urlRegex =
          /"(https?:\/\/[^"]+)"/g;

        let match;

        while (
          (match = urlRegex.exec(html)) !== null
        ) {
          let link = match[1];

          link = link
            .replace(/\\\//g, "/")
            .replace(/\\"/g, '"');

          if (
            /\.(mp4|m4v|mov|jpg|jpeg|png|webp)(\?|&|$)/i.test(
              link
            )
          ) {
            if (
              !results.some(
                x => x.download === link
              )
            ) {
              results.push({
                download: link,
                thumb: ""
              });
            }
          }
        }
      }

      /*
       * إزالة التكرار
       */
      const unique = [];

      for (const item of results) {
        if (!item.download) continue;

        if (
          !unique.some(
            x => x.download === item.download
          )
        ) {
          unique.push(item);
        }
      }

      console.log(
        `[${BOT_NAME}] Found media:`,
        unique.length
      );

      return {
        success: unique.length > 0,
        results: unique
      };

    } catch (error) {
      console.error(
        `[${BOT_NAME}] API ERROR:`,
        error.message
      );

      return {
        success: false,
        results: [],
        message: error.message
      };
    }
  }
}

const igApi = new InstaSave();

/* =========================================================
   استخراج النص
========================================================= */

function getText(m) {
  return (
    m?.text ||
    m?.body ||
    m?.message?.conversation ||
    m?.message?.extendedTextMessage?.text ||
    m?.message?.imageMessage?.caption ||
    m?.message?.videoMessage?.caption ||
    m?.msg?.text ||
    m?.msg?.caption ||
    ""
  );
}

/* =========================================================
   استخراج رابط Instagram
========================================================= */

function getInstagramUrl(text) {
  const match = String(text || "").match(
    /https?:\/\/(?:www\.)?instagram\.com\/[^\s]+/i
  );

  if (!match) return null;

  return match[0]
    .replace(/[)\]}>.,!?]+$/g, "");
}

/* =========================================================
   تحميل وإرسال الفيديو
========================================================= */

async function processInstagram(
  m,
  conn,
  instagramUrl
) {
  try {
    await m.react("🕓");
  } catch {}

  console.log(
    `[${BOT_NAME}] Downloading:`,
    instagramUrl
  );

  try {
    const result =
      await igApi.download(
        instagramUrl
      );

    if (
      !result.success ||
      !result.results?.length
    ) {
      try {
        await m.react("✖️");
      } catch {}

      return conn.reply(
        m.chat,

        `╭━━━〔 ${BOT_NAME} 〕━━━╮
┃ ❌ فشل تحميل Instagram
╰━━━━━━━━━━━━━━━━━━╯

الـAPI ما رجعش لينا رابط الفيديو 😅

🔎 جرب:
• Reel عمومي
• رابط Instagram كامل
• رابط آخر

👨‍💻 المطور:
${DEVELOPER}`,

        m
      );
    }

    let sent = false;

    for (const media of result.results) {
      if (!media.download) continue;

      try {
        console.log(
          `[${BOT_NAME}] Fetching media...`
        );

        const file =
          await axios.get(
            media.download,
            {
              responseType:
                "arraybuffer",

              timeout: 60000,

              maxContentLength:
                150 * 1024 * 1024,

              maxBodyLength:
                150 * 1024 * 1024,

              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",

                Referer:
                  "https://instasave.website/"
              }
            }
          );

        const buffer =
          Buffer.from(file.data);

        const contentType =
          String(
            file.headers["content-type"] || ""
          ).toLowerCase();

        const isVideo =
          contentType.includes("video") ||
          /\.mp4(\?|$)/i.test(
            media.download
          ) ||
          /\.m4v(\?|$)/i.test(
            media.download
          ) ||
          /\.mov(\?|$)/i.test(
            media.download
          );

        /*
         * الفيديو
         */
        if (isVideo) {
          await conn.sendMessage(
            m.chat,

            {
              video: buffer,

              mimetype:
                "video/mp4",

              caption:
                `╭━━━〔 ${BOT_NAME} 〕━━━╮
┃ ✅ تم التحميل
╰━━━━━━━━━━━━━━━━━━╯

🎬 ها هو الفيديو ديالك ❤️

👨‍💻 المطور:
${DEVELOPER}`
            },

            {
              quoted: m
            }
          );
        }

        /*
         * الصورة
         */
        else {
          await conn.sendMessage(
            m.chat,

            {
              image: buffer,

              caption:
                `╭━━━〔 ${BOT_NAME} 〕━━━╮
┃ ✅ تم التحميل
╰━━━━━━━━━━━━━━━━━━╯

🖼️ ها هي الصورة ديالك ❤️

👨‍💻 المطور:
${DEVELOPER}`
            },

            {
              quoted: m
            }
          );
        }

        sent = true;

        /*
         * غير أول ملف
         */
        break;

      } catch (error) {
        console.error(
          `[${BOT_NAME}] FILE ERROR:`,
          error.message
        );

        continue;
      }
    }

    if (!sent) {
      try {
        await m.react("✖️");
      } catch {}

      return conn.reply(
        m.chat,

        `╭━━━〔 ${BOT_NAME} 〕━━━╮
┃ ❌ فشل إرسال الفيديو
╰━━━━━━━━━━━━━━━━━━╯

لقينا الرابط ولكن ملف الفيديو
ما قدرناش نهبطوه دابا 😅

🔄 جرب Reel آخر.

👨‍💻 ${DEVELOPER}`,

        m
      );
    }

    try {
      await m.react("✅");
    } catch {}

  } catch (error) {
    console.error(
      `[${BOT_NAME}] ERROR:`,
      error.message
    );

    try {
      await m.react("✖️");
    } catch {}

    return conn.reply(
      m.chat,

      `❌ وقع مشكل وأنا كنحاول نهبط الفيديو 😅

🔄 عاود جرب رابط آخر.

🤖 ${BOT_NAME}
👨‍💻 ${DEVELOPER}`,

      m
    );
  }
}

/* =========================================================
   الأمر .ig
========================================================= */

const handler = async (
  m,
  {
    conn,
    args,
    isOwner
  }
) => {
  const action =
    String(args?.[0] || "")
      .toLowerCase();

  /*
   * .ig
   */
  if (!action) {
    return conn.reply(
      m.chat,

      `╭━━━〔 ${BOT_NAME} 〕━━━╮
┃ 📥 Instagram Downloader
╰━━━━━━━━━━━━━━━━━━╯

📊 الحالة:
${
  global.igAutoDownload
    ? "🟢 خدام"
    : "🔴 مطفي"
}

⚙️ الاستعمال:

➤ *.ig on*
🟢 تشغيل

➤ *.ig off*
🔴 إيقاف

📥 منين يكون خدام:
صيفط غير رابط Instagram
والبوت يهبط الفيديو بوحدو.

👨‍💻 المطور:
${DEVELOPER}`,

      m
    );
  }

  /*
   * المالك فقط
   */
  if (!isOwner) {
    return conn.reply(
      m.chat,

      `❌ غير المالك يقدر يتحكم فـ Instagram Downloader.`,

      m
    );
  }

  /*
   * ON
   */
  if (action === "on") {
    global.igAutoDownload = true;

    return conn.reply(
      m.chat,

      `╭━━━〔 ${BOT_NAME} 〕━━━╮
┃ 🟢 Instagram Downloader
╰━━━━━━━━━━━━━━━━━━╯

✅ تم تشغيل التحميل التلقائي.

📥 دابا صيفط غير رابط Instagram
والبوت غادي يهبط الفيديو بوحدو.

👨‍💻 ${DEVELOPER}`,

      m
    );
  }

  /*
   * OFF
   */
  if (action === "off") {
    global.igAutoDownload = false;

    return conn.reply(
      m.chat,

      `╭━━━〔 ${BOT_NAME} 〕━━━╮
┃ 🔴 Instagram Downloader
╰━━━━━━━━━━━━━━━━━━╯

⛔ تم إيقاف التحميل التلقائي.

📥 روابط Instagram ما غاديش تتحمل.

👨‍💻 ${DEVELOPER}`,

      m
    );
  }

  return conn.reply(
    m.chat,

    `❌ استعمل:

.ig
.ig on
.ig off`,

    m
  );
};

/* =========================================================
   التقاط روابط Instagram من الرسائل العادية
========================================================= */

handler.before = async (
  m,
  { conn }
) => {

  /*
   * مطفي
   */
  if (!global.igAutoDownload) {
    return;
  }

  const text = getText(m);

  if (!text) return;

  /*
   * تجاهل أوامر .ig
   */
  if (
    /^\.ig(?:\s|$)/i.test(
      text.trim()
    )
  ) {
    return;
  }

  /*
   * Instagram URL
   */
  const instagramUrl =
    getInstagramUrl(text);

  if (!instagramUrl) return;

  /*
   * تحميل
   */
  await processInstagram(
    m,
    conn,
    instagramUrl
  );
};

/* =========================================================
   Settings
========================================================= */

handler.command = ["ig"];

handler.help = [
  "ig",
  "ig on",
  "ig off"
];

handler.tags = [
  "downloader"
];

handler.limit = false;

export default handler;