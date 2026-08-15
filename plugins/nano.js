/**
 * 🍌 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 | Nano-Banana AI
 * Developer: +212 633-226499
 * Language: Moroccan Darija
 * Features:
 * - توليد الصور من النص
 * - تعديل الصور
 * - دمج حتى 4 صور
 * - Nano Pro Collector Mode
 */

import axios from 'axios'
import FormData from 'form-data'

const BOT_NAME = '𝐃𝐀𝐌𝐀𝐑-𝐌𝐃'
const DEV_NUMBER = '+212 633-226499'

let bananaSession = {}

/* =========================
   رفع الصورة
========================= */

async function uploadMedia(m) {
  try {
    const q = m.quoted ? m.quoted : m
    const mimetype = q.mimetype || q.msg?.mimetype || ''

    if (!/image/.test(mimetype)) return null

    const media = await q.download()

    if (!media) return null

    const form = new FormData()

    form.append('file', media, {
      filename: 'image.jpg'
    })

    form.append('type', 'permanent')

    const res = await axios.post(
      'https://tmp.malvryx.dev/upload',
      form,
      {
        headers: form.getHeaders(),
        timeout: 60000
      }
    )

    return (
      res.data?.cdnUrl ||
      res.data?.directUrl ||
      null
    )

  } catch (e) {
    console.error('Upload Error:', e)
    return null
  }
}

/* =========================
   المساعدة
========================= */

function showGuide(m, conn, usedPrefix, command) {
  return conn.reply(
    m.chat,
`╭━━━〔 🍌 ${BOT_NAME} 〕━━━╮
┃
┃ 🤖 *ذكاء اصطناعي للصور*
┃
┃ ✨ نقدر نولد ليك صورة من وصف
┃ 🎨 ونقدر نعدل صورة وتعطيني
┃ 🖼️ ونقدر ندمج حتى 4 صور
┃
╰━━━━━━━━━━━━━━━━━━╯

📌 *طريقة الاستعمال:*

🔹 *${usedPrefix}nano <الوصف>*
توليد صورة من النص.

🔹 رد على صورة بـ:
*${usedPrefix}nano <التعديل>*

مثال:
*${usedPrefix}nano بدل الخلفية وخليها طبيعة*

🔹 *${usedPrefix}nanopro*
بدا وضع جمع الصور.

📥 صيفط الصور وحدة بوحدة.

🔹 من بعد كتب:
*${usedPrefix}nanopro done <الوصف>*

مثال:
*${usedPrefix}nanopro done جمع الأشخاص كاملين فصورة وحدة*

━━━━━━━━━━━━━━━━━━
👨‍💻 *المطور:* ${DEV_NUMBER}
🤖 *البوت:* ${BOT_NAME}
╰━━━━━━━━━━━━━━━━━━╯`,
    m
  )
}

/* =========================
   Handler
========================= */

let handler = async (
  m,
  {
    conn,
    text,
    usedPrefix,
    command
  }
) => {

  const userId = m.sender

  text =
    text ||
    m.quoted?.text ||
    m.msg?.caption ||
    ''

  const isNanoPro = /nanopro/i.test(command)

  /* =========================
     NANO PRO
  ========================= */

  if (isNanoPro) {

    if (!bananaSession[userId]) {
      bananaSession[userId] = {
        images: []
      }
    }

    /* =========================
       DONE
    ========================= */

    if (
      text &&
      text.toLowerCase().startsWith('done')
    ) {

      const session =
        bananaSession[userId]

      const finalPrompt =
        text
          .replace(/^done/i, '')
          .trim()

      if (session.images.length < 2) {

        return conn.reply(
          m.chat,
`⚠️ *${BOT_NAME}*

خاصك تصيفط على الأقل جوج تصاور قبل ما نبدأ الدمج. 🖼️

📌 دابا عندك:
*${session.images.length}/4*`,
          m
        )
      }

      if (!finalPrompt) {

        return conn.reply(
          m.chat,
`⚠️ *الوصف ناقص*

كتب الوصف ديالك هكا:

*${usedPrefix + command} done جمع هاد التصاور فصورة وحدة وخلي الخلفية جميلة*`,
          m
        )
      }

      await m.react('🕒')

      try {

        let apiUrl =
          `https://omegatech-api.dixonomega.tech/api/ai/nanobana-pro-v3?prompt=${encodeURIComponent(finalPrompt)}`

        session.images.forEach(
          (url, i) => {
            apiUrl +=
              `&image${i + 1}=${encodeURIComponent(url)}`
          }
        )

        const {
          data: initRes
        } = await axios.get(
          apiUrl,
          {
            timeout: 60000
          }
        )

        if (!initRes?.success) {
          throw new Error(
            'السيرفر ما قدرش يبدا معالجة الصور.'
          )
        }

        const taskId =
          initRes.task_id

        if (!taskId) {
          throw new Error(
            'ما توصلناش بمعرف المهمة.'
          )
        }

        let resultUrl = null

        let attempts = 0

        while (
          !resultUrl &&
          attempts < 25
        ) {

          await new Promise(
            r => setTimeout(r, 5000)
          )

          const {
            data: check
          } = await axios.get(
            `https://omegatech-api.dixonomega.tech/api/ai/nano-banana2-result?task_id=${taskId}`,
            {
              timeout: 30000
            }
          )

          if (
            check?.status === 'completed' &&
            check?.image_url
          ) {

            resultUrl =
              check.image_url

            break
          }

          if (
            check?.status === 'failed'
          ) {

            throw new Error(
              'السيرفر فشل فمعالجة الصور.'
            )
          }

          attempts++
        }

        if (!resultUrl) {

          throw new Error(
            'العملية خذات وقت بزاف وما كملاتش.'
          )
        }

        await conn.sendMessage(
          m.chat,
          {
            image: {
              url: resultUrl
            },

            caption:
`╭━━━〔 🍌 ${BOT_NAME} 〕━━━╮
┃
┃ ✅ *تم دمج الصور بنجاح!*
┃
┃ 🖼️ الصور: ${session.images.length}/4
┃ 📝 الوصف:
┃ ${finalPrompt}
┃
┃ 👨‍💻 المطور:
┃ ${DEV_NUMBER}
┃
╰━━━━━━━━━━━━━━━━━━╯`
          },
          {
            quoted: m
          }
        )

        await m.react('✅')

        delete bananaSession[userId]

      } catch (e) {

        console.error(
          'Nano Pro Error:',
          e
        )

        await m.react('❌')

        await conn.reply(
          m.chat,
`❌ *${BOT_NAME}*

وقع مشكل فمعالجة الصور.

📌 *السبب:*
${e.message || 'خطأ غير معروف'}

🔄 جرب من جديد.`,
          m
        )

        delete bananaSession[userId]
      }

      return
    }

    /* =========================
       ADD IMAGE
    ========================= */

    const link =
      await uploadMedia(m)

    if (!link) {

      return showGuide(
        m,
        conn,
        usedPrefix,
        command
      )
    }

    if (
      bananaSession[userId].images.length >= 4
    ) {

      return conn.reply(
        m.chat,
`❌ *${BOT_NAME}*

وصلتي للحد الأقصى.

🖼️ مسموح غير بـ *4 تصاور* فكل عملية.`,
        m
      )
    }

    bananaSession[userId].images.push(link)

    const count =
      bananaSession[userId].images.length

    await m.react('📥')

    return conn.reply(
      m.chat,
`╭━━━〔 🍌 ${BOT_NAME} 〕━━━╮
┃
┃ ✅ *الصورة تزادت بنجاح!*
┃
┃ 🖼️ الصور: *${count}/4*
┃
┃ 📥 صيفط صورة أخرى
┃ أو كتب:
┃
┃ *${usedPrefix + command} done <الوصف>*
┃
╰━━━━━━━━━━━━━━━━━━╯`,
      m
    )
  }

  /* =========================
     NANO
  ========================= */

  if (
    command.toLowerCase() === 'nano'
  ) {

    if (
      !text &&
      !m.quoted
    ) {

      return showGuide(
        m,
        conn,
        usedPrefix,
        command
      )
    }

    const imageUrl =
      await uploadMedia(m)

    /* =========================
       IMAGE EDIT
    ========================= */

    if (imageUrl) {

      if (!text) {

        return conn.reply(
          m.chat,
`⚠️ *${BOT_NAME}*

خاصك تقول ليا شنو بغيتي نبدل فالصورة.

مثال:

رد على الصورة وكتب:

*${usedPrefix}nano بدل الخلفية وخليها فالطبيعة*

أو:

*${usedPrefix}nano بدل الملابس وخلي الشخص لابس بدلة سوداء*`,
          m
        )
      }

      await m.react('🎨')

      try {

        const {
          data: init
        } = await axios.get(
          `https://omegatech-api.dixonomega.tech/api/ai/nano-banana2?prompt=${encodeURIComponent(text)}&image=${encodeURIComponent(imageUrl)}`,
          {
            timeout: 60000
          }
        )

        if (!init?.task_id) {
          throw new Error(
            'السيرفر ما عطاش معرف المهمة.'
          )
        }

        let resultUrl = null

        for (
          let i = 0;
          i < 20;
          i++
        ) {

          await new Promise(
            r => setTimeout(r, 5000)
          )

          const {
            data: check
          } = await axios.get(
            `https://omegatech-api.dixonomega.tech/api/ai/nano-banana2-result?task_id=${init.task_id}`,
            {
              timeout: 30000
            }
          )

          if (
            check?.status === 'completed' &&
            check?.image_url
          ) {

            resultUrl =
              check.image_url

            break
          }

          if (
            check?.status === 'failed'
          ) {

            throw new Error(
              'السيرفر فشل فتعديل الصورة.'
            )
          }
        }

        if (resultUrl) {

          await conn.sendMessage(
            m.chat,
            {
              image: {
                url: resultUrl
              },

              caption:
`╭━━━〔 🎨 ${BOT_NAME} 〕━━━╮
┃
┃ ✅ *الصورة تعدلات بنجاح!*
┃
┃ 📝 التعديل:
┃ ${text}
┃
┃ 👨‍💻 المطور:
┃ ${DEV_NUMBER}
┃
╰━━━━━━━━━━━━━━━━━━╯`
            },
            {
              quoted: m
            }
          )

          await m.react('✅')

        } else {

          await m.react('❌')

          await conn.reply(
            m.chat,
`❌ *${BOT_NAME}*

تعديل الصورة خذا وقت بزاف وما كملش.

🔄 جرب من جديد.`,
            m
          )
        }

      } catch (e) {

        console.error(
          'Nano Edit Error:',
          e
        )

        await m.react('❌')

        await conn.reply(
          m.chat,
`❌ *${BOT_NAME}*

ما قدرتش نعدل الصورة.

📌 *السبب:*
${e.message || 'خطأ غير معروف'}

🔄 جرب وصف آخر.`,
          m
        )
      }

      return
    }

    /* =========================
       TEXT TO IMAGE
    ========================= */

    if (!text) {

      return showGuide(
        m,
        conn,
        usedPrefix,
        command
      )
    }

    await m.react('⏳')

    try {

      const {
        data
      } = await axios.get(
        `https://omegatech-api.dixonomega.tech/api/ai/nano-banana-pro?prompt=${encodeURIComponent(text)}`,
        {
          timeout: 120000
        }
      )

      if (
        data?.image
      ) {

        await conn.sendMessage(
          m.chat,
          {
            image: {
              url: data.image
            },

            caption:
`╭━━━〔 🍌 ${BOT_NAME} 〕━━━╮
┃
┃ ✅ *الصورة تصاوبات بنجاح!*
┃
┃ 📝 الوصف:
┃ ${text}
┃
┃ 👨‍💻 المطور:
┃ ${DEV_NUMBER}
┃
╰━━━━━━━━━━━━━━━━━━╯`
          },
          {
            quoted: m
          }
        )

        await m.react('✅')

      } else {

        await m.react('❌')

        await conn.reply(
          m.chat,
`❌ *${BOT_NAME}*

ما قدرناش نولد الصورة دابا.

🔄 جرب وصف آخر.`,
          m
        )
      }

    } catch (e) {

      console.error(
        'Nano Generate Error:',
        e
      )

      await m.react('❌')

      await conn.reply(
        m.chat,
`❌ *${BOT_NAME}*

وقع مشكل فالتوليد.

📌 *السبب:*
${e.message || 'خطأ غير معروف'}

🔄 جرب من جديد.`,
        m
      )
    }
  }
}

/* =========================
   Plugin Settings
========================= */

handler.help = [
  'nano',
  'nanopro'
]

handler.command = [
  'nano',
  'nanopro'
]

handler.tags = [
  'editor'
]

handler.limit = false

export default handler