import glob, os, re

files = glob.glob(r'c:\Users\mapia\OneDrive\Documents\resources\spin\predictor_site\*.html') + glob.glob(r'c:\Users\mapia\OneDrive\Documents\resources\spin\*.html')

for filepath in files:
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        text = f.read()

    issues = []
    # Check for placeholder corruption
    for m in re.finditer(r'placeholder="([^"]+)"', text):
        ph = m.group(1)
        if any(ord(c) > 127 for c in ph) or 'â' in ph or '?' in ph:
            issues.append(('placeholder', ph))
            
    # Check for title corruption
    for m in re.finditer(r'<title>([^<]+)</title>', text):
        title = m.group(1)
        if any(ord(c) > 127 for c in title) or 'â' in title or '?' in title or '\ufffd' in title:
            issues.append(('title', title))

    # Check for general mojibake
    for bad in ['â€“', 'â€¢', 'â†', 'â', 'Ã', 'Â', '\ufffd']:
        count = text.count(bad)
        if count > 0:
            issues.append((bad, count))

    if issues:
        print(f"=== {os.path.basename(filepath)} ===")
        for issue in issues[:10]:
            print("  ", issue)
