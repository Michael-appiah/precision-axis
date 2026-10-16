import urllib.request, re

req = urllib.request.urlopen('https://precisionaxis.online/auth.html')
html = req.read().decode('utf-8')

title = re.search(r'<title>([^<]+)</title>', html)
ph = re.search(r'id="loginPassword"[^>]*placeholder="([^"]+)"', html)

print("Live Title:", title.group(1) if title else "None")
print("Live Placeholder:", ph.group(1) if ph else "None")
