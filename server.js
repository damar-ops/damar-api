import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import pino from "pino";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================================
   CONFIG
========================================= */

const app = express();

const PORT = process.env.PORT || 8080;

const API_URL =
  "https://damar-api-production.up.railway.app";

const AUTH_DIR =
  path.join(__dirname, "auth_info");

/* =========================================
   AUTH FOLDER
========================================= */

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, {
    recursive: true
  });
}

/* =========================================
   EXPRESS
========================================= */

app.use(cors({
  origin: "*",
  methods: [
    "GET",
    "POST",
    "OPTIONS"
  ],
  allowedHeaders: [
    "Content-Type"
  ]
}));

app.use(express.json());

/* =========================================
   LOGGER
========================================= */

const logger = pino({
  level: "silent"
});

/* =========================================
   VARIABLES
========================================= */

let sock = null;

let whatsappStatus =
  "starting";

let connecting = false;

/* =========================================
   LOAD BAILEYS
========================================= */

async function loadBaileys() {

  const Baileys =
    await import(
      "@whiskeysockets/baileys"
    );

  const makeWASocket =
    Baileys.default?.default ||
    Baileys.default ||
    Baileys.makeWASocket;

  const useMultiFileAuthState =
    Baileys.useMultiFileAuthState;

  const DisconnectReason =
    Baileys.DisconnectReason;

  if (
    typeof makeWASocket !==
    "function"
  ) {
    throw new Error(
      "makeWASocket غير موجود في Baileys"
    );
  }

  if (
    typeof useMultiFileAuthState !==
    "function"
  ) {
    throw new Error(
      "useMultiFileAuthState غير موجود في Baileys"
    );
  }

  return {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason
  };
}

/* =========================================
   START WHATSAPP
========================================= */

async function startWhatsApp() {

  if (connecting) {
    console.log(
      "⚠️ WhatsApp راه كيتشغل..."
    );
    return;
  }

  connecting = true;

  whatsappStatus =
    "connecting";

  try {

    console.log(
      "📱 جاري تشغيل WhatsApp..."
    );

    const {
      makeWASocket,
      useMultiFileAuthState,
      DisconnectReason
    } = await loadBaileys();

    const {
      state,
      saveCreds
    } =
      await useMultiFileAuthState(
        AUTH_DIR
      );

    sock = makeWASocket({

      auth: state,

      logger,

      printQRInTerminal: false,

      browser: [
        "DAMAR-MD",
        "Chrome",
        "1.0.0"
      ],

      markOnlineOnConnect: false

    });

    /* =====================================
       SAVE SESSION
    ===================================== */

    sock.ev.on(
      "creds.update",
      saveCreds
    );

    /* =====================================
       CONNECTION
    ===================================== */

    sock.ev.on(
      "connection.update",
      async (update) => {

        const {
          connection,
          lastDisconnect
        } = update;

        if (connection) {

          console.log(
            "📡 WhatsApp:",
            connection
          );

        }

        /* ================================
           CONNECTED
        ================================= */

        if (
          connection === "open"
        ) {

          connecting = false;

          whatsappStatus =
            "connected";

          console.log("");
          console.log(
            "================================"
          );
          console.log(
            "✅ WHATSAPP CONNECTED"
          );
          console.log(
            "🤖 DAMAR-MD ONLINE"
          );
          console.log(
            "================================"
          );
          console.log("");

        }

        /* ================================
           CLOSED
        ================================= */

        if (
          connection === "close"
        ) {

          connecting = false;

          whatsappStatus =
            "disconnected";

          const statusCode =
            lastDisconnect
              ?.error
              ?.output
              ?.statusCode;

          console.log(
            "❌ WhatsApp disconnected"
          );

          console.log(
            "Status:",
            statusCode || "unknown"
          );

          const loggedOut =
            statusCode ===
            DisconnectReason?.loggedOut;

          if (!loggedOut) {

            console.log(
              "🔄 إعادة الاتصال بعد 5 ثواني..."
            );

            setTimeout(() => {

              startWhatsApp();

            }, 5000);

          } else {

            console.log(
              "⚠️ WhatsApp خرج من الجهاز."
            );

          }

        }

      }
    );

  } catch (error) {

    connecting = false;

    whatsappStatus =
      "error";

    console.error("");
    console.error(
      "❌ WhatsApp startup error:"
    );
    console.error(
      error
    );
    console.error("");

    setTimeout(() => {

      startWhatsApp();

    }, 10000);

  }

}

/* =========================================
   HOME
========================================= */

app.get(
  "/",
  (req, res) => {

    res.send(`
<!DOCTYPE html>

<html lang="ar" dir="rtl">

<head>

<meta charset="UTF-8">

<meta name="viewport"
content="width=device-width, initial-scale=1.0">

<title>DAMAR-MD</title>

<style>

* {
  box-sizing: border-box;
}

body {

  margin: 0;

  min-height: 100vh;

  background:
    radial-gradient(
      circle at top,
      #351052,
      #09070d 60%
    );

  color: white;

  font-family:
    Arial,
    sans-serif;

  display: flex;

  justify-content: center;

  padding: 25px 12px;

}

.container {

  width: 100%;

  max-width: 520px;

  background: #111;

  border: 2px solid #a83cff;

  border-radius: 25px;

  padding: 25px;

  box-shadow:
    0 0 25px #8c20ff,
    inset 0 0 30px #180c22;

}

h1 {

  text-align: center;

  color: #ff1717;

  font-size: 36px;

  margin:
    10px 0;

}

.subtitle {

  text-align: center;

  color: #d83c3c;

  margin-bottom: 25px;

}

.status {

  text-align: center;

  padding: 12px;

  margin-bottom: 20px;

  border-radius: 12px;

  background: #1d1d1d;

  color: #00ff88;

}

.box {

  border:
    2px solid #e00000;

  border-radius: 20px;

  padding: 20px;

}

label {

  display: block;

  margin:
    12px 0 7px;

  font-size: 18px;

}

input,
select {

  width: 100%;

  padding: 16px;

  border-radius: 14px;

  border:
    2px solid #444;

  background: #222;

  color: white;

  font-size: 17px;

  outline: none;

}

button {

  width: 100%;

  border: none;

  border-radius: 15px;

  padding: 17px;

  margin-top: 14px;

  color: white;

  font-size: 19px;

  font-weight: bold;

  cursor: pointer;

}

.pair {

  background:
    linear-gradient(
      90deg,
      #a348ff,
      #7132ff
    );

}

.groups {

  background:
    linear-gradient(
      90deg,
      #ff00bf,
      #293dff
    );

}

.contact {

  background:
    linear-gradient(
      90deg,
      #16d45b,
      #129a88
    );

}

.result {

  display: none;

  margin-top: 20px;

  text-align: center;

  padding: 18px;

  background: #1b1b1b;

  border-radius: 15px;

}

.code {

  font-size: 30px;

  letter-spacing: 5px;

  color: #00eaff;

  font-weight: bold;

  margin-top: 12px;

  direction: ltr;

}

.message {

  margin-top: 12px;

  color: #ddd;

  line-height: 1.7;

}

.footer {

  text-align: center;

  margin-top: 25px;

  color: #888;

}

</style>

</head>

<body>

<div class="container">

<h1>DAMAR-MD</h1>

<div class="subtitle">
جيب كود الربط وربط البوت
</div>

<div
id="status"
class="status">

🟡 جاري تشغيل API...

</div>

<div class="box">

<label>
📱 النمرة ديال الواتساب
</label>

<input
id="phone"
type="tel"
placeholder="212633226499"
autocomplete="off"
>

<label>
🖥️ ختار السيرفر
</label>

<select id="server">

<option value="1">
السيرفر 1
</option>

</select>

<button
class="pair"
onclick="getPairingCode()">

🔑 جيب كود الربط

</button>

<button
class="groups"
onclick="joinGroups()">

👥 دخول المجموعات

</button>

<button
class="contact"
onclick="contactDeveloper()">

📞 تواصل مع المطور

</button>

<div
id="result"
class="result">

<div>
🔑 كود الربط:
</div>

<div
id="code"
class="code">

--------

</div>

<div
id="message"
class="message">

</div>

</div>

</div>

<div class="footer">

المطور:
<strong
style="color:#00aaff">

DAMAR-MD

</strong>

<br><br>

DAMAR 2026 ©

</div>

</div>

<script>

const API =
"https://damar-api-production.up.railway.app";


/* =====================================
   CHECK API
===================================== */

async function checkAPI() {

  try {

    const response =
      await fetch(
        API + "/health",
        {
          method: "GET"
        }
      );

    if (!response.ok) {

      throw new Error(
        "API Error"
      );

    }

    const data =
      await response.json();

    const status =
      document.getElementById(
        "status"
      );

    if (
      data.whatsapp ===
      "connected"
    ) {

      status.innerHTML =
        "🟢 API ONLINE — WhatsApp متصل";

    } else {

      status.innerHTML =
        "🟢 API ONLINE — WhatsApp: "
        + data.whatsapp;

    }

  } catch (error) {

    document.getElementById(
      "status"
    ).innerHTML =
      "🔴 API غير متصل";

  }

}


/* =====================================
   GET PAIRING CODE
===================================== */

async function getPairingCode() {

  const input =
    document.getElementById(
      "phone"
    );

  const result =
    document.getElementById(
      "result"
    );

  const code =
    document.getElementById(
      "code"
    );

  const message =
    document.getElementById(
      "message"
    );

  let phone =
    input.value
      .replace(/\\D/g, "");

  if (!phone) {

    alert(
      "❌ دخل رقم الواتساب"
    );

    return;

  }

  if (phone.length < 8) {

    alert(
      "❌ رقم الهاتف غير صحيح"
    );

    return;

  }

  result.style.display =
    "block";

  code.innerText =
    "جاري...";

  message.innerText =
    "⏳ كنوجد كود الربط...";

  try {

    const response =
      await fetch(
        API + "/pairing-code",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            phone: phone
          })
        }
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data.success
    ) {

      throw new Error(
        data.message ||
        "فشل الاتصال بالـ API"
      );

    }

    if (
      data.alreadyPaired
    ) {

      code.innerText =
        "✓";

      message.innerText =
        "✅ الجهاز راه مربوط من قبل";

      return;

    }

    code.innerText =
      data.code ||
      "--------";

    message.innerHTML =
      "✅ تم إنشاء الكود"
      + "<br><br>"
      + "فتح WhatsApp → الأجهزة المرتبطة → ربط جهاز → الربط برقم الهاتف";

  } catch (error) {

    code.innerText =
      "❌";

    message.innerText =
      "خطأ: " +
      error.message;

  }

}


/* =====================================
   GROUPS
===================================== */

function joinGroups() {

  alert(
    "ضع رابط مجموعة WhatsApp هنا"
  );

}


/* =====================================
   DEVELOPER
===================================== */

function contactDeveloper() {

  alert(
    "ضع رابط التواصل مع المطور هنا"
  );

}


/* =====================================
   START
===================================== */

checkAPI();

setInterval(
  checkAPI,
  10000
);

</script>

</body>

</html>
`);

  }
);

/* =========================================
   HEALTH
========================================= */

app.get(
  "/health",
  (req, res) => {

    res.status(200).json({

      success: true,

      status: "online",

      bot: "DAMAR-MD",

      whatsapp:
        whatsappStatus,

      api: API_URL,

      port: PORT,

      time:
        new Date().toISOString()

    });

  }
);

/* =========================================
   STATUS
========================================= */

app.get(
  "/status",
  (req, res) => {

    res.json({

      success: true,

      bot: "DAMAR-MD",

      whatsapp:
        whatsappStatus,

      connected:
        whatsappStatus ===
        "connected",

      registered:
        !!sock?.user

    });

  }
);

/* =========================================
   PAIRING CODE
========================================= */

app.post(
  "/pairing-code",
  async (req, res) => {

    try {

      let phone =
        String(
          req.body?.phone || ""
        );

      phone =
        phone.replace(
          /\D/g,
          ""
        );

      if (!phone) {

        return res
          .status(400)
          .json({

            success: false,

            message:
              "❌ دخل رقم الواتساب"

          });

      }

      if (phone.length < 8) {

        return res
          .status(400)
          .json({

            success: false,

            message:
              "❌ رقم الهاتف غير صحيح"

          });

      }

      if (!sock) {

        await startWhatsApp();

        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              3000
            )
        );

      }

      if (!sock) {

        return res
          .status(503)
          .json({

            success: false,

            message:
              "⏳ WhatsApp مازال كيتشغل، عاود المحاولة"

          });

      }

      /* ================================
         CHECK REGISTERED
      ================================= */

      if (
        sock.authState
          ?.creds
          ?.registered
      ) {

        return res.json({

          success: true,

          alreadyPaired: true,

          message:
            "✅ الجهاز راه مربوط من قبل"

        });

      }

      console.log(
        "📱 Pairing request:",
        phone
      );

      /* ================================
         REQUEST CODE
      ================================= */

      const pairingCode =
        await sock.requestPairingCode(
          phone
        );

      console.log(
        "🔑 Pairing Code:",
        pairingCode
      );

      return res.json({

        success: true,

        code:
          pairingCode,

        phone:
          phone,

        message:
          "✅ تم إنشاء كود الربط"

      });

    } catch (error) {

      console.error(
        "❌ Pairing error:",
        error
      );

      return res
        .status(500)
        .json({

          success: false,

          message:
            "❌ فشل إنشاء كود الربط",

          error:
            error?.message ||
            String(error)

        });

    }

  }
);

/* =========================================
   404
========================================= */

app.use(
  (req, res) => {

    res.status(404).json({

      success: false,

      message:
        "❌ الصفحة غير موجودة"

    });

  }
);

/* =========================================
   START SERVER
========================================= */

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log("");
    console.log(
      "===================================="
    );
    console.log(
      "🚀 DAMAR-API STARTED"
    );
    console.log(
      "===================================="
    );
    console.log(
      "PORT:",
      PORT
    );
    console.log(
      "URL:",
      API_URL
    );
    console.log(
      "===================================="
    );
    console.log("");

    startWhatsApp();

  }
);