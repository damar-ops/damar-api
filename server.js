import { webcrypto } from "node:crypto";

globalThis.crypto = webcrypto;

import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import pino from "pino";
import { fileURLToPath } from "url";

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys";


/* =========================================
   BASIC SETTINGS
========================================= */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.PORT || 8080;

const AUTH_DIR = path.join(
  __dirname,
  "auth_info"
);


/* =========================================
   CREATE AUTH FOLDER
========================================= */

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, {
    recursive: true
  });
}


/* =========================================
   EXPRESS
========================================= */

app.use(
  cors({
    origin: "*"
  })
);

app.use(
  express.json()
);


/* =========================================
   LOGGER
========================================= */

const logger = pino({
  level: "silent"
});


/* =========================================
   WHATSAPP VARIABLES
========================================= */

let sock = null;

let whatsappStatus = "starting";

let connecting = false;

let reconnectTimer = null;


/* =========================================
   START WHATSAPP
========================================= */

async function startWhatsApp() {

  if (connecting) {
    return;
  }

  connecting = true;

  whatsappStatus = "connecting";

  console.log("");
  console.log("=================================");
  console.log("📱 جاري تشغيل WhatsApp...");
  console.log("=================================");

  try {

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

      markOnlineOnConnect: false,

      syncFullHistory: false

    });


    /*
      حفظ بيانات تسجيل الدخول
    */

    sock.ev.on(
      "creds.update",
      saveCreds
    );


    /*
      حالة الاتصال
    */

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


        /*
          متصل
        */

        if (connection === "open") {

          connecting = false;

          whatsappStatus = "connected";

          console.log("");
          console.log(
            "================================="
          );
          console.log(
            "✅ WhatsApp Connected"
          );
          console.log(
            "================================="
          );
          console.log("");

        }


        /*
          انقطع الاتصال
        */

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


          console.log("");
          console.log(
            "❌ WhatsApp disconnected"
          );


          console.log(
            "STATUS CODE:",
            statusCode || "unknown"
          );


          console.log(
            "ERROR:",
            error?.message ||
            String(error)
          );


          /*
            إذا الحساب تسجل خروج
          */

          if (
            statusCode ===
            DisconnectReason.loggedOut
          ) {

            console.log(
              "⚠️ الحساب خرج من WhatsApp."
            );

            console.log(
              "احذف auth_info ثم أعد التشغيل."
            );

            return;

          }


          /*
            إعادة الاتصال
          */

          if (reconnectTimer) {

            clearTimeout(
              reconnectTimer
            );

          }


          reconnectTimer =
            setTimeout(
              () => {

                reconnectTimer = null;

                console.log(
                  "🔄 إعادة تشغيل WhatsApp..."
                );

                startWhatsApp();

              },
              10000
            );

        }

      }
    );


  } catch (error) {

    connecting = false;

    whatsappStatus = "error";


    console.error("");
    console.error(
      "❌ WhatsApp startup error:"
    );

    console.error(
      error
    );


    /*
      إعادة المحاولة
    */

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


/* =========================================
   HOME PAGE
========================================= */

app.get(
  "/",
  (req, res) => {

    res.send(`

<!DOCTYPE html>

<html lang="ar" dir="rtl">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width, initial-scale=1.0"
>

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
      #271044,
      #09060f 55%
    );

  color: white;

  font-family:
    Arial,
    sans-serif;

  padding: 25px 12px;

}


.container {

  width: 100%;

  max-width: 550px;

  margin: auto;

  background: #111111;

  border: 2px solid #a83cff;

  border-radius: 25px;

  padding: 25px;

  box-shadow:
    0 0 25px #751cff;

}


.logo {

  width: 120px;

  height: 120px;

  border-radius: 50%;

  display: block;

  margin: auto;

  object-fit: cover;

  border: 4px solid #00d9ff;

}


h1 {

  text-align: center;

  color: #ff1111;

  font-size: 38px;

  margin-bottom: 8px;

}


.subtitle {

  text-align: center;

  color: #d94343;

  font-size: 17px;

}


.box {

  margin-top: 30px;

  border: 2px solid #963cff;

  border-radius: 20px;

  padding: 20px;

}


label {

  display: block;

  font-size: 18px;

  margin-top: 12px;

  margin-bottom: 8px;

}


input {

  width: 100%;

  padding: 16px;

  border-radius: 13px;

  border: 2px solid #444;

  background: #222;

  color: white;

  font-size: 18px;

  outline: none;

  direction: ltr;

  text-align: center;

}


button {

  width: 100%;

  padding: 17px;

  margin-top: 18px;

  border: none;

  border-radius: 14px;

  color: white;

  font-size: 19px;

  font-weight: bold;

  cursor: pointer;

}


.pair {

  background:
    linear-gradient(
      90deg,
      #a83cff,
      #5930ff
    );

}


.status {

  margin-top: 20px;

  padding: 14px;

  background: #1b1b1b;

  border-radius: 12px;

  text-align: center;

  font-size: 17px;

}


.result {

  margin-top: 20px;

  background: #1b1b1b;

  border-radius: 15px;

  padding: 20px;

  text-align: center;

}


.code {

  direction: ltr;

  font-size: 32px;

  font-weight: bold;

  color: #00eaff;

  letter-spacing: 4px;

  margin: 15px 0;

}


.help {

  color: #aaa;

  line-height: 1.8;

}


.footer {

  text-align: center;

  margin-top: 25px;

  color: #777;

}


</style>

</head>


<body>


<div class="container">


<h1>DAMAR-MD</h1>


<div class="subtitle">

🔑 جيب كود الربط وربط البوت

</div>


<div
id="status"
class="status"
>

🟡 جاري تشغيل WhatsApp...

</div>


<div class="box">


<label>

📱 نمرة الواتساب

</label>


<input

id="phone"

type="tel"

placeholder="212633226499"

autocomplete="off"


>


<button

class="pair"

onclick="getCode()"

>

🔑 جيب كود الربط

</button>


<div

id="result"

class="result"

style="display:none"

>


<div>

🔑 كود الربط

</div>


<div

id="code"

class="code"

>

--------

</div>


<div

id="message"

class="help"

>

</div>


</div>


</div>


<div class="footer">

DAMAR-MD © 2026

</div>


</div>


<script>


async function checkStatus() {

  try {

    const response =
      await fetch(
        "/health"
      );


    const data =
      await response.json();


    const element =
      document.getElementById(
        "status"
      );


    if (
      data.whatsapp ===
      "connected"
    ) {

      element.innerText =
        "🟢 WhatsApp متصل";

    }

    else if (
      data.whatsapp ===
      "connecting"
    ) {

      element.innerText =
        "🟡 WhatsApp كيتصل...";

    }

    else {

      element.innerText =
        "🔴 WhatsApp: " +
        data.whatsapp;

    }


  } catch (error) {

    document.getElementById(
      "status"
    ).innerText =
      "🔴 API غير متاحة";

  }

}


/* =================================
   GET PAIRING CODE
================================= */

async function getCode() {


  let phone =
    document
      .getElementById("phone")
      .value
      .replace(/\\D/g, "");


  if (!phone) {

    alert(
      "دخل رقم WhatsApp أولا"
    );

    return;

  }


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


  result.style.display =
    "block";


  code.innerText =
    "⏳";


  message.innerText =
    "جاري طلب كود الربط...";


  try {


    const response =
      await fetch(
        "/pairing-code",
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              phone: phone
            })

        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.message ||
        "وقع خطأ"
      );

    }


    if (
      data.alreadyPaired
    ) {

      code.innerText =
        "✓";


      message.innerText =
        "هذا الحساب مربوط من قبل.";

      return;

    }


    code.innerText =
      data.code ||
      "--------";


    message.innerText =
      "دخل WhatsApp → الأجهزة المرتبطة → ربط جهاز → الربط برقم الهاتف، ثم دخل الكود.";

  }


  catch (error) {


    code.innerText =
      "❌";


    message.innerText =
      error.message ||
      "فشل الحصول على الكود";


  }

}


/* =================================
   CHECK EVERY 5 SECONDS
================================= */

checkStatus();


setInterval(
  checkStatus,
  5000
);


</script>


</body>

</html>

`);

  }
);


/* =========================================
   HEALTH API
========================================= */

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


/* =========================================
   PAIRING CODE API
========================================= */

app.post(
  "/pairing-code",
  async (req, res) => {


    try {


      let phone =
        String(
          req.body?.phone || ""
        );


      /*
        حذف أي رموز
        + - مسافات
      */

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
              "رقم WhatsApp غير صحيح"

          });

      }


      /*
        إذا لم يبدأ بـ +
        Baileys يحتاج الرقم بدون +
      */

      console.log(
        "📱 طلب كود للرقم:",
        phone
      );


      if (!sock) {

        return res
          .status(503)
          .json({

            success: false,

            message:
              "WhatsApp مازال كيتشغل، تسنى شوية وجرب من جديد."

          });

      }


      /*
        الحساب مربوط من قبل
      */

      if (
        sock.authState?.creds?.registered
      ) {

        return res.json({

          success: true,

          alreadyPaired: true

        });

      }


      /*
        طلب Pairing Code
      */

      const code =
        await sock.requestPairingCode(
          phone
        );


      console.log(
        "🔑 Pairing Code:",
        code
      );


      return res.json({

        success: true,

        code: code

      });


    }


    catch (error) {


      console.error(
        "❌ Pairing error:"
      );


      console.error(
        error
      );


      return res
        .status(500)
        .json({

          success: false,

          message:
            error?.message ||
            "فشل الحصول على كود الربط"

        });


    }

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
      "======================================"
    );

    console.log(
      "🚀 DAMAR-API STARTED"
    );

    console.log(
      "======================================"
    );

    console.log(
      "PORT:",
      PORT
    );

    console.log(
      "URL:",
      "https://damar-api-production.up.railway.app"
    );

    console.log(
      "======================================"
    );

    console.log("");


    /*
      تشغيل WhatsApp
    */

    startWhatsApp();

  }
);