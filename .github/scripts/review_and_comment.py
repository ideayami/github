import os
import openai
import requests

client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
REPO = os.getenv("REPO")
PR_NUMBER = os.getenv("PR_NUMBER")

def get_changed_files_with_patch():
    url = f"https://api.github.com/repos/{REPO}/pulls/{PR_NUMBER}/files"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    resp = requests.get(url, headers=headers)
    if resp.status_code != 200:
        print("❌ Failed to fetch PR files")
        return []
    return resp.json()

def post_comment(body):
    url = f"https://api.github.com/repos/{REPO}/issues/{PR_NUMBER}/comments"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    resp = requests.post(url, headers=headers, json={"body": body})
    return resp.status_code == 201

def extract_diff(patch):
    lines = []
    for line in patch.splitlines():
        if line.startswith(('+', '-', '@@')):
            lines.append(line)
    return '\n'.join(lines)

def review_diff(filename, diff):
    prompt = f"""
以下は `{filename}` の変更差分です。
変更された部分のみをレビューしてください。マークダウン形式で出力してください。

```diff
{diff}

