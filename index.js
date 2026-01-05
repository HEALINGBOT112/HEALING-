const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, Browsers, delay, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require('fs-extra');
const app = express();
const port = process.env.PORT || 3000; // Render provides the port automatically

app.get("/", (req, res) => {
    res.send("Healing Heart Gateway is Live. Use /code?number=yournumber to get a code.");
});

app.get("/code", async (req, res) => {
    let num = req.query.number.replace(/[^0-9]/g, '');
    if (!num) return res.send("Invalid Number");

    // Render files are temporary, so we use a unique path for every request
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
        connectTimeoutMs: 120000, // Longer timeout for Render startup
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection } = update;
        if (connection === 'open') {
            await delay(5000);
            try {
                const credsFile = sessionPath + '/creds.json';
                // Automatically sends the creds.json to your WhatsApp
                await sock.sendMessage(num + "@s.whatsapp.net", { 
                    document: fs.readFileSync(credsFile), 
                    fileName: "creds.json", 
                    mimetype: "application/json",
                    caption: "✅ *HEALING HEART SESSION SUCCESS*\nYour creds.json file is ready."
                });
                console.log("Creds sent to " + num);
            } catch (e) { console.log("Send Error: " + e.message); }
        }
    });

    try {
        await delay(10000); // Wait for Render's network to stabilize
        let code = await sock.requestPairingCode(num);
        res.send("<html><body style='background:#0d1b16;color:white;display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;'><h2>YOUR CODE</h2><h1 style='font-size:60px;letter-spacing:10px;'>" + code + "</h1><p>Enter this in WhatsApp > Linked Devices</p></body></html>");
    } catch (err) {
        res.send("Error: " + err.message);
    }
});

app.listen(port, () => console.log("Server running on port " + port));
