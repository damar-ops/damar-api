import express from "express";
import cors from "cors";
import pino from "pino";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  Browsers
} from "@whiskeysockets/baileys";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ======================================================
// DAMAR-MD API
// ======================================================

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 8080;

// Railway Volume إذا كان موجوداً يستعمل /data
// وإذا لم يكن موجوداً يستعمل مجلد محلي
const AUTH_DIR = process.env.AUTH_DIR || path.join(__dirname, "auth_info");

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

let sock = null;
let connecting = false;
let lastPairingCode = null;
let lastPhoneNumber = null;
let waStatus = "disconnected";

// ======================================================
// LOG
// ======================================================

const logger = pino({
  level: "silent"
});

function log(message) {
  console.log(`[DAMAR-MD] ${message}`);
}

// ======================================================
// PHONE NUMBER
// ======================================================

function cleanPhoneNumber(number) {
  return String(number || "")
    .replace(/\D/g, "")
    .replace(/^00/, "");
}

// ======================================================
// WHATSAPP START
// ======================================================

async function startWhatsApp() {
  if (connecting) {
    return;
  }

  connecting = true;

  try {
    log("📱 تشغيل WhatsApp...");

    const { state, saveCreds } =
      await useMultiFileAuthState(AUTH_DIR);

    sock = makeWASocket({
      auth: state,

      logger,

      browser: Browsers.ubuntu("Chrome"),

      printQRInTerminal: false,

      markOnlineOnConnect: false,

      syncFullHistory: false,

      connectTimeoutMs: 60000,

      defaultQueryTimeoutMs: 60000,

      keepAliveIntervalMs: 25000,

      generateHighQualityLinkPreview: false
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const {
        connection,
        lastDisconnect
      } = update;

      if (connection === "connecting") {
        waStatus = "connecting";
        log("📡 WhatsApp: connecting");
      }

      if (connection === "open") {
        waStatus = "connected";
        connecting = false;

        log("✅ WhatsApp متصل بنجاح");

        try {
          if (sock?.user?.id) {
            log(`👤 الحساب: ${sock.user.id}`);
          }
        } catch {}
      }

      if (connection === "close") {
        waStatus = "disconnected";
        connecting = false;

        const statusCode =
          lastDisconnect?.error?.output?.statusCode;

        log(`❌ WhatsApp disconnected: ${statusCode || "unknown"}`);

        if (statusCode === DisconnectReason.loggedOut) {
          log("🚪 تم تسجيل الخروج من WhatsApp");

          try {
            if (fs.existsSync(AUTH_DIR)) {
              fs.rmSync(AUTH_DIR, {
                recursive: true,
                force: true
              });
            }
          } catch (e) {
            console.log(e);
          }

          sock = null;
          return;
        }

        // إعادة الاتصال بعد 5 ثواني
        setTimeout(() => {
          startWhatsApp().catch(console.error);
        }, 5000);
      }
    });

  } catch (error) {
    connecting = false;
    waStatus = "error";

    console.error("❌ WhatsApp startup error:");
    console.error(error);

    setTimeout(() => {
      startWhatsApp().catch(console.error);
    }, 10000);
  }
}

// ======================================================
// HEALTH
// ======================================================

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    name: "DAMAR-MD",
    status: waStatus,
    whatsapp: Boolean(sock),
    time: new Date().toISOString()
  });
});

// ======================================================
// STATUS
// ======================================================

app.get("/status", (req, res) => {
  res.json({
    success: true,
    status: waStatus,
    connected: waStatus === "connected",
    phone: lastPhoneNumber || null,
    pairingCode: lastPairingCode || null
  });
});

// ======================================================
// PAIRING CODE
// ======================================================

app.post("/pairing-code", async (req, res) => {
  try {
    let phone = cleanPhoneNumber(req.body.phone);

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: "دخل رقم واتساب"
      });
    }

    // مثال:
    // المغرب 2126XXXXXXXX
    // بدون + وبدون 00
    if (phone.length < 8 || phone.length > 15) {
      return res.status(400).json({
        success: false,
        error: "رقم الهاتف غير صحيح"
      });
    }

    lastPhoneNumber = phone;

    log(`📞 طلب Pairing Code للرقم: ${phone}`);

    // إذا ما كاينش socket نشغلو
    if (!sock) {
      await startWhatsApp();
    }

    // انتظر حتى يكون socket جاهز
    let tries = 0;

    while (
      (!sock || waStatus === "disconnected") &&
      tries < 20
    ) {
      await new Promise(resolve =>
        setTimeout(resolve, 1000)
      );

      tries++;
    }

    if (!sock) {
      return res.status(503).json({
        success: false,
        error: "WhatsApp مازال ما بداش. عاود المحاولة بعد ثواني."
      });
    }

    // طلب كود الربط
    const code = await sock.requestPairingCode(phone);

    lastPairingCode = code;

    log(`🔑 Pairing Code: ${code}`);

    return res.json({
      success: true,
      phone,
      code,
      message:
        "دخل هذا الكود في WhatsApp > الأجهزة المرتبطة > ربط جهاز"
    });

  } catch (error) {

    console.error("❌ Pairing code error:");
    console.error(error);

    return res.status(500).json({
      success: false,
      error: error?.message || "فشل الحصول على كود الربط"
    });
  }
});

// ======================================================
// GROUPS
// ======================================================

app.get("/groups", async (req, res) => {
  try {

    if (!sock || waStatus !== "connected") {
      return res.status(503).json({
        success: false,
        error: "WhatsApp غير متصل"
      });
    }

    const groups = await sock.groupFetchAllParticipating();

    const result = Object.values(groups).map(group => ({
      id: group.id,
      name: group.subject,
      participants: group.participants?.length || 0
    }));

    res.json({
      success: true,
      count: result.length,
      groups: result
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      error: error?.message || "فشل جلب المجموعات"
    });
  }
});

// ======================================================
// LOGOUT
// ======================================================

app.post("/logout", async (req, res) => {

  try {

    if (sock) {
      await sock.logout();
    }

    sock = null;
    waStatus = "disconnected";

    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, {
        recursive: true,
        force: true
      });
    }

    res.json({
      success: true,
      message: "تم تسجيل الخروج"
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      error: error?.message || "Logout error"
    });
  }
});

// ======================================================
// WEBSITE
// ======================================================

app.get("/", (req, res) => {

  res.send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">

<head>

<meta charset="UTF-8">

<meta name="viewport"
content="width=device-width,initial-scale=1.0">

<title>DAMAR-MD</title>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(circle at top, #32104d, #09070d 55%);
  color: white;
  font-family: Arial, sans-serif;
  padding: 25px 12px;
}

.container {
  width: 100%;
  max-width: 520px;
  margin: auto;
}

.card {
  background: #111014;
  border: 2px solid #a83cff;
  border-radius: 25px;
  padding: 25px 18px;
  box-shadow:
    0 0 20px rgba(168,60,255,.45);
}

.logo {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
  margin: 0 auto 15px;
  border: 4px solid #00d9ff;
}

h1 {
  text-align: center;
  color: #ff2020;
  font-size: 34px;
  margin: 5px 0;
}

.subtitle {
  text-align: center;
  color: #d5d5d5;
  margin-bottom: 25px;
}

label {
  display: block;
  margin: 12px 5px 7px;
  font-size: 17px;
}

input,
select {
  width: 100%;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid #444;
  background: #202020;
  color: white;
  font-size: 17px;
  outline: none;
}

button {
  width: 100%;
  border: none;
  padding: 17px;
  margin-top: 15px;
  border-radius: 15px;
  color: white;
  font-size: 19px;
  font-weight: bold;
  cursor: pointer;
}

.pair {
  background: linear-gradient(
    90deg,
    #a343ff,
    #7130ff
  );
}

.groups {
  background: linear-gradient(
    90deg,
    #ff00bd,
    #3130ff
  );
}

.dev {
  background: linear-gradient(
    90deg,
    #15d95b,
    #139b8a
  );
}

.logout {
  background: #a00000;
}

.result {
  display: none;
  margin-top: 20px;
  padding: 18px;
  border-radius: 15px;
  background: #202020;
  text-align: center;
}

.code {
  font-size: 32px;
  font-weight: bold;
  letter-spacing: 5px;
  color: #c66cff;
  direction: ltr;
  margin: 12px 0;
}

.status {
  text-align: center;
  margin: 15px 0;
  padding: 12px;
  border-radius: 12px;
  background: #202020;
}

pre {
  white-space: pre-wrap;
  word-break: break-word;
  text-align: right;
  direction: rtl;
}

.footer {
  text-align: center;
  color: #777;
  margin-top: 20px;
}

</style>

</head>

<body>

<div class="container">

<div class="card">

<img
class="logo"
src="https://i.imgur.com/8Km9tLL.png"
onerror="this.style.display='none'"
>

<h1>DAMAR-MD</h1>

<div class="subtitle">
🔗 ربط WhatsApp بسهولة
</div>

<div class="status" id="status">
📡 جاري فحص WhatsApp...
</div>

<label>
📱 نمرة ديال WhatsApp
</label>

<input
id="phone"
type="tel"
placeholder="212633226499"
inputmode="numeric"
>

<label>
💻 السيرفر
</label>

<select>
<option>السيرفر 1</option>
</select>

<button
class="pair"
onclick="getCode()"
>
🔑 جيب كود الربط
</button>

<div
class="result"
id="result"
>

<div>
كود ربط الجهاز:
</div>

<div
class="code"
id="code"
>
--------
</div>

<div>
دخل الكود في WhatsApp:
<br>
الأجهزة المرتبطة ← ربط جهاز
</div>

</div>

<button
class="groups"
onclick="getGroups()"
>
👥 دخول المجموعات
</button>

<button
class="dev"
onclick="contactDeveloper()"
>
📞 تواصل مع المطور
</button>

<button
class="logout"
onclick="logout()"
>
🚪 تسجيل الخروج
</button>

<pre id="groups"></pre>

<div class="footer">
DAMAR-MD © 2026
</div>

</div>

</div>

<script>

const API = location.origin;

async function checkStatus() {

  try {

    const response =
      await fetch(API + "/status");

    const data =
      await response.json();

    const box =
      document.getElementById("status");

    if (data.connected) {

      box.innerHTML =
        "🟢 WhatsApp متصل";

    } else {

      box.innerHTML =
        "🔴 WhatsApp غير متصل";

    }

  } catch (error) {

    document.getElementById("status").innerHTML =
      "❌ السيرفر غير متاح";

  }
}

async function getCode() {

  const phone =
    document.getElementById("phone").value.trim();

  if (!phone) {

    alert("دخل رقم WhatsApp");

    return;
  }

  const button =
    document.querySelector(".pair");

  button.disabled = true;
  button.innerText =
    "⏳ جاري الحصول على الكود...";

  try {

    const response =
      await fetch(API + "/pairing-code", {

        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          phone: phone
        })

      });

    const data =
      await response.json();

    if (!data.success) {

      throw new Error(
        data.error || "حدث خطأ"
      );

    }

    document.getElementById("result")
      .style.display = "block";

    document.getElementById("code")
      .innerText = data.code;

    document.getElementById("status")
      .innerHTML =
      "🔑 تم إنشاء كود الربط";

  } catch (error) {

    alert(
      "❌ " + error.message
    );

  } finally {

    button.disabled = false;
    button.innerText =
      "🔑 جيب كود الربط";

  }

}

async function getGroups() {

  try {

    const response =
      await fetch(API + "/groups");

    const data =
      await response.json();

    if (!data.success) {

      alert(
        "❌ " + data.error
      );

      return;
    }

    let text =
      "👥 المجموعات: " +
      data.count +
      "\\n\\n";

    for (const group of data.groups) {

      text +=
        "• " +
        group.name +
        "\\n";

      text +=
        "ID: " +
        group.id +
        "\\n";

      text +=
        "الأعضاء: " +
        group.participants +
        "\\n\\n";

    }

    document.getElementById("groups")
      .innerText = text;

  } catch (error) {

    alert(
      "❌ تعذر الاتصال بالسيرفر"
    );

  }

}

function contactDeveloper() {

  window.open(
    "https://wa.me/212633226499",
    "_blank"
  );

}

async function logout() {

  if (!confirm(
    "واش متأكد بغيتي تسجل الخروج؟"
  )) {
    return;
  }

  try {

    const response =
      await fetch(API + "/logout", {
        method: "POST"
      });

    const data =
      await response.json();

    alert(
      data.message ||
      "تم تسجيل الخروج"
    );

    checkStatus();

  } catch (error) {

    alert(
      "❌ فشل تسجيل الخروج"
    );

  }

}

checkStatus();

setInterval(
  checkStatus,
  10000
);

</script>

</body>

</html>
  `);
});

// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, "0.0.0.0", async () => {

  console.log("");
  console.log("======================================");
  console.log("🚀 DAMAR-API STARTED");
  console.log("======================================");
  console.log(`PORT: ${PORT}`);
  console.log(
    `URL: https://damar-api-production.up.railway.app`
  );
  console.log("======================================");
  console.log("");

  // تشغيل WhatsApp
  startWhatsApp().catch(error => {
    console.error(
      "WhatsApp initial error:",
      error
    );
  });

});