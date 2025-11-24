-- Als Datenbankadministrator ausführen:
-- Diese Befehle erteilen die nötigen Berechtigungen für den arieger User

-- 1. Connect als Superuser (postgres) zur laktat Datenbank:
-- psql -h 192.168.5.220 -U postgres -d laktat

-- 2. Erteile CREATE-Berechtigung im public Schema:
GRANT CREATE ON SCHEMA public TO arieger;
GRANT USAGE ON SCHEMA public TO arieger;

-- 3. Erteile alle Berechtigungen für künftige Tabellen:
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO arieger;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO arieger;

-- 4. Erstelle die Tabellen (als Admin oder nach Berechtigung):
\i schema.sql

-- 5. Erteile Berechtigungen auf existierende Tabellen:
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO arieger;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO arieger;

-- 6. Teste die Berechtigungen:
-- \c - arieger  -- Switch zu arieger user
-- SELECT current_user; -- Sollte 'arieger' anzeigen
-- CREATE TABLE test_permissions (id SERIAL PRIMARY KEY); -- Test
-- DROP TABLE test_permissions; -- Cleanup