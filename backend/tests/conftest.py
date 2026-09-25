"""Make backend/ml and backend/app importable for the test suite (plain module imports)."""

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
for subdir in ("ml", "app"):
    path = str(BACKEND_DIR / subdir)
    if path not in sys.path:
        sys.path.insert(0, path)
