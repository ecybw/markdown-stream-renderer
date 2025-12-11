export const fixMarkdownSyntax = (text: string): string => {
  let fixedText: string = text;

  // 公式边界分隔符：中文标点、行尾等不可能出现在公式内的字符
  const FORMULA_BOUNDARY_REG = /(、|，|！|。|？|；|：|\s{2,}|$|\n)/;
  // 纯公式内容正则：仅包含数学符号、字母、数字，无中文/中文标点
  const PURE_FORMULA_CONTENT_REG = /^[a-zA-Z0-9\+\-\×÷\=\^\_≥≤≠\(\)\[\]\{\}\/\\\.\,\;\:\s]+$/;

  // 1. 公式修复：先识别边界再补全$，兼容前缀文本
  const fixUnclosedFormulas = (content: string): string => {
    let lines = content.split('\n');
    const fixedLines: string[] = [];

    lines.forEach((originalLine) => {
      let line = originalLine;
      if (line.trim() === '') {
        fixedLines.push(line);
        return;
      }

      // 1.1 兼容带前缀的公式修复（保留原有前缀逻辑，优化边界识别）
      if (line.startsWith('未闭合块级公式：')) {
        const prefix = '未闭合块级公式：';
        const content = line.slice(prefix.length);
        // 第一步：识别公式边界（按分隔符截断，只保留纯公式部分）
        const [formulaPart] = content.split(FORMULA_BOUNDARY_REG);
        // 第二步：清理多余$，补全块级公式$$
        const cleanFormula = formulaPart.replace(/\$+$/, '').replace(/^\$+/, '');
        const finalFormula = `$$${cleanFormula}$$`;
        // 第三步：拼接回原文本（保留分隔符后的内容）
        const restPart = content.slice(formulaPart.length);
        line = prefix + finalFormula + restPart;
      }

      if (line.startsWith('未闭合行内公式：')) {
        const prefix = '未闭合行内公式：';
        const content = line.slice(prefix.length);
        // 第一步：识别公式边界
        const [formulaPart] = content.split(FORMULA_BOUNDARY_REG);
        // 第二步：清理多余$，补全行内公式$
        const cleanFormula = formulaPart.replace(/\$+$/, '').replace(/^\$+/, '');
        const finalFormula = `$${cleanFormula}$`;
        // 第三步：拼接回原文本
        const restPart = content.slice(formulaPart.length);
        line = prefix + finalFormula + restPart;
      }

      if (line.startsWith('无包裹公式：')) {
        const prefix = '无包裹公式：';
        const content = line.slice(prefix.length).trim();
        // 第一步：识别公式边界
        const [formulaPart] = content.split(FORMULA_BOUNDARY_REG);
        // 第二步：仅对纯公式内容添加$包裹
        const finalFormula = PURE_FORMULA_CONTENT_REG.test(formulaPart) 
          ? `$${formulaPart}$` 
          : formulaPart;
        // 第三步：拼接回原文本
        const restPart = content.slice(formulaPart.length);
        line = prefix + finalFormula + restPart;
      }

      // 1.2 自动识别无前缀的未闭合公式（通用场景）
      if (!line.startsWith('未闭合块级公式：') && !line.startsWith('未闭合行内公式：') && !line.startsWith('无包裹公式：')) {
        // 匹配行内/块级公式的起始位置，定位公式范围
        const formulaMatches = line.match(/(?<!\\)(\$\$?)([^\$]+?)(?=、|，|！|。|？|；|：|\s{2,}|$|\n)/g) || [];
        formulaMatches.forEach((match) => {
          // 区分块级($$)和行内($)
          const isBlock = match.startsWith('$$');
          const symbol = isBlock ? '$$' : '$';
          // 提取公式内容（去掉开头的$/$）
          const formulaContent = match.replace(/^\$\$?/, '');
          // 清理多余字符，补全闭合符号
          const cleanContent = formulaContent.trim().replace(FORMULA_BOUNDARY_REG, '');
          const fixedFormula = `${symbol}${cleanContent}${symbol}`;
          // 替换原文本中的未闭合公式
          line = line.replace(match, fixedFormula);
        });
      }

      fixedLines.push(line);
    });

    return fixedLines.join('\n');
  };

  fixedText = fixUnclosedFormulas(fixedText);

  // 2. 其他内容修复：链接/图片/表格/代码块（保留原逻辑）
  const placeholderMap: Map<string, string> = new Map<string, string>();
  let seq: number = 0;
  const genPh = (): string => `__MD_FIX_${seq++}__`;

  // 2.1 链接修复
  const fixUnclosedLinks = (str: string): string => {
    let result = str;
    const linkRegex = /\[([^\]]+)\]\(([^)]+?)(?=、|，|！|。|\s|\[|$|\）)(?<!\))/g;
    result = result.replace(linkRegex, (_, linkText: string, linkUrl: string) => {
      const cleanUrl = linkUrl.trim().replace(/\)+$/, '').replace(/\）$/, '');
      return `[${linkText}](${cleanUrl})`;
    });
    return result;
  };
  fixedText = fixUnclosedLinks(fixedText);

  // 2.2 图片修复
  const fixUnclosedImages = (str: string): string => {
    let result = str;
    const imageRegex = /!\[([\u4e00-\u9fa5^\]]*)\]\(([^)]+?)(?=、|，|！|。|\s|\[|$|\）)(?<!\))/g;
    result = result.replace(imageRegex, (_, altText: string, imgUrl: string) => {
      const cleanUrl = imgUrl.trim().replace(/\)+$/, '').replace(/\）$/, '');
      return `![${altText}](${cleanUrl})`;
    });
    return result;
  };
  fixedText = fixUnclosedImages(fixedText);

  // 2.3 表格修复（保留原逻辑）
  const fixTableSyntax = (str: string): string => {
    let result = str;
    const lines = result.split('\n');
    let inTable = false;
    let tableLines: string[] = [];
    const finalLines: string[] = [];

    const isSeparatorLine = (line: string) => {
      const cleanLine = line.replace(/\|/g, '').replace(/\s+/g, '');
      return /^[-:]+$/.test(cleanLine) && cleanLine.includes('-');
    };

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && trimmedLine.includes('|')) {
        inTable = true;
        let cleanLine = trimmedLine.replace(/\|+/g, '|');
        cleanLine = cleanLine.startsWith('|') ? cleanLine : `|${cleanLine}`;
        cleanLine = cleanLine.endsWith('|') ? cleanLine : `${cleanLine}|`;
        tableLines.push(cleanLine);
      } else {
        if (inTable) {
          if (tableLines.length > 0) {
            let headerLine = '';
            let originalSeparatorLine = '';
            const contentLines: string[] = [];

            tableLines.forEach(row => {
              if (!headerLine && !isSeparatorLine(row)) headerLine = row;
              else if (isSeparatorLine(row) && !originalSeparatorLine) originalSeparatorLine = row;
              else if (!isSeparatorLine(row)) contentLines.push(row);
            });

            const processedTable: string[] = [];
            if (headerLine) processedTable.push(headerLine);
            if (!originalSeparatorLine && headerLine) {
              const headerCols = headerLine.split('|').filter(col => col.trim() !== '').length;
              originalSeparatorLine = `|${Array(headerCols).fill('---').join('|')}|`;
              processedTable.push(originalSeparatorLine);
            } else if (originalSeparatorLine) processedTable.push(originalSeparatorLine);
            if (contentLines.length > 0) processedTable.push(...contentLines);

            finalLines.push(...processedTable);
          }
          tableLines = [];
          inTable = false;
        }
        finalLines.push(line);
      }
    }

    if (inTable && tableLines.length > 0) {
      let headerLine = '';
      let originalSeparatorLine = '';
      const contentLines: string[] = [];

      tableLines.forEach(row => {
        if (!headerLine && !isSeparatorLine(row)) headerLine = row;
        else if (isSeparatorLine(row) && !originalSeparatorLine) originalSeparatorLine = row;
        else if (!isSeparatorLine(row)) contentLines.push(row);
      });

      const processedTable: string[] = [];
      if (headerLine) processedTable.push(headerLine);
      if (!originalSeparatorLine && headerLine) {
        const headerCols = headerLine.split('|').filter(col => col.trim() !== '').length;
        originalSeparatorLine = `|${Array(headerCols).fill('---').join('|')}|`;
        processedTable.push(originalSeparatorLine);
      } else if (originalSeparatorLine) processedTable.push(originalSeparatorLine);
      if (contentLines.length > 0) processedTable.push(...contentLines);

      finalLines.push(...processedTable);
    }

    return finalLines.join('\n');
  };
  fixedText = fixTableSyntax(fixedText);

  // 2.4 代码块修复（保留原逻辑）
  const fixCodeBlocks = (str: string): string => {
    let result = str;
    result = result.replace(/```([a-zA-Z0-9]*)\n?([\s\S]*?)(?=```|$)/g, (fullMatch, lang, code) => {
      if (fullMatch.endsWith('```')) return fullMatch;
      const cleanLang = lang.trim().replace(/(\w+)\s+\1/g, '$1');
      const ph = genPh();
      placeholderMap.set(ph, `\`\`\`${cleanLang}\n${code.trimEnd()}\n\`\`\``);
      return ph;
    });
    return result;
  };
  fixedText = fixCodeBlocks(fixedText);

  // 2.5 行内代码修复（保留原逻辑）
  const fixUnclosedSymbol = (str: string, openChar: string, closeChar: string): string => {
    let result = str;
    let openCount = 0;
    let inEscape = false;

    for (let i = 0; i < result.length; i++) {
      const char = result[i];
      if (char === '\\' && !inEscape) { inEscape = true; continue; }
      if (char === openChar && !inEscape) openCount++;
      if (char === closeChar && !inEscape) openCount--;
      inEscape = false;
    }
    if (openCount > 0) result += closeChar.repeat(openCount);
    return result;
  };
  fixedText = fixUnclosedSymbol(fixedText, '`', '`');

  // 3. 最终清理
  placeholderMap.forEach((content, ph) => {
    fixedText = fixedText.replace(new RegExp(ph, 'g'), content);
  });
  fixedText = fixedText
    .replace(/(\)){2,}/g, ')')
    .replace(/``````/g, '```')
    .trim();

  return fixedText;
};