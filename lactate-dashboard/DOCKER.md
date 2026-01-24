# Lactate Dashboard - Docker Deployment

## Quick Start

1. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` file with your credentials:**
   ```bash
   nano .env
   ```

3. **Start the application:**
   ```bash
   docker-compose up -d
   ```

4. **Access the application:**
   - Dashboard: http://localhost:3000
   - PostgreSQL: localhost:5432

## Configuration

### Environment Variables

All configuration is managed through the `.env` file:

- **Database Settings:**
  - `POSTGRES_DB` - Database name (default: laktat)
  - `POSTGRES_USER` - Database user (default: postgres)
  - `POSTGRES_PASSWORD` - Database password
  - `POSTGRES_PORT` - Database port (default: 5432)

- **Application Settings:**
  - `APP_PORT` - Application port (default: 3000)
  - `NODE_ENV` - Environment mode (production/development)

### Data Persistence

Data is stored in the following local directories:

- `./data/postgres` - PostgreSQL database files
- `./config` - Application configuration (mounted into container)
- `./backups` - Database backups (mounted into container)

## Docker Commands

### Start services:
```bash
docker-compose up -d
```

### Stop services:
```bash
docker-compose down
```

### View logs:
```bash
docker-compose logs -f
```

### View app logs only:
```bash
docker-compose logs -f app
```

### View database logs only:
```bash
docker-compose logs -f postgres
```

### Restart services:
```bash
docker-compose restart
```

### Rebuild and restart:
```bash
docker-compose up -d --build
```

## Database Management

### Access PostgreSQL shell:
```bash
docker-compose exec postgres psql -U postgres -d laktat
```

### Create backup:
```bash
docker-compose exec postgres pg_dump -U postgres laktat > ./backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore backup:
```bash
docker-compose exec -T postgres psql -U postgres -d laktat < ./backups/your_backup.sql
```

### Initialize/Reset database:
The database is automatically initialized on first startup using:
- `db/init.sql` - Database creation
- `db/schema.sql` - Table schemas

## Troubleshooting

### Check service status:
```bash
docker-compose ps
```

### Check if database is healthy:
```bash
docker-compose exec postgres pg_isready -U postgres
```

### Remove all data and start fresh:
```bash
docker-compose down -v
rm -rf ./data/postgres
docker-compose up -d
```

### Update configuration:
1. Edit `config/app.config.json`
2. Restart the application:
   ```bash
   docker-compose restart app
   ```

## Network

Both services run in a dedicated Docker network (`lactate-network`):
- **postgres** - Accessible internally as `postgres:5432`
- **app** - Accessible externally at `localhost:3000`

## Production Deployment

For production deployment:

1. Change default passwords in `.env`
2. Set `NODE_ENV=production`
3. Consider using Docker secrets for sensitive data
4. Set up regular backups
5. Configure SSL for PostgreSQL if needed
6. Use a reverse proxy (nginx/traefik) for HTTPS

## Updating the Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build
```

## File Structure

```
lactate-dashboard/
├── docker-compose.yml          # Docker Compose configuration
├── Dockerfile                  # Application container definition
├── .env                        # Environment variables (create from .env.example)
├── .env.example               # Example environment file
├── server.js                  # Custom server for Docker deployment
├── config/                    # Application configuration (persisted)
│   └── app.config.json       # Main config file
├── data/                     # Data directory (auto-created)
│   └── postgres/            # PostgreSQL data files
├── backups/                 # Backup directory (persisted)
└── db/                      # Database initialization scripts
    ├── init.sql
    └── schema.sql
```

---

## Branch `joel1.0` - Änderungen gegenüber `main`

### 🐳 Docker & CI/CD (NEU)

| Feature | Beschreibung |
|---------|--------------|
| **ghcr.io Integration** | Automatischer Image-Build und Push zu GitHub Container Registry |
| **GitHub Actions Workflow** | `.github/workflows/docker-publish.yml` - Baut bei Git Tags (`v*`) oder manuell |
| **docker-compose.prod.yml** | Für Production-Deployment auf anderen Servern (zieht Image von ghcr.io) |
| **Healthcheck** | App-Container hat jetzt Healthcheck auf `/api/status` |
| **Security** | Hardcoded Passwörter entfernt, PostgreSQL Port nur intern |

### 📊 Trainingszonen (NEU)

| Feature | Beschreibung |
|---------|--------------|
| **3-Zonen Modelle** | Neue 3-Zonen Modelle (3-zones-a, 3-zones-b) zusätzlich zu 5-Zonen |
| **Zone Model Selector** | UI-Komponente zum Wechseln zwischen Zonen-Modellen |
| **Verbesserte Doku** | Ausführliche Dokumentation in `docs/TRAINING_ZONES.md` |

### 📦 Dependencies

| Paket | Änderung |
|-------|----------|
| Next.js | Aktualisiert |
| Diverse | package.json/package-lock.json Updates |

### 🔧 Sonstige Änderungen

- Verbesserte `.dockerignore` (kleinerer Build-Context)
- `.env.example` mit Platzhalter-Passwort statt echtem Passwort
- Performance Curve Orchestrator Verbesserungen
- Dokumentations-Updates

### 📋 Commit-Historie

```
be0fd01 fix: Security improvements and workflow optimization
bb15505 test: Verify ghcr.io workflow
0274fcd fix: Move workflow to repo root and update build context path
d074db7 feat: Add ghcr.io Docker publishing workflow
54b31a9 dockerImages Folder
ae51c45 prod
fe39c24 updated next
05c8f8d doku
872205f zonen 3 - 5
71e1c1d toch enableling of zone sliders
```

### 🚀 ghcr.io Deployment (Kurzanleitung)

**Image bauen (automatisch):**
```bash
git tag v1.0.2
git push origin v1.0.2
# → GitHub Actions baut und pusht zu ghcr.io/arieger2/lactate:latest
```

**Auf anderem Server deployen:**
```bash
# 1. Login bei ghcr.io
echo "DEIN_PAT" | docker login ghcr.io -u arieger2 --password-stdin

# 2. Dateien herunterladen
mkdir lactate && cd lactate
curl -O https://raw.githubusercontent.com/arieger2/lactate/joel1.0/lactate-dashboard/docker-compose.prod.yml
curl -O https://raw.githubusercontent.com/arieger2/lactate/joel1.0/lactate-dashboard/.env.example
mkdir -p db
curl -o db/init.sql https://raw.githubusercontent.com/arieger2/lactate/joel1.0/lactate-dashboard/db/init.sql
curl -o db/schema.sql https://raw.githubusercontent.com/arieger2/lactate/joel1.0/lactate-dashboard/db/schema.sql

# 3. Konfigurieren
cp .env.example .env
nano .env  # Passwort ändern!

# 4. Starten
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```
