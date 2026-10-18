import sys
import os
import re

patch_file = ".github/PATCH.md"

if not os.path.exists(patch_file):
    print("PATCH.md not found")
    sys.exit(0)

with open(patch_file, "r", encoding="utf-8") as f:
    text = f.read()

# 1. 自動處理換行符 (CRLF -> LF)
text = text.replace('\r\n', '\n')

# 2. 兼容 ## FILE: 與 ## 修改目標，並允許路徑前後有反引號
if not re.search(r"## (?:FILE|修改目標|修改目标):", text):
    print("PATCH.md is empty or invalid format (missing '## FILE:' or '## 修改目標:'). Exiting safely.")
    sys.exit(0)

# 抓取檔案區塊
pattern = re.compile(r"## (?:FILE|修改目標|修改目标):\s*`?([^`\n]+)`?\n(.*?)(?=## (?:FILE|修改目標|修改目标):|\Z)", re.S)
matches = pattern.findall(text)

planned = []
errors = []

for rel_path, content_block in matches:
    rel_path = rel_path.strip()
    if not os.path.exists(rel_path):
        errors.append(f"{rel_path}: File not found")
        continue
        
    with open(rel_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # 3. 處理目標檔案的換行符，確保匹配一致性
    content = content.replace('\r\n', '\n')
    new_content = content
    
    # 4. 放寬 OLD/REGEX/REPLACE_ALL 的標籤抓取，允許標籤後有空白
    pairs = re.findall(r"<<<<<<< (OLD|REGEX|REPLACE_ALL)\s*\n(.*?)\n=======\s*\n(.*?)\n>>>>>>> NEW", content_block, re.S)
    if not pairs:
        errors.append(f"{rel_path}: No OLD/REGEX/REPLACE_ALL pairs found")
        continue
        
    for mode, old, new in pairs:
        if mode == "REGEX":
            new_content, count = re.subn(old, new, new_content, count=1)
            if count == 1:
                print(f"[OK] {rel_path}: Regex replaced 1 instance")
            elif count == 0:
                if re.search(new, new_content):
                    print(f"[SKIP] {rel_path}: Already applied")
                else:
                    errors.append(f"{rel_path}: Regex OLD not found, NEW not present")
        elif mode == "REPLACE_ALL":
            count = new_content.count(old)
            if count > 0:
                new_content = new_content.replace(old, new)
                print(f"[OK] {rel_path}: Replaced ALL {count} instances")
            elif count == 0:
                if new in new_content:
                    print(f"[SKIP] {rel_path}: Already applied")
                else:
                    errors.append(f"{rel_path}: REPLACE_ALL OLD not found, NEW not present")
        else: # OLD 模式 (嚴格唯一匹配 + 模糊備援)
            count = new_content.count(old)
            if count == 1:
                new_content = new_content.replace(old, new, 1)
                print(f"[OK] {rel_path}: Replaced 1 instance")
            elif count == 0:
                if new in new_content:
                    print(f"[SKIP] {rel_path}: Already applied")
                else:
                    # 5. 模糊匹配備援：去除行首尾空白再試一次
                    # 將舊字串與目標內容按行分割，去除首尾空白
                    old_lines = [line.strip() for line in old.split('\n')]
                    content_lines = [line.strip() for line in new_content.split('\n')]
                    
                    # 簡單的行掃描尋找（只適用於多行區塊）
                    matched = False
                    for i in range(len(content_lines) - len(old_lines) + 1):
                        if content_lines[i:i+len(old_lines)] == old_lines:
                            # 找到了，替換原始未 strip 的區塊
                            # 重組替換（這裡為了安全，僅替換第一處匹配）
                            start_idx = new_content.find(old.split('\n')[0].strip())
                            # 如果有找到模糊匹配，直接報錯，建議用 REGEX
                            errors.append(f"{rel_path}: OLD found with different leading/trailing spaces. Please use REGEX mode.")
                            matched = True
                            break
                            
                    if not matched:
                        errors.append(f"{rel_path}: OLD not found, NEW not present")
            else:
                errors.append(f"{rel_path}: OLD found {count} times (not unique)")
            
    if new_content != content:
        planned.append((rel_path, new_content))

if errors:
    for e in errors:
        print(f"[ERROR] {e}")
    sys.exit(1)

for rel_path, new_content in planned:
    with open(rel_path, "w", encoding="utf-8", newline='\n') as f:
        f.write(new_content)
    print(f"[WRITE] {rel_path}")

with open(patch_file, "w", encoding="utf-8") as f:
    f.write("# 請在此貼上新的替換指令\n")
print("[RESET] PATCH.md reset")