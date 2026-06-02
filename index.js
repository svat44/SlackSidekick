require("dotenv").config();
const { App } = require("@slack/bolt");
const axios = require("axios");

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true
});

(async () => {
    await app.start();
    console.log("bot is running!");
})();

app.command("/sv-ping", async ({command, ack, respond}) => {
    const start = Date.now();
    await ack();
    const latency = Date.now() - start;
    await respond(`Pong! Latency: ${latency}ms`); 
});

app.command("/sv-help", async ({command, ack, respond}) => {
    await ack();
    await respond("Available commands:\n- `/sv-ping`: Check the bot's latency.\n- `/sv-help`: Display this help message.");
});

app.command("/sv-help", async ({command, ack, respond}) => {
    await ack();
    await respond("Available commands:\n- `/sv-ping`: Check the bot's latency.\n- `/sv-help`: Display this help message.");
});

app.command("/sv-joke", async ({command, ack, respond}) => {
    await ack();
    try {
        const response = await axios.get("https://official-joke-api.appspot.com/jokes/random");
        await respond(response.data.setup + " " + response.data.punchline);
    } catch (error) {
        await respond("Sorry, I couldn't fetch a joke at the moment.");
    }
});

app.command("/sv-weekly-headline", async ({command, ack, respond}) => {
    await ack();
    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini-search-preview",
                messages: [{role: "user", content: "What is a top headline in the world this week? ONLY RETURN ME ONE SINGLE HEADLINE AND THE NEWS SOURCE TO LEARN MORE. KEEP THE RESPONSE UNDER 20 WORDS AND A LINK."}]
            })
        });
        const data = await response.json();
        await respond(data.choices[0].message.content);
    } catch (error) {
        await respond("Sorry, I couldn't fetch the weekly headline at the moment.");
    }
});

app.command("/sv-math", async ({command, ack, respond}) => {
    await ack();

    const question = command.text.trim();
    if (!(question)) {
        await respond("Please provide a math question after the command. For example: `/sv-math 1+1`");
        return;
    }
    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini-search-preview",
                messages: [{role: "user", content: `You are my math tutor. Here is my question, please solve it step by step, showing your work: ${question}. Do not talk any gish-pish and only focus on solving the problem. IE: if I were to say can u help solve (x+2)(x-2) = 0 find x, just give me the steps, numbered 1. new line 2. new line 3. new line 4. so on.`}]
            })
        });
        const data = await response.json();
        await respond(data.choices[0].message.content);
    } catch (error) {
        await respond("Sorry, I couldn't fetch the weekly headline at the moment.");
    }
});