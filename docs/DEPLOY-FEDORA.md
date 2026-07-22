# Deploy Shelf on a Fedora home server

The app is Node/React — it runs on Fedora without OS-specific code changes.  
What you *do* need for “always on for the house” is a **production start** that listens on the LAN (not only localhost).

## One-time setup on Fedora

```bash
# Node 20+ (example via NodeSource or Fedora modules)
sudo dnf install -y nodejs npm git

cd /opt   # or ~/apps, etc.
git clone <your-repo-url> movie-collection
cd movie-collection
npm install
npm run build
```

Copy `.env` if you use TMDb cover fetching (`TMDB_API_KEY=...`).  
Keep `Master Film List.xlsx` and `public/covers/` on the server (or commit them).

## Run for the household

```bash
npm start
```

This serves the built site **and** the save API on one port (default **3080**), bound to **0.0.0.0** so phones/PCs on your LAN can connect:

```text
http://<fedora-lan-ip>:3080/
```

Find the IP with `ip a` (look for something like `192.168.x.x`).

### Firewall

```bash
sudo firewall-cmd --permanent --add-port=3080/tcp
sudo firewall-cmd --reload
```

### Optional environment variables

| Variable | Default (production) | Meaning |
| --- | --- | --- |
| `SHELF_HOST` | `0.0.0.0` | Bind address |
| `SHELF_PORT` | `3080` | HTTP port |
| `NODE_ENV` | set by `npm start` | Enables static `dist/` serving |

Example:

```bash
SHELF_PORT=8080 npm start
```

## systemd (survive reboots)

Create `/etc/systemd/system/shelf.service`:

```ini
[Unit]
Description=Shelf physical media library
After=network.target

[Service]
Type=simple
User=YOUR_USER
WorkingDirectory=/opt/movie-collection
Environment=NODE_ENV=production
Environment=SHELF_HOST=0.0.0.0
Environment=SHELF_PORT=3080
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now shelf
sudo systemctl status shelf
```

After pulling code updates:

```bash
cd /opt/movie-collection
git pull
npm install
npm run build
sudo systemctl restart shelf
```

## Local Mac development (unchanged)

```bash
npm run dev
```

Still uses Vite on `127.0.0.1:5173` + API on `5188`.

## Notes

- **Paths** in the app are portable (no macOS Desktop dependency).
- **Moods** stay in each browser’s `localStorage` (not shared across phones unless you use the same browser profile).
- **Covers** must exist under `public/covers/` before `npm run build` (they are copied into `dist/`).
- Case-sensitive filesystem on Fedora is fine with the current filenames.
