import express from 'express';
import cors from 'cors';
import { Boom } from '@hapi/boom';
import makeWASocket, { useMultiFileAuthState, delay, DisconnectReason } from '@whiskeysockets/baileys';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 8080; // Railway كيخدم بـ 8080

app.use(cors());
app.use(express.json());

app.post('/code', async (req, res) => {
    const { number } = req.body;
    if (!number) return res.status(400).json({ message: 'دخل النمرة' });

    const sessionId = `./auth_${number}`;
    if (fs.existsSync(sessionId)) fs.rmSync(sessionId, { recursive: true, force: true });

    let sock;
    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionId);
        sock = makeWASocket({ 
            auth: state, 
            printQRInTerminal: false, 
            browser: ['DAMAR-MD','Chrome','1.0.0'],
            connectTimeoutMs: 60000,
        });
        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'open') {
                await delay(1000);
                await sock.logout();
                await sock.end();
            }
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                if (!shouldReconnect) {
                    await delay(1000);
                    await sock.end();
                }
            }
        });

        await delay(2000);
        const code = await sock.requestPairingCode(number);
        
        await delay(3000);
        await sock.logout();
        await sock.end();

        return res.json({ code: code });

    } catch (e) {
        console.log(e);
        if (sock) await sock.end();
        return res.status(500).json({ message: 'فشل في جلب الكود' });
    }
});

app.get('/', (req, res) => res.json({ status: 'DAMAR-API Running ✅' }));

app.listen(PORT, () => console.log(`API running ${PORT}`));
