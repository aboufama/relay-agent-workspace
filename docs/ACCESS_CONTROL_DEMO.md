# Access-control demo snapshots

Captured from the running Shoal workspace at http://localhost:3000/ on September 12, 2026.

- 01: full access-control example conversation.
- 02: Public agent denied a Restricted file.
- 03: Internal agent denied a Confidential file.
- 04: Restricted agent denied a file without its explicit grant.
- 05: Data view with the supplier file selected and its assigned agent indicated by an eye.
- 06: Habitats and current agent clearance labels.

The conversations are clearly labeled authored examples, not recorded model responses. No protected passage content was added. Separate live /api/context checks confirmed the three expected denials and a positive control for Puff Pickles. permission-checks.json records only document IDs. These checks cover retrieval filtering, not end-to-end model behavior or a complete security audit.

Habitats reflects the actual local setup service being unreachable; no live inference connection is claimed. All six screenshots were captured with no browser page errors.

## Local fixture

Run `python3 scripts/seed-access-demo.py` against the existing local Bell demo workspace. It appends seven messages to #access-control-demo, uses current member names, backs up D1 before writing, and is idempotent. It does not call models, enqueue runs, alter permissions, or replace existing messages. Review the example copy if document grants or classifications change; this is a fixture for the current demo data.

Validation: four retrieval checks passed (three denials and one allowed control); a second seeder run added no messages; six browser captures completed without page errors. Generated snapshots live under output/access-control-demo and are excluded from Git.
