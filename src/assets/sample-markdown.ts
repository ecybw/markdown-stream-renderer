// src/assets/sample-markdown.ts
const sampleMarkdown = `# 前端 Markdown 渲染器测试样张

这是一个用于测试渲染器功能的综合示例。

## GFM 语法

### 任务列表
- [x] 支持流式渲染
- [x] 支持 GFM 语法
- [x] 支持公式

### 表格
| 功能点 | 优先级 | 负责人 |
| --- | :---: | ---: |
| GFM 支持 | P0 | @sunzhongda |
| 公式渲染 | P1 | @sunzhongda |
| 指令扩展 | P1 | @sunzhongda |

### 脚注
这是一个包含脚注的句子[^1]。
[^1]: 这是脚注的具体内容。

## 公式渲染

当质量 $m$ 的物体以速度 $v$ 运动时，其动能 $E_k$ 由以下公式定义：

$$
E_k = \\frac{1}{2}mv^2
$$

这个公式是经典力学的基础。

## 扩展语法（隐藏文本）

这是一段普通文本，!!!这是需要hover才能显示的隐藏内容!!!，hover我看看～

## 测试未闭合语法（验证修复功能）
\`\`\`javascript
// 这是一个未闭合的代码块（语法修复会自动补全）
function test() {
  console.log("流式渲染测试");
`;

export default sampleMarkdown;