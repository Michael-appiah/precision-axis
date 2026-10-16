import glob, os

files = glob.glob(r'c:\Users\mapia\OneDrive\Documents\resources\spin\predictor_site\*.html') + \
        glob.glob(r'c:\Users\mapia\OneDrive\Documents\resources\spin\*.html')

for filepath in files:
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    if '\ufffd' in content:
        print(f"Found \\ufffd in {os.path.basename(filepath)}: {content.count('\ufffd')} times")
