import glob, os, re

files = glob.glob(r'c:\Users\mapia\OneDrive\Documents\resources\spin\predictor_site\*.html')

for f in files:
    with open(f, 'r', encoding='utf-8', errors='replace') as fh:
        text = fh.read()
    
    orig = text
    # Fix corrupted title separators
    text = re.sub(r'<title>(Precision Axis|Predictor Panel|PRECISION AXIS)\s*[\u2013\u2014\-â€“]+\s*([^<]+)</title>',
                  r'<title>\1 &ndash; \2</title>', text, flags=re.IGNORECASE)
    
    # Also replace any literal \ufffd in titles
    text = re.sub(r'<title>([^<]*)\ufffd([^<]*)</title>', r'<title>\1&ndash;\2</title>', text)
    
    # Fix placeholders
    text = text.replace('placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"', 'placeholder="••••••••"')
    text = text.replace('placeholder="\ufffd"', 'placeholder="..."')
    
    if text != orig:
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(text)
        print('Fixed:', os.path.basename(f))
