/** 流式Chunk类型 */
export interface StreamingChunk {
  content: string;
  isFinal: boolean; // 是否为尾包
}

/** 流式配置项 */
export interface StreamingConfig {
  initialDelay: number; // 初始字符间隔（ms）
  maxSpeedDelay: number; // 最大速度间隔（最小ms）
  damping: number; // 弹簧阻尼系数（0.8~0.95）
}

/** Playground配置 */
export interface PlaygroundConfig {
  enableSyntaxFix: boolean; // 是否启用语法修复
  streamingConfig: StreamingConfig;
}