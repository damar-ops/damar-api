import axios from "axios"
import FormData from "form-data"

const LITTERBOX_API = "https://litterbox.catbox.moe/resources/internals/api.php"

async function uploadLitterbox(buffer, filename, mimetype) {
    const form = new FormData()

    form.append("reqtype", "fileupload")
    form.append("time", "72h")

    form.append("fileToUpload", buffer, {
        filename,
        contentType: mimetype
    })

    const { data } = await axios.post(
        LITTERBOX_API,
        form,
        {
            headers: {
                ...form.getHeaders(),
                "User-Agent": "DAMAR-MD"
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            timeout: 180000
        }
    )

    const result = String(data).trim()

    if (!result.startsWith("https://")) {
        throw new Error(result)
    }

    return result
}

const handler = async (m) => {
    try {

        const quoted = m.quoted || m

        const mime =
            quoted.mimetype ||
            quoted.msg?.mimetype ||
            ""

        if (!mime)
            return m.reply("❌ رد على صورة أو صوت.")

        const buffer = await quoted.download()

        if (!buffer)
            throw new Error("فشل تحميل الملف.")

        // صورة
        if (mime.startsWith("image/")) {

            let ext = "jpg"

            if (mime.includes("png")) ext = "png"
            if (mime.includes("webp")) ext = "webp"

            const filename = `DAMAR_${Date.now()}.${ext}`

            const url = await uploadLitterbox(
                buffer,
                filename,
                mime
            )

            return m.reply(
`✅ تم رفع الصورة

${url}`
            )
        }

        // صوت
        if (mime.startsWith("audio/")) {

            const filename = `DAMAR_${Date.now()}.opus`

            const url = await uploadLitterbox(
                buffer,
                filename,
                "audio/ogg"
            )

            return m.reply(
`✅ تم رفع الصوت

${url}`
            )
        }

        return m.reply("❌ يدعم الصور والأصوات فقط.")

    } catch (e) {

        console.log(e)

        return m.reply(
`❌ فشل الرفع

${e.message}`
        )
    }
}

handler.help = ["rabit"]
handler.tags = ["uploader"]
handler.command = ["rabit"]

export default handler