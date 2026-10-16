import glob, os, re

files = glob.glob(r'c:\Users\mapia\OneDrive\Documents\resources\spin\predictor_site\*.html')

for filepath in files:
    fname = os.path.basename(filepath)
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        lines = f.readlines()
    
    corrupted_lines = []
    for idx, line in enumerate(lines):
        if '\ufffd' in line or 'â€' in line or 'â' in line or 'Ã' in line or 'Â' in line:
            corrupted_lines.append((idx + 1, line.strip()))
            
    if corrupted_lines:
        print(f"=== {fname} ({len(corrupted_lines)} lines) ===")
        for lnum, ltext in corrupted_lines[:15]:
            # sanitize for terminal
            safe_text = ltext.encode('ascii', errors='backslashreplace').decode('ascii')
            print(f"  L{lnum}: {safe_text}")
