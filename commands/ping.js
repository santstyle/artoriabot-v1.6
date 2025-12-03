const os = require('os');
const settings = require('../settings.js');

function formatTime(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    seconds %= (24 * 60 * 60);
    const hours = Math.floor(seconds / (60 * 60));
    seconds %= (60 * 60);
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);

    let time = '';
    if (days > 0) time += `${days}d `;
    if (hours > 0) time += `${hours}h `;
    if (minutes > 0) time += `${minutes}m `;
    if (seconds > 0 || time === '') time += `${seconds}s`;

    return time.trim();
}

async function pingCommand(sock, chatId, message) {
    try {
        const start = Date.now();
        await sock.sendMessage(chatId, { text: 'Testing ping...' }, { quoted: message });
        const end = Date.now();
        const ping = Math.round(end - start);

        const uptimeFormatted = formatTime(process.uptime());

        // RAM usage info
        const usedMemory = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
        const totalMemory = (os.totalmem() / 1024 / 1024).toFixed(2);

        const botInfo = `
┏━━〔 Artoria Bot Status 〕━━┓
┃  Ping     : ${ping} ms
┃  Uptime   : ${uptimeFormatted}
┃  Memory   : ${usedMemory} MB / ${totalMemory} MB
┃  Version  : v${settings.version}
┗━━━━━━━━━━━━━━━━━━━━━━━┛`.trim();

        await sock.sendMessage(chatId, { text: botInfo }, { quoted: message });
    } catch (error) {
        console.error('Error in ping command:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to get bot status.' });
    }
}

module.exports = pingCommand;
