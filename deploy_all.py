import os
import zipfile
import urllib.request
import json
import time

NETLIFY_TOKEN = 'nfc_4A3gsEDeFtN97HMDTChFdDxJbfGZHt91bd21'
BASE_DIR = r'C:\Users\mapia\OneDrive\Documents\resources\spin'

def deploy_site(site_id, site_name, zip_path, files_list):
    print(f"\n==========================================")
    print(f"Deploying {site_name} ({site_id})...")
    print(f"==========================================")
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for full_p, arcname in files_list:
            zf.write(full_p, arcname)
            print(f"  + {arcname}")
            
    print(f"\nUploading ZIP ({os.path.getsize(zip_path)} bytes) to Netlify...")
    with open(zip_path, 'rb') as fh:
        zip_bytes = fh.read()

    req = urllib.request.Request(
        f'https://api.netlify.com/api/v1/sites/{site_id}/deploys',
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
        print(f"[SUCCESS] Uploaded {site_name}! Deploy ID: {deploy_id}, State: {data.get('state')}")
        
    if os.path.exists(zip_path):
        os.remove(zip_path)
        
    # Poll for ready state
    for _ in range(10):
        time.sleep(2)
        poll_req = urllib.request.Request(
            f'https://api.netlify.com/api/v1/sites/{site_id}/deploys/{deploy_id}',
            headers={'Authorization': f'Bearer {NETLIFY_TOKEN}'}
        )
        with urllib.request.urlopen(poll_req) as r:
            pdata = json.loads(r.read().decode('utf-8'))
            st = pdata.get('state')
            print(f"  Deploy poll state: {st}")
            if st in ['ready', 'error']:
                print(f"  Final state: {st} | URL: {pdata.get('ssl_url') or pdata.get('url')}")
                break

# 1. Gather files for spin-da-bottle-game
SPIN_SITE_ID = 'e22941fe-a4b5-4bb1-bffd-8cf72f180506'
ZIP_SPIN = os.path.join(BASE_DIR, 'deploy_spin_live.zip')
spin_files = []

for f in os.listdir(BASE_DIR):
    full_p = os.path.join(BASE_DIR, f)
    if os.path.isfile(full_p) and not f.endswith('.zip') and not f.endswith('.py'):
        spin_files.append((full_p, f))

# Also add images and assets directories
for asset_dir in ['img-icons', 'designs']:
    ad_path = os.path.join(BASE_DIR, asset_dir)
    if os.path.exists(ad_path):
        for root, dirs, files in os.walk(ad_path):
            for f in files:
                full_p = os.path.join(root, f)
                rel_p = os.path.relpath(full_p, BASE_DIR)
                spin_files.append((full_p, rel_p))

functions_dir = os.path.join(BASE_DIR, 'netlify', 'functions')
if os.path.exists(functions_dir):
    for f in os.listdir(functions_dir):
        if f.endswith('.js'):
            full_p = os.path.join(functions_dir, f)
            spin_files.append((full_p, f'functions/{f}'))
            spin_files.append((full_p, f'netlify/functions/{f}'))

deploy_site(SPIN_SITE_ID, 'spin-da-bottle-game', ZIP_SPIN, spin_files)

# 2. Gather files for precisionaxis.online (Predictor Hub / Auth / Pricing)
PAX_SITE_ID = '4a91bf80-a8dc-4b79-a618-ad751a54429e'
ZIP_PAX = os.path.join(BASE_DIR, 'deploy_pax_live.zip')
pax_files = []

pred_dir = os.path.join(BASE_DIR, 'predictor_site')
if os.path.exists(pred_dir):
    for root, dirs, files in os.walk(pred_dir):
        for f in files:
            full_p = os.path.join(root, f)
            rel_p = os.path.relpath(full_p, pred_dir)
            pax_files.append((full_p, rel_p))

if os.path.exists(functions_dir):
    for f in os.listdir(functions_dir):
        if f.endswith('.js'):
            full_p = os.path.join(functions_dir, f)
            pax_files.append((full_p, f'functions/{f}'))
            pax_files.append((full_p, f'netlify/functions/{f}'))

for cf in ['netlify.toml', 'package.json']:
    cfp = os.path.join(BASE_DIR, cf)
    if os.path.exists(cfp):
        pax_files.append((cfp, cf))

deploy_site(PAX_SITE_ID, 'precisionaxis.online', ZIP_PAX, pax_files)

print("\nAll live production sites have been successfully deployed!")
