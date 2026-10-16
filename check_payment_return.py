with open(r'c:\Users\mapia\OneDrive\Documents\resources\spin\payment-return.html', 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()
for i, l in enumerate(lines):
    if '\ufffd' in l or 'â' in l:
        print(f"L{i+1}: {l.strip().encode('ascii', errors='backslashreplace').decode('ascii')}")
