/**
 * 🍌 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 | Nano-Banana AI V5
 * Developer: +212 633-226499
 *
 * ✅ توليد 4 صور مختلفة من النص
 * ✅ تعديل صورة واحدة وإخراج 4 نسخ مختلفة منها
 * ✅ نفس الصورة الأصلية تبقى هي المرجع في جميع النتائج
 * ✅ دمج حتى 4 صور بواسطة Nano Pro
 * ✅ Retry تلقائي مع 503 / 502 / 504
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
const POLL_DELAY = 5000
const MAX_POLLS = 25

/* =========================================================
   Sleep
========================================================= */

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms))

/* =========================================================
   Axios GET + Retry
========================================================= */

async function getWithRetry(url, options = {}) {

  let lastError = null

  for (
    let attempt = 1;
    attempt <= MAX_RETRIES;
    attempt++
  ) {

    try {

      return await axios.get(
        url,
        options
      )

    } catch (error) {

      lastError = error

      const status =
        error?.response?.status

      console.error(
        `🍌 API Attempt ${attempt}/${MAX_RETRIES} | Status: ${status || 'unknown'}`
      )

      const retryable =
        status === 502 ||
        status === 503 ||
        status === 504 ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNRESET' ||
        !error.response

      if (!retryable) {
        throw error
      }

      if (
        attempt < MAX_RETRIES
      ) {

        await sleep(
          RETRY_DELAY * attempt
        )
      }
    }
  }

  throw lastError
}

/* =========================================================
   Upload Image
========================================================= */

async function uploadMedia(m) {

  try {

    const q =
      m.quoted
        ? m.quoted
        : m

    const mimetype =
      q.mimetype ||
      q.msg?.mimetype ||
      ''

    if (
      !/image/i.test(mimetype)
    ) {
      return null
    }

    const media =
      await q.download()

    if (!media) {
      return null
    }

    const form =
      new FormData()

    form.append(
      'file',
      media,
      {
        filename: 'image.jpg',
        contentType: mimetype
      }
    )

    form.append(
      'type',
      'permanent'
    )

    const response =
      await axios.post(
        'https://tmp.malvryx.dev/upload',
        form,
        {
          headers:
            form.getHeaders(),

          timeout: 60000,

          maxBodyLength:
            Infinity,

          maxContentLength:
            Infinity
        }
      )

    return (
      response.data?.cdnUrl ||
      response.data?.directUrl ||
      response.data?.url ||
      null
    )

  } catch (error) {

    console.error(
      '🍌 Upload Error:',
      error?.response?.data ||
      error.message
    )

    return null
  }
}

/* =========================================================
   Guide
========================================================= */

async function showGuide(
  m,
  conn,
  usedPrefix,
  command
) {

  return conn.reply(
    m.chat,

`╭━━━〔 🍌 ${BOT_NAME} 〕━━━╮
┃
┃ 🤖 *Nano Banana AI*
┃
┃ ✨ توليد الصور
┃ 🎨 تعديل الصور
┃ 🖼️ 4 نتائج مختلفة
┃ 🔥 دمج حتى 4 صور
┃
╰━━━━━━━━━━━━━━━━━━╯

📌 *توليد من وصف:*

${usedPrefix}nano شاب مغربي وسط مدينة جميلة

➡️ غادي نعطيك 4 صور مختلفة.

━━━━━━━━━━━━━━━━━━

🎨 *تعديل صورة:*

رد على الصورة وكتب:

${usedPrefix}nano بدل الخلفية وخليها فالطبيعة

➡️ نفس الصورة الأصلية
➡️ 4 نتائج مختلفة
➡️ نفس الشخص والعناصر
➡️ الاختلاف غير فالشكل والتكوين والإضاءة

━━━━━━━━━━━━━━━━━━

🖼️ *Nano Pro:*

${usedPrefix}nanopro

صيفط حتى 4 تصاور.

من بعد:

${usedPrefix}nanopro done جمع الأشخاص فصورة وحدة

━━━━━━━━━━━━━━━━━━
👨‍💻 *المطور:* ${DEV_NUMBER}
🤖 *البوت:* ${BOT_NAME}
╰━━━━━━━━━━━━━━━━━━╯`,
    m
  )
}

/* =========================================================
   Wait For Result
========================================================= */

async function waitForResult(taskId) {

  for (
    let attempt = 1;
    attempt <= MAX_POLLS;
    attempt++
  ) {

    await sleep(
      POLL_DELAY
    )

    try {

      const response =
        await getWithRetry(
          `https://omegatech-api.dixonomega.tech/api/ai/nano-banana2-result?task_id=${encodeURIComponent(taskId)}`,
          {
            timeout: 30000
          }
        )

      const data =
        response.data

      if (
        data?.status === 'completed' &&
        data?.image_url
      ) {

        return data.image_url
      }

      if (
        data?.status === 'failed'
      ) {

        return null
      }

    } catch (error) {

      const status =
        error?.response?.status

      /*
       * إذا كان خطأ مؤقت نخلي العملية تكمل
       */

      if (
        status === 502 ||
        status === 503 ||
        status === 504
      ) {

        console.log(
          `🍌 Poll temporary error: ${status}`
        )

        continue
      }

      throw error
    }
  }

  return null
}

/* =========================================================
   EDIT PROMPTS
   مهم:
   نفس الصورة الأصلية + نفس الشخص
   غير اختلاف بسيط بين النتائج
========================================================= */

function getEditPrompt(
  originalPrompt,
  index
) {

  const variations = [

    `
VERSION 1:
Create the edited image using the EXACT SAME original person,
same identity, same face, same body, same clothing structure,
same main objects and same scene composition.
Apply ONLY the user's requested edit.
Use a natural realistic composition and normal camera angle.
`,

    `
VERSION 2:
Use the EXACT SAME uploaded image as the primary reference.
Preserve the same person, identity, face, body, important objects
and all details that were not requested to change.
Apply the user's requested edit.
Make only the visual composition slightly different,
with a different camera angle or framing.
Do NOT replace the person.
`,

    `
VERSION 3:
The uploaded image is the mandatory reference.
Keep the SAME person and recognizable identity,
same main elements and same requested subject.
Apply ONLY the requested modification.
Use a different professional lighting setup and framing,
while keeping the original person and scene recognizable.
`,

    `
VERSION 4:
Generate another variation based directly on the SAME uploaded image.
Preserve the person's identity, face, body and main visual elements.
Apply the exact requested edit.
Make the result visually different through composition,
camera perspective, lighting and background details,
but DO NOT create a different person.
`
  ]

  return `
USER EDIT REQUEST:
${originalPrompt}

IMPORTANT:
The uploaded image is the ORIGINAL SOURCE IMAGE.

You MUST use the uploaded image as the main reference.

Keep the same person and identity.
Keep the same face and recognizable features.
Keep the same main objects.
Keep everything that the user did NOT ask to change.

Only perform the requested modification.

Do not invent a completely different person.
Do not replace the subject.
Do not remove important original elements unless the user requested it.

This is result ${index + 1} of 4.

${variations[index]}
`
}

/* =========================================================
   EDIT ONE IMAGE
========================================================= */

async function editOneImage(
  imageUrl,
  prompt,
  index
) {

  const finalPrompt =
    getEditPrompt(
      prompt,
      index
    )

  try {

    console.log(
      `🎨 Editing same image ${index + 1}/4`
    )

    const response =
      await getWithRetry(
        `https://omegatech-api.dixonomega.tech/api/ai/nano-banana2?prompt=${encodeURIComponent(finalPrompt)}&image=${encodeURIComponent(imageUrl)}`,
        {
          timeout: 120000
        }
      )

    const data =
      response.data

    if (
      !data?.task_id
    ) {

      console.error(
        `❌ Edit ${index + 1}: task_id missing`
      )

      return null
    }

    const result =
      await waitForResult(
        data.task_id
      )

    return result

  } catch (error) {

    console.error(
      `❌ Edit ${index + 1} Error:`,
      error?.response?.status ||
      error.message
    )

    return null
  }
}

/* =========================================================
   EDIT SAME IMAGE 4 TIMES
========================================================= */

async function editSameImageFourTimes(
  imageUrl,
  prompt
) {

  const results = []

  for (
    let i = 0;
    i < MAX_IMAGES;
    i++
  ) {

    const result =
      await editOneImage(
        imageUrl,
        prompt,
        i
      )

    if (result) {

      results.push(result)
    }

    /*
     * ما نضربوش API بـ4 طلبات دفعة وحدة
     */

    if (
      i < MAX_IMAGES - 1
    ) {

      await sleep(3000)
    }
  }

  return results
}

/* =========================================================
   Generate Prompt Variations
========================================================= */

function getGeneratePrompt(
  prompt,
  index
) {

  const styles = [

    `
VERSION 1:
Natural realistic photography.
Balanced composition.
Professional camera framing.
`,

    `
VERSION 2:
Different camera angle and framing.
Cinematic lighting.
Keep the exact requested subject.
`,

    `
VERSION 3:
Professional portrait composition.
Different perspective and lighting.
Keep the requested subject unchanged.
`,

    `
VERSION 4:
Creative professional composition.
Different framing and visual atmosphere.
Keep the requested subject exactly as requested.
`
  ]

  return `
USER REQUEST:
${prompt}

Generate image variation ${index + 1} of 4.

${styles[index]}

Do not change the main subject requested by the user.
`
}

/* =========================================================
   Generate One
========================================================= */

async function generateOne(
  prompt,
  index
) {

  try {

    const finalPrompt =
      getGeneratePrompt(
        prompt,
        index
      )

    const response =
      await getWithRetry(
        `https://omegatech-api.dixonomega.tech/api/ai/nano-banana-pro?prompt=${encodeURIComponent(finalPrompt)}`,
        {
          timeout: 120000
        }
      )

    return (
      response.data?.image ||
      response.data?.image_url ||
      response.data?.url ||
      null
    )

  } catch (error) {

    console.error(
      `❌ Generate ${index + 1}:`,
      error?.response?.status ||
      error.message
    )

    return null
  }
}

/* =========================================================
   Generate 4
========================================================= */

async function generateFour(
  prompt
) {

  const results = []

  for (
    let i = 0;
    i < MAX_IMAGES;
    i++
  ) {

    const result =
      await generateOne(
        prompt,
        i
      )

    if (result) {

      results.push(result)
    }

    if (
      i < MAX_IMAGES - 1
    ) {

      await sleep(3000)
    }
  }

  return results
}

/* =========================================================
   Send Results
========================================================= */

async function sendResults(
  conn,
  m,
  results,
  prompt,
  type = 'edit'
) {

  for (
    let i = 0;
    i < results.length;
    i++
  ) {

    const caption =
`╭━━━〔 ${type === 'edit' ? '🎨' : '🍌'} ${BOT_NAME} 〕━━━╮
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

    try {

      await conn.sendMessage(
        m.chat,
        {
          image: {
            url: results[i]
          },
          caption
        },
        {
          quoted: m
        }
      )

    } catch (error) {

      console.error(
        `Send Result ${i + 1}:`,
        error.message
      )
    }

    await sleep(1000)
  }
}

/* =========================================================
   NANO PRO
========================================================= */

async function nanoProGenerate(
  images,
  prompt
) {

  const results = []

  for (
    let i = 0;
    i < MAX_IMAGES;
    i++
  ) {

    try {

      const finalPrompt =
`${prompt}

This is variation ${i + 1} of 4.

Keep all important people and objects from the uploaded reference images.
Create a different professional composition for each variation.
Do not remove the requested subjects.`

      let apiUrl =
        `https://omegatech-api.dixonomega.tech/api/ai/nanobana-pro-v3?prompt=${encodeURIComponent(finalPrompt)}`

      images.forEach(
        (url, index) => {

          apiUrl +=
            `&image${index + 1}=${encodeURIComponent(url)}`
        }
      )

      const response =
        await getWithRetry(
          apiUrl,
          {
            timeout: 120000
          }
        )

      const data =
        response.data

      if (
        !data?.task_id
      ) {

        continue
      }

      const result =
        await waitForResult(
          data.task_id
        )

      if (result) {

        results.push(result)
      }

    } catch (error) {

      console.error(
        `Nano Pro ${i + 1}:`,
        error?.response?.status ||
        error.message
      )
    }

    if (
      i < MAX_IMAGES - 1
    ) {

      await sleep(3000)
    }
  }

  return results
}

/* =========================================================
   MAIN HANDLER
========================================================= */

const handler = async (
  m,
  {
    conn,
    text,
    usedPrefix,
    command
  }
) => {

  const userId =
    m.sender

  text =
    text ||
    m.quoted?.text ||
    m.msg?.caption ||
    ''

  text =
    text.trim()

  const cmd =
    command.toLowerCase()

  /* =======================================================
     NANO PRO
  ======================================================= */

  if (
    cmd === 'nanopro'
  ) {

    if (
      !bananaSession[userId]
    ) {

      bananaSession[userId] = {
        images: []
      }
    }

    /*
     * DONE
     */

    if (
      /^done\b/i.test(text)
    ) {

      const session =
        bananaSession[userId]

      const prompt =
        text
          .replace(/^done\b/i, '')
          .trim()

      if (
        session.images.length < 2
      ) {

        return conn.reply(
          m.chat,

`⚠️ *${BOT_NAME}*

خاصك تصيفط على الأقل جوج تصاور.

📸 دابا عندك:
*${session.images.length}/4*`,
          m
        )
      }

      if (!prompt) {

        return conn.reply(
          m.chat,

`⚠️ *الوصف ناقص*

مثال:

*${usedPrefix}nanopro done جمع الأشخاص كاملين فصورة وحدة*`,
          m
        )
      }

      await m.react('⏳')

      try {

        const results =
          await nanoProGenerate(
            session.images,
            prompt
          )

        if (!results.length) {

          throw new Error(
            'السيرفر ما رجع حتى نتيجة.'
          )
        }

        await sendResults(
          conn,
          m,
          results,
          prompt,
          'edit'
        )

        await m.react('✅')

      } catch (error) {

        console.error(
          'Nano Pro:',
          error
        )

        await m.react('❌')

        await conn.reply(
          m.chat,

`❌ *${BOT_NAME}*

ما قدرناش نكملو الدمج.

📌 *السبب:*
${error.message || 'خطأ غير معروف'}

🔄 جرب من جديد من بعد شوية.`,
          m
        )
      }

      delete bananaSession[userId]

      return
    }

    /*
     * Add image
     */

    if (
      bananaSession[userId].images.length >= 4
    ) {

      return conn.reply(
        m.chat,

`❌ *${BOT_NAME}*

وصلتي للحد الأقصى: *4 تصاور*.`,
        m
      )
    }

    const image =
      await uploadMedia(m)

    if (!image) {

      return showGuide(
        m,
        conn,
        usedPrefix,
        command
      )
    }

    bananaSession[userId].images.push(
      image
    )

    const count =
      bananaSession[userId].images.length

    await m.react('📥')

    return conn.reply(
      m.chat,

`╭━━━〔 🍌 ${BOT_NAME} 〕━━━╮
┃
┃ ✅ *الصورة تزادت!*
┃
┃ 🖼️ *${count}/4*
┃
┃ صيفط صورة أخرى
┃
┃ أو كتب:
┃
┃ *${usedPrefix}nanopro done <الوصف>*
┃
╰━━━━━━━━━━━━━━━━━━╯`,
      m
    )
  }

  /* =======================================================
     NANO
  ======================================================= */

  if (
    cmd !== 'nano'
  ) {
    return
  }

  /*
   * إذا ما كاين لا وصف لا صورة
   */

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

  /*
   * نشوف واش كاينة صورة
   */

  const imageUrl =
    await uploadMedia(m)

  /* =======================================================
     IMAGE EDIT
     نفس الصورة -> 4 نتائج
  ======================================================= */

  if (imageUrl) {

    if (!text) {

      return conn.reply(
        m.chat,

`⚠️ *${BOT_NAME}*

صيفط وصف التعديل.

مثال:

*${usedPrefix}nano بدل الخلفية وخليها فالطبيعة*

غادي ناخد *نفس الصورة* ونرجع ليك *4 نتائج مختلفة*.`,
        m
      )
    }

    await m.react('⏳')

    try {

      /*
       * IMPORTANT:
       * نفس imageUrl كيتستعمل
       * في الأربع عمليات.
       */

      const results =
        await editSameImageFourTimes(
          imageUrl,
          text
        )

      if (!results.length) {

        throw new Error(
          'السيرفر ما رجع حتى نتيجة. حاول من جديد.'
        )
      }

      await sendResults(
        conn,
        m,
        results,
        text,
        'edit'
      )

      await m.react('✅')

    } catch (error) {

      console.error(
        'Nano Edit Error:',
        error
      )

      await m.react('❌')

      let reason =
        error.message ||
        'خطأ غير معروف'

      const status =
        error?.response?.status

      if (
        status === 503
      ) {

        reason =
          'سيرفر توليد الصور مشغول حالياً. الكود حاول إعادة الطلب تلقائياً ولكن السيرفر ما تجاوبش.'
      }

      await conn.reply(
        m.chat,

`❌ *${BOT_NAME}*

ما قدرتش نعدل الصورة.

📌 *السبب:*
${reason}

🔄 جرب من جديد من بعد شوية.`,
        m
      )
    }

    return
  }

  /* =======================================================
     TEXT TO IMAGE
  ======================================================= */

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

    const results =
      await generateFour(
        text
      )

    if (!results.length) {

      throw new Error(
        'السيرفر ما رجع حتى صورة.'
      )
    }

    await sendResults(
      conn,
      m,
      results,
      text,
      'generate'
    )

    await m.react('✅')

  } catch (error) {

    console.error(
      'Nano Generate Error:',
      error
    )

    await m.react('❌')

    let reason =
      error.message ||
      'خطأ غير معروف'

    const status =
      error?.response?.status

    if (
      status === 503
    ) {

      reason =
        'سيرفر توليد الصور مشغول حالياً بعد عدة محاولات.'
    }

    await conn.reply(
      m.chat,

`❌ *${BOT_NAME}*

ما قدرناش نولد الصور.

📌 *السبب:*
${reason}

🔄 جرب من جديد.`,
      m
    )
  }
}

/* =========================================================
   PLUGIN SETTINGS
========================================================= */

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