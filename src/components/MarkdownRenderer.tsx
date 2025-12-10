import { useState, useEffect } from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkDirective from 'remark-directive';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import type { Options as RehypeKatexOptions } from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import DOMPurify from 'dompurify';
import { remarkHiddenText } from '../plugins/remark-hidden-text';
import { remarkCustomDirectives } from '../plugins/remark-custom-directives';
import { fixMarkdownSyntax } from '../utils/markdownFixer';

interface MarkdownRendererProps {
  markdown: string;
  enableSyntaxFix: boolean;
}

// 初始化Markdown解析处理器
const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkDirective)
  .use(remarkHiddenText)
  .use(remarkCustomDirectives)
  .use(remarkRehype, {
    allowDangerousHtml: true,
    passThrough: ['html']
  })
  .use(rehypeKatex, { throwOnError: false } as RehypeKatexOptions)
  .use(rehypeStringify, {
    allowDangerousHtml: true
  });

// 替换徽章指令为内联span元素（避免生成div，保证行内展示）
const replaceBadgeDirective = (text: string): string => {
  // 替换自定义徽章指令，避免被解析为div元素
  const badgeRegex = /:badge\s*\[([^\]]+)\]\s*\{type=(\w+)\}/g;
  return text.replace(badgeRegex, (_, badgeText, type) => {
    const escapedText = badgeText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '')
      .replace(/<\/?div>/g, ''); // 移除所有div标签

    // 生成内联样式的span标签，确保徽章行内展示
    return `<span style="display: inline-block !important; padding: 4px 8px !important; border-radius: 4px !important; font-size: 12px !important; font-weight: 600 !important; margin: 0 4px !important; color: #fff !important; vertical-align: middle !important; ${
      type === 'success' ? 'background-color: #4ade80 !important;' : 
      type === 'warning' ? 'background-color: #facc15 !important; color: #3730a3 !important;' : 
      'background-color: #64748b !important;'
    }">${escapedText}</span>`;
  });
};

export const MarkdownRenderer = ({ markdown, enableSyntaxFix }: MarkdownRendererProps) => {
  const [renderedHtml, setRenderedHtml] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 预处理Markdown：先替换徽章指令，再按需修复语法（徽章替换优先级最高）
  const preprocessedMarkdown = replaceBadgeDirective(markdown);
  const processedMarkdown = enableSyntaxFix ? fixMarkdownSyntax(preprocessedMarkdown) : preprocessedMarkdown;

  useEffect(() => {
    setRenderedHtml('');
    setIsLoading(true);

    const parseAndRenderMarkdown = async () => {
      try {
        if (!processedMarkdown.trim()) {
          setRenderedHtml('');
          return;
        }

        const result = await markdownProcessor.process(processedMarkdown);
        
        // 配置DOMPurify过滤不安全HTML（关键：保留徽章所需样式）
        // 配置过滤规则，避免访问不存在的静态属性
        const safeHtml = DOMPurify.sanitize(result.toString(), {
          // 显式允许span标签（确保徽章容器不被过滤）
          ADD_TAGS: ['span'],
          // 允许style属性（保留徽章的内联样式）
          ALLOWED_ATTR: ['style'],
          // 启用HTML完整解析配置，保证渲染结果完整
          USE_PROFILES: { html: true }
        });

        // 兜底处理：移除徽章外层可能生成的div标签
        const finalHtml = safeHtml
          .replace(/<div>(\s*<span style="display: inline-block.*?<\/span>)\s*<\/div>/g, '$1')
          .replace(/<div>(Success|Warning)<\/div>/g, (_, text) => {
            // 修复错误生成的div格式徽章，转为标准span格式
            return `<span style="display: inline-block !important; padding: 4px 8px !important; border-radius: 4px !important; font-size: 12px !important; font-weight: 600 !important; margin: 0 4px !important; color: #fff !important; vertical-align: middle !important; ${
              text === 'Success' ? 'background-color: #4ade80 !important;' : 'background-color: #facc15 !important; color: #3730a3 !important;'
            }">${text}</span>`;
          });

        setRenderedHtml(finalHtml);
      } catch (error) {
        console.error('Markdown解析失败：', error);
        setRenderedHtml('<div style="color: #ff3b30; padding: 16px; border: 1px solid #ffcccc; border-radius: 8px;">Markdown解析失败，请检查语法是否正确</div>');
      } finally {
        setIsLoading(false);
      }
    };

    parseAndRenderMarkdown();
  }, [processedMarkdown, enableSyntaxFix]);

  return (
    <div className="markdown-preview">
      {isLoading && <div style={{ padding: '16px', color: '#6e6e73' }}>渲染中...</div>}
      <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
    </div>
  );
};