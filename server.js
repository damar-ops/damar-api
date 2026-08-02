import express from 'express';
import cors from 'cors';
import pkg from '@whiskeysockets/baileys';
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = pkg;

const app = express();
const PORT = process.env.PORT || 3000;

// باش الواجهة تقدر تهضر معاه
app.use(cors());
app.use(express.json());

// دالة باش نجيبو الكود
async function generatePairingCode(number) {
    const { state, saveCreds } = await useMultiFileAuthState('./auth');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);

    try {
        const code = await sock.requestPairingCode(number);
        await delay(3000); // عطيه 3 ثواني يصيفط
        await sock.logout();
        await sock.end();
        return code;
    } catch (e) {
        console.error(e);
        await sock.logout();
        await sock.end();
        throw new Error('مقدرناش نجيبو الكود');
    }
}

// هادي هي اللي ناقصاك
app.post('/code', async (req, res) => {
    try {
        const { number, server } = req.body;
        if (!number) return res.status(400).json({ message: 'النمرة خاصها تكون' });

        console.log(`طلب كود للنمرة: ${number} السيرفر: ${server}`);
        const code = await generatePairingCode(number);
        
        res.json({ code: code, message: 'تم ارسال الكود' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/', (req, res) => {
    res.json({ status: 'DAMAR-API is running' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
