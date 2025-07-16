// グローバル変数
let workers = [];
let isRunning = false;
let startTime = 0;
let progressInterval;
let completedWorkers = 0;

// DOM要素のキャッシュ
const elements = {
    status: document.getElementById('status'),
    spinner: document.getElementById('spinner'),
    progressFill: document.getElementById('progressFill'),
    details: document.getElementById('details'),
    controls: document.getElementById('controls')
};

// 負荷テスト開始
function startIntensiveLoad() {
    if (isRunning) return;

    isRunning = true;
    startTime = Date.now();
    completedWorkers = 0;
    
    // UIをロード状態に更新
    elements.status.textContent = `🔥 CPU全力稼働中... (${CONFIG.duration}秒間)`;
    elements.status.className = 'status loading';
    elements.spinner.style.display = 'block';
    elements.controls.innerHTML = ''; // 開始ボタンを消去
    elements.details.innerHTML = `
        <strong>実行設定:</strong><br>
        実行時間: ${CONFIG.duration}秒<br>
        スレッド数: ${CONFIG.threadCount}<br>
        強度: ${CONFIG.intensity}
    `;

    // Workerを作成して開始
    for (let i = 0; i < CONFIG.threadCount; i++) {
        const worker = new Worker('worker.js');
        worker.onmessage = handleWorkerMessage;
        worker.onerror = (err) => console.error(`Worker ${i} エラー:`, err);
        workers.push(worker);
        worker.postMessage({
            action: 'start',
            duration: CONFIG.duration,
            config: CONFIG
        });
    }

    // 進捗バー更新開始
    progressInterval = setInterval(updateProgress, 100);
    // メインスレッドでも少し負荷をかける
    mainThreadLoad();
}

// Workerからのメッセージを処理
function handleWorkerMessage(e) {
    if (e.data.type === 'completed') {
        completedWorkers++;
        if (completedWorkers >= CONFIG.threadCount) {
            completeLoad();
        }
    }
}

// 進捗バーの更新と時間切れチェック
function updateProgress() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min((elapsed / (CONFIG.duration * 1000)) * 100, 100);
    elements.progressFill.style.width = progress + '%';

    if (progress >= 100) {
        completeLoad();
    }
}

// 負荷テスト完了処理
function completeLoad() {
    if (!isRunning) return;
    isRunning = false;

    clearInterval(progressInterval);
    elements.progressFill.style.width = '100%';

    // 全てのWorkerを停止
    workers.forEach(worker => worker.postMessage({ action: 'stop' }));
    workers = [];

    // UIを完了状態に更新
    elements.spinner.style.display = 'none';
    elements.status.textContent = CONFIG.completionMessage;
    elements.status.className = 'status completed';

    // 設定されていればリダイレクト
    if (CONFIG.redirectUrl) {
        elements.details.innerHTML += `<br>${CONFIG.redirectDelay}秒後にリダイレクトします...`;
        setTimeout(() => {
            window.location.href = CONFIG.redirectUrl;
        }, CONFIG.redirectDelay * 1000);
    }
}

// メインスレッドでの負荷（UIを重くする）
function mainThreadLoad() {
    const endTime = Date.now() + (CONFIG.duration * 1000);
    function burn() {
        if (!isRunning || Date.now() >= endTime) return;
        for (let i = 0; i < 2000; i++) {
            document.body.style.opacity = 1 - (i / 20000); // わずかにDOMを操作
        }
        requestAnimationFrame(burn);
    }
    burn();
}

// Escキーでの緊急停止
function emergencyStop(e) {
    if (e.key === 'Escape' && isRunning) {
        console.warn('緊急停止が実行されました');
        elements.status.textContent = '🛑 緊急停止しました';
        elements.status.className = 'status error';
        completeLoad();
    }
}

// ページの読み込み完了時の処理
window.addEventListener('load', () => {
    if (CONFIG.enableEscapeKey) {
        document.addEventListener('keydown', emergencyStop);
    }

    if (CONFIG.autoStart) {
        setTimeout(startIntensiveLoad, CONFIG.startDelay);
    } else {
        // 手動開始モード
        elements.status.textContent = '準備完了。ボタンを押して開始してください。';
        elements.status.className = 'status';
        elements.spinner.style.display = 'none';
        const startButton = document.createElement('button');
        startButton.textContent = '負荷テスト開始';
        startButton.onclick = startIntensiveLoad;
        elements.controls.appendChild(startButton);
    }
});

// コンソールから操作するためのAPI
window.cpuLoadTest = {
    start: startIntensiveLoad,
    stop: completeLoad,
    status: () => ({ running: isRunning })
};
