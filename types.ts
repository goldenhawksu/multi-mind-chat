// 动态消息发送者枚举 - 现在支持自定义角色名称
export enum MessageSender {
  User = '用户',
  System = '系统',
  // 动态角色将在运行时创建，这里保留一些常用的默认值
  Cognito = 'Cognito',
  Muse = 'Muse',
}

// 消息用途枚举
export enum MessagePurpose {
  UserInput = 'user-input',
  SystemNotification = 'system-notification',
  CognitoToMuse = 'cognito-to-muse',      // AI角色之间的讨论（保持兼容性）
  MuseToCognito = 'muse-to-cognito',      // AI角色之间的讨论（保持兼容性）
  FinalResponse = 'final-response',       // 最终回复用户
  RoleDiscussion = 'role-discussion',     // 通用的角色间讨论
}

// 聊天消息接口
export interface ChatMessage {
  id: string;
  text: string;
  sender: MessageSender | string; // 现在支持动态角色名称
  purpose: MessagePurpose;
  timestamp: Date;
  durationMs?: number; // AI消息的生成时间
  image?: { // 用户消息的可选图片数据
    dataUrl: string; // 用于显示的base64数据URL
    name: string;
    type: string;
  };
  roleId?: string; // 可选的角色ID，用于关联具体的AI角色配置
  isStreaming?: boolean; // 标记消息是否正在流式传输
}

// 讨论记录接口
export interface DiscussionRecord {
  id: string;
  timestamp: Date;
  userQuery: string;
  userImage?: {
    name: string;
    type: string;
    size: number;
  };
  discussionMode: string;
  activeRoles: Array<{
    id: string;
    name: string;
    modelName: string;
    channelName: string;
  }>;
  turns: Array<{
    id: string;
    role: string;
    roleId?: string;
    message: string;
    timestamp: Date;
    durationMs?: number;
    purpose: MessagePurpose;
  }>;
  notepadUpdates: Array<{
    id: string;
    updater: string;
    updaterId?: string;
    content: string;
    timestamp: Date;
  }>;
  finalAnswer?: {
    content: string;
    provider: string;
    providerId?: string;
    timestamp: Date;
    durationMs?: number;
  };
  totalDuration: number; // 总讨论时长（毫秒）
  isCompleted: boolean; // 讨论是否正常完成
  wasInterrupted: boolean; // 是否被用户中断
  interruptedAt?: Date; // 中断时间
  settings: {
    discussionMode: string;
    manualFixedTurns?: number;
    isReducedCapacityEnabled: boolean;
    activeRoleCount: number;
  };
  metadata: {
    version: string;
    exportedAt?: Date;
    messageCount: number;
    notepadUpdateCount: number;
  };
}

// 讨论统计接口
export interface DiscussionStats {
  totalTurns: number;
  averageResponseTime: number;
  longestResponseTime: number;
  shortestResponseTime: number;
  totalTokensUsed?: number; // 如果API提供token使用情况
  roleParticipation: Record<string, {
    turnCount: number;
    totalResponseTime: number;
    averageResponseTime: number;
  }>;
  notepadUpdateFrequency: number;
}

// 流式传输状态接口
export interface StreamingState {
  messageId: string;
  currentText: string;
  targetText: string;
  isComplete: boolean;
  startTime: Date;
  speed: number; // 字符/秒
}

// AI模型配置接口（从constants.ts导入，但在这里声明以保持类型完整性）
export interface AiModelConfig {
  id: string;
  name: string;
  apiName: string;
  baseUrl?: string;
  supportsImages: boolean;
  supportsReducedCapacity: boolean;
  category: string;
  maxTokens: number;
  temperature: number;
  isCustom: boolean;
  createdAt: Date;
}

// AI角色配置接口
export interface AiRoleConfig {
  id: string;
  name: string;
  systemPrompt: string;
  modelId: string;
  isActive: boolean;
  color?: string; // 可选的UI显示颜色
  description?: string; // 可选的角色描述
}

// 讨论配置接口
export interface DiscussionConfig {
  mode: 'fixed' | 'ai-driven';
  fixedTurns?: number;
  maxTurnsPerRole?: number;
  allowSameModel?: boolean; // 是否允许多个角色使用相同模型
  enableNotepadSharing?: boolean; // 是否启用记事本共享
  enableStreamingTypewriter?: boolean; // 是否启用流式打字机效果
  typewriterSpeed?: number; // 打字机速度（毫秒/字符）
}

// API响应接口
export interface ApiResponse {
  text: string;
  durationMs: number;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  streamingChunks?: string[]; // 流式响应的块
}

// 配置导出/导入接口
export interface ConfigExportData {
  models: AiModelConfig[];
  roles: AiRoleConfig[];
  discussionConfig?: DiscussionConfig;
  discussionRecords?: DiscussionRecord[]; // 可选的讨论记录
  exportedAt: string;
  version: string;
}

// 讨论记录导出接口
export interface DiscussionExportData {
  record: DiscussionRecord;
  stats: DiscussionStats;
  fullTranscript: string; // 完整的文本记录
  exportFormat: 'json' | 'markdown' | 'html' | 'txt';
  exportedAt: string;
  version: string;
}

// 验证结果接口
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// 角色状态接口（运行时使用）
export interface RoleState {
  id: string;
  name: string;
  isProcessing: boolean;
  lastResponse?: string;
  totalResponseTime?: number;
  messageCount?: number;
  currentStreamingMessageId?: string; // 当前正在流式传输的消息ID
}

// 会话状态接口
export interface SessionState {
  isActive: boolean;
  startTime?: Date;
  currentTurn: number;
  activeRoles: RoleState[];
  discussionLog: Array<{
    roleId: string;
    roleName: string;
    message: string;
    timestamp: Date;
  }>;
  canBeInterrupted: boolean; // 是否可以被中断
  interruptionRequested: boolean; // 是否请求了中断
}

// 讨论控制接口
export interface DiscussionControl {
  canStart: boolean;
  canPause: boolean;
  canResume: boolean;
  canInterrupt: boolean;
  canExport: boolean;
  currentPhase: 'idle' | 'initializing' | 'discussing' | 'synthesizing' | 'completed' | 'interrupted';
  estimatedTimeRemaining?: number; // 估算剩余时间（毫秒）
}

// 导出选项接口
export interface ExportOptions {
  format: 'json' | 'markdown' | 'html' | 'txt';
  includeMetadata: boolean;
  includeStats: boolean;
  includeNotepadHistory: boolean;
  includeSystemMessages: boolean;
  timestampFormat: 'iso' | 'local' | 'relative';
  compressOutput: boolean;
}

// 消息过滤器接口
export interface MessageFilter {
  senders?: (MessageSender | string)[];
  purposes?: MessagePurpose[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  textSearch?: string;
  hasDuration?: boolean;
  hasImage?: boolean;
  minDuration?: number;
  maxDuration?: number;
}

// 通知接口
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  duration?: number; // 自动消失时间（毫秒）
  actions?: Array<{
    label: string;
    action: () => void;
    style?: 'primary' | 'secondary' | 'danger';
  }>;
}

// 应用状态接口
export interface AppState {
  ui: {
    theme: 'light' | 'dark' | 'auto';
    sidebarCollapsed: boolean;
    roleManagerOpen: boolean;
    configManagerOpen: boolean;
    notifications: Notification[];
  };
  discussion: {
    current?: DiscussionRecord;
    history: DiscussionRecord[];
    control: DiscussionControl;
    streaming: Map<string, StreamingState>;
  };
  session: SessionState;
  config: {
    channels: any[];
    models: any[];
    roles: any[];
    discussionSettings: DiscussionConfig;
  };
}