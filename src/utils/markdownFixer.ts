/**
 * 修复Markdown公式语法问题：兼容跨行块级公式，区分闭合状态补全缺失符号，不改动正确语法
 * 核心优化：
 * 1. 支持跨行块级公式匹配，保留换行符保证LaTeX语法完整
 * 2. 区分块级公式已闭合/半闭合/未闭合状态，仅修复异常场景
 * 3. 行内公式仅补全未闭合符号，不改动正确语法
 */
export const fixMarkdownSyntax = (text: string): string => {
  let fixedText: string = text;
  const placeholderMap: Map<string, string> = new Map<string, string>();
  let seq: number = 0;

  // 生成唯一占位符，用于临时替换待修复的块级公式
  const genPh = (): string => `__MD_FIX_${seq++}__`;

  // 步骤1：处理块级公式 - 匹配跨行内容，区分闭合状态补全符号
  // 正则匹配$$开头的块级公式，支持跨行内容，匹配结尾的$$/$（可选）
  const blockMathRegex: RegExp = /\$\$([\s\S]*?)(\$\$|\$)?(?=\（|$|\n\s*[^\\\$])/g;
  fixedText = fixedText.replace(blockMathRegex, (fullMatch: string, formula: string, endSymbols: string | undefined) => {
    // 清理公式首尾空格（保留内部换行），补全缺失的闭合大括号
    const cleanFormula: string = formula
      .trim()
      .replace(/(?<=[0-9a-zA-Z])$/, () => {
        const openBrace: number = (formula.match(/{/g) || []).length;
        const closeBrace: number = (formula.match(/}/g) || []).length;
        return openBrace > closeBrace ? '}' : '';
      });

    // 根据结尾符号判断闭合状态，分情况处理
    if (endSymbols === '$$') {
      // 已完全闭合：直接返回原内容，不修改
      return fullMatch;
    } else if (endSymbols === '$') {
      // 半闭合（末尾单个$）：替换为占位符，后续还原为完整闭合的块级公式
      const ph: string = genPh();
      placeholderMap.set(ph, `$$${cleanFormula}$$`);
      return ph;
    } else {
      // 完全未闭合：替换为占位符，后续还原为完整闭合的块级公式
      const ph: string = genPh();
      placeholderMap.set(ph, `$$${cleanFormula}$$`);
      return ph;
    }
  });

  // 步骤2：处理行内公式 - 仅补全未闭合的行内公式结束符，兼容跨行场景
  const inlineMathRegex: RegExp = /(?<!\$)(?<!__MD_FIX_\d+__)\\?\$(?!\$)([\\a-zA-Z0-9_{}^+\-*/()=\s]+)(?=\（|$|\s)/g;
  const inlineMatches: RegExpMatchArray[] = [...fixedText.matchAll(inlineMathRegex)];
  
  // 统计有效未闭合的行内公式数量
  const validInlineCount: number = inlineMatches.filter(match => {
    const matchEndPos: number = (match.index as number) + match[0].length;
    return !fixedText.slice(matchEndPos).startsWith('$');
  }).length;

  // 若有效行内公式数量为奇数，为最后一个公式补全结束符$
  if (inlineMatches.length > 0 && validInlineCount % 2 !== 0) {
    const lastMatch: RegExpMatchArray = inlineMatches[inlineMatches.length - 1];
    const fullMatch: string = lastMatch[0] as string;
    const matchIndex: number = lastMatch.index as number;
    const matchEndPos: number = matchIndex + fullMatch.length;

    if (!fixedText.slice(matchEndPos).startsWith('$')) {
      fixedText = `${fixedText.slice(0, matchEndPos)}$${fixedText.slice(matchEndPos)}`;
    }
  }

  // 步骤3：还原占位符为补全后的块级公式
  placeholderMap.forEach((fixedBlockMath: string, ph: string) => {
    fixedText = fixedText.replace(ph, fixedBlockMath);
  });

  return fixedText;
};