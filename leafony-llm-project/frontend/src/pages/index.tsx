import { useState, useEffect } from 'react';
import { Geist, Geist_Mono } from "next/font/google";
import Link from 'next/link';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 型定義
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

export default function Home() {
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<string>('checking...');

  // サーバー接続確認
  const checkServerConnection = async () => {
    try {
      const response = await fetch('http://localhost:8000/');
      const data = await response.json();
      setServerStatus('connected');
      return true;
    } catch (err) {
      setServerStatus('disconnected');
      return false;
    }
  };

  // 教材データ取得
  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/materials');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setMaterials(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Failed to fetch materials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      const isConnected = await checkServerConnection();
      if (isConnected) {
        await fetchMaterials();
      } else {
        setLoading(false);
        setError('FastAPIサーバーに接続できません。サーバーが起動しているか確認してください。');
      }
    };

    initializeApp();
  }, []);

  return (
    <div className={`${geistSans.className} min-h-screen bg-gray-50 dark:bg-gray-900`}>
      {/* ヘッダー */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              🌿 Leafony LLM Project
            </h1>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div 
                  className={`w-3 h-3 rounded-full ${
                    serverStatus === 'connected' ? 'bg-green-500' : 
                    serverStatus === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500'
                  }`}
                />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Server: {serverStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 教材管理プラットフォーム */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            教材・学習管理プラットフォーム
          </h2>
          
          {/* エラー表示 */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ローディング状態 */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-300">教材データを読み込み中...</span>
            </div>
          )}

          {/* ナレッジマップ表示 */}
          {!loading && !error && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  学習ナレッジマップ
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  学習したい分野をクリックして始めましょう
                </p>
              </div>

              {/* ツリー構造の表示 */}
              <div className="relative">
                {/* ルートから広がるツリー */}
                <div className="flex flex-col items-center space-y-8">
                  
                  {/* ルートノード */}
                  <div className="relative">
                    <div className="bg-gradient-to-br from-purple-500 to-blue-600 text-white px-6 py-4 rounded-full text-lg font-bold shadow-lg">
                      🌿 Leafony LLM
                    </div>
                  </div>

                  {/* ルートからカテゴリへの接続線 */}
                  <div className="relative">
                    <div className="absolute left-1/2 top-0 w-0.5 h-12 bg-gray-300 dark:bg-gray-600 transform -translate-x-0.5"></div>
                    <div className="absolute left-1/2 top-12 w-24 h-0.5 bg-gray-300 dark:bg-gray-600 transform -translate-x-1/2"></div>
                  </div>

                  {/* カテゴリレベル */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-16 relative">
                    {materials.filter(m => m.parent_id === null).map((category, categoryIndex) => (
                      <div key={category.id} className="flex flex-col items-center relative">
                        
                        {/* カテゴリノード */}
                        <div className="bg-gradient-to-br from-blue-500 to-teal-500 text-white px-6 py-3 rounded-lg text-center font-semibold shadow-lg hover:shadow-xl transition-shadow cursor-pointer transform hover:scale-105 transition-transform">
                          <div className="flex items-center space-x-2">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            <span>{category.name}</span>
                          </div>
                        </div>

                        {/* カテゴリから子への接続線 */}
                        {materials.filter(m => m.parent_id === category.id).length > 0 && (
                          <div className="relative mt-4">
                            <div className="w-0.5 h-8 bg-gray-300 dark:bg-gray-600 mx-auto"></div>
                          </div>
                        )}

                        {/* サブカテゴリ（コース）レベル */}
                        <div className="space-y-6 mt-4">
                          {materials.filter(m => m.parent_id === category.id).map((subcategory, subIndex) => (
                            <div key={subcategory.id} className="flex flex-col items-center">
                              
                              {/* コースノード */}
                              {(() => {
                                // このコースの最初のレッスンを取得
                                const firstLesson = materials.find(m => m.parent_id === subcategory.id);
                                const linkTarget = firstLesson ? `/learn/${firstLesson.id}` : `/learn/${subcategory.id}`;
                                
                                return (
                                  <Link href={linkTarget}>
                                    <div className="bg-gradient-to-br from-green-500 to-emerald-500 text-white px-4 py-2 rounded-lg text-center font-medium shadow-md hover:shadow-lg transition-all cursor-pointer transform hover:scale-105 min-w-[160px]">
                                      <div className="flex items-center space-x-2">
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                        <span className="text-sm">{subcategory.name}</span>
                                      </div>
                                    </div>
                                  </Link>
                                );
                              })()}

                              {/* ファイル数の表示 */}
                              <div className="mt-2 text-center">
                                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                  {materials.filter(m => m.parent_id === subcategory.id).length} レッスン
                                </span>
                              </div>

                              {/* ファイル一覧（コンパクト表示） */}
                              <div className="mt-3 space-y-1">
                                {materials
                                  .filter(m => m.parent_id === subcategory.id)
                                  .slice(0, 3) // 最初の3つだけ表示
                                  .map((file) => (
                                    <Link key={file.id} href={`/learn/${file.id}`}>
                                      <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-md text-xs hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors cursor-pointer flex items-center space-x-1">
                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span className="truncate max-w-[120px]">{file.name}</span>
                                      </div>
                                    </Link>
                                  ))
                                }
                                {materials.filter(m => m.parent_id === subcategory.id).length > 3 && (
                                  <div className="text-xs text-gray-400 text-center">
                                    +{materials.filter(m => m.parent_id === subcategory.id).length - 3} more...
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 装飾的な背景要素 */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {/* 背景のドット */}
                  <div className="absolute top-10 left-10 w-2 h-2 bg-blue-200 rounded-full opacity-50"></div>
                  <div className="absolute top-20 right-16 w-1 h-1 bg-purple-200 rounded-full opacity-30"></div>
                  <div className="absolute bottom-20 left-20 w-1.5 h-1.5 bg-green-200 rounded-full opacity-40"></div>
                  <div className="absolute bottom-10 right-10 w-2 h-2 bg-teal-200 rounded-full opacity-35"></div>
                </div>
              </div>

              {/* 統計情報 */}
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {materials.filter(m => m.parent_id === null).length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">カテゴリ</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {materials.filter(m => m.parent_id !== null && m.type === 'directory').length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">コース</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {materials.filter(m => m.type === 'file').length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">レッスン</div>
                </div>
              </div>
            </div>
          )}

          {/* 教材がない場合 */}
          {!loading && !error && materials.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">教材がありません</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                まだ教材が追加されていません。
              </p>
            </div>
          )}
        </div>

        {/* API接続テスト */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            API接続テスト
          </h3>
          <div className="space-y-3">
            <button
              onClick={checkServerConnection}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              サーバー接続確認
            </button>
            <button
              onClick={fetchMaterials}
              className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              教材データ再取得
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
