const fs = require('fs');
const path = require('path');

const USER_GROUP_DATA = path.join(__dirname, '../data/userGroupData.json');

// Simple chat memory
const chatMemory = new Map();

// Load user group data
function loadUserGroupData() {
    try {
        if (fs.existsSync(USER_GROUP_DATA)) {
            return JSON.parse(fs.readFileSync(USER_GROUP_DATA));
        }
        return { groups: [], chatbot: {} };
    } catch (error) {
        console.error('Error loading data:', error.message);
        return { groups: [], chatbot: {} };
    }
}

// Save user group data
function saveUserGroupData(data) {
    try {
        fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving data:', error.message);
    }
}

// Simple delay function
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function handleChatbotCommand(sock, chatId, message, match) {
    try {
        const text = message.message?.conversation ||
            message.message?.extendedTextMessage?.text || '';

        // Show typing
        await sock.sendPresenceUpdate('composing', chatId);
        await delay(1000);

        if (!match) {
            const botNumber = sock.user.id.split(':')[0];
            return sock.sendMessage(chatId, {
                text: `PANDUAN CHATBOT

CARA PAKAI:
.chatbot on  -> Aktifkan di grup ini
.chatbot off -> Matikan di grup ini

CARA AJAK NGOMONG:
1. Mention @${botNumber}
2. Sebut "Artoria"
3. Reply pesan Artoria

Contoh:
"@${botNumber} halo"
"Artoria, apa kabar?"
"Hey Artoria"

Aku bisa temenin kamu ngobrol!`,
                quoted: message
            });
        }

        const data = loadUserGroupData();

        // Check if user is admin
        let isAdmin = false;
        const sender = message.key.participant || message.key.remoteJid;

        if (chatId.endsWith('@g.us')) {
            try {
                const metadata = await sock.groupMetadata(chatId);
                isAdmin = metadata.participants.some(p =>
                    p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin')
                );
            } catch (e) {
                console.log('Tidak bisa cek admin status');
            }
        }

        if (!isAdmin) {
            return sock.sendMessage(chatId, {
                text: 'Hanya admin grup yang bisa atur ini',
                quoted: message
            });
        }

        if (match === 'on') {
            if (data.chatbot && data.chatbot[chatId]) {
                return sock.sendMessage(chatId, {
                    text: 'Artoria sudah aktif di grup ini',
                    quoted: message
                });
            }

            if (!data.chatbot) data.chatbot = {};
            data.chatbot[chatId] = true;
            saveUserGroupData(data);

            return sock.sendMessage(chatId, {
                text: 'Artoria sudah diaktifkan! Sekarang ajak aku ngobrol ya',
                quoted: message
            });
        }

        if (match === 'off') {
            if (!data.chatbot || !data.chatbot[chatId]) {
                return sock.sendMessage(chatId, {
                    text: 'Artoria sudah dimatikan',
                    quoted: message
                });
            }

            delete data.chatbot[chatId];
            saveUserGroupData(data);

            return sock.sendMessage(chatId, {
                text: 'Artoria dimatikan. Sampai jumpa!',
                quoted: message
            });
        }

        return sock.sendMessage(chatId, {
            text: 'Perintah tidak dikenali. Gunakan .chatbot on atau .chatbot off',
            quoted: message
        });

    } catch (error) {
        console.error('Chatbot command error:', error);
        await sock.sendMessage(chatId, {
            text: 'Ada error nih, coba lagi ya',
            quoted: message
        });
    }
}

async function handleChatbotResponse(sock, chatId, message, userMessage, senderId) {
    try {
        const data = loadUserGroupData();
        if (!data.chatbot || !data.chatbot[chatId]) return;

        const botNumber = sock.user.id.split(':')[0];
        const botJid = botNumber + '@s.whatsapp.net';

        // Check if message is for Artoria
        let isForArtoria = false;
        let cleanedMessage = userMessage;

        // Check mention
        if (cleanedMessage.includes(`@${botNumber}`)) {
            isForArtoria = true;
            cleanedMessage = cleanedMessage.replace(new RegExp(`@${botNumber}`, 'g'), '').trim();
        }

        // Check name
        const lowerMessage = cleanedMessage.toLowerCase();
        if (lowerMessage.includes('artoria')) {
            isForArtoria = true;
            cleanedMessage = cleanedMessage.replace(/artoria/gi, '').trim();
        }

        // Check reply
        if (message.message?.extendedTextMessage?.contextInfo?.participant === botJid) {
            isForArtoria = true;
        }

        if (!isForArtoria) return;

        // Show typing
        await sock.sendPresenceUpdate('composing', chatId);
        await delay(1500 + Math.random() * 2000);

        // Get or init memory
        if (!chatMemory.has(senderId)) {
            chatMemory.set(senderId, []);
        }

        const memory = chatMemory.get(senderId);
        memory.push(cleanedMessage || 'hai');
        if (memory.length > 10) memory.shift();

        // Simple AI response based on message
        let response = getSimpleResponse(cleanedMessage, memory);

        // Send response
        await sock.sendMessage(chatId, {
            text: response,
            mentions: [senderId]
        }, {
            quoted: message
        });

    } catch (error) {
        console.error('Chatbot response error:', error);
    }
}

function getSimpleResponse(message, memory) {
    const lowerMsg = message.toLowerCase().trim();

    // Greetings
    if (lowerMsg.match(/^(hai|halo|hi|hello|hey|hallo|hei|woi|oy|oi)$/)) {
        const greetings = [
            'Hai juga! Ada yang bisa Artoria bantu?',
            'Halo~ senang bisa ngobrol dengan kamu',
            'Hai, apa kabar?',
            'Hello! Artoria di sini siap temenin kamu'
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];
    }

    // Questions about Artoria
    if (lowerMsg.match(/(siapa|nama|kamu|artoria|identitas)/)) {
        const responses = [
            'Aku Artoria, teman chatbot yang siap temenin kamu ngobrol',
            'Namaku Artoria! Senang berkenalan dengan kamu',
            'Aku Artoria, bisa dipanggil Artoria aja',
            'Artoria di sini! Mau ngobrol apa?'
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    // How are you
    if (lowerMsg.match(/(apa\s+kabar|gimana|bagaimana|kabar)/)) {
        const responses = [
            'Alhamdulillah baik, kamu gimana?',
            'Artoria baik-baik aja, terima kasih sudah nanya',
            'Baik kok, senang kamu nanya. Kamu gimana?',
            'Lagi baik nih, ada yang bisa Artoria bantu?'
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    // Thank you
    if (lowerMsg.match(/(terima\s+kasih|makasih|thanks|thank you)/)) {
        const responses = [
            'Sama-sama! Senang bisa bantu',
            'Iya sama-sama~',
            'Sama-sama ya, Artoria senang bisa membantu',
            'Sama-sama! Jangan sungkan kalo butuh bantuan lagi'
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    // Goodbye
    if (lowerMsg.match(/(dadah|bye|daah|sampai\s+jumpa|selamat\s+tinggal)/)) {
        const responses = [
            'Dadah~ sampai jumpa lagi ya',
            'Sampai ketemu lagi!',
            'Bye bye, jangan lupa ajak ngobrol lagi',
            'Dadah, Artoria tunggu kamu lagi nanti'
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    // Default responses based on message length
    if (lowerMsg.length < 5) {
        const shorts = [
            'Ya?',
            'Ada yang bisa Artoria bantu?',
            'Hmm?',
            'Apa itu?',
            'Ceritakan dong'
        ];
        return shorts[Math.floor(Math.random() * shorts.length)];
    }

    // Try to give context-aware response
    const lastMsg = memory.length > 1 ? memory[memory.length - 2] : '';

    if (lastMsg) {
        if (lastMsg.toLowerCase().includes('lagi apa')) {
            return 'Lagi nungguin kamu ngobrol nih';
        }

        if (lastMsg.toLowerCase().match(/(cape|lelah|letih|penat)/)) {
            return 'Istirahat dulu ya, jangan dipaksain';
        }

        if (lastMsg.toLowerCase().match(/(senang|bahagia|happy|gembira)/)) {
            return 'Wah senang dengar itu!';
        }

        if (lastMsg.toLowerCase().match(/(sedih|susah|kecewa|marah)/)) {
            return 'Jangan sedih ya, Artoria temenin kamu';
        }
    }

    // Generic responses
    const generics = [
        'Hmm menarik, cerita lebih lanjut dong',
        'Artoria dengerin kok, lanjutin',
        'Wah, terus gimana ceritanya?',
        'Menurut Artoria sih... coba jelasin lebih detail',
        'Aku ngerti maksud kamu, terus?',
        'Seru juga ya, ada lanjutannya?',
        'Artoria penasaran nih, ceritain lebih banyak dong',
        'Wah, gitu ya. Ada lagi yang mau diceritain?'
    ];

    return generics[Math.floor(Math.random() * generics.length)];
}

module.exports = {
    handleChatbotCommand,
    handleChatbotResponse
};