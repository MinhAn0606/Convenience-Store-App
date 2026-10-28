"""Report changes since ZIP import without changing any files."""
from pathlib import Path
import hashlib
import json
import sys
root = Path(__file__).resolve().parent.parent
baseline = json.loads((root / 'docs/source-baseline.json').read_text())
changed, missing = [], []
for name, expected in baseline.items():
    path = root / name
    if not path.is_file():
        missing.append(name)
    elif hashlib.sha256(path.read_bytes()).hexdigest() != expected:
        changed.append(name)
print('Missing original files:', len(missing))
print('\n'.join(missing))
print('Modified original files:', len(changed))
print('\n'.join(changed))
sys.exit(1 if missing else 0)
