#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
FastAPI メインアプリケーション

【このファイルに書くべき内容】
- FastAPIアプリケーションの作成と設定
- 静的ファイル（CSS/JS）の配信設定
- HTMLテンプレートの設定（Jinja2）
- WebSocketマネージャーの実装

【エンドポイント】
1. GET / → index.htmlを返す（ホームページ）
2. POST /trigger-llm → ゲートウェイからの傾き検知を受信
3. WebSocket /ws → ブラウザとのリアルタイム通信

【主な処理の流れ】
1. ゲートウェイから /trigger-llm にリクエストが来る
2. llm_client.pyを呼び出してLLMに問い合わせ
3. LLMの応答をWebSocket経由でブラウザに送信
4. ブラウザ側でリアルタイムに表示更新

【必要なライブラリ】
- fastapi
- uvicorn
- jinja2
- python-websockets
"""
