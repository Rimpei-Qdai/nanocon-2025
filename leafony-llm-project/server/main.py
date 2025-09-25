#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
FastAPI メインアプリケーション
教材・学習管理プラットフォーム API サーバー
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncio
import json
from datetime import datetime
import uuid

# FastAPIアプリケーション作成
app = FastAPI(
    title="Leafony LLM Project API",
    description="教材・学習管理プラットフォーム API",
    version="0.8.0"
)

# CORS設定（フロントエンドからのアクセスを許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.jsのデフォルトポート
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydanticモデル定義
class MaterialItem(BaseModel):
    id: str
    name: str
    type: str  # "file" or "directory"
    path: str
    parent_id: Optional[str] = None
    content: Optional[str] = None
    created_at: str
    updated_at: str

class NavigationRequest(BaseModel):
    action: str  # "next", "prev", "up", "down", "enter"
    current_material_id: str
    target_id: Optional[str] = None

class RealtimeConnectionRequest(BaseModel):
    action: str  # "connect" or "disconnect"
    user_id: str
    material_id: Optional[str] = None

class UIControlRequest(BaseModel):
    action: str  # "navigate", "scroll", "highlight", "show_popup"
    user_id: str = "default"
    target: Optional[str] = None  # target page/material ID
    direction: Optional[str] = None  # "next", "prev", "up", "down", "home"
    data: Optional[Dict[str, Any]] = None  # additional data

# WebSocketマネージャー
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.user_connections[user_id] = websocket

    def disconnect(self, websocket: WebSocket, user_id: str):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if user_id in self.user_connections:
            del self.user_connections[user_id]

    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.user_connections:
            await self.user_connections[user_id].send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

# サンプル教材データ（階層構造を明確に分離）
sample_materials = [
    # === ルートレベル（カテゴリ） ===
    {
        "id": "category1",
        "name": "プログラミング基礎",
        "type": "directory",
        "path": "/programming-basics",
        "parent_id": None,
        "content": None,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z"
    },
    {
        "id": "category2", 
        "name": "Web開発",
        "type": "directory",
        "path": "/web-development",
        "parent_id": None,
        "content": None,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z"
    },
    {
        "id": "category3",
        "name": "データサイエンス", 
        "type": "directory",
        "path": "/data-science",
        "parent_id": None,
        "content": None,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z"
    },
    
    # === プログラミング基礎のサブカテゴリ ===
    {
        "id": "js-basics",
        "name": "JavaScript基礎",
        "type": "directory", 
        "path": "/programming-basics/javascript-basics",
        "parent_id": "category1",
        "content": None,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z"
    },
    {
        "id": "python-basics",
        "name": "Python基礎",
        "type": "directory",
        "path": "/programming-basics/python-basics", 
        "parent_id": "category1",
        "content": None,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z"
    },
    
    # === Web開発のサブカテゴリ ===
    {
        "id": "react-course",
        "name": "React入門",
        "type": "directory",
        "path": "/web-development/react-intro",
        "parent_id": "category2",
        "content": None,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z"
    },
    {
        "id": "nextjs-course",
        "name": "Next.js実践",
        "type": "directory",
        "path": "/web-development/nextjs-practice",
        "parent_id": "category2",
        "content": None,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z"
    },
    
    # === JavaScript基礎の学習ファイル ===
    {
        "id": "js-variables",
        "name": "1. 変数と型",
        "type": "file",
        "path": "/programming-basics/javascript-basics/01-variables.md",
        "parent_id": "js-basics",
        "content": "# 変数と型\n\n## はじめに\nJavaScriptの変数宣言について学びます。\n\n## var, let, const\n- var: 関数スコープ\n- let: ブロックスコープ\n- const: 定数\n\n## データ型\n- number: 数値\n- string: 文字列\n- boolean: 真偽値\n- undefined: 未定義\n- null: null値\n- object: オブジェクト",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z"
    },
    {
        "id": "js-functions",
        "name": "2. 関数",
        "type": "file",
        "path": "/programming-basics/javascript-basics/02-functions.md",
        "parent_id": "js-basics",
        "content": "# 関数\n\n## 関数宣言\n```javascript\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n```\n\n## アロー関数\n```javascript\nconst greet = (name) => {\n  return `Hello, ${name}!`;\n};\n```\n\n## 高階関数\n関数を引数として受け取ったり、関数を返す関数です。",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z"
    },
    {
        "id": "js-objects",
        "name": "3. オブジェクト",
        "type": "file",
        "path": "/programming-basics/javascript-basics/03-objects.md",
        "parent_id": "js-basics",
        "content": "# オブジェクト\n\n## オブジェクトリテラル\n```javascript\nconst person = {\n  name: 'John',\n  age: 30,\n  greet() {\n    return `Hello, I'm ${this.name}`;\n  }\n};\n```\n\n## プロトタイプ\nJavaScriptのオブジェクト指向の基礎概念です。",
        "created_at": "2025-01-01T00:00:00Z", 
        "updated_at": "2025-01-01T00:00:00Z"
    },
    
    # === Python基礎の学習ファイル ===
    {
        "id": "py-basics",
        "name": "1. Python入門",
        "type": "file",
        "path": "/programming-basics/python-basics/01-introduction.md",
        "parent_id": "python-basics",
        "content": "# Python入門\n\n## Pythonとは\nPythonは読みやすく、書きやすいプログラミング言語です。\n\n## 基本的な構文\n```python\n# Hello World\nprint('Hello, World!')\n\n# 変数\nname = 'Python'\nversion = 3.9\n```",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z"
    },
    {
        "id": "py-data-types",
        "name": "2. データ型とコレクション",
        "type": "file",
        "path": "/programming-basics/python-basics/02-data-types.md",
        "parent_id": "python-basics",
        "content": "# データ型とコレクション\n\n## 基本データ型\n- int: 整数\n- float: 浮動小数点数\n- str: 文字列\n- bool: 真偽値\n\n## コレクション\n- list: リスト\n- tuple: タプル\n- dict: 辞書\n- set: 集合",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z"
    },
    
    # === React入門の学習ファイル ===
    {
        "id": "react-intro",
        "name": "1. Reactとは",
        "type": "file",
        "path": "/web-development/react-intro/01-introduction.md",
        "parent_id": "react-course",
        "content": "# Reactとは\n\n## 概要\nReactはユーザーインターフェース構築のためのJavaScriptライブラリです。\n\n## 特徴\n- 仮想DOM\n- コンポーネントベース\n- 宣言的UI\n\n## 環境構築\n```bash\nnpx create-react-app my-app\ncd my-app\nnpm start\n```\n\n## なぜReactを使うのか？\n\n従来のDOM操作は複雑で、大規模なアプリケーションでは管理が困難でした。\nReactは以下の問題を解決します：\n\n- **パフォーマンス**: 仮想DOMによる効率的な更新\n- **保守性**: コンポーネント単位での開発\n- **再利用性**: 一度作ったコンポーネントの再利用\n\n## 基本概念\n\n### JSX\nJavaScriptの中にHTMLライクな記法を書ける構文拡張です。\n\n```jsx\nconst element = <h1>Hello, world!</h1>;\n```",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z"
    },
    {
        "id": "react-components",
        "name": "2. コンポーネント",
        "type": "file",
        "path": "/web-development/react-intro/02-components.md",
        "parent_id": "react-course",
        "content": "# コンポーネント\n\n## 関数コンポーネント\n最もシンプルなコンポーネントの定義方法です。\n\n```jsx\nfunction Welcome(props) {\n  return <h1>Hello, {props.name}</h1>;\n}\n\n// アロー関数でも定義可能\nconst Welcome = (props) => {\n  return <h1>Hello, {props.name}</h1>;\n};\n```\n\n## プロパティ（Props）\nコンポーネント間でデータを渡すための仕組みです。\n\n```jsx\n// 親コンポーネント\nfunction App() {\n  return (\n    <div>\n      <Welcome name=\"太郎\" />\n      <Welcome name=\"花子\" />\n    </div>\n  );\n}\n\n// 子コンポーネント\nfunction Welcome({ name }) {\n  return <h1>こんにちは、{name}さん！</h1>;\n}\n```\n\n## State（状態管理）\nコンポーネントの状態を管理するためのReact Hooksを使用します。\n\n```jsx\nimport { useState } from 'react';\n\nfunction Counter() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <div>\n      <p>カウント: {count}</p>\n      <button onClick={() => setCount(count + 1)}>\n        +1\n      </button>\n    </div>\n  );\n}\n```",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z"
    },
    {
        "id": "react-hooks",
        "name": "3. React Hooks",
        "type": "file",
        "path": "/web-development/react-intro/03-hooks.md",
        "parent_id": "react-course",
        "content": "# React Hooks\n\n## useStateフック\n状態を管理するための基本的なフックです。\n\n```jsx\nconst [value, setValue] = useState(初期値);\n```\n\n## useEffectフック\n副作用（API呼び出し、タイマーなど）を処理するためのフックです。\n\n```jsx\nimport { useEffect, useState } from 'react';\n\nfunction DataFetcher() {\n  const [data, setData] = useState(null);\n\n  useEffect(() => {\n    // コンポーネントがマウントされたときに実行\n    fetch('/api/data')\n      .then(response => response.json())\n      .then(setData);\n  }, []); // 空の依存配列 = 初回のみ実行\n\n  return <div>{data ? data.message : 'Loading...'}</div>;\n}\n```\n\n## カスタムフック\n独自のフックを作成して、ロジックを再利用できます。\n\n```jsx\n// カスタムフック\nfunction useCounter(initialValue = 0) {\n  const [count, setCount] = useState(initialValue);\n  \n  const increment = () => setCount(c => c + 1);\n  const decrement = () => setCount(c => c - 1);\n  const reset = () => setCount(initialValue);\n  \n  return { count, increment, decrement, reset };\n}\n\n// 使用例\nfunction App() {\n  const { count, increment, decrement, reset } = useCounter(0);\n  \n  return (\n    <div>\n      <p>Count: {count}</p>\n      <button onClick={increment}>+</button>\n      <button onClick={decrement}>-</button>\n      <button onClick={reset}>Reset</button>\n    </div>\n  );\n}\n```",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z"
    }
]

# 基本エンドポイント

@app.get("/")
async def read_root():
    """ヘルスチェック用エンドポイント"""
    return {
        "message": "Leafony LLM Project API Server",
        "status": "running",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/materials", response_model=List[MaterialItem])
async def get_materials():
    """教材一覧を取得"""
    return sample_materials

@app.get("/api/materials/{material_id}", response_model=MaterialItem)
async def get_material(material_id: str):
    """特定の教材を取得"""
    for material in sample_materials:
        if material["id"] == material_id:
            return material
    raise HTTPException(status_code=404, detail="Material not found")

@app.get("/api/materials/{material_id}/children", response_model=List[MaterialItem])
async def get_material_children(material_id: str):
    """指定された教材の子要素を取得"""
    children = [m for m in sample_materials if m.get("parent_id") == material_id]
    return children

@app.post("/api/navigate")
async def navigate_material(request: NavigationRequest):
    """ページ移動API（バックエンドからのHTTPリクエストでページ制御）"""
    try:
        # ナビゲーション処理のロジック
        result = {
            "action": request.action,
            "current_material_id": request.current_material_id,
            "target_material_id": request.target_id,
            "timestamp": datetime.now().isoformat()
        }
        
        # WebSocket経由でフロントエンドに通知
        message = json.dumps({
            "type": "navigation",
            "data": result
        })
        await manager.broadcast(message)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/realtime")
async def handle_realtime_connection(request: RealtimeConnectionRequest):
    """Realtime API接続制御"""
    try:
        result = {
            "action": request.action,
            "user_id": request.user_id,
            "material_id": request.material_id,
            "status": "success",
            "timestamp": datetime.now().isoformat()
        }
        
        # WebSocket経由でフロントエンドに通知
        message = json.dumps({
            "type": "realtime_status",
            "data": result
        })
        await manager.send_personal_message(message, request.user_id)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/trigger-llm")
async def trigger_llm_from_gateway(data: dict):
    """ゲートウェイからの傾き検知を受信（IoT連携用）"""
    try:
        # 現在はサンプル処理
        result = {
            "message": "LLM triggered successfully",
            "sensor_data": data,
            "timestamp": datetime.now().isoformat()
        }
        
        # WebSocket経由でフロントエンドに通知
        message = json.dumps({
            "type": "sensor_trigger",
            "data": result
        })
        await manager.broadcast(message)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ui-control")
async def control_ui(request: UIControlRequest):
    """外部からのUIコントロール（Postman、IoTデバイス等から）"""
    try:
        result = {
            "action": request.action,
            "user_id": request.user_id,
            "target": request.target,
            "direction": request.direction,
            "status": "success",
            "timestamp": datetime.now().isoformat()
        }
        
        # アクションに応じた処理
        if request.action == "navigate":
            if request.direction == "home":
                # ホームページに移動
                message = json.dumps({
                    "type": "ui_control",
                    "action": "navigate_to_page",
                    "data": {
                        "page": "home",
                        "url": "/"
                    }
                })
            elif request.target:
                # 特定の教材に移動
                message = json.dumps({
                    "type": "ui_control", 
                    "action": "navigate_to_page",
                    "data": {
                        "page": "learn",
                        "url": f"/learn/{request.target}",
                        "material_id": request.target
                    }
                })
            elif request.direction in ["next", "prev"]:
                # 現在のページで前後の教材に移動
                message = json.dumps({
                    "type": "ui_control",
                    "action": "navigate_direction", 
                    "data": {
                        "direction": request.direction
                    }
                })
            else:
                raise HTTPException(status_code=400, detail="Invalid navigation parameters")
                
        elif request.action == "highlight":
            # 特定の要素をハイライト
            message = json.dumps({
                "type": "ui_control",
                "action": "highlight_element",
                "data": {
                    "target": request.target,
                    "data": request.data
                }
            })
            
        elif request.action == "show_popup":
            # ポップアップ表示
            message = json.dumps({
                "type": "ui_control",
                "action": "show_popup",
                "data": {
                    "message": request.data.get("message", "通知") if request.data else "通知",
                    "type": request.data.get("type", "info") if request.data else "info"
                }
            })
            
        elif request.action == "scroll":
            # スクロール制御
            message = json.dumps({
                "type": "ui_control",
                "action": "scroll",
                "data": {
                    "direction": request.direction,
                    "target": request.target
                }
            })
        else:
            raise HTTPException(status_code=400, detail=f"Unknown action: {request.action}")
        
        # WebSocket経由でフロントエンドに送信
        if request.user_id != "broadcast":
            await manager.send_personal_message(message, request.user_id)
        else:
            await manager.broadcast(message)
            
        result["message_sent"] = True
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ui-control/status")
async def get_ui_status():
    """UIの現在の状態を取得"""
    return {
        "active_connections": len(manager.active_connections),
        "connected_users": list(manager.user_connections.keys()),
        "timestamp": datetime.now().isoformat(),
        "available_actions": [
            {
                "action": "navigate",
                "description": "ページ移動",
                "parameters": {
                    "direction": ["home", "next", "prev"],
                    "target": "material_id (optional)"
                }
            },
            {
                "action": "highlight", 
                "description": "要素のハイライト",
                "parameters": {
                    "target": "CSS selector or element ID",
                    "data": {"color": "highlight color"}
                }
            },
            {
                "action": "show_popup",
                "description": "ポップアップ表示", 
                "parameters": {
                    "data": {"message": "popup text", "type": "info|success|warning|error"}
                }
            },
            {
                "action": "scroll",
                "description": "スクロール制御",
                "parameters": {
                    "direction": ["up", "down", "top", "bottom"],
                    "target": "element selector (optional)"
                }
            }
        ]
    }

# WebSocketエンドポイント
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket接続エンドポイント"""
    print(f"🔌 WebSocket接続要求: user_id={user_id}")
    try:
        await manager.connect(websocket, user_id)
        print(f"✅ WebSocket接続成功: user_id={user_id}")
        
        # 接続確認メッセージを送信
        await manager.send_personal_message(
            json.dumps({
                "type": "connection_confirmed",
                "message": "WebSocket接続が確立されました",
                "user_id": user_id,
                "timestamp": datetime.now().isoformat()
            }),
            user_id
        )
        
        # クライアントからのメッセージを待機
        while True:
            try:
                data = await websocket.receive_text()
                print(f"📨 Received from {user_id}: {data}")
                
                # pingメッセージへの応答
                if data == "ping":
                    await manager.send_personal_message(
                        json.dumps({"type": "pong", "timestamp": datetime.now().isoformat()}),
                        user_id
                    )
                else:
                    # 通常のメッセージ処理
                    try:
                        message_data = json.loads(data)
                        response = {
                            "type": "echo",
                            "data": message_data,
                            "timestamp": datetime.now().isoformat()
                        }
                        await manager.send_personal_message(json.dumps(response), user_id)
                    except json.JSONDecodeError:
                        print(f"❌ Invalid JSON from {user_id}: {data}")
                    
            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"❌ WebSocket message error for {user_id}: {e}")
                break
                
    except WebSocketDisconnect:
        print(f"🔌 WebSocket切断: user_id={user_id}")
    except Exception as e:
        print(f"❌ WebSocket接続エラー: user_id={user_id}, error={e}")
    finally:
        manager.disconnect(websocket, user_id)
        print(f"🧹 WebSocket cleanup完了: user_id={user_id}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
