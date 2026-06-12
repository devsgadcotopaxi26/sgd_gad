#!/bin/bash
# ============================================================
# Backup automático PostgreSQL — SGD GAD Cotopaxi
# ============================================================

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/app/backups"
DB_NAME="sgd_gad_cotopaxi"
DB_USER="postgres"
DB_HOST="host.docker.internal"
DB_PORT="5432"
RETENTION_DAYS=30

mkdir -p $BACKUP_DIR

echo "[$(date)] Iniciando backup de $DB_NAME..."

PGPASSWORD=$DB_PASSWORD pg_dump \
    -h $DB_HOST \
    -p $DB_PORT \
    -U $DB_USER \
    -F c \
    -f "$BACKUP_DIR/${DB_NAME}_${DATE}.dump" \
    $DB_NAME

if [ $? -eq 0 ]; then
    echo "[$(date)] Backup exitoso: ${DB_NAME}_${DATE}.dump"
    # Eliminar backups más antiguos de 30 días
    find $BACKUP_DIR -name "*.dump" -mtime +$RETENTION_DAYS -delete
    echo "[$(date)] Backups antiguos eliminados (>$RETENTION_DAYS días)"
else
    echo "[$(date)] ERROR: Backup falló"
    exit 1
fi