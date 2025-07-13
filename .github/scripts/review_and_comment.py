import os
import openai
import requests

# --- 環境変数から各種情報取得 ---
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
PR_NUMBER = os.getenv("PR_NUMBER")
REPO = os.getenv("REPO")

# --- OpenAI クライアント設定 ---
client = openai.OpenAI(api_key=OPENAI_API_KEY)

# --- GitHub PRの差分ファイル一覧を取得 ---
def get_changed_files():
    url = f"https://api.github.com/repos/{REPO}/pulls/{PR_NUMBER}/files"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print("❌ GitHub API error")
        print(response.text)
        return []
    return response.json()

# --- コメントをPRに投稿 ---
def post_comment(body):
    url = f"https://api.github.com/repos/{REPO}/issues/{PR_NUMBER}/comments"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    response = requests.post(url, headers=headers, json={"body": body})
    return response.status_code == 201

# --- 差分のみ抽出（追加・削除・ヘッダ） ---
def extract_diff(patch):
    lines = []
    for line in patch.splitlines():
        if line.startswith(('+', '-', '@@')):
            lines.append(line)
    return '\n'.join(lines)

# --- 差分をOpenAIでレビュー ---
def review_diff(filename, diff):
    prompt = (
        f"以下は `{filename}` の差分です。\n"
        "変更されたコードのみをレビューしてください。\n"
        "マークダウン形式で簡潔に出力してください。\n\n"
        f"```diff\n{diff}\n```\n\n"
        "### 指摘事項\n- （なければ「特になし」と記載）"
    )

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=800
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"❌ OpenAI API エラー: {e}")
        return None

# --- メイン処理 ---
def main():
    files = get_changed_files()
    if not files:
        print("📄 レビュー対象のファイルがありません")
        return

    for f in files:
        filename = f.get("filename")
        patch = f.get("patch")

        if not patch or not filename.endswith(('.py', '.js', '.ts')):
            continue

        print(f"🔍 レビュー中: {filename}")
        diff = extract_diff(patch)
        review = review_diff(filename, diff)

        if review:
            body = f"### 💬 AIレビュー: `{filename}`\n\n{review}"
            if post_comment(body):
                print(f"✅ コメント投稿完了: {filename}")
            else:
                print(f"❌ コメント投稿失敗: {filename}")
        else:
            print(f"⚠️ レビュー失敗: {filename}")

if __name__ == "__main__":
    main()

