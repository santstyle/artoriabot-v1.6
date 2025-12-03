const settings = require('../settings');

async function menuCommand(sock, chatId, message) {
    const menuMessage = `
👑 *${settings.botName || 'ARTORIA BOT'}*  
Version: ${settings.version || '1.6'}  

*DESCRIPTION*
Artoria Bot is a multifunctional WhatsApp bot designed to assist with group and personal activities.
The name "Artoria" is inspired by the character Artoria Pendragon from the Fate series.

To contact the owner, you can use the command .owner
or simply chat with SantStyle if they are in the same group.

Here are the available command menus in Artoria Bot:

*LANGUAGE*
• .setlang id
• .setlang en

*GENERAL*
• .help
• .menu
• .startabsen
• .absen
• .finishabsen
• .ping
• .alive
• .owner
• .joke
• .meme
• .quote
• .fact
• .news
• .groupinfo
• .staff
• .weather <city>
• .lyrics <song_title>

*ADMIN*
• .antitag <on/off>
• .welcome <on/off>
• .goodbye <on/off>
• .ban @user
• .mute <minutes>
• .kick @user
• .warnings @user
• .warn @user
• .tag <message>
• .unmute
• .delete
• .antilink
• .antibadword
• .clear
• .tagall
• .hidetag
• .chatbot
• .resetlink

*IMAGE/STICKER*
• .sticker <image>
• .crop <image>
• .toimage <sticker>
• .tgsticker <link>
• .take <setwm>


*DOWNLOADER*
• .play <song_name>
• .song <song_name>
• .instagram <link>
• .video <song_name>
• .facebook <link>
• .tiktok <link>
• .ytmp4 <link>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Powered & Modified By SantStyle
`;

    try {
        await sock.sendMessage(chatId, { text: menuMessage }, { quoted: message });
    } catch (error) {
        console.error('Error in menu command:', error);
        await sock.sendMessage(chatId, { text: menuMessage });
    }
}

module.exports = menuCommand;
