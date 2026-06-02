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
