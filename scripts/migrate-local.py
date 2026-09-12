#!/usr/bin/env python3
"""Apply versioned migrations to this local demo's existing D1 SQLite store."""
from pathlib import Path
import sqlite3, re, datetime
root = Path(__file__).resolve().parents[1]
for path in (root / '.wrangler/state/v3/d1/miniflare-D1DatabaseObject').glob('*.sqlite'):
    db = sqlite3.connect(path, timeout=30)
    if not db.execute("SELECT 1 FROM sqlite_master WHERE name='runs'").fetchone():
        db.close(); continue
    backup = root / '.wrangler/backups' / (datetime.datetime.now().strftime('%Y%m%d-%H%M%S') + '-' + path.name)
    backup.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(backup) as target: db.backup(target)
    db.execute('CREATE TABLE IF NOT EXISTS shoal_migrations(name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)')
    for migration in sorted((root / 'migrations').glob('*.sql')):
        if db.execute('SELECT 1 FROM shoal_migrations WHERE name=?', (migration.name,)).fetchone(): continue
        with db:
            for statement in migration.read_text().split(';'):
                if not statement.strip(): continue
                addition = re.search(r'ALTER TABLE (\w+) ADD COLUMN (\w+)', statement)
                if addition and addition[2] in {r[1] for r in db.execute('PRAGMA table_info(' + addition[1] + ')')}: continue
                db.execute(statement)
            db.execute("INSERT INTO shoal_migrations VALUES (?,datetime('now'))", (migration.name,))
        print('Applied', migration.name)
    db.close()
