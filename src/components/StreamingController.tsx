import { useRef, useState, useEffect, useCallback } from 'react';
import type { StreamingChunk, StreamingConfig } from '../types';
import { calculateSpringDelay } from '../utils/springAnimation';

/**
 * 流式文本输出控制器Hook
 * 管理流式文本的队列、逐字输出逻辑及动画速度配置
 * @param initialConfig 流式渲染初始配置（含速度/阻尼等参数）
 * @returns 流式文本、状态及操作方法
 */
export const useStreamingText = (initialConfig: StreamingConfig) => {
  const [currentText, setCurrentText] = useState(''); // 当前已渲染的流式文本
  const [isStreaming, setIsStreaming] = useState(false); // 是否处于流式输出状态
  const chunkQueue = useRef<StreamingChunk[]>([]); // 待处理的文本块队列
  const currentDelay = useRef(initialConfig.initialDelay); // 当前字符输出间隔（ms）
  const configRef = useRef(initialConfig); // 流式渲染配置（支持动态更新）
  const isFinalRef = useRef(false); // 是否已接收流式输出结束标识（尾包）

  // 动态更新流式渲染配置，同步更新初始输出间隔
  const updateConfig = useCallback((newConfig: Partial<StreamingConfig>) => {
    configRef.current = { ...configRef.current, ...newConfig };
    currentDelay.current = newConfig.initialDelay || configRef.current.initialDelay;
  }, []);

  // 将文本块推入处理队列，标记尾包状态并启动流式输出
  const pushChunk = useCallback((chunk: StreamingChunk) => {
    chunkQueue.current.push(chunk);
    if (chunk.isFinal) isFinalRef.current = true;
    setIsStreaming(true);
  }, []);

  // 重置所有流式渲染状态（清空队列/文本、恢复初始配置）
  const resetStreaming = useCallback(() => {
    chunkQueue.current = [];
    currentDelay.current = configRef.current.initialDelay;
    isFinalRef.current = false;
    setCurrentText('');
    setIsStreaming(false);
  }, []);

  // 流式输出核心逻辑：逐字处理队列中的文本块
  useEffect(() => {
    if (!isStreaming || chunkQueue.current.length === 0) return;

    let animationFrameId: number;
    let timeoutId: number; // 适配浏览器环境：定时器返回number类型

    // 处理单个字符的输出逻辑
    const processChar = () => {
      // 队列为空时终止流式输出
      if (chunkQueue.current.length === 0) {
        setIsStreaming(false);
        return;
      }

      const currentChunk = chunkQueue.current[0];
      const nextChar = currentChunk.content[0];

      // 将当前字符追加到已渲染文本中
      setCurrentText((prev) => prev + nextChar);

      // 移除当前块中已处理的字符，空块则从队列删除
      currentChunk.content = currentChunk.content.slice(1);
      if (currentChunk.content === '') {
        chunkQueue.current.shift(); // 移除已处理完毕的文本块
      }

      // 计算下一个字符的输出间隔（尾包时无延迟）
      const nextDelay = isFinalRef.current ? 0 : calculateSpringDelay(currentDelay.current, configRef.current);
      currentDelay.current = nextDelay;

      // 定时处理下一个字符
      timeoutId = setTimeout(() => {
        animationFrameId = requestAnimationFrame(processChar);
      }, nextDelay);
    };

    // 启动字符处理流程
    animationFrameId = requestAnimationFrame(processChar);

    // 组件卸载/依赖变化时清理定时器和动画帧
    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(timeoutId);
    };
  }, [isStreaming]);

  return { currentText, isStreaming, pushChunk, updateConfig, resetStreaming };
};