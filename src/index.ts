import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Client, GatewayIntentBits, Message, ChannelType, Partials } from 'discord.js';
import { verifyRequest } from './verifyRequest'; // Import verification logic
import { Buffer } from 'buffer';

// Load environment variables
dotenv.config();

const app = express();
const port = 3000;

// Middleware to capture raw body for signature verification
app.use(
    '/interactions',
    express.raw({ type: 'application/json' })
);

// Middleware to parse JSON bodies for other routes
app.use(express.json({
    verify: (req, res, buf) => {
        (req as any).rawBody = buf;
    }
}));

// Read context from combined.md at startup
let context: string = '';
try {
    const contextPath = path.resolve(__dirname, 'combined.md');
    context = fs.readFileSync(contextPath, 'utf8');
    console.log('Context loaded successfully from combined.md');
} catch (error) {
    console.error('Error loading context from combined.md:', error);
    process.exit(1); // Exit if context cannot be loaded
}

// Express Routes
app.get('/', (req, res) => {
    res.send('Hello World');
});

// Interactions Endpoint
// @ts-ignore
app.post('/interactions', async (req, res) => {
    const signature = req.headers['x-signature-ed25519'] as string;
    const timestamp = req.headers['x-signature-timestamp'] as string;
    const rawBody = req.body as Buffer;

    if (!verifyRequest(signature, timestamp, rawBody)) {
        return res.status(401).send('Invalid request signature');
    }

    const interaction = JSON.parse(rawBody.toString());

    if (interaction.type === 1) {
        // PING request
        return res.send({
            type: 1, // PONG
        });
    }

    // Handle other interaction types here

    return res.status(200).send('Interaction received');
});

// Start Express Server
app.listen(port, () => {
    console.log(`ChatGPT wrapper server running at http://localhost:${port}`);
});

// Discord Bot Integration
const discordToken = process.env.DISCORD_TOKEN;

if (!discordToken) {
    console.error('DISCORD_TOKEN is missing in the environment variables.');
    process.exit(1);
}

const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // Enable Message Content Intent
        GatewayIntentBits.DirectMessages, // Add this to receive DMs
    ],
    partials: [Partials.Channel], // Add this to handle DM channels
});

// Discord Bot Event: Ready
discordClient.once('ready', () => {
    console.log(`Discord bot logged in as ${discordClient.user?.tag}`);
});

// Discord Bot Event: Message Create
discordClient.on('messageCreate', async (message: Message) => {
    console.log('messageCreate');
    console.log(`Received message from ${message.author.tag} in ${message.channel.type}: ${message.content}`);

    if (message.author.bot) return;

    if (message.channel.type === ChannelType.DM) {
        try {
            await message.channel.sendTyping();
            const maxContextLength = 1000; // Adjust as needed
            const limitedContext = context.length > maxContextLength ? context.substring(0, maxContextLength) : context;

            const messages = [
                { role: 'system', content: 'You are ChatGPT, a helpful assistant.' },
                { role: 'system', content: limitedContext },
                { role: 'user', content: message.content },
            ];

            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-3.5-turbo',
                    messages: messages,
                    max_tokens: 500,
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const reply = response.data.choices[0].message.content;

            if (reply.length > 2000) {
                const replyChunks = reply.match(/[\s\S]{1,2000}/g) || [];
                for (const chunk of replyChunks) {
                    await message.channel.send(chunk);
                }
            } else {
                await message.channel.send(reply);
            }
        } catch (error) {
            // @ts-ignore
            console.error('Error communicating with OpenAI:', error.response?.data || error.message);
            await message.channel.send('Sorry, I encountered an error while processing your request.');
        }
    } else {
        console.error('Message received in a non-DM channel.');
    }
});

discordClient
    .login(discordToken)
    .then(() => console.log('Discord bot is up and running!'))
    .catch((error) => {
        console.error('Failed to log in Discord bot:', error);
        process.exit(1);
    });
