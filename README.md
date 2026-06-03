# SETUP

1. Clone repo
2. Run`npm install`
3. Create a `.env` with `SLACK_BOT_TOKEN=` `SLACK_APP_TOKEN=` `OPENAI_API_KEY=`
4. Run `node index.js`

## HOSTING

Hosted on hackclub's Linux server "Nest" via systemd. Restarts with `systemctl restart slackbot`


### Utility
- `/sv-ping` — Check the bot's latency.
- `/sv-help` — Display this help message.
- `/sv-whatdoisay [style]` — Suggest a reply to recent channel messages.

### Informative
- `/sv-weekly-headline` — Get a top headline from this week.
- `/sv-math [question]` — Solve a math problem step by step.

### All about ALS
- `/sv-als-stats` — Get current statistics on ALS.
- `/sv-als-research` — Get recent news on ALS research.
- `/sv-als-donate` — Find reputable organizations to donate to for ALS research.

### Games
- `/sv-joke` — Get a random joke.
- `/sv-blackjack [start|hit|stand]` — Play a game of blackjack.
