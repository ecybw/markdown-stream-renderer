import { useState, useRef } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useStreamingText } from './StreamingController';
import type { StreamingConfig } from '../types';
import '../styles/markdown.css';
import '../styles/katex.css';

// 默认流式渲染配置项
const DEFAULT_STREAMING_CONFIG: StreamingConfig = {
  initialDelay: 100,
  maxSpeedDelay: 10,
  damping: 0.9,
};

// 测试用Markdown示例文本（包含GFM/公式/扩展指令等语法）
const TEST_MARKDOWN = `# 前端 Markdown 渲染器测试样张

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

## 扩展指令（加分项）

你可以使用指令来创建一些特殊的 UI 元素。

这是一个成功状态的徽章 :badge[Success]{type=success}，和一个警告状态的徽章 :badge[Warning]{type=warning}。

:::callout[这是一个提示]
你可以在这里写下需要引起用户注意的详细信息。
- 列表项 1
- 列表项 2
:::

:::callout[危险操作]{type=danger}
这是一个表示危险操作的警告框，请谨慎操作！
:::

## 扩展语法（!!!）
这是一段需要隐藏的文本：!!!hover显示隐藏内容!!!`;

export const Playground = () => {
  // Markdown输入框内容状态（初始为空）
  const [inputValue, setInputValue] = useState('');
  const [enableSyntaxFix, setEnableSyntaxFix] = useState(true);
  const [streamingConfig, setStreamingConfig] = useState<StreamingConfig>(DEFAULT_STREAMING_CONFIG);
  const [isSimulating, setIsSimulating] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // 定时器引用（浏览器环境setInterval返回number类型）
  const intervalRef = useRef<number | null>(null);

  // 初始化流式文本渲染控制器
  const { currentText, pushChunk, resetStreaming, updateConfig } = useStreamingText(streamingConfig);

  // 更新流式渲染配置参数
  const handleConfigChange = (key: keyof StreamingConfig, value: number) => {
    const newConfig = { ...streamingConfig, [key]: value };
    setStreamingConfig(newConfig);
    updateConfig(newConfig);
  };

  // 加载预设的测试Markdown示例文本
  const loadTestMarkdown = () => {
    // 停止当前模拟并重置流式状态
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsSimulating(false);
    resetStreaming();
    setInputValue(TEST_MARKDOWN);
  };

  // 重置所有状态（清空输入、停止模拟、重置流式渲染）
  const handleReset = () => {
    // 清理定时器
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsSimulating(false);
    setInputValue('');
    resetStreaming();
  };

  // 模拟流式输出：将文本分割为小块逐段推送
  const simulateStreaming = () => {
    if (!inputValue.trim()) {
      alert('请先输入Markdown文本或加载测试样张！');
      return;
    }
    resetStreaming();
    setIsSimulating(true);

    const text = inputValue;
    const chunkSize = 15; // 每个流式文本块的大小
    const chunks: string[] = [];

    // 将完整文本分割为固定大小的文本块
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }

    // 定时推送文本块，模拟流式输出效果
    let index = 0;
    intervalRef.current = window.setInterval(() => {
      if (index < chunks.length) {
        pushChunk({ content: chunks[index], isFinal: false });
        index++;
      } else {
        // 推送结束标识，终止流式输出
        pushChunk({ content: '', isFinal: true });
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setIsSimulating(false);
      }
    }, 300); // 模拟LLM文本块推送间隔
  };

  // 处理输入框文本变化（非流式模式下实时更新渲染）
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!isSimulating) {
      setInputValue(e.target.value);
      resetStreaming();
    }
  };

  return (
    <div className="playground-container">
      <div className="playground-header">
        <h1>Markdown 流式渲染 Playground</h1>
        <div className="playground-controls">
          {/* 加载测试示例文本按钮 */}
          <button 
            onClick={loadTestMarkdown} 
            disabled={isSimulating}
            className="btn load-test-btn"
          >
            加载测试样张
          </button>
          {/* 模拟流式输出按钮（模拟中禁用） */}
          <button 
            onClick={simulateStreaming} 
            disabled={isSimulating || !inputValue.trim()}
            className="btn simulate-btn"
          >
            {isSimulating ? '模拟中...' : '模拟流式输出'}
          </button>
          {/* 重置所有状态按钮 */}
          <button 
            onClick={handleReset}
            className="btn reset-btn"
          >
            重置
          </button>
          <label className="syntax-fix-switch">
            启用语法修复
            <input
              type="checkbox"
              checked={enableSyntaxFix}
              onChange={(e) => setEnableSyntaxFix(e.target.checked)}
            />
          </label>
        </div>
      </div>

      {/* 流式渲染配置面板 */}
      <div className="streaming-config-panel">
        <div className="config-item">
          <label>初始速度（{streamingConfig.initialDelay}ms）</label>
          <input
            type="range"
            min="50"
            max="300"
            value={streamingConfig.initialDelay}
            onChange={(e) => handleConfigChange('initialDelay', Number(e.target.value))}
          />
        </div>
        <div className="config-item">
          <label>最大速度（{streamingConfig.maxSpeedDelay}ms）</label>
          <input
            type="range"
            min="5"
            max="50"
            value={streamingConfig.maxSpeedDelay}
            onChange={(e) => handleConfigChange('maxSpeedDelay', Number(e.target.value))}
          />
        </div>
        <div className="config-item">
          <label>阻尼系数（{streamingConfig.damping.toFixed(2)}）</label>
          <input
            type="range"
            min="0.8"
            max="0.95"
            step="0.01"
            value={streamingConfig.damping}
            onChange={(e) => handleConfigChange('damping', Number(e.target.value))}
          />
        </div>
      </div>

      <div className="playground-content">
        {/* Markdown输入框 */}
        <textarea
          ref={inputRef}
          className="markdown-input"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="输入Markdown文本..."
          disabled={isSimulating}
        />
        {/* Markdown渲染预览区 */}
        <div className="markdown-preview-container">
          <MarkdownRenderer markdown={isSimulating ? currentText : inputValue} enableSyntaxFix={enableSyntaxFix} />
        </div>
      </div>
    </div>
  );
};