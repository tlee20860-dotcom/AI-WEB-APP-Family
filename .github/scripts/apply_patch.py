#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
apply_patch.py
用途：解析 repo 根目錄 PATCH.md，對多個檔案執行批次替換。
規則：
1. 每個 FILE 區塊可含多個 OLD/NEW 配對。
2. OLD 在目標檔案中必須唯一（0 次或 >1 次皆報錯）。
3. 若 OLD 為 0 次，但 NEW 已存在，視為已套用，冪等跳過。
4. 任一錯誤則 exit 1，不寫入任何未完成變更。
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PATCH_FILE = ROOT / "PATCH.md"

FILE_RE = re.compile(r"^## FILE:\s*(.+?)\s*$", re.M)
PAIR_RE = re.compile(
    r"<<<<<<< OLD\n(.*?)\n=======\n(.*?)\n>>>>>>> NEW",
    re.S,
)


def fail(msg: str) -> None:
    print(f"[ERROR] {msg}")
    sys.exit(1)


def main() -> None:
    if not PATCH_FILE.exists():
        fail(f"找不到 {PATCH_FILE}")

    text = PATCH_FILE.read_text(encoding="utf-8")
    file_matches = list(FILE_RE.finditer(text))
    if not file_matches:
        fail("PATCH.md 內找不到任何 '## FILE:' 區塊")

    planned = []
    errors = []

    for idx, match in enumerate(file_matches):
        rel_path = match.group(1).strip()
        start = match.end()
        end = file_matches[idx + 1].start() if idx + 1 < len(file_matches) else len(text)
        block = text[start:end]

        pairs = PAIR_RE.findall(block)
        if not pairs:
            errors.append(f"{rel_path}: 找不到 OLD/NEW 配對")
            continue

        target = (ROOT / rel_path).resolve()
        if not target.is_file():
            errors.append(f"{rel_path}: 目標檔案不存在")
            continue

        content = target.read_text(encoding="utf-8")
        new_content = content

        for old, new in pairs:
            count = new_content.count(old)
            if count == 1:
                new_content = new_content.replace(old, new, 1)
                print(f"[OK] {rel_path}: 替換 1 處")
            elif count == 0:
                if new in new_content:
                    print(f"[SKIP] {rel_path}: OLD 不存在，但 NEW 已存在（冪等跳過）")
                else:
                    errors.append(f"{rel_path}: OLD 出現 0 次，且 NEW 不存在")
            else:
                errors.append(f"{rel_path}: OLD 出現 {count} 次，非唯一")

        if new_content != content:
            planned.append((target, new_content, rel_path))

    if errors:
        for e in errors:
            print(f"[ERROR] {e}")
        sys.exit(1)

    for target, new_content, rel_path in planned:
        target.write_text(new_content, encoding="utf-8")
        print(f"[WRITE] {rel_path}")

    print(f"[DONE] 共寫入 {len(planned)} 個檔案")


if __name__ == "__main__":
    main()