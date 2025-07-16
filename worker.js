// CPU負荷用Workerスクリプト
let isRunning = false;
let startTime = 0;
let duration = 0;
let memoryHog = [];
let config = {};

// メインスレッドからのメッセージ処理
onmessage = function(e) {
    const { action, data } = { ...e.data };

    if (action === 'start') {
        isRunning = true;
        startTime = Date.now();
        duration = e.data.duration * 1000;
        config = e.data.config;

        // 複数の負荷処理を同時実行
        intensiveCpuBurn();
        memoryConsumption();
        mathOperations();
        startAdditionalProcesses(); // 'extreme'強度用の追加処理を呼び出し

        postMessage({ type: 'started' });
    } else if (action === 'stop') {
        isRunning = false;
        memoryHog = []; // メモリ解放
        close(); // Workerを閉じる
    }
};

// CPU集約的処理
function intensiveCpuBurn() {
    function burn() {
        if (!isRunning || Date.now() - startTime >= duration) {
            if (isRunning) {
                postMessage({ type: 'completed' });
                isRunning = false;
            }
            return;
        }

        const batchEnd = Date.now() + (config.cpuBatchDuration || 50);
        while (Date.now() < batchEnd) {
            for (let i = 0; i < (config.cpuBatchSize || 10000); i++) {
                Math.pow(Math.random() * 999, Math.random() * 10);
                Math.atan2(Math.random(), Math.random());
            }
        }
        setTimeout(burn, 0); // UIブロックを回避
    }
    burn();
}

// メモリ消費処理
function memoryConsumption() {
    const memInterval = setInterval(() => {
        if (!isRunning) {
            clearInterval(memInterval);
            memoryHog = [];
            return;
        }
        try {
            const chunk = new Array(config.memoryChunkSize || 10000).fill(Math.random());
            memoryHog.push(chunk);
            if (memoryHog.length > (config.memoryChunkCount || 1000)) {
                memoryHog.splice(0, 10); // 古いものから少し解放
            }
        } catch (e) {
            memoryHog.splice(0, memoryHog.length / 2); // エラー時は半分解放
        }
    }, 100);
}

// 数学計算処理
function mathOperations() {
    function calculate() {
        if (!isRunning) return;
        for (let i = 0; i < (config.mathIterations || 50000); i++) {
            const x = Math.random();
            Math.sin(x) * Math.cos(x);
        }
        setTimeout(calculate, 10);
    }
    calculate();
}

// 'extreme'強度用の追加処理
function floatingPointIntensive() {
    function fpCalculate() {
        if (!isRunning) return;
        for (let i = 0; i < 10000; i++) {
            let result = 0;
            for (let j = 0; j < 100; j++) {
                result += Math.sin(i * j) * Math.cos(j * i);
            }
        }
        setTimeout(fpCalculate, 5);
    }
    fpCalculate();
}

function arrayIntensive() {
    function arrayOps() {
        if (!isRunning) return;
        new Array(10000).fill(0).map((_, i) => i).sort(() => Math.random() - 0.5);
        setTimeout(arrayOps, 100);
    }
    arrayOps();
}

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
        message: error.message
    });
};
