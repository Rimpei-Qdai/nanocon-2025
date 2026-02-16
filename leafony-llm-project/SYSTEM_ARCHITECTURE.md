# 🌿 Leafony LLM Project システム構成

## 📋 プロジェクト概要

Leafonyの傾きセンサーをトリガーにしてLLM（大規模言語モデル）を呼び出し、AI生成コンテンツをリアルタイムでWebページに表示する教材・学習管理プラットフォーム。IoTデバイスとWebアプリケーションを統合した次世代学習システム。

**プロジェクト名**: Leafony LLM Project  
**バージョン**: 0.8.0  
**作成日**: 2025年11月27日

---

## 🏗️ システムアーキテクチャ

```
┌─────────────────┐
│  Leafony IoT    │ (Arduino)
│  傾きセンサー    │
└────────┬────────┘
         │ シリアル/BLE通信
         ↓
┌─────────────────┐
│    Gateway      │ (Python)
│  プロトコル変換  │
└────────┬────────┘
         │ HTTP POST
         ↓
┌─────────────────┐
│  FastAPI Server │ (Python)
│   + WebSocket   │
└────┬───────┬────┘
     │       │
     │       └─────→ LLM API (OpenAI/Gemini)
     │
     ↓ WebSocket
┌─────────────────┐
│  Next.js        │ (React/TypeScript)
│  フロントエンド  │
└─────────────────┘
```

### アーキテクチャの特徴

- **4層構造**: IoT層、Gateway層、Server層、Frontend層で明確に分離
- **非同期通信**: WebSocketによるリアルタイム双方向通信
- **マイクロサービス指向**: 各コンポーネントが独立して動作可能
- **拡張性**: 新しいセンサーやLLMの追加が容易

---

## 🔧 技術スタック

### 1️⃣ Arduino（Leafony IoT デバイス）

**役割**: 物理センサーからのデータ取得とトリガー検知

**技術スタック**:
- Arduino C++
- 加速度センサー（傾き検知）
- シリアル通信（USB経由）
- BLE通信（オプション）

**ファイル構成**:
```
arduino/
└── leafony_tilt_sensor/
    └── leafony_tilt_sensor.ino
```

**主な処理**:
1. センサー値の連続監視
2. 閾値ベースの傾き判定
3. イベント発生時のデータ送信（シリアル/BLE）
4. デバッグ情報の出力

**実装予定機能**:
- 加速度センサー初期化
- `setup()`: シリアル通信の初期化
- `loop()`: 定期的なセンサー値チェック
- 閾値を超えた変化の検知と通知

---

### 2️⃣ Gateway（Python）

**役割**: IoTデバイスとWebサーバー間のプロトコル変換・中継

**技術スタック**:
- Python 3.x
- `pyserial` - シリアル通信
- `bleak` - BLE通信（オプション）
- `requests` - HTTP通信

**ファイル構成**:
```
gateway/
├── serial_gateway.py    # シリアル通信版
└── ble_gateway.py       # BLE通信版（オプション）
```

**主な処理フロー**:

#### serial_gateway.py
1. シリアルポートの自動検出または設定
2. 連続的なデータ受信監視
3. "TILT_DETECTED" メッセージの認識
4. FastAPI serverへHTTPリクエスト送信

```python
# 処理イメージ
while True:
    data = serial.readline()
    if "TILT_DETECTED" in data:
        requests.post("http://localhost:8000/api/trigger-llm", json={...})
```

#### ble_gateway.py（オプション）
1. BLEデバイスのスキャンと接続
2. Leafonyからの特性値変化の監視
3. データ解析と傾き判定
4. FastAPI serverへのHTTP通知

---

### 3️⃣ Server（FastAPI）

**役割**: Webアプリケーションのバックエンド・API提供

**技術スタック**:
- **FastAPI 0.104.1** - 高速Webフレームワーク
- **Uvicorn 0.22.0** - ASGIサーバー（WebSocketサポート）
- **WebSockets 15.0.1** - リアルタイム双方向通信
- **Pydantic 2.5.0** - データバリデーション
- **Jinja2 3.1.2** - HTMLテンプレートエンジン
- **python-dotenv 1.0.0** - 環境変数管理
- **aiofiles 23.2.1** - 非同期ファイル操作

**ファイル構成**:
```
server/
├── main.py          # FastAPIアプリケーション（メイン）
├── llm_client.py    # LLM API通信モジュール
└── firebase.py      # Firebase連携（未実装）
```

**主要エンドポイント**:

| エンドポイント | メソッド | 説明 | リクエスト/レスポンス |
|-------------|---------|------|---------------------|
| `/` | GET | ヘルスチェック | `{"status": "running"}` |
| `/api/materials` | GET | 教材一覧取得 | `List[MaterialItem]` |
| `/api/materials/{id}` | GET | 特定教材取得 | `MaterialItem` |
| `/api/materials/{id}/children` | GET | 子要素取得 | `List[MaterialItem]` |
| `/api/navigate` | POST | ページ移動制御 | `NavigationRequest` |
| `/api/realtime` | POST | Realtime API制御 | `RealtimeConnectionRequest` |
| `/api/trigger-llm` | POST | IoTトリガー受信 | `dict` |
| `/api/ui-control` | POST | UI制御 | `UIControlRequest` |
| `/api/ui-control/status` | GET | UI状態取得 | ステータス情報 |
| `/ws/{user_id}` | WebSocket | リアルタイム通信 | WebSocketメッセージング |

**データモデル（Pydantic）**:

```python
class MaterialItem(BaseModel):
    id: str
    name: str
    type: str  # "file" or "directory"
    path: str
    parent_id: Optional[str]
    content: Optional[str]
    created_at: str
    updated_at: str

class UIControlRequest(BaseModel):
    action: str  # "navigate", "scroll", "highlight", "show_popup"
    user_id: str
    target: Optional[str]
    direction: Optional[str]
    data: Optional[Dict[str, Any]]
```

**WebSocket機能**:
- **ConnectionManager**: クライアント接続管理
- **ユーザー別メッセージング**: 特定ユーザーへの通知
- **ブロードキャスト配信**: 全クライアントへの一斉配信
- **UI制御イベント配信**: リアルタイムUI操作

**CORS設定**:
```python
allow_origins=["http://localhost:3000"]  # Next.js
allow_credentials=True
allow_methods=["*"]
allow_headers=["*"]
```

**LLM統合（llm_client.py）**:

実装予定機能:
- OpenAI GPT API または Google Gemini API との通信
- プロンプトの構築と送信
- APIレスポンスの解析と整形
- エラーハンドリング（API制限、ネットワークエラー）
- 環境変数での設定管理（APIキー、モデル名等）

---

### 4️⃣ Frontend（Next.js）

**役割**: Webユーザーインターフェース

**技術スタック**:
- **Next.js 15.5.4** - Reactフレームワーク
- **React 19.1.0** - UIライブラリ
- **TypeScript 5.x** - 型安全な開発
- **Tailwind CSS 4** - ユーティリティファーストCSS
- **ESLint 9** - コード品質管理
- **WebSocket** - リアルタイム通信

**ディレクトリ構造**:
```
frontend/
├── src/
│   ├── pages/
│   │   ├── index.tsx          # ホームページ（ナレッジマップ）
│   │   ├── _app.tsx           # Appコンポーネント
│   │   ├── _document.tsx      # Documentコンポーネント
│   │   ├── api/
│   │   │   └── hello.ts       # APIルート
│   │   └── learn/
│   │       └── [id].tsx       # 学習ページ（動的ルート）
│   ├── components/
│   │   └── UIController.tsx   # UI制御コンポーネント
│   └── styles/
│       └── globals.css        # グローバルスタイル
├── public/                    # 静的ファイル
├── package.json              # 依存関係管理
├── tsconfig.json             # TypeScript設定
├── next.config.ts            # Next.js設定
├── postcss.config.mjs        # PostCSS設定
└── eslint.config.mjs         # ESLint設定
```

**主要機能**:

#### 1. ホームページ（index.tsx）
- 教材ナレッジマップ表示（階層構造の可視化）
- サーバー接続ステータス表示
- 教材統計情報（カテゴリ数、コース数、レッスン数）
- ダークモード対応
- API接続テスト機能

**ナレッジマップの構造**:
```
ルート（Leafony LLM）
  │
  ├─ カテゴリ1（プログラミング基礎）
  │    ├─ JavaScript基礎
  │    │    ├─ 1. 変数と型
  │    │    ├─ 2. 関数
  │    │    └─ 3. オブジェクト
  │    └─ Python基礎
  │         ├─ 1. Python入門
  │         └─ 2. データ型とコレクション
  │
  ├─ カテゴリ2（Web開発）
  │    ├─ React入門
  │    │    ├─ 1. Reactとは
  │    │    ├─ 2. コンポーネント
  │    │    └─ 3. React Hooks
  │    └─ Next.js実践
  │
  └─ カテゴリ3（データサイエンス）
```

#### 2. 学習ページ（learn/[id].tsx）
- Markdown形式のコンテンツ表示
- 前後のレッスンへのナビゲーション
- 階層的なパンくずリスト
- WebSocket経由のリアルタイム制御受信

#### 3. UIコントローラー（UIController.tsx）
- WebSocket接続管理
- UI制御メッセージの受信と実行
- ページナビゲーション制御
- ポップアップ表示
- 要素ハイライト機能

**TypeScript型定義**:
```typescript
interface MaterialItem {
  id: string;
  name: string;
  type: 'file' | 'directory';
  path: string;
  parent_id: string | null;
  content: string | null;
  created_at: string;
  updated_at: string;
}
```

---

## 📊 データフロー

### 1. IoTトリガーフロー（傾き検知）

```
┌────────────────────────────────────────────────────────────┐
│ 1. Leafony傾き検知                                          │
│    - 加速度センサーが閾値超えを検知                          │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────────┐
│ 2. シリアル/BLE送信                                          │
│    - "TILT_DETECTED" メッセージ送信                         │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────────┐
│ 3. Gateway受信                                              │
│    - serial_gateway.py または ble_gateway.py で受信         │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────────┐
│ 4. HTTP POST → FastAPI                                     │
│    - POST /api/trigger-llm                                 │
│    - {"sensor": "tilt", "timestamp": "..."}                │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────────┐
│ 5. LLM API呼び出し                                          │
│    - llm_client.py が OpenAI/Gemini を呼び出し              │
│    - プロンプト: "傾きが検知されました。面白いコメントを..."  │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────────┐
│ 6. WebSocket → フロントエンド                               │
│    - 全クライアントまたは特定ユーザーに配信                  │
│    - {"type": "sensor_trigger", "data": {...}}             │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────────┐
│ 7. UI更新                                                   │
│    - LLM生成コンテンツの表示                                │
│    - アニメーション効果                                      │
└────────────────────────────────────────────────────────────┘
```

### 2. UI制御フロー（外部操作）

```
┌────────────────────────────────────────────────────────────┐
│ 1. 外部クライアント                                          │
│    - Postman、IoTデバイス、スクリプト等                      │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────────┐
│ 2. HTTP POST → FastAPI                                     │
│    - POST /api/ui-control                                  │
│    - {"action": "navigate", "direction": "next"}           │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────────┐
│ 3. WebSocketメッセージ生成                                  │
│    - アクションに応じたメッセージ構築                        │
│    - {"type": "ui_control", "action": "...", "data": {...}}│
└────────────────┬───────────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────────┐
│ 4. メッセージ配信                                           │
│    - 特定ユーザー: manager.send_personal_message()          │
│    - ブロードキャスト: manager.broadcast()                  │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────────┐
│ 5. フロントエンドでイベント受信                              │
│    - WebSocketハンドラーで受信                              │
│    - useEffect内でメッセージ処理                            │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────────┐
│ 6. アクション実行                                           │
│    - navigate: router.push()                               │
│    - scroll: window.scrollTo()                             │
│    - highlight: element.classList.add()                    │
│    - show_popup: モーダル表示                               │
└────────────────────────────────────────────────────────────┘
```

### 3. 教材閲覧フロー

```
┌────────────────────────────────────────────────────────────┐
│ 1. フロントエンドからリクエスト                              │
│    - useEffect(() => { fetch('/api/materials') }, [])      │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────────┐
│ 2. FastAPI処理                                              │
│    - GET /api/materials                                    │
│    - sample_materials配列をフィルタリング                   │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────────┐
│ 3. JSON応答                                                 │
│    - List[MaterialItem]をシリアライズして返却               │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────────┐
│ 4. React State更新                                          │
│    - setMaterials(data)                                    │
│    - setLoading(false)                                     │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────────┐
│ 5. UIレンダリング                                           │
│    - ナレッジマップの階層表示                               │
│    - カテゴリ → コース → レッスンの構造化                    │
└────────────────────────────────────────────────────────────┘
```

---

## 🔌 通信プロトコル詳細

### 1. シリアル通信（Arduino ↔ Gateway）

**仕様**:
- **ボーレート**: 9600 または 115200
- **データビット**: 8
- **パリティ**: なし
- **ストップビット**: 1
- **フロー制御**: なし

**メッセージフォーマット**:
```
TILT_DETECTED\n
SENSOR_VALUE:x=1.23,y=0.45,z=9.81\n
ERROR:sensor_init_failed\n
```

**実装例（Python側）**:
```python
import serial
ser = serial.Serial('/dev/ttyUSB0', 9600, timeout=1)
while True:
    line = ser.readline().decode('utf-8').strip()
    if line == "TILT_DETECTED":
        # 処理
```

---

### 2. BLE通信（オプション）

**仕様**:
- **プロトコル**: Bluetooth Low Energy 4.0+
- **ライブラリ**: Bleak（Python）
- **サービスUUID**: 要定義
- **キャラクタリスティックUUID**: 要定義

**実装イメージ**:
```python
import asyncio
from bleak import BleakScanner, BleakClient

async def scan_devices():
    devices = await BleakScanner.discover()
    for device in devices:
        if "Leafony" in device.name:
            await connect_device(device.address)

async def notification_handler(sender, data):
    if b"TILT" in data:
        # 処理
```

---

### 3. HTTP/REST API

**仕様**:
- **プロトコル**: HTTP/1.1
- **コンテンツタイプ**: application/json
- **認証**: なし（開発環境）/ Bearer Token（本番環境）
- **エラーハンドリング**: HTTPステータスコード

**リクエスト例**:
```http
POST /api/ui-control HTTP/1.1
Host: localhost:8000
Content-Type: application/json

{
  "action": "navigate",
  "user_id": "default",
  "direction": "home"
}
```

**レスポンス例**:
```json
{
  "action": "navigate",
  "user_id": "default",
  "target": null,
  "direction": "home",
  "status": "success",
  "timestamp": "2025-11-27T12:34:56.789Z",
  "message_sent": true
}
```

---

### 4. WebSocket

**エンドポイント**: `ws://localhost:8000/ws/{user_id}`

**接続フロー**:
```
Client → Server: WebSocket Upgrade Request
Server → Client: 101 Switching Protocols
Server → Client: {"type": "connection_confirmed", ...}
Client ↔ Server: 双方向メッセージング
Client → Server: "ping"
Server → Client: {"type": "pong", ...}
```

**メッセージ形式**:
```json
{
  "type": "ui_control",
  "action": "navigate_to_page",
  "data": {
    "page": "learn",
    "url": "/learn/react-intro",
    "material_id": "react-intro"
  }
}
```

**メッセージタイプ一覧**:
- `connection_confirmed`: 接続確認
- `ui_control`: UI制御
- `navigation`: ページ移動
- `sensor_trigger`: センサートリガー
- `realtime_status`: Realtime API状態
- `pong`: ping応答

---

## 🎯 UI制御機能

外部からのAPI経由でフロントエンドをリモート制御可能。

### 利用可能なアクション

| アクション | 説明 | パラメータ | 使用例 |
|-----------|------|-----------|--------|
| `navigate` | ページ移動 | `direction`: home/next/prev<br>`target`: material_id | ホームに戻る、次のレッスンへ |
| `highlight` | 要素ハイライト | `target`: CSS selector<br>`data`: {color} | 重要な箇所を強調表示 |
| `show_popup` | ポップアップ表示 | `data`: {message, type} | 通知、警告、エラーメッセージ |
| `scroll` | スクロール制御 | `direction`: up/down/top/bottom<br>`target`: selector | 特定セクションへスクロール |

### API呼び出し例

#### 1. ホームページへ移動
```bash
curl -X POST http://localhost:8000/api/ui-control \
  -H "Content-Type: application/json" \
  -d '{
    "action": "navigate",
    "user_id": "default",
    "direction": "home"
  }'
```

#### 2. 特定の教材へ移動
```bash
curl -X POST http://localhost:8000/api/ui-control \
  -H "Content-Type: application/json" \
  -d '{
    "action": "navigate",
    "user_id": "default",
    "target": "react-intro"
  }'
```

#### 3. ポップアップ表示
```bash
curl -X POST http://localhost:8000/api/ui-control \
  -H "Content-Type: application/json" \
  -d '{
    "action": "show_popup",
    "user_id": "default",
    "data": {
      "message": "新しい教材が追加されました！",
      "type": "success"
    }
  }'
```

#### 4. 要素ハイライト
```bash
curl -X POST http://localhost:8000/api/ui-control \
  -H "Content-Type: application/json" \
  -d '{
    "action": "highlight",
    "user_id": "default",
    "target": "#important-section",
    "data": {
      "color": "yellow"
    }
  }'
```

#### 5. スクロール制御
```bash
curl -X POST http://localhost:8000/api/ui-control \
  -H "Content-Type: application/json" \
  -d '{
    "action": "scroll",
    "user_id": "default",
    "direction": "top"
  }'
```

### Postmanコレクション

プロジェクトルートに `Leafony_UI_Control.postman_collection.json` が含まれており、全てのAPI呼び出しをテストできます。

---

## 📦 依存パッケージ詳細

### Python（requirements.txt）

```python
# ==========================================
# FastAPI Server関連
# ==========================================
fastapi==0.104.1          # 高速Webフレームワーク
uvicorn[standard]==0.22.0  # ASGI Webサーバー（WebSocketサポート付き）
jinja2==3.1.2             # HTMLテンプレートエンジン
websockets==15.0.1        # WebSocket通信ライブラリ

# ==========================================
# Gateway関連
# ==========================================
pyserial==3.5             # シリアル通信
requests==2.31.0          # HTTP通信
bleak==0.21.1             # BLE通信（オプション）

# ==========================================
# LLM Client関連（どちらか選択）
# ==========================================
openai==1.3.0             # OpenAI GPT API
# google-generativeai==0.3.0  # Google Gemini API

# ==========================================
# ユーティリティ
# ==========================================
python-dotenv==1.0.0      # 環境変数管理
pydantic==2.5.0           # データ検証
aiofiles==23.2.1          # 非同期ファイル操作

# ==========================================
# 開発・デバッグ用（オプション）
# ==========================================
# pytest==7.4.3          # テストフレームワーク
# black==23.11.0          # コードフォーマッター
# flake8==6.1.0           # リンター
```

### Node.js（package.json）

```json
{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "next": "15.5.4"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@tailwindcss/postcss": "^4",
    "tailwindcss": "^4",
    "eslint": "^9",
    "eslint-config-next": "15.5.4",
    "@eslint/eslintrc": "^3"
  }
}
```

---

## 🚀 起動手順

### 前提条件

- Python 3.8+
- Node.js 18+
- Arduino IDE（Leafony開発用）
- USB/BLE接続可能なLeafonyデバイス（オプション）

### 環境構築

#### 1. リポジトリクローン
```bash
git clone https://github.com/Rimpei-Qdai/nanocon-2025.git
cd nanocon-2025/leafony-llm-project
```

#### 2. Python環境セットアップ
```bash
# 仮想環境作成（推奨）
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 依存パッケージインストール
pip install -r requirements.txt
```

#### 3. Node.js環境セットアップ
```bash
cd frontend
npm install
cd ..
```

#### 4. 環境変数設定
```bash
# .env ファイル作成
cat > .env << EOF
# LLM API設定
OPENAI_API_KEY=your_openai_api_key_here
# GOOGLE_API_KEY=your_google_api_key_here

# サーバー設定
SERVER_HOST=0.0.0.0
SERVER_PORT=8000

# フロントエンド設定
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF
```

### サービス起動

#### ターミナル1: FastAPIサーバー起動
```bash
cd server
python main.py

# 起動確認
# ✅ Uvicorn running on http://0.0.0.0:8000
# ✅ Application startup complete
```

#### ターミナル2: Next.jsフロントエンド起動
```bash
cd frontend
npm run dev

# 起動確認
# ✅ ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

#### ターミナル3: Gateway起動（オプション）
```bash
cd gateway
python serial_gateway.py

# または BLE版
python ble_gateway.py
```

#### ターミナル4: Arduino開発（オプション）
```bash
# Arduino IDEで arduino/leafony_tilt_sensor/leafony_tilt_sensor.ino を開く
# Leafonyボードを選択してアップロード
```

### 動作確認

1. **サーバー確認**: http://localhost:8000
2. **フロントエンド確認**: http://localhost:3000
3. **API Docs**: http://localhost:8000/docs （FastAPI自動生成）
4. **WebSocket接続**: ブラウザコンソールでWebSocket接続確認

---

## 🔐 セキュリティ考慮事項

### 開発環境

| 項目 | 設定 | 理由 |
|------|------|------|
| CORS | localhost:3000のみ許可 | 開発時の利便性 |
| WebSocket認証 | user_id ベース | シンプルな実装 |
| API Key管理 | .env ファイル | Git管理外で秘密情報保護 |
| HTTPS | 未使用 | ローカル開発環境 |

### 本番環境での推奨事項

1. **認証・認可**
   - JWT（JSON Web Token）の導入
   - OAuth 2.0 / OpenID Connect
   - ユーザーセッション管理

2. **通信の暗号化**
   - HTTPS（TLS 1.3）の必須化
   - WSS（WebSocket over TLS）
   - 証明書の適切な管理

3. **API保護**
   - レート制限（Rate Limiting）
   - API Keyのローテーション
   - IPアドレス制限

4. **データ保護**
   - 入力値のサニタイゼーション
   - SQLインジェクション対策（将来のDB導入時）
   - XSS（Cross-Site Scripting）対策

5. **ログ・監視**
   - アクセスログの記録
   - エラートラッキング（Sentry等）
   - パフォーマンス監視

6. **環境変数管理**
   - AWS Secrets Manager
   - Google Cloud Secret Manager
   - HashiCorp Vault

---

## 📈 今後の拡張予定

### 短期（Phase 1）

- [ ] **Arduino実装**
  - 傾きセンサープログラムの完成
  - シリアル通信の実装
  - BLE通信対応

- [ ] **LLM統合**
  - `llm_client.py` の実装
  - OpenAI GPT-4 / Gemini Pro の統合
  - プロンプトエンジニアリング

- [ ] **Firebase連携**
  - Firestore でのデータ永続化
  - Firebase Authentication
  - リアルタイムデータベース

### 中期（Phase 2）

- [ ] **教材管理強化**
  - Markdown エディター統合
  - ファイルアップロード機能
  - 教材のバージョン管理

- [ ] **学習進捗トラッキング**
  - ユーザーごとの進捗管理
  - 学習統計の可視化
  - 達成度バッジシステム

- [ ] **コラボレーション機能**
  - コメント・質問機能
  - リアルタイムコラボレーション
  - メンター・生徒システム

### 長期（Phase 3）

- [ ] **AI機能拡張**
  - パーソナライズされた学習推奨
  - 自動課題生成
  - コード自動レビュー

- [ ] **マルチデバイス対応**
  - モバイルアプリ（React Native）
  - タブレット最適化
  - オフライン対応

- [ ] **スケーラビリティ**
  - マイクロサービス化
  - Kubernetes デプロイ
  - CDN統合

---

## 🧪 テスト戦略

### 単体テスト（Unit Tests）

**Python**:
```bash
# pytest でのテスト実行
pytest server/tests/

# カバレッジ測定
pytest --cov=server server/tests/
```

**TypeScript/React**:
```bash
# Jest でのテスト実行
cd frontend
npm test

# カバレッジ測定
npm test -- --coverage
```

### 統合テスト（Integration Tests）

- FastAPI + WebSocket の統合テスト
- Gateway → Server の通信テスト
- Frontend → Backend の API呼び出しテスト

### E2Eテスト（End-to-End Tests）

**Playwright/Cypress**:
```bash
# E2Eテストシナリオ例
1. ホームページにアクセス
2. 教材をクリック
3. コンテンツが表示されることを確認
4. 次のレッスンに移動
5. WebSocketメッセージ受信を確認
```

### パフォーマンステスト

- **負荷テスト**: Locust / k6 を使用
- **WebSocket負荷**: 同時接続数テスト
- **レスポンスタイム**: 各APIエンドポイントの測定

---

## 📊 監視・ロギング

### ログレベル

```python
# Python logging設定例
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)
logger.info("Server started")
logger.error("Error occurred", exc_info=True)
```

### メトリクス収集

- **アプリケーションメトリクス**
  - リクエスト数/秒
  - レスポンスタイム
  - エラーレート

- **システムメトリクス**
  - CPU使用率
  - メモリ使用率
  - ディスクI/O

- **ビジネスメトリクス**
  - アクティブユーザー数
  - 教材閲覧数
  - LLM API呼び出し回数

---

## 🛠️ トラブルシューティング

### よくある問題

#### 1. サーバーが起動しない
```bash
# ポート8000が使用中の場合
lsof -i :8000
kill -9 <PID>

# または別のポートを使用
uvicorn main:app --port 8001
```

#### 2. WebSocket接続エラー
```javascript
// ブラウザコンソールで確認
// WebSocket connection to 'ws://localhost:8000/ws/default' failed

// CORS設定を確認
// FastAPI側で allow_origins に localhost:3000 が含まれているか確認
```

#### 3. 教材が表示されない
```bash
# サーバーログ確認
# ✅ "GET /api/materials HTTP/1.1" 200 OK

# ネットワークタブ確認（DevTools）
# Status: 200, Response: [{"id": "...", ...}]

# React State確認
console.log(materials)
```

#### 4. シリアル通信が動作しない
```bash
# シリアルポート確認（macOS/Linux）
ls /dev/tty.*

# 権限エラーの場合
sudo chmod 666 /dev/ttyUSB0

# Windows
# デバイスマネージャーでCOMポート確認
```

---

## 📚 参考資料

### 公式ドキュメント

- [FastAPI](https://fastapi.tiangolo.com/)
- [Next.js](https://nextjs.org/docs)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript](https://www.typescriptlang.org/docs/)
- [Arduino](https://www.arduino.cc/reference/en/)

### ライブラリドキュメント

- [pyserial](https://pyserial.readthedocs.io/)
- [bleak](https://bleak.readthedocs.io/)
- [WebSockets](https://websockets.readthedocs.io/)
- [Pydantic](https://docs.pydantic.dev/)

### チュートリアル

- [FastAPI WebSocket Tutorial](https://fastapi.tiangolo.com/advanced/websockets/)
- [Next.js Dynamic Routes](https://nextjs.org/docs/routing/dynamic-routes)
- [React Hooks Guide](https://react.dev/reference/react)

---

## 👥 コントリビューション

### 開発フロー

1. **Issue作成**: 機能要望やバグ報告
2. **ブランチ作成**: `feature/機能名` または `fix/バグ名`
3. **開発**: コード実装とテスト
4. **Pull Request**: レビュー依頼
5. **マージ**: developmentブランチへ

### コーディング規約

**Python**:
- PEP 8 準拠
- Black でフォーマット
- 型ヒント必須

**TypeScript**:
- ESLint設定に従う
- Prettier でフォーマット
- 明示的な型定義

### コミットメッセージ

```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: コードスタイル修正
refactor: リファクタリング
test: テスト追加・修正
chore: ビルド・ツール関連
```

---

## 📝 ライセンス

このプロジェクトのライセンス情報は、プロジェクトルートの LICENSE ファイルを参照してください。

---

## 📞 お問い合わせ

- **リポジトリ**: https://github.com/Rimpei-Qdai/nanocon-2025
- **ブランチ**: development
- **作成日**: 2025年11月27日

---

**🌿 Leafony LLM Project** - IoTとAIが融合した次世代学習プラットフォーム
