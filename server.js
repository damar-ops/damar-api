import express from 'express';
import cors from 'cors';
import makeWASocket, { useMultiFileAuthState, delay } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/code', async (req, res) => {
    try {
        const { number } = req.body;
        if (!number) return res.status(400).json({ message: 'النمرة خاصها تكون' });

        // مسح مجلد auth كل مرة باش منبقاوش نطيحو فالمشاكل
        const authPath = `./auth_${number}`;
        if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });

        const { state, saveCreds } = await useMultiFileAuthState(authPath);
        
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: ['DAMAR-MD', 'Chrome', '1.0.0'],
            connectTimeoutMs: 60000,
        });

        sock.ev.on('creds.update', saveCreds);

        await delay(2000);
        const code = await sock.requestPairingCode(number);
        
        await delay(2000);
        await sock.logout();
        await sock.end();

        res.json({ code: code, message: 'تم ارسال الكود' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'مقدرناش نجيبو الكود: ' + err.message });
    }
});

app.get('/', (req, res) => {
    res.json({ status: 'DAMAR-API is running ✅' });
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
