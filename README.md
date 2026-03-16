# thinkmtb-order

Team MTB jersey/gear ordering system built with Next.js, SQLite (better-sqlite3), and Tailwind CSS.

---

## Production Server

The app runs on port **3001** (internal), with Nginx proxying from port **3000** to the app.

### Start / Manage with PM2

PM2 keeps the app running and automatically restarts it if it crashes.

```bash
# Start the app (first time, or after a fresh clone)
npm run build
pm2 start ecosystem.config.js

# Save the process list so PM2 restores it on reboot
pm2 save

# Common commands
pm2 list                    # Show all processes and their status
pm2 logs thinkmtb-order     # Tail live logs
pm2 restart thinkmtb-order  # Restart the app
pm2 stop thinkmtb-order     # Stop the app
pm2 delete thinkmtb-order   # Remove from PM2
```

### Deploy an update

```bash
git pull
npm run build
pm2 restart thinkmtb-order
pm2 save
```

### Auto-start on reboot (macOS launchd)

PM2 is registered as a launchd service named `com.PM2`.  
The saved process list at `~/.pm2/dump.pm2` is restored automatically on login.

To regenerate the startup hook after a Node.js upgrade:

```bash
pm2 unstartup launchd
pm2 startup
# Run the sudo command it prints, then:
pm2 save
```

### Nginx config

The Nginx config is at `nginx-thinkmtb.conf`.  
Nginx listens on port 3000 (or 443 for HTTPS) and proxies to `http://localhost:3001`.

---

## Development

```bash
npm install
npm run dev      # runs on http://localhost:3000
```

---

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [Tailwind CSS v4](https://tailwindcss.com)
- [PM2](https://pm2.keymetrics.io) — process manager / auto-recovery
