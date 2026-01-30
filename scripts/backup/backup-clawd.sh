#!/bin/bash

# Clawd Markdown Backup Script
# Backs up all markdown files from ~/clawd to ~/backups

set -euo pipefail

# Configuration
SOURCE_DIR="$HOME/clawd"
BACKUP_DIR="$HOME/backups"
DATE=$(date +%Y-%m-%d)
BACKUP_FILE="backup-$DATE.tar.gz"
TEMP_LIST="/tmp/clawd-backup-files-$$.txt"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

cleanup() {
    rm -f "$TEMP_LIST"
}

trap cleanup EXIT

# Main logic
main() {
    log_info "Starting Clawd markdown backup..."
    
    # Check if source directory exists
    if [[ ! -d "$SOURCE_DIR" ]]; then
        log_error "Source directory does not exist: $SOURCE_DIR"
        exit 1
    fi
    
    # Create backup directory if it doesn't exist
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log_info "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
    
    # Find all markdown files
    log_info "Searching for markdown files in $SOURCE_DIR..."
    find "$SOURCE_DIR" -type f \( -name "*.md" -o -name "*.markdown" \) > "$TEMP_LIST"
    
    FILE_COUNT=$(wc -l < "$TEMP_LIST")
    
    if [[ $FILE_COUNT -eq 0 ]]; then
        log_warn "No markdown files found in $SOURCE_DIR"
        exit 0
    fi
    
    log_info "Found $FILE_COUNT markdown files"
    
    # Create backup archive
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"
    
    if [[ -f "$BACKUP_PATH" ]]; then
        log_warn "Backup file already exists: $BACKUP_PATH"
        log_info "Appending timestamp to avoid overwrite..."
        BACKUP_FILE="backup-$DATE-$(date +%H%M%S).tar.gz"
        BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"
    fi
    
    log_info "Creating archive: $BACKUP_FILE"
    
    # Create tar.gz archive
    tar -czf "$BACKUP_PATH" -C "$SOURCE_DIR" -T <(sed "s|^$SOURCE_DIR/||" "$TEMP_LIST") 2>/dev/null
    
    if [[ $? -eq 0 ]]; then
        BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
        log_info "✓ Backup completed successfully!"
        log_info "  Location: $BACKUP_PATH"
        log_info "  Size: $BACKUP_SIZE"
        log_info "  Files: $FILE_COUNT markdown files"
    else
        log_error "Backup failed!"
        exit 1
    fi
}

# Run main function
main "$@"
