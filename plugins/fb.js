/*
  Facebook Auto Downloader
  Bot: 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃
  Developer: +212 633-226499

  .Fb
  .Fb on
  .Fb off

  من بعد .Fb on:
  صيفط رابط Facebook فقط
*/

import axios from "axios";
import * as cheerio from "cheerio";

const BOT_NAME = "𝐃𝐀𝐌𝐀𝐑-𝐌𝐃";
const DEV_NUMBER = "+212 633-226499";


// =====================================================
// SETTINGS
// =====================================================

function getSettings() {
  if (!global.db) global.db = {};
  if (!global.db.data) global.db.data = {};

  if (typeof global.db.data.fbDownloader === "undefined") {
    global.db.data.fbDownloader = false;
  }

  return global.db.data;
}


// =====================================================
// OWNER
// =====================================================

function cleanNumber(number) {
  return String(number || "").replace(/\D/g, "");
}

function isOwner(m) {

  if (m?.isOwner === true) {
    return true;
  }

  const sender = cleanNumber(
    m?.sender ||
    m?.key?.participant ||
    m?.key?.remoteJid ||
    ""
  );

  const developer = cleanNumber(DEV_NUMBER);

  if (
    sender &&
    developer &&
    (
      sender === developer ||
      sender.endsWith(developer) ||
      developer.endsWith(sender)
    )
  ) {
    return true;
  }

  if (Array.isArray(global.OWNER_NUMBERS)) {

    for (const number of global.OWNER_NUMBERS) {

      const owner = cleanNumber(number);

      if (
        owner &&
        (
          sender === owner ||
          sender.endsWith(owner) ||
          owner.endsWith(sender)
        )
      ) {
        return true;
      }
    }
  }

  if (Array.isArray(global.owner)) {

    for (const item of global.owner) {

      const number =
        Array.isArray(item)
          ? item[0]
          : item;

      const owner = cleanNumber(number);

      if (
        owner &&
        (
          sender === owner ||
          sender.endsWith(owner) ||
          owner.endsWith(sender)
        )
      ) {
        return true;
      }
    }
  }

  return false;
}


// =====================================================
// FACEBOOK URL
// =====================================================

function getFacebookUrl(text) {

  if (!text) return null;

  const match = String(text).match(
    /https?:\/\/(?:www\.|m\.|mbasic\.)?(?:facebook\.com|fb\.watch)\/[^\s<>"']+/i
  );

  if (!match) {
    return null;
  }

  return match[0].replace(
    /[)\]}>.,!?]+$/g,
    ""
  );
}


// =====================================================
// HEADERS
// =====================================================

function headers(referer = "https://www.facebook.com/") {

  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",

    "Accept":
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

    "Accept-Language":
      "en-US,en;q=0.9",

    "Referer":
      referer
  };
}


// =====================================================
// GET TOKEN
// =====================================================

async function getToken() {

  const response = await axios.get(
    "https://fbdownloader.to/id",
    {
      timeout: 30000,
      headers: headers(
        "https://fbdownloader.to/id"
      )
    }
  );

  const html =
    String(response.data || "");

  const exp =
    html.match(
      /k_exp=["']([^"']+)["']/i
    );

  const token =
    html.match(
      /k_token=["']([^"']+)["']/i
    );

  if (!exp || !token) {
    throw new Error(
      "FB_TOKEN_NOT_FOUND"
    );
  }

  return {
    k_exp: exp[1],
    k_token: token[1]
  };
}


// =====================================================
// METHOD 1
// =====================================================

async function methodOne(fbUrl) {

  const {
    k_exp,
    k_token
  } = await getToken();

  const body =
    new URLSearchParams();

  body.set(
    "k_exp",
    k_exp
  );

  body.set(
    "k_token",
    k_token
  );

  body.set(
    "p",
    "home"
  );

  body.set(
    "q",
    fbUrl
  );

  body.set(
    "lang",
    "en"
  );

  body.set(
    "v",
    "v2"
  );

  body.set(
    "W",
    ""
  );

  const response =
    await axios.post(
      "https://fbdownloader.to/api/ajaxSearch",
      body,
      {
        timeout: 90000,

        headers: {
          ...headers(
            "https://fbdownloader.to/id"
          ),

          "Content-Type":
            "application/x-www-form-urlencoded; charset=UTF-8",

          "X-Requested-With":
            "XMLHttpRequest",

          "Origin":
            "https://fbdownloader.to"
        }
      }
    );

  const html =
    String(
      response.data?.data ||
      response.data?.html ||
      ""
    );

  if (!html) {
    throw new Error(
      "FB_EMPTY_RESULT"
    );
  }

  const $ =
    cheerio.load(html);

  const results = [];

  $("a").each(
    (index, element) => {

      const href =
        $(element).attr("href");

      const videoUrl =
        $(element).attr(
          "data-videourl"
        );

      const dataUrl =
        $(element).attr(
          "data-url"
        );

      const url =
        href ||
        videoUrl ||
        dataUrl;

      if (
        !url ||
        !url.startsWith("http")
      ) {
        return;
      }

      results.push({
        url,
        quality:
          $(element)
            .text()
            .replace(/\s+/g, " ")
            .trim() ||
          "Video"
      });
    }
  );

  const regex =
    /https?:\/\/[^"'\\\s<>]+/g;

  const links =
    html.match(regex) || [];

  for (let url of links) {

    url =
      url
        .replace(/&amp;/g, "&")
        .replace(/\\u0026/g, "&")
        .replace(/\\\//g, "/");

    if (
      url.includes(".mp4") ||
      url.includes("video") ||
      url.includes("fbcdn")
    ) {

      results.push({
        url,
        quality: "Video"
      });
    }
  }

  return unique(results);
}


// =====================================================
// METHOD 2
// =====================================================

async function methodTwo(fbUrl) {

  const response =
    await axios.get(
      fbUrl,
      {
        timeout: 90000,
        maxRedirects: 10,
        headers: headers(
          "https://www.facebook.com/"
        )
      }
    );

  const html =
    String(response.data || "");

  if (!html) {
    throw new Error(
      "FACEBOOK_EMPTY_PAGE"
    );
  }

  const results = [];

  const patterns = [

    {
      regex:
        /"browser_native_hd_url":"(.*?)"/g,
      quality:
        "HD"
    },

    {
      regex:
        /"browser_native_sd_url":"(.*?)"/g,
      quality:
        "SD"
    },

    {
      regex:
        /"playable_url_quality_hd":"(.*?)"/g,
      quality:
        "HD"
    },

    {
      regex:
        /"playable_url":"(.*?)"/g,
      quality:
        "SD"
    }
  ];

  for (
    const item of patterns
  ) {

    let match;

    while (
      (match =
        item.regex.exec(html))
    ) {

      let url =
        match[1];

      url =
        url
          .replace(/\\u0025/g, "%")
          .replace(/\\u0026/g, "&")
          .replace(/\\u003D/g, "=")
          .replace(/\\u002F/g, "/")
          .replace(/\\\//g, "/");

      if (
        url.startsWith("http")
      ) {

        results.push({
          url,
          quality:
            item.quality
        });
      }
    }
  }

  return unique(results);
}


// =====================================================
// UNIQUE
// =====================================================

function unique(list) {

  const seen =
    new Set();

  const result = [];

  for (
    const item of list
  ) {

    if (
      !item?.url ||
      seen.has(item.url)
    ) {
      continue;
    }

    seen.add(item.url);

    result.push(item);
  }

  return result;
}


// =====================================================
// DOWNLOAD VIDEO
// =====================================================

async function downloadFacebook(fbUrl) {

  let results = [];

  const errors = [];

  // Method 1
  try {

    results =
      await methodOne(
        fbUrl
      );

  } catch (e) {

    errors.push(
      "METHOD1: " +
      e.message
    );

    console.log(
      "[FB METHOD 1 ERROR]",
      e.message
    );
  }


  // Method 2
  if (!results.length) {

    try {

      results =
        await methodTwo(
          fbUrl
        );

    } catch (e) {

      errors.push(
        "METHOD2: " +
        e.message
      );

      console.log(
        "[FB METHOD 2 ERROR]",
        e.message
      );
    }
  }


  if (!results.length) {

    throw new Error(
      errors.join(" | ") ||
      "NO_VIDEO_FOUND"
    );
  }


  // HD first
  results.sort(
    (a, b) => {

      const ah =
        /hd|720|1080/i.test(
          a.quality
        );

      const bh =
        /hd|720|1080/i.test(
          b.quality
        );

      return (
        Number(bh) -
        Number(ah)
      );
    }
  );


  let lastError =
    null;


  // نجرب الروابط كاملين
  for (
    const item of results
  ) {

    try {

      const response =
        await axios.get(
          item.url,
          {
            responseType:
              "arraybuffer",

            timeout:
              180000,

            maxContentLength:
              Infinity,

            maxBodyLength:
              Infinity,

            headers: {
              "User-Agent":
                "Mozilla/5.0",

              "Accept":
                "video/mp4,video/*,*/*",

              "Referer":
                "https://www.facebook.com/"
            }
          }
        );

      const buffer =
        Buffer.from(
          response.data
        );

      if (
        buffer.length < 1000
      ) {
        throw new Error(
          "VIDEO_EMPTY"
        );
      }

      return {
        buffer,
        quality:
          item.quality
      };

    } catch (e) {

      lastError =
        e;

      console.log(
        "[FB VIDEO ERROR]",
        e.message
      );
    }
  }


  throw new Error(
    lastError?.message ||
    "VIDEO_DOWNLOAD_FAILED"
  );
}


// =====================================================
// COMMAND
// =====================================================

const handler = async (
  m,
  {
    conn,
    args
  } = {}
) => {

  const action =
    String(
      args?.[0] || ""
    )
      .toLowerCase()
      .trim();


  // .Fb
  if (!action) {

    const status =
      getSettings()
        .fbDownloader;

    return m.reply(
`╭──〔 🤖 ${BOT_NAME} 〕──╮
│
│ 📥 Facebook Downloader
│
│ الحالة:
│ ${status
  ? "🟢 خدام"
  : "🔴 مطفي"}
│
│ • .Fb on
│   🟢 تشغيل
│
│ • .Fb off
│   🔴 إيقاف
│
│ من بعد التشغيل:
│
│ صيفط غير رابط Facebook
│ والبوت غادي يهبط الفيديو
│ أوتوماتيكياً 📥
│
│ 🌍 المجموعات + الخاص
│
│ 👨‍💻 ${DEV_NUMBER}
│
╰────────────────────╯`
    );
  }


  // ON
  if (action === "on") {

    if (!isOwner(m)) {

      return m.reply(
`❌ غير المالك يقدر يشغل الخدمة.

🤖 ${BOT_NAME}`
      );
    }

    getSettings()
      .fbDownloader = true;

    return m.reply(
`╭──〔 🤖 ${BOT_NAME} 〕──╮
│
│ 🟢 Facebook Downloader
│
│ ✅ تخدمات بنجاح!
│
│ دابا صيفط غير رابط
│ Facebook والبوت يهبطو
│ أوتوماتيكياً 📥
│
│ 🌍 المجموعات + الخاص
│
│ 👨‍💻 ${DEV_NUMBER}
╰────────────────────╯`
    );
  }


  // OFF
  if (action === "off") {

    if (!isOwner(m)) {

      return m.reply(
`❌ غير المالك يقدر يوقف الخدمة.

🤖 ${BOT_NAME}`
      );
    }

    getSettings()
      .fbDownloader = false;

    return m.reply(
`╭──〔 🤖 ${BOT_NAME} 〕──╮
│
│ 🔴 Facebook Downloader
│
│ ⛔ توقف بنجاح!
│
│ روابط Facebook
│ ما غاديش تتحمل دابا.
│
│ 👨‍💻 ${DEV_NUMBER}
╰────────────────────╯`
    );
  }


  return m.reply(
`❌ الأمر غير صحيح.

استعمل:

.Fb
.Fb on
.Fb off`
  );
};


// =====================================================
// COMMAND SETTINGS
// =====================================================

handler.command =
  /^fb$/i;

handler.help =
  [
    "fb",
    "fb on",
    "fb off"
  ];

handler.tags =
  [
    "downloader"
  ];

handler.limit =
  false;


// =====================================================
// AUTO DOWNLOADER
// =====================================================

handler.all =
  async function (
    m,
    context = {}
  ) {

    try {

      // ===============================================
      // IMPORTANT
      // ===============================================

      /*
        فبعض نسخ Gaff:
        handler.all ما كيعطيش conn فـcontext.

        لذلك كنحاولو نجيبو من:
        context.conn
        أو m.conn
        أو global.conn
      */

      const conn =
        context?.conn ||
        m?.conn ||
        global.conn;


      // إلا ماكانش connection
      if (!conn) {

        console.log(
          "[FB] WhatsApp connection not found"
        );

        return;
      }


      // ===============================================
      // STATUS
      // ===============================================

      if (
        !getSettings()
          .fbDownloader
      ) {
        return;
      }


      // ===============================================
      // MESSAGE TEXT
      // ===============================================

      const text =
        m?.text ||
        m?.body ||
        m?.message?.conversation ||
        m?.message?.extendedTextMessage?.text ||
        m?.message?.imageMessage?.caption ||
        m?.message?.videoMessage?.caption ||
        "";


      if (!text) {
        return;
      }


      const cleanText =
        String(text).trim();


      // تجاهل الأوامر
      if (
        cleanText.startsWith(".")
      ) {
        return;
      }


      // ===============================================
      // FACEBOOK URL
      // ===============================================

      const fbUrl =
        getFacebookUrl(
          cleanText
        );


      if (!fbUrl) {
        return;
      }


      // ===============================================
      // LOADING
      // ===============================================

      await m.reply(
`⏳ كنقلب على الفيديو ديال Facebook... 📥

🤖 ${BOT_NAME}`
      );


      // ===============================================
      // DOWNLOAD
      // ===============================================

      const result =
        await downloadFacebook(
          fbUrl
        );


      // ===============================================
      // SEND VIDEO
      // ===============================================

      await conn.sendMessage(
        m.chat,
        {
          video:
            result.buffer,

          mimetype:
            "video/mp4",

          fileName:
            "DAMAR-FB.mp4",

          caption:
`╭──〔 🤖 ${BOT_NAME} 〕──╮
│
│ ✅ الفيديو واجد!
│
│ 📥 Facebook
│ 🎥 الجودة: ${result.quality}
│
│ ⚡ تحميل أوتوماتيكي
│
│ 👨‍💻 ${DEV_NUMBER}
│
╰────────────────────╯`
        },
        {
          quoted: m
        }
      );

    } catch (error) {

      console.error(
        "\n========== FACEBOOK ERROR =========="
      );

      console.error(
        error?.stack ||
        error?.message ||
        String(error)
      );

      console.error(
        "====================================\n"
      );


      await m.reply(
`❌ ماقدرتش نهبط هاد الفيديو 😅

🔎 السبب:
${error?.message || "UNKNOWN_ERROR"}

🔄 جرب رابط Facebook عمومي آخر.

🤖 ${BOT_NAME}`
      );
    }
  };


export default handler;