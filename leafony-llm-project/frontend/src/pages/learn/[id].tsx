import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Geist } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
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

export default function LearnPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [currentMaterial, setCurrentMaterial] = useState<MaterialItem | null>(null);
  const [allMaterials, setAllMaterials] = useState<MaterialItem[]>([]);
  const [courseMaterials, setCourseMaterials] = useState<MaterialItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 教材データ取得
  const fetchMaterial = async (materialId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/materials/${materialId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setCurrentMaterial(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return null;
    }
  };

  // 全教材データ取得
  const fetchAllMaterials = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/materials');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAllMaterials(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return [];
    }
  };

  // コース内教材の整理
  const organizeCourseMaterials = (materials: MaterialItem[], current: MaterialItem) => {
    // 同じ親を持つファイルのみを取得（ディレクトリは除外）
    const courseMats = materials.filter(m => 
      m.parent_id === current.parent_id && m.type === 'file'
    ).sort((a, b) => {
      // 名前順に並べる（通常は番号順になる）
      return a.name.localeCompare(b.name);
    });
    
    setCourseMaterials(courseMats);
    
    // 現在の教材のインデックスを見つける
    const currentIdx = courseMats.findIndex(m => m.id === current.id);
    setCurrentIndex(currentIdx >= 0 ? currentIdx : 0);
  };

  // 左右ナビゲーション関数
  const navigateToNext = useCallback(() => {
    if (currentIndex < courseMaterials.length - 1) {
      const nextMaterial = courseMaterials[currentIndex + 1];
      router.push(`/learn/${nextMaterial.id}`);
    }
  }, [currentIndex, courseMaterials, router]);

  const navigateToPrev = useCallback(() => {
    if (currentIndex > 0) {
      const prevMaterial = courseMaterials[currentIndex - 1];
      router.push(`/learn/${prevMaterial.id}`);
    }
  }, [currentIndex, courseMaterials, router]);

  // キーボードナビゲーション
  const handleKeyPress = useCallback((event: globalThis.KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      navigateToPrev();
    } else if (event.key === 'ArrowRight') {
      navigateToNext();
    }
  }, [navigateToPrev, navigateToNext]);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const initializePage = async () => {
      setLoading(true);
      
      // 並行してデータを取得
      const [materialData, allMaterialsData] = await Promise.all([
        fetchMaterial(id),
        fetchAllMaterials()
      ]);

      if (materialData && allMaterialsData) {
        // コースIDでアクセスされた場合、最初のレッスンにリダイレクト
        if (materialData.type === 'directory') {
          const firstLesson = allMaterialsData.find((m: any) => m.parent_id === materialData.id);
          if (firstLesson) {
            console.log(`Redirecting from course ${materialData.id} to first lesson ${firstLesson.id}`);
            router.replace(`/learn/${firstLesson.id}`);
            return;
          }
        }
        
        // コース内教材を整理
        organizeCourseMaterials(allMaterialsData, materialData);
      }

      setLoading(false);
    };

    initializePage();
  }, [id, router]);

  // キーボードイベントリスナー追加
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  if (loading) {
    return (
      <div className={`${geistSans.className} min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-300">教材を読み込み中...</span>
      </div>
    );
  }

  if (error || !currentMaterial) {
    return (
      <div className={`${geistSans.className} min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center`}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            教材が見つかりません
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {error || '指定された教材が存在しません。'}
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`${geistSans.className} min-h-screen bg-gray-50 dark:bg-gray-900`}>
      {/* ヘッダー */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                ← 教材一覧に戻る
              </Link>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {currentMaterial.name}
              </h1>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {currentIndex + 1} / {courseMaterials.length}
            </div>
          </div>
        </div>
      </header>

      {/* 学習画面レイアウト */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-6 h-[calc(100vh-150px)]">
          
          {/* 左プレビュー: 前の教材 */}
          <div className="lg:col-span-1">
            {currentIndex > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 h-full">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    前の教材
                  </h3>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {courseMaterials[currentIndex - 1]?.name}
                  </h4>
                </div>
                <div className="p-4">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 h-48 overflow-hidden">
                    {courseMaterials[currentIndex - 1]?.content ? (
                      <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-10">
                        {courseMaterials[currentIndex - 1]?.content?.substring(0, 200)}...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        プレビューなし
                      </div>
                    )}
                  </div>
                  <button
                    onClick={navigateToPrev}
                    data-ui-control="prev-side-button"
                    className="w-full mt-4 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                  >
                    ← 前へ
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 中央エリア: メインコンテンツ */}
          <div className="lg:col-span-5 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="p-6 h-full flex flex-col">
              {/* ヘッダー */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <svg className="h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {currentMaterial.name}
                    </h2>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {currentIndex + 1} / {courseMaterials.length}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={navigateToPrev}
                        disabled={currentIndex === 0}
                        data-ui-control="prev-button"
                        className={`p-2 rounded-md transition-colors ${
                          currentIndex === 0
                            ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={navigateToNext}
                        disabled={currentIndex === courseMaterials.length - 1}
                        data-ui-control="next-button"
                        className={`p-2 rounded-md transition-colors ${
                          currentIndex === courseMaterials.length - 1
                            ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* コンテンツエリア */}
              <div className="flex-1 overflow-auto">
                {currentMaterial.content ? (
                  <div className="prose dark:prose-invert max-w-none">
                    <div 
                      className="whitespace-pre-wrap text-base leading-relaxed text-gray-900 dark:text-gray-100"
                      dangerouslySetInnerHTML={{ 
                        __html: currentMaterial.content
                          .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mb-4 text-gray-900 dark:text-white">$1</h1>')
                          .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-semibold mb-3 text-gray-800 dark:text-gray-200">$1</h2>')
                          .replace(/^### (.*$)/gm, '<h3 class="text-xl font-medium mb-2 text-gray-700 dark:text-gray-300">$1</h3>')
                          .replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>')
                          .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg border my-4 overflow-x-auto"><code class="text-sm">$2</code></pre>')
                          .replace(/\n\n/g, '<br><br>')
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                        コンテンツがありません
                      </h3>
                      <p className="mt-2 text-gray-500 dark:text-gray-400">
                        この教材にはまだコンテンツが設定されていません。
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右プレビュー: 次の教材 */}
          <div className="lg:col-span-1">
            {currentIndex < courseMaterials.length - 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 h-full">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    次の教材
                  </h3>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {courseMaterials[currentIndex + 1]?.name}
                  </h4>
                </div>
                <div className="p-4">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 h-48 overflow-hidden">
                    {courseMaterials[currentIndex + 1]?.content ? (
                      <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-10">
                        {courseMaterials[currentIndex + 1]?.content?.substring(0, 200)}...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        プレビューなし
                      </div>
                    )}
                  </div>
                  <button
                    onClick={navigateToNext}
                    data-ui-control="next-side-button"
                    className="w-full mt-4 px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors text-sm"
                  >
                    次へ →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
