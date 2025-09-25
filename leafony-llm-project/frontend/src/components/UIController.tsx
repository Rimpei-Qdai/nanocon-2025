import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

interface UIControllerProps {
  userId?: string;
}

interface PopupState {
  show: boolean;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export default function UIController({ userId = 'default' }: UIControllerProps) {
  const router = useRouter();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [popup, setPopup] = useState<PopupState>({ show: false, message: '', type: 'info' });

  useEffect(() => {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;
    
    // WebSocket接続
    const connectWebSocket = () => {
      try {
        console.log(`WebSocket接続試行中... (${reconnectAttempts + 1}/${maxReconnectAttempts})`);
        const ws = new WebSocket(`ws://localhost:8000/ws/${userId}`);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('✅ UI Controller WebSocket connected');
          setIsConnected(true);
          reconnectAttempts = 0; // 成功時はカウンターをリセット
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('📨 UI Control message received:', message);
            
            handleUIControlMessage(message);
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = (event) => {
          console.log(`🔌 UI Controller WebSocket disconnected (code: ${event.code})`);
          setIsConnected(false);
          
          // 最大再接続回数に達していない場合のみ再接続
          if (reconnectAttempts < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // 指数バックオフ（最大30秒）
            console.log(`🔄 ${delay}ms後に再接続を試行します...`);
            setTimeout(() => {
              reconnectAttempts++;
              connectWebSocket();
            }, delay);
          } else {
            console.log('❌ 最大再接続回数に達しました。UIコントロール機能は無効です。');
          }
        };

        ws.onerror = (error) => {
          console.error('❌ WebSocket connection error:', error);
          setIsConnected(false);
        };
        
      } catch (error) {
        console.error('❌ Failed to create WebSocket connection:', error);
        setIsConnected(false);
      }
    };

    // 初回接続は少し遅延させる（サーバー起動を待つ）
    const initialDelay = reconnectAttempts === 0 ? 2000 : 0;
    setTimeout(() => {
      connectWebSocket();
    }, initialDelay);

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [userId]);

  const handleUIControlMessage = (message: any) => {
    // 接続確認メッセージの処理
    if (message.type === 'connection_confirmed') {
      console.log('✅ WebSocket接続確認:', message.message);
      return;
    }

    // UI制御メッセージ以外は無視
    if (message.type !== 'ui_control') return;

    const { action, data } = message;

    switch (action) {
      case 'navigate_to_page':
        if (data.url) {
          console.log(`Navigating to: ${data.url}`);
          router.push(data.url);
        }
        break;

      case 'navigate_direction':
        if (data.direction === 'next') {
          // 現在のページで次へボタンをクリック
          const nextButton = document.querySelector('[data-ui-control="next-button"]') as HTMLElement;
          if (nextButton) {
            nextButton.click();
          } else {
            // キーボードイベントをシミュレート
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
          }
        } else if (data.direction === 'prev') {
          // 現在のページで前へボタンをクリック
          const prevButton = document.querySelector('[data-ui-control="prev-button"]') as HTMLElement;
          if (prevButton) {
            prevButton.click();
          } else {
            // キーボードイベントをシミュレート
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
          }
        }
        break;

      case 'highlight_element':
        if (data.target) {
          highlightElement(data.target, data.data?.color || '#fbbf24');
        }
        break;

      case 'show_popup':
        setPopup({
          show: true,
          message: data.message || '通知',
          type: data.type || 'info'
        });
        // 3秒後に自動で閉じる
        setTimeout(() => {
          setPopup(prev => ({ ...prev, show: false }));
        }, 3000);
        break;

      case 'scroll':
        handleScroll(data.direction, data.target);
        break;

      default:
        console.warn('Unknown UI control action:', action);
    }
  };

  const highlightElement = (selector: string, color: string) => {
    try {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        // 元のスタイルを保存
        const originalStyle = element.style.cssText;
        
        // ハイライト効果を適用
        element.style.backgroundColor = color;
        element.style.transition = 'all 0.3s ease';
        element.style.border = `2px solid ${color}`;
        element.style.borderRadius = '4px';
        element.style.boxShadow = `0 0 10px ${color}`;
        
        // 2秒後に元に戻す
        setTimeout(() => {
          element.style.cssText = originalStyle;
        }, 2000);
      }
    } catch (error) {
      console.error('Error highlighting element:', error);
    }
  };

  const handleScroll = (direction: string, target?: string) => {
    try {
      let targetElement: Element | null = null;
      
      if (target) {
        targetElement = document.querySelector(target);
      } else {
        targetElement = document.documentElement;
      }

      if (targetElement) {
        switch (direction) {
          case 'up':
            targetElement.scrollBy({ top: -300, behavior: 'smooth' });
            break;
          case 'down':
            targetElement.scrollBy({ top: 300, behavior: 'smooth' });
            break;
          case 'top':
            targetElement.scrollTo({ top: 0, behavior: 'smooth' });
            break;
          case 'bottom':
            targetElement.scrollTo({ top: targetElement.scrollHeight, behavior: 'smooth' });
            break;
        }
      }
    } catch (error) {
      console.error('Error scrolling:', error);
    }
  };

  const getPopupStyle = () => {
    const baseStyle = "fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm";
    switch (popup.type) {
      case 'success':
        return `${baseStyle} bg-green-500 text-white`;
      case 'warning':
        return `${baseStyle} bg-yellow-500 text-white`;
      case 'error':
        return `${baseStyle} bg-red-500 text-white`;
      default:
        return `${baseStyle} bg-blue-500 text-white`;
    }
  };

  return (
    <>
      {/* 接続状態インジケーター */}
      <div className="fixed bottom-4 left-4 z-40">
        <div className={`flex items-center space-x-2 px-3 py-2 rounded-full text-xs font-medium ${
          isConnected 
            ? 'bg-green-100 text-green-800 border border-green-300' 
            : 'bg-red-100 text-red-800 border border-red-300'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <span>{isConnected ? 'UI Control: ON' : 'UI Control: OFF'}</span>
        </div>
      </div>

      {/* ポップアップ表示 */}
      {popup.show && (
        <div className={getPopupStyle()}>
          <div className="flex items-center justify-between">
            <span>{popup.message}</span>
            <button
              onClick={() => setPopup(prev => ({ ...prev, show: false }))}
              className="ml-3 text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}
