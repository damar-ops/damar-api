import express from 'express';
import cors from 'cors';
import makeWASocket, { useMultiFileAuthState, delay, DisconnectReason } from '@whiskeysockets/baileys';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

app.post('/code', async (req, res) => {
    const { number } = req.body;
    if (!number) return res.status(400).json({ message: 'دخل النمرة' });

    const sessionId = `session_${number}`;
    if (fs.existsSync(sessionId)) fs.rmSync(sessionId, { recursive: true, force: true });

    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionId);
        const sock = makeWASocket({ auth: state, printQRInTerminal: false, browser: ['DAMAR-MD','Chrome','1.0.0'] });
        sock.ev.on('creds.update', saveCreds);

        await delay(1000);
        const code = await sock.requestPairingCode(number); // هنا كيجيب الكود الصحيح

        await delay(1000);
        await sock.logout();
        await sock.end();

        res.json({ code: code });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'فشل في جلب الكود' });
    }
});

app.listen(PORT, () => console.log(`API running ${PORT}`));
