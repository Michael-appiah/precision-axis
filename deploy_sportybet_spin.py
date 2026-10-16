import os
import zipfile
import urllib.request
import json
import time

SITE_ID = '11c29b2e-f315-4b64-b58f-92763ed36437'
NETLIFY_TOKEN = 'nfp_8Z7ZnoZQ6WXai9uZeNvQFcHjbcv6zyZWa8a9'
BASE_DIR = r'C:\Users\mapia\OneDrive\Documents\resources\spin'
ZIP_PATH = os.path.join(BASE_DIR, 'deploy_spin_site.zip')

files_to_zip = []

# Root game files
for f in os.listdir(BASE_DIR):
    fp = os.path.join(BASE_DIR, f)
    if os.path.isfile(fp) and not f.endswith('.zip') and not f.endswith('.py'):
        files_to_zip.append((fp, f))

# Asset directories
for ad in ['img-icons', 'designs']:
    ad_path = os.path.join(BASE_DIR, ad)
    if os.path.exists(ad_path):
        for root, dirs, files in os.walk(ad_path):
            for f in files:
                full_p = os.path.join(root, f)
                rel_p = os.path.relpath(full_p, BASE_DIR)
                files_to_zip.append((full_p, rel_p))

with zipfile.ZipFile(ZIP_PATH, 'w', zipfile.ZIP_DEFLATED) as zf:
    for full_p, arcname in files_to_zip:
        zf.write(full_p, arcname)

print(f"Archive created: {os.path.getsize(ZIP_PATH)} bytes")

with open(ZIP_PATH, 'rb') as fh:
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
    deploy_id = data.get('id')
    print(f"Deploy uploaded! Deploy ID: {deploy_id}, State: {data.get('state')}")

if os.path.exists(ZIP_PATH):
    os.remove(ZIP_PATH)

for _ in range(15):
    time.sleep(2)
    poll_req = urllib.request.Request(
        f"https://api.netlify.com/api/v1/sites/{SITE_ID}/deploys/{deploy_id}",
        headers={'Authorization': f'Bearer {NETLIFY_TOKEN}'}
    )
    with urllib.request.urlopen(poll_req) as r:
        pdata = json.loads(r.read().decode('utf-8'))
        st = pdata.get('state')
        print(f"Deploy state: {st}")
        if st in ['ready', 'error']:
            print(f"Done! Final URL: {pdata.get('ssl_url') or pdata.get('url')}")
            break
