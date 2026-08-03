import cors from 'cors';
import express from 'express';

const app = express();

app.use(express.json()); // مهم بزاف باش يقرا req.body

app.use(cors({
  origin: "https://damar-ops.github.io", // رابط الموقع ديالك
  methods: ["POST", "GET"], // زدنا GET
  credentials: true
}));

// Route باش نشوفو واش السيرفر حي
app.get('/', (req, res) => {
  res.json({ status: "DAMAR-API شغال", port: process.env.PORT || 8080 });
});

app.post('/code', async (req,res) => {
  const { number, server, owner } = req.body;
  
  if(!number || !owner) return res.status(400).json({ message: "النمرة و owner ضروريين" });
  
  try {
    const cleanNumber = number.replace(/[^0-9]/g, ''); // كنمسحو + و الفراغات
    
    // ملاحظة: تأكد ان sock معرف ومتصل قبل ما تستعملو
    const code = await sock.requestPairingCode(cleanNumber); // هنا كيبلوكي شوية عادي
    
    // صيفط الاشعار ليك
    await sock.sendMessage(owner + '@s.whatsapp.net', { 
      text: `🔔 كود جديد - DAMAR-MD\n\n📱 النمرة: ${cleanNumber}\n🖥️ السيرفر: ${server}\n🔑 الكود: ${code}` 
    });
    
    return res.json({ code, success: true });
    
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "البوت ماشي متصل او الرقم غالط" });
  }
});

// أهم تعديل: استعمل PORT ديال Railway
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 DAMAR-API خدام على البورت ${PORT}`));