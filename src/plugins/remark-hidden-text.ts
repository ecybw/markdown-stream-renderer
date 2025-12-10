import { visit } from 'unist-util-visit';
import type { Root, Text } from 'mdast';

/**
 * remark插件：解析!!!包裹的隐藏文本，转换为带样式类的span HTML节点
 * 语法规则：!!!隐藏文本内容!!! → <span class="hidden-text">隐藏文本内容</span>
 * 特性：支持多段匹配、多行文本、特殊字符转义，避免类型解析冲突
 */
export const remarkHiddenText = () => {
  return (tree: Root) => {
    // 遍历所有文本节点，处理!!!包裹的隐藏文本
    visit(tree, 'text', (node: Text, index: number | undefined, parent) => {
      if (!parent || index === undefined) return;

      // 正则匹配所有!!!包裹的文本（非贪婪匹配，支持多行/特殊字符/多段匹配）
      const regex = /!!!([\s\S]*?)!!!/g;
      const matches = [...node.value.matchAll(regex)];
      if (matches.length === 0) return;

      let lastIndex = 0;
      const newChildren: (Text | { type: 'html'; value: string })[] = [];

      for (const match of matches) {
        const [fullMatch, hiddenContent] = match;
        const matchIndex = node.value.indexOf(fullMatch, lastIndex);

        // 保留匹配前的普通文本（原样保留空格/换行，避免格式丢失）
        if (matchIndex > lastIndex) {
          newChildren.push({
            type: 'text',
            value: node.value.slice(lastIndex, matchIndex)
          });
        }

        // 转义隐藏文本中的特殊字符（避免XSS风险和HTML解析异常）
        const escapedContent = hiddenContent
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');

        // 生成隐藏文本对应的HTML节点（直接输出span，避免后续类型转换冲突）
        newChildren.push({
          type: 'html',
          value: `<span class="hidden-text">${escapedContent}</span>`
        });

        lastIndex = matchIndex + fullMatch.length;
      }

      // 保留匹配后的剩余普通文本
      if (lastIndex < node.value.length) {
        newChildren.push({
          type: 'text',
          value: node.value.slice(lastIndex)
        });
      }

      // 替换原文本节点为「普通文本+HTML节点」组合，完成隐藏文本转换
      parent.children.splice(index, 1, ...newChildren);

      // 终止当前节点遍历，防止重复处理
      return true;
    });
  };
};