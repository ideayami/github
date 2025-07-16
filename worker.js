// CPU負荷用Workerスクリプト
let isRunning = false;
let startTime = 0;
let duration = 0;
let memoryHog = [];
let config = {};

// メインスレッドからのメッセージ処理
onmessage = function(e) {
    if (e.data.action === 'start') {
        isRunning = true;
        startTime = Date.now();
        duration = e.data.duration * 1000; // ミリ秒に変換
        config = e.data.config;
        
        // 複数の負荷処理を同時実行
        intensiveCpuBurn();
        memoryConsumption();
        mathOperations();
        
        postMessage({type: 'started'});
    } else if (e.data.action === 'stop') {
        isRunning = false;
        memoryHog = []; // メモリ解放
        postMessage({type: 'stopped'});
    } else if (e.data.action === 'status') {
        postMessage({
            type: 'status',
            memoryUsage: memoryHog.length,
            running: isRunning,
            elapsed: Date.now() - startTime
        });
    }
};

// CPU集約的処理
function intensiveCpuBurn() {
    function burn() {
        if (!isRunning) return;
        
        const currentTime = Date.now();
        if (currentTime - startTime >= duration) {
            isRunning = false;
            memoryHog = []; // メモリ解放
            postMessage({type: 'completed'});
            return;
        }
        
        // 超高負荷処理
        const batchEnd = Date.now() + (config.cpuBatchDuration || 50);
        let iterations = 0;
        
        while (Date.now() < batchEnd && isRunning) {
            for (let i = 0; i < (config.cpuBatchSize || 10000); i++) {
                // 複雑な数学計算
                const x = Math.random() * 999999;
                const y = Math.random() * 100;
                
                Math.pow(x, y);
                Math.sin(i) * Math.cos(i) * Math.tan(i);
                Math.sqrt(i * Math.PI);
                Math.log(x + 1);
                Math.exp(i / 1000);
                Math.atan2(x, y);
                
                iterations++;
            }
        }
        
        // 進捗レポート
        if (iterations > 0) {
            const progress = Math.min(((Date.now() - startTime) / duration) * 100, 100);
            postMessage({
                type: 'progress',
                progress: progress,
                iterations: iterations
            });
        }
        
        // 即座に次の処理を開始
        setTimeout(burn, 0);
    }
    
    burn();
}

// メモリ消費処理
function memoryConsumption() {
    let memoryInterval = setInterval(() => {
        if (!isRunning) {
            clearInterval(memoryInterval);
            return;
        }
        
        try {
            // メモリを段階的に消費
            const chunkCount = Math.min(config.memoryChunkCount || 1000, 100); // 一度に100チャンクまで
            
            for (let i = 0; i < chunkCount; i++) {
                const chunk = new Array(config.memoryChunkSize || 10000);
                
                // 配列を実際のデータで埋める
                for (let j = 0; j < chunk.length; j++) {
                    chunk[j] = Math.random() * 1000000;
                }
                
                memoryHog.push(chunk);
            }
            
            // メモリ使用量が多すぎる場合は一部解放
            if (memoryHog.length > (config.memoryChunkCount || 1000) * 2) {
                memoryHog.splice(0, memoryHog.length / 2);
            }
            
        } catch (e) {
            // メモリ不足の場合は一部クリア
            memoryHog.splice(0, memoryHog.length / 2);
            postMessage({type: 'memory-warning', message: 'メモリ不足により一部解放'});
        }
    }, 100); // 100msごとに実行
}

// 数学計算処理
function mathOperations() {
    function calculate() {
        if (!isRunning) return;
        
        const iterations = config.mathIterations || 50000;
        
        // 複雑な数学計算の連続実行
        for (let i = 0; i < iterations; i++) {
            const x = Math.random() * 1000;
            const y = Math.random() * 1000;
            const z = Math.random() * 1000;
            
            // 三角関数
            Math.sin(x * Math.PI / 180);
            Math.cos(y * Math.PI / 180);
            Math.tan(z * Math.PI / 180);
            
            // 指数・対数関数
            Math.pow(x, y / 1000);
            Math.log(x + 1);
            Math.exp(y / 1000);
            Math.sqrt(z);
            
            // 複素数っぽい計算
            const real = Math.cos(x) * Math.cosh(y) - Math.sin(x) * Math.sinh(y);
            const imag = Math.sin(x) * Math.cosh(y) + Math.cos(x) * Math.sinh(y);
            
            Math.sqrt(real * real + imag * imag);
            Math.atan2(imag, real);
            
            // 文字列操作（CPU負荷追加）
            const str = (x * y * z).toString();
            str.repeat(10);
            str.split('').reverse().join('');
        }
        
        // 継続実行
        setTimeout(calculate, 10);
    }
    
    calculate();
}

// 浮動小数点計算集約処理
function floatingPointIntensive() {
    function fpCalculate() {
        if (!isRunning) return;
        
        // 高精度浮動小数点計算
        for (let i = 0; i < 10000; i++) {
            let result = 0;
            for (let j = 0; j < 1000; j++) {
                result += Math.sin(i * j * Math.PI / 180) * Math.cos(j * i * Math.PI / 180);
                result *= Math.sqrt(i + j + 1);
                result /= (i + j + 1);
            }
            
            // 結果を使用（最適化回避）
            if (result > 1000000) {
                result = result % 1000000;
            }
        }
        
        setTimeout(fpCalculate, 5);
    }
    
    fpCalculate();
}

// 配列操作集約処理
function arrayIntensive() {
    function arrayOps() {
        if (!isRunning) return;
        
        // 大きな配列の操作
        const largeArray = new Array(10000).fill(0).map(() => Math.random() * 1000);
        
        // ソート
        largeArray.sort((a, b) => a - b);
        
        // フィルタ
        const filtered = largeArray.filter(x => x > 500);
        
        // マップ
        const mapped = filtered.map(x => x * x);
        
        // リデュース
        const reduced = mapped.reduce((acc, x) => acc + x, 0);
        
        // 結果を使用（最適化回避）
        if (reduced > 0) {
            postMessage({type: 'array-result', result: reduced});
        }
        
        setTimeout(arrayOps, 100);
    }
    
    arrayOps();
}

// Worker開始時に追加処理も実行
function startAdditionalProcesses() {
    if (config.intensity === 'extreme') {
        floatingPointIntensive();
        arrayIntensive();
    }
}

// エラーハンドリング
onerror = function(error) {
    postMessage({
        type: 'error',
        message: error.message,
        filename: error.filename,
        lineno: error.lineno
    });
};

// 定期的なステータス報告
setInterval(() => {
    if (isRunning) {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / duration) * 100, 100);
        
        postMessage({
            type: 'heartbeat',
            progress: progress,
            elapsed: elapsed,
            memoryChunks: memoryHog.length
        });
    }
}, 500); // 500msごとに報告
