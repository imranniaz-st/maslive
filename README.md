# maslive

Security dashboard workspace with a Node/Express API, React/Vite dashboard, Postgres storage, and configurable command-line security tools.

## Windows setup

Install Node.js 22 LTS or newer, then run:

```powershell
pnpm run setup:windows
```

The setup script enables Corepack/pnpm, creates `.env` from `.env.example`, and installs dependencies.

Edit `.env` before starting the app:

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/maslive
API_PORT=8080
DASHBOARD_PORT=8081
MSFCONSOLE_PATH=msfconsole
NMAP_PATH=nmap
NIKTO_PATH=nikto
```

Use full executable paths when tools are not in `PATH`, for example:

```dotenv
MSFCONSOLE_PATH=C:\metasploit-framework\bin\msfconsole.bat
NMAP_PATH=C:\Program Files (x86)\Nmap\nmap.exe
```

## Local development

Start the API and dashboard in separate PowerShell windows:

```powershell
pnpm run dev:windows
```

Default local URLs:

- API: `http://localhost:8080/api/healthz`
- Dashboard: `http://localhost:8081`

Push the database schema after `DATABASE_URL` is configured:

```powershell
pnpm --filter @workspace/db run push
```

The API seeds built-in tool records for Nmap, Nikto, and Metasploit Console from `.env` on startup. You can still add or update tools in the dashboard.

## Live server

Build the dashboard and API:

```powershell
pnpm run build:live
```

Start the single live server:

```powershell
pnpm run start:live
```

The API listens on `API_PORT` or `PORT` and serves:

- `/api/*` for backend routes
- the built dashboard for browser routes

Set these on your live host:

```dotenv
NODE_ENV=production
PORT=8080
BASE_PATH=/
DATABASE_URL=postgresql://user:password@host:5432/maslive
MSFCONSOLE_PATH=/usr/bin/msfconsole
NMAP_PATH=/usr/bin/nmap
NIKTO_PATH=/usr/bin/nikto
SCAN_TIMEOUT_MS=60000
```

Only run scans against systems you own or are explicitly authorized to test.
