const fs = require('fs');
const path = require('path');

// Path to absen data file
const absenDataPath = path.join(__dirname, '../data/absen.json');

// Ensure data directory exists
const dataDir = path.dirname(absenDataPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize absen data if not exists
if (!fs.existsSync(absenDataPath)) {
    fs.writeFileSync(absenDataPath, JSON.stringify({}, null, 2));
}

async function startAbsen(sock, message, text) {
    try {
        const chatId = message.key.remoteJid;
        const data = JSON.parse(fs.readFileSync(absenDataPath, 'utf8'));

        if (data[chatId]?.active) {
            await sock.sendMessage(chatId, { text: 'Absen sudah aktif. Gunakan .finishabsen untuk mengakhiri.' });
            return;
        }

        const title = text.trim() || 'Absen';
        data[chatId] = {
            active: true,
            title: title,
            participants: [],
            startTime: new Date().toISOString()
        };

        fs.writeFileSync(absenDataPath, JSON.stringify(data, null, 2));

        await sock.sendMessage(chatId, {
            text: `✅ *ABSEN DIMULAI*\n\n title}*\n\nKirim *.absen [nama]* untuk absen\nKirim *.finishabsen* untuk mengakhiri absen`
        });

    } catch (error) {
        console.error('Error in startAbsen:', error);
        await sock.sendMessage(message.key.remoteJid, { text: 'Terjadi kesalahan saat memulai absen.' });
    }
}

async function addAbsen(sock, message, text) {
    try {
        const chatId = message.key.remoteJid;
        const senderId = message.key.participant || message.key.remoteJid;
        const data = JSON.parse(fs.readFileSync(absenDataPath, 'utf8'));

        if (!data[chatId]?.active) {
            await sock.sendMessage(chatId, { text: 'Tidak ada absen yang aktif. Gunakan .startabsen untuk memulai.' });
            return;
        }

        const name = text.trim() || 'Anonymous';
        const participantIndex = data[chatId].participants.findIndex(p => p.id === senderId);

        if (participantIndex > -1) {
            // Update existing participant
            data[chatId].participants[participantIndex].name = name;
            data[chatId].participants[participantIndex].time = new Date().toISOString();
            await sock.sendMessage(chatId, { text: `✅ Absen diperbarui: ${name}` });
        } else {
            // Add new participant
            data[chatId].participants.push({
                id: senderId,
                name: name,
                time: new Date().toISOString()
            });
            await sock.sendMessage(chatId, { text: `✅ Berhasil absen: ${name}` });
        }

        fs.writeFileSync(absenDataPath, JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('Error in addAbsen:', error);
        await sock.sendMessage(message.key.remoteJid, { text: 'Terjadi kesalahan saat melakukan absen.' });
    }
}

async function finishAbsen(sock, message) {
    try {
        const chatId = message.key.remoteJid;
        const data = JSON.parse(fs.readFileSync(absenDataPath, 'utf8'));

        if (!data[chatId]?.active) {
            await sock.sendMessage(chatId, { text: 'Tidak ada absen yang aktif.' });
            return;
        }

        const absenData = data[chatId];
        let resultText = `*HASIL ABSEN*\n\n *${absenData.title}*\n\n`;

        if (absenData.participants.length === 0) {
            resultText += '❌ Belum ada yang absen\n';
        } else {
            resultText += `✅ Total peserta: ${absenData.participants.length}\n\n`;
            absenData.participants.forEach((participant, index) => {
                const time = new Date(participant.time).toLocaleString('id-ID');
                resultText += `${index + 1}. ${participant.name} - ${time}\n`;
            });
        }

        resultText += `\nDimulai: ${new Date(absenData.startTime).toLocaleString('id-ID')}`;
        resultText += `\nDiakhiri: ${new Date().toLocaleString('id-ID')}`;

        // Mark as inactive
        data[chatId].active = false;
        fs.writeFileSync(absenDataPath, JSON.stringify(data, null, 2));

        await sock.sendMessage(chatId, { text: resultText });

    } catch (error) {
        console.error('Error in finishAbsen:', error);
        await sock.sendMessage(message.key.remoteJid, { text: 'Terjadi kesalahan saat mengakhiri absen.' });
    }
}

module.exports = {
    startAbsen,
    addAbsen,
    finishAbsen
};
