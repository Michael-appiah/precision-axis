import os
import zipfile
import urllib.request
import json

SITE_ID = '4a91bf80-a8dc-4b79-a618-ad751a54429e'
NETLIFY_TOKEN = 'nfc_4A3gsEDeFtN97HMDTChFdDxJbfGZHt91bd21'
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ZIP_FILE = os.path.join(BASE_DIR, 'deploy_paxis.zip')

print(f"[1] Packaging Precision Axis for Site ID {SITE_ID} (precisionaxis.online)...")

files_to_zip = []

# 1. Predictor site HTML, CSS, JS and Assets
pred_dir = os.path.join(BASE_DIR, 'predictor_site')
if os.path.exists(pred_dir):
    for root, dirs, files in os.walk(pred_dir):
        for f in files:
            full_p = os.path.join(root, f)
            rel_p = os.path.relpath(full_p, pred_dir)
            files_to_zip.append((full_p, rel_p))

# 2. Netlify Functions
functions_dir = os.path.join(BASE_DIR, 'netlify', 'functions')
if os.path.exists(functions_dir):
    for f in os.listdir(functions_dir):
        if f.endswith('.js'):
            full_p = os.path.join(functions_dir, f)
            files_to_zip.append((full_p, f"functions/{f}"))
            files_to_zip.append((full_p, f"netlify/functions/{f}"))

# 3. Config
for cf in ['netlify.toml', 'package.json']:
    cfp = os.path.join(BASE_DIR, cf)
    if os.path.exists(cfp):
        files_to_zip.append((cfp, cf))

with zipfile.ZipFile(ZIP_FILE, 'w', zipfile.ZIP_DEFLATED) as zf:
    for full_p, arcname in files_to_zip:
        zf.write(full_p, arcname)
        print(f"  + {arcname}")

print(f"\n[2] Uploading ZIP ({os.path.getsize(ZIP_FILE)} bytes) to Netlify Production...")
with open(ZIP_FILE, 'rb') as fh:
    zip_bytes = fh.read()

req = urllib.request.Request(
    f"https://api.netlify.com/api/v1/sites/{SITE_ID}/deploys",
    data=zip_bytes,
    headers={
        'Authorization': f'Bearer {NETLIFY_TOKEN}',
        'Content-Type': 'application/zip'
    },
    method='POST'
)

with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))
    print(f"\n[SUCCESS] Deployed to precisionaxis.online! ID: {data.get('id')}, State: {data.get('state')}")
    print(f"Production URL: {data.get('ssl_url') or data.get('url') or 'https://precisionaxis.online'}")

if os.path.exists(ZIP_FILE):
    os.remove(ZIP_FILE)
