
export interface UserInput {
  rawText: string;
}

export interface SkillIdea {
  id: string;
  title: string;
  strength: string;
  solution: string;
  type: 'standard' | 'niche';
  generatedContent?: string;
  thumbnailUrl?: string;
}

export interface ServiceDetail {
  category: string;
  subCategory: string;
  title: string;
  catchphrase: string;
  description: string;
  price: string;
  template: string;
  thumbnailUrl?: string;
}

export enum Step {
  INPUT = 'INPUT',
  IDEAS = 'IDEAS',
  GENERATING_DETAIL = 'GENERATING_DETAIL',
  DETAIL = 'DETAIL'
}
