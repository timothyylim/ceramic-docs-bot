import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const app = express();
const port = 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

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

app.get('/', (req: express.Request, res: any) => {
    res.send('Hello World');
});

app.post('/chat', async (req: express.Request, res: any) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).send({ error: 'Message is required in the request body.' });
    }

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are ChatGPT, a helpful assistant.' },
                    { role: 'system', content: context }, // Add context from combined.md
                    { role: 'user', content: message }
                ],
                max_tokens: 500
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error(error);

        if (axios.isAxiosError(error)) {
            res.status(error.response?.status || 500).send(error.response?.data || 'Error communicating with OpenAI.');
        } else {
            res.status(500).send({ error: 'An unknown error occurred.' });
        }
    }
});

app.listen(port, () => {
    console.log(`ChatGPT wrapper server running at http://localhost:${port}`);
});
