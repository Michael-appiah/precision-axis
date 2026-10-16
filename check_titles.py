import glob, os, re

for f in glob.glob(r'c:\Users\mapia\OneDrive\Documents\resources\spin\predictor_site\*.html'):
    with open(f, 'r', encoding='utf-8', errors='replace') as fh:
        text = fh.read()
    m = re.search(r'<title>([^<]+)</title>', text)
    if m:
        print(os.path.basename(f), '-->', repr(m.group(1)))
