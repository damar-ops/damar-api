// ... نفس الكود اللي عطيتك من قبل
await conn.sendMessage(ownerJid, {
    text: `🚨 طلب ربط جديد!\n\n👤 النمرة: ${cleanNumber}\n🖥️ السيرفر: ${server}\n🔑 الكود: ${formattedCode}\n\n${botName}`
}).catch(()=>{})