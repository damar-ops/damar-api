/**
 * 🍌 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 | NANO BANANA AI V10
 *
 * NANO:
 * ✅ صورة واحدة + وصف = 4 نتائج
 * ✅ من 2 حتى 4 صور + وصف = دمج الأشخاص
 * ✅ إعادة المحاولة تلقائياً عند فشل صورة
 *
 * LOGO:
 * ✅ بدون صورة = 4 Logos مختلفة
 * ✅ مع صورة = استعمال الصورة كمرجع
 * ✅ إعادة المحاولة حتى محاولة جمع 4 نتائج
 */

import axios from 'axios'
import FormData from 'form-data'

// ============================================================
// CONFIG
// ============================================================

const BOT_NAME = '𝐃𝐀𝐌𝐀𝐑-𝐌𝐃'
const DEV_NUMBER = '+212 633-226499'

const MAX_IMAGES = 4
const MAX_RESULTS = 4

// عدد المحاولات الإضافية إذا فشلت بعض الصور
const MAX_GENERATION_ATTEMPTS = 10

const MAX_RETRIES = 3
const RETRY_DELAY = 4000

const POLL_DELAY = 4000
const MAX_POLLS = 30

const SESSION_TIME = 10 * 60 * 1000

// ============================================================
// SESSIONS
// ============================================================

const bananaSessions = Object.create(null)

// ============================================================
// SLEEP
// ============================================================

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms))

// ============================================================
// RETRY GET
// ============================================================

async function getWithRetry(url, options = {}) {
  let lastError = null

  for (
    let attempt = 1;
    attempt <= MAX_RETRIES;
    attempt++
  ) {
    try {
      return await axios.get(url, options)

    } catch (error) {
      lastError = error

      const status = error?.response?.status

      console.log(
        `🍌 API ${attempt}/${MAX_RETRIES} | ${status || error.code || 'ERROR'}`
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

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY * attempt)
      }
    }
  }

  throw lastError
}

// ============================================================
// UPLOAD IMAGE
// ============================================================

async function uploadMedia(m) {
  try {
    const q =
      m?.quoted
        ? m.quoted
        : m

    const mimetype =
      q?.mimetype ||
      q?.msg?.mimetype ||
      m?.mimetype ||
      m?.msg?.mimetype ||
      ''

    if (!/image/i.test(mimetype)) {
      return null
    }

    const media = await q.download()

    if (!media) {
      return null
    }

    const form = new FormData()

    form.append(
      'file',
      media,
      {
        filename: `damar-${Date.now()}.jpg`,
        contentType: mimetype || 'image/jpeg'
      }
    )

    form.append('type', 'permanent')

    const response = await axios.post(
      'https://tmp.malvryx.dev/upload',
      form,
      {
        headers: form.getHeaders(),
        timeout: 90000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      }
    )

    const imageUrl =
      response.data?.cdnUrl ||
      response.data?.directUrl ||
      response.data?.url ||
      null

    if (!imageUrl) {
      console.log('❌ Upload: no image URL')
      return null
    }

    console.log('✅ Image uploaded:', imageUrl)

    return imageUrl

  } catch (error) {
    console.error(
      '❌ Upload Error:',
      error?.response?.data || error.message
    )

    return null
  }
}

// ============================================================
// GET IMAGE
// ============================================================

async function getImageFromMessage(m) {
  try {
    const image = await uploadMedia(m)

    if (image) {
      return image
    }

    if (m?.quoted) {
      const quotedImage =
        await uploadMedia(m.quoted)

      if (quotedImage) {
        return quotedImage
      }
    }

    return null

  } catch (error) {
    console.error(
      'getImageFromMessage:',
      error.message
    )

    return null
  }
}

// ============================================================
// WAIT FOR TASK
// ============================================================

async function waitForResult(taskId) {
  for (
    let attempt = 1;
    attempt <= MAX_POLLS;
    attempt++
  ) {
    await sleep(POLL_DELAY)

    try {
      const response = await getWithRetry(
        `https://omegatech-api.dixonomega.tech/api/ai/nano-banana2-result?task_id=${encodeURIComponent(taskId)}`,
        {
          timeout: 30000
        }
      )

      const data = response.data || {}

      if (data.status === 'completed') {
        const result =
          data.image_url ||
          data.image ||
          data.url

        if (result) {
          return result
        }
      }

      if (
        data.status === 'failed' ||
        data.status === 'error'
      ) {
        console.log('❌ Task failed:', data)
        return null
      }

      console.log(
        `🍌 Waiting ${attempt}/${MAX_POLLS}`
      )

    } catch (error) {
      const status = error?.response?.status

      if (
        status === 502 ||
        status === 503 ||
        status === 504
      ) {
        console.log(
          `🍌 Temporary poll error: ${status}`
        )

        continue
      }

      throw error
    }
  }

  return null
}

// ============================================================
// SINGLE IMAGE PROMPT
// ============================================================

function getSingleImagePrompt(userPrompt, index) {
  const variations = [
    'Use realistic professional photography. Keep the original person exactly recognizable. Apply only the requested modification.',
    'Use the exact uploaded image as the primary reference. Keep the same person identity and face. Use a slightly different camera angle.',
    'Preserve the same person, face, body and important details. Apply only the requested modification. Use different realistic lighting.',
    'Use the same original person and identity. Do not replace the person. Create another realistic variation.'
  ]

  return `
IMAGE EDITING TASK

USER REQUEST:
${userPrompt}

The uploaded image is the ORIGINAL SOURCE.

Keep the exact same person.

Preserve:
- face
- facial structure
- eyes
- nose
- mouth
- hairstyle
- skin appearance
- body appearance
- recognizable features

DO NOT create a different person.
DO NOT replace the face.
DO NOT invent a new identity.

Only perform the modification requested by the user.

${variations[index % 4]}

Create a unique variation.
`
}

// ============================================================
// EDIT SINGLE IMAGE
// ============================================================

async function editSingleImage(
  imageUrl,
  prompt,
  index
) {
  try {
    const finalPrompt =
      getSingleImagePrompt(prompt, index)

    console.log(
      `🎨 Single Edit ${index + 1}`
    )

    const response = await getWithRetry(
      `https://omegatech-api.dixonomega.tech/api/ai/nano-banana2?prompt=${encodeURIComponent(finalPrompt)}&image=${encodeURIComponent(imageUrl)}`,
      {
        timeout: 180000
      }
    )

    const data = response.data || {}

    const directImage =
      data.image ||
      data.image_url ||
      data.url

    if (directImage) {
      return directImage
    }

    if (data.task_id) {
      return await waitForResult(data.task_id)
    }

    return null

  } catch (error) {
    console.error(
      `❌ Single Edit ${index + 1}:`,
      error?.response?.data || error.message
    )

    return null
  }
}

// ============================================================
// SINGLE -> ALWAYS TRY FOR 4
// ============================================================

async function editSingleFour(imageUrl, prompt) {
  const results = []
  let attempt = 0

  while (
    results.length < MAX_RESULTS &&
    attempt < MAX_GENERATION_ATTEMPTS
  ) {
    const variationIndex =
      attempt % MAX_RESULTS

    attempt++

    console.log(
      `🍌 SINGLE Attempt ${attempt}/${MAX_GENERATION_ATTEMPTS} | Results ${results.length}/${MAX_RESULTS}`
    )

    const result = await editSingleImage(
      imageUrl,
      prompt,
      variationIndex
    )

    if (
      result &&
      !results.includes(result)
    ) {
      results.push(result)

      console.log(
        `✅ SINGLE ${results.length}/${MAX_RESULTS}`
      )

    } else {
      console.log(
        '⚠️ SINGLE failed, retrying...'
      )
    }

    if (results.length < MAX_RESULTS) {
      await sleep(3000)
    }
  }

  return results
}

// ============================================================
// MULTI IMAGE PROMPT
// ============================================================

function getMultiImagePrompt(
  images,
  userPrompt,
  index
) {
  return `
MULTI-IMAGE COMPOSITION TASK

USER REQUEST:
${userPrompt}

REFERENCE IMAGES: ${images.length}

Use the actual people shown in ALL uploaded images.

DO NOT invent new people.
DO NOT replace people.
DO NOT replace faces.
DO NOT change identities.
DO NOT add extra people.

Preserve each person's:
- face
- facial structure
- eyes
- nose
- mouth
- hairstyle
- skin appearance
- recognizable characteristics

Put the SAME people together naturally
according to the user's request.

Create a realistic composition.

Variation style ${index + 1}:
${[
  'natural realistic composition with professional photography',
  'cinematic composition with a different camera angle',
  'realistic natural lighting and balanced composition',
  'creative realistic framing while preserving all identities'
][index % 4]}
`
}

// ============================================================
// MULTI IMAGE
// ============================================================

async function generateMultiImage(
  images,
  prompt,
  index
) {
  try {
    if (
      !Array.isArray(images) ||
      images.length < 2
    ) {
      throw new Error(
        'خاص على الأقل جوج تصاور.'
      )
    }

    const finalPrompt =
      getMultiImagePrompt(
        images,
        prompt,
        index
      )

    const params = new URLSearchParams()

    params.set('prompt', finalPrompt)

    images.forEach((url, i) => {
      params.set(`image${i + 1}`, url)
    })

    const apiUrl =
      `https://omegatech-api.dixonomega.tech/api/ai/nanobana-pro-v3?${params.toString()}`

    console.log(
      `🍌 MULTI ${index + 1}`
    )

    const response =
      await getWithRetry(
        apiUrl,
        {
          timeout: 180000
        }
      )

    const data = response.data || {}

    const directImage =
      data.image ||
      data.image_url ||
      data.url

    if (directImage) {
      return directImage
    }

    if (data.task_id) {
      return await waitForResult(data.task_id)
    }

    return null

  } catch (error) {
    console.error(
      `❌ Multi ${index + 1}:`,
      error?.response?.data || error.message
    )

    return null
  }
}

// ============================================================
// MULTI -> ALWAYS TRY FOR 4
// ============================================================

async function generateMultiFour(images, prompt) {
  const results = []
  let attempt = 0

  while (
    results.length < MAX_RESULTS &&
    attempt < MAX_GENERATION_ATTEMPTS
  ) {
    const variationIndex =
      attempt % MAX_RESULTS

    attempt++

    const result =
      await generateMultiImage(
        images,
        prompt,
        variationIndex
      )

    if (
      result &&
      !results.includes(result)
    ) {
      results.push(result)

      console.log(
        `✅ MULTI ${results.length}/${MAX_RESULTS}`
      )

    } else {
      console.log(
        '⚠️ MULTI failed, retrying...'
      )
    }

    if (results.length < MAX_RESULTS) {
      await sleep(3500)
    }
  }

  return results
}

// ============================================================
// TEXT PROMPT
// ============================================================

function getTextPrompt(prompt, index) {
  const variations = [
    'Realistic professional photography.',
    'Cinematic realistic photography with a different camera angle.',
    'Natural professional photography with different lighting.',
    'Creative realistic composition with different framing.'
  ]

  return `
TEXT TO IMAGE TASK

USER REQUEST:
${prompt}

Create exactly what the user requested.

Do not change the main subject.
Do not add unrelated people.
Do not add unrelated objects.

${variations[index % 4]}

Create a unique variation.
`
}

// ============================================================
// TEXT IMAGE
// ============================================================

async function generateTextImage(
  prompt,
  index
) {
  try {
    const finalPrompt =
      getTextPrompt(prompt, index)

    const response =
      await getWithRetry(
        `https://omegatech-api.dixonomega.tech/api/ai/nano-banana-pro?prompt=${encodeURIComponent(finalPrompt)}`,
        {
          timeout: 180000
        }
      )

    const data = response.data || {}

    const directImage =
      data.image ||
      data.image_url ||
      data.url

    if (directImage) {
      return directImage
    }

    if (data.task_id) {
      return await waitForResult(data.task_id)
    }

    return null

  } catch (error) {
    console.error(
      `❌ Text ${index + 1}:`,
      error?.response?.data || error.message
    )

    return null
  }
}

// ============================================================
// TEXT -> ALWAYS TRY FOR 4
// ============================================================

async function generateTextFour(prompt) {
  const results = []
  let attempt = 0

  while (
    results.length < MAX_RESULTS &&
    attempt < MAX_GENERATION_ATTEMPTS
  ) {
    const variationIndex =
      attempt % MAX_RESULTS

    attempt++

    const result =
      await generateTextImage(
        prompt,
        variationIndex
      )

    if (
      result &&
      !results.includes(result)
    ) {
      results.push(result)

      console.log(
        `✅ TEXT ${results.length}/${MAX_RESULTS}`
      )

    } else {
      console.log(
        '⚠️ TEXT failed, retrying...'
      )
    }

    if (results.length < MAX_RESULTS) {
      await sleep(3000)
    }
  }

  return results
}

// ============================================================
// LOGO PROMPT
// ============================================================

function getLogoPrompt(prompt, index) {
  const styles = [
    'Create a premium modern logo. Clean vector-style design. Strong typography. Professional branding.',
    'Create a luxury elegant logo. Premium visual identity. Sophisticated composition.',
    'Create a bold street-style logo. Powerful typography. Modern graphic design. Strong visual impact.',
    'Create a futuristic logo. Technology-inspired design. Sharp typography. Unique visual identity.'
  ]

  return `
LOGO DESIGN TASK

USER REQUEST:
${prompt}

Create a PROFESSIONAL LOGO.

The result MUST look like a real brand logo.

Do NOT create a normal photo.
Do NOT create a realistic scene.
Do NOT add random people.

Focus on:
- logo design
- typography
- brand identity
- symbol
- clean composition

The requested logo name/text must be clearly readable.
Preserve the exact spelling.

${styles[index % 4]}

Each variation must be visually different.

Change:
- symbol
- typography
- composition
- visual style
- graphic concept

Create a polished professional logo.
`
}

// ============================================================
// LOGO WITH IMAGE PROMPT
// ============================================================

function getLogoImagePrompt(prompt, index) {
  const styles = [
    'modern premium logo style with clean typography',
    'luxury elegant logo style with sophisticated typography',
    'bold street branding style with powerful typography',
    'futuristic technology logo style with sharp typography'
  ]

  return `
PROFESSIONAL LOGO CREATION USING REFERENCE IMAGE

USER REQUEST:
${prompt}

The uploaded image is a REFERENCE.

Transform the important visual identity from the
reference into a professional logo.

Do NOT simply return the original image.
Do NOT make a normal photo.

Create an actual logo / brand identity.

The requested brand name must be clearly readable.
Keep text spelling exactly as requested.

STYLE:
${styles[index % 4]}

Use:
- clean composition
- professional typography
- strong symbol
- balanced spacing
- premium branding
- sharp details
- high contrast

Each variation must be different.

Change the:
- logo concept
- symbol
- typography
- composition
- visual style

Create a finished professional logo.
`
}

// ============================================================
// GENERATE LOGO
// ============================================================

async function generateLogoImage(
  prompt,
  index,
  imageUrl = null
) {
  try {
    const finalPrompt =
      imageUrl
        ? getLogoImagePrompt(prompt, index)
        : getLogoPrompt(prompt, index)

    let apiUrl

    if (imageUrl) {
      apiUrl =
        `https://omegatech-api.dixonomega.tech/api/ai/nano-banana2?prompt=${encodeURIComponent(finalPrompt)}&image=${encodeURIComponent(imageUrl)}`
    } else {
      apiUrl =
        `https://omegatech-api.dixonomega.tech/api/ai/nano-banana-pro?prompt=${encodeURIComponent(finalPrompt)}`
    }

    console.log(
      `🎨 LOGO ${index + 1}`
    )

    const response =
      await getWithRetry(
        apiUrl,
        {
          timeout: 180000
        }
      )

    const data = response.data || {}

    const directImage =
      data.image ||
      data.image_url ||
      data.url

    if (directImage) {
      return directImage
    }

    if (data.task_id) {
      return await waitForResult(data.task_id)
    }

    return null

  } catch (error) {
    console.error(
      `❌ Logo ${index + 1}:`,
      error?.response?.data || error.message
    )

    return null
  }
}

// ============================================================
// LOGO -> ALWAYS TRY FOR 4
// ============================================================

async function generateLogoFour(
  prompt,
  imageUrl = null
) {
  const results = []
  let attempt = 0

  while (
    results.length < MAX_RESULTS &&
    attempt < MAX_GENERATION_ATTEMPTS
  ) {
    const variationIndex =
      attempt % MAX_RESULTS

    attempt++

    const result =
      await generateLogoImage(
        prompt,
        variationIndex,
        imageUrl
      )

    if (
      result &&
      !results.includes(result)
    ) {
      results.push(result)

      console.log(
        `✅ LOGO ${results.length}/${MAX_RESULTS}`
      )

    } else {
      console.log(
        '⚠️ LOGO failed, retrying...'
      )
    }

    if (results.length < MAX_RESULTS) {
      await sleep(3000)
    }
  }

  return results
}

// ============================================================
// SEND RESULTS
// ============================================================

async function sendResults(
  conn,
  m,
  results,
  prompt,
  type = 'nano'
) {
  if (!results?.length) {
    return false
  }

  for (
    let i = 0;
    i < results.length;
    i++
  ) {
    const isLast =
      i === results.length - 1

    try {
      if (!isLast) {
        await conn.sendMessage(
          m.chat,
          {
            image: {
              url: results[i]
            }
          },
          {
            quoted: m
          }
        )

      } else {
        const title =
          type === 'logo'
            ? '🎨 LOGO'
            : '🍌 NANO BANANA AI'

        const caption =
`╭━━━〔 ${title} 〕━━━╮
┃
┃ 🤖 *${BOT_NAME}*
┃
┃ 🖼️ *النتيجة ${i + 1}/${MAX_RESULTS}*
┃
┃ 📝 *الوصف:*
┃ ${prompt}
┃
┃ 💡 اختار التصميم اللي عجبك.
┃
┃ 👨‍💻 ${DEV_NUMBER}
┃
╰━━━━━━━━━━━━━━━━━━╯`

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
      }

      console.log(
        `✅ Sent ${i + 1}/${results.length}`
      )

    } catch (error) {
      console.error(
        `❌ Send ${i + 1}:`,
        error.message
      )
    }

    await sleep(1000)
  }

  return true
}

// ============================================================
// LOGO GUIDE
// ============================================================

async function showLogoGuide(
  m,
  conn,
  usedPrefix
) {
  return conn.reply(
    m.chat,

`╭━━━〔 🎨 ${BOT_NAME} 〕━━━╮
┃
┃ ✨ *LOGO AI*
┃
┃ صايب Logo احترافي بالذكاء الاصطناعي.
┃
╰━━━━━━━━━━━━━━━━━━╯

📌 مثال:

${usedPrefix}لوكو DAMAR-MD

➡️ كيحاول يجيب 4 تصاميم مختلفة.

━━━━━━━━━━━━━━━━━━

📌 مع صورة:

صيفط صورة ومن بعد:

${usedPrefix}لوكو دير منها Logo احترافي باسم DAMAR

👨‍💻 ${DEV_NUMBER}`,
    m
  )
}

// ============================================================
// NANO GUIDE
// ============================================================

async function showGuide(
  m,
  conn,
  usedPrefix
) {
  return conn.reply(
    m.chat,

`╭━━━〔 🍌 ${BOT_NAME} 〕━━━╮
┃
┃ 🤖 NANO BANANA AI
┃ 🎨 تعديل الصور
┃ 🖼️ دمج الصور
┃ 🔥 حتى 4 صور
┃
╰━━━━━━━━━━━━━━━━━━╯

📌 صورة وحدة:

${usedPrefix}نانو دير هاد الفتاة فطبيعة

➡️ كيحاول يجيب 4 نتائج.

━━━━━━━━━━━━━━━━━━

📌 جوج حتى 4 صور:

صيفط التصاور ومن بعد:

${usedPrefix}نانو دير هاد الأشخاص مع بعض

━━━━━━━━━━━━━━━━━━

📌 بلا صورة:

${usedPrefix}نانو صمم ليا سيارة رياضية فمدينة عصرية

➡️ كيحاول يجيب 4 نتائج.

━━━━━━━━━━━━━━━━━━

📌 LOGO:

${usedPrefix}لوكو DAMAR-MD

➡️ كيحاول يجيب 4 Logos.

👨‍💻 ${DEV_NUMBER}
🤖 ${BOT_NAME}`,
    m
  )
}

// ============================================================
// MAIN HANDLER
// ============================================================

const handler = async (
  m,
  {
    conn,
    text,
    usedPrefix,
    command
  }
) => {

  const cmd =
    String(command || '')
      .trim()
      .toLowerCase()

  const isLogo =
    cmd === 'logo' ||
    cmd === 'لوكو'

  const isNano =
    cmd === 'nano' ||
    cmd === 'نانو'

  if (!isLogo && !isNano) {
    return
  }

  text =
    text ||
    m?.msg?.caption ||
    m?.quoted?.text ||
    m?.quoted?.caption ||
    ''

  text = String(text).trim()

  // ==========================================================
  // LOGO
  // ==========================================================

  if (isLogo) {
    const logoImage =
      await getImageFromMessage(m)

    if (!text) {
      return showLogoGuide(
        m,
        conn,
        usedPrefix
      )
    }

    await m.react('⏳')

    try {
      const results =
        await generateLogoFour(
          text,
          logoImage
        )

      if (!results.length) {
        throw new Error(
          'السيرفر ما رجع حتى Logo.'
        )
      }

      await sendResults(
        conn,
        m,
        results,
        text,
        'logo'
      )

      await m.react('✅')

      return

    } catch (error) {
      await m.react('❌')

      return conn.reply(
        m.chat,

`❌ ${BOT_NAME}

ما قدرناش نصايبو Logo.

📌 السبب:
${error.message || 'خطأ غير معروف'}

🔄 جرب من جديد.`,
        m
      )
    }
  }

  // ==========================================================
  // NANO SESSION
  // ==========================================================

  const userId = m.sender

  if (!bananaSessions[userId]) {
    bananaSessions[userId] = {
      images: [],
      createdAt: Date.now()
    }
  }

  if (
    Date.now() -
    bananaSessions[userId].createdAt >
    SESSION_TIME
  ) {
    bananaSessions[userId] = {
      images: [],
      createdAt: Date.now()
    }
  }

  const currentSession =
    bananaSessions[userId]

  currentSession.createdAt =
    Date.now()

  // ==========================================================
  // GET IMAGE
  // ==========================================================

  const imageUrl =
    await getImageFromMessage(m)

  if (imageUrl) {
    if (
      currentSession.images.length >=
      MAX_IMAGES
    ) {
      return conn.reply(
        m.chat,

`❌ ${BOT_NAME}

وصلتي للحد الأقصى:
🖼️ ${MAX_IMAGES}/4

دابا كتب الوصف باش نبدا.`,
        m
      )
    }

    currentSession.images.push(imageUrl)

    const count =
      currentSession.images.length

    await m.react('📥')

    // IMAGE + TEXT
    if (text) {
      await m.react('⏳')

      try {
        let results = []

        if (count === 1) {
          results =
            await editSingleFour(
              imageUrl,
              text
            )
        } else {
          results =
            await generateMultiFour(
              currentSession.images,
              text
            )
        }

        if (!results.length) {
          throw new Error(
            'السيرفر ما رجع حتى نتيجة.'
          )
        }

        await sendResults(
          conn,
          m,
          results,
          text
        )

        await m.react('✅')

        delete bananaSessions[userId]

        return

      } catch (error) {
        await m.react('❌')

        return conn.reply(
          m.chat,

`❌ ${BOT_NAME}

ما قدرناش نكملو العملية.

📌 السبب:
${error.message || 'خطأ غير معروف'}

🔄 جرب من جديد.`,
          m
        )
      }
    }

    // IMAGE WITHOUT TEXT
    return conn.reply(
      m.chat,

`╭━━━〔 🍌 ${BOT_NAME} 〕━━━╮
┃
┃ ✅ *الصورة تزادت*
┃ 🖼️ *${count}/4*
┃
┃ صيفط صورة أخرى
┃ أو كتب الوصف دابا.
┃
┃ مثال:
┃ *${usedPrefix}نانو دير هاد الأشخاص مع بعض*
┃
╰━━━━━━━━━━━━━━━━━━╯`,
      m
    )
  }

  // ==========================================================
  // NO IMAGE + NO TEXT
  // ==========================================================

  if (!text) {
    return showGuide(
      m,
      conn,
      usedPrefix
    )
  }

  // ==========================================================
  // SESSION HAS IMAGES
  // ==========================================================

  if (
    currentSession.images.length > 0
  ) {
    await m.react('⏳')

    try {
      let results = []

      if (
        currentSession.images.length === 1
      ) {
        results =
          await editSingleFour(
            currentSession.images[0],
            text
          )
      } else {
        results =
          await generateMultiFour(
            currentSession.images,
            text
          )
      }

      if (!results.length) {
        throw new Error(
          'السيرفر ما رجع حتى صورة.'
        )
      }

      await sendResults(
        conn,
        m,
        results,
        text
      )

      await m.react('✅')

      delete bananaSessions[userId]

      return

    } catch (error) {
      await m.react('❌')

      return conn.reply(
        m.chat,

`❌ ${BOT_NAME}

ما قدرناش نكملو العملية.

📌 السبب:
${error.message || 'خطأ غير معروف'}

🔄 جرب من جديد.`,
        m
      )
    }
  }

  // ==========================================================
  // TEXT ONLY
  // ==========================================================

  await m.react('⏳')

  try {
    const results =
      await generateTextFour(text)

    if (!results.length) {
      throw new Error(
        'السيرفر ما رجع حتى صورة.'
      )
    }

    await sendResults(
      conn,
      m,
      results,
      text
    )

    await m.react('✅')

  } catch (error) {
    await m.react('❌')

    return conn.reply(
      m.chat,

`❌ ${BOT_NAME}

ما قدرناش نولد الصور.

📌 السبب:
${error.message || 'خطأ غير معروف'}

🔄 جرب من جديد.`,
      m
    )
  }
}

// ============================================================
// PLUGIN SETTINGS
// ============================================================

handler.help = [
  'nano',
  'نانو',
  'logo',
  'لوكو'
]

handler.command = [
  'nano',
  'نانو',
  'logo',
  'لوكو'
]

handler.tags = [
  'editor'
]

handler.limit = false

export default handler