function deck() {
    const suits = ['♠','♥','♦','♣'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    return suits.flatMap(s => values.map(v => ({suit: s, value: v})));
}

function shuffle(d) {
    for (let i = d.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
}

function cardValue(card) {
    if (['J', 'Q', 'K'].includes(card.value)) return 10;
    if (card.value === 'A') return 11;
    return parseInt(card.value);
}

function handTotal(hand) {
    let total = hand.reduce((sum, c) => sum + cardValue(c), 0);
    let aces = hand.filter(c => c.value === 'A').length;
    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }
    return total;
}

function formatHand(hand, hideSecond = false) {
    return hand.map((c, i) => hideSecond && i === 1 ? '??' : `${c.value}${c.suit}`).join(' ');
}

const bjGames = {};

module.exports = {bjGames, deck, shuffle, cardValue, handTotal, formatHand};