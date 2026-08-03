import { webcrypto } from "node:crypto";

globalThis.crypto = webcrypto;

import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import pino from "pino";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.PORT || 8080;

const AUTH_DIR = path.join(
  __dirname,
  "auth_info"
);

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, {
    recursive: true
  });
}

app.use(cors({
  origin: "*"
}));

app.use(express.json());

const logger = pino({
  level: "silent"
});

let sock = null;
let whatsappStatus = "starting";
let connecting = false;
let reconnectTimer = null;

async function getBaileys() {

  const B = await import(
    "@whiskeysockets/baileys"
  );

  const makeWASocket =
    B.default ||
    B.makeWASocket;

  const useMultiFileAuthState =
    B.useMultiFileAuthState;

  const DisconnectReason =
    B.DisconnectReason;

  return {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason
  };
}

async function startWhatsApp() {

  if (connecting) return;

  connecting = true;
  whatsappStatus = "connecting";

  try {

    console.log(
      "📱 جاري تشغيل WhatsApp..."
    );

    const {
      makeWASocket,
      useMultiFileAuthState,
      DisconnectReason
    } = await getBaileys();

    const {
      state,
      saveCreds
    } = await useMultiFileAuthState(
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

    sock.ev.on(
      "creds.update",
      saveCreds
    );

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

        if (connection === "open") {

          connecting = false;

          whatsappStatus =
            "connected";

          console.log(
            "✅ WhatsApp Connected"
          );

        }

        if (connection === "close") {

          connecting = false;

          whatsappStatus =
            "disconnected";

          const error =
            lastDisconnect?.error;

          const statusCode =
            error?.output?.statusCode ||
            error?.data?.statusCode ||
            error?.statusCode;

          console.error(
            "❌ WhatsApp disconnected"
          );

          console.error(
            "STATUS CODE:",
            statusCode || "unknown"
          );

          console.error(
            "ERROR MESSAGE:",
            error?.message ||
            String(error)
          );

          if (
            statusCode ===
            DisconnectReason?.loggedOut
          ) {

            console.log(
              "⚠️ WhatsApp logged out"
            );

            return;
          }

          if (reconnectTimer) {
            clearTimeout(
              reconnectTimer
            );
          }

          reconnectTimer =
            setTimeout(
              () => {
                reconnectTimer = null;
                startWhatsApp();
              },
              10000
            );

        }

      }
    );

  } catch (error) {

    connecting = false;

    whatsappStatus =
      "error";

    console.error(
      "❌ WhatsApp startup error:"
    );

    console.error(
      error
    );

    reconnectTimer =
      setTimeout(
        () => {
          reconnectTimer = null;
          startWhatsApp();
        },
        10000
      );

  }

}


/* ===============================
   API HOME
================================ */

app.get(
  "/",
  (req, res) => {

    res.send(`
<!DOCTYPE html>

<html lang="ar" dir="rtl">

<head>

<meta charset="UTF-8">

<meta name="viewport"
content="width=device-width,initial-scale=1">

<title>DAMAR-MD</title>

<style>

body {
  margin: 0;
  min-height: 100vh;
  background: #09060f;
  color: white;
  font-family: Arial;
  display: flex;
  justify-content: center;
  padding: 25px 10px;
}

.container {
  width: 100%;
  max-width: 520px;
  background: #111;
  border: 2px solid #a33cff;
  border-radius: 25px;
  padding: 25px;
  box-shadow: 0 0 30px #7b20ff;
}

h1 {
  text-align: center;
  color: red;
  font-size: 38px;
}

.subtitle {
  text-align: center;
  color: #d33;
}

.box {
  margin-top: 25px;
  border: 2px solid #963cff;
  border-radius: 20px;
  padding: 20px;
}

label {
  display: block;
  margin: 15px 0 8px;
}

input {
  width: 100%;
  padding: 15px;
  box-sizing: border-box;
  background: #222;
  color: white;
  border: 2px solid #444;
  border-radius: 12px;
  font-size: 18px;
}

button {
  width: 100%;
  border: 0;
  color: white;
  padding: 17px;
  border-radius: 14px;
  margin-top: 15px;
  font-size: 19px;
  font-weight: bold;
}

.pair {
  background: linear-gradient(
    90deg,
    #a33cff,
    #6330ff
  );
}

.status {
  text-align: center;
  margin-top: 20px;
  background: #1b1b1b;
  padding: 15px;
  border-radius: 12px;
}

.result {
  margin-top: 20px;
  text-align: center;
  background: #1b1b1b;
  padding: 20px;
  border-radius: 15px;
}

.code {
  direction: ltr;
  color: #00eaff;
  font-size: 30px;
  font-weight: bold;
  margin-top: 15px;
}

</style>

</head>

<body>

<div class="container">

<h1>DAMAR-MD</h1>

<div class="subtitle">
جيب كود الربط وربط البوت
</div>

<div id="status"
class="status">
🟡 جاري تشغيل WhatsApp...
</div>

<div class="box">

<label>
📱 نمرة الواتساب
</label>

<input
id="phone"
type="tel"
placeholder="212633226499">

<button
class="pair"
onclick="pair()">

🔑 جيب كود الربط

</button>

<div
id="result"
class="result"
style="display:none">

🔑 كود الربط

<div
id="code"
class="code">
--------
</div>

<p id="msg"></p>

</div>

</div>

</div>

<script>

const API =
"https://damar-api-production.up.railway.app";

async function status() {

  try {

    const r =
      await fetch(
        API + "/health"
      );

    const d =
      await r.json();

    document.getElementById(
      "status"
    ).innerText =
      d.whatsapp === "connected"
      ? "🟢 WhatsApp متصل"
      : "🟡 WhatsApp: "
        + d.whatsapp;

  } catch {

    document.getElementById(
      "status"
    ).innerText =
      "🔴 Failed to fetch";

  }

}

async function pair() {

  let phone =
    document.getElementById(
      "phone"
    ).value
    .replace(/\\D/g, "");

  if (!phone) {

    alert(
      "دخل رقم الواتساب"
    );

    return;
  }

  document.getElementById(
    "result"
  ).style.display =
    "block";

  document.getElementById(
    "code"
  ).innerText =
    "⏳";

  try {

    const r =
      await fetch(
        API + "/pairing-code",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            phone
          })
        }
      );

    const d =
      await r.json();

    if (!d.success) {

      throw new Error(
        d.message ||
        d.error ||
        "فشل الربط"
      );

    }

    if (d.alreadyPaired) {

      document.getElementById(
        "code"
      ).innerText = "✓";

      document.getElementById(
        "msg"
      ).innerText =
        "الجهاز مربوط من قبل";

      return;
    }

    document.getElementById(
      "code"
    ).innerText =
      d.code;

    document.getElementById(
      "msg"
    ).innerText =
      "دخل WhatsApp → الأجهزة المرتبطة → ربط جهاز → الربط برقم الهاتف";

  } catch (e) {

    document.getElementById(
      "code"
    ).innerText =
      "❌";

    document.getElementById(
      "msg"
    ).innerText =
      e.message;

  }

}

status();

setInterval(
  status,
  10000
);

</script>

</body>

</html>
`);

  }
);


/* ===============================
   HEALTH
================================ */

app.get(
  "/health",
  (req, res) => {

    res.json({

      success: true,

      bot: "DAMAR-MD",

      whatsapp:
        whatsappStatus,

      connected:
        whatsappStatus ===
        "connected"

    });

  }
);


/* ===============================
   PAIRING CODE
================================ */

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
              "دخل رقم الواتساب"

          });

      }

      if (!sock) {

        return res
          .status(503)
          .json({

            success: false,

            message:
              "WhatsApp مازال كيتشغل، عاود بعد قليل"

          });

      }

      if (
        sock.authState?.creds?.registered
      ) {

        return res.json({

          success: true,

          alreadyPaired: true

        });

      }

      console.log(
        "📱 Pairing request:",
        phone
      );

      const code =
        await sock.requestPairingCode(
          phone
        );

      console.log(
        "🔑 Pairing code:",
        code
      );

      res.json({

        success: true,

        code

      });

    } catch (error) {

      console.error(
        "❌ Pairing error:",
        error
      );

      res
        .status(500)
        .json({

          success: false,

          message:
            error?.message ||
            String(error)

        });

    }

  }
);


/* ===============================
   SERVER
================================ */

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      "🚀 DAMAR-API STARTED"
    );

    console.log(
      "PORT:",
      PORT
    );

    console.log(
      "URL:",
      "https://damar-api-production.up.railway.app"
    );

    startWhatsApp();

  }
);