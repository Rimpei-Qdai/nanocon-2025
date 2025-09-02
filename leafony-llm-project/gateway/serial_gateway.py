#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
シリアル通信ゲートウェイ

【このファイルに書くべき内容】
- pyserialを使ってLeafonyからのシリアル通信を監視
- "TILT_DETECTED"メッセージを受信したら検知
- FastAPIサーバーに対してHTTP POSTリクエストを送信
- エラーハンドリング（シリアルポートが見つからない場合など）
- ループ処理でリアルタイムに監視を継続

【主な機能】
1. シリアルポートの自動検出または設定
2. 連続的なデータ受信監視
3. 特定のメッセージパターンの認識
4. FastAPI serverへのHTTPリクエスト送信（http://localhost:8000/trigger-llm）
"""
