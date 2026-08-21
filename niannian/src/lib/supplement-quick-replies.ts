/** 补充记忆卡 · 当前问题的一步快选 */
export function getQuickRepliesForStep(answeredCount: number): string[] {
  switch (answeredCount) {
    case 0:
      return ['人物', '宠物', '风景', '活动', '家庭合影'];
    case 1:
      return ['没有名字', '记不清了', '跳过'];
    case 2:
      return ['80年代', '90年代', '2000年代', '最近', '记不清'];
    default:
      return ['是的', '没有', '记不清', '跳过'];
  }
}
