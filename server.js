import express from "express";
import cors from "cors";
import pino from "pino";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.PORT || 8080;
const API_URL = "https://damar-api-production.up.railway.app";

const AUTH_DIR = path.join(__dirname, "auth_info");

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

const logger = pino({
  level: "silent"
});

let sock = null;
let connecting = false;
let status = "starting";

/* =========================
   WHATSAPP
========================= */

async function startWhatsApp() {

  if (connecting) return;

  connecting = true;
  status = "connecting";

  try {

    const { state, saveCreds } =
      await useMultiFileAuthState(AUTH_DIR);

    sock = makeWASocket({
      auth: state,
      logger,

      printQRInTerminal: false,

      browser: [
        "DAMAR-MD",
        "Chrome",
        "1.0.0"
      ]
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {

      const {
        connection,
        lastDisconnect
      } = update;

      console.log(
        "WhatsApp connection:",
        connection || "update"
      );

      if (connection === "open") {

        status = "connected";
        connecting = false;

        console.log("================================");
        console.log("✅ DAMAR-MD WHATSAPP CONNECTED");
        console.log("================================");

      }

      if (connection === "close") {

        connecting = false;
        status = "disconnected";

        const code =
          lastDisconnect?.error?.output?.statusCode;

        console.log(
          "❌ WhatsApp disconnected:",
          code
        );

        if (code !== DisconnectReason.loggedOut) {

          console.log(
            "🔄 Reconnecting in 5 seconds..."
          );

          setTimeout(() => {
            startWhatsApp();
          }, 5000);

        } else {

          console.log(
            "⚠️ WhatsApp logged out."
          );

        }
      }

    });

  } catch (error) {

    connecting = false;
    status = "error";

    console.error(
      "❌ WhatsApp startup error:",
      error
    );

    setTimeout(() => {
      startWhatsApp();
    }, 10000);
  }
}

/* =========================
   HEALTH
========================= */

app.get("/health", (req, res) => {

  res.json({
    success: true,
    status: "online",
    bot: "DAMAR-MD",
    whatsapp: status,
    port: PORT,
    api: API_URL,
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
    whatsapp: status,
    connected: status === "connected",
    registered: !!sock?.user
  });

});

/* =========================
   PAIRING CODE
========================= */

app.post("/pairing-code", async (req, res) => {

  try {

    let phone = String(
      req.body?.phone || ""
    );

    phone = phone.replace(/\D/g, "");

    if (!phone) {

      return res.status(400).json({
        success: false,
        message: "❌ دخل رقم الواتساب"
      });

    }

    if (phone.length < 8) {

      return res.status(400).json({
        success: false,
        message: "❌ رقم الهاتف غير صحيح"
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
        message: "⏳ WhatsApp مازال كيتشغل، عاود المحاولة"
      });

    }

    if (sock.authState?.creds?.registered) {

      return res.json({
        success: true,
        alreadyPaired: true,
        message: "✅ الجهاز راه مربوط من قبل"
      });

    }

    console.log(
      "📱 Request pairing code:",
      phone
    );

    const code =
      await sock.requestPairingCode(phone);

    console.log(
      "🔑 Pairing code:",
      code
    );

    return res.json({
      success: true,
      code: code,
      phone: phone,
      message: "✅ تم إنشاء كود الربط"
    });

  } catch (error) {

    console.error(
      "❌ Pairing error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "❌ فشل إنشاء كود الربط",
      error: error?.message || String(error)
    });

  }

});

/* =========================
   ROOT
========================= */

app.get("/", (req, res) => {

  res.send(`
<!DOCTYPE html>

<html lang="ar" dir="rtl">

<head>

<meta charset="UTF-8">

<meta name="viewport"
content="width=device-width,initial-scale=1">

<title>DAMAR-MD API</title>

<style>

body{
margin:0;
background:#0b0710;
color:white;
font-family:Arial;
display:flex;
align-items:center;
justify-content:center;
min-height:100vh;
text-align:center;
}

.box{
padding:30px;
border:2px solid #a000ff;
border-radius:25px;
box-shadow:0 0 30px #7200ff;
}

h1{
color:#ff2020;
}

.ok{
color:#00ff88;
font-size:20px;
}

</style>

</head>

<body>

<div class="box">

<h1>DAMAR-MD</h1>

<p class="ok">
🟢 API ONLINE
</p>

<p>
DAMAR-API يعمل بنجاح 🚀
</p>

<p>
WhatsApp:
<strong>${status}</strong>
</p>

</div>

</body>

</html>
`);

});

/* =========================
   SERVER
========================= */

app.listen(PORT, "0.0.0.0", () => {

  console.log("");
  console.log("================================");
  console.log("🚀 DAMAR-API STARTED");
  console.log("================================");
  console.log("PORT:", PORT);
  console.log("URL:", API_URL);
  console.log("================================");
  console.log("");

  startWhatsApp();

});