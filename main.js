// 獲取 Canvas 元素和上下文
const canvas = document.getElementById('waveCanvas');
const ctx = canvas.getContext('2d');

// Serial 通訊變數
let port;
let reader;
let inputDone;
let inputStream;

// 設置畫布尺寸和設備像素比
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0); // 先重設 transform
    ctx.scale(dpr, dpr);
}

// 初始化設置
let animationFrameId;
let time = 0;

// 波形參數
const params = {
    baseAmplitude: 50,
    frequency: 0.002,
    speed: 0.002,
    lineWidth: 2,
    lines: 1,
    colorHue: 0,
    colorSaturation: 70,
    colorLightness: 60
};

// 更新參數
function updateParams(value, speed) {
    // 根據輸入值調整波浪線的數量和振幅
    let lines = Math.floor(value * 8) + 1;
    if (!Number.isFinite(lines) || lines < 1) lines = 1;
    params.lines = lines; // 1-9條線
    params.baseAmplitude = 20 + value * 80; // 振幅範圍20-100
    params.speed = speed * 0.003;
    // 更新顏色
    params.colorHue = (value * 360) % 360; // 根據輸入值改變顏色
}

// 繪製波浪線
function drawWave(offset) {
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;
    
    ctx.beginPath();
    ctx.lineWidth = params.lineWidth;
    
    // 使用 HSL 顏色以產生漸變效果
    const hue = (params.colorHue + offset * 30) % 360;
    ctx.strokeStyle = `hsla(${hue}, ${params.colorSaturation}%, ${params.colorLightness}%, 0.6)`;
    
    for (let x = 0; x < width; x++) {
        const y = Math.sin(x * params.frequency + time + offset) * params.baseAmplitude + height / 2;
        if (x === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    
    ctx.stroke();
}

// 連接 Arduino
async function connectToArduino() {
    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });
        
        const decoder = new TextDecoder();
        inputDone = false;
        inputStream = port.readable.getReader();
        
        document.getElementById('connectButton').textContent = '已連接';
        document.getElementById('connectButton').style.backgroundColor = '#28a745';
        
        while (!inputDone) {
            const { value, done } = await inputStream.read();
            if (done) {
                inputDone = true;
                break;
            }
            const data = decoder.decode(value);
            // 解析 Arduino 數據並更新參數
            const values = data.trim().split(',');
            if (values.length === 2) {
                const v = parseFloat(values[0]);
                const s = parseFloat(values[1]);
                if (Number.isFinite(v) && Number.isFinite(s)) {
                    document.getElementById('complexityValue').textContent = Math.floor(v * 8) + 1;
                    document.getElementById('speedValue').textContent = s.toFixed(2);
                    updateParams(v, s);
                    lastUpdateTime = Date.now();
                } else {
                    // 若資料異常則忽略
                    console.warn('收到異常資料:', data);
                }
            }
        }
    } catch (error) {
        console.error('連接 Arduino 時發生錯誤:', error);
        document.getElementById('connectButton').textContent = '重新連接';
        document.getElementById('connectButton').style.backgroundColor = '#dc3545';
        // 清理之前的連接
        if (reader) {
            reader.cancel();
        }
        if (inputStream) {
            inputStream.cancel();
        }
        if (port) {
            port.close();
        }
    }
}

let lastUpdateTime = Date.now();
let fallbackTimeout = 1000; // 1秒沒資料就恢復預設

// 動畫循環
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 防呆：確保 lines 合法
    let lines = params.lines;
    if (!Number.isFinite(lines) || lines < 1) lines = 1;
    for (let i = 0; i < lines; i++) {
        const offset = (i * Math.PI * 2) / lines;
        drawWave(offset);
    }
    // 若超過1秒沒收到資料，自動恢復預設動畫
    if (Date.now() - lastUpdateTime > fallbackTimeout) {
        updateParams(0.5, 0.5);
    }
    time += params.speed;
    animationFrameId = requestAnimationFrame(animate);
}

// 初始化
document.getElementById('connectButton').addEventListener('click', connectToArduino);
resizeCanvas();
updateParams(1, 0.5); // 設置初始值
animate();

// 監聽視窗大小變化
window.addEventListener('resize', () => {
    resizeCanvas();
});
