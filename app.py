from flask import Flask, request, render_template_string

app = Flask(__name__)

# index.html をファイルとして読み込んでテンプレートとして使う
@app.route('/', methods=['GET', 'POST'])
def index():
    name = None
    if request.method == 'POST':
        name = request.form.get('username')

    with open('index.html', encoding='utf-8') as f:
        html = f.read()

    return render_template_string(html, name=name)

if __name__ == '__main__':
    app.run(debug=True)

