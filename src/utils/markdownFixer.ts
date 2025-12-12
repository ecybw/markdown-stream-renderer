export const fixMarkdownSyntax = (text: string): string => {
  let fixedText: string = text;

  // 通用边界分隔符：不会出现在各类Markdown内容核心区的字符
  const COMMON_BOUNDARY_REG = /(、|，|！|。|？|；|：|\s{2,}|$|\n|【|】|《|》)/;


  // 1. 公式修复：边界识别+符号补全（保留优化后逻辑）
  const fixUnclosedFormulas = (content: string): string => {
    let lines = content.split('\n');
    const fixedLines: string[] = [];

    lines.forEach((originalLine) => {
      let line = originalLine;
      if (line.trim() === '') {
        fixedLines.push(line);
        return;
      }

      // 通用公式修复
      const formulaMatches = line.match(/(?<!\\)(\$\$?)([^\$]+?)(?=、|，|！|。|？|；|：|\s{2,}|$|\n)/g) || [];
      formulaMatches.forEach((match) => {
        const isBlock = match.startsWith('$$');
        const symbol = isBlock ? '$$' : '$';
        const formulaContent = match.replace(/^\$\$?/, '');
        const cleanContent = formulaContent.trim().replace(COMMON_BOUNDARY_REG, '');
        const fixedFormula = `${symbol}${cleanContent}${symbol}`;
        line = line.replace(match, fixedFormula);
      });

      fixedLines.push(line);
    });

    return fixedLines.join('\n');
  };
  fixedText = fixUnclosedFormulas(fixedText);

  // 2. 链接修复：先定URL边界（中文标点/行尾）→ 补全)
  const fixUnclosedLinks = (str: string): string => {
    let result = str;
    // 匹配规则：[文本](URL开头 - 边界字符)，先界定URL范围
    const linkRegex = /\[([^\]]+)\]\(([^)]+?)(?=、|，|！|。|？|；|：|\s{2,}|$|\n)/g;
    result = result.replace(linkRegex, (_match, linkText: string, linkUrl: string) => {
      // 第一步：按边界截断URL，只保留核心部分
      const [cleanUrl] = linkUrl.split(COMMON_BOUNDARY_REG);
      // 第二步：清理URL末尾多余符号，补全闭合)
      return `[${linkText}](${cleanUrl.trim()})`;
    });
    return result;
  };
  fixedText = fixUnclosedLinks(fixedText);

  // 3. 图片修复：先定URL边界 → 补全)
  const fixUnclosedImages = (str: string): string => {
    let result = str;
    // 匹配规则：![文本](URL开头 - 边界字符)
    const imageRegex = /!\[([\u4e00-\u9fa5^\]]*)\]\(([^)]+?)(?=、|，|！|。|？|；|：|\s{2,}|$|\n)/g;
    result = result.replace(imageRegex, (_match, altText: string, imgUrl: string) => {
      // 第一步：按边界截断URL
      const [cleanUrl] = imgUrl.split(COMMON_BOUNDARY_REG);
      // 第二步：清理+补全闭合)
      return `![${altText}](${cleanUrl.trim()})`;
    });
    return result;
  };
  fixedText = fixUnclosedImages(fixedText);

  // 4. 代码块修复：先定代码块边界（空行/非代码块行）→ 补全```
  const fixCodeBlocks = (str: string): string => {
    let result = str;
    const lines = result.split('\n');
    let inUnclosedCodeBlock = false; // 标记未闭合代码块状态
    let codeBlockLang = ''; // 代码块语言标识
    let codeBlockContent: string[] = [];
    const fixedLines: string[] = [];

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      // 识别代码块开始：```+语言，且未处于未闭合状态
      if (trimmedLine.startsWith('```') && !inUnclosedCodeBlock) {
        inUnclosedCodeBlock = true;
        // 提取语言标识（按边界截断，避免多余字符）
        codeBlockLang = trimmedLine.replace('```', '').split(COMMON_BOUNDARY_REG)[0].trim();
        codeBlockContent = [];
        fixedLines.push(line);
        return;
      }

      // 识别代码块结束：```，且处于未闭合状态
      if (trimmedLine === '```' && inUnclosedCodeBlock) {
        inUnclosedCodeBlock = false;
        fixedLines.push(line);
        codeBlockLang = '';
        codeBlockContent = [];
        return;
      }

      // 未闭合代码块内的内容：收集
      if (inUnclosedCodeBlock) {
        codeBlockContent.push(line);
        fixedLines.push(line);
        return;
      }

      // 非代码块内容：直接加入
      fixedLines.push(line);
    });

    // 处理文件末尾未闭合的代码块：补全```
    if (inUnclosedCodeBlock) {
      fixedLines.push('```');
    }

    // 清理重复代码块符号+规范语言标识
    return fixedLines.join('\n')
      .replace(/```([a-zA-Z0-9]*)\s+([a-zA-Z0-9]*)/g, '```$1') // 去重语言标识
      .replace(/``````/g, '```');
  };
  fixedText = fixCodeBlocks(fixedText);

  // 5. 表格修复：先定表格边界（空行/非|行）→ 补全竖线/分隔线
  const fixTableSyntax = (str: string): string => {
    let result = str;
    const lines = result.split('\n');
    let inTable = false;
    let tableLines: string[] = [];
    const finalLines: string[] = [];

    // 辅助：识别分隔线
    const isSeparatorLine = (line: string) => {
      const cleanLine = line.replace(/\|/g, '').replace(/\s+/g, '');
      return /^[-:]+$/.test(cleanLine) && cleanLine.includes('-');
    };

    for (const line of lines) {
      const trimmedLine = line.trim();
      // 表格边界：非空+包含| → 进入表格；否则退出
      const isTableLine = trimmedLine && trimmedLine.includes('|');
      if (isTableLine) {
        inTable = true;
        // 第一步：按边界截断，只保留表格核心行（避免混入中文标点）
        const [tableCoreLine] = trimmedLine.split(COMMON_BOUNDARY_REG);
        // 第二步：补全首尾竖线+合并重复竖线
        let cleanLine = tableCoreLine.replace(/\|+/g, '|');
        cleanLine = cleanLine.startsWith('|') ? cleanLine : `|${cleanLine}`;
        cleanLine = cleanLine.endsWith('|') ? cleanLine : `${cleanLine}|`;
        tableLines.push(cleanLine);
      } else {
        // 退出表格：处理收集的表格行
        if (inTable && tableLines.length > 0) {
          let headerLine = '';
          let separatorLine = '';
          const contentLines: string[] = [];

          tableLines.forEach(row => {
            if (!headerLine && !isSeparatorLine(row)) headerLine = row;
            else if (isSeparatorLine(row) && !separatorLine) separatorLine = row;
            else if (!isSeparatorLine(row)) contentLines.push(row);
          });

          // 补全分隔线（无则生成）
          if (!separatorLine && headerLine) {
            const colCount = headerLine.split('|').filter(col => col.trim() !== '').length;
            separatorLine = `|${Array(colCount).fill('---').join('|')}|`;
          }

          // 组装表格（按边界拼接，无多余行）
          const processedTable: string[] = [];
          if (headerLine) processedTable.push(headerLine);
          if (separatorLine) processedTable.push(separatorLine);
          if (contentLines.length > 0) processedTable.push(...contentLines);
          finalLines.push(...processedTable);

          tableLines = [];
          inTable = false;
        }
        finalLines.push(line);
      }
    }

    // 处理文件末尾未闭合的表格
    if (inTable && tableLines.length > 0) {
      let headerLine = '';
      let separatorLine = '';
      const contentLines: string[] = [];

      tableLines.forEach(row => {
        if (!headerLine && !isSeparatorLine(row)) headerLine = row;
        else if (isSeparatorLine(row) && !separatorLine) separatorLine = row;
        else if (!isSeparatorLine(row)) contentLines.push(row);
      });

      if (!separatorLine && headerLine) {
        const colCount = headerLine.split('|').filter(col => col.trim() !== '').length;
        separatorLine = `|${Array(colCount).fill('---').join('|')}|`;
      }

      const processedTable: string[] = [];
      if (headerLine) processedTable.push(headerLine);
      if (separatorLine) processedTable.push(separatorLine);
      if (contentLines.length > 0) processedTable.push(...contentLines);
      finalLines.push(...processedTable);
    }

    return finalLines.join('\n');
  };
  fixedText = fixTableSyntax(fixedText);

  // 6. 行内代码修复：边界识别+补全`
  const fixUnclosedSymbol = (str: string, openChar: string, closeChar: string): string => {
    let result = str;
    let lines = result.split('\n');
    const fixedLines: string[] = [];

    lines.forEach((line) => {
      let openCount = 0;
      let inEscape = false;
      let charBuffer = '';

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        // 转义字符：跳过
        if (char === '\\' && !inEscape) {
          inEscape = true;
          charBuffer += char;
          continue;
        }
        // 统计反引号：排除转义+按边界截断
        if (char === openChar && !inEscape) {
          openCount++;
        } else if (char === closeChar && !inEscape) {
          openCount--;
        }
        // 遇到边界字符：先补全当前未闭合的反引号，再拼接边界内容
        else if (COMMON_BOUNDARY_REG.test(char)) {
          if (openCount > 0) {
            charBuffer += closeChar.repeat(openCount);
            openCount = 0;
          }
        }
        charBuffer += char;
        inEscape = false;
      }

      // 行尾未闭合：补全
      if (openCount > 0) {
        charBuffer += closeChar.repeat(openCount);
      }
      fixedLines.push(charBuffer);
    });

    return fixedLines.join('\n');
  };
  fixedText = fixUnclosedSymbol(fixedText, '`', '`');

  // 7. 最终清理
  fixedText = fixedText
    .replace(/(\)){2,}/g, ')') // 清理重复括号
    .trim();

  return fixedText;
};