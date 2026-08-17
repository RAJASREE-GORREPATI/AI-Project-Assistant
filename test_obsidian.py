import os
import requests

api_key = os.environ["OBSIDIAN_API_KEY"]

url = "http://127.0.0.1:27123/vault/"

headers = {
    "Authorization": f"Bearer {api_key}"
}

response = requests.get(url, headers=headers)

print("Status:", response.status_code)
print(response.text)