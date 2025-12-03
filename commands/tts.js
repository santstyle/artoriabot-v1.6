const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');

async function ttsCommand(sock, chatId, args, message) {
    try {
        if (!args || args.length === 0) {
            await sock.sendMessage(chatId, { text: '⚠️ Format: *.tts <lang> <text>*\n\nContoh: *.tts id selamat pagi dunia*' });
            return;
        }

        // Ambil bahasa + teks dari args
        const lang = args[0];
        const text = args.slice(1).join(" ");

        if (!text) {
            await sock.sendMessage(chatId, { text: '⚠️ Harap masukkan teks yang mau diubah jadi suara.' });
            return;
        }

        // Bikin file sementara
        const fileName = `tts-${Date.now()}.mp3`;
        const filePath = path.join(__dirname, '..', 'assets', fileName);

        const gtts = new gTTS(text, lang);

        gtts.save(filePath, async function (err) {
            if (err) {
                console.error("TTS Error:", err);
                await sock.sendMessage(chatId, { text: '❌ Error generate TTS audio. Cek bahasanya valid atau enggak.' });
                return;
            }

            await sock.sendMessage(chatId, {
                audio: { url: filePath },
                mimetype: 'audio/mpeg',
                ptt: true // biar dikirim kayak voice note WA
            }, { quoted: message });

            // Hapus file setelah dikirim
            fs.unlinkSync(filePath);
        });
    } catch (error) {
        console.error('Error in TTS command:', error);
        await sock.sendMessage(chatId, { text: '❌ TTS lagi error, coba lagi nanti.' });
    }
}

module.exports = ttsCommand;
