
import React from 'react';
import { SkillIdea } from '../types';

interface IdeaListProps {
  ideas: SkillIdea[];
  onSelect: (idea: SkillIdea) => void;
  onBack: (e?: React.MouseEvent) => void;
}

const IdeaList: React.FC<IdeaListProps> = ({ ideas, onSelect, onBack }) => {
  if (ideas.length === 0) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center h-full min-h-[400px]">
        <div className="text-6xl mb-6 animate-pulse">🤔</div>
        <h3 className="text-2xl font-bold text-stone-800 mb-4">アイデアが見つかりませんでした</h3>
        <p className="text-stone-500 mb-8 max-w-md mx-auto leading-relaxed">
          入力情報からうまく生成できませんでした。<br/>
          もう少し詳しく、または別の角度から入力してみてください。
        </p>
        <button 
          type="button"
          onClick={(e) => onBack(e)}
          className="bg-stone-800 hover:bg-stone-900 text-white font-bold py-3 px-8 rounded-full transition-all shadow-lg hover:shadow-xl flex items-center gap-2 cursor-pointer relative z-50"
        >
          <span>↩</span> 入力画面に戻る
        </button>
      </div>
    );
  }

  const standardIdeas = ideas.filter(i => i.type === 'standard');
  const nicheIdeas = ideas.filter(i => i.type === 'niche');

  const renderSection = (title: string, icon: string, description: string, items: SkillIdea[], accentColor: string, iconBg: string) => (
    <div className="mb-16 last:mb-0">
      <div className="flex items-start md:items-center flex-col md:flex-row gap-4 mb-8">
        <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center text-2xl shadow-sm shrink-0`}>
          {icon}
        </div>
        <div>
          <h3 className="text-2xl font-bold text-stone-800 tracking-tight">{title}</h3>
          <p className="text-stone-500 text-sm mt-1">{description}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map((idea) => {
          const isGenerated = !!idea.generatedContent;
          return (
            <button
              key={idea.id}
              type="button"
              onClick={() => onSelect(idea)}
              className={`text-left p-7 rounded-[2rem] transition-all duration-300 group flex flex-col h-full relative overflow-hidden border border-white
                ${isGenerated 
                  ? 'bg-green-50/80 ring-1 ring-green-400/30' 
                  : 'bg-white/60 hover:bg-white hover:shadow-xl hover:shadow-stone-200/40 hover:-translate-y-1'
                }
              `}
            >
              <div className={`absolute top-0 left-0 w-1 h-full ${isGenerated ? 'bg-green-400' : accentColor} opacity-0 group-hover:opacity-100 transition-opacity`}></div>

              <div className="flex justify-between items-start mb-3">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${isGenerated ? 'text-green-600' : 'text-stone-400'}`}>
                  Idea
                </span>
                {isGenerated ? (
                   <span className="text-[10px] font-bold text-green-700 bg-green-200/50 px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm">
                     ✅ 作成済
                   </span>
                ) : (
                  <span className={`opacity-0 group-hover:opacity-100 transition-all duration-300 text-xs font-bold flex items-center gap-1 ${isGenerated ? 'text-green-600' : 'text-rose-500'}`}>
                    作成する <span>→</span>
                  </span>
                )}
              </div>
              
              <h4 className="text-lg font-bold text-stone-800 mb-4 leading-snug group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-stone-800 group-hover:to-stone-600 transition-colors">
                {idea.title}
              </h4>

              <div className={`mb-4 px-4 py-3 rounded-xl ${isGenerated ? 'bg-white/60' : 'bg-stone-50/80'} border border-stone-100`}>
                <span className="text-[10px] font-bold text-stone-400 block mb-1 uppercase tracking-wider">Strength</span>
                <p className="text-sm text-stone-600 leading-relaxed font-medium">
                  {idea.strength}
                </p>
              </div>

              <p className="text-sm text-stone-500 leading-relaxed flex-grow pl-1">
                <span className="font-bold text-stone-600 mr-1">Solution:</span> {idea.solution}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="p-8 md:p-12">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12 pb-8 border-b border-stone-100">
        <div>
          <span className="text-rose-500 font-bold tracking-wider text-xs uppercase mb-1 block">Step 2</span>
          <h2 className="text-3xl font-bold text-stone-800 tracking-tight">気になるアイデアを選択</h2>
          <p className="text-stone-500 mt-2 font-medium">
            あなたにぴったりの <span className="text-stone-800 font-bold">{ideas.length}</span> 件のアイデアが見つかりました
          </p>
        </div>
        <button 
          type="button"
          onClick={(e) => onBack(e)}
          className="bg-white hover:bg-stone-50 text-stone-600 border border-stone-200 py-2.5 px-5 rounded-full font-bold text-xs transition-colors shadow-sm shrink-0 cursor-pointer relative z-50 active:scale-95"
        >
          ↩ 入力画面に戻る
        </button>
      </div>

      {renderSection(
        "Standard Ideas", 
        "👑", 
        "みんなが求めていて、安心して選べる王道アイデア",
        standardIdeas,
        "bg-orange-400",
        "bg-orange-100 text-orange-600"
      )}

      {renderSection(
        "Niche & Unique", 
        "🧪", 
        "ライバルが少なく、あなただから選ばれる個性派アイデア",
        nicheIdeas,
        "bg-purple-500",
        "bg-purple-100 text-purple-600"
      )}
    </div>
  );
};

export default IdeaList;
