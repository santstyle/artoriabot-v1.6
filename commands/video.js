const axios = require('axios');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const princeVideoApi = {
    base: 'https://api.princetechn.com/api/download/ytmp4',
    apikey: process.env.PRINCE_API_KEY || 'prince',
    async fetchMeta(videoUrl) {
        const params = new URLSearchParams({ apikey: this.apikey, url: videoUrl });
        const url = `${this.base}?${params.toString()}`;
        const { data } = await axios.get(url, { timeout: 20000, headers: { 'user-agent': 'Mozilla/5.0', accept: 'application/json' } });
        return data;
    }
};

async function videoCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();

        if (!searchQuery) {
            await sock.sendMessage(chatId, { text: '⚠️ Mau download video apa? Contoh: `.video judul lagu` atau `.video https://youtube.com/...`' }, { quoted: message });
            return;
        }

        let videoUrl = '';
        let videoTitle = '';
        let videoThumbnail = '';

        if (searchQuery.startsWith('http://') || searchQuery.startsWith('https://')) {
            videoUrl = searchQuery;
        } else {
            const { videos } = await yts(searchQuery);
            if (!videos || videos.length === 0) {
                await sock.sendMessage(chatId, { text: '❌ Video tidak ditemukan!' }, { quoted: message });
                return;
            }
            videoUrl = videos[0].url;
            videoTitle = videos[0].title;
            videoThumbnail = videos[0].thumbnail;
        }

        // Kirim thumbnail dulu biar user tau
        try {
            const ytId = (videoUrl.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/) || [])[1];
            const thumb = videoThumbnail || (ytId ? `https://i.ytimg.com/vi/${ytId}/sddefault.jpg` : undefined);
            const captionTitle = videoTitle || searchQuery;
            if (thumb) {
                await sock.sendMessage(chatId, {
                    image: { url: thumb },
                    caption: `🎬 *${captionTitle}*\nSedang diunduh...`
                }, { quoted: message });
            }
        } catch (e) { console.error('[VIDEO] Gagal kirim thumbnail:', e?.message || e); }

        // Validasi link YouTube
        let urls = videoUrl.match(/(?:https?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch\?v=|v\/|embed\/|shorts\/|playlist\?list=)?)([a-zA-Z0-9_-]{11})/gi);
        if (!urls) {
            await sock.sendMessage(chatId, { text: '❌ Itu bukan link YouTube yang valid!' }, { quoted: message });
            return;
        }

        // Ambil meta dari API PrinceTech
        let videoDownloadUrl = '';
        let title = '';
        try {
            const meta = await princeVideoApi.fetchMeta(videoUrl);
            if (meta?.success && meta?.result?.download_url) {
                videoDownloadUrl = meta.result.download_url;
                title = meta.result.title || 'video';
            } else {
                await sock.sendMessage(chatId, { text: '⚠️ Gagal ambil data dari API.' }, { quoted: message });
                return;
            }
        } catch (e) {
            console.error('[VIDEO] API error:', e?.message || e);
            await sock.sendMessage(chatId, { text: '⚠️ API error, coba lagi nanti.' }, { quoted: message });
            return;
        }
        const filename = `${title}.mp4`;

        // Coba langsung kirim video dari URL
        try {
            await sock.sendMessage(chatId, {
                video: { url: videoDownloadUrl },
                mimetype: 'video/mp4',
                fileName: filename,
                caption: `🎬 *${title}*\n\n_Downloaded by Artoria Bot_`
            }, { quoted: message });
            return;
        } catch {
            console.log('[VIDEO] Gagal kirim langsung, coba fallback...');
        }

        // Fallback download manual
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        const tempFile = path.join(tempDir, `${Date.now()}.mp4`);
        const convertedFile = path.join(tempDir, `converted_${Date.now()}.mp4`);

        let buffer;
        try {
            const videoRes = await axios.get(videoDownloadUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://youtube.com/' },
                responseType: 'arraybuffer'
            });
            buffer = Buffer.from(videoRes.data);
        } catch (err) {
            await sock.sendMessage(chatId, { text: '❌ Gagal mengunduh file video.' }, { quoted: message });
            return;
        }

        if (!buffer || buffer.length < 1024) {
            await sock.sendMessage(chatId, { text: '❌ File kosong atau terlalu kecil.' }, { quoted: message });
            return;
        }

        fs.writeFileSync(tempFile, buffer);

        try {
            await execPromise(`ffmpeg -i "${tempFile}" -c:v libx264 -c:a aac -preset veryfast -crf 26 -movflags +faststart "${convertedFile}"`);
            const stats = fs.statSync(convertedFile);
            const maxSize = 62 * 1024 * 1024;
            if (stats.size > maxSize) {
                await sock.sendMessage(chatId, { text: '⚠️ Ukuran video terlalu besar untuk WhatsApp.' }, { quoted: message });
                return;
            }
            await sock.sendMessage(chatId, {
                video: { url: convertedFile },
                mimetype: 'video/mp4',
                fileName: filename,
                caption: `🎬 *${title}*\n\n_Downloaded by Artoria Bot_`
            }, { quoted: message });
        } catch (err) {
            console.error('[VIDEO] FFMPEG error:', err?.message || err);
            const videoBuffer = fs.readFileSync(tempFile);
            await sock.sendMessage(chatId, {
                video: videoBuffer,
                mimetype: 'video/mp4',
                fileName: filename,
                caption: `🎬 *${title}*\n\n_Downloaded by Artoria Bot_`
            }, { quoted: message });
        }

        // Bersihin file temp
        setTimeout(() => {
            try {
                if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
                if (fs.existsSync(convertedFile)) fs.unlinkSync(convertedFile);
            } catch (e) {
                console.error('[VIDEO] Cleanup error:', e?.message || e);
            }
        }, 5000);

    } catch (error) {
        console.error('[VIDEO] Error:', error?.message || error);
        await sock.sendMessage(chatId, { text: '❌ Gagal download video: ' + (error?.message || 'Unknown error') }, { quoted: message });
    }
}

module.exports = videoCommand;
