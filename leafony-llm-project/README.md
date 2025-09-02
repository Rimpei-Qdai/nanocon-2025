# 🌿 Leafony LLM Project

Leafonyの傾きセンサーをトリガーにしてLLM（大規模言語モデル）を呼び出し、AI生成コンテンツをリアルタイムでWebページに表示するIoTプロジェクトです。

## 📁 プロジェクト構成と各フォルダの役割

```
leafony-llm-project/
├── 📂 arduino/                    
│   └── leafony_tilt_sensor/
│       └── leafony_tilt_sensor.ino
│
├── 📂 gateway/                    
│   ├── serial_gateway.py          
│   └── ble_gateway.py             
│
├── 📂 server/                     
│   ├── 📂 static/
│   │   ├── 📂 css/
│   │   │   └── style.css          
│   │   └── 📂 js/
│   │       └── main.js            
│   ├── 📂 templates/
│   │   └── index.html             
│   ├── llm_client.py              
│   └── main.py                    
│
├── requirements.txt               
└── README.md                      
```

### 📂 arduino/ フォルダ
**役割**: Leafonyデバイスで実行されるファームウェア
- 加速度センサーによる傾きの検知
- 閾値ベースのイベント判定
- シリアル通信またはBLE通信でのデータ送信

### 📂 gateway/ フォルダ
**役割**: Leafonyデバイスとサーバー間のプロトコル変換・中継
- Leafonyからの信号受信
- 受信データの解析・検証
- FastAPIサーバーへのHTTPリクエスト送信

### 📂 server/ フォルダ
**役割**: Webアプリケーションサーバーとしての中核機能
- RESTful API提供
- WebSocket による双方向通信
- LLMとの非同期通信
- HTML/CSS/JavaScript の配信

#### 📂 server/static/ 
**役割**: Webページの静的リソース管理
- **css/**: Webページの視覚的スタイル定義
- **js/**: フロントエンドのJavaScript（WebSocket接続、リアルタイム更新）

#### 📂 server/templates/
**役割**: 動的Webページテンプレート
- **index.html**: LLM応答表示とリアルタイム更新対応UI

#### server/ メインファイル
- **main.py**: FastAPIアプリケーションのエントリーポイント
- **llm_client.py**: LLM API との通信専用モジュール


