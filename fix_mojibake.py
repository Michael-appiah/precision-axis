with open(r'c:\Users\mapia\OneDrive\Documents\resources\spin\predictor_site\auth.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix title
text = text.replace('<title>Precision Axis â€“ AI Sports & Casino Analytics</title>', '<title>Precision Axis &ndash; AI Sports & Casino Analytics</title>')
text = text.replace('<title>Precision Axis – AI Sports & Casino Analytics</title>', '<title>Precision Axis &ndash; AI Sports & Casino Analytics</title>')

# Fix password placeholders
text = text.replace('placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"', 'placeholder="••••••••"')

# Fix hourglass emoji
text = text.replace('â ³', '&#9203;')

with open(r'c:\Users\mapia\OneDrive\Documents\resources\spin\predictor_site\auth.html', 'w', encoding='utf-8') as f:
    f.write(text)

print('auth.html fixed')

# Fix pricing.html
with open(r'c:\Users\mapia\OneDrive\Documents\resources\spin\predictor_site\pricing.html', 'r', encoding='utf-8') as f:
    p_text = f.read()

p_text = p_text.replace('<title>Precision Axis \ufffd AI Analytics Vouchers</title>', '<title>Precision Axis &ndash; AI Analytics Vouchers</title>')
p_text = p_text.replace('<title>Precision Axis – AI Analytics Vouchers</title>', '<title>Precision Axis &ndash; AI Analytics Vouchers</title>')

with open(r'c:\Users\mapia\OneDrive\Documents\resources\spin\predictor_site\pricing.html', 'w', encoding='utf-8') as f:
    f.write(p_text)

print('pricing.html fixed')

# Fix payment-return.html
with open(r'c:\Users\mapia\OneDrive\Documents\resources\spin\payment-return.html', 'r', encoding='utf-8') as f:
    pr_text = f.read()

pr_text = pr_text.replace('\ufffd', '&mdash;')
pr_text = pr_text.replace('<title>Payment Status &mdash; SportyBet</title>', '<title>Payment Status &ndash; SportyBet</title>')

with open(r'c:\Users\mapia\OneDrive\Documents\resources\spin\payment-return.html', 'w', encoding='utf-8') as f:
    f.write(pr_text)

print('payment-return.html fixed')
