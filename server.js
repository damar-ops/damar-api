import cors from 'cors';
import express from 'express';
const app = express();

app.use(express.json()); // مهم بزاف باش يقرا req.body

app.use(cors({
  origin: "https://damar-ops.github.io", // رابط الموقع ديالك
  methods: ["POST", "GET"], // زدنا GET
  credentials: true
}));

app.post('/code', async (req,res) => {
  const { number, server, owner } = req.body;
  
  if(!number || !owner) return res.status(400).json({ message: "النمرة و owner ضروريين" });
  
  try {
    const cleanNumber = number.replace(/[^0-9]/g, ''); // كنمسحو + و الفراغات
    
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
})

app.listen(8080, () => console.log("🚀 DAMAR-API 8080 على خدام"));