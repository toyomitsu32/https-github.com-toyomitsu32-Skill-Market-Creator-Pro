
import React, { useState, useEffect, useMemo } from 'react';
import { UserInput, SkillIdea, Step } from './types';
import { generateIdeas, generateServicePage, generateThumbnail } from './services/geminiService';
import InputForm from './components/InputForm';
import IdeaList from './components/IdeaList';
import ServiceResult from './components/ServiceResult';
import LoadingOverlay from './components/LoadingOverlay';

const STORAGE_KEY_IDEAS = "skill_market_ideas";
const STORAGE_KEY_INPUT = "skill_market_raw_input";

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [step, setStep] = useState<Step>(Step.INPUT);
  const [ideas, setIdeas] = useState<SkillIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<SkillIdea | null>(null);
  const [serviceText, setServiceText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [loadingTitle, setLoadingTitle] = useState<string>("AIが思考中...");
  
  const [isHighQuality, setIsHighQuality] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [rawInputText, setRawInputText] = useState<string>("");

  useEffect(() => {
    const checkKey = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        const selected = await aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else if (process.env.API_KEY) {
        setHasKey(true);
      }
      
      const savedIdeas = localStorage.getItem(STORAGE_KEY_IDEAS);
      const savedInput = localStorage.getItem(STORAGE_KEY_INPUT);
      if (savedInput) setRawInputText(savedInput);
      
      if (savedIdeas) {
        try {
          const parsed = JSON.parse(savedIdeas);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setIdeas(parsed);
            setStep(Step.IDEAS);
          }
        } catch (e) {
          console.error("Failed to parse saved ideas", e);
        }
      }
    };
    checkKey();
  }, []);

  const saveIdeasToStorage = (data: SkillIdea[]) => {
    try {
      localStorage.setItem(STORAGE_KEY_IDEAS, JSON.stringify(data));
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        console.warn("Storage quota exceeded. Attempting to save without image data.");
        try {
          const reducedData = data.map(item => ({ ...item, thumbnailUrl: undefined }));
          localStorage.setItem(STORAGE_KEY_IDEAS, JSON.stringify(reducedData));
          setIdeas(reducedData);
          alert("ストレージ容量がいっぱいになったため、画像データを削除して保存しました。");
        } catch (innerE) {
          console.error("Critical storage failure. Clearing ideas from storage.", innerE);
          localStorage.removeItem(STORAGE_KEY_IDEAS);
        }
      } else {
        console.error("Failed to save to localStorage", e);
      }
    }
  };

  const inputWords = useMemo(() => {
    if (!rawInputText) return [];
    return rawInputText
      .split(/[\s,，.．、。!！?？\n\r\t]+/)
      .filter(w => w.length >= 2 && w.length < 15);
  }, [rawInputText]);

  const handleOpenKeySelection = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
      setHasKey(true);
      return true;
    }
    return false;
  };

  const ensureKeySet = async (): Promise<boolean> => {
    const aistudio = (window as any).aistudio;
    let keyExists = false;
    if (aistudio) {
      keyExists = await aistudio.hasSelectedApiKey();
    } else {
      keyExists = !!process.env.API_KEY;
    }
    if (!keyExists && aistudio) return await handleOpenKeySelection();
    return keyExists;
  };

  const handleApiError = (error: any) => {
    console.error(error);
    const msg = error.message || "";
    if (msg.includes("Requested entity was not found")) {
      setHasKey(false);
      handleOpenKeySelection();
    } else {
      alert("エラーが発生しました。しばらくしてから再度お試しください。");
    }
  };

  const handleStartIdeaGeneration = async (input: UserInput) => {
    setRawInputText(input.rawText);
    try {
      localStorage.setItem(STORAGE_KEY_INPUT, input.rawText);
    } catch (e) {
      console.warn("Failed to save raw input to storage", e);
    }
    
    setIsLoading(true);
    setLoadingTitle("AIが思考中...");
    setLoadingMessage("あなたの情報を分析し、最適なアイデアを練り上げています...");
    try {
      const result = await generateIdeas(input);
      setIdeas(result);
      saveIdeasToStorage(result);
      setStep(Step.IDEAS);
    } catch (error: any) {
      handleApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectIdea = async (idea: SkillIdea) => {
    if (idea.generatedContent) {
      setSelectedIdea(idea);
      setServiceText(idea.generatedContent);
      setStep(Step.DETAIL);
      window.scrollTo(0, 0);
      return;
    }

    setSelectedIdea(idea);
    setStep(Step.GENERATING_DETAIL);
    setIsLoading(true);
    setLoadingTitle(`「${idea.title}」`);
    setLoadingMessage("このアイデアの出品ページを構成しています...");
    
    try {
      const pageText = await generateServicePage(idea);
      const updatedIdeas = ideas.map(i => 
        i.id === idea.id ? { ...i, generatedContent: pageText } : i
      );
      setIdeas(updatedIdeas);
      saveIdeasToStorage(updatedIdeas);
      setServiceText(pageText);
      setStep(Step.DETAIL);
      window.scrollTo(0, 0);
    } catch (error: any) {
      setStep(Step.IDEAS);
      handleApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteIdea = (e: React.MouseEvent, ideaId: string) => {
    e.stopPropagation();
    if (confirm("このアイデアを削除しますか？")) {
      const updatedIdeas = ideas.filter(i => i.id !== ideaId);
      setIdeas(updatedIdeas);
      saveIdeasToStorage(updatedIdeas);
    }
  };

  const handleGenerateThumbnailImage = async (forceQuality?: boolean) => {
    if (!selectedIdea) return;
    const useQuality = forceQuality ?? isHighQuality;

    if (useQuality) {
      const keyReady = await ensureKeySet();
      if (!keyReady) return;
    }
    
    setIsLoading(true);
    setLoadingTitle("サムネイル生成中...");
    setLoadingMessage("サービスに最適な画像を生成しています...");

    try {
      const imageUrl = await generateThumbnail(selectedIdea, useQuality);
      const updatedIdeas = ideas.map(i => 
        i.id === selectedIdea.id ? { ...i, thumbnailUrl: imageUrl } : i
      );
      setIdeas(updatedIdeas);
      saveIdeasToStorage(updatedIdeas);
      setSelectedIdea(prev => prev ? ({ ...prev, thumbnailUrl: imageUrl }) : null);
    } catch (error: any) {
      handleApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const forceReset = () => {
    // 指示に基づき、localStorageのデータを物理的に消去
    localStorage.removeItem(STORAGE_KEY_IDEAS);
    localStorage.removeItem(STORAGE_KEY_INPUT);
    
    // 全ステートを初期化
    setIdeas([]);
    setRawInputText("");
    setStep(Step.INPUT);
    setServiceText("");
    setSelectedIdea(null);
    setShowResetConfirm(false);
    
    // 最上部へスクロール
    window.scrollTo(0, 0);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-12 font-sans relative">
      <header className={`mb-6 md:mb-12 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 relative z-50 transition-all ${step === Step.INPUT ? 'md:mb-8' : ''}`}>
        <div 
          className={`text-center md:text-left ${step !== Step.INPUT ? 'cursor-pointer group' : ''}`}
          onClick={() => step !== Step.INPUT && setShowResetConfirm(true)}
        >
          <h1 className="text-3xl md:text-5xl font-extrabold mb-1 md:mb-2 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-stone-800 to-stone-600">Skill Market</span>
            <span className="block md:inline md:ml-2 bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-rose-500 to-purple-600">
              Creator Pro
            </span>
          </h1>
          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
            <p className="text-stone-400 md:text-stone-500 font-medium tracking-wide text-xs md:text-sm group-hover:text-rose-500 transition-colors">
              あなたの「好き」を、価値あるスキルマーケット出品サービスへ。
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <a 
            href="https://library.libecity.com/articles/01KD26FQVJ9VJNH99JBJ9F3TGS" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-50/50 hover:bg-rose-50 px-3 md:px-4 py-2 md:py-2.5 rounded-full border border-rose-100 transition-all shadow-sm shrink-0"
          >
            <span>📖</span> 使い方
          </a>
          <button 
            type="button"
            onClick={handleOpenKeySelection}
            className={`text-[10px] md:text-xs font-bold flex items-center gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-full border transition-all cursor-pointer relative z-50 ${
              hasKey 
                ? 'text-stone-400 hover:text-stone-600 bg-white/50 hover:bg-white border-stone-200/50 hover:border-stone-200' 
                : 'text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100 hover:border-rose-300 shadow-sm'
            }`}
          >
            <span>{hasKey ? '⚙️' : '✨'}</span> {hasKey ? 'キー設定' : 'APIキー設定'}
          </button>
        </div>
      </header>

      <main className="bg-white/80 backdrop-blur-xl rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl shadow-stone-200/50 overflow-hidden min-h-[500px] md:min-h-[600px] border border-white ring-1 ring-stone-100 relative flex flex-col z-10">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-gradient-to-br from-orange-100/40 to-rose-100/40 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-gradient-to-tr from-purple-100/40 to-blue-100/40 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex-grow w-full flex flex-col">
          {step === Step.INPUT && <InputForm onSubmit={handleStartIdeaGeneration} />}
          {step === Step.IDEAS && (
            <IdeaList 
              ideas={ideas} 
              onSelect={handleSelectIdea} 
              onDelete={handleDeleteIdea}
              onBack={() => setShowResetConfirm(true)} 
            />
          )}
          {step === Step.DETAIL && selectedIdea && (
            <ServiceResult 
              idea={selectedIdea}
              content={serviceText} 
              thumbnailUrl={selectedIdea?.thumbnailUrl}
              onGenerateImage={() => handleGenerateThumbnailImage()}
              isHighQuality={isHighQuality}
              setIsHighQuality={setIsHighQuality}
              onReset={() => setShowResetConfirm(true)}
              onBack={() => setStep(Step.IDEAS)}
            />
          )}
        </div>
      </main>

      {/* リセット確認モーダル (最初からやり直す) */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-10 md:p-14 max-w-md w-full shadow-2xl border border-white flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center text-4xl mb-8 shadow-inner">
              🗑️
            </div>
            <h3 className="text-2xl font-black text-stone-800 mb-4 tracking-tight">最初からやり直しますか？</h3>
            <p className="text-stone-500 mb-10 leading-relaxed font-medium">
              全てのデータ（履歴・画像）を消去して初期状態に戻しますか？<br/>
              <span className="text-rose-500 text-sm font-bold mt-2 inline-block">※この操作は取り消せません。</span>
            </p>
            <div className="flex flex-col gap-4 w-full">
              <button 
                onClick={forceReset} 
                className="w-full py-4.5 px-6 rounded-2xl font-bold text-white bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 transition-all shadow-xl shadow-rose-200 active:scale-95"
              >
                はい、データを消去してリセット
              </button>
              <button 
                onClick={() => setShowResetConfirm(false)} 
                className="w-full py-4 px-6 rounded-2xl font-bold text-stone-500 bg-stone-100 hover:bg-stone-200 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading && <LoadingOverlay message={loadingMessage} title={loadingTitle} sourceWords={inputWords} />}
      
      <footer className="mt-12 md:mt-16 pb-8">
        <div className="max-w-3xl mx-auto bg-stone-100/50 rounded-[2rem] p-8 border border-stone-200/60">
          <h4 className="text-stone-600 font-bold text-sm mb-4 flex items-center gap-2">
            <span>🛡️</span> 免責事項
          </h4>
          <div className="space-y-3 text-[11px] md:text-xs text-stone-500 leading-relaxed font-medium">
            <p>
              ・本サービスが生成する全てのコンテンツ（アイデア、文章、画像、カテゴリ提案等）はAI（人工知能）によって自動生成されたものであり、その内容の正確性、有用性、最新性、合法性、および道徳性を保証するものではありません。
            </p>
            <p>
              ・High Quality のサムネイル画像を生成するには、利用者のAPI利用料金がかかります。ご自身のAPIキーの設定をご確認の上ご利用ください。
            </p>
            <p>
              ・生成された内容を実際のスキルマーケットに出品する際は、必ずご自身で内容を確認・修正し、各プラットフォームの利用規約やガイドラインを遵守してください。
            </p>
            <p>
              ・本サービスの利用により生じた損害、トラブル、不利益、または第三者との権利侵害に関する紛争について、本サービスの提供者は一切の責任を負いかねます。
            </p>
          </div>
        </div>
        <p className="text-center mt-8 text-stone-400 text-[10px] md:text-sm font-medium italic">Powered by Gemini</p>
      </footer>
    </div>
  );
};

export default App;
