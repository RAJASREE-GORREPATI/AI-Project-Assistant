# 🤖 AI Project Assistant

A simple AI assistant that works with **Obsidian** and a local backend.

## 📌 Requirements

* 🐍 Python
* 📝 Obsidian
* ☁️ Cloudflare Tunnel
* 💻 AI Project Assistant

---

## 🚀 How to Run

### 1️⃣ Open the Project

Open **PowerShell** and go to the project folder:

```powershell
cd path\to\AI-Project-Assistant
```

---

### 2️⃣ Start the Backend

Run the backend application:

```powershell
python <backend-file>.py
```

✅ Backend should run on:

```text
http://127.0.0.1:27123
```

💡 **Keep this terminal open.**

---

### 3️⃣ Open Obsidian

📝 Open **Obsidian**.

➡️ Open the vault used by the project.

💡 **Keep Obsidian open while using the assistant.**

---

### 4️⃣ Start Cloudflare Tunnel

☁️ Open a **new PowerShell window** and run:

```powershell
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://127.0.0.1:27123
```

You will get a URL similar to:

```text
https://xxxxx.trycloudflare.com
```

📋 Copy this URL when the project needs a public backend URL.

💡 **Keep this terminal open.**

---

## 🔄 Running Setup

Once everything is running:

```text
📝 Obsidian
     ↓
🤖 AI Project Assistant
     ↓
💻 Local Backend
     ↓
☁️ Cloudflare Tunnel
     ↓
🌐 Public URL
```

---

## 🧪 Quick Check

Before using the assistant, make sure:

* ✅ Backend is running
* ✅ Backend is using port `27123`
* ✅ Obsidian is open
* ✅ Cloudflare Tunnel is running
* ✅ Cloudflare URL is available

---

## 🛑 How to Stop

When you are finished:

1. Stop the **Backend** → `Ctrl + C`
2. Stop **Cloudflare Tunnel** → `Ctrl + C`
3. Close **Obsidian** → Optional

⚠️ **Do not stop Cloudflare Tunnel while you are using the public URL.**

---

## 🔐 Important

* 🔑 Never commit API keys or passwords.
* 🚫 Do not commit `.env` files containing secrets.
* ☁️ The `trycloudflare.com` URL is temporary.
* 🔄 Restarting the tunnel may generate a new URL.

---

## ⭐ Quick Start

```text
1️⃣ Start Backend
       ↓
2️⃣ Open Obsidian
       ↓
3️⃣ Start Cloudflare Tunnel
       ↓
4️⃣ Copy Cloudflare URL
       ↓
5️⃣ Use AI Project Assistant 🚀
```
