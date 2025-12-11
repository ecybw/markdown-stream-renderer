/**
 * 修复Markdown未闭合内容：公式/表格/链接/图片/代码块等
 */
export const fixMarkdownSyntax = (text: string): string => {
  let fixedText: string = text;

  // 1. 公式修复：逐行处理，仅修改首尾符号（块级/行内/无包裹）
  const lines = fixedText.split('\n');
  const fixedLines: string[] = [];

  lines.forEach((originalLine) => {
    let line = originalLine;
    if (line.trim() === '') {
      fixedLines.push(line);
      return;
    }

    // 1.1 块级公式：清理行尾多余$，补全结尾$$
    if (line.startsWith('未闭合块级公式：')) {
      const prefix = '未闭合块级公式：';
      const content = line.slice(prefix.length);
      const cleanContent = content.replace(/\$+$/, '');
      const finalContent = cleanContent + '$$';
      line = prefix + finalContent;
    }

    // 1.2 行内公式：清理行尾多余$，补全结尾$
    if (line.startsWith('未闭合行内公式：')) {
      const prefix = '未闭合行内公式：';
      const content = line.slice(prefix.length);
      const cleanContent = content.replace(/\$+$/, '');
      const finalContent = cleanContent + (cleanContent.startsWith('$') ? '$' : '');
      line = prefix + finalContent;
    }

    // 1.3 无包裹公式：添加成对$，保留原始内容
    if (line.startsWith('无包裹公式：')) {
      const prefix = '无包裹公式：';
      const content = line.slice(prefix.length).trim();
      line = prefix + (content.startsWith('$') ? content : `$${content}$`);
    }

    fixedLines.push(line);
  });
  fixedText = fixedLines.join('\n');

  // 2. 其他内容修复：链接/图片/表格/代码块
  const placeholderMap: Map<string, string> = new Map<string, string>();
  let seq: number = 0;
  const genPh = (): string => `__MD_FIX_${seq++}__`; // 生成唯一占位符避免冲突

  // 2.1 链接修复：补全未闭合链接，清理URL末尾多余符号
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

  // 2.2 图片修复：补全未闭合图片链接，清理URL末尾多余符号
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

  // 2.3 表格修复：兼容对齐分隔线，补全竖线，无多余行
  const fixTableSyntax = (str: string): string => {
    let result = str;
    const lines = result.split('\n');
    let inTable = false;
    let tableLines: string[] = [];
    const finalLines: string[] = [];

    // 辅助函数：识别带对齐符的分隔线（:---:、---:、---等）
    const isSeparatorLine = (line: string) => {
      const cleanLine = line.replace(/\|/g, '').replace(/\s+/g, '');
      return /^[-:]+$/.test(cleanLine) && cleanLine.includes('-');
    };

    for (const line of lines) {
      const trimmedLine = line.trim();
      // 识别表格行：非空且包含|
      if (trimmedLine && trimmedLine.includes('|')) {
        inTable = true;
        let cleanLine = trimmedLine.replace(/\|+/g, '|'); // 合并重复竖线
        cleanLine = cleanLine.startsWith('|') ? cleanLine : `|${cleanLine}`; // 补全首竖线
        cleanLine = cleanLine.endsWith('|') ? cleanLine : `${cleanLine}|`; // 补全尾竖线
        tableLines.push(cleanLine);
      } else {
        if (inTable) { // 退出表格，处理收集的表格行
          if (tableLines.length > 0) {
            // 分离表头、原始分隔线、内容行
            let headerLine = '';
            let originalSeparatorLine = '';
            const contentLines: string[] = [];

            tableLines.forEach(row => {
              if (!headerLine && !isSeparatorLine(row)) headerLine = row;
              else if (isSeparatorLine(row) && !originalSeparatorLine) originalSeparatorLine = row;
              else if (!isSeparatorLine(row)) contentLines.push(row);
            });

            // 组装表格行：优先保留原始分隔线，无则生成默认
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

    // 处理文件末尾未结束的表格
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

  // 2.4 代码块修复：补全未闭合代码块，规范语言标识
  const fixCodeBlocks = (str: string): string => {
    let result = str;
    result = result.replace(/```([a-zA-Z0-9]*)\n?([\s\S]*?)(?=```|$)/g, (fullMatch, lang, code) => {
      if (fullMatch.endsWith('```')) return fullMatch;
      const cleanLang = lang.trim().replace(/(\w+)\s+\1/g, '$1'); // 去重语言标识
      const ph = genPh();
      placeholderMap.set(ph, `\`\`\`${cleanLang}\n${code.trimEnd()}\n\`\`\``);
      return ph;
    });
    return result;
  };
  fixedText = fixCodeBlocks(fixedText);

  // 2.5 行内代码修复：补全未闭合的反引号
  const fixUnclosedSymbol = (str: string, openChar: string, closeChar: string): string => {
    let result = str;
    let openCount = 0;
    let inEscape = false;

    // 统计未闭合符号数量
    for (let i = 0; i < result.length; i++) {
      const char = result[i];
      if (char === '\\' && !inEscape) { inEscape = true; continue; }
      if (char === openChar && !inEscape) openCount++;
      if (char === closeChar && !inEscape) openCount--;
      inEscape = false;
    }
    // 补全未闭合符号
    if (openCount > 0) result += closeChar.repeat(openCount);
    return result;
  };
  fixedText = fixUnclosedSymbol(fixedText, '`', '`');

  // 3. 最终清理：替换占位符，清理重复符号
  placeholderMap.forEach((content, ph) => {
    fixedText = fixedText.replace(new RegExp(ph, 'g'), content);
  });
  fixedText = fixedText
    .replace(/(\)){2,}/g, ')') // 清理重复括号
    .replace(/``````/g, '```') // 清理重复代码块符号
    .trim();

  return fixedText;
};