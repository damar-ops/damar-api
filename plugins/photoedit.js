// @description Image edit Ai
// @category AI
// @url https://photoeditorai.io/

import axios from "axios";
import formData from "form-data";

const HEADERS = {
    'Origin': 'https://photoeditorai.io',
    'Referer': 'https://photoeditorai.io/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
};

function generateProductSerial() {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let serial = '';
    for (let i = 0; i < 32; i++) {
        serial += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return serial;
}

// Scraper: takes an image buffer + prompt, returns the raw API result
async function editImage(buffer, prompt) {
    const form = new formData();
    form.append("model_name", "photoeditor_4.0");
    form.append("feature", "photo_editor");
    form.append("target_images", buffer, { filename: `image-${Date.now()}.jpg`, contentType: "image/jpeg" });
    form.append("prompt", prompt);
    form.append("ratio", "match_input_image");
    form.append("image_resolution", "1K");

    const productSerial = generateProductSerial();
    const createJob = await axios.post('https://api.photoeditorai.io/pe/photo-editor/create-job', form, {
        headers: { ...form.getHeaders(), 'Product-Serial': productSerial, ...HEADERS }
    });
    if (createJob.data.code !== 100000) throw new Error("Failed to create job: " + createJob.data.message);

    const jobId = createJob.data.result.job_id;
    for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        const jobStatus = await axios.get(
            `https://api.photoeditorai.io/pe/photo-editor/get-job/${jobId}?feature=photo_editor`,
            { headers: { 'Product-Serial': productSerial, ...HEADERS } }
        );
        if (jobStatus.data.result.status === 2) return jobStatus.data;
    }
    throw new Error("Image editing failed or timed out.");
}

// Extract the final image URL from the API response (checks common field names)
function extractImageUrl(data) {
    const r = data?.result || {};
    const out = r.output_url || r.output || r.image_url || r.result_url || r.url;
    const first = Array.isArray(out) ? out[0] : out;
    return typeof first === 'string' ? first : first?.url || null;
}

const guide = (usedPrefix, command) => `🖼️ *AI Image Editor*

This feature edits any image using an AI prompt. You describe the change in text, and the AI applies it to your photo.

*How to use:*
1. Send an image with the caption, or reply to an image with the command.
2. Write what you want changed after the command.

*Examples:*
• ${usedPrefix + command} add stylish glasses to the character
• ${usedPrefix + command} change the background to a beach at sunset
• ${usedPrefix + command} make it look like an anime drawing

*Tips:*
• Write the prompt in English for the best results.
• Be specific about what to change and keep the rest the same.
• Processing can take up to 1–2 minutes, please wait.`;

let handler = async (m, { conn, text, usedPrefix, command }) => {
    const q = m.quoted ? m.quoted : m;
    const mime = (q.msg || q).mimetype || '';

    if (!/image/.test(mime) || !text) {
        return conn.reply(m.chat, guide(usedPrefix, command), m);
    }

    await conn.reply(m.chat, '⏳ Editing your image, please wait...', m);

    try {
        const buffer = await q.download();
        if (!buffer) throw new Error('Could not download the image.');

        const result = await editImage(buffer, text);
        const url = extractImageUrl(result);
        if (!url) throw new Error('No image was returned by the API.');

        await conn.sendFile(m.chat, url, 'edited.jpg', `✅ *Done!*\n📝 Prompt: ${text}`, m);
    } catch (e) {
        console.error(e);
        await conn.reply(m.chat, `❌ Failed to edit the image.\n${e.message}`, m);
    }
};

handler.help = handler.command = ['photoedit'];

handler.tags = ['editor'];

handler.limit = false;

export default handler;