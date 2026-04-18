require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

// --- CONFIGURAÇÃO DISCORD ---
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/callback';
const BOT_TOKEN = process.env.BOT_TOKEN || process.env.DISCORD_TOKEN;

let usuarioLogado = null;

app.use(express.static(__dirname));

// --- BOT DO DISCORD ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.on('ready', () => {
    console.log(`🤖 Bot logado como ${client.user.tag}!`);
});

client.on('messageCreate', (message) => {
    if (message.author.bot) return;
    io.emit('chat message', {
        user: message.author.username,
        text: message.content
    });
});

client.login(BOT_TOKEN);

// --- ROTAS ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (code) {
        try {
            const response = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI,
            }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

            const userResponse = await axios.get('https://discord.com/api/users/@me', {
                headers: { Authorization: `Bearer ${response.data.access_token}` }
            });

            usuarioLogado = userResponse.data;
            res.redirect('/');
        } catch (error) {
            res.send('Erro no login');
        }
    }
});

app.get('/api/user', (req, res) => {
    res.json(usuarioLogado || { error: "Ninguém logado" });
});

server.listen(port, () => {
    console.log(`\n✅ SERVIDOR ONLINE!`);
    console.log(`🌍 Acesse: http://localhost:${port}`);
});