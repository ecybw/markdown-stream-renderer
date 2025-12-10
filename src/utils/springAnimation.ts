import type { StreamingConfig } from '../types';
/**
 * 弹簧算法计算下一个字符的输出间隔
 * @param currentDelay 当前间隔
 * @param config 流式配置
 * @returns 下一个间隔（ms）
 */
export const calculateSpringDelay = (
  currentDelay: number,
  config: StreamingConfig
): number => {
  const { maxSpeedDelay, damping } = config;
  // 弹簧阻尼公式：current = current * damping，直到接近最小间隔
  const nextDelay = currentDelay * damping;
  return Math.max(nextDelay, maxSpeedDelay);
};