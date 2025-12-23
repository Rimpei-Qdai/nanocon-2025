/*
 * Leafony 傾きセンサープログラム
 * 
 * 【このファイルに書くべき内容】
 * - Leafonyの加速度センサーを使って傾きを検知
 * - 傾きが検知されたらシリアル通信で「TILT_DETECTED」を送信
 * - setup()でシリアル通信を初期化
 * - loop()で定期的に加速度センサーの値をチェック
 * - 閾値を超えた変化があった場合にPCに通知
 */
#include <Arduino.h>
#include <SPI.h>
#include <WiFi101Leafony.h>

// WiFi設定（自分の環境に合わせて変更）
char ssid[] = "kitenet";
char pass[] = "5853606354@kitenet";
int status = WL_IDLE_STATUS;
WiFiServer server(80);

// 加速度データ（ここではランダム模擬。実際はセンサー値を取得してください）
float accelX = 0.0, accelY = 0.0, accelZ = 0.0;
bool tiltStatus = false;
unsigned long lastAccelCheck = 0;
const unsigned long ACCEL_CHECK_INTERVAL = 1000; // 1秒間隔

void setup() {
  Serial.begin(115200);
  delay(2000); // while (!Serial) が効かない場合の対策
  Serial.println("Serial test OK");

  Serial.println("Leafony AC08 WiFi Accel Server Starting...");

  // WiFi接続
  Serial.print("Connecting to ");
  Serial.println(ssid);
  while (status != WL_CONNECTED) {
    status = WiFi.begin(ssid, pass);
    Serial.print("WiFi.begin() status: ");
    Serial.println(status);
    delay(5000);
  }
  Serial.println("WiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  server.begin();
}

void loop() {
  // 加速度データ取得（ここではランダム模擬。実際はセンサー値を取得）
  if (millis() - lastAccelCheck > ACCEL_CHECK_INTERVAL) {
    accelX = random(-1000, 1000) / 100.0;
    accelY = random(-1000, 1000) / 100.0;
    accelZ = random(-1000, 1000) / 100.0;
    tiltStatus = (accelZ < 5.0); // Z軸が5.0未満なら傾き検知（例）
    lastAccelCheck = millis();
  }

  WiFiClient client = server.available();
  if (client) {
    String request = "";
    unsigned long timeout = millis() + 2000; // 2秒タイムアウト
    while (client.connected() && millis() < timeout) {
      if (client.available()) {
        char c = client.read();
        request += c;
        if (c == '\n') {
          // JSON APIエンドポイント
          if (request.indexOf("GET /api/accel") >= 0) {
            client.println("HTTP/1.1 200 OK");
            client.println("Content-Type: application/json");
            client.println("Connection: close");
            client.println();
            client.print("{");
            client.print("\"accel_x\":"); client.print(accelX); client.print(",");
            client.print("\"accel_y\":"); client.print(accelY); client.print(",");
            client.print("\"accel_z\":"); client.print(accelZ); client.print(",");
            client.print("\"tilt_status\":\""); client.print(tiltStatus ? "TILT_DETECTED" : "STABLE"); client.print("\",");
            client.print("\"uptime\":"); client.print(millis() / 1000); client.print(",");
            client.print("\"ip_address\":\""); client.print(WiFi.localIP()); client.println("\"}");
            break;
          }
          // 通常のHTMLレスポンス
          client.println("HTTP/1.1 200 OK");
          client.println("Content-Type: text/html");
          client.println("Connection: close");
          client.println();
          client.println("<html><body>");
          client.println("<h1>Leafony AC08 WiFi Accel Server</h1>");
          client.print("<p>Accel X: "); client.print(accelX); client.println("</p>");
          client.print("<p>Accel Y: "); client.print(accelY); client.println("</p>");
          client.print("<p>Accel Z: "); client.print(accelZ); client.println("</p>");
          client.print("<p>Status: "); client.print(tiltStatus ? "TILT_DETECTED" : "STABLE"); client.println("</p>");
          client.print("<p>IP: "); client.print(WiFi.localIP()); client.println("</p>");
          client.println("</body></html>");
          break;
        }
      }
    }
    delay(1);
    client.stop();
  }
}