const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, Browsers, delay, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const app = express();
const port = process.env.PORT || 10000;

app.get("/", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Healing Heart Bot - Official Pairing</title>
            <style>
                body { font-family: -apple-system, sans-serif; background-color: #fff5f5; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .card { text-align: center; width: 100%; max-width: 350px; padding: 35px; background: white; border-radius: 30px; box-shadow: 0 15px 35px rgba(255,100,100,0.15); }
                .logo { width: 90px; height: 90px; background: #ff4d4d; border-radius: 50%; margin: 0 auto 25px; display: flex; align-items: center; justify-content: center; color: white; font-size: 45px; box-shadow: 0 8px 20px rgba(255,77,77,0.3); }
                h1 { font-size: 26px; margin-bottom: 8px; color: #222; font-weight: 800; }
                p { color: #777; font-size: 15px; margin-bottom: 35px; }
                input { width: 100%; padding: 18px; margin-bottom: 25px; border: 2px solid #f0f0f0; border-radius: 18px; font-size: 16px; box-sizing: border-box; outline: none; transition: 0.3s; background: #fafafa; }
                input:focus { border-color: #ff4d4d; background: #fff; }
                .btn { width: 100%; padding: 18px; background-color: #ff4d4d; color: white; border: none; border-radius: 18px; font-weight: 700; cursor: pointer; font-size: 17px; transition: 0.4s; }
                .btn:hover { background-color: #e63939; transform: translateY(-2px); }
                .footer { margin-top: 45px; font-size: 13px; color: #aaa; font-weight: 500; }
                .footer span { color: #ff4d4d; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="logo">❤️</div>
                <h1>Healing Heart Bot</h1>
                <p>Official Pairing Gateway</p>
                <input type="text" id="number" placeholder="2348153729342">
                <button class="btn" onclick="generateCode()">Get Pairing Code</button>
                <div class="footer">Built for <span>Healing Heart Bot</span> Owner</div>
            </div>
            <script>
                function generateCode() {
                    const num = document.getElementById('number').value;
                    if(!num) return alert('Please enter your phone number!');
                    window.location.href = '/code?number=' + num;
                }
            </script>
        </body>
        </html>
    `);
});

app.get("/code", async (req, res) => {
    let num = req.query.number;
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: Browsers.macOS("Desktop")
    });

    // Forces the connection to "stick" on the server side
    sock.ev.on('creds.update', saveCreds);

    try {
        await delay(2500);
        let code = await sock.requestPairingCode(num);
        res.send("<body style='font-family: Arial; text-align: center; padding-top: 100px; background: #fff5f5;'><div style='background: white; display: inline-block; padding: 50px; border-radius: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.05);'><h2 style='color: #ff4d4d;'>❤️ YOUR CODE IS READY</h2><h1 style='font-size: 55px; color: #222; letter-spacing: 12px; margin: 25px 0;'>" + code + "</h1><p style='color: #888;'>Enter this in WhatsApp > Linked Devices.<br>Keep this page open until linked.</p><button onclick='window.history.back()' style='margin-top:30px; padding: 12px 30px; border-radius: 12px; border: 2px solid #ff4d4d; background: white; color: #ff4d4d; font-weight: bold; cursor: pointer;'>Try Again</button></div></body>");
    } catch (err) {
        res.send("<h2 style='font-family:sans-serif; text-align:center; padding-top:50px;'>Error. Please refresh the page and try again.</h2>");
    }
});

app.listen(port, () => console.log("Healing Heart Server active on port " + port));
