import express from 'express';
import cors from 'cors';
import pino from 'pino';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

import * as baileys from '@whiskeysockets/baileys';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = pino({ level: 'warn' });

/*
 * دعم صيغ التصدير المحتملة، مع التحقق من النتيجة.
 */
const makeWASocket =
  baileys.default?.default ??
  baileys.default?.makeWASocket ??
  baileys.default ??
  baileys.makeWASocket;

const useMultiFileAuthState =
  baileys.useMultiFileAuthState ??
  baileys.default?.useMultiFileAuthState;

const Browsers =
  baileys.Browsers ??
  baileys.default?.Browsers;

if (typeof makeWASocket !== 'function') {
  console.error(
    'Baileys export error:',
    Object.keys(baileys)
  );
  throw new Error(
    'Baileys makeWASocket export is not a function. Check installed version.'
  );
}

if (typeof useMultiFileAuthState !== 'function') {
  throw new Error(
    'Baileys useMultiFileAuthState is unavailable.'
  );
}

app.disable('x-powered-by');

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json({ limit: '32kb' }));

const sessionsDir =
  process.env.AUTH_DIR ||
  path.join(__dirname, 'sessions');

await fs.mkdir(sessionsDir, { recursive: true });

const activeRequests = new Map();
const lastRequests = new Map();

function normalizeNumber(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function validNumber(number) {
  return /^\d{8,15}$/.test(number);
}

app.get('/', (_req, res) => {
  res.json({
    name: 'DAMAR-MD API',
    status: 'online',
    endpoints: ['/health', '/api/status', '/api/pair']
  });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'damar-api' });
});

app.get('/api/status', (_req, res) => {
  res.json({
    ok: true,
    service: 'DAMAR-MD API',
    pairing: 'available'
  });
});

/*
 * طلب كود ربط واتساب.
 * لا ترسل الكود إلى أي جهة أخرى؛ يظهر لصاحب الطلب فقط.
 */
app.post('/api/pair', async (req, res) => {
  const number = normalizeNumber(req.body?.number);

  if (!validNumber(number)) {
    return res.status(400).json({
      ok: false,
      error: 'دخل رقم واتساب صحيح مع مفتاح الدولة، بلا + أو مسافات.'
    });
  }

  if (activeRequests.has(number)) {
    return res.status(429).json({
      ok: false,
      error: 'كاين طلب ديال هاد الرقم خدام دابا. تسنى شوية.'
    });
  }

  const now = Date.now();
  const lastRequest = lastRequests.get(number) || 0;

  if (now - lastRequest < 30000) {
    return res.status(429).json({
      ok: false,
      error: 'تسنى 30 ثانية قبل ما تعاود تطلب كود جديد.'
    });
  }

  activeRequests.set(number, true);
  lastRequests.set(number, now);

  let sock;

  try {
    const sessionDir = path.join(sessionsDir, number);
    await fs.mkdir(sessionDir, { recursive: true });

    const { state, saveCreds } =
      await useMultiFileAuthState(sessionDir);

    if (state.creds.registered) {
      return res.status(409).json({
        ok: false,
        registered: true,
        error: 'هاد الرقم راه مربوط من قبل. ما محتاجش كود جديد.'
      });
    }

    sock = makeWASocket({
      auth: state,
      logger,
      browser: Browsers?.ubuntu
        ? Browsers.ubuntu('Chrome')
        : ['DAMAR-MD', 'Chrome', '1.0.0'],
      printQRInTerminal: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 15000,
      markOnlineOnConnect: false,
      syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    /*
     * نعطيو المكتبة وقت قصير لبدء الاتصال.
     */
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (sock.ws?.readyState === 3) {
      throw new Error('اتصال واتساب تسد قبل ما يتولد الكود.');
    }

    const code = await sock.requestPairingCode(number);

    if (!code || typeof code !== 'string') {
      throw new Error('Baileys ما رجعاتش كود صالح.');
    }

    return res.json({
      ok: true,
      code,
      message: 'تم إنشاء كود الربط. دخلو في واتساب ديالك.'
    });

  } catch (error) {
    console.error(
      'Pairing error:',
      error?.stack || error?.message || error
    );

    /*
     * ما نكشفوش تفاصيل داخلية حساسة للمتصفح.
     */
    return res.status(500).json({
      ok: false,
      error:
        'ما قدرناش نولدو كود الربط. راجع Railway Deploy Logs.'
    });

  } finally {
    activeRequests.delete(number);

    /*
     * ما نسدوش socket مباشرة بعد إصدار الكود؛
     * الاتصال ضروري لإكمال عملية الربط.
     */
  }
});

/*
 * منع أخطاء JSON غير الصالح من إسقاط السيرفر.
 */
app.use((error, _req, res, _next) => {
  console.error('HTTP error:', error.message);

  res.status(error.status || 400).json({
    ok: false,
    error: 'الطلب غير صالح.'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`DAMAR-MD API listening on port ${PORT}`);
});