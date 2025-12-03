const settings = require("../settings");
const langHelper = require("../lib/lang");

async function aliveCommand(sock, chatId, message) {
    try {
        const lang = langHelper.getLang(chatId);
        const message1 = lang.general.alive.message.replace('{version}', settings.version);

        await sock.sendMessage(chatId, {
            text: message1
        }, { quoted: message });
    } catch (error) {
        console.error('Error in alive command:', error);
        const lang = langHelper.getLang(chatId);
        await sock.sendMessage(chatId, { text: lang.general.alive.error }, { quoted: message });
    }
}

module.exports = aliveCommand;
