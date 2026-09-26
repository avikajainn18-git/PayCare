"""Make backend/ml and backend/app importable; isolate the test database."""

import os
import sys
import tempfile
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
for subdir in ("ml", "app"):
    path = str(BACKEND_DIR / subdir)
    if path not in sys.path:
        sys.path.insert(0, path)

# Isolated SQLite file for tests. Must be set BEFORE database/main are
# imported (they read the env var at import time).
os.environ.setdefault(
    "PAYCARE_DB_PATH", str(Path(tempfile.gettempdir()) / "paycare-test.db")
)
