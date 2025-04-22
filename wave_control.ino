// 定義可調電阻的腳位
const int POT_PIN = A0;  // 可調電阻連接到 A0

// 用於平滑化讀數的變數
float potSmoothed = 0;
const float SMOOTH_FACTOR = 0.1;  // 平滑係數
float lastSpeed = 0.5;  // 用於速度的平滑變化

void setup() {
  // 初始化序列通訊，鮑率設為 9600
  Serial.begin(9600);
}

void loop() {
  // 讀取可調電阻值
  int potRaw = analogRead(POT_PIN);
  
  // 平滑化讀數
  potSmoothed = potSmoothed * (1 - SMOOTH_FACTOR) + (potRaw / 1023.0) * SMOOTH_FACTOR;
  
  // 計算波浪參數
  float value = potSmoothed;  // 用於控制波浪線的數量和振幅
  float targetSpeed = 0.3 + value * 0.7;  // 速度範圍 0.3-1.0
  lastSpeed = lastSpeed * 0.9 + targetSpeed * 0.1;  // 平滑化速度變化
    // 格式化數據：數值,速度
  Serial.print(value);
  Serial.print(",");
  Serial.println(lastSpeed);
  
  // 短暫延遲以防止數據過載，但保持較快的更新率
  delay(30);
}