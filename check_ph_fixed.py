import glob, os, re

for f in glob.glob(r'c:\Users\mapia\OneDrive\Documents\resources\spin\predictor_site\*.html'):
    with open(f, 'r', encoding='utf-8') as fh:
        text = fh.read()
    for m in re.finditer(r'placeholder="([^"]*)"', text):
        ph = m.group(1)
        bad = [c for c in ph if c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@._-+/ :()•*']
        if bad or '\ufffd' in ph or 'â' in ph:
            print(os.path.basename(f), 'placeholder:', repr(ph), 'suspicious:', bad)
