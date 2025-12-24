import { GoogleGenAI, Type } from "@google/genai";
import { UserInput, SkillIdea } from "../types";

const generateUniqueId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

export const getThumbnailPrompt = (idea: SkillIdea, useHighQuality: boolean = false): string => {
  let catchphrase = "";
  // Check if content is provided in the idea or externally
  const content = idea.generatedContent || "";
  const match = content.match(/キャッチコピー[：:]\s*(.*)/);
  if (match) {
    catchphrase = match[1].trim();
  }

  if (useHighQuality) {
    return `Generate a thumbnail image for a skill market service listing.
**Text in Image:**
- Title: "${idea.title}"
- Catchphrase: "${catchphrase}"
**Context:** ${idea.strength}, ${idea.solution}
**Requirements:**
- Aspect Ratio: 3:2
- **Text Handling:** Include the Service Title exactly as provided. For the Catchphrase, do NOT include the full text. Instead, **extract only the most essential, punchy keywords or a very short summary** into a concise, visually appealing tagline inside the image.
- Ensure text is large, bold, and easy to read, but **avoid overcrowding the image with excessively long text.**
- Professional style.
- High definition.`;
  } else {
    return `Generate a thumbnail image for a skill market service listing.
**Context:** "${idea.title}", ${idea.strength}
**Requirements:** Do NOT include any text inside the image. Pure visual representation. Professional and attractive.`;
  }
};

export const generateIdeas = async (input: UserInput): Promise<SkillIdea[]> => {
  // Always obtain the API key exclusively from process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
あなたはプロのスキルマーケット・コンサルタントです。
入力されたテキストから「好きなこと」「得意なこと」「経験」の情報を読み取り、それらを掛け合わせてスキルマーケット（ココナラなど）の出品アイデアを提案してください。

【入力された生データ】
${input.rawText}

【タスク】
以下の2つのカテゴリで、それぞれ10個ずつ、合計20個のアイデアを出力してください。

1. **standard（王道・スタンダード）**: 市場で需要が安定しており、初心者でも参入しやすい手堅いアイデア。
2. **niche（ニッチ・ユニーク）**: 「えっ、そんなこと？」と思うような隙間産業や、ユーザーの個性が強烈に活きる差別化されたアイデア。

【出力形式】
JSON配列で出力してください。各要素は以下のキーを持つオブジェクトにしてください。
- "title": 出品サービスのタイトル
- "strength": このサービスで活かせる、ユーザーの潜在的な強みや独自性（具体的に）
- "solution": 誰のどんな悩みを解決するか
- "type": 文字列として "standard" または "niche" を指定

【ガイドライン】
- 最初に、入力データから「好きなこと」「得意なこと」「経験」をAIとして整理・解釈してください。
- 各アイデアは具体的で、すぐにでも出品できそうな具体的な内容にしてください。
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            strength: { type: Type.STRING },
            solution: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["standard", "niche"] }
          },
          required: ["title", "strength", "solution", "type"]
        }
      }
    }
  });

  const rawIdeas = JSON.parse(response.text || "[]");
  
  return rawIdeas.map((idea: any) => ({
    ...idea,
    id: generateUniqueId()
  }));
};

export const generateServicePage = async (selectedIdea: SkillIdea): Promise<string> => {
  // Always create a new GoogleGenAI instance right before making an API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
【役割】
あなたは、リベシティ「スキルマーケットonline」に出品するプロの出品ページクリエイターです。
以下の「カテゴリマスター」と「カテゴリ自動決定ルール」を厳守し、出品ページとしてそのまま使える魅力的な文章を作成してください。

【カテゴリマスター】
イラスト・マンガ（SNSアイコン／イラスト／マンガ／その他）
デザイン（ロゴ／チラシ・フライヤー・パンフレット／メニュー・POP／名刺・カード／書籍・カバー／結婚式・イベント／建築・インテリア・図面／プロダクト・3Dモデリング／その他）
Web制作・Webデザイン（HP・LP／ブログ／EC／HTML・CSSコーディング／Webサイトデザイン／モバイルアプリデザイン／UI・UX／素材／図解／ヘッダー・バナー／サムネイル／サービス画像・商品画像／Web制作のディレクション／その他）
IT・プログラミング（作業自動化・効率化／Webアプリ／モバイルアプリ／Mac・Windowsアプリ／サーバー・インフラ／ゲーム／システムアーキテクチャ／AI・機械学習／バグチェック・テストプレイ／保守・運用・管理／システム開発のディレクション／その他）
写真・撮影（撮影・素材提供／編集・加工／その他）
動画（撮影・素材提供／編集／サムネイル／アニメーション／データ変換・ディスク化／結婚式・イベント／PR・プロモーション／SNS／その他）
音楽・音響・ナレーション（作曲・編曲／楽譜・譜面／歌唱・楽器演奏／ナレーション／キャラクターボイス／ミックス・マスタリング／編集・加工／その他）
マーケティング（SEO対策／MEO対策／リスティング広告／ディスプレイ広告／メールマーケティング／SNSマーケティング／Webサイト分析／その他）
ハンドメイド（ワークショップ／オーダーメイド／その他）
ライティング（コピーライティング／記事作成／文章校正・編集・リライト／取材・インタビュー／シナリオ・脚本・台本／その他）
翻訳（翻訳／その他）
せどり・物販（オーダーメイドツール／各種代行／その他）
コンサル・ビジネス代行（会計・経理・財務・税務／行政法務／オンライン秘書／営業・集集／資料・企画書／起業・事業・経営／補助金・助成金／DX／データ分析・整理・集計／人事・労務／スカウト・ヘッドハント／文字起こし・データ入力／イベント企画・運営／不動産／YouTube・音声配信／SNS／ブログ・アフィリエイト／コンテンツ販売／EC／せどり・物販／家計見直し／通信費見直し／その他）
コーチング（自己理解・強みを活かす／キャリア・転職相談／人生お悩み相談／恋愛・結婚の相談／子育て・教育・進路相談／資格取得の相談／オンライン家庭教師／話術・コミュニケーション／その他）
スキルアップ支援（イラスト・マンガ／デザイン／写真・撮影／動画／音楽・音響・ナレーション／ITスキル／Web制作・Webデザイン／プログラミング／マーケティング／ハンドメイド／ライティング／その他）
ライフスタイル（ヨガ・ピラティス／フィットネス／ダイエット／ダンス／ファッション／美容／話し相手／DIY／整理収納・インテリア／グルメ・料理・献立／旅行・お出かけ／ペット／その他）
占い（恋愛・結婚／自己分析・資質・適性／仕事／対人関係／人生総合／その他）

【カテゴリ自動決定ルール】
・テーマ文から主要キーワードを抽出
・もっとも関連性が高いカテゴリとサブカテゴリを採用
・複数候補が一致した場合は一覧の上位カテゴリを優先

【入力情報】
テーマ：${selectedIdea.title}
活かせる強み：${selectedIdea.strength}
解決する悩み：${selectedIdea.solution}

【出力形式】
カテゴリ：
サブカテゴリ：
タイトル：
キャッチコピー：
サービス詳細（以下の構成と順序）
　💭こんなお悩みありませんか？
　✅このサービスでできること
　🌟信頼と実績
　📦ご依頼の流れ
　💬こんな方におすすめ！
　💰価格の目安
　🔚さいごに
　⚠️キャンセル時の注意事項
　📝依頼テンプレート

【出力条件】
・絵文字を適度に使用し、初心者にもわかりやすい親しみやすいトーンで構成
・タイトルは30文字以内
・キャッチコピーは100文字以内
・価格はカテゴリの一般相場を自動反映
・「さいごに」の後に必ず「キャンセル時の注意事項」を配置すること
・マークダウンの書式（# や ** など）は一切使わないこと
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  let text = response.text || "";
  
  // Clean up any stray markdown formatting just in case
  text = text
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/^#+\s/gm, "")
    .replace(/`/g, "")
    .replace(/^\s*-\s/gm, "・");

  return text;
};

export const generateThumbnail = async (idea: SkillIdea, useHighQuality: boolean = false): Promise<string> => {
  // Always create a new GoogleGenAI instance right before making an API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = getThumbnailPrompt(idea, useHighQuality);

  const model = useHighQuality ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  
  const config: any = {
    imageConfig: {
      aspectRatio: "3:2"
    }
  };

  if (useHighQuality) {
    config.imageConfig.imageSize = "2K";
  }

  const response = await ai.models.generateContent({
    model: model,
    contents: {
      parts: [
        { text: prompt }
      ]
    },
    config: config
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image generated");
};