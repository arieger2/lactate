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
