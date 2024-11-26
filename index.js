"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = 3000;
// Middleware to parse JSON request bodies
app.use(express_1.default.json());
app.post('/chat', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { message } = req.body; // Expecting a "message" field in the request body
    if (!message) {
        return res.status(400).send({ error: 'Message is required in the request body.' });
    }
    try {
        const response = yield axios_1.default.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo', // Use 'gpt-4' if you have access and prefer it
            messages: [
                { role: 'system', content: 'You are ChatGPT, a helpful assistant.' },
                { role: 'user', content: message }
            ],
            max_tokens: 500
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        res.json(response.data); // Return the ChatGPT response
    }
    catch (error) {
        console.error(error);
        if (axios_1.default.isAxiosError(error)) {
            res.status(((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) || 500).send(((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || 'Error communicating with OpenAI.');
        }
        else {
            res.status(500).send({ error: 'An unknown error occurred.' });
        }
    }
}));
app.listen(port, () => {
    console.log(`ChatGPT wrapper server running at http://localhost:${port}`);
});
