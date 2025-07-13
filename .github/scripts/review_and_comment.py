import os
import openai
import requests
import subprocess

# --- 設定 ---
openai.api_key = os.getenv("OPENAI_API_KEY")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
REPO = os.getenv("REPO")
PR_NUMBER = os.getenv("PR_NUMBER")

# ハイブリッドレビュー設定
SMALL_FILE_LIMIT = 500    # 500行以下は全体レビュー
LARGE_FILE_LIMIT = 2000   # 2000行以上はスキップ
MAX_TOKENS = 600          # 無料版を考慮した制限

# --- PR 変更ファイルを取得（差分情報付き） ---
def get_changed_files_with_diff():
    """GitHub API から変更されたファイル一覧と差分情報を取得"""
    api_url = f"https://api.github.com/repos/{REPO}/pulls/{PR_NUMBER}/files"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    print(f"📡 GitHub API 呼び出し: {api_url}")
    response = requests.get(api_url, headers=headers)
    print(f"📊 レスポンス: {response.status_code}")
    
    if response.status_code == 403:
        print("❌ GitHub API 権限エラー - GITHUB_TOKEN の権限を確認してください")
        print("🔧 必要な権限: contents:read, pull-requests:write, issues:write")
        return []
    elif response.status_code != 200:
        print(f"❌ GitHub API エラー: {response.status_code}")
        print(f"📄 レスポンス内容: {response.text}")
        return []
    
    files = response.json()
    print(f"📁 取得されたファイル数: {len(files)}")
    
    target_files = []
    
    for file_info in files:
        filename = file_info["filename"]
        print(f"📄 ファイル: {filename} (ステータス: {file_info['status']})")
        
        if filename.endswith((".py", ".js", ".ts")) and file_info["status"] != "removed":
            target_files.append({
                "filename": filename,
                "additions": file_info.get("additions", 0),
                "deletions": file_info.get("deletions", 0),
                "changes": file_info.get("changes", 0),
                "patch": file_info.get("patch", "")  # 差分情報
            })
    
    return target_files

# --- コメント投稿関数 ---
def post_comment(body):
    """GitHub PR にコメントを投稿"""
    comment_api = f"https://api.github.com/repos/{REPO}/issues/{PR_NUMBER}/comments"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    print(f"💬 コメント投稿中...")
    response = requests.post(comment_api, headers=headers, json={"body": body})
    
    if response.status_code == 201:
        return True
    else:
        print(f"❌ コメント投稿エラー: {response.status_code}")
        print(f"📄 レスポンス内容: {response.text}")
        return False

# --- 行数カウント関数 ---
def count_lines(file_path):
    """ファイルの行数をカウント"""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return len(f.readlines())
    except Exception as e:
        print(f"⚠️ ファイル読み込みエラー ({file_path}): {e}")
        return 99999

# --- 差分のみを抽出 ---
def extract_diff_context(patch):
    """パッチから実際の変更部分を抽出"""
    if not patch:
        return ""
    
    lines = patch.split('\n')
    context_lines = []
    
    for line in lines:
        if line.startswith('@@'):  # 差分のヘッダー
            context_lines.append(line)
        elif line.startswith('+') and not line.startswith('+++'):  # 追加行
            context_lines.append(line)
        elif line.startswith('-') and not line.startswith('---'):  # 削除行
            context_lines.append(line)
        elif line.startswith(' '):  # コンテキスト行
            context_lines.append(line)
    
    return '\n'.join(context_lines)

# --- 全体レビュー（小さいファイル用） ---
def review_full_file(file_path, code_content):
    """ファイル全体をレビュー（500行以下）"""
    file_extension = file_path.split('.')[-1]
    
    prompt = f"""以下のコードをコードレビューしてください。
マークダウン形式で出力してください：

### 問題点
- （問題がない場合は「特になし」と記載）

### 改善提案
- （改善提案がない場合は「特になし」と記載）

### その他コメント
- （その他コメントがない場合は「特になし」と記載）

対象ファイル: {file_path}

```{file_extension}
{code_content}
```"""

    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",  # 無料版考慮
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=MAX_TOKENS
        )
        return response["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"❌ OpenAI API エラー: {e}")
        return None

# --- 差分レビュー（大きいファイル用） ---
def review_diff_only(file_path, diff_content):
    """差分のみをレビュー（500行以上）"""
    file_extension = file_path.split('.')[-1]
    
    prompt = f"""以下は大きなファイルの変更差分です。変更された部分のみをレビューしてください。
マークダウン形式で出力してください：

### 変更部分の問題点
- （問題がない場合は「特になし」と記載）

### 変更部分の改善提案
- （改善提案がない場合は「特になし」と記載）

### その他コメント
- （その他コメントがない場合は「特になし」と記載）

対象ファイル: {file_path}（差分のみレビュー）

```diff
{diff_content}
```"""

    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",  # 無料版考慮
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=MAX_TOKENS
        )
        return response["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"❌ OpenAI API エラー: {e}")
        return None

# --- メイン処理 ---
def main():
    print("🤖 AI ハイブリッドレビューを開始します...")
    
    # 変更ファイルを取得
    changed_files = get_changed_files_with_diff()
    if not changed_files:
        print("📄 レビュー対象のファイルがありません")
        return
    
    print(f"📋 レビュー対象ファイル: {len(changed_files)}件")
    
    # 各ファイルをレビュー
    for file_info in changed_files:
        file_path = file_info["filename"]
        print(f"\n🔍 レビュー中: {file_path}")
        
        # 行数チェック
        line_count = count_lines(file_path)
        
        # 巨大ファイルはスキップ
        if line_count > LARGE_FILE_LIMIT:
            print(f"⚠️ {file_path} は {LARGE_FILE_LIMIT} 行以上 ({line_count}行) なのでスキップ")
            continue
        
        review_result = None
        
        # 小さいファイル：全体レビュー
        if line_count <= SMALL_FILE_LIMIT:
            print(f"📝 全体レビュー実行 ({line_count}行)")
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    code_content = f.read()
                review_result = review_full_file(file_path, code_content)
            except Exception as e:
                print(f"❌ ファイル読み込みエラー ({file_path}): {e}")
                continue
        
        # 大きいファイル：差分レビュー
        else:
            print(f"🔄 差分レビュー実行 ({line_count}行)")
            diff_content = extract_diff_context(file_info["patch"])
            if diff_content:
                review_result = review_diff_only(file_path, diff_content)
            else:
                print(f"⚠️ 差分情報が取得できませんでした: {file_path}")
                continue
        
        # レビュー結果をコメント投稿
        if review_result:
            review_type = "全体レビュー" if line_count <= SMALL_FILE_LIMIT else "差分レビュー"
            comment_body = f"### 💬 AIレビュー：`{file_path}` ({review_type})\n\n{review_result}"
            
            if post_comment(comment_body):
                print(f"✅ コメント投稿完了: {file_path}")
            else:
                print(f"❌ コメント投稿失敗: {file_path}")
        else:
            print(f"❌ レビュー失敗: {file_path}")

if __name__ == "__main__":
    main()
