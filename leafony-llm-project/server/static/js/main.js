/*
【このファイルに書くべき内容】
- WebSocket接続の管理
- サーバーからのメッセージ受信処理
- DOM操作による画面更新
- エラーハンドリングとユーザーフィードバック

【主な機能】
1. ページ読み込み時のWebSocket接続開始
2. 接続状態の監視と表示更新
3. サーバーからのLLM応答の受信
4. 受信データのHTML要素への表示
5. 接続エラー時の再接続処理

【WebSocket処理】
- 接続: new WebSocket('ws://localhost:8000/ws')
- メッセージ受信: websocket.onmessage
- 接続切断: websocket.onclose
- エラー処理: websocket.onerror

【DOM操作】
- document.getElementById()でエリア取得
- innerHTML/textContentでコンテンツ更新
- クラス追加/削除でスタイル変更
- アニメーション効果の制御

【エラーハンドリング】
- 接続失敗時の表示
- 自動再接続機能
- ユーザーへの分かりやすいメッセージ
- デバッグ用のコンソールログ
*/
