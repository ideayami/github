// メインロジック
let workers = [];
let isRunning = false;
let startTime = 0;
let progressInterval;
let statusInterval;
let completedWorkers = 0;

// DOM要素の取得
function getElements() {
    return {
        status: document.getElementById('status'),
        spinner: document.getElementById('spinner'),
        progressFill: document.getElementById('progressFill'),
        details: document.getElementById('details'),
        container: document.querySelector('.container')
    };
}

// 負荷テスト開始
function startIntensiveLoad() {
    if (isRunning) return;
    
    console.log('CPU負荷テスト開始:', CONFIG);
    
    isRunning = true;
    startTime = Date.now();
    completedWorkers = 0;
    
    const elements = getElements();
    
    // UI更新
    elements.status.textContent = `🔥 CPU全力稼働中... (${CONFIG.duration}秒間)`;
    elements.status.className = 'status loading';
    
    if (CONFIG.showSpinner) {
        elements.spinner.style.display = 'block';
    }
    
    if (CONFIG.showDetails) {
        elements.details.innerHTML = `
            <strong>実行設定:</strong><br>
            実行時間: ${CONFIG.duration}秒<br>
            スレッド数: ${CONFIG.threadCount}<br>
            強度: ${CONFIG.intensity}<br>
            CPU負荷: ${CONFIG.cpuBatchSize}バッチ<br>
            メモリ消費: ${CONFIG.memoryChunkCount}チャンク
        `;
    }
    
    // Workerを作成して開始
    createWorkers();
    
    // 進捗バー更新開始
    if (CONFIG.showProgress) {
        progressInterval = setInterval(updateProgress, 100);
    }
    
    // ステータス監視開始
    statusInterval = setInterval(monitorStatus, 1000);
    
    // メインスレッドでも負荷をかける
    mainThreadLoad();
}

// Workerの作成と開始
function createWorkers() {
    workers = [];
    
    for (let i = 0; i < CONFIG.threadCount; i++) {
        try {
            const worker = new Worker('worker.js');
            
            // メッセージハンドラー設定
            worker.onmessage = function(e) {
                handleWorkerMessage(e.data, i);
            };
            
            // エラーハンドラー設定
            worker.onerror = function(error) {
                console.error(`Worker ${i} エラー:`, error);
                handleWorkerError(error, i);
            };
            
            workers.push(worker);
            
            // Worker開始
            worker.postMessage({
                action: 'start',
                duration: CONFIG.duration,
                config: CONFIG,
                workerId: i
            });
            
        } catch (error) {
            console.error('Worker作成エラー:', error);
        }
    }
    
    console.log(`${workers.length}個のWorkerを作成しました`);
}

// Workerメッセージの処理
function handleWorkerMessage(data, workerId) {
    switch (data.type) {
        case 'started':
            console.log(`Worker ${workerId} 開始`);
            break;
            
        case 'completed':
            completedWorkers++;
            console.log(`Worker ${workerId} 完了 (${completedWorkers}/${CONFIG.threadCount})`);
            
            // 全Worker完了チェック
            if (completedWorkers >= CONFIG.threadCount) {
                setTimeout(() => completeLoad(), 100);
            }
            break;
            
        case 'progress':
            // 進捗情報の処理（必要に応じて）
            break;
            
        case 'heartbeat':
            // ハートビート情報の処理
            updateWorkerStatus(workerId, data);
            break;
            
        case 'memory-warning':
            console.warn(`Worker ${workerId} メモリ警告:`, data.message);
            break;
            
        case 'error':
            console.error(`Worker ${workerId} エラー:`, data);
            break;
            
        default:
            console.log(`Worker ${workerId} メッセージ:`, data);
    }
}

// Workerエラーの処理
function handleWorkerError(error, workerId) {
    console.error(`Worker ${workerId} で予期しないエラー:`, error);
    
    // エラーが発生したWorkerを再起動を試みる
    try {
        if (workers[workerId]) {
            workers[workerId].terminate();
            workers[workerId] = null;
        }
    } catch (e) {
        console.error('Worker終了エラー:', e);
    }
}

// Workerステータスの更新
function updateWorkerStatus(workerId, data) {
    // 必要に応じてUI更新
    if (CONFIG.showDetails && data.progress !== undefined) {
        const elements = getElements();
        elements.details.innerHTML = `
            <strong>実行設定:</strong><br>
            実行時間: ${CONFIG.duration}秒<br>
            スレッド数: ${CONFIG.threadCount}<br>
            強度: ${CONFIG.intensity}<br>
            進捗: ${data.progress.toFixed(1)}%<br>
            経過時間: ${(data.elapsed / 1000).toFixed(1)}秒
        `;
    }
}

// 進捗バーの更新
function updateProgress() {
    if (!isRunning) return;
    
    const currentTime = Date.now();
    const elapsed = currentTime - startTime;
    const progress = Math.min((elapsed / (CONFIG.duration * 1000)) * 100, 100);
    
    const elements = getElements();
    if (elements.progressFill) {
        elements.progressFill.style.width = progress + '%';
    }
    
    // 時間による自動完了
    if (progress >= 100) {
        setTimeout(() => completeLoad(), 100);
    }
}

// ステータス監視
function monitorStatus() {
    if (!isRunning) return;
    
    // 全Workerにステータス要求
    workers.forEach((worker, index) => {
        if (worker) {
            try {
                worker.postMessage({action: 'status'});
            } catch (error) {
                console.error(`Worker ${index} ステータス取得エラー:`, error);
            }
        }
    });
}

// メインスレッドでの負荷処理
function mainThreadLoad() {
    const endTime = Date.now() + (CONFIG.duration * 1000);
    
    function burn() {
        if (!isRunning || Date.now() >= endTime) {
            return;
        }
        
        // メインスレッドでも計算負荷
        for (let i = 0; i < 5000; i++) {
            Math.pow(Math.random() * 1000, Math.random() * 10);
            Math.sin(i * Math.PI / 180);
            Math.cos(i * Math.PI / 180);
            
            // DOM操作で追加負荷
            if (i % 100 === 0) {
                document.body.style.opacity = Math.random() > 0.5 ? '1' : '0.999';
            }
        }
        
        // 継続実行
        setTimeout(burn, 0);
    }
    
    burn();
}

// 負荷テスト完了
function completeLoad() {
    if (!isRunning) return;
    
    console.log('CPU負荷テスト完了');
    
    isRunning = false;
    
    // インターバルをクリア
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    
    if (statusInterval) {
        clearInterval(statusInterval);
        statusInterval = null;
    }
    
    // 全Worker終了
    workers.forEach((worker, index) => {
        if (worker) {
            try {
                worker.postMessage({action: 'stop'});
                worker.terminate();
            
