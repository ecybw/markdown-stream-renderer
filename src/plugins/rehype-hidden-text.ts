import type { Root, Element } from 'hast';
import { visit } from 'unist-util-visit';

/**
 * rehype插件：转换隐藏文本容器节点为固定结构的行内span元素
 * 优化隐藏文本节点层级，保证行内展示特性和固定的遮罩+内容结构
 */
export const rehypeHiddenText = () => {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      // 匹配隐藏文本容器节点
      if (node.properties?.className === 'hidden-text-container') {
        // 将容器标签强制设为span，保持行内展示特性
        node.tagName = 'span';
        // 构建隐藏文本固定层级结构：外层容器包含遮罩层和内容层
        node.children = [
          {
            type: 'element',
            tagName: 'span',
            properties: { className: 'hidden-text-mask' },
            children: []
          },
          {
            type: 'element',
            tagName: 'span',
            properties: { className: 'hidden-text-content' },
            // 继承原节点的文本内容到内容层，保证内容完整展示
            children: node.children.map(child => ({ ...child }))
          }
        ];
      }
    });
  };
};