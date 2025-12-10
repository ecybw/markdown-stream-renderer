import { visit } from 'unist-util-visit';
import type { Root, Parent } from 'mdast';

// Callout指令相关的mdast节点类型定义
type TextNode = { type: 'text'; value: string; };
type ListItemNode = { type: 'listItem'; children: Array<{ type: 'paragraph'; children: TextNode[]; }>; };
type ListNode = { type: 'list'; children: ListItemNode[]; };
type ParagraphNode = { type: 'paragraph'; children: TextNode[]; };
type ContainerDirective = {
  type: 'containerDirective';
  name: string;
  label?: string;
  attributes?: Record<string, string>;
  children: Array<ParagraphNode | ListNode | TextNode>;
};

/**
 * 解析mdast中的callout容器指令，转换为自定义样式的HTML结构
 * @param tree mdast语法树
 */
const parseCallout = (tree: Root) => {
  // 遍历所有containerDirective类型节点，筛选callout指令节点
  visit(tree, 'containerDirective', (node: unknown, index: number | undefined, parent: Parent | undefined) => {
    // 参数校验：确保节点有效且为callout类型的containerDirective
    if (
      !parent || 
      index === undefined || 
      typeof node !== 'object' || 
      node === null || 
      (node as ContainerDirective).type !== 'containerDirective' ||
      (node as ContainerDirective).name !== 'callout'
    ) return;

    const directiveNode = node as ContainerDirective;
    // 提取callout标题（默认值：提示）和类型（默认值：default）
    const calloutTitle = directiveNode.label || '提示';
    const calloutType = directiveNode.attributes?.type || 'default';

    // 解析callout子节点，生成内容HTML
    let contentHtml = '';
    if (directiveNode.children.length > 0) {
      directiveNode.children.forEach(child => {
        // 处理段落节点：拼接文本并替换换行为br标签
        if (child.type === 'paragraph' && child.children) {
          const paraText = child.children.map((c: TextNode) => c.value).join('').replace(/\n/g, '<br>');
          contentHtml += `<p style="margin: 4px 0;">${paraText}</p>`;
        }
        // 处理列表节点：生成带样式的ul/li列表
        if (child.type === 'list' && child.children) {
          contentHtml += '<ul style="margin: 8px 0; padding-left: 20px;">';
          child.children.forEach((listItem: ListItemNode) => {
            if (listItem.children && listItem.children[0]?.children) {
              const itemText = listItem.children[0].children.map((c: TextNode) => c.value).join('');
              contentHtml += `<li>${itemText}</li>`;
            }
          });
          contentHtml += '</ul>';
        }
        // 处理纯文本节点：生成div包裹的文本内容
        if (child.type === 'text' && child.value) {
          contentHtml += `<div>${child.value}</div>`;
        }
      });
    }

    // 转义标题中的特殊字符，避免HTML解析错误和XSS风险
    const escapedTitle = calloutTitle
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // 构建callout完整HTML结构（含内联样式，保证样式一致性）
    const calloutHtml = `
      <div class="callout callout-${calloutType}" style="margin: 16px 0; padding: 16px; border-radius: 8px; border-left: 4px solid #e2e8f0; background: #f8fafc;">
        <div class="callout-title" style="font-weight: 600; margin-bottom: 8px;">${escapedTitle}</div>
        <div class="callout-content">${contentHtml}</div>
      </div>
    `.trim();

    // 将原callout指令节点替换为html节点，注入生成的callout HTML
    parent.children.splice(index, 1, {
      type: 'html',
      value: calloutHtml
    } as any);
  });
};

/**
 * remark自定义指令插件：核心处理callout容器指令，转换为带样式的HTML
 * @returns 处理mdast语法树的函数
 */
export const remarkCustomDirectives = () => {
  return (tree: Root) => {
    parseCallout(tree);
  };
};