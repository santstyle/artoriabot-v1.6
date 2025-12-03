const settings = require('../settings');

async function menuCommand(sock, chatId, message) {
    const menuMessage = `
👑 *${settings.botName || 'Artoria Bot'}*  
Version: ${settings.version || '1.2'}  

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 *About Bot*  
Artoria Bot adalah bot WhatsApp multifungsi untuk membantu aktivitas grup & personal.  
Nama "Artoria" diambil dari karakter *Artoria Pendragon* dari seri Fate.  

Untuk menghubungi owner bisa gunakan command *.owner*  
atau langsung chat *SantStyle* jika ada di grup yang sama.  

Berikut menu command yang tersedia di *Artoria Bot*:  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
• .simage <sticker>
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
