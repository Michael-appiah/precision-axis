import urllib.request, re

req = urllib.request.urlopen('https://precisionaxis.online/auth.html')
html = req.read().decode('utf-8')

ph = re.search(r'id="loginPassword"[^>]*placeholder="([^"]+)"', html)
if ph:
    val = ph.group(1)
    print("Codepoints:", [ord(c) for c in val])
    print("Hex:", [hex(ord(c)) for c in val])
