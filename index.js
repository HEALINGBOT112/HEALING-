const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, Browsers, delay, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require('fs-extra');
const app = express();
const port = process.env.PORT || 3000;

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
    .card { width: 360px; padding: 30px; border-radius: 25px; background: #162a22; border: 1px solid #1f9d55; text-align: center; }
    input { width: 100%; padding: 15px; border-radius: 12px; border: 2px solid #1f9d55; outline: none; font-size: 18px; text-align: center; margin-top: 20px; background: #fff; color: #000; }
    button { width: 100%; margin-top: 15px; padding: 15px; border-radius: 15px; background: #1f9d55; color: #fff; border: none; font-size: 16px; font-weight: bold; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size: 50px;">❤️</div>
    <h1>Healing Heart</h1>
    <input type="text" id="phone" placeholder="e.g. 2348153729342">
    <button onclick="startPairing()">🔑 Get Pairing Code</button>
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

app.get("/code", async (req, res) => {
    let num = req.query.number.replace(/[^0-9]/g, '');
    const sessionPath = './sessions/' + num;
    let sock = null;

    try {
        // Clear previous session data for this number to prevent 'Busy' errors
        if (fs.existsSync(sessionPath)) { fs.removeSync(sessionPath); }

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        
        sock = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
            },
            printQRInTerminal: false,
            logger: pino({ level: "silent" }),
            browser: Browsers.ubuntu("Chrome"),
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 0,
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection } = update;
            if (connection === 'open') {
                await delay(3000);
                try {
                    const credsFile = sessionPath + '/creds.json';
                    await sock.sendMessage(num + "@s.whatsapp.net", { 
                        document: fs.readFileSync(credsFile), 
                        fileName: "creds.json", 
                        mimetype: "application/json",
                        caption: "✅ *SESSION SUCCESS*"
                    });
                } catch (e) { console.log("Auto-send failed: " + e.message); }
            }
        });

        await delay(7000); // Stable delay for Render environment
        let code = await sock.requestPairingCode(num);
        
        res.send("<body style='background:#0d1b16; color:white; font-family:sans-serif; display:flex; justify-content:center; align-items:center; height:100vh;'><div style='text-align:center; background:#162a22; padding:50px; border-radius:20px; border:2px solid #1f9d55;'><h1 style='font-size:60px; letter-spacing:10px;'>" + code + "</h1><p>Enter in WhatsApp > Linked Devices.</p></div></body>");

    } catch (err) {
        console.log("Internal Error: " + err.message);
        res.send("<h2 style='color:white; text-align:center;'>Server Refreshing... Please go back and try again in 5 seconds.</h2>");
    }
});

app.listen(port, () => console.log("Gateway Active on Render Port " + port));
