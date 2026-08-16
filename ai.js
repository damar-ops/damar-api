import axios from 'axios'
import fs from 'fs'
import path from 'path'
import os from 'os'

const BASE_URL =
  'https://prithivmlmods-qwen-image-edit-2509-loras-fast.hf.space/gradio_api'

const API_NAME = 'edit_image'

const WORKER_URL =
  process.env.QWEN_WORKER_URL ||
  'http://workers.proxy-1.ryuu-dev.my.id'

// =====================================================
// 🤖 𝐃𝐀𝐌𝐀𝐑-𝐌𝐃
// =====================================================

const BOT_NAME = '𝐃𝐀𝐌𝐀𝐑-𝐌𝐃'
const DEV_NUMBER = '+212 633-226499'

// =====================================================
// 🔑 HUGGING FACE TOKEN
// =====================================================

const hfToken =
  process.env.HF_TOKEN ||
  global.hfkey ||
  global.hftoken ||
  ''

// =====================================================
// ❌ ERROR
// =====================================================

function errorMessage(err) {

  const data = err?.response?.data

  if (
    typeof data === 'string' &&
    data
  ) {
    return data.slice(0, 500)
  }

  return (
    data?.message ||
    data?.error ||
    err?.message ||
    'Unknown error'
  )
}

// =====================================================
// 🖼️ QWEN IMAGE EDIT
// =====================================================

class QwenImageEdit {

  constructor(useToken = true) {

    this.useToken = useToken

    this.axios = axios.create({

      timeout: 180000,

      headers: {

        'Content-Type':
          'application/json',

        'Origin':
          'https://prithivmlmods-qwen-image-edit-2509-loras-fast.hf.space',

        'Referer':
          'https://prithivmlmods-qwen-image-edit-2509-loras-fast.hf.space/',

        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/137.0.0.0 Safari/537.36'
      }
    })
  }

  // ===================================================
  // 🌐 WORKER REQUEST
  // ===================================================

  async workerRequest(
    method,
    target,
    data = null,
    extra = {}
  ) {

    const headers = {}

    if (
      this.useToken &&
      hfToken
    ) {

      headers.Authorization =
        `Bearer ${hfToken}`
    }

    return await this.axios({

      method,

      url: WORKER_URL,

      params: {
        url: target
      },

      data,

      headers,

      ...extra
    })
  }

  // ===================================================
  // 🖼️ IMAGE TO BASE64
  // ===================================================

  async imageToBase64(
    input
  ) {

    if (
      /^https?:\/\//i.test(input)
    ) {

      const res =
        await this.workerRequest(
          'GET',
          input,
          null,
          {
            responseType:
              'arraybuffer',

            timeout:
              60000
          }
        )

      return (
        'data:image/jpeg;base64,' +
        Buffer
          .from(res.data)
          .toString('base64')
      )
    }

    const buffer =
      fs.readFileSync(input)

    return (
      'data:image/jpeg;base64,' +
      buffer.toString('base64')
    )
  }

  // ===================================================
  // 📡 SSE
  // ===================================================

  parseSse(text) {

    let output = null

    for (
      const line of text.split('\n')
    ) {

      const trimmed =
        line.trim()

      if (
        !trimmed.startsWith('data:')
      ) {
        continue
      }

      const raw =
        trimmed
          .slice(5)
          .trim()

      if (
        !raw ||
        raw === '[DONE]'
      ) {
        continue
      }

      let evt

      try {

        evt =
          JSON.parse(raw)

      } catch {

        continue
      }

      if (!evt) {
        continue
      }

      // النتيجة النهائية
      if (
        Array.isArray(evt)
      ) {

        output = evt

        break
      }

      // Gradio
      if (
        evt.msg ===
        'process_completed'
      ) {

        output =
          evt.output?.data ||
          null

        break
      }

      // خطأ
      if (
        evt.msg === 'error' ||
        evt.error
      ) {

        throw new Error(
          evt.error ||
          evt.msg ||
          'Server error'
        )
      }
    }

    return output
  }

  // ===================================================
  // 🖼️ EXTRACT IMAGE
  // ===================================================

  extractImage(
    output
  ) {

    if (
      !Array.isArray(output) ||
      output.length === 0
    ) {

      throw new Error(
        'السيرفر ما رجعش صورة.'
      )
    }

    const first =
      output[0]

    if (
      first &&
      typeof first === 'object' &&
      first.image
    ) {

      return first.image
    }

    if (
      first &&
      typeof first === 'object' &&
      first.url
    ) {

      return first.url
    }

    if (
      typeof first === 'string'
    ) {

      return first
    }

    throw new Error(
      'ماقدرتش نلقى الصورة فالنتيجة.'
    )
  }

  // ===================================================
  // 🎨 EDIT IMAGE
  // ===================================================

  async editImage({
    imageSource,
    prompt,
    lora
  }) {

    const imageBase64 =
      await this.imageToBase64(
        imageSource
      )

    /*
     * مهم:
     *
     * prompt هنا هو نفس الوصف
     * اللي كتبه المستخدم بعد .ai
     *
     * ما كنبدلوهش.
     */

    const start =
      await this.workerRequest(

        'POST',

        `${BASE_URL}/call/${API_NAME}`,

        {
          data: [

            imageBase64,

            String(prompt),

            lora,

            0,

            true,

            1,

            4
          ]
        }
      )

    const eventId =
      start.data?.event_id

    if (!eventId) {

      throw new Error(
        'السيرفر ما رجعش event_id.'
      )
    }

    // =================================================
    // ⏳ WAIT RESULT
    // =================================================

    const res =
      await this.workerRequest(

        'GET',

        `${BASE_URL}/call/${API_NAME}/${eventId}`,

        null,

        {
          timeout: 180000,

          responseType: 'text'
        }
      )

    const output =
      this.parseSse(
        res.data
      )

    return this.extractImage(
      output
    )
  }
}

// =====================================================
// 📖 GUIDE
// =====================================================

function showGuide(
  m,
  conn,
  usedPrefix,
  command
) {

  return conn.reply(

    m.chat,

    `🤖 *${BOT_NAME}*\n\n` +

    `🖼️ *تعديل الصور بالذكاء الاصطناعي*\n\n` +

    `📌 رد على صورة وكتب الوصف ديالك مباشرة:\n\n` +

    `> ${usedPrefix + command} بدل الخلفية وخلي الشخص واقف قدام البحر وقت الغروب\n\n` +

    `📝 *مثال آخر:*\n` +

    `> ${usedPrefix + command} حول الشخص لأنمي وخلي الملابس سوداء وخلفية سينمائية\n\n` +

    `⚠️ الوصف كامل اللي من بعد الأمر غادي يتبعث للموديل كما كتبتيه.\n\n` +

    `👨‍💻 *المطور:* ${DEV_NUMBER}`,

    m
  )
}

// =====================================================
// 🤖 HANDLER
// =====================================================

const handler = async (
  m,
  {
    conn,
    text,
    usedPrefix,
    command
  }
) => {

  // ===================================================
  // 🖼️ GET IMAGE
  // ===================================================

  const q =
    m.quoted || m

  const mime =
    (q.msg || q).mimetype ||
    q.mediaType ||
    ''

  if (
    !/image/i.test(mime)
  ) {

    return showGuide(
      m,
      conn,
      usedPrefix,
      command
    )
  }

  // ===================================================
  // 📝 PROMPT
  // ===================================================

  if (
    !text ||
    !text.trim()
  ) {

    return showGuide(
      m,
      conn,
      usedPrefix,
      command
    )
  }

  /*
   * هنا أهم تغيير:
   *
   * النص كامل بعد .ai
   * كيتعتبر Prompt.
   *
   * مثال:
   *
   * .ai خلي السماء زرقاء وحيد السيارة
   *
   * prompt =
   * "خلي السماء زرقاء وحيد السيارة"
   */

  let promptText =
    String(text).trim()

  let useToken = true

  let loraName =
    'Photo-to-Anime'

  // ===================================================
  // 🔧 OPTIONAL SETTINGS
  // ===================================================

  /*
   * إلا كتبتي:
   *
   * .ai off|الوصف
   *
   * غادي يخدم بلا HF Token.
   *
   * إلا كتبتي:
   *
   * .ai on|الوصف|Photo-to-Anime
   *
   * غادي يستعمل Token و LoRA.
   *
   * ولكن الاستعمال العادي:
   *
   * .ai الوصف
   *
   * هو المفضل.
   */

  if (
    promptText.includes('|')
  ) {

    const parts =
      promptText
        .split('|')
        .map(
          x => x.trim()
        )

    if (
      parts[0]?.toLowerCase() ===
      'off'
    ) {

      useToken = false

      promptText =
        parts.slice(1, 2)[0] ||
        ''

      loraName =
        parts[2] ||
        'Photo-to-Anime'

    } else if (
      parts[0]?.toLowerCase() ===
      'on'
    ) {

      useToken = true

      promptText =
        parts.slice(1, 2)[0] ||
        ''

      loraName =
        parts[2] ||
        'Photo-to-Anime'
    }
  }

  // ===================================================
  // ❌ EMPTY PROMPT
  // ===================================================

  if (
    !promptText ||
    promptText.length < 3
  ) {

    return showGuide(
      m,
      conn,
      usedPrefix,
      command
    )
  }

  // ===================================================
  // ⏳ REACTION
  // ===================================================

  try {

    await m.react('⏳')

  } catch {}

  let imgPath = null
  let result = null
  let lastError = null

  try {

    // =================================================
    // ⏳ PROCESS MESSAGE
    // =================================================

    await conn.reply(

      m.chat,

      `⏳ *${BOT_NAME}*\n\n` +

      `جاري معالجة الصورة بالذكاء الاصطناعي...\n\n` +

      `📝 *الوصف ديالك:*\n` +
      `${promptText}\n\n` +

      `⏳ المرجو الانتظار حتى تكمل الصورة...`,

      m
    )

    // =================================================
    // 📥 DOWNLOAD
    // =================================================

    const buffer =
      await q.download()

    if (!buffer) {

      throw new Error(
        'ماقدرتش نحمل الصورة.'
      )
    }

    imgPath =
      path.join(
        os.tmpdir(),
        `damar-ai-${Date.now()}.jpg`
      )

    fs.writeFileSync(
      imgPath,
      buffer
    )

    // =================================================
    // 🔄 RETRY
    // =================================================

    for (
      let attempt = 1;
      attempt <= 3;
      attempt++
    ) {

      try {

        console.log(
          `[${BOT_NAME}] AI attempt ${attempt}/3`
        )

        const ai =
          new QwenImageEdit(
            useToken
          )

        result =
          await ai.editImage({

            imageSource:
              imgPath,

            /*
             * الوصف الأصلي بالضبط
             */
            prompt:
              promptText,

            lora:
              loraName
          })

        if (result) {
          break
        }

      } catch (err) {

        lastError =
          new Error(
            errorMessage(err)
          )

        console.error(
          `[${BOT_NAME}] Attempt ${attempt}:`,
          errorMessage(err)
        )

        if (
          attempt < 3
        ) {

          await new Promise(
            resolve =>
              setTimeout(
                resolve,
                3000
              )
          )
        }
      }
    }

    // =================================================
    // ❌ RESULT FAILED
    // =================================================

    if (!result) {

      throw (
        lastError ||
        new Error(
          'ما رجعاتش النتيجة.'
        )
      )
    }

    // =================================================
    // ✅ CAPTION
    // =================================================

    const caption =

      `🤖 *${BOT_NAME}*\n\n` +

      `✅ *الصورة وجدات بنجاح!*\n\n` +

      `📝 *الوصف:*\n` +
      `${promptText}\n\n` +

      `🎨 *LoRA:* ${loraName}\n\n` +

      `👨‍💻 *المطور:* ${DEV_NUMBER}`

    // =================================================
    // 🖼️ SEND BASE64
    // =================================================

    if (
      typeof result === 'string' &&
      result.startsWith(
        'data:image'
      )
    ) {

      const base64 =
        result.replace(
          /^data:image\/\w+;base64,/,
          ''
        )

      const outBuffer =
        Buffer.from(
          base64,
          'base64'
        )

      await conn.sendMessage(

        m.chat,

        {
          image:
            outBuffer,

          caption
        },

        {
          quoted: m
        }
      )

    } else {

      // ===============================================
      // 🌐 SEND URL
      // ===============================================

      await conn.sendMessage(

        m.chat,

        {
          image: {
            url: result
          },

          caption
        },

        {
          quoted: m
        }
      )
    }

    // =================================================
    // ✅ SUCCESS
    // =================================================

    try {
      await m.react('✅')
    } catch {}

  } catch (err) {

    console.error(
      `[${BOT_NAME}] ERROR:`,
      errorMessage(err)
    )

    // =================================================
    // ❌ ERROR
    // =================================================

    await conn.reply(

      m.chat,

      `❌ *${BOT_NAME}*\n\n` +

      `وقع مشكل وأنا كنحاول نعدل الصورة.\n\n` +

      `📌 *السبب:*\n` +
      `${errorMessage(err)}\n\n` +

      `🔄 جرب صورة أخرى أو وصف آخر.\n\n` +

      `👨‍💻 *المطور:* ${DEV_NUMBER}`,

      m
    )

    try {
      await m.react('❌')
    } catch {}

  } finally {

    // =================================================
    // 🗑️ DELETE TEMP
    // =================================================

    if (
      imgPath &&
      fs.existsSync(imgPath)
    ) {

      try {

        fs.unlinkSync(
          imgPath
        )

      } catch {}
    }
  }
}

// =====================================================
// ⚙️ COMMAND
// =====================================================

handler.help = [
  'ai'
]

handler.command = [
  'ai'
]

handler.tags = [
  'ai',
  'editor'
]

handler.limit = false

export default handler