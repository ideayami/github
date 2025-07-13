import os
import requests
import google.generativeai as genai

# --- 環境変数から情報を取得 ---
try:
    GEMINI_API_KEY = os.environ['GEMINI_API_KEY']
    GITHUB_TOKEN = os.environ['GITHUB_TOKEN']
    GITHUB_REPOSITORY = os.environ['GITHUB_REPOSITORY']
    PR_NUMBER = os.environ['PR_NUMBER']
except KeyError as e:
    print(f"エラー: 環境変数 {e} が設定されていません。")
    exit(1)

# --- Gemini API の設定 ---
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash') # 最新モデルや他のモデルも選択可能

# --- プロンプトの定義 (ここでレビューの内容をカスタマイズ) ---
PROMPT_TEXT = """あなたは経験豊富なシニアソフトウェアエンジニアです。
以下のGitの差分（diff）をレビューし、コードの問題点、改善案、バグの可能性、より良い実装方法などを指摘してください。
指摘は具体的で、なぜそれが問題なのか、どう修正すれば良いのかが明確にわかるように記述してください。
指摘事項がない場合は、その旨を伝えてください。

レビューの形式は以下のMarkdown形式でお願いします。

```markdown
### 🤖 GeminiによるAIレビュー


{ここにレビュー結果を記述}

---
*このレビューはAIによって生成されました。*
