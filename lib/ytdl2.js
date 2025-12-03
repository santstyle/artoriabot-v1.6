// commands/ytmp4.js
const yt = require('../ytmp4'); // path ke file YTDownloader lo
const fs = require('fs');

module.exports = async function (sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const args = text.split(' ');
        const query = args.slice(1).join(' ').trim();

        if (!query) {
            await sock.sendMessage(chatId, { text: 'Kirim link atau judul video YouTube yang mau diunduh!\n\nContoh: *.ytmp4 Alan Walker Faded*' }, { quoted: message });
            return;
        }

        // Ambil data video
        const data = await yt.mp4(query, 134); // kualitas default: 360p
        if (!data || !data.videoUrl) {
            await sock.sendMessage(chatId, { text: 'Gagal mendapatkan video, coba lagi.' }, { quoted: message });
            return;
        }

        // Kasih notif dulu
        await sock.sendMessage(chatId, {
            image: { url: data.thumb.url },
            caption: `🎬 *${data.title}*\n📺 Channel: ${data.channel}\n⏳ Durasi: ${data.duration} detik\n📅 Rilis: ${data.date}\n\nSedang mendownload...`
        }, { quoted: message });

        // Kirim file video
        await sock.sendMessage(chatId, {
            video: { url: data.videoUrl },
            mimetype: 'video/mp4',
            caption: `🎬 *${data.title}*\n\n> *_Downloaded by Artoria Bot_*`
        }, { quoted: message });

    } catch (error) {
        console.error('[YTMP4 Error]', error);
        await sock.sendMessage(chatId, { text: 'Terjadi kesalahan saat download video 😿' }, { quoted: message });
    }
};
