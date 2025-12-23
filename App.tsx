
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
      } else if (process.env.API_KEY || localStorage.getItem("gemini_api_key")) {
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

  const inputWords = useMemo(() => {
    if (!rawInputText) return [];
    // Split by whitespace, punctuation, and common separators. Filter for words 2 chars or longer.
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
    } else {
      const manualKey = prompt("APIキーを入力してください (Google AI Studio)");
      if (manualKey) {
        localStorage.setItem("gemini_api_key", manualKey.trim());
        setHasKey(true);
        return true;
      }
    }
    return false;
  };

  const ensureKeySet = async (): Promise<boolean> => {
    const aistudio = (window as any).aistudio;
    let keyExists = false;
    if (aistudio) {
      keyExists = await aistudio.hasSelectedApiKey();
    } else {
      keyExists = !!(process.env.API_KEY || localStorage.getItem("gemini_api_key"));
    }
    if (!keyExists) return await handleOpenKeySelection();
    return true;
  };

  const handleStartIdeaGeneration = async (input: UserInput) => {
    setRawInputText(input.rawText);
    localStorage.setItem(STORAGE_KEY_INPUT, input.rawText);
    
    setIsLoading(true);
    setLoadingTitle("AIが思考中...");
    setLoadingMessage("あなたの情報をAIが分析し、最適なアイデアを練り上げています...");
    try {
      const result = await generateIdeas(input);
      setIdeas(result);
      localStorage.setItem(STORAGE_KEY_IDEAS, JSON.stringify(result));
      setStep(Step.IDEAS);
    } catch (error: any) {
      console.error(error);
      if (error.message === "KEY_RESET_REQUIRED") {
        handleOpenKeySelection();
      } else {
        alert("アイデアの生成に失敗しました。APIキーを確認してください。");
      }
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
    setLoadingMessage("このアイデアの販売ページを構成しています...");
    
    try {
      const pageText = await generateServicePage(idea);
      const updatedIdeas = ideas.map(i => 
        i.id === idea.id ? { ...i, generatedContent: pageText } : i
      );
      setIdeas(updatedIdeas);
      localStorage.setItem(STORAGE_KEY_IDEAS, JSON.stringify(updatedIdeas));
      setServiceText(pageText);
      setStep(Step.DETAIL);
      window.scrollTo(0, 0);
    } catch (error: any) {
      console.error(error);
      setStep(Step.IDEAS);
      if (error.message === "KEY_RESET_REQUIRED") {
        handleOpenKeySelection();
      } else {
        alert("ページの作成に失敗しました。");
      }
    } finally {
      setIsLoading(false);
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
    setLoadingMessage("AIがサービスに最適な画像を生成しています...");

    try {
      const imageUrl = await generateThumbnail(selectedIdea, useQuality);
      const updatedIdeas = ideas.map(i => 
        i.id === selectedIdea.id ? { ...i, thumbnailUrl: imageUrl } : i
      );
      setIdeas(updatedIdeas);
      localStorage.setItem(STORAGE_KEY_IDEAS, JSON.stringify(updatedIdeas));
      setSelectedIdea(prev => prev ? ({ ...prev, thumbnailUrl: imageUrl }) : null);
    } catch (error: any) {
      console.error("Image generation error", error);
      const msg = error.message?.toLowerCase() || "";
      if (msg.includes("permission") || msg.includes("quota") || msg.includes("403") || msg.includes("not found")) {
        const reset = confirm("APIキーの権限が不足しているか、無効なようです。APIキーを選択し直しますか？");
        if (reset) handleOpenKeySelection();
      } else {
        alert(`画像の生成に失敗しました: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const forceReset = () => {
    localStorage.removeItem(STORAGE_KEY_IDEAS);
    localStorage.removeItem(STORAGE_KEY_INPUT);
    setIdeas([]);
    setRawInputText("");
    setStep(Step.INPUT);
    setServiceText("");
    setSelectedIdea(null);
    setShowResetConfirm(false);
    window.scrollTo(0, 0);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 font-sans relative">
      <header className="mb-12 flex flex-col md:flex-row items-center justify-between gap-6 relative z-50">
        <div 
          className={`text-center md:text-left ${step !== Step.INPUT ? 'cursor-pointer group' : ''}`}
          onClick={() => step !== Step.INPUT && setShowResetConfirm(true)}
        >
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-stone-800 to-stone-600">Skill Market</span>
            <span className="block md:inline md:ml-2 bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-rose-500 to-purple-600">
              Creator Pro
            </span>
          </h1>
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <p className="text-stone-500 font-medium tracking-wide text-sm group-hover:text-rose-500 transition-colors">
              あなたの「好き」を、価値あるスキルマーケットサービスへ。
            </p>
            <a 
              href="https://library.libecity.com/articles/01KD26FQVJ9VJNH99JBJ9F3TGS" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-50/50 hover:bg-rose-50 px-3 py-1.5 rounded-full border border-rose-100 transition-all shrink-0"
            >
              <span>📖</span> 使い方・解説記事
            </a>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={handleOpenKeySelection}
            className={`text-xs font-bold flex items-center gap-1.5 px-4 py-2.5 rounded-full border transition-all cursor-pointer relative z-50 ${
              hasKey 
                ? 'text-stone-400 hover:text-stone-600 bg-white/50 hover:bg-white border-stone-200/50 hover:border-stone-200' 
                : 'text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100 hover:border-rose-300 shadow-sm'
            }`}
          >
            <span>{hasKey ? '⚙️' : '✨'}</span> APIキーを設定
          </button>
        </div>
      </header>

      <main className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-stone-200/50 overflow-hidden min-h-[600px] border border-white ring-1 ring-stone-100 relative flex flex-col z-10">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-gradient-to-br from-orange-100/40 to-rose-100/40 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-gradient-to-tr from-purple-100/40 to-blue-100/40 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex-grow w-full flex flex-col">
          {step === Step.INPUT && <InputForm onSubmit={handleStartIdeaGeneration} />}
          {step === Step.IDEAS && (
            <IdeaList 
              ideas={ideas} 
              onSelect={handleSelectIdea} 
              onBack={() => setShowResetConfirm(true)} 
            />
          )}
          {step === Step.DETAIL && (
            <ServiceResult 
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

      {showResetConfirm && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-sm w-full shadow-2xl border border-white">
            <h3 className="text-xl font-bold text-stone-800 mb-4">最初からやり直しますか？</h3>
            <p className="text-stone-500 mb-8 leading-relaxed text-sm">現在のアイデアやデータは破棄されます。</p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-3 px-4 rounded-xl font-bold text-stone-500 bg-stone-100">キャンセル</button>
              <button onClick={forceReset} className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-rose-500">はい、戻る</button>
            </div>
          </div>
        </div>
      )}

      {isLoading && <LoadingOverlay message={loadingMessage} title={loadingTitle} sourceWords={inputWords} />}
      <footer className="text-center mt-12 text-stone-400 text-sm font-medium">Powered by Gemini</footer>
    </div>
  );
};

export default App;
