import urllib.request
import json

req = urllib.request.Request(
    'http://localhost:8000/api/predict',
    data=b'{"state":"Delhi","district":"New Delhi","date":"2026-04-24"}',
    headers={'Content-Type': 'application/json'}
)
resp = urllib.request.urlopen(req).read().decode()
parsed = json.loads(resp)
print(json.dumps(parsed, indent=2))
