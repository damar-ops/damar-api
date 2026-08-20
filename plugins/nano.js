/**
 * 🍌 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃 | NANO BANANA AI V9
 *
 * Developer: +212 633-226499
 *
 * الأوامر:
 *
 * .Nano
 * .nano
 * .نانو
 *
 * .Logo
 * .logo
 * .لوكو
 *
 * ============================================================
 * NANO:
 * ============================================================
 * ✅ صورة واحدة + وصف = 4 نتائج
 * ✅ من 2 حتى 4 صور + وصف = دمج الأشخاص
 * ✅ الحفاظ على الأشخاص من الصور المرجعية
 * ✅ إرسال الصور واحدة واحدة
 *
 * ============================================================
 * LOGO:
 * ============================================================
 * ✅ .logo DAMAR-MD
 * ✅ .لوكو تصميم لوجو احترافي
 * ✅ بدون صورة = 4 Logos مختلفة
 * ✅ مع صورة = استعمال الصورة كمرجع
 * ✅ كل Logo مختلف عن الآخر
 * ✅ آخر صورة فيها Caption
 *
 * ============================================================
 * RETRY:
 * ============================================================
 * ✅ 502
 * ✅ 503
 * ✅ 504
 * ✅ Timeout
 *
 * ============================================================
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

      return await axios.get(
        url,
        options
      )

    } catch (error) {

      lastError = error

      const status =
        error?.response?.status

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
        filename:
          `damar-${Date.now()}.jpg`,
        contentType:
          mimetype || 'image/jpeg'
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

          timeout:
            90000,

          maxBodyLength:
            Infinity,

          maxContentLength:
            Infinity
        }
      )

    const imageUrl =
      response.data?.cdnUrl ||
      response.data?.directUrl ||
      response.data?.url ||
      null

    if (!imageUrl) {

      console.log(
        '❌ Upload: no image URL'
      )

      return null
    }

    console.log(
      '✅ Image uploaded:',
      imageUrl
    )

    return imageUrl

  } catch (error) {

    console.error(
      '❌ Upload Error:',
      error?.response?.data ||
      error.message
    )

    return null
  }
}

// ============================================================
// GET IMAGE
// ============================================================

async function getImageFromMessage(m) {

  try {

    const image =
      await uploadMedia(m)

    if (image) {
      return image
    }

    if (m?.quoted) {

      const quotedImage =
        await uploadMedia(
          m.quoted
        )

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

    await sleep(
      POLL_DELAY
    )

    try {

      const response =
        await getWithRetry(
          `https://omegatech-api.dixonomega.tech/api/ai/nano-banana2-result?task_id=${encodeURIComponent(taskId)}`,
          {
            timeout:
              30000
          }
        )

      const data =
        response.data || {}

      if (
        data.status === 'completed'
      ) {

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

        console.log(
          '❌ Task failed:',
          data
        )

        return null
      }

      console.log(
        `🍌 Waiting ${attempt}/${MAX_POLLS}`
      )

    } catch (error) {

      const status =
        error?.response?.status

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
// NANO SINGLE IMAGE PROMPT
// ============================================================

function getSingleImagePrompt(
  userPrompt,
  index
) {

  const variations = [

    `
Use realistic professional photography.
Keep the original person exactly recognizable.
Apply only the requested modification.
`,

    `
Use the exact uploaded image as the primary reference.
Keep the same person's identity and face.
Use a slightly different camera angle.
`,

    `
Preserve the same person, face, body and important details.
Apply only the requested modification.
Use different realistic lighting.
`,

    `
Use the same original person and identity.
Do not replace the person.
Create another realistic variation.
`

  ]

  return `
IMAGE EDITING TASK

USER REQUEST:
${userPrompt}

The uploaded image is the ORIGINAL SOURCE.

This is NOT a new person generation task.

STRICT RULES:

Keep the exact same person.

Keep:

- face
- facial structure
- eyes
- nose
- mouth
- hairstyle
- skin appearance
- body appearance
- recognizable features
- important clothing details

DO NOT create a different person.

DO NOT replace the face.

DO NOT invent a new identity.

DO NOT change the person's identity.

Only perform the modification requested by the user.

If the user requests a new background,
change only the background while preserving the person.

If the user requests a new environment,
place the SAME person in that environment.

${variations[index]}

Result ${index + 1} of 4.
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
      getSingleImagePrompt(
        prompt,
        index
      )

    console.log(
      `🎨 Single Edit ${index + 1}/4`
    )

    const response =
      await getWithRetry(
        `https://omegatech-api.dixonomega.tech/api/ai/nano-banana2?prompt=${encodeURIComponent(finalPrompt)}&image=${encodeURIComponent(imageUrl)}`,
        {
          timeout:
            180000
        }
      )

    const data =
      response.data || {}

    const directImage =
      data.image ||
      data.image_url ||
      data.url

    if (directImage) {
      return directImage
    }

    if (
      data.task_id
    ) {

      return await waitForResult(
        data.task_id
      )
    }

    return null

  } catch (error) {

    console.error(
      `❌ Single Edit ${index + 1}:`,
      error?.response?.data ||
      error.message
    )

    return null
  }
}

// ============================================================
// SINGLE -> 4
// ============================================================

async function editSingleFour(
  imageUrl,
  prompt
) {

  const results = []

  for (
    let i = 0;
    i < MAX_RESULTS;
    i++
  ) {

    const result =
      await editSingleImage(
        imageUrl,
        prompt,
        i
      )

    if (result) {
      results.push(result)
    }

    if (
      i < MAX_RESULTS - 1
    ) {

      await sleep(
        2500
      )
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

  const count =
    images.length

  return `
MULTI-IMAGE COMPOSITION TASK

USER REQUEST:
${userPrompt}

REFERENCE IMAGES:
${count}

IMPORTANT:

THIS IS AN IMAGE EDITING AND COMPOSITION TASK.

THE UPLOADED IMAGES ARE THE PRIMARY REFERENCES.

You MUST use the actual people shown in the uploaded images.

DO NOT invent new people.

DO NOT replace people.

DO NOT generate random people.

DO NOT use generic people.

DO NOT use stock people.

DO NOT replace faces.

DO NOT change identities.

Every person visible in the uploaded references
must remain the SAME person.

==================================================
REFERENCE MAPPING
==================================================

IMAGE 1:
Use the actual person or people from reference image 1.

IMAGE 2:
Use the actual person or people from reference image 2.

IMAGE 3:
Use the actual person or people from reference image 3.

IMAGE 4:
Use the actual person or people from reference image 4.

Only ${count} reference images were supplied.

==================================================
WHEN USER SAYS:
"دير هاد الأشخاص مع بعض"

Put the SAME people from ALL reference images
together in ONE scene.

==================================================
FACE PRESERVATION
==================================================

Preserve each person's:

- face
- facial structure
- eyes
- nose
- mouth
- hairstyle
- skin appearance
- age appearance
- body appearance
- recognizable characteristics

The faces are MORE IMPORTANT than the background.

==================================================
NO EXTRA PEOPLE
==================================================

Do not add people.

Do not duplicate people.

Do not create background people.

Do not create random people.

Only use the people requested by the user.

==================================================
COMPOSITION
==================================================

Put the reference people together naturally.

They can:

- stand together
- sit together
- walk together
- talk together
- pose together

depending on the user's request.

Do not merge their faces.

==================================================
BACKGROUND
==================================================

Create the background requested by the user.

The people must remain the SAME.

==================================================
REALISM
==================================================

Photorealistic.

Natural skin.

Natural proportions.

Realistic shadows.

Realistic lighting.

Realistic interaction.

==================================================
FINAL CHECK
==================================================

1. Person from image 1 must be present.
2. Person from image 2 must be present.
3. Person from image 3 must be present if supplied.
4. Person from image 4 must be present if supplied.
5. Their identities must remain recognizable.
6. No random people.
7. No extra people.
8. Follow the user's requested scene.

This is variation ${index + 1} of 4.

Generate the final image.
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

    const params =
      new URLSearchParams()

    params.set(
      'prompt',
      finalPrompt
    )

    images.forEach(
      (url, i) => {

        params.set(
          `image${i + 1}`,
          url
        )
      }
    )

    const apiUrl =
      `https://omegatech-api.dixonomega.tech/api/ai/nanobana-pro-v3?${params.toString()}`

    console.log(
      `🍌 MULTI ${index + 1}/4`
    )

    const response =
      await getWithRetry(
        apiUrl,
        {
          timeout:
            180000
        }
      )

    const data =
      response.data || {}

    const directImage =
      data.image ||
      data.image_url ||
      data.url

    if (directImage) {
      return directImage
    }

    if (
      data.task_id
    ) {

      return await waitForResult(
        data.task_id
      )
    }

    return null

  } catch (error) {

    console.error(
      `❌ Multi ${index + 1}:`,
      error?.response?.data ||
      error.message
    )

    return null
  }
}

// ============================================================
// MULTI -> 4
// ============================================================

async function generateMultiFour(
  images,
  prompt
) {

  const results = []

  for (
    let i = 0;
    i < MAX_RESULTS;
    i++
  ) {

    const result =
      await generateMultiImage(
        images,
        prompt,
        i
      )

    if (result) {
      results.push(result)
    }

    if (
      i < MAX_RESULTS - 1
    ) {

      await sleep(
        3000
      )
    }
  }

  return results
}

// ============================================================
// TEXT TO IMAGE PROMPT
// ============================================================

function getTextPrompt(
  prompt,
  index
) {

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

${variations[index]}

This is variation ${index + 1} of 4.
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
      getTextPrompt(
        prompt,
        index
      )

    const response =
      await getWithRetry(
        `https://omegatech-api.dixonomega.tech/api/ai/nano-banana-pro?prompt=${encodeURIComponent(finalPrompt)}`,
        {
          timeout:
            180000
        }
      )

    const data =
      response.data || {}

    const directImage =
      data.image ||
      data.image_url ||
      data.url

    if (directImage) {
      return directImage
    }

    if (
      data.task_id
    ) {

      return await waitForResult(
        data.task_id
      )
    }

    return null

  } catch (error) {

    console.error(
      `❌ Text ${index + 1}:`,
      error?.response?.data ||
      error.message
    )

    return null
  }
}

// ============================================================
// TEXT -> 4
// ============================================================

async function generateTextFour(
  prompt
) {

  const results = []

  for (
    let i = 0;
    i < MAX_RESULTS;
    i++
  ) {

    const result =
      await generateTextImage(
        prompt,
        i
      )

    if (result) {
      results.push(result)
    }

    if (
      i < MAX_RESULTS - 1
    ) {

      await sleep(
        2500
      )
    }
  }

  return results
}

// ============================================================
// LOGO PROMPT
// ============================================================

function getLogoPrompt(
  prompt,
  index
) {

  const styles = [

    `
Create a premium modern logo.
Clean vector-style design.
Strong typography.
Professional branding.
Minimal but powerful.
`,

    `
Create a luxury logo.
Elegant typography.
Premium visual identity.
Sophisticated composition.
High-end brand feeling.
`,

    `
Create a bold street-style logo.
Powerful typography.
Modern graphic design.
Strong visual impact.
Youthful and energetic.
`,

    `
Create a futuristic logo.
Modern technology-inspired design.
Sharp typography.
Clean professional composition.
Unique visual identity.
`

  ]

  return `
LOGO DESIGN TASK

USER REQUEST:
${prompt}

Create a PROFESSIONAL LOGO based on the user's request.

IMPORTANT:

The result MUST look like a real professional brand logo.

Do NOT create a normal photo.

Do NOT create a realistic scene.

Do NOT add random people.

Do NOT add random objects.

Focus on:

- logo design
- typography
- brand identity
- symbol
- clean composition
- professional presentation

The logo name/text requested by the user
must be clearly readable.

If the user gives a brand name,
preserve the exact spelling.

If the user requests Arabic text,
keep the Arabic text readable and correctly arranged.

If the user requests English text,
keep the English spelling exactly.

Prefer:

- clean background
- strong contrast
- centered logo
- professional typography
- balanced spacing
- sharp details
- premium branding

${styles[index]}

Create variation ${index + 1} of 4.

Each variation must be visually different.

Do not simply recolor the same logo.

Change the:

- symbol
- typography
- composition
- visual style
- graphic concept

while keeping the requested brand/name.

FINAL RESULT:
A polished professional logo design suitable
for social media, WhatsApp, YouTube, business branding
and profile pictures.
`
}

// ============================================================
// LOGO WITH IMAGE
// ============================================================

function getLogoImagePrompt(
  prompt,
  index
) {

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

Use the important visual identity from the uploaded image.

Transform the reference into a professional logo.

IMPORTANT:

Do NOT simply return the original image.

Do NOT make a normal photo.

Create an actual logo / brand identity.

Preserve important recognizable elements
from the reference when useful.

If there is a person in the reference,
you may use their recognizable silhouette,
face concept or visual characteristics
as part of the logo design,
but transform it into a professional logo style.

If there is an object,
use it as inspiration for the logo symbol.

The requested brand name must be clearly readable.

Keep text spelling EXACTLY as requested.

STYLE:

${styles[index]}

Use:

- clean composition
- professional typography
- strong symbol
- balanced spacing
- premium branding
- sharp details
- high contrast
- social media friendly design

Each variation must be different.

Do not merely change colors.

Change the logo concept,
symbol,
typography,
and composition.

Create variation ${index + 1} of 4.

FINAL RESULT:
A professional finished logo.
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
        ? getLogoImagePrompt(
            prompt,
            index
          )
        : getLogoPrompt(
            prompt,
            index
          )

    let apiUrl = ''

    // ========================================================
    // LOGO WITH REFERENCE IMAGE
    // ========================================================

    if (imageUrl) {

      apiUrl =
        `https://omegatech-api.dixonomega.tech/api/ai/nano-banana2?prompt=${encodeURIComponent(finalPrompt)}&image=${encodeURIComponent(imageUrl)}`

    }

    // ========================================================
    // LOGO TEXT ONLY
    // ========================================================

    else {

      apiUrl =
        `https://omegatech-api.dixonomega.tech/api/ai/nano-banana-pro?prompt=${encodeURIComponent(finalPrompt)}`
    }

    console.log(
      `🎨 LOGO ${index + 1}/4`
    )

    const response =
      await getWithRetry(
        apiUrl,
        {
          timeout:
            180000
        }
      )

    const data =
      response.data || {}

    const directImage =
      data.image ||
      data.image_url ||
      data.url

    if (directImage) {
      return directImage
    }

    if (
      data.task_id
    ) {

      return await waitForResult(
        data.task_id
      )
    }

    console.log(
      '❌ Logo API response:',
      data
    )

    return null

  } catch (error) {

    console.error(
      `❌ Logo ${index + 1}:`,
      error?.response?.data ||
      error.message
    )

    throw error
  }
}

// ============================================================
// LOGO -> 4
// ============================================================

async function generateLogoFour(
  prompt,
  imageUrl = null
) {

  const results = []

  for (
    let i = 0;
    i < MAX_RESULTS;
    i++
  ) {

    try {

      const result =
        await generateLogoImage(
          prompt,
          i,
          imageUrl
        )

      if (result) {
        results.push(result)
      }

    } catch (error) {

      console.error(
        `Logo ${i + 1} failed`
      )
    }

    if (
      i < MAX_RESULTS - 1
    ) {

      await sleep(
        2500
      )
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

  if (
    !results ||
    !results.length
  ) {

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
┃ ✅ *النتيجة ${i + 1}/${results.length}*
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

📌 مثال 1:

${usedPrefix}لوكو DAMAR-MD

➡️ 4 تصاميم Logo مختلفة.

━━━━━━━━━━━━━━━━━━

📌 مثال 2:

${usedPrefix}لوكو Logo ديال DJ DAMAR

➡️ 4 أفكار مختلفة.

━━━━━━━━━━━━━━━━━━

📌 مثال 3:

${usedPrefix}لوكو Logo فاخر باسم SENYOURA

➡️ تصميم Luxury احترافي.

━━━━━━━━━━━━━━━━━━

📌 مع صورة:

صيفط صورة

ومن بعد:

${usedPrefix}لوكو دير منها Logo احترافي باسم DAMAR

➡️ غادي يستعمل الصورة كمرجع.

━━━━━━━━━━━━━━━━━━

🎨 كل نتيجة مختلفة:

1️⃣ Modern
2️⃣ Luxury
3️⃣ Street
4️⃣ Futuristic

👨‍💻 ${DEV_NUMBER}

╰━━━━━━━━━━━━━━━━━━╯`,
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
┃
┃ 🎨 تعديل الصور
┃ 🖼️ دمج الصور
┃ 🔥 حتى 4 صور
┃
╰━━━━━━━━━━━━━━━━━━╯

📌 صورة وحدة:

${usedPrefix}نانو دير هاد الفتاة فطبيعة

➡️ 4 نتائج مختلفة.

━━━━━━━━━━━━━━━━━━

📌 جوج صور:

صيفط الصورة الأولى
ثم الصورة الثانية

ومن بعد:

${usedPrefix}نانو دير هاد الأشخاص مع بعض

➡️ كيستعمل الصورتين بجوج.

━━━━━━━━━━━━━━━━━━

📌 حتى 4 صور:

صيفط حتى 4 تصاور.

ومن بعد:

${usedPrefix}نانو جمع هاد الأشخاص كاملين فصورة وحدة

━━━━━━━━━━━━━━━━━━

📌 بلا صورة:

${usedPrefix}نانو صمم ليا سيارة رياضية فمدينة عصرية

➡️ غادي يعطيك 4 نتائج.

━━━━━━━━━━━━━━━━━━

📌 LOGO:

${usedPrefix}لوكو DAMAR-MD

➡️ 4 Logos مختلفين.

👨‍💻 ${DEV_NUMBER}
🤖 ${BOT_NAME}

╰━━━━━━━━━━━━━━━━━━╯`,
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

  // ==========================================================
  // NORMALIZE
  // ==========================================================

  const cmd =
    String(command || '')
      .trim()
      .toLowerCase()

  // ==========================================================
  // LOGO COMMANDS
  // ==========================================================

  const isLogo =
    cmd === 'logo' ||
    cmd === 'لوكو'

  // ==========================================================
  // NANO COMMANDS
  // ==========================================================

  const isNano =
    cmd === 'nano' ||
    cmd === 'نانو'

  if (
    !isLogo &&
    !isNano
  ) {

    return
  }

  // ==========================================================
  // GET TEXT
  // ==========================================================

  text =
    text ||
    m?.msg?.caption ||
    m?.quoted?.text ||
    m?.quoted?.caption ||
    ''

  text =
    String(text).trim()

  // ==========================================================
  // LOGO
  // ==========================================================

  if (isLogo) {

    // ========================================================
    // IMAGE
    // ========================================================

    const logoImage =
      await getImageFromMessage(m)

    // ========================================================
    // NO TEXT
    // ========================================================

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

      if (
        !results.length
      ) {

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

      console.error(
        '❌ Logo Error:',
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
          'سيرفر الصور مشغول حالياً، حاول من جديد.'
      }

      if (
        status === 502
      ) {

        reason =
          'السيرفر ما جاوبش مزيان، عاود جرب من بعد.'
      }

      if (
        status === 504
      ) {

        reason =
          'السيرفر طول فالرد، عاود جرب من بعد.'
      }

      return conn.reply(
        m.chat,

`❌ ${BOT_NAME}

ما قدرناش نصايبو Logo.

📌 السبب:
${reason}

🔄 جرب من جديد.`,
        m
      )
    }
  }

  // ==========================================================
  // NANO SESSION
  // ==========================================================

  const userId =
    m.sender

  if (
    !bananaSessions[userId]
  ) {

    bananaSessions[userId] = {
      images: [],
      createdAt: Date.now()
    }
  }

  // ==========================================================
  // SESSION EXPIRATION
  // ==========================================================

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

  // ==========================================================
  // IMAGE FOUND
  // ==========================================================

  if (imageUrl) {

    if (
      currentSession.images.length >=
      MAX_IMAGES
    ) {

      return conn.reply(
        m.chat,

`❌ ${BOT_NAME}

وصلتي للحد الأقصى.

🖼️ ${MAX_IMAGES}/4

دابا كتب الوصف باش نبدا.`,
        m
      )
    }

    currentSession.images.push(
      imageUrl
    )

    const count =
      currentSession.images.length

    await m.react('📥')

    // ========================================================
    // IMAGE + TEXT
    // ========================================================

    if (text) {

      await m.react('⏳')

      try {

        let results = []

        if (
          count === 1
        ) {

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

        if (
          !results.length
        ) {

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

        console.error(
          'Nano Image+Text:',
          error
        )

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

    // ========================================================
    // IMAGE WITHOUT TEXT
    // ========================================================

    return conn.reply(
      m.chat,

`╭━━━〔 🍌 ${BOT_NAME} 〕━━━╮
┃
┃ ✅ *الصورة تزادت*
┃
┃ 🖼️ *${count}/4*
┃
┃ صيفط صورة أخرى
┃
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

      if (
        !results.length
      ) {

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

      console.error(
        'Nano Session Error:',
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
          'سيرفر الصور مشغول حالياً، حاول من جديد.'
      }

      if (
        status === 502
      ) {

        reason =
          'السيرفر ما جاوبش مزيان، عاود جرب من بعد.'
      }

      if (
        status === 504
      ) {

        reason =
          'السيرفر طول فالرد، عاود جرب من بعد.'
      }

      return conn.reply(
        m.chat,

`❌ ${BOT_NAME}

ما قدرناش نكملو العملية.

📌 السبب:
${reason}

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
      await generateTextFour(
        text
      )

    if (
      !results.length
    ) {

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

    console.error(
      'Nano Text Error:',
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
        'سيرفر الصور مشغول حالياً، حاول من جديد.'
    }

    if (
      status === 502
    ) {

      reason =
        'السيرفر ما جاوبش مزيان، عاود جرب من بعد.'
    }

    if (
      status === 504
    ) {

      reason =
        'السيرفر طول فالرد، عاود جرب من بعد.'
    }

    return conn.reply(
      m.chat,

`❌ ${BOT_NAME}

ما قدرناش نولد الصور.

📌 السبب:
${reason}

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