import glob, os, re

for f in glob.glob(r'c:\Users\mapia\OneDrive\Documents\resources\spin\predictor_site\*.html'):
    with open(f, 'r', encoding='utf-8') as fh:
        text = fh.read()
    for m in re.finditer(r'placeholder="([^"]*)"', text):
        ph = m.group(1)
        if 'â' in ph or '\ufffd' in ph or any(ord(c) > 127 for c in ph and c != '•'):
            print(os.path.basename(f), 'bad placeholder:', repr(ph))
