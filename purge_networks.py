import json, os, shutil
with open('/config/config.json') as f:
    d = json.load(f)
shutil.copy('/config/config.json', '/config/config.json.bak')
old = len(d.get('networks', []))
d['networks'] = []
with open('/config/config.json.tmp', 'w') as f:
    json.dump(d, f, indent=2)
os.rename('/config/config.json.tmp', '/config/config.json')
print('Purged ' + str(old) + ' networks')
