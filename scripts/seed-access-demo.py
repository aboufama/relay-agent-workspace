#!/usr/bin/env python3
"""Append clearly labeled, authored access-control examples to local D1 only.

This never invokes a model, creates runs, changes permissions, or overwrites chats.
"""
import datetime as dt
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHANNEL = 'access-control-demo'
paths = list((ROOT / '.wrangler/state/v3/d1/miniflare-D1DatabaseObject').glob('*.sqlite'))
db = None
for path in paths:
    candidate = sqlite3.connect(path, timeout=15)
    if candidate.execute("SELECT 1 FROM sqlite_master WHERE name='members'").fetchone():
        if db is not None:
            candidate.close()
            raise SystemExit('Multiple workspace databases found; refusing an ambiguous write.')
        db = candidate
    else:
        candidate.close()
if db is None:
    raise SystemExit('Start the local workspace first so its D1 database exists.')
db.row_factory = sqlite3.Row
members = {r['id']: dict(r) for r in db.execute('SELECT id,name,data FROM members')}
for identifier in ['you', 'scout', 'sage', 'atlas', 'iris', 'ledger']:
    if identifier not in members:
        raise SystemExit(f'Missing expected demo member: {identifier}')
levels = {identifier: json.loads(m['data']).get('accessLevel') for identifier, m in members.items()}
if levels['scout'] != 'Public' or levels['sage'] != 'Internal' or levels['atlas'] != 'Restricted':
    raise SystemExit('Agent permissions changed; review the sample copy before seeding.')
name = lambda identifier: members[identifier]['name']
messages = [
    ('intro', 'you', 'Access-control demo — sample conversations based on current permissions. These replies are authored examples, not recorded model outputs. No restricted content is included.'),
    ('public-request', 'you', f"@{name('scout')} show me the supplier pricing in launch-allocation.md."),
    ('public-denied', 'scout', f"I can’t open launch-allocation.md. My access is Public; this file is Restricted. Ask {name('ledger')} for a summary approved for this conversation."),
    ('confidential-request', 'you', f"@{name('sage')} summarize the field findings in h14-q18.md."),
    ('confidential-denied', 'sage', f"That file is Confidential, above my Internal access. I can’t read or summarize it. {name('iris')} has access and can prepare an approved summary."),
    ('scoped-request', 'you', f"@{name('atlas')} you have Restricted clearance. Can you show me launch-allocation.md?"),
    ('scoped-denied', 'atlas', f"Restricted clearance doesn’t grant every file. This document is scoped to {name('ledger')}; I’m not on its access list. I can’t read or infer its contents."),
]
missing = [m for m in messages if not db.execute('SELECT 1 FROM messages WHERE id=?', ('access-demo-v1-'+m[0],)).fetchone()]
if not missing:
    print(f'#{CHANNEL} already contains all {len(messages)} examples; unchanged.')
    db.close()
    raise SystemExit(0)
now = dt.datetime.now(dt.timezone.utc)
backup = ROOT / '.wrangler/backups' / ('access-demo-' + now.strftime('%Y%m%d-%H%M%S') + '.sqlite')
backup.parent.mkdir(parents=True, exist_ok=True)
with sqlite3.connect(backup) as target:
    db.backup(target)
with db:
    db.execute('INSERT OR IGNORE INTO channels(name,created_at) VALUES (?,?)', (CHANNEL, now.isoformat()))
    for index, (key, member, body) in enumerate(messages):
        identifier = 'access-demo-v1-' + key
        timestamp = (now - dt.timedelta(seconds=(len(messages)-index)*25)).isoformat(timespec='milliseconds').replace('+00:00','Z')
        result = db.execute("INSERT OR IGNORE INTO messages(id,room,member_id,name,body,created_at,state,client_id) VALUES (?,?,?,?,?,?,'complete',?)", (identifier,CHANNEL,member,name(member),body,timestamp,identifier))
        if result.rowcount:
            payload = {'message': {'id':identifier,'room':CHANNEL,'memberId':member,'name':name(member),'body':body,'createdAt':timestamp,'state':'complete'}}
            db.execute('INSERT INTO events(ts,type,payload) VALUES (?,?,?)',(now.isoformat(),'message.created',json.dumps(payload)))
count = db.execute('SELECT COUNT(*) FROM messages WHERE room=?',(CHANNEL,)).fetchone()[0]
db.close()
print(f'Added {len(missing)} example messages to #{CHANNEL}; {count} total. Permissions unchanged; no runs created.')
