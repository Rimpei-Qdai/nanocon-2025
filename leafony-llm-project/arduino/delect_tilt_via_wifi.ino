#include <SPI.h>
#include <WiFi101Leafony.h>
#include <TCA9536.h>
#include <Wire.h>

// STM32互換性のため
extern "C" void attachInterruptMultiArch(uint32_t pin, void *chip_isr, uint32_t mode)
{
  void (*_c)(void) = (void (*)(void))(chip_isr);
  attachInterrupt(pin, _c, mode);
}
extern "C" void detachInterruptMultiArch(uint32_t pin)
{
  detachInterrupt(pin);
}

/********************
 * Wi-Fi 設定
 ********************/
char ssid[] = "IODATA-c02b98";
char pass[] = "3326794249484";
int status = WL_IDLE_STATUS;
WiFiServer server(80);

/********************
 * IOエキスパンダー
 ********************/
#define IOEX_CHIP_EN_PIN 0
#define IOEX_WAKE_PIN 1
TCA9536 io = TCA9536(TCA9536A_ADDRESS);

/********************
 * 傾きセンサー用変数
 ********************/
bool tiltStatus = false;
unsigned long lastTiltCheck = 0;
const unsigned long TILT_CHECK_INTERVAL = 1000; // 1秒間隔でチェック

void setup() {
  Serial.begin(115200);
  while (!Serial);

  Serial.println("Leafony STM32 + AC06 WiFi Server Starting...");

  // I2C初期化
  Wire.begin();

  // IOエキスパンダー初期化
  if (io.begin() == false) {
    Serial.println("TCA9536 not detected. Please check AC06 connection.");
    while (1);
  }

  // WiFi用のピンアサインとSPI速度を設定
  WiFi.setPins(D10, D5, A4, -1); // CS=D10, IRQ=D5, RESET_N=A4
  SPI.setClockDivider(SPI_CLOCK_DIV8);

  // I/Oエキスパンダー経由でWi-Fiモジュールを起動
  io.pinMode(IOEX_WAKE_PIN, OUTPUT);
  io.write(IOEX_WAKE_PIN, HIGH);
  io.pinMode(IOEX_CHIP_EN_PIN, OUTPUT);
  io.write(IOEX_CHIP_EN_PIN, HIGH);

  delay(1000); // WiFiモジュール起動待ち

  // Wi-Fiモジュールの存在をチェック
  Serial.print("WiFi101 shield: ");
  if (WiFi.status() == WL_NO_SHIELD) {
    Serial.println("NOT FOUND");
    Serial.println("AC06 WiFiリーフが見つかりません");
    while (true);
  }
  Serial.println("DETECTED");

  // ファームウェアバージョンを表示
  String fv = WiFi.firmwareVersion();
  Serial.print("Firmware version: ");
  Serial.println(fv);

  // Wi-Fiへの接続試行
  Serial.print("Connecting to ");
  Serial.print(ssid);
  Serial.println("...");

  while (status != WL_CONNECTED) {
    status = WiFi.begin(ssid, pass);
    if (status != WL_CONNECTED) {
      Serial.print(".");
      delay(5000);
    }
  }

  // 接続成功
  Serial.println("\nWiFi Connected!");
  
  // Webサーバーを開始
  server.begin();
  
  // 接続情報を表示
  printWiFiStatus();
}

void loop() {
  // 定期的に傾きステータスをチェック（模擬）
  if (millis() - lastTiltCheck > TILT_CHECK_INTERVAL) {
    // ここで実際の傾きセンサー（AC02A）からデータを読み取る
    // 今は模擬的にランダムで傾きを生成
    tiltStatus = random(0, 10) > 7; // 30%の確率で傾き検知
    lastTiltCheck = millis();
  }

  // クライアントからの接続をチェック
  WiFiClient client = server.available();

  if (client) {
    Serial.println("New client connected");
    String currentLine = "";
    String request = "";

    while (client.connected()) {
      if (client.available()) {
        char c = client.read();
        request += c;
        
        if (c == '\n') {
          if (currentLine.length() == 0) {
            // HTTPヘッダーの終わり、レスポンスを送信
            sendHTMLResponse(client);
            break;
          } else {
            currentLine = "";
          }
        } else if (c != '\r') {
          currentLine += c;
        }
      }
    }
    
    delay(1);
    client.stop();
    Serial.println("Client disconnected");
  }
}

void sendHTMLResponse(WiFiClient client) {
  // HTTPレスポンスヘッダー
  client.println("HTTP/1.1 200 OK");
  client.println("Content-Type: text/html; charset=UTF-8");
  client.println("Connection: close");
  client.println("Refresh: 5"); // 5秒ごとに自動更新
  client.println();

  // HTML本文
  client.println("<!DOCTYPE HTML>");
  client.println("<html>");
  client.println("<head>");
  client.println("<title>Leafony STM32 + AC06 Status</title>");
  client.println("<style>");
  client.println("body { font-family: Arial, sans-serif; margin: 40px; }");
  client.println(".status { padding: 20px; border-radius: 10px; margin: 20px 0; }");
  client.println(".normal { background-color: #d4edda; color: #155724; }");
  client.println(".tilt { background-color: #f8d7da; color: #721c24; }");
  client.println("</style>");
  client.println("</head>");
  client.println("<body>");
  
  client.println("<h1>🍃 Leafony IoT Status Dashboard</h1>");
  client.println("<p><strong>構成:</strong> STM32 MCU (AI01A) + WiFi Leaf (AC06)</p>");
  
  // 現在時刻
  client.print("<p><strong>更新時刻:</strong> ");
  client.print(millis() / 1000);
  client.println(" 秒経過</p>");

  // 傾きステータス
  if (tiltStatus) {
    client.println("<div class='status tilt'>");
    client.println("<h2>⚠️ 傾き検知</h2>");
    client.println("<p>デバイスの傾きが検出されました</p>");
    client.println("</div>");
  } else {
    client.println("<div class='status normal'>");
    client.println("<h2>✅ 正常</h2>");
    client.println("<p>デバイスは安定しています</p>");
    client.println("</div>");
  }

  // WiFi情報
  client.println("<h3>📶 WiFi接続情報</h3>");
  client.print("<p>SSID: ");
  client.print(WiFi.SSID());
  client.println("</p>");
  client.print("<p>IP Address: ");
  client.print(WiFi.localIP());
  client.println("</p>");
  client.print("<p>Signal Strength: ");
  client.print(WiFi.RSSI());
  client.println(" dBm</p>");

  client.println("<hr>");
  client.println("<p><small>Powered by Leafony Systems</small></p>");
  client.println("</body>");
  client.println("</html>");
}

void printWiFiStatus() {
  Serial.println("=== WiFi Status ===");
  Serial.print("SSID: ");
  Serial.println(WiFi.SSID());
  
  IPAddress ip = WiFi.localIP();
  Serial.print("IP Address: ");
  Serial.println(ip);
  
  Serial.print("Signal strength (RSSI): ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");
  
  Serial.println("\n=== Web Server Info ===");
  Serial.print("Server URL: http://");
  Serial.println(ip);
  Serial.println("Access the URL in your browser!");
  Serial.println("========================");
}