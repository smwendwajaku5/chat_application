CREATE TABLE IF NOT EXISTS messages (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 32),
	text TEXT NOT NULL CHECK (length(trim(text)) BETWEEN 1 AND 500),
	sent_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
