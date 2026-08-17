\# 🤖 AI Project Assistant



A simple AI assistant that works with \*\*Obsidian\*\* and a local backend.



\## 📌 Requirements



\* 🐍 Python

\* 📝 Obsidian

\* ☁️ Cloudflare Tunnel

\* 💻 AI Project Assistant



\---



\## 🚀 How to Run



\### 1️⃣ Open the Project



Open \*\*PowerShell\*\* and go to the project folder:



```powershell

cd path\\to\\AI-Project-Assistant

```



\---



\### 2️⃣ Start the Backend



Run the backend application.



```powershell

python <backend-file>.py

```



✅ Backend should run on:



```text

http://127.0.0.1:27123

```



\*\*Keep this terminal open.\*\*



\---



\### 3️⃣ Open Obsidian



📝 Open \*\*Obsidian\*\*.



➡️ Open the vault used by the project.



\*\*Keep Obsidian open while using the assistant.\*\*



\---



\### 4️⃣ Start Cloudflare Tunnel



☁️ Open a \*\*new PowerShell window\*\* and run:



```powershell

\& "C:\\Program Files (x86)\\cloudflared\\cloudflared.exe" tunnel --url http://127.0.0.1:27123

```



You will get a URL similar to:



```text

https://xxxxx.trycloudflare.com

```



📋 Copy this URL when the project needs a public backend URL.



\*\*Keep this terminal open.\*\*



\---



\## 🔄 Running Setup



When everything is running:



```text

📝 Obsidian

&#x20;    ↓

🤖 AI Project Assistant

&#x20;    ↓

💻 Backend :27123

&#x20;    ↓

☁️ Cloudflare Tunnel

&#x20;    ↓

🌐 Public URL

```



\---



\## 🧪 Quick Check



Before using the assistant, make sure:



\* ✅ Backend is running

\* ✅ Backend uses port `27123`

\* ✅ Obsidian is open

\* ✅ Cloudflare Tunnel is running if external access is needed

\* ✅ Cloudflare URL is copied correctly



\---



\## 🛑 How to Stop



When finished:



```text

1\. Stop Backend       → Ctrl + C

2\. Stop Cloudflare    → Ctrl + C

3\. Close Obsidian     → Optional

```



⚠️ \*\*Do not stop Cloudflare Tunnel while you are still using the public URL.\*\*



\---



\## 🔐 Important



\* 🔑 Never share API keys or secrets.

\* 🚫 Do not commit `.env` files containing secrets.

\* ☁️ The `trycloudflare.com` URL is temporary.

\* 🔄 If the tunnel restarts, you may receive a new URL.



\---



\## ⭐ Quick Start



```text

1️⃣ Start Backend

&#x20;     ↓

2️⃣ Open Obsidian

&#x20;     ↓

3️⃣ Start Cloudflare Tunnel

&#x20;     ↓

4️⃣ Copy Cloudflare URL

&#x20;     ↓

5️⃣ Use the AI Project Assistant 🚀

```



