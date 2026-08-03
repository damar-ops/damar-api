const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const pino = require("pino");

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

const PORT = process.env.PORT || 8080;
const API_URL = "https://damar-api-production.up.railway.app";

const SESSION_DIR = path.join(__dirname, "auth_info");

if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

let sock = null;
let baileys = null;
let connecting = false;
let lastPairingCode = null;
let lastPhone = null;
let connectionStatus = "starting";

const logger = pino({
  level: "silent"
});

/* =========================
   BAILEYS
========================= */

async function loadBaileys() {
  if (!baileys) {
    baileys = await import("@whiskeysockets/baileys");
  }

  return baileys;
}

/* =========================
   START WHATSAPP
========================= */

async function startWhatsApp() {

  if (connecting) return;

  connecting = true;
  connectionStatus = "connecting";

  try {

    const {
      default: makeWASocket,
      useMultiFileAuthState,
      DisconnectReason
    } = await loadBaileys();

    const { state, saveCreds } =
      await useMultiFileAuthState(SESSION_DIR);

    sock = makeWASocket({
      auth: state,

      logger,

      printQRInTerminal: false,

      browser: [
        "DAMAR-MD",
        "Chrome",
        "1.0.0"
      ],

      generateHighQualityLinkPreview: false
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {

      const {
        connection,
        lastDisconnect
      } = update;

      console.log("WhatsApp:", connection || "update");

      if (connection === "open") {

        connectionStatus = "connected";
        connecting = false;

        console.log("✅ DAMAR-MD WhatsApp connected");

      }

      if (connection === "close") {

        connectionStatus = "disconnected";
        connecting = false;

        const code =
          lastDisconnect?.error?.output?.statusCode;

        console.log("❌ WhatsApp disconnected:", code);

        if (code !== DisconnectReason.loggedOut) {

          setTimeout(() => {
            startWhatsApp();
          }, 5000);

        } else {

          console.log(
            "⚠️ WhatsApp logged out. Delete auth_info and pair again."
          );

        }
      }
    });

  } catch (error) {

    connecting = false;
    connectionStatus = "error";

    console.error("WhatsApp error:", error);

    setTimeout(() => {
      startWhatsApp();
    }, 10000);
  }
}

/* =========================
   HEALTH
========================= */

app.get("/health", (req, res) => {

  res.status(200).json({
    success: true,
    status: "online",
    bot: "DAMAR-MD",
    api: API_URL,
    whatsapp: connectionStatus,
    time: new Date().toISOString()
  });

});

/* =========================
   STATUS
========================= */

app.get("/status", (req, res) => {

  res.json({
    success: true,
    bot: "DAMAR-MD",
    whatsapp: connectionStatus,
    paired: !!sock?.user,
    phone: lastPhone
  });

});

/* =========================
   PAIRING CODE
========================= */

app.post("/pairing-code", async (req, res) => {

  try {

    let phone = String(req.body.phone || "");

    phone = phone.replace(/\D/g, "");

    if (!phone) {

      return res.status(400).json({
        success: false,
        message: "دخل رقم الواتساب أولا"
      });

    }

    if (phone.length < 8) {

      return res.status(400).json({
        success: false,
        message: "رقم الهاتف غير صحيح"
      });

    }

    if (!sock) {

      await startWhatsApp();

      await new Promise(resolve =>
        setTimeout(resolve, 3000)
      );
    }

    if (!sock) {

      return res.status(503).json({
        success: false,
        message: "WhatsApp مازال كيتشغل، عاود المحاولة"
      });

    }

    if (sock.authState?.creds?.registered) {

      return res.json({
        success: true,
        alreadyPaired: true,
        message: "الجهاز راه مربوط من قبل"
      });

    }

    lastPhone = phone;

    const code =
      await sock.requestPairingCode(phone);

    lastPairingCode = code;

    console.log(
      `🔑 Pairing Code for ${phone}: ${code}`
    );

    return res.json({
      success: true,
      phone,
      code,
      message: "تم إنشاء كود الربط"
    });

  } catch (error) {

    console.error("Pairing error:", error);

    return res.status(500).json({
      success: false,
      message: "فشل إنشاء كود الربط",
      error: error?.message || String(error)
    });

  }

});

/* =========================
   HOME PAGE
========================= */

app.get("/", (req, res) => {

  res.send(`<!DOCTYPE html>

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
    radial-gradient(circle at top,#30104d,#09070d 55%);
  color: white;
  font-family: Arial,sans-serif;
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

.logo {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  margin: auto;
  display: block;
  object-fit: cover;
  border: 4px solid #00d9ff;
  box-shadow: 0 0 20px #00d9ff;
}

h1 {
  text-align: center;
  color: #ff1b1b;
  font-size: 36px;
  margin: 18px 0 5px;
}

.subtitle {
  text-align: center;
  color: #c93434;
  margin-bottom: 25px;
}

.box {
  border: 2px solid #e00000;
  border-radius: 20px;
  padding: 20px;
}

label {
  display: block;
  margin: 12px 0 7px;
  font-size: 18px;
}

input,select {
  width: 100%;
  padding: 16px;
  border-radius: 14px;
  border: 2px solid #444;
  background: #222;
  color: white;
  font-size: 17px;
  outline: none;
}

button {
  width: 100%;
  border: 0;
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
    linear-gradient(90deg,#a348ff,#7132ff);
}

.groups {
  background:
    linear-gradient(90deg,#ff00bf,#293dff);
}

.contact {
  background:
    linear-gradient(90deg,#16d45b,#129a88);
}

#result {
  display: none;
  margin-top: 20px;
  text-align: center;
  padding: 18px;
  background: #1b1b1b;
  border-radius: 15px;
}

.code {
  font-size: 32px;
  letter-spacing: 5px;
  color: #00eaff;
  font-weight: bold;
  margin-top: 10px;
  direction: ltr;
}

.status {
  text-align: center;
  margin: 18px 0;
  color: #00ff88;
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

<img
class="logo"
src="https://i.imgur.com/8Km9tLL.png"
onerror="this.style.display='none'"
>

<h1>DAMAR-MD</h1>

<div class="subtitle">
جيب الكود ديال الربط وربط البوت
</div>

<div id="status"
class="status">
🟡 جاري تشغيل DAMAR-API...
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
onclick="getCode()">

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

<div id="result">

<div>
كود الربط ديالك:
</div>

<div
id="code"
class="code">
--------
</div>

<div id="message"></div>

</div>

</div>

<div class="footer">

المطور:
<b style="color:#00aaff">
DAMAR-MD
</b>

<br><br>

DAMAR 2026 ©

</div>

</div>

<script>

const API =
"https://damar-api-production.up.railway.app";


async function checkStatus() {

  try {

    const response =
      await fetch(API + "/health");

    if (!response.ok)
      throw new Error();

    const data =
      await response.json();

    document.getElementById("status")
      .innerHTML =
      "🟢 DAMAR-API ONLINE";

  } catch (error) {

    document.getElementById("status")
      .innerHTML =
      "🔴 API غير متصل";

  }

}


async function getCode() {

  const phone =
    document.getElementById("phone")
      .value
      .replace(/\\D/g,"");

  if (!phone) {

    alert("دخل رقم الواتساب");

    return;
  }

  const result =
    document.getElementById("result");

  const code =
    document.getElementById("code");

  const message =
    document.getElementById("message");

  result.style.display = "block";

  code.innerText = "جاري...";

  message.innerText =
    "⏳ كنوجد كود الربط...";

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

    if (!response.ok ||
        !data.success) {

      throw new Error(
        data.message ||
        "Failed to fetch"
      );

    }

    if (data.alreadyPaired) {

      code.innerText = "✓";

      message.innerText =
        "✅ الجهاز راه مربوط من قبل";

      return;
    }

    code.innerText =
      data.code || "--------";

    message.innerText =
      "📱 دخل لواتساب → الأجهزة المرتبطة → ربط جهاز → الربط برقم الهاتف";

  } catch (error) {

    code.innerText = "❌";

    message.innerText =
      "خطأ: " + error.message;

  }

}


function joinGroups() {

  alert(
    "ضع رابط مجموعاتك هنا داخل joinGroups()"
  );

}


function contactDeveloper() {

  alert(
    "ضع رابط التواصل مع المطور هنا"
  );

}


checkStatus();

setInterval(checkStatus,10000);

</script>

</body>

</html>`);

});

/* =========================
   START SERVER
========================= */

app.listen(PORT, "0.0.0.0", () => {

  console.log("");
  console.log("================================");
  console.log("🚀 DAMAR-MD API");
  console.log("================================");
  console.log("PORT:", PORT);
  console.log("API:", API_URL);
  console.log("================================");
  console.log("");

  startWhatsApp();

});