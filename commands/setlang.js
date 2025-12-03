/**
 * .setlang command
 * Usage:
 *   .setlang en - Set language to English
 *   .setlang id - Set language to Indonesian
 */

const langHelper = require('../lib/lang');

async function setLangCommand(sock, chatId, message, args) {
    try {
        if (!args || args.length === 0) {
            await sock.sendMessage(chatId, {
                text: 'Usage: .setlang <en/id>\nExample: .setlang en'
            }, { quoted: message });
            return;
        }

        const selectedLang = args[0].toLowerCase();
        const availableLangs = langHelper.getAvailableLangs();

        if (!availableLangs.includes(selectedLang)) {
            await sock.sendMessage(chatId, {
                text: `Invalid language code. Available options: ${availableLangs.join(', ')}`
            }, { quoted: message });
            return;
        }

        const success = langHelper.setLang(chatId, selectedLang);
        if (!success) {
            await sock.sendMessage(chatId, {
                text: 'Failed to set language. Please try again.'
            }, { quoted: message });
            return;
        }

        // Get language messages for confirmation
        const langMessages = langHelper.getLang(chatId);

        // Confirmation messages for English and Indonesian
        const confirmationMessages = {
            en: 'Language set to English.',
            id: 'Bahasa diubah ke Indonesia.'
        };

        const confirmationText = confirmationMessages[selectedLang] || 'Language set.';

        await sock.sendMessage(chatId, {
            text: confirmationText
        }, { quoted: message });

    } catch (error) {
        console.error('Error in setlang command:', error);
        await sock.sendMessage(chatId, {
            text: 'An error occurred while setting language.'
        }, { quoted: message });
    }
}

module.exports = setLangCommand;
