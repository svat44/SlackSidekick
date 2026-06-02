require("dotenv").config();
const { App } = require("@slack/bolt");
const axios = require("axios");
const {bjGames, deck, shuffle, handTotal, formatHand} = require("./blackjack");

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true
});

(async () => {
    await app.start();
    console.log("bot is running!");
})();

// LATENCY CHECKER

app.command("/sv-ping", async ({command, ack, respond}) => {
    const start = Date.now();
    await ack();
    const latency = Date.now() - start;
    await respond(`Pong! Latency: ${latency}ms`); 
});

// ASK FOR A LIST OF COMMANDS

app.command("/sv-help", async ({command, ack, respond}) => {
    await ack();
    await respond(
        "*Utility Commands*\n" +
        "- `/sv-ping` — Check the bot's latency.\n" +
        "- `/sv-help` — Display this help message.\n" +
        "- `/sv-whatdoisay [style]` — Suggest a reply to recent channel messages.\n" +
        "*Informative Commands*\n" +
        "- `/sv-weekly-headline` — Get a top headline from this week.\n" +
        "- `/sv-math [question]` — Solve a math problem step by step.\n" +
        "*Game Commands*\n" +
        "- `/sv-joke` — Get a random joke.\n" +
        "- `/sv-blackjack [start|hit|stand]` — Play a game of blackjack."
    );
});

// GET A RANDOM JOKE

app.command("/sv-joke", async ({command, ack, respond}) => {
    await ack();
    try {
        const response = await axios.get("https://official-joke-api.appspot.com/jokes/random");
        await respond(response.data.setup + " " + response.data.punchline);
    } catch (error) {
        await respond("Sorry, I couldn't fetch a joke at the moment.");
    }
});

// GET WEEKLY HEADLINES

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

// SOLVE MATH PROBLEMS
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
                messages: [{role: "user", content: `You are my math tutor. Here is my question, please solve it step by step, showing your work: ${question}. Do not talk any gish-pish and only focus on solving the problem. IE: if I were to say can u help solve (x+2)(x-2) = 0 find x, just give me the steps, numbered 1. new line 2. new line 3. new line 4. so on. If the question is not related to math, say "Gee Gilly Googly Winkers, you have confused me, I am only a math tutor!"`}]
            })
        });
        const data = await response.json();
        await respond(data.choices[0].message.content);
    } catch (error) {
        await respond("Sorry, I couldn't fetch the weekly headline at the moment.");
    }
});


// RESPOND TO PEOPLES' MESSAGES
app.command('/sv-whatdoisay', async ({command, ack, respond, client }) => {
    await ack();

    const channelId = command.channel_id;

    const history = await client.conversations.history({
        channel: channelId,
        limit: 10
    });

    const style = command.text.trim().toLowerCase() || "considerate and professional";

    const messages = history.messages
        .reverse()
        .map(m=> `${m.user ? `<@${m.user}>: ` : ''}${m.text}`)
        .join('\n');

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: "gpt-4o",
            messages: [{role: "user", content: `You are my assistant, and I want you to suggest a considerate reply in an appropriate tone to the messages in this slack channel. Here are the recent messages: ${messages}. Respond in the following style: ${style}.`}]
        })
    });

    const data = await response.json();
    const reply = data.choices[0].message.content;

    await respond({
        response_type: 'ephemeral',
        text: reply
    });
});

app.command("/sv-blackjack", async ({command, ack, respond}) => {
    await ack();
    const userId = command.user_id;
    const input = command.text.trim().toLowerCase();

    if (!bjGames[userId] || input === "start") {
        const dc = shuffle(deck());
        const hand = [dc.pop(), dc.pop()];
        const dealerHand = [dc.pop(), dc.pop()];
        bjGames[userId] = {deck: dc, hand, dealerHand};

        const total = handTotal(hand);
        if (total === 21) {
            delete bjGames[userId];
            await respond(`Blackjack! You win! Your hand: ${formatHand(hand)}. Dealer's hand: ${formatHand(dealerHand)}.`);
            return;
        }

        await respond({
            response_type: 'ephemeral',
            text: `Game started! Your hand: ${formatHand(hand)} (Total: ${total}). Dealer's hand: ${formatHand(dealerHand, true)}. Type "/sv-blackjack hit" to draw another card or "/sv-blackjack stand" to hold.`
        });
        return;
    }

    const game = bjGames[userId];
    if (!game) {
        await respond("Type /sv-blackjack start to start a new game.");
        return;
    }

    if (input === "hit") {
        game.hand.push(game.deck.pop());
        const total = handTotal(game.hand);

        if (total > 21) {
            const dealerTotal = handTotal(game.dealerHand);
            const playerHandText = formatHand(game.hand);
            const dealerHandText = formatHand(game.dealerHand);
            delete bjGames[userId];
            await respond(`Bust! You lose. Your hand: ${playerHandText} (Total: ${total}). Dealer's hand: ${dealerHandText} (Total: ${dealerTotal}). Type /sv-blackjack start to play again.`);
            return;
        }

        await respond({
            response_type: 'ephemeral',
            text: `You drew a card. Your hand: ${formatHand(game.hand)} (Total: ${total}). Type "/sv-blackjack hit" to draw again or "/sv-blackjack stand" to hold.`
        });
        return;
    }

    if (input === "stand") {
        while (handTotal(game.dealerHand) < 17) {
            game.dealerHand.push(game.deck.pop());
        }

        const plrTtl = handTotal(game.hand);
        const dlrTtl = handTotal(game.dealerHand);
        let resultText;

        if (dlrTtl > 21 || plrTtl > dlrTtl) {
            resultText = `You win! Your hand: ${formatHand(game.hand)} (Total: ${plrTtl}). Dealer's hand: ${formatHand(game.dealerHand)} (Total: ${dlrTtl}).`;
        } else if (plrTtl === dlrTtl) {
            resultText = `It's a tie! Your hand: ${formatHand(game.hand)} (Total: ${plrTtl}). Dealer's hand: ${formatHand(game.dealerHand)} (Total: ${dlrTtl}).`;
        } else {
            resultText = `You lose! Your hand: ${formatHand(game.hand)} (Total: ${plrTtl}). Dealer's hand: ${formatHand(game.dealerHand)} (Total: ${dlrTtl}).`;
        }

        const finalText = `Final hands: Dealer: ${formatHand(game.dealerHand)} (Total: ${dlrTtl}), You: ${formatHand(game.hand)} (Total: ${plrTtl}). Type /sv-blackjack start to play again.`;
        delete bjGames[userId];
        await respond(`${resultText} ${finalText}`);
        return;
    }

    await respond("Type /sv-blackjack start to start a new game.");
});

