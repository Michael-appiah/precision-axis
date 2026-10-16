import glob, os

files = glob.glob(r'c:\Users\mapia\OneDrive\Documents\resources\spin\predictor_site\*.html') + \
        glob.glob(r'c:\Users\mapia\OneDrive\Documents\resources\spin\*.html')

for filepath in files:
    with open(filepath, 'rb') as f:
        raw = f.read()
    text = raw.decode('utf-8', errors='replace')
    for m in ['â€¢', 'â€“', 'â†', 'â', 'Ã', 'Â', '\ufffd']:
        if m in text:
            print(f"{os.path.basename(filepath)} has {repr(m)}: {text.count(m)}")
