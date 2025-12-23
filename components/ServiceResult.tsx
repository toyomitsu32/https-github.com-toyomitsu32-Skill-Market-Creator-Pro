
import React, { useState, useMemo } from 'react';

interface ServiceResultProps {
  content: string;
  thumbnailUrl?: string;
  onGenerateImage: () => void;
  isHighQuality: boolean;
  setIsHighQuality: (value: boolean) => void;
  onReset: (e?: React.MouseEvent) => void;
  onBack: () => void;
}

/**
 * Parses the generated content "faithfully" based on the headers and markers
 * specified in the Step 2 generation prompt.
 */
const parseServiceContent = (text: string) => {
  const normalized = text.replace(/\r\n/g, '\n');
  
  const getValue = (key: string) => {
    // Look for the key at the start of a line followed by a colon
    const regex = new RegExp(`^${key}[:：]\\s*(.*)$`, 'm');
    const match = normalized.match(regex);
    return match ? match[1].trim() : '';
  };

  const category = getValue('カテゴリ');
  const subCategory = getValue('サブカテゴリ');
  const title = getValue('タイトル');
  const catchphrase = getValue('キャッチコピー');

  const policyMarker = '⚠️注意事項・キャンセルポリシー';
  const templateMarker = '📝依頼テンプレート';
  
  // Locate the start of the detail section
  const detailHeaderMatch = normalized.match(/^サービス詳細[（(].*[）)].*$/m);
  const detailStart = detailHeaderMatch 
    ? detailHeaderMatch.index! + detailHeaderMatch[0].length 
    : (normalized.indexOf('キャッチコピー') !== -1 
        ? normalized.indexOf('\n', normalized.indexOf('キャッチコピー')) 
        : 0);

  // Locate markers for splitting
  const policyIdx = normalized.indexOf(policyMarker);
  const templateIdx = normalized.indexOf(templateMarker);

  // Find the end of the detail section (the first occurring marker)
  const detailEnd = [policyIdx, templateIdx]
    .filter(i => i !== -1)
    .sort((a, b) => a - b)[0] || normalized.length;

  const detail = normalized.substring(detailStart, detailEnd).trim();

  // Extract policy
  let policy = '';
  if (policyIdx !== -1) {
    const end = (templateIdx !== -1 && templateIdx > policyIdx) ? templateIdx : normalized.length;
    policy = normalized.substring(policyIdx + policyMarker.length, end).trim();
  }

  // Extract template
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
  content, thumbnailUrl, onGenerateImage, isHighQuality, setIsHighQuality, onReset, onBack
}) => {
  const [isAllCopied, setIsAllCopied] = useState(false);
  const parsed = useMemo(() => parseServiceContent(content), [content]);
  
  const handleCopyAll = () => {
    navigator.clipboard.writeText(content).then(() => {
      setIsAllCopied(true);
      setTimeout(() => setIsAllCopied(false), 2000);
    });
  };

  const handleDownloadImage = () => {
    if (!thumbnailUrl) return;
    const link = document.createElement('a');
    link.href = thumbnailUrl;
    link.download = `service-thumbnail-${Date.now()}.png`;
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Thumbnail Section */}
          <div className="w-full space-y-4">
            {thumbnailUrl ? (
              <div className="relative group rounded-[1.5rem] overflow-hidden shadow-lg border border-stone-100 bg-stone-50">
                <img src={thumbnailUrl} className="w-full object-cover aspect-[4/3]" alt="Thumbnail" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center p-6 space-y-4">
                  <div className="flex gap-3">
                    <button onClick={handleDownloadImage} className="bg-rose-500 text-white hover:bg-rose-600 font-bold py-3.5 px-8 rounded-full text-sm transition-all transform hover:scale-105 shadow-xl flex items-center gap-2">
                      <span>📥</span> 保存する
                    </button>
                    <button onClick={onGenerateImage} className="bg-white text-stone-800 hover:bg-rose-50 font-bold py-3.5 px-8 rounded-full text-sm transition-all transform hover:scale-105 shadow-xl">
                      🔄 作り直す
                    </button>
                  </div>
                  
                  {/* Miniature version of toggle for quick switching in 'Regenerate' mode */}
                  <div className="bg-black/50 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-white text-xs w-full max-w-xs">
                    <label className="flex items-center gap-3 mb-2 cursor-pointer select-none">
                      <div className="relative flex items-center">
                        <input 
                          type="checkbox" 
                          checked={isHighQuality} 
                          onChange={e => setIsHighQuality(e.target.checked)} 
                          className="sr-only peer" 
                        />
                        <div className="w-9 h-5 bg-stone-600 rounded-full peer peer-checked:bg-rose-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                      </div>
                      <span className="font-bold">{isHighQuality ? 'High Quality (Gemini 3 Pro)' : 'Standard (Gemini 2.5 Flash)'}</span>
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6 py-6">
                <div 
                  onClick={onGenerateImage} 
                  className="w-full aspect-[4/3] rounded-[1.5rem] bg-stone-100 border-2 border-dashed border-stone-200 flex flex-col items-center justify-center cursor-pointer hover:bg-stone-200 hover:border-rose-300 transition-all group"
                >
                  <span className="text-5xl mb-3 group-hover:scale-110 transition-transform">🖼️</span>
                  <span className="font-bold text-stone-600 group-hover:text-rose-500">サムネイル画像を作成</span>
                  <span className="text-xs text-stone-400 mt-2">AIがサービスに合った画像を生成します</span>
                  <span className="text-[10px] text-stone-300">(660x440px)</span>
                </div>

                {/* Model Selector - State Sensitive Toggle Design */}
                <div className="w-full max-w-lg flex flex-col items-center space-y-4">
                  <label className="inline-flex items-center cursor-pointer px-6 py-2 bg-white rounded-full border border-stone-200 shadow-sm hover:shadow transition-all group min-w-[320px] justify-center">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={isHighQuality}
                        onChange={(e) => setIsHighQuality(e.target.checked)}
                      />
                      <div className="w-14 h-7 bg-stone-300 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-rose-500 peer-checked:to-purple-500 transition-all"></div>
                      <div className="absolute top-[2px] left-[2px] w-6 h-6 bg-white rounded-full transition-all peer-checked:translate-x-7 shadow-sm"></div>
                    </div>
                    <span className="ml-4 font-bold text-stone-600 group-hover:text-stone-800 text-sm whitespace-nowrap">
                      {isHighQuality ? 'High Quality (Gemini 3 Pro)' : 'Standard (Gemini 2.5 Flash)'}
                    </span>
                  </label>

                  <div className="w-full transition-all duration-300 min-h-[100px] flex flex-col items-center text-center">
                    {isHighQuality ? (
                      <div className="animate-in fade-in slide-in-from-top-1">
                        <h5 className="text-rose-500 font-bold text-xs mb-3 tracking-wider uppercase">
                          【Gemini 3 Pro 利用時の留意点】
                        </h5>
                        <ul className="text-stone-500 text-[11px] leading-relaxed space-y-1.5 list-disc text-left max-w-[340px] pl-4">
                          <li>画像内にタイトルやキャッチコピーの<span className="font-bold text-stone-700">文字を入れる</span>ことができます。</li>
                          <li>APIキーの設定が必要になります。</li>
                        </ul>
                      </div>
                    ) : (
                      <div className="animate-in fade-in slide-in-from-bottom-1 max-w-[340px]">
                        <p className="text-stone-400 text-[11px] leading-relaxed mt-2">
                          ※標準モデル（Gemini 2.5）は画像内の文字入れを行いませんが、高速かつ安定して生成できます。
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Content Sections */}
          <div className="space-y-4 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CopySection title="タイトル" content={parsed.title} icon="🏷️" />
              <CopySection title="キャッチコピー" content={parsed.catchphrase} icon="🎣" />
              
              <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm md:col-span-2">
                <h4 className="font-bold text-stone-700 flex items-center gap-2 text-sm mb-3">
                  <span className="text-lg">📂</span> カテゴリ・サブカテゴリ
                </h4>
                <div className="bg-stone-50/50 rounded-xl p-4 text-stone-600 text-sm border border-stone-100/50 flex flex-wrap items-center gap-2 min-h-[50px]">
                  {parsed.category ? (
                    <>
                      <span className="font-bold text-stone-800">{parsed.category}</span>
                      {parsed.subCategory && <span className="text-stone-300 mx-1">/</span>}
                      {parsed.subCategory && <span className="text-stone-500">{parsed.subCategory}</span>}
                    </>
                  ) : (
                    <span className="text-stone-400 italic">情報がありません（AIに再生成を依頼してください）</span>
                  )}
                </div>
              </div>
            </div>
            
            <CopySection title="サービス詳細" content={parsed.detail} icon="📝" />
            <CopySection title="キャンセル時の注意事項" content={parsed.policy} icon="⚠️" />
            <CopySection title="依頼テンプレート" content={parsed.template} icon="📋" />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-orange-50 p-7 rounded-[2.5rem] border border-orange-100 sticky top-6 shadow-sm shadow-orange-100">
            <h4 className="text-orange-800 font-bold text-xl mb-4 flex items-center gap-2">
              <span className="text-2xl">🚀</span> 次のステップ
            </h4>
            <ul className="text-orange-900/80 text-sm space-y-4 pl-1 mb-10">
              <li className="flex gap-2 items-start">
                <span className="text-orange-400 mt-0.5">•</span>
                <span>コピーボタンで各項目をクリップボードに保存しましょう。</span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="text-orange-400 mt-0.5">•</span>
                <span>
                  <a 
                    href="https://skill.libecity.com/services/new" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-rose-600 hover:text-rose-700 underline decoration-rose-300 underline-offset-4 font-bold"
                  >
                    スキルマーケットの出品画面
                  </a>
                  に貼り付けます。
                </span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="text-orange-400 mt-0.5">•</span>
                <span>生成されたサムネイル画像をダウンロードして登録しましょう。</span>
              </li>
            </ul>
            <div className="pt-8 border-t border-orange-200">
              <button 
                onClick={(e) => onReset(e)} 
                className="w-full py-4 bg-white hover:bg-orange-100 text-stone-600 rounded-2xl font-bold text-sm border border-orange-200 transition-all shadow-sm active:scale-95"
              >
                最初から作り直す
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceResult;
