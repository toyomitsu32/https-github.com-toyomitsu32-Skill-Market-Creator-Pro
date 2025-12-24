
import React, { useState, useMemo } from 'react';
import { getThumbnailPrompt } from '../services/geminiService';
import { SkillIdea } from '../types';

interface ServiceResultProps {
  idea: SkillIdea;
  content: string;
  thumbnailUrl?: string;
  onGenerateImage: () => void;
  isHighQuality: boolean;
  setIsHighQuality: (value: boolean) => void;
  onReset: (e?: React.MouseEvent) => void;
  onBack: () => void;
}

const parseServiceContent = (text: string) => {
  const normalized = text.replace(/\r\n/g, '\n');
  
  const getValue = (key: string) => {
    const regex = new RegExp(`^${key}[:：]\\s*(.*)$`, 'm');
    const match = normalized.match(regex);
    return match ? match[1].trim() : '';
  };

  const category = getValue('カテゴリ');
  const subCategory = getValue('サブカテゴリ');
  const title = getValue('タイトル');
  const catchphrase = getValue('キャッチコピー');

  const policyMarker = '⚠️キャンセル時の注意事項';
  const templateMarker = '📝依頼テンプレート';
  
  const detailHeaderMatch = normalized.match(/^サービス詳細[（(].*[）)].*$/m);
  const detailStart = detailHeaderMatch 
    ? detailHeaderMatch.index! + detailHeaderMatch[0].length 
    : (normalized.indexOf('キャッチコピー') !== -1 
        ? normalized.indexOf('\n', normalized.indexOf('キャッチコピー')) 
        : 0);

  const policyIdx = normalized.indexOf(policyMarker);
  const templateIdx = normalized.indexOf(templateMarker);

  const detailEnd = [policyIdx, templateIdx]
    .filter(i => i !== -1)
    .sort((a, b) => a - b)[0] || normalized.length;

  const detail = normalized.substring(detailStart, detailEnd).trim();

  let policy = '';
  if (policyIdx !== -1) {
    const end = (templateIdx !== -1 && templateIdx > policyIdx) ? templateIdx : normalized.length;
    policy = normalized.substring(policyIdx + policyMarker.length, end).trim();
  }

  let template = '';
  if (templateIdx !== -1) {
    template = normalized.substring(templateIdx + templateMarker.length).trim();
  }

  return { title, catchphrase, category, subCategory, detail, policy, template };
};

const CopySection: React.FC<{ title: string; content: string; icon: string }> = ({ title, content, icon }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  if (!content) return null;
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-bold text-stone-700 flex items-center gap-2 text-sm">
          <span className="text-lg">{icon}</span> {title}
        </h4>
        <button type="button" onClick={handleCopy} className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${copied ? 'bg-green-100 text-green-700 border-green-200' : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'}`}>
          {copied ? '✅ コピー済' : '📋 コピー'}
        </button>
      </div>
      <div className="bg-stone-50/50 rounded-xl p-4 text-stone-600 text-sm whitespace-pre-wrap border border-stone-100/50 leading-relaxed">{content}</div>
    </div>
  );
};

const ServiceResult: React.FC<ServiceResultProps> = ({ 
  idea, content, thumbnailUrl, onGenerateImage, isHighQuality, setIsHighQuality, onReset, onBack
}) => {
  const [isAllCopied, setIsAllCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  const parsed = useMemo(() => parseServiceContent(content), [content]);
  
  const advancedPrompt = useMemo(() => {
    const contextIdea = { ...idea, generatedContent: content };
    return getThumbnailPrompt(contextIdea, true);
  }, [idea, content]);

  const handleCopyAll = () => {
    navigator.clipboard.writeText(content).then(() => {
      setIsAllCopied(true);
      setTimeout(() => setIsAllCopied(false), 2000);
    });
  };

  const handleCopyPrompt = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(advancedPrompt).then(() => {
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    });
  };

  const handleDownloadImage = () => {
    if (!thumbnailUrl) return;
    
    // サービスタイトルをファイル名に使用（OSで禁止されている文字をサニタイズ）
    const safeTitle = (parsed.title || idea.title || 'service')
      .replace(/[\\/:*?"<>|]/g, '_')
      .trim();
    
    const link = document.createElement('a');
    link.href = thumbnailUrl;
    link.download = `${safeTitle}-thumbnail.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 md:p-12 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <span className="text-rose-500 font-bold tracking-wider text-xs uppercase mb-1 block">Step 3</span>
          <h2 className="text-3xl font-bold text-stone-800 tracking-tight">出品用テキストが完成しました</h2>
        </div>
        <div className="flex gap-3">
          <button onClick={onBack} className="bg-white text-stone-600 border border-stone-200 py-2.5 px-5 rounded-full font-bold text-xs hover:bg-stone-50">一覧へ戻る</button>
          <button onClick={handleCopyAll} className={`py-2.5 px-6 rounded-full font-bold text-xs transition-all ${isAllCopied ? 'bg-green-500 text-white' : 'bg-stone-800 text-white hover:bg-stone-700'}`}>
            {isAllCopied ? '✅ コピー完了' : '📄 全文コピー'}
          </button>
        </div>
      </div>

      <div className="space-y-12">
        {/* Next Steps Guide */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200 rounded-[3rem] p-10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/30 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          
          <div className="relative z-10">
            <h4 className="text-orange-900 font-black text-2xl mb-8 flex items-center gap-3">
              <span className="bg-white p-2.5 rounded-2xl shadow-sm text-2xl">✨</span> 
              次のステップ！出品まであと少し！
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Step 1: Thumbnail */}
              <div className="bg-white/60 p-6 rounded-3xl border border-white flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center font-black text-xl mb-4 shadow-lg shadow-orange-200">1</div>
                <h5 className="font-bold text-orange-900 mb-2">画像準備</h5>
                <div className="text-orange-800/70 text-[13px] leading-relaxed space-y-1">
                  <p className="flex items-center gap-1 justify-center"><span>📥</span> <span>この画面で生成・保存</span></p>
                  <p className="text-[10px] text-orange-400/60 font-bold">または</p>
                  <p className="flex items-center gap-1 justify-center"><span>🎨</span> <span>プロンプトをコピーしてGeminiで生成</span></p>
                </div>
              </div>

              {/* Step 2: Integrated Action */}
              <div className="bg-white/60 p-6 rounded-3xl border border-white flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center font-black text-xl mb-4 shadow-lg shadow-orange-200">2</div>
                <h5 className="font-bold text-orange-900 mb-2">情報を登録</h5>
                <p className="text-orange-800/70 text-[13px] leading-relaxed mb-4">
                  各項目の「コピー」ボタンで内容を保存し、出品画面の入力欄に貼り付けます。
                </p>
                <div className="mt-auto">
                  <a 
                    href="https://skill.libecity.com/services/new" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-6 py-2 bg-white border border-rose-200 rounded-full text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all shadow-sm hover:shadow active:scale-95"
                  >
                    スキルマーケット出品画面へ
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Sections */}
        <div className="grid grid-cols-1 gap-8">
          <div className="space-y-8">
            {/* Thumbnail Section */}
            <div className="w-full space-y-4">
              {thumbnailUrl ? (
                <div className="relative group rounded-[2rem] overflow-hidden shadow-lg border border-stone-100 bg-stone-50 max-w-3xl mx-auto">
                  <img src={thumbnailUrl} className="w-full object-cover aspect-[3/2]" alt="Thumbnail" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center p-6 space-y-4">
                    <div className="flex gap-3">
                      <button onClick={handleDownloadImage} className="bg-rose-500 text-white hover:bg-rose-600 font-bold py-3.5 px-8 rounded-full text-sm transition-all transform hover:scale-105 shadow-xl flex items-center gap-2">
                        <span>📥</span> 保存する
                      </button>
                      <button onClick={onGenerateImage} className="bg-white text-stone-800 hover:bg-rose-50 font-bold py-3.5 px-8 rounded-full text-sm transition-all transform hover:scale-105 shadow-xl">
                        🔄 作り直す
                      </button>
                    </div>
                    <div className="bg-black/50 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-white text-xs w-full max-w-xs">
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <div className="relative flex items-center">
                          <input type="checkbox" checked={isHighQuality} onChange={e => setIsHighQuality(e.target.checked)} className="sr-only peer" />
                          <div className="w-9 h-5 bg-stone-600 rounded-full peer peer-checked:bg-rose-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                        </div>
                        <span className="font-bold">{isHighQuality ? 'High Quality (Gemini 3 Pro)' : 'Standard (Gemini 2.5 Flash)'}</span>
                      </label>
                      <p className="text-[10px] opacity-70 mt-1 leading-tight">
                        {isHighQuality 
                          ? '※高品質モデルはご自身のAPIキー（有料プロジェクト）の設定が必要です。画像内にタイトルやコピーが含まれます。' 
                          : '※標準モデルは高速に生成されます。画像内に文字は含まれません。'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6 py-4">
                  <div onClick={onGenerateImage} className="w-full max-w-3xl aspect-[3/2] rounded-[2rem] bg-stone-100 border-2 border-dashed border-stone-200 flex flex-col items-center justify-center cursor-pointer hover:bg-stone-200 hover:border-rose-300 transition-all group">
                    <span className="text-6xl mb-4 group-hover:scale-110 transition-transform">🖼️</span>
                    <span className="font-bold text-stone-700 text-xl group-hover:text-rose-500">サムネイル画像を作成</span>
                    <span className="text-sm text-stone-400 mt-2">サービスに合った画像を自動で生成します</span>
                  </div>
                  <div className="w-full max-lg flex flex-col items-center space-y-4">
                    <div className="flex flex-col items-center text-center">
                      <label className="inline-flex items-center cursor-pointer px-8 py-3 bg-white rounded-full border border-stone-200 shadow-sm hover:shadow transition-all group mb-2">
                        <div className="relative">
                          <input type="checkbox" className="sr-only peer" checked={isHighQuality} onChange={(e) => setIsHighQuality(e.target.checked)} />
                          <div className="w-14 h-7 bg-stone-300 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-rose-500 peer-checked:to-purple-500 transition-all"></div>
                          <div className="absolute top-[2px] left-[2px] w-6 h-6 bg-white rounded-full transition-all peer-checked:translate-x-7 shadow-sm"></div>
                        </div>
                        <span className="ml-4 font-bold text-stone-600 group-hover:text-stone-800 text-sm">{isHighQuality ? 'High Quality (Gemini 3 Pro)' : 'Standard (Gemini 2.5 Flash)'}</span>
                      </label>
                      <p className="text-[11px] text-stone-500 max-w-xs leading-relaxed">
                        {isHighQuality 
                          ? '高品質モデルはご自身のAPIキー設定が必要です。高解像度かつ正確な文字配置が可能です。' 
                          : '標準モデルは高速に生成されます。画像内に文字は含まれません。'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Prompt Area */}
              <div className="max-w-3xl mx-auto bg-stone-50 border border-stone-200 rounded-3xl overflow-hidden group">
                <div className="flex flex-col sm:flex-row items-center justify-between p-6 gap-4">
                  <button 
                    onClick={() => setShowPrompt(!showPrompt)} 
                    className="flex items-center gap-4 hover:bg-stone-100/50 transition-colors text-left flex-grow w-full sm:w-auto"
                  >
                    <div className="relative shrink-0 group-hover:scale-110 transition-transform duration-500">
                      <div className="absolute -inset-2 bg-gradient-to-tr from-orange-400 via-rose-400 to-purple-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition-opacity"></div>
                      <div className="relative bg-white p-2.5 rounded-2xl border border-stone-100 shadow-sm flex items-center justify-center w-12 h-12 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-rose-50/50"></div>
                        <span className="text-2xl relative z-10">🎨</span>
                        <span className="absolute top-1 right-1 text-[10px] animate-pulse">✨</span>
                      </div>
                    </div>
                    <div className="flex-grow">
                      <h5 className="text-sm font-bold text-stone-700">画像生成プロンプト</h5>
                      <p className="text-[11px] text-stone-400 mt-0.5">Gemini への直接依頼や他ツールでの利用に</p>
                    </div>
                    <span className={`text-stone-400 transition-transform duration-300 ml-2 shrink-0 ${showPrompt ? 'rotate-180' : ''}`}>▼</span>
                  </button>
                  
                  <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                    <div className="flex flex-wrap gap-2 justify-end">
                      <button 
                        onClick={handleCopyPrompt} 
                        className={`text-xs font-bold px-5 py-2 rounded-full border transition-all shrink-0 ${
                          promptCopied 
                            ? 'bg-green-100 text-green-700 border-green-200' 
                            : 'bg-stone-800 text-white hover:bg-stone-700 shadow-md'
                        }`}
                      >
                        {promptCopied ? 'コピー済' : 'プロンプトをコピー'}
                      </button>
                      <a 
                        href="https://gemini.google.com/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-6 py-2 bg-white border border-orange-200 rounded-full text-xs font-bold text-orange-700 hover:bg-orange-50 transition-all shadow-sm hover:shadow active:scale-95 whitespace-nowrap"
                      >
                        Geminiを起動
                      </a>
                    </div>
                    <p className="text-[10px] text-orange-600 font-bold text-right leading-tight">
                      Geminiでは、🍌画像を作成と思考モードにする。
                    </p>
                  </div>
                </div>
                
                {showPrompt && (
                  <div className="p-6 pt-0 animate-in fade-in slide-in-from-top-2">
                    <div className="bg-white rounded-2xl border border-stone-200 p-6 relative group">
                      <pre className="text-xs font-mono text-stone-500 bg-stone-50 p-4 rounded-xl whitespace-pre-wrap leading-relaxed border border-stone-100 overflow-y-auto max-h-[150px] custom-scrollbar">
                        {advancedPrompt}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Content Cards */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CopySection title="タイトル" content={parsed.title} icon="🏷️" />
                <CopySection title="キャッチコピー" content={parsed.catchphrase} icon="🎣" />
                <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm md:col-span-2">
                  <h4 className="font-bold text-stone-700 flex items-center gap-2 text-sm mb-4"><span className="text-lg">📂</span> カテゴリ・サブカテゴリ</h4>
                  <div className="bg-stone-50/50 rounded-xl p-5 text-stone-600 text-sm border border-stone-100 flex items-center gap-3">
                    <span className="font-bold text-stone-800">{parsed.category || '未設定'}</span>
                    <span className="text-stone-300">/</span>
                    <span className="text-stone-500">{parsed.subCategory || '未設定'}</span>
                  </div>
                </div>
              </div>
              <CopySection title="サービス詳細" content={parsed.detail} icon="📝" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CopySection title="キャンセル時の注意事項" content={parsed.policy} icon="⚠️" />
                <CopySection title="依頼テンプレート" content={parsed.template} icon="📋" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e7e5e4; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d6d3d1; }
      `}</style>
    </div>
  );
};

export default ServiceResult;
