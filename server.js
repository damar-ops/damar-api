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

const API_URL =
  "https://damar-api-production.up.railway.app";

const AUTH_DIR =
  path.join(__dirname, "auth_info");

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, {
    recursive: true
  });
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
let whatsappStatus = "starting";
let connecting = false;
let reconnectTimer = null;


/* =========================================
   BAILEYS
========================================= */

async function getBaileys() {

  const B = await import(
    "@whiskeysockets/baileys"
  );

  const makeWASocket =
    B.default?.default ||
    B.default ||
    B.makeWASocket;

  const useMultiFileAuthState =
    B.useMultiFileAuthState;

  const DisconnectReason =
    B.DisconnectReason;

  if (typeof makeWASocket !== "function") {
    throw new Error(
      "makeWASocket غير موجود في Baileys"
    );
  }

  if (
    typeof useMultiFileAuthState !==
    "function"
  ) {
    throw new Error(
      "useMultiFileAuthState غير موجود"
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

    console.log(
      "📡 WhatsApp socket created"
    );


    /* =====================================
       SAVE CREDENTIALS
    ===================================== */

    sock.ev.on(
      "creds.update",
      async () => {

        try {

          await saveCreds();

          console.log(
            "💾 Session saved"
          );

        } catch (error) {

          console.error(
            "❌ Save session error:",
            error
          );

        }

      }
    );


    /* =====================================
       CONNECTION UPDATE
    ===================================== */

    sock.ev.on(
      "connection.update",
      async (update) => {

        const {
          connection,
          lastDisconnect,
          qr
        } = update;


        if (qr) {

          console.log(
            "📲 WhatsApp QR received"
          );

        }


        if (connection) {

          console.log(
            "📡 WhatsApp:",
            connection
          );

        }


        /* ================================
           OPEN
        ================================= */

        if (connection === "open") {

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
           CLOSE
        ================================= */

        if (connection === "close") {

          connecting = false;

          whatsappStatus =
            "disconnected";

          console.error("");
          console.error(
            "❌ WHATSAPP DISCONNECTED"
          );

          console.error(
            "LAST DISCONNECT:"
          );

          console.error(
            lastDisconnect
          );


          const error =
            lastDisconnect?.error;

          console.error(
            "ERROR:",
            error
          );


          const statusCode =
            error?.output?.statusCode ||
            error?.data?.statusCode ||
            error?.statusCode;


          console.error(
            "STATUS CODE:",
            statusCode || "unknown"
          );


          console.error(
            "ERROR MESSAGE:",
            error?.message ||
            "unknown"
          );

          console.error("");


          /* ================================
             LOGGED OUT
          ================================= */

          if (
            statusCode ===
            DisconnectReason?.loggedOut
          ) {

            console.log(
              "⚠️ WhatsApp logged out."
            );

            console.log(
              "🗑️ Session needs to be linked again."
            );

            return;

          }


          /* ================================
             RECONNECT
          ================================= */

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
    #32104c,
    #08060c 65%
  );

  color: white;

  font-family: Arial, sans-serif;

  display: flex;

  justify-content: center;

  padding: 25px 12px;

}

.container {

  width: 100%;

  max-width: 540px;

  background: #111;

  border: 2px solid #a83cff;

  border-radius: 25px;

  padding: 25px;

  box-shadow:
    0 0 30px #7c20ff;

}

h1 {

  text-align: center;

  color: #ff1616;

  font-size: 38px;

  margin: 10px 0;

}

.subtitle {

  text-align: center;

  color: #d44343;

  margin-bottom: 25px;

}

.status {

  text-align: center;

  background: #1c1c1c;

  padding: 14px;

  border-radius: 14px;

  margin-bottom: 20px;

}

.box {

  border: 2px solid #9b39ff;

  border-radius: 20px;

  padding: 20px;

}

label {

  display: block;

  margin:
    12px 0 8px;

  font-size: 18px;

}

input,
select {

  width: 100%;

  padding: 16px;

  background: #222;

  color: white;

  border: 2px solid #444;

  border-radius: 14px;

  font-size: 17px;

  outline: none;

}

button {

  width: 100%;

  border: none;

  color: white;

  font-size: 19px;

  font-weight: bold;

  padding: 17px;

  border-radius: 15px;

  margin-top: 14px;

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
    #ff00c8,
    #293dff
  );

}

.contact {

  background:
  linear-gradient(
    90deg,
    #14d55b,
    #139e8b
  );

}

.result {

  display: none;

  margin-top: 20px;

  padding: 18px;

  background: #1b1b1b;

  border-radius: 15px;

  text-align: center;

}

.code {

  direction: ltr;

  font-size: 31px;

  font-weight: bold;

  letter-spacing: 5px;

  color: #00eaff;

  margin-top: 12px;

}

.message {

  color: #ddd;

  line-height: 1.8;

  margin-top: 12px;

}

.footer {

  text-align: center;

  color: #777;

  margin-top: 25px;

}

</style>

</head>

<body>

<div class="container">

<h1>DAMAR-MD</h1>

<div class="subtitle">
جيب الكود ديال الربط وربط البوت
</div>

<div
id="status"
class="status">

🟡 جاري تشغيل WhatsApp...

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
🔑 كود الربط
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
<strong style="color:#00aaff">
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
          method: "GET",
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error("API error");
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

    } else if (
      data.whatsapp ===
      "connecting"
    ) {

      status.innerHTML =
        "🟡 API ONLINE — WhatsApp كيتصل...";

    } else {

      status.innerHTML =
        "🟠 API ONLINE — WhatsApp: "
        + data.whatsapp;

    }

  } catch (error) {

    document.getElementById(
      "status"
    ).innerHTML =
      "🔴 Failed to fetch";

  }

}


/* =====================================
   PAIRING CODE
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
    "⏳";

  message.innerText =
    "جاري طلب كود الربط...";


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
            phone
          })
        }
      );


    const data =
      await response.json();


    if (!response.ok ||
        !data.success) {

      throw new Error(
        data.message ||
        data.error ||
        "فشل الحصول على الكود"
      );

    }


    if (
      data.alreadyPaired
    ) {

      code.innerText =
        "✓";

      message.innerText =
        "✅ الجهاز مربوط من قبل";

      return;

    }


    code.innerText =
      data.code ||
      "--------";


    message.innerHTML =
      "✅ تم إنشاء كود الربط"
      + "<br><br>"
      + "في WhatsApp افتح:"
      + "<br>"
      + "الأجهزة المرتبطة"
      + " → "
      + "ربط جهاز"
      + " → "
      + "الربط برقم الهاتف";

  } catch (error) {

    code.innerText =
      "❌";

    message.innerText =
      error.message;

  }

}


/* =====================================
   GROUPS
===================================== */

function joinGroups() {

  alert(
    "أضف رابط مجموعة WhatsApp هنا."
  );

}


/* =====================================
   DEVELOPER
===================================== */

function contactDeveloper() {

  alert(
    "أضف رابط التواصل مع المطور هنا."
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

      connected:
        whatsappStatus ===
        "connected",

      api:
        API_URL,

      port:
        PORT,

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


      /* =================================
         IF SOCKET IS NOT READY
      ================================= */

      if (!sock) {

        return res
          .status(503)
          .json({

            success: false,

            message:
              "⏳ WhatsApp مازال كيتشغل، عاود المحاولة بعد قليل"

          });

      }


      /* =================================
         ALREADY REGISTERED
      ================================= */

      if (
        sock.authState?.creds?.registered
      ) {

        return res.json({

          success: true,

          alreadyPaired: true,

          message:
            "✅ الجهاز راه مربوط من قبل"

        });

      }


      console.log("");
      console.log(
        "📱 طلب Pairing Code للرقم:",
        phone
      );


      /* =================================
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

      console.error("");
      console.error(
        "❌ PAIRING CODE ERROR:"
      );

      console.error(
        error
      );

      console.error("");


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
   SERVER
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