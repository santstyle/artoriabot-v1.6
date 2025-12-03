const fetch = require('node-fetch');

module.exports = async function quoteCommand(sock, chatId, message, args) {
    try {
        let url = 'https://indonesian-quotes-api.vercel.app/api/quotes/random';
        if (args[0]) url += `?category=${args[0]}`; // example: .quote motivasi

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const q = json.data;
        const quoteMsg = `“${q.quote}”\n— ${q.source || 'Unknown'} (${q.category || 'Unknown'})`;

        await sock.sendMessage(chatId, { text: quoteMsg }, { quoted: message });
    } catch (error) {
        console.error('Error in quote command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Gagal ambil quote. Coba format: .quote [kategori]'
        }, { quoted: message });
    }
};
