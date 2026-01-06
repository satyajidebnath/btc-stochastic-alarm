// Node 18+ has fetch built-in — no node-fetch needed

// ====== CONFIG ======
const SYMBOL = "BTCUSDT";
const INTERVAL = "5m";
const STOCH_PERIOD = 14;
const K_SMOOTH = 3;
const STOCH_LIMIT = 15;

// Telegram (SET THESE AS ENV VARS)
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// ====================

async function getKlines() {
  const url = `https://api.binance.com/api/v3/klines?symbol=${SYMBOL}&interval=${INTERVAL}&limit=50`;
  const res = await fetch(url);
  return res.json();
}

function calculateStochastic(closes, highs, lows) {
  let kValues = [];

  for (let i = STOCH_PERIOD - 1; i < closes.length; i++) {
    const low = Math.min(...lows.slice(i - STOCH_PERIOD + 1, i + 1));
    const high = Math.max(...highs.slice(i - STOCH_PERIOD + 1, i + 1));

    const k = ((closes[i] - low) / (high - low)) * 100;
    kValues.push(k);
  }

  return (
    kValues.slice(-K_SMOOTH).reduce((a, b) => a + b, 0) / K_SMOOTH
  );
}

async function sendTelegram(message) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: message,
      parse_mode: "Markdown"
    })
  });
}

async function run() {
  const klines = await getKlines();

  const closes = klines.map(k => Number(k[4]));
  const highs = klines.map(k => Number(k[2]));
  const lows = klines.map(k => Number(k[3]));

  const stochK = calculateStochastic(closes, highs, lows);
  const price = closes.at(-1);

  console.log("Stochastic:", stochK.toFixed(2));

  if (stochK < STOCH_LIMIT) {
    await sendTelegram(
`🚨 *BTC STOCH ALERT* 🚨

📉 Stochastic: *${stochK.toFixed(2)}*
⏱ Timeframe: *${INTERVAL}*
💰 Price: *$${price}*

⚠️ Stochastic BELOW ${STOCH_LIMIT}`
    );
  }
}

run().catch(console.error);
