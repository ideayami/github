// CPU負荷テスト設定ファイル
const CONFIG = {
    // 基本設定
    duration: 3,           // 実行時間（秒）
    threadCount: 16,       // スレッド数
    intensity: 'high',     // 負荷強度（low/medium/high/extreme）

    // 実行設定
    autoStart: true,       // 自動開始するか
    startDelay: 500,       // 開始遅延（ミリ秒）

    // 負荷詳細設定
    cpuBatchSize: 10000,   // CPU計算バッチサイズ
    cpuBatchDuration: 50,  // CPU計算バッチ継続時間（ミリ秒）
    memoryChunkSize: 10000, // メモリ消費チャンクサイズ
    memoryChunkCount: 1000, // メモリ消費チャンク数
    mathIterations: 50000,  // 数学計算反復回数

    // UI設定
    showProgress: true,    // 進捗表示するか
    showDetails: true,     // 詳細情報表示するか
    showSpinner: true,     // スピナー表示するか

    // 完了後設定
    completionMessage: '✅ 負荷テスト完了！', //
    redirectUrl: null,     // 完了後のリダイレクト先（nullで無効）
    redirectDelay: 3,      // リダイレクト遅延（秒）

    // 安全設定
    enableEscapeKey: true, // Escキーによる緊急停止を有効にするか

    // 強度プリセット
    intensityPresets: {
        'low': {
            threadCount: 4,
            cpuBatchSize: 5000,
            memoryChunkCount: 500,
            mathIterations: 25000
        },
        'medium': {
            threadCount: 8,
            cpuBatchSize: 7500,
            memoryChunkCount: 750,
            mathIterations: 37500
        },
        'high': {
            threadCount: 16,
            cpuBatchSize: 10000,
            memoryChunkCount: 1000,
            mathIterations: 50000
        },
        'extreme': {
            threadCount: 20,
            cpuBatchSize: 15000,
            memoryChunkCount: 1500,
            mathIterations: 75000
        }
    }
};

// 強度プリセットの適用
function applyIntensityPreset(intensity) {
    if (CONFIG.intensityPresets[intensity]) {
        const preset = CONFIG.intensityPresets[intensity];
        // ユーザー設定を優先しつつ、プリセットを適用
        CONFIG.threadCount = preset.threadCount;
        Object.assign(CONFIG, preset);
    }
}

// 初期化時に強度プリセットを適用
applyIntensityPreset(CONFIG.intensity);

// 設定の妥当性チェック
function validateConfig() {
    CONFIG.duration = Math.max(CONFIG.duration, 1);
    CONFIG.threadCount = Math.min(Math.max(CONFIG.threadCount, 1), navigator.hardwareConcurrency || 32); // CPUコア数も考慮
    CONFIG.duration = Math.min(CONFIG.duration, 300); // 安全のため最大5分
    return CONFIG;
}

validateConfig();

console.log('CPU負荷テスト設定:', CONFIG);
