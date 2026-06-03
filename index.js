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
        "*Utility*\n" +
        "- `/sv-ping` — Check the bot's latency.\n" +
        "- `/sv-help` — Display this help message.\n" +
        "- `/sv-whatdoisay [style]` — Suggest a reply to recent channel messages.\n\n" +
        "*Informative*\n" +
        "- `/sv-weekly-headline` — Get a top headline from this week.\n" +
        "- `/sv-math [question]` — Solve a math problem step by step.\n\n" +
        "*All About ALS*\n" +
        "- `/sv-als-stats` — Get current statistics on ALS.\n" +
        "- `/sv-als-research` — Get recent news on ALS research.\n" +
        "- `/sv-als-donate` — Find reputable organizations to donate to for ALS research.\n\n" +
        "*Games*\n" +
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

// PLAY BLACKJACK
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

// STATISTICS ON ALS
app.command("/sv-als-stats", async ({command, ack, respond}) => {
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
                messages: [{role: "user", content: "Search the web and Return ONLY the following four lines, no extra text, no explanation, no preamble, newline per statistic: People diagnosed with ALS right now: `[number]` People diagnosed with ALS every year: `[number]` Average lifespan after ALS diagnosis: `[number] years` Deaths by ALS in the past 10 years: `[number]`. Use real statistics. Link to the source you pulled it from."}]
            })
        });
        const data = await response.json();
        await respond(data.choices[0].message.content);
    } catch (error) {
        await respond("Sorry, I couldn't do that right now.");
    }
});

// NEWS ON ALS RESEARCH
app.command("/sv-als-research", async ({command, ack, respond}) => {
    await ack();
    // give me the date and time
    const search_ref_time = new Date().toISOString();
    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini-search-preview",
                messages: [{role: "user", content: `PLAIN TEXT NO BOLDING OR MARKDOWN. RETURN ONLY 3 NEWS ARTICLES. DO NOT DO ANY ** OR * OR STYLING OF TEXT. BARE BONES. Look for 3 pieces of news on ALS research that has been published in the past 6 months from ${search_ref_time}. Return a simplified headline, a one sentence <30 word> summary, and a link to learn more. If you can't find anything, say 'I couldn't find any recent news on ALS research.'`}]
            })
        });
        const data = await response.json();
        await respond(data.choices[0].message.content);
    } catch (error) {
        await respond("Sorry, I couldn't do that right now.");
    }
});

// DONATE TO ALS RESEARCH
app.command("/sv-als-donate", async ({command, ack, respond}) => {
    await ack();
    // give me the date and time
    const search_ref_time = new Date().toISOString();
    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                        model: "gpt-4o-mini-search-preview",
                        messages: [
                            {
                                role: "user",
                                content: `PLAIN TEXT NO BOLDING OR MARKDOWN RETURN ONLY 3 EXAMPLES. DO NOT DO ANY ** OR * OR STYLING OF TEXT. BARE BONES.First, in a new line, say Thank you so much for donating to ALS research and supporting the progression of scientific advancement to save many lives that have been affected by this terrible disoreder. Then, look for reputable organizations that accept donations for ALS research. Return the name of the organization, a one sentence description of their work, and a link to their donation page. If you can't find any reputable organizations, say 'I couldn't find any reputable organizations accepting donations for ALS research. Should not be more than 30 words per line except the first.'`
                            }
                        ]
                    })
        });
        const data = await response.json();
        await respond(data.choices[0].message.content);
    } catch (error) {
        await respond("Sorry, I couldn't do that right now.");
    }
});