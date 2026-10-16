import os
import zipfile
import urllib.request
import json
import ssl
import time

ctx = ssl.create_default_context()
SITE_ID = 'c135c649-d195-4bb6-b792-c1378159cfbf'
NETLIFY_TOKEN = 'nfc_4A3gsEDeFtN97HMDTChFdDxJbfGZHt91bd21'
BASE_DIR = r'C:\Users\mapia\OneDrive\Documents\resources\spin\admin_portal'
ZIP_FILE = os.path.join(BASE_DIR, 'admin_deploy.zip')

print('[1] Building admin bundle...')
with zipfile.ZipFile(ZIP_FILE, 'w', zipfile.ZIP_DEFLATED) as zf:
    pub_dir = os.path.join(BASE_DIR, 'public')
    for f in os.listdir(pub_dir):
        fp = os.path.join(pub_dir, f)
        if os.path.isfile(fp):
            zf.write(fp, f)
            print('  +', f)

    toml_content = '[build]\n  functions = "functions"\n'
    zf.writestr('netlify.toml', toml_content)
    print('  + netlify.toml')

    pkg_fp = os.path.join(BASE_DIR, 'package.json')
    if os.path.exists(pkg_fp):
        zf.write(pkg_fp, 'package.json')
        print('  + package.json')

    func_dir = os.path.join(BASE_DIR, 'netlify', 'functions')
    for f in os.listdir(func_dir):
        if f.endswith('.js'):
            fp = os.path.join(func_dir, f)
            zf.write(fp, 'functions/' + f)
            zf.write(fp, 'netlify/functions/' + f)
            print('  + functions/' + f)
            
    site_status_fp = r'C:\Users\mapia\OneDrive\Documents\resources\spin\netlify\functions\site-status.js'
    if os.path.exists(site_status_fp):
        zf.write(site_status_fp, 'functions/site-status.js')
        zf.write(site_status_fp, 'netlify/functions/site-status.js')
        print('  + functions/site-status.js')

print(f'\n[2] Uploading ZIP ({os.path.getsize(ZIP_FILE)} bytes)...')
with open(ZIP_FILE, 'rb') as fh:
    zip_bytes = fh.read()

req = urllib.request.Request(
    f'https://api.netlify.com/api/v1/sites/{SITE_ID}/deploys',
    data=zip_bytes,
    headers={
        'Authorization': f'Bearer {NETLIFY_TOKEN}',
        'Content-Type': 'application/zip'
    },
    method='POST'
)

with urllib.request.urlopen(req, context=ctx) as resp:
    data = json.loads(resp.read().decode('utf-8'))
    deploy_id = data.get('id')
    print('\n[SUCCESS] Deploy ID:', deploy_id, 'State:', data.get('state'))

if os.path.exists(ZIP_FILE):
    os.remove(ZIP_FILE)

for _ in range(15):
    time.sleep(2)
    poll_req = urllib.request.Request(
        f'https://api.netlify.com/api/v1/sites/{SITE_ID}/deploys/{deploy_id}',
        headers={'Authorization': f'Bearer {NETLIFY_TOKEN}'}
    )
    with urllib.request.urlopen(poll_req, context=ctx) as r:
        pdata = json.loads(r.read().decode('utf-8'))
        st = pdata.get('state')
        print('Deploy poll state:', st)
        if st in ['ready', 'error']:
            print('Final state:', st)
            print('URL:', pdata.get('ssl_url'))
            break
