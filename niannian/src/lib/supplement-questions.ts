/** 引导式补充 · 固定 3 题 + AI 2 题 = 5 步 */
export const FIXED_SUPPLEMENT_QUESTIONS = [
  '这张照片的主体是什么？（宠物、风景、人物、活动…）',
  '主体有名字吗？叫什么？（便于准确记住）',
  '大概什么时候拍的？（年月日或「某年夏天」）',
] as const;

export const MAX_AI_SUPPLEMENT_QUESTIONS = 2;

export const TOTAL_SUPPLEMENT_STEPS =
  FIXED_SUPPLEMENT_QUESTIONS.length + MAX_AI_SUPPLEMENT_QUESTIONS;
