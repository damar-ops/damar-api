/**
 * 🍌 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 | Nano-Banana AI V5.1
 * Developer: +212 633-226499
 *
 * ✅ توليد 4 صور بسرعة
 * ✅ صورة 1 فقط فيها البوكس المزخرف
 * ✅ الصور الاخرى بدون كتابة
 */

import axios from 'axios'
import FormData from 'form-data'

const BOT_NAME = '𝐃𝐀𝐌𝐀𝐑-𝐌𝐃'
const DEV_NUMBER = '+212 633-226499'

/* =========================================================
   Sessions
========================================================= */
const bananaSession = {}

/* =========================================================
   Settings
========================================================= */
const MAX_IMAGES = 4
const MAX_RETRIES = 3
const RETRY_DELAY = 5000
const POLL_DELAY = 3000 // نقصناه باش يكون اسرع
const MAX_POLLS = 25

/* =========================================================
   Sleep
========================================================= */
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

/* =========================================================
   Axios GET + Retry
========================================================= */
async function getWithRetry(url, options = {}) {
  let lastError = null
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await axios.get(url, options)
    } catch (error) {
      lastError = error
      const status = error?.response?.status
      console.error(`🍌 API Attempt ${attempt}/${MAX_RETRIES} | Status: ${status || 'unknown'}`)
      const retryable = status === 502 || status === 503 || status === 504 || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET' ||!error.response
      if (!retryable) throw error
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY * attempt)
    }
  }
  throw lastError
}

/* =========================================================
   Upload Image
========================================================= */
async function uploadMedia(m) {
  try {
    const q = m.quoted? m.quoted : m
    const mimetype = q.mimetype || q.msg?.mimetype || ''
    if (!/image/i.test(mimetype)) return null
    const media = await q.download()
    if (!media) return null
    const form = new FormData()
    form.append('file', media, { filename: 'image.jpg', contentType: mimetype })
    form.append('type', 'permanent')
    const response = await axios.post('https://tmp.malvryx.dev/upload', form, { headers: form.getHeaders(), timeout: 60000, maxBodyLength: Infinity, maxContentLength: Infinity })
    return response.data?.cdnUrl || response.data?.directUrl || response.data?.url || null
  } catch (error) {
    console.error('🍌 Upload Error:', error?.response?.data || error.message)
    return null
  }
}

/* =========================================================
   Guide
========================================================= */
async function showGuide(m, conn, usedPrefix, command) {
  return conn.reply(m.chat, `╭━━━〔 🍌 ${BOT_NAME} 〕━━━╮\n┃\n┃ 🤖 *Nano Banana AI*\n┃\n┃ ✨ توليد 4 صور بسرعة\n┃ 🎨 تعديل الصور\n┃ 🖼️ صورة واحدة فيها اللوغو\n┃\n╰━━━━━━━━━━━━━━━━━━╯\n\n📌 *توليد من وصف:*\n\n${usedPrefix}nano شاب مغربي فجبل كيبكي\n\n➡️ غادي نعطيك 4 صور بسرعة.\n\n👨‍💻 *المطور:* ${DEV_NUMBER}\n🤖 *البوت:* ${BOT_NAME}\n╰━━━━━━━━━━━━━━━━━━╯`, m)
}

/* =========================================================
   Wait For Result
========================================================= */
async function waitForResult(taskId) {
  for (let attempt = 1; attempt <= MAX_POLLS; attempt++) {
    await sleep(POLL_DELAY)
    try {
      const response = await getWithRetry(`https://omegatech-api.dixonomega.tech/api/ai/nano-banana2-result?task_id=${encodeURIComponent(taskId)}`, { timeout: 30000 })
      const data = response.data
      if (data?.status === 'completed' && data?.image_url) return data.image_url
      if (data?.status === 'failed') return null
    } catch (error) {
      const status = error?.response?.status
      if (status === 502 || status === 503 || status === 504) continue
      throw error
    }
  }
  return null
}

/* =========================================================
   Generate Prompt Variations
========================================================= */
function getGeneratePrompt(prompt, index) {
  const styles = [
    `VERSION 1: Natural realistic photography. Add this exact text box on the image:
╭━━━〔 🎨 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 〕━━━╮
┃
┃ ✅ *النتيجة 1/4*
┃
┃ 📝 الوصف:
┃ ${prompt}
┃
┃ 💡 اختار الصورة اللي عجباتك.
┃
┃ 👨‍💻 +212 633-226499
┃
╰━━━━━━━━━━╯`,

    `VERSION 2: Different camera angle and framing. Cinematic lighting. Keep the exact requested subject. No text on image.`,

    `VERSION 3: Professional portrait composition. Different perspective and lighting. Keep the requested subject unchanged. No text on image.`,

    `VERSION 4: Creative professional composition. Different framing and visual atmosphere. Keep the requested subject exactly as requested. No text on image.`
  ]
  return `USER REQUEST: ${prompt}\n\nGenerate image variation ${index + 1} of 4.\n\n${styles[index]}\n\nDo not change the main subject requested by the user.`
}

/* =========================================================
   Generate One
========================================================= */
async function generateOne(prompt, index) {
  try {
    const finalPrompt = getGeneratePrompt(prompt, index)
    const response = await getWithRetry(`https://omegatech-api.dixonomega.tech/api/ai/nano-banana-pro?prompt=${encodeURIComponent(finalPrompt)}`, { timeout: 120000 })
    return response.data?.image || response.data?.image_url || response.data?.url || null
  } catch (error) {
    console.error(`❌ Generate ${index + 1}:`, error?.response?.status || error.message)
    return null
  }
}

/* =========================================================
   Generate 4 FAST
========================================================= */
async function generateFour(prompt) {
  // كانولدوهم كاملين فدقة وحدة باش يكونو سريعين
  const promises = []
  for (let i = 0; i < MAX_IMAGES; i++) {
    promises.push(generateOne(prompt, i))
  }
  const results = await Promise.all(promises)
  return results.filter(r => r!== null)
}

/* =========================================================
   Send Results
========================================================= */
async function sendResults(conn, m, results, prompt) {
  for (let i = 0; i < results.length; i++) {
    const caption = i === 0?
`╭━━━〔 🎨 ${BOT_NAME} 〕━━━╮
┃
┃ ✅ *النتيجة ${i + 1}/${results.length}*
┃
┃ 📝 الوصف:
┃ ${prompt}
┃
┃ 💡 اختار الصورة اللي عجباتك.
┃
┃ 👨‍💻 ${DEV_NUMBER}
┃
╰━━━━━━━━━━━━━━━━━━╯`
:
`╭━━━〔 🎨 ${BOT_NAME} 〕━━━╮
┃
┃ ✅ *النتيجة ${i + 1}/${results.length}*
┃
┃ 📝 الوصف: ${prompt}
┃
╰━━━━━━━━━━━━━━━━━━╯`

    try {
      await conn.sendMessage(m.chat, { image: { url: results[i] }, caption }, { quoted: m })
    } catch (error) {
      console.error(`Send Result ${i + 1}:`, error.message)
    }
  }
}

/* =========================================================
   EDIT PROMPTS
========================================================= */
function getEditPrompt(originalPrompt, index) {
  const variations = [
    `VERSION 1: Create the edited image using the EXACT SAME original person. Add this exact text box:
╭━━━〔 🎨 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 〕━━━╮
┃
┃ ✅ *النتيجة 1/4*
┃
┃ 📝 الوصف:
┃ ${originalPrompt}
┃
┃ 💡 اختار الصورة اللي عجباتك.
┃
┃ 👨‍💻 +212 633-226499
┃
╰━━━━━━━━━━━━━━━━━━╯`,
    `VERSION 2: Use the EXACT SAME uploaded image. Apply the user's requested edit. No text on image.`,
    `VERSION 3: The uploaded image is the mandatory reference. Apply ONLY the requested modification. No text on image.`,
    `VERSION 4: Generate another variation based directly on the SAME uploaded image. No text on image.`
  ]
  return `USER EDIT REQUEST: ${originalPrompt}\n\nIMPORTANT: The uploaded image is the ORIGINAL SOURCE IMAGE.\n\n${variations[index]}`
}

async function editOneImage(imageUrl, prompt, index) {
  const finalPrompt = getEditPrompt(prompt, index)
  try {
    console.log(`🎨 Editing same image ${index + 1}/4`)
    const response = await getWithRetry(`https://omegatech-api.dixonomega.tech/api/ai/nano-banana2?prompt=${encodeURIComponent(finalPrompt)}&image=${encodeURIComponent(imageUrl)}`, { timeout: 120000 })
    const data = response.data
    if (!data?.task_id) return null
    const result = await waitForResult(data.task_id)
    return result
  } catch (error) {
    console.error(`❌ Edit ${index + 1} Error:`, error?.response?.status || error.message)
    return null
  }
}

async function editSameImageFourTimes(imageUrl, prompt) {
  const promises = []
  for (let i = 0; i < MAX_IMAGES; i++) {
    promises.push(editOneImage(imageUrl, prompt, i))
  }
  const results = await Promise.all(promises)
  return results.filter(r => r!== null)
}

/* =========================================================
   NANO PRO
========================================================= */
async function nanoProGenerate(images, prompt) {
  const promises = []
  for (let i = 0; i < MAX_IMAGES; i++) {
    const finalPrompt = `${prompt}\n\nThis is variation ${i + 1} of 4.\n${i === 0? 'Add the DAMAR-MD text box.' : 'No text on image.'}\nKeep all important people and objects from the uploaded reference images.`
    let apiUrl = `https://omegatech-api.dixonomega.tech/api/ai/nanobana-pro-v3?prompt=${encodeURIComponent(finalPrompt)}`
    images.forEach((url, index) => { apiUrl += `&image${index + 1}=${encodeURIComponent(url)}` })
    promises.push(getWithRetry(apiUrl, { timeout: 120000 }).then(res => waitForResult(res.data?.task_id)).catch(() => null))
  }
  const results = await Promise.all(promises)
  return results.filter(r => r!== null)
}

/* =========================================================
   MAIN HANDLER
========================================================= */
const handler = async (m, { conn, text, usedPrefix, command }) => {
  const userId = m.sender
  text = text || m.quoted?.text || m.msg?.caption || ''
  text = text.trim()
  const cmd = command.toLowerCase()

  if (cmd === 'nanopro') {
    if (!bananaSession[userId]) bananaSession[userId] = { images: [] }
    if (/^done\b/i.test(text)) {
      const session = bananaSession[userId]
      const prompt = text.replace(/^done\b/i, '').trim()
      if (session.images.length < 2) return conn.reply(m.chat, `⚠️ *${BOT_NAME}*\n\nخاصك تصيفط على الأقل جوج تصاور.\n\n📸 دابا عندك: *${session.images.length}/4*`, m)
      if (!prompt) return conn.reply(m.chat, `⚠️ *الوصف ناقص*\n\nمثال:\n\n*${usedPrefix}nanopro done جمع الأشخاص كاملين فصورة وحدة*`, m)
      await m.react('⏳')
      try {
        const results = await nanoProGenerate(session.images, prompt)
        if (!results.length) throw new Error('السيرفر ما رجع حتى نتيجة.')
        await sendResults(conn, m, results, prompt)
        await m.react('✅')
      } catch (error) {
        console.error('Nano Pro:', error)
        await m.react('❌')
        await conn.reply(m.chat, `❌ *${BOT_NAME}*\n\nما قدرناش نكملو الدمج.\n\n📌 *السبب:* ${error.message || 'خطأ غير معروف'}\n\n🔄 جرب من جديد من بعد شوية.`, m)
      }
      delete bananaSession[userId]
      return
    }
    if (bananaSession[userId].images.length >= 4) return conn.reply(m.chat, `❌ *${BOT_NAME}*\n\nوصلتي للحد الأقصى: *4 تصاور*.`, m)
    const image = await uploadMedia(m)
    if (!image) return showGuide(m, conn, usedPrefix, command)
    bananaSession[userId].images.push(image)
    const count = bananaSession[userId].images.length
    await m.react('📥')
    return conn.reply(m.chat, `╭━━━〔 🍌 ${BOT_NAME} 〕━━━╮\n┃\n┃ ✅ *الصورة تزادت!*\n┃\n┃ 🖼️ *${count}/4*\n┃\n┃ صيفط صورة أخرى\n┃\n┃ أو كتب:\n┃\n┃ *${usedPrefix}nanopro done <الوصف>*\n┃\n╰━━━━━━━━━━━━━━━━━━╯`, m)
  }

  if (cmd!== 'nano') return
  if (!text &&!m.quoted) return showGuide(m, conn, usedPrefix, command)
  const imageUrl = await uploadMedia(m)

  if (imageUrl) {
    if (!text) return conn.reply(m.chat, `⚠️ *${BOT_NAME}*\n\nصيفط وصف التعديل.\n\nمثال:\n\n*${usedPrefix}nano بدل الخلفية وخليها فالطبيعة*\n\nغادي ناخد *نفس الصورة* ونرجع ليك *4 نتائج مختلفة*.`, m)
    await m.react('⏳')
    try {
      const results = await editSameImageFourTimes(imageUrl, text)
      if (!results.length) throw new Error('السيرفر ما رجع حتى نتيجة. حاول من جديد.')
      await sendResults(conn, m, results, text)
      await m.react('✅')
    } catch (error) {
      console.error('Nano Edit Error:', error)
      await m.react('❌')
      let reason = error.message || 'خطأ غير معروف'
      const status = error?.response?.status
      if (status === 503) reason = 'سيرفر توليد الصور مشغول حالياً.'
      await conn.reply(m.chat, `❌ *${BOT_NAME}*\n\nما قدرتش نعدل الصورة.\n\n📌 *السبب:* ${reason}\n\n🔄 جرب من جديد من بعد شوية.`, m)
    }
    return
  }

  if (!text) return showGuide(m, conn, usedPrefix, command)
  await m.react('⏳')
  try {
    const results = await generateFour(text)
    if (!results.length) throw new Error('السيرفر ما رجع حتى صورة.')
    await sendResults(conn, m, results, text)
    await m.react('✅')
  } catch (error) {
    console.error('Nano Generate Error:', error)
    await m.react('❌')
    let reason = error.message || 'خطأ غير معروف'
    const status = error?.response?.status
    if (status === 503) reason = 'سيرفر توليد الصور مشغول حالياً بعد عدة محاولات.'
    await conn.reply(m.chat, `❌ *${BOT_NAME}*\n\nما قدرناش نولد الصور.\n\n📌 *السبب:* ${reason}\n\n🔄 جرب من جديد.`, m)
  }
}

handler.help = ['nano', 'nanopro']
handler.command = ['nano', 'nanopro']
handler.tags = ['editor']
handler.limit = false
export default handler