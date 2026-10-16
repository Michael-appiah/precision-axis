with open(r'c:\Users\mapia\OneDrive\Documents\resources\spin\payment-return.html', 'rb') as f:
    raw = f.read()

# Decode as cp1252, replacing any bad bytes
text = raw.decode('cp1252', errors='replace')
text = text.replace('\ufffd', '&mdash;')
text = text.replace('–', '&ndash;')
text = text.replace('—', '&mdash;')

with open(r'c:\Users\mapia\OneDrive\Documents\resources\spin\payment-return.html', 'w', encoding='utf-8') as f:
    f.write(text)

print('payment-return.html converted to UTF-8 successfully')
