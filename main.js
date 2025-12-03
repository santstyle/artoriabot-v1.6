const settings = require('./settings');
require('./config.js');

// === TAMBAHKAN BACKUP FFMPEG CONFIG DI SINI ===
const { exec } = require('child_process');

// Pastikan path FFmpeg diatur (cadangan untuk main.js)
if (!process.env.FFMPEG_PATH) {
    const path = require('path'); // <-- PINDAHKAN KE DALAM IF
    const ffmpegPath = path.join(__dirname, 'ffmpeg', 'bin', 'ffmpeg.exe');
    process.env.FFMPEG_PATH = ffmpegPath;
    console.log('Path FFmpeg diatur di main.js:', ffmpegPath);
}
// === END BACKUP FFMPEG ===

const { isBanned } = require('./lib/isBanned');
const yts = require('yt-search');
const fs = require('fs');
const fetch = require('node-fetch');
const ytdl = require('ytdl-core');
const path = require('path'); // <-- INI SATU-SATUNYA DEKLARASI PATH DI MAIN.JS
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const { addWelcome, delWelcome, isWelcomeOn, addGoodbye, delGoodBye, isGoodByeOn, isSudo } = require('./lib/index');


// Import command
const tagAllCommand = require('./commands/tagall');
const { hidetagCommand } = require('./commands/hidetag');
const helpCommand = require('./commands/help');
const banCommand = require('./commands/ban');
const muteCommand = require('./commands/mute');
const unmuteCommand = require('./commands/unmute');
const stickerCommand = require('./commands/sticker');
const isAdmin = require('./lib/isAdmin');
const { tictactoeCommand, handleTicTacToeMove } = require('./lib/tictactoe');
const warnCommand = require('./commands/warn');
const warningsCommand = require('./commands/warnings');
const ttsCommand = require('./commands/tts');
const ownerCommand = require('./commands/owner');
const deleteCommand = require('./commands/delete');
const { handleAntilinkCommand, handleLinkDetection } = require('./commands/antilink');
const { handleAntitagCommand, handleTagDetection } = require('./commands/antitag');
const { Antilink } = require('./lib/antilink');
const memeCommand = require('./commands/meme');
const tagCommand = require('./commands/tag');
const jokeCommand = require('./commands/joke');
const quoteCommand = require('./commands/quote');
const factCommand = require('./commands/fact');
const weatherCommand = require('./commands/weather');
const newsCommand = require('./commands/news');
const kickCommand = require('./commands/kick');
const toimageCommand = require('./commands/toimage');
const { lyricsCommand } = require('./commands/lyrics');
const { clearCommand } = require('./commands/clear');
const pingCommand = require('./commands/ping');
const aliveCommand = require('./commands/alive');
const blurCommand = require('./commands/img-blur');
const welcomeCommand = require('./commands/welcome');
const goodbyeCommand = require('./commands/goodbye');
const { handleAntiBadwordCommand, handleBadwordDetection } = require('./lib/antibadword');
const antibadwordCommand = require('./commands/antibadword');
const { handleChatbotCommand, handleChatbotResponse } = require('./commands/chatbot');
const takeCommand = require('./commands/take');
const groupInfoCommand = require('./commands/groupinfo');
const resetlinkCommand = require('./commands/resetlink');
const staffCommand = require('./commands/staff');
const stickerTelegramCommand = require('./commands/stickertelegram');
const setLangCommand = require('./commands/setlang');
const broadcastCommand = require('./commands/broadcast');
const instagramCommand = require('./commands/instagram');
const facebookCommand = require('./commands/facebook');
const playCommand = require('./commands/play');
const tiktokCommand = require('./commands/tiktok');
const songCommand = require('./commands/song');
const { handleTranslateCommand } = require('./commands/translate');
const { handleSsCommand } = require('./commands/ss');
const { addCommandReaction, handleAreactCommand } = require('./lib/reactions');
const videoCommand = require('./commands/video');
const stickercropCommand = require('./commands/stickercrop');
// Global settings
global.packname = settings.packname;
global.author = settings.author;

// Tambahkan ini di dekat bagian atas main.js dengan konfigurasi global lainnya

async function handleMessages(sock, messageUpdate, printLog) {
    try {
        const { messages, type } = messageUpdate;
        if (type !== 'notify') return;

        const message = messages[0];
        if (!message?.message) return;



        // Simpan pesan untuk fitur antidelete
        if (message.message) {
            storeMessage(message);
        }

        // Handle pencabutan pesan
        if (message.message?.protocolMessage?.type === 0) {
            await handleMessageRevocation(sock, message);
            return;
        }

        const senderId = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        const senderIsSudo = await isSudo(senderId);

        const userMessage = (
            message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            ''
        ).toLowerCase().replace(/\.\s+/g, '.').trim();

        // Pertahankan pesan asli untuk command seperti .tag yang membutuhkan huruf asli
        const rawText = message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            '';

        // Hanya log penggunaan command
        if (userMessage.startsWith('.')) {
            console.log(`Command digunakan di ${isGroup ? 'grup' : 'privat'}: ${userMessage}`);
        }

        // Cek apakah pengguna dibanned (lewati cek ban untuk command .unban)
        if (isBanned(senderId) && !userMessage.startsWith('.unban')) {
            // Hanya merespons sesekali untuk menghindari spam
            if (Math.random() < 0.1) {
                await sock.sendMessage(chatId, {
                    text: 'Anda dibanned dari penggunaan bot. Hubungi admin untuk dibuka.'
                });
            }
            return;
        }

        // Pertama cek apakah ini langkah permainan
        if (/^[1-9]$/.test(userMessage) || userMessage.toLowerCase() === 'surrender') {
            await handleTicTacToeMove(sock, chatId, senderId, userMessage);
            return;
        }

        if (!message.key.fromMe) incrementMessageCount(chatId, senderId);

        // Cek kata kasar PERTAMA, sebelum pemrosesan LAINNYA
        if (isGroup && userMessage) {
            await handleBadwordDetection(sock, chatId, message, userMessage, senderId);
        }

        // Kemudian cek prefix command
        if (!userMessage.startsWith('.')) {
            if (isGroup) {
                // Proses pesan non-command terlebih dahulu
                await handleChatbotResponse(sock, chatId, message, userMessage, senderId);
                await Antilink(message, sock);
                await handleBadwordDetection(sock, chatId, message, userMessage, senderId);
                await handleTagDetection(sock, chatId, message, senderId);
            }
            return;
        }

        // Daftar command admin
        const adminCommands = ['.mute', '.unmute', '.ban', '.unban', '.kick', '.tagall', '.hidetag', '.antilink', '.antitag'];
        const isAdminCommand = adminCommands.some(cmd => userMessage.startsWith(cmd));

        // Daftar command owner
        const ownerCommands = ['.mode', '.autostatus', '.antidelete', '.cleartmp', '.setpp', '.clearsession', '.areact', '.autoreact'];
        const isOwnerCommand = ownerCommands.some(cmd => userMessage.startsWith(cmd));

        let isSenderAdmin = false;
        let isBotAdmin = false;

        // Cek status admin hanya untuk command admin di grup
        if (isGroup && isAdminCommand) {
            const adminStatus = await isAdmin(sock, chatId, senderId, message);
            isSenderAdmin = adminStatus.isSenderAdmin;
            isBotAdmin = adminStatus.isBotAdmin;

            if (!isBotAdmin) {
                await sock.sendMessage(chatId, { text: 'Mohon jadikan bot sebagai admin untuk menggunakan command admin.' }, { quoted: message });
                return;
            }

            if (
                userMessage.startsWith('.mute') ||
                userMessage === '.unmute' ||
                userMessage.startsWith('.ban') ||
                userMessage.startsWith('.unban')
            ) {
                if (!isSenderAdmin && !message.key.fromMe) {
                    await sock.sendMessage(chatId, {
                        text: 'Maaf, hanya admin grup yang bisa menggunakan command ini.'
                    });
                    return;
                }
            }
        }

        // Cek status owner untuk command owner
        if (isOwnerCommand) {
            if (!message.key.fromMe && !senderIsSudo) {
                await sock.sendMessage(chatId, { text: 'Command ini hanya tersedia untuk owner atau sudo!' });
                return;
            }
        }

        // Tambahkan ini di awal logika penanganan pesan, sebelum memproses command
        try {
            const data = JSON.parse(fs.readFileSync('./data/messageCount.json'));
            // Izinkan owner menggunakan bot bahkan dalam mode privat
            if (!data.isPublic && !message.key.fromMe && !senderIsSudo) {
                return; // Abaikan diam-diam pesan dari non-owner saat dalam mode privat
            }
        } catch (error) {
            console.error('Error memeriksa mode akses:', error);
            // Default ke mode publik jika ada error membaca file
        }

        // Penangan command - Eksekusi command segera tanpa menunggu indikator mengetik
        // Kami akan menunjukkan indikator mengetik setelah eksekusi command jika diperlukan
        let commandExecuted = false;

        switch (true) {
            case userMessage === '.toimage': {
                const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                if (quotedMessage?.stickerMessage) {
                    await toimageCommand(sock, quotedMessage, chatId);
                } else {
                    await sock.sendMessage(chatId, { text: 'Balas stiker dengan command .toimage untuk mengonversinya.' });
                }
                commandExecuted = true;
                break;
            }
            case userMessage === '.startabsen':
                const startAbsenText = rawText.slice(11).trim();
                await startAbsen(sock, message, startAbsenText);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.absen'):
                const absenText = rawText.replace(/^\.?\s*absen\s*/i, '').trim();
                await addAbsen(sock, message, absenText);
                commandExecuted = true;
                break;
            case userMessage === '.finishabsen':
                await finishAbsen(sock, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.kick'):
                const mentionedJidListKick = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await kickCommand(sock, chatId, senderId, mentionedJidListKick, message);
                break;
            case userMessage.startsWith('.mute'):
                const muteDuration = parseInt(userMessage.split(' ')[1]);
                if (isNaN(muteDuration)) {
                    await sock.sendMessage(chatId, { text: 'Mohon berikan jumlah menit yang valid.\ncontoh untuk mute 10 menit\n.mute 10' });
                } else {
                    await muteCommand(sock, chatId, senderId, muteDuration);
                }
                break;
            case userMessage === '.unmute':
                await unmuteCommand(sock, chatId, senderId);
                break;
            case userMessage.startsWith('.ban'):
                await banCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.unban'):
                await unbanCommand(sock, chatId, message);
                break;
            case userMessage === '.help' || userMessage === '.menu' || userMessage === '.bot' || userMessage === '.list':
                await helpCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage === '.sticker' || userMessage === '.s':
                await stickerCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.warnings'):
                const mentionedJidListWarnings = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await warningsCommand(sock, chatId, mentionedJidListWarnings);
                break;
            case userMessage.startsWith('.warn'):
                const mentionedJidListWarn = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await warnCommand(sock, chatId, senderId, mentionedJidListWarn, message);
                break;
            case userMessage.startsWith('.tts'):
                const text = userMessage.slice(4).trim();
                await ttsCommand(sock, chatId, text, message);
                break;
            case userMessage === '.delete' || userMessage === '.del':
                await deleteCommand(sock, chatId, message, senderId);
                break;
            case userMessage.startsWith('.attp'):
                await attpCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.mode'):
                // Cek apakah pengirim adalah owner
                if (!message.key.fromMe && !senderIsSudo) {
                    await sock.sendMessage(chatId, { text: 'Hanya owner bot yang bisa menggunakan command ini!' });
                    return;
                }
                // Baca data saat ini terlebih dahulu
                let data;
                try {
                    data = JSON.parse(fs.readFileSync('./data/messageCount.json'));
                } catch (error) {
                    console.error('Error membaca mode akses:', error);
                    await sock.sendMessage(chatId, { text: 'Gagal membaca status mode bot' });
                    return;
                }

                const action = userMessage.split(' ')[1]?.toLowerCase();
                // Jika tidak ada argumen, tampilkan status saat ini
                if (!action) {
                    const currentMode = data.isPublic ? 'publik' : 'privat';
                    await sock.sendMessage(chatId, {
                        text: `Mode bot saat ini: *${currentMode}*\n\nPenggunaan: .mode publik/privat\n\nContoh:\n.mode publik - Izinkan semua orang menggunakan bot\n.mode privat - Batasi hanya untuk owner`
                    });
                    return;
                }

                if (action !== 'public' && action !== 'private') {
                    await sock.sendMessage(chatId, {
                        text: 'Penggunaan: .mode public/private\n\nContoh:\n.mode public - Izinkan semua orang menggunakan bot\n.mode private - Batasi hanya untuk owner'
                    });
                    return;
                }

                try {
                    // Perbarui mode akses
                    data.isPublic = action === 'public';

                    // Simpan data yang diperbarui
                    fs.writeFileSync('./data/messageCount.json', JSON.stringify(data, null, 2));

                    await sock.sendMessage(chatId, { text: `Bot sekarang dalam mode *${action}*` });
                } catch (error) {
                    console.error('Error memperbarui mode akses:', error);
                    await sock.sendMessage(chatId, { text: 'Gagal memperbarui mode akses bot' });
                }
                break;
            case userMessage.startsWith('.setlang'):
                const lang = userMessage.split(' ')[1];
                if (!lang || (lang !== 'en' && lang !== 'id')) {
                    await sock.sendMessage(chatId, { text: 'Bahasa tidak valid. Gunakan .setlang en atau .setlang id' });
                    break;
                }
                await setLangCommand(sock, chatId, message, [lang]);
                break;
            case userMessage.startsWith('.bc'):
            case userMessage.startsWith('.broadcast'):
                const bcArgs = userMessage.split(' ').slice(1);
                await broadcastCommand(sock, chatId, message, bcArgs);
                break;
            case userMessage === '.owner':
                await ownerCommand(sock, chatId);
                break;
            case userMessage === '.tagall':
                if (isSenderAdmin || message.key.fromMe) {
                    await tagAllCommand(sock, chatId, senderId, message);
                } else {
                    await sock.sendMessage(chatId, { text: 'Maaf, hanya admin grup yang bisa menggunakan command .tagall.' }, { quoted: message });
                }
                break;
            case userMessage.startsWith('.hidetag'):
                if (isSenderAdmin || message.key.fromMe) {
                    await hidetagCommand(sock, message, '.');
                } else {
                    await sock.sendMessage(chatId, { text: 'Fitur ini hanya bisa digunakan oleh admin grup.' }, { quoted: message });
                }
                break;
            case userMessage.startsWith('.tag'):
                const messageText = rawText.slice(4).trim();  // gunakan rawText di sini, bukan userMessage
                const replyMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
                await tagCommand(sock, chatId, senderId, messageText, replyMessage);
                break;
            case userMessage.startsWith('.antilink'):
                if (!isGroup) {
                    await sock.sendMessage(chatId, {
                        text: 'Command ini hanya bisa digunakan di grup.'
                    });
                    return;
                }
                if (!isBotAdmin) {
                    await sock.sendMessage(chatId, {
                        text: 'Mohon jadikan bot sebagai admin terlebih dahulu.'
                    });
                    return;
                }
                await handleAntilinkCommand(sock, chatId, userMessage, senderId, isSenderAdmin);
                break;
            case userMessage.startsWith('.antitag'):
                if (!isGroup) {
                    await sock.sendMessage(chatId, {
                        text: 'Command ini hanya bisa digunakan di grup.'
                    });
                    return;
                }
                if (!isBotAdmin) {
                    await sock.sendMessage(chatId, {
                        text: 'Mohon jadikan bot sebagai admin terlebih dahulu.'
                    });
                    return;
                }
                await handleAntitagCommand(sock, chatId, userMessage, senderId, isSenderAdmin);
                break;
            case userMessage === '.meme':
                await memeCommand(sock, chatId, message);
                break;
            case userMessage === '.joke':
                await jokeCommand(sock, chatId, message);
                break;
            case userMessage === '.quote':
                await quoteCommand(sock, chatId, message);
                break;
            case userMessage === '.fact':
                await factCommand(sock, chatId, message, message);
                break;
            case userMessage.startsWith('.weather'):
                const city = userMessage.slice(9).trim();
                if (city) {
                    await weatherCommand(sock, chatId, city);
                } else {
                    await sock.sendMessage(chatId, { text: 'Mohon tentukan kota, contoh: .weather London' });
                }
                break;
            case userMessage === '.news':
                await newsCommand(sock, chatId);
                break;
            case userMessage.startsWith('.ttt') || userMessage.startsWith('.tictactoe'):
                const tttText = userMessage.split(' ').slice(1).join(' ');
                await tictactoeCommand(sock, chatId, senderId, tttText);
                break;
            case userMessage.startsWith('.move'):
                const position = parseInt(userMessage.split(' ')[1]);
                if (isNaN(position)) {
                    await sock.sendMessage(chatId, { text: 'Mohon berikan nomor posisi yang valid untuk langkah Tic-Tac-Toe.' });
                } else {
                    tictactoeMove(sock, chatId, senderId, position);
                }
                break;
            case userMessage === '.topmembers':
                topMembers(sock, chatId, isGroup);
                break;
            case userMessage.startsWith('.hangman'):
                startHangman(sock, chatId);
                break;
            case userMessage.startsWith('.guess'):
                const guessedLetter = userMessage.split(' ')[1];
                if (guessedLetter) {
                    guessLetter(sock, chatId, guessedLetter);
                } else {
                    sock.sendMessage(chatId, { text: 'Mohon tebak huruf menggunakan .guess <huruf>' });
                }
                break;
            case userMessage.startsWith('.trivia'):
                startTrivia(sock, chatId);
                break;
            case userMessage.startsWith('.answer'):
                const answer = userMessage.split(' ').slice(1).join(' ');
                if (answer) {
                    answerTrivia(sock, chatId, answer);
                } else {
                    sock.sendMessage(chatId, { text: 'Mohon berikan jawaban menggunakan .answer <jawaban>' });
                }
                break;
            case userMessage.startsWith('.compliment'):
                await complimentCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.insult'):
                await insultCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.8ball'):
                const question = userMessage.split(' ').slice(1).join(' ');
                await eightBallCommand(sock, chatId, question);
                break;
            case userMessage.startsWith('.lyrics'):
                const songTitle = userMessage.split(' ').slice(1).join(' ');
                await lyricsCommand(sock, chatId, songTitle, message);
                break;
            case userMessage.startsWith('.simp'):
                const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await simpCommand(sock, chatId, quotedMsg, mentionedJid, senderId);
                break;
            case userMessage.startsWith('.stupid') || userMessage.startsWith('.itssostupid') || userMessage.startsWith('.iss'):
                const stupidQuotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                const stupidMentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
                const stupidArgs = userMessage.split(' ').slice(1);
                await stupidCommand(sock, chatId, stupidQuotedMsg, stupidMentionedJid, senderId, stupidArgs);
                break;
            case userMessage === '.dare':
                await dareCommand(sock, chatId, message);
                break;
            case userMessage === '.truth':
                await truthCommand(sock, chatId, message);
                break;
            case userMessage === '.clear':
                if (isGroup) await clearCommand(sock, chatId);
                break;

            case userMessage === '.ping':
                await pingCommand(sock, chatId, message);
                break;
            case userMessage === '.alive':
                await aliveCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.blur'):
                const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                await blurCommand(sock, chatId, message, quotedMessage);
                break;
            case userMessage.startsWith('.welcome'):
                if (isGroup) {
                    // Cek status admin jika belum dicek
                    if (!isSenderAdmin) {
                        const adminStatus = await isAdmin(sock, chatId, senderId);
                        isSenderAdmin = adminStatus.isSenderAdmin;
                    }

                    if (isSenderAdmin || message.key.fromMe) {
                        await welcomeCommand(sock, chatId, message);
                    } else {
                        await sock.sendMessage(chatId, { text: 'Maaf, hanya admin grup yang bisa menggunakan command ini.' });
                    }
                } else {
                    await sock.sendMessage(chatId, { text: 'Command ini hanya bisa digunakan di grup.' });
                }
                break;
            case userMessage.startsWith('.goodbye'):
                if (isGroup) {
                    // Cek status admin jika belum dicek
                    if (!isSenderAdmin) {
                        const adminStatus = await isAdmin(sock, chatId, senderId);
                        isSenderAdmin = adminStatus.isSenderAdmin;
                    }

                    if (isSenderAdmin || message.key.fromMe) {
                        await goodbyeCommand(sock, chatId, message);
                    } else {
                        await sock.sendMessage(chatId, { text: 'Maaf, hanya admin grup yang bisa menggunakan command ini.' });
                    }
                } else {
                    await sock.sendMessage(chatId, { text: 'Command ini hanya bisa digunakan di grup.' });
                }
                break;
            case userMessage === '.git':
            case userMessage === '.github':
            case userMessage === '.sc':
            case userMessage === '.script':
            case userMessage === '.repo':
                await githubCommand(sock, chatId);
                break;
            case userMessage.startsWith('.antibadword'):
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'Command ini hanya bisa digunakan di grup.' });
                    return;
                }

                const adminStatus = await isAdmin(sock, chatId, senderId);
                isSenderAdmin = adminStatus.isSenderAdmin;
                isBotAdmin = adminStatus.isBotAdmin;

                if (!isBotAdmin) {
                    await sock.sendMessage(chatId, { text: 'Bot harus menjadi admin untuk menggunakan fitur ini' });
                    return;
                }

                await antibadwordCommand(sock, chatId, message, senderId, isSenderAdmin);
                break;
            case userMessage.startsWith('.chatbot'):
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'Command ini hanya bisa digunakan di grup.' });
                    return;
                }

                // Cek apakah pengirim adalah admin atau owner bot
                const chatbotAdminStatus = await isAdmin(sock, chatId, senderId);
                if (!chatbotAdminStatus.isSenderAdmin && !message.key.fromMe) {
                    await sock.sendMessage(chatId, { text: 'Hanya admin atau owner bot yang bisa menggunakan command ini' });
                    return;
                }

                const match = userMessage.slice(8).trim();
                await handleChatbotCommand(sock, chatId, message, match);
                break;
            case userMessage.startsWith('.take'):
                const takeArgs = rawText.slice(5).trim().split(' ');
                await takeCommand(sock, chatId, message, takeArgs);
                break;
            case userMessage === '.flirt':
                await flirtCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.character'):
                await characterCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.waste'):
                await wastedCommand(sock, chatId, message);
                break;
            case userMessage === '.ship':
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'Command ini hanya bisa digunakan di grup!' });
                    return;
                }
                await shipCommand(sock, chatId, message);
                break;
            case userMessage === '.groupinfo' || userMessage === '.infogp' || userMessage === '.infogrupo':
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'Command ini hanya bisa digunakan di grup!' });
                    return;
                }
                await groupInfoCommand(sock, chatId, message);
                break;
            case userMessage === '.resetlink' || userMessage === '.revoke' || userMessage === '.anularlink':
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'Command ini hanya bisa digunakan di grup!' });
                    return;
                }
                await resetlinkCommand(sock, chatId, senderId);
                break;
            case userMessage === '.staff' || userMessage === '.admins' || userMessage === '.listadmin':
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'Command ini hanya bisa digunakan di grup!' });
                    return;
                }
                await staffCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.emojimix') || userMessage.startsWith('.emix'):
                await emojimixCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.tg') || userMessage.startsWith('.stickertelegram') || userMessage.startsWith('.tgsticker') || userMessage.startsWith('.telesticker'):
                await stickerTelegramCommand(sock, chatId, message);
                break;

            case userMessage === '.vv':
                await viewOnceCommand(sock, chatId, message);
                break;
            case userMessage === '.clearsession' || userMessage === '.clearsesi':
                await clearSessionCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.autostatus'):
                const autoStatusArgs = userMessage.split(' ').slice(1);
                await autoStatusCommand(sock, chatId, message, autoStatusArgs);
                break;
            case userMessage.startsWith('.simp'):
                await simpCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.metallic'):
                await textmakerCommand(sock, chatId, message, userMessage, 'metallic');
                break;
            case userMessage.startsWith('.ice'):
                await textmakerCommand(sock, chatId, message, userMessage, 'ice');
                break;
            case userMessage.startsWith('.snow'):
                await textmakerCommand(sock, chatId, message, userMessage, 'snow');
                break;
            case userMessage.startsWith('.impressive'):
                await textmakerCommand(sock, chatId, message, userMessage, 'impressive');
                break;
            case userMessage.startsWith('.matrix'):
                await textmakerCommand(sock, chatId, message, userMessage, 'matrix');
                break;
            case userMessage.startsWith('.light'):
                await textmakerCommand(sock, chatId, message, userMessage, 'light');
                break;
            case userMessage.startsWith('.neon'):
                await textmakerCommand(sock, chatId, message, userMessage, 'neon');
                break;
            case userMessage.startsWith('.devil'):
                await textmakerCommand(sock, chatId, message, userMessage, 'devil');
                break;
            case userMessage.startsWith('.purple'):
                await textmakerCommand(sock, chatId, message, userMessage, 'purple');
                break;
            case userMessage.startsWith('.thunder'):
                await textmakerCommand(sock, chatId, message, userMessage, 'thunder');
                break;
            case userMessage.startsWith('.leaves'):
                await textmakerCommand(sock, chatId, message, userMessage, 'leaves');
                break;
            case userMessage.startsWith('.1917'):
                await textmakerCommand(sock, chatId, message, userMessage, '1917');
                break;
            case userMessage.startsWith('.arena'):
                await textmakerCommand(sock, chatId, message, userMessage, 'arena');
                break;
            case userMessage.startsWith('.hacker'):
                await textmakerCommand(sock, chatId, message, userMessage, 'hacker');
                break;
            case userMessage.startsWith('.sand'):
                await textmakerCommand(sock, chatId, message, userMessage, 'sand');
                break;
            case userMessage.startsWith('.blackpink'):
                await textmakerCommand(sock, chatId, message, userMessage, 'blackpink');
                break;
            case userMessage.startsWith('.glitch'):
                await textmakerCommand(sock, chatId, message, userMessage, 'glitch');
                break;
            case userMessage.startsWith('.fire'):
                await textmakerCommand(sock, chatId, message, userMessage, 'fire');
                break;
            case userMessage.startsWith('.antidelete'):
                const antideleteMatch = userMessage.slice(11).trim();
                await handleAntideleteCommand(sock, chatId, message, antideleteMatch);
                break;
            case userMessage === '.surrender':
                // Handle command surrender untuk permainan tictactoe
                await handleTicTacToeMove(sock, chatId, senderId, 'surrender');
                break;
            case userMessage === '.cleartmp':
                await clearTmpCommand(sock, chatId, message);
                break;
            case userMessage === '.setpp':
                await setProfilePicture(sock, chatId, message);
                break;
            case userMessage.startsWith('.instagram') || userMessage.startsWith('.insta') || userMessage.startsWith('.ig'):
                await instagramCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.fb') || userMessage.startsWith('.facebook'):
                await facebookCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.music'):
                await playCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.play') || userMessage.startsWith('.mp3') || userMessage.startsWith('.ytmp3') || userMessage.startsWith('.song'):
                await songCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.video') || userMessage.startsWith('.ytmp4'):
                await videoCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.tiktok') || userMessage.startsWith('.tt'):
                await tiktokCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.gpt') || userMessage.startsWith('.gemini'):
                await aiCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.translate') || userMessage.startsWith('.trt'):
                const commandLength = userMessage.startsWith('.translate') ? 10 : 4;
                await handleTranslateCommand(sock, chatId, message, userMessage.slice(commandLength));
                return;
            case userMessage.startsWith('.ss') || userMessage.startsWith('.ssweb') || userMessage.startsWith('.screenshot'):
                const ssCommandLength = userMessage.startsWith('.screenshot') ? 11 : (userMessage.startsWith('.ssweb') ? 6 : 3);
                await handleSsCommand(sock, chatId, message, userMessage.slice(ssCommandLength).trim());
                break;
            case userMessage.startsWith('.areact') || userMessage.startsWith('.autoreact') || userMessage.startsWith('.autoreaction'):
                const isOwnerOrSudo = message.key.fromMe || senderIsSudo;
                await handleAreactCommand(sock, chatId, message, isOwnerOrSudo);
                break;
            case userMessage.startsWith('.sudo'):
                await sudoCommand(sock, chatId, message);
                break;
            case userMessage === '.goodnight' || userMessage === '.lovenight' || userMessage === '.gn':
                await goodnightCommand(sock, chatId, message);
                break;
            case userMessage === '.shayari' || userMessage === '.shayri':
                await shayariCommand(sock, chatId, message);
                break;
            case userMessage === '.roseday':
                await rosedayCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.imagine') || userMessage.startsWith('.flux') || userMessage.startsWith('.dalle'): await imagineCommand(sock, chatId, message);
                break;
            case userMessage === '.jid': await groupJidCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.heart'):
                await handleHeart(sock, chatId, message);
                break;
            case userMessage.startsWith('.horny'):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const args = ['horny', ...parts.slice(1)];
                    await miscCommand(sock, chatId, message, args);
                }
                break;
            case userMessage.startsWith('.circle'):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const args = ['circle', ...parts.slice(1)];
                    await miscCommand(sock, chatId, message, args);
                }
                break;
            case userMessage.startsWith('.lgbt'):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const args = ['lgbt', ...parts.slice(1)];
                    await miscCommand(sock, chatId, message, args);
                }
                break;
            case userMessage.startsWith('.lolice'):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const args = ['lolice', ...parts.slice(1)];
                    await miscCommand(sock, chatId, message, args);
                }
                break;
            case userMessage.startsWith('.simpcard'):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const args = ['simpcard', ...parts.slice(1)];
                    await miscCommand(sock, chatId, message, args);
                }
                break;
            case userMessage.startsWith('.tonikawa'):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const args = ['tonikawa', ...parts.slice(1)];
                    await miscCommand(sock, chatId, message, args);
                }
                break;
            case userMessage.startsWith('.its-so-stupid'):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const args = ['its-so-stupid', ...parts.slice(1)];
                    await miscCommand(sock, chatId, message, args);
                }
                break;
            case userMessage.startsWith('.namecard'):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const args = ['namecard', ...parts.slice(1)];
                    await miscCommand(sock, chatId, message, args);
                }
                break;

            case userMessage.startsWith('.oogway2'):
            case userMessage.startsWith('.oogway'):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const sub = userMessage.startsWith('.oogway2') ? 'oogway2' : 'oogway';
                    const args = [sub, ...parts.slice(1)];
                    await miscCommand(sock, chatId, message, args);
                }
                break;
            case userMessage.startsWith('.tweet'):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const args = ['tweet', ...parts.slice(1)];
                    await miscCommand(sock, chatId, message, args);
                }
                break;
            case userMessage.startsWith('.ytcomment'):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const args = ['youtube-comment', ...parts.slice(1)];
                    await miscCommand(sock, chatId, message, args);
                }
                break;
            case userMessage.startsWith('.comrade'):
            case userMessage.startsWith('.glass'):
            case userMessage.startsWith('.jail'):
            case userMessage.startsWith('.passed'):
            case userMessage.startsWith('.triggered'):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const sub = userMessage.slice(1).split(/\s+/)[0];
                    const args = [sub, ...parts.slice(1)];
                    await miscCommand(sock, chatId, message, args);
                }
                break;
            case userMessage.startsWith('.animu'):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const args = parts.slice(1);
                    await animeCommand(sock, chatId, message, args);
                }
                break;
            // animu aliases
            case userMessage.startsWith('.nom'):
            case userMessage.startsWith('.poke'):
            case userMessage.startsWith('.cry'):
            case userMessage.startsWith('.kiss'):
            case userMessage.startsWith('.pat'):
            case userMessage.startsWith('.hug'):
            case userMessage.startsWith('.wink'):
            case userMessage.startsWith('.facepalm'):
            case userMessage.startsWith('.face-palm'):
            case userMessage.startsWith('.animuquote'):
            case userMessage.startsWith('.quote'):
            case userMessage.startsWith('.neko'):
            case userMessage.startsWith('.waifu'):
            case userMessage.startsWith('.loli'):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    let sub = parts[0].slice(1);
                    if (sub === 'facepalm') sub = 'face-palm';
                    if (sub === 'quote' || sub === 'animuquote') sub = 'quote';
                    await animeCommand(sock, chatId, message, [sub]);
                }
                break;
            case userMessage === '.crop':
                await stickercropCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.pies'):
                {
                    const parts = rawText.trim().split(/\s+/);
                    const args = parts.slice(1);
                    await piesCommand(sock, chatId, message, args);
                    commandExecuted = true;
                }
                break;
            case userMessage === '.china':
                await piesAlias(sock, chatId, message, 'china');
                commandExecuted = true;
                break;
            case userMessage === '.indonesia':
                await piesAlias(sock, chatId, message, 'indonesia');
                commandExecuted = true;
                break;
            case userMessage === '.japan':
                await piesAlias(sock, chatId, message, 'japan');
                commandExecuted = true;
                break;
            case userMessage === '.korea':
                await piesAlias(sock, chatId, message, 'korea');
                commandExecuted = true;
                break;
            case userMessage === '.hijab':
                await piesAlias(sock, chatId, message, 'hijab');
                commandExecuted = true;
                break;
            case userMessage.startsWith('.update'):
                {
                    const parts = rawText.trim().split(/\s+/);
                    const zipArg = parts[1] && parts[1].startsWith('http') ? parts[1] : '';
                    await updateCommand(sock, chatId, message, senderIsSudo, zipArg);
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith('.removebg') || userMessage.startsWith('.rmbg') || userMessage.startsWith('.nobg'):
                await removebgCommand.exec(sock, message, userMessage.split(' ').slice(1));
                break;
            case userMessage.startsWith('.remini') || userMessage.startsWith('.enhance') || userMessage.startsWith('.upscale'):
                await reminiCommand(sock, chatId, message, userMessage.split(' ').slice(1));
                break;
            default:
                if (isGroup) {
                    // Handle pesan grup non-command
                    if (userMessage) {  // Pastikan ada pesan
                        await handleChatbotResponse(sock, chatId, message, userMessage, senderId);
                    }
                    await Antilink(message, sock);
                    await handleBadwordDetection(sock, chatId, message, userMessage, senderId);
                    await handleTagDetection(sock, chatId, message, senderId);
                }
                commandExecuted = false;
                break;
        }

        // Jika command dieksekusi, tunjukkan status mengetik setelah eksekusi command
        if (commandExecuted !== false) {
            // Command dieksekusi, sekarang tunjukkan status mengetik setelah eksekusi command
            await showTypingAfterCommand(sock, chatId);
        }

        // Fungsi untuk menangani command .groupjid
        async function groupJidCommand(sock, chatId, message) {
            const groupJid = message.key.remoteJid;

            if (!groupJid.endsWith('@g.us')) {
                return await sock.sendMessage(chatId, {
                    text: "Command ini hanya bisa digunakan di grup."
                });
            }

            await sock.sendMessage(chatId, {
                text: `Group JID: ${groupJid}`
            }, {
                quoted: message
            });
        }

        if (userMessage.startsWith('.')) {
            // Setelah command diproses dengan sukses
            await addCommandReaction(sock, message);
        }
    } catch (error) {
        console.error('Error dalam penangan pesan:', error.message);
        // Hanya mencoba mengirim pesan error jika kita memiliki chatId yang valid
        if (chatId) {
            await sock.sendMessage(chatId, {
                text: 'Gagal memproses command!'
            });
        }
    }
}

async function handleGroupParticipantUpdate(sock, update) {
    try {
        const { id, participants, action, author } = update;

        // Cek apakah ini grup
        if (!id.endsWith('@g.us')) return;



        // Handle event join
        if (action === 'add') {
            // Cek apakah welcome diaktifkan untuk grup ini
            const isWelcomeEnabled = await isWelcomeOn(id);
            if (!isWelcomeEnabled) return;

            // Dapatkan metadata grup
            const groupMetadata = await sock.groupMetadata(id);
            const groupName = groupMetadata.subject;
            const groupDesc = groupMetadata.desc || 'Tidak ada deskripsi tersedia';

            // Gunakan pesan welcome default sederhana
            const welcomeMessage = 'Selamat datang {user} di {group}!';

            // Kirim pesan welcome untuk setiap peserta baru
            for (const participant of participants) {
                const user = participant.split('@')[0];
                const formattedMessage = welcomeMessage
                    .replace('{user}', `@${user}`)
                    .replace('{group}', groupName)
                    .replace('{description}', groupDesc);

                await sock.sendMessage(id, {
                    text: formattedMessage,
                    mentions: [participant]
                });
            }
        }

        // Handle event leave
        if (action === 'remove') {
            // Cek apakah goodbye diaktifkan untuk grup ini
            const isGoodbyeEnabled = await isGoodByeOn(id);
            if (!isGoodbyeEnabled) return;

            // Dapatkan metadata grup
            const groupMetadata = await sock.groupMetadata(id);
            const groupName = groupMetadata.subject;

            // Gunakan pesan goodbye default sederhana
            const goodbyeMessage = 'Selamat tinggal {user}';

            // Kirim pesan goodbye untuk setiap peserta yang keluar
            for (const participant of participants) {
                const user = participant.split('@')[0];
                const formattedMessage = goodbyeMessage
                    .replace('{user}', `@${user}`)
                    .replace('{group}', groupName);

                await sock.sendMessage(id, {
                    text: formattedMessage,
                    mentions: [participant]
                });
            }
        }
    } catch (error) {
        console.error('Error di handleGroupParticipantUpdate:', error);
    }
}

// Alih-alih, export penangan bersama dengan handleMessages
module.exports = {
    handleMessages,
    handleGroupParticipantUpdate,
    handleStatus: async (sock, status) => {
        await handleStatusUpdate(sock, status);
    }
};