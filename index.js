const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, Browsers, delay, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require('fs-extra');
const app = express();
const port = process.env.PORT || 3000; // Render dynamic port

// 1. FULL DARK-MODE UI
app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Healing Heart - Render Gateway</title>
  <style>
    * { box-sizing: border-box; font-family: system-ui, sans-serif; }
    body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0d1b16; color: #fff; }
    .card { width: 360px; padding: 30px; border-radius: 25px; background: #162a22; border: 1px solid #1f9d55; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .logo { font-size: 50px; margin-bottom: 10px; }
    input { width: 100%; padding: 15px; border-radius: 12px; border: 2px solid #1f9d55; outline: none; font-size: 18px; text-align: center; margin-top: 20px; background: #fff; color: #000; }
    button { width: 100%; margin-top: 15px; padding: 15px; border-radius: 15px; background: #1f9d55; color: #fff; border: none; font-size: 16px; font-weight: bold; cursor: pointer; }
    .info { font-size: 12px; color: #888; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">❤️</div>
    <h1>Healing Heart</h1>
    <p style="color:#1f9d55; font-weight:bold;">Render Public Gateway</p>
    <input type="text" id="phone" placeholder="e.g. 2348153729342">
    <button onclick="startPairing()">🔑 Get Pairing Code</button>
    <p class="info">Your creds.json will be sent to your WhatsApp.</p>
  </div>
  <script>
    function startPairing() {
      const num = document.getElementById("phone").value.trim();
      if (!num) return alert("Please enter your number!");
      window.location.href = '/code?number=' + num;
    }
  </script>
</body>
</html>
    `);
});

// 2. PAIRING & AUTO-SEND LOGIC
app.get("/code", async (req, res) => {
    let num = req.query.number.replace(/[^0-9]/g, '');
    const sessionPath = './sessions/' + num;
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    
    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: Browsers.ubuntu("Chrome"),
        connectTimeoutMs: 120000,
    });

    sock.ev.on('creds.update', saveCreds);

    // Auto-sender when link is successful
    sock.ev.on('connection.update', async (update) => {
        const { connection } = update;
        if (connection === 'open') {
            await delay(5000);
            try {
                const credsFile = sessionPath + '/creds.json';
                await sock.sendMessage(num + "@s.whatsapp.net", { 
                    document: fs.readFileSync(credsFile), 
                    fileName: "creds.json", 
                    mimetype: "application/json",
                    caption: "✅ *SESSION SUCCESS*\n\nYour session file is attached. Use this in your bot dashboard."
                });
            } catch (e) { console.log("Send Error: " + e.message); }
        }
    });

    try {
        await delay(10000); // Allow Render to establish network
        let code = await sock.requestPairingCode(num);
        res.send("<body style='background:#0d1b16; color:white; font-family:sans-serif; display:flex; justify-content:center; align-items:center; height:100vh;'><div style='text-align:center; background:#162a22; padding:50px; border-radius:20px; border:2px solid #1f9d55;'><h2 style='color:#1f9d55;'>YOUR CODE</h2><h1 style='font-size:60px; letter-spacing:10px;'>" + code + "</h1><p>Enter this in WhatsApp > Linked Devices.</p></div></body>");
    } catch (err) {
        res.send("<h2>Server Busy. Please try again.</h2>");
    }
});

app.listen(port, () => console.log("Server running on port " + port));
