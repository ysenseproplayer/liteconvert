# LiteConvert — Premium Converter Hub

A full-stack Node.js + MySQL converter hub featuring **31 popular tools** across Developer, Design, Text, and Math categories, with a built-in Admin CMS panel.

## Features
- 🛠 31 converter tools (JSON↔YAML, PX↔REM, Base64, Hash, UUID, Cron, etc.)
- 🎨 Premium dark glassmorphism UI
- 🗄 MySQL-backed tool config, SEO metadata, and FAQs
- 🔐 Admin CMS panel — toggle tools, edit descriptions, manage FAQs
- 📊 Usage analytics per tool
- ⚡ Graceful DB fallback with visual setup guide

## Stack
- **Backend:** Node.js, Express.js, EJS templates
- **Database:** MySQL (via mysql2)
- **Auth:** bcryptjs + express-session
- **Frontend:** Vanilla CSS (glassmorphism dark theme)

## Local Setup
1. Clone the repo
2. Run `npm install`
3. Create a MySQL database named `liteconvert`
4. Import `schema.sql`: `mysql -u root -p liteconvert < schema.sql`
5. Copy `.env.example` to `.env` and fill in your DB credentials
6. Run `node reset-admin.js` to create the default admin account
7. Start with `npm start` and visit `http://localhost:3000`

## Admin Panel
- URL: `/admin/login`
- Default credentials: **admin / admin123** *(change after first login)*

## Deploy on Render
1. Push this repo to GitHub
2. Create a new **Web Service** on [render.com](https://render.com)
3. Connect your GitHub repo
4. Add the environment variables (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, SESSION_SECRET)
5. Render auto-deploys on every push

## Environment Variables
| Variable | Description |
|---|---|
| `PORT` | Server port (auto-set by Render) |
| `DB_HOST` | MySQL host |
| `DB_USER` | MySQL username |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | MySQL database name |
| `SESSION_SECRET` | Secret for session encryption |
