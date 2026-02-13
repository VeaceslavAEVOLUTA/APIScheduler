# APIScheduler

Piattaforma web multi-tenant per schedulare chiamate API, monitorare servizi, gestire notifiche e pubblicare una status page per ogni workspace.

## Stack
- **Backend**: Node.js + Fastify + Prisma + PostgreSQL + Redis/BullMQ
- **Frontend**: Next.js (App Router) + Tailwind
- **Auth**: email + password (JWT)
- **Notifiche**: Email (SMTP), Slack/Discord/Teams/Webhook

## Architettura (alto livello)
- **API**: `apps/api` espone REST JSON su `http://localhost:4000`
- **Web**: `apps/web` è la UI su `http://localhost:3000`
- **DB**: Postgres
- **Queue/Worker**: Redis + BullMQ (scheduler + monitor)

## Funzionalità principali
- Multi-workspace con ruoli (OWNER/ADMIN/EDITOR/VIEWER)
- Inviti utenti e accettazione via link
- API Requests in stile Postman (con esecuzione “one-shot”)
- Pianificazioni (CRON/INTERVAL/ONE_SHOT)
- Monitor (HTTP/PING/TCP/TLS)
- Notifiche (Email, Slack, Discord, Teams, Webhook)
- Logs con storico e dettagli risposta
- Status page pubblica per workspace
- Finestra oraria attiva per monitor e schedule

## Ambiente
### Prerequisiti
- Node.js 20+ (consigliato)
- Docker Desktop
- PostgreSQL e Redis (via Docker)

### Struttura
```
apps/
  api/
  web/
```

## Configurazione
Copia `.env.example` in `.env` e compila i valori:

```
NODE_ENV=development
APP_NAME=APIScheduler
APP_URL=http://localhost:3000
API_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:4000

API_PORT=4000
LOG_LEVEL=info
DISABLE_REQUEST_LOGGING=false
DEFAULT_TIMEZONE=Europe/Rome
JWT_SECRET=change_me
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/apischeduler?schema=public
REDIS_URL=redis://localhost:6379
QUEUE_WORKER=true

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=APIScheduler <no-reply@localhost>

ADMIN_EMAIL=admin@admin.it
ADMIN_PASSWORD=qwerty123
ADMIN_NAME=Slavic
```

> `QUEUE_WORKER=true` avvia anche il worker per schedulazioni/monitor.

### SMTP (Amazon SES)
Esempio:
```
SMTP_HOST=email-smtp.eu-central-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=AKIA...
SMTP_PASS=...
SMTP_FROM=support@aevoluta.com
```
Assicurati che il dominio sia verificato su SES. Se sei in sandbox, puoi inviare solo a destinatari verificati.

## Avvio in sviluppo
1) Avvia DB + Redis
```
docker compose up -d db redis
```

2) Installa dipendenze
```
npm install
```

3) Migrazioni Prisma
```
npx prisma migrate dev --schema apps/api/prisma/schema.prisma
```

4) Avvia backend
```
npm --workspace apps/api run dev
```

5) Avvia frontend
```
npm --workspace apps/web run dev
```

Frontend: http://localhost:3000
Backend: http://localhost:4000
Swagger: http://localhost:4000/docs

## Avvio in produzione (Docker)
### Build
```
docker compose -f docker-compose.yml build
```

### Run
```
docker compose -f docker-compose.yml up -d
```

Assicurati di avere un `.env` con variabili corrette per prod (DB, Redis, JWT, SMTP, APP_URL, ecc.).

## Migrazioni in produzione
- Genera le migration in locale con Prisma.
- Applica in prod con:
```
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
```

## Status page pubblica
Ogni workspace può pubblicare una pagina:
```
http://APP_URL/status/<workspace-slug>
```
La visibilità si gestisce dal pannello Workspace (toggle “Status pubblico”).

## Finestra oraria attiva
Monitor e pianificazioni possono essere limitati ad una fascia oraria:
- `Attivo da` e `Attivo fino a` (HH:mm)
- `Timezone` (es. `Europe/Rome`)

Se la finestra è impostata, fuori orario la run viene segnata come `CANCELED` con errore `Outside active window`.

## Inviti utenti
- Gli inviti generano un token e inviano email con link:
```
APP_URL/invite?token=...
```
- La pagina invita l’utente a impostare una password e accettare l’invito.

## Notifiche
- Configura canali in `Notifiche`
- Gli alert vengono inviati su fallimento e (opzionale) recupero

## Troubleshooting
- **Nessun log pianificazioni/monitor**: controlla `QUEUE_WORKER=true` e Redis attivo.
- **Molti log HTTP**: imposta `DISABLE_REQUEST_LOGGING=true` o `LOG_LEVEL=warn`.
- **Status page 404**: workspace non pubblico o slug errato.
- **Reset DB**: se Prisma segnala drift, serve reset o riallineamento.

## Backup / Restore
### Backup rapido (PostgreSQL)
```
pg_dump -h localhost -U postgres -d apischeduler > apischeduler_backup.sql
```

### Restore rapido
```
psql -h localhost -U postgres -d apischeduler < apischeduler_backup.sql
```

Se usi Docker, puoi eseguire i comandi dentro il container `db`:
```
docker exec -i apischeduler-db pg_dump -U postgres -d apischeduler > apischeduler_backup.sql
docker exec -i apischeduler-db psql -U postgres -d apischeduler < apischeduler_backup.sql
```

## Security checklist
- **JWT_SECRET**: usa un valore lungo e casuale (non lasciare `change_me`).
- **CORS**: in produzione restringi `origin` al dominio reale.
- **LOG_LEVEL**: in produzione usa `warn` o `error`.
- **SMTP**: non committare credenziali, usa variabili d’ambiente.
- **DB**: usa password forte e rete privata.
- **Queue/Redis**: non esporre Redis su internet senza auth.
- **Rate limiting**: aggiungi rate-limit su login e inviti (consigliato).
- **TLS**: usa HTTPS per la Web e per l’API.

## Deploy su VPS con Nginx (esempio)
### 1) DNS
Punta il dominio al tuo server (A record).

### 2) Nginx (reverse proxy)
Esempio `/etc/nginx/sites-available/apischeduler`:
```
server {
  listen 80;
  server_name api.example.com;

  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}

server {
  listen 80;
  server_name app.example.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```
Abilita e riavvia:
```
sudo ln -s /etc/nginx/sites-available/apischeduler /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3) HTTPS (Let’s Encrypt)
```
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.example.com -d app.example.com
```

### 4) Variabili d’ambiente in prod
Aggiorna il `.env` con i tuoi domini:
```
APP_URL=https://app.example.com
API_URL=https://api.example.com
NEXT_PUBLIC_API_URL=https://api.example.com
```

## Licenza
Uso interno / personalizzato. Aggiorna secondo necessità.

## Backup / Restore
### Backup rapido (PostgreSQL)
```
pg_dump -h localhost -U postgres -d apischeduler > apischeduler_backup.sql
```

### Restore rapido
```
psql -h localhost -U postgres -d apischeduler < apischeduler_backup.sql
```

Se usi Docker, puoi eseguire i comandi dentro il container `db`:
```
docker exec -i apischeduler-db pg_dump -U postgres -d apischeduler > apischeduler_backup.sql
docker exec -i apischeduler-db psql -U postgres -d apischeduler < apischeduler_backup.sql
```

## Security checklist
- **JWT_SECRET**: usa un valore lungo e casuale (non lasciare `change_me`).
- **CORS**: in produzione restringi `CORS_ORIGIN` al dominio reale.
- **RATE_LIMIT**: abilita il rate-limit per proteggere login/inviti.
- **LOG_LEVEL**: in produzione usa `warn` o `error`.
- **SMTP**: non committare credenziali, usa variabili d’ambiente.
- **DB**: usa password forte e rete privata.
- **Queue/Redis**: non esporre Redis su internet senza auth.
- **TLS**: usa HTTPS per la Web e per l’API.

## Deploy su VPS con Nginx (esempio)
### 1) DNS
Punta il dominio al tuo server (A record).

### 2) Nginx (reverse proxy)
Esempio `/etc/nginx/sites-available/apischeduler`:
```
server {
  listen 80;
  server_name api.example.com;

  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}

server {
  listen 80;
  server_name app.example.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```
Abilita e riavvia:
```
sudo ln -s /etc/nginx/sites-available/apischeduler /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3) HTTPS (Let’s Encrypt)
```
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.example.com -d app.example.com
```

### 4) Variabili d’ambiente in prod
Aggiorna il `.env` con i tuoi domini:
```
APP_URL=https://app.example.com
API_URL=https://api.example.com
NEXT_PUBLIC_API_URL=https://api.example.com
```

## Produzione con Docker Compose
Usa il file `docker-compose.prod.yml`:
```
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

Assicurati che `.env` contenga:
```
CORS_ORIGIN=https://app.example.com
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=300
RATE_LIMIT_WINDOW=1 minute
TRUST_PROXY=true
```

## Produzione con Docker Compose
Usa il file `docker-compose.prod.yml`:
```
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

## Docker Compose per sviluppo (override)
Il file `docker-compose.override.yml` permette hot‑reload montando `apps/api` e `apps/web`:
```
docker compose up -d db redis
npm --workspace apps/api run dev
npm --workspace apps/web run dev
```

## Nginx config pronta
File: `deploy/nginx/apischeduler.conf`
- Modifica `server_name` con i tuoi domini.
- Copia in `/etc/nginx/sites-available/` e abilita con `sites-enabled`.

## Backup automatico (script)
- Linux/macOS: `scripts/backup_db.sh`
- Windows: `scripts/backup_db.bat`

Esempio:
```
# Linux/macOS
DB_NAME=apischeduler DB_USER=postgres DB_HOST=localhost BACKUP_DIR=./backups ./scripts/backup_db.sh

# Windows (PowerShell)
$env:DB_NAME="apischeduler"; $env:DB_USER="postgres"; $env:DB_HOST="localhost"; $env:BACKUP_DIR="backups"; cmd /c scripts\backup_db.bat
```

Puoi schedularli con cron/Task Scheduler.

## Produzione con Docker Compose
Usa il file `docker-compose.prod.yml`:
```
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

## Docker Compose per sviluppo (override)
Il file `docker-compose.override.yml` permette hot-reload montando `apps/api` e `apps/web`:
```
docker compose up -d db redis
npm --workspace apps/api run dev
npm --workspace apps/web run dev
```

## Nginx config pronta
File: `deploy/nginx/apischeduler.conf`
- Modifica `server_name` con i tuoi domini.
- Copia in `/etc/nginx/sites-available/` e abilita con `sites-enabled`.

## Backup automatico (script)
- Linux/macOS: `scripts/backup_db.sh`
- Windows: `scripts/backup_db.bat`

Esempio:
```
# Linux/macOS
DB_NAME=apischeduler DB_USER=postgres DB_HOST=localhost BACKUP_DIR=./backups ./scripts/backup_db.sh

# Windows (PowerShell)
$env:DB_NAME="apischeduler"; $env:DB_USER="postgres"; $env:DB_HOST="localhost"; $env:BACKUP_DIR="backups"; cmd /c scripts\backup_db.bat
```

## Restore database (script)
- Linux/macOS: `scripts/restore_db.sh`
- Windows: `scripts/restore_db.bat`

Esempio:
```
# Linux/macOS
DB_NAME=apischeduler DB_USER=postgres DB_HOST=localhost ./scripts/restore_db.sh ./backups/apischeduler_YYYYMMDD_HHMMSS.sql

# Windows (PowerShell)
$env:DB_NAME="apischeduler"; $env:DB_USER="postgres"; $env:DB_HOST="localhost"; cmd /c scripts\restore_db.bat backups\apischeduler_YYYYMMDD_HHMMSS.sql
```

## Produzione (.env)
Usa il file `.env.production.example` come base.

Assicurati che `.env` contenga:
```
CORS_ORIGIN=https://app.example.com
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=300
RATE_LIMIT_WINDOW=1 minute
TRUST_PROXY=true
```
