
import React, { useState } from 'react';
import { UserInput } from '../types';

interface InputFormProps {
  onSubmit: (input: UserInput) => void;
}

const InputForm: React.FC<InputFormProps> = ({ onSubmit }) => {
  const [rawText, setRawText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) {
      alert("情報を入力してください。");
      return;
    }
    onSubmit({ rawText });
  };

  return (
    <div className="p-8 md:p-12 h-full flex flex-col">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-rose-500 font-bold tracking-wider text-xs uppercase mb-1 block">Step 1</span>
          <h2 className="text-3xl font-bold text-stone-800 tracking-tight">あなたの強みを教えてください</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-grow flex flex-col space-y-8">
        <div className="relative group flex-grow">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-200 to-rose-200 rounded-3xl opacity-30 group-hover:opacity-60 transition duration-500 blur"></div>
          <div className="relative h-full">
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full h-full min-h-[300px] p-8 border-0 bg-white rounded-2xl focus:ring-0 shadow-sm text-stone-700 placeholder:text-stone-300 text-lg leading-relaxed resize-none outline-none transition-all"
              placeholder="ここに自由に書き込んでください。
箇条書きでも、文章でも、メモのコピーでも構いません。

・好きなこと
・得意なこと
・これまでの経験

AIがあなたの隠れた才能を見つけ出し、魅力的なサービス案を作成します。"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-orange-400 via-rose-500 to-purple-600 hover:from-orange-500 hover:via-rose-600 hover:to-purple-700 text-white font-bold text-lg py-5 px-8 rounded-2xl transition-all shadow-xl shadow-rose-200 hover:shadow-rose-300 hover:-translate-y-1 flex items-center justify-center gap-3 group overflow-hidden relative"
        >
          <span className="relative z-10">アイデアを生成する</span>
          <span className="relative z-10 group-hover:translate-x-1 transition-transform">→</span>
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-2xl"></div>
        </button>
      </form>
    </div>
  );
};

export default InputForm;
