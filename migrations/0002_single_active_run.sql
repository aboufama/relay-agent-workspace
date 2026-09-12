CREATE UNIQUE INDEX IF NOT EXISTS runs_active_task ON runs(task_id) WHERE task_id IS NOT NULL AND status IN ('queued','preparing','running','awaiting');
CREATE UNIQUE INDEX IF NOT EXISTS runs_active_retry ON runs(parent_run_id) WHERE parent_run_id IS NOT NULL AND task_id IS NULL AND status IN ('queued','preparing','running','awaiting');
