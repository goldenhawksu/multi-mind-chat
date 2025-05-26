// API渠道配置接口
export interface ApiChannel {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  isDefault: boolean;
  isCustom: boolean;
  timeout?: number;
  headers?: Record<string, string>;
  description?: string;
  createdAt: Date;
}

// 动态模型配置接口
export interface AiModel {
  id: string;
  name: string;
  apiName: string;
  channelId: string; // 关联的渠道ID
  supportsImages: boolean;
  supportsReducedCapacity: boolean;
  category: string;
  maxTokens: number;
  temperature: number;
  isCustom: boolean;
  createdAt: Date;
}

// AI角色配置接口
export interface AiRole {
  id: string;
  name: string;
  systemPrompt: string;
  modelId: string;
  isActive: boolean;
}

// 默认渠道配置
export const DEFAULT_CHANNELS: ApiChannel[] = [
  {
    id: 'openai-official',
    name: 'OpenAI 官方',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    isDefault: true,
    isCustom: false,
    timeout: 30000,
    description: 'OpenAI 官方API服务',
    createdAt: new Date()
  }
];

// 默认预设模型配置（仅一个，关联到默认渠道）
export const DEFAULT_MODELS: AiModel[] = [
  {
    id: 'gpt-4-mini-default',
    name: 'GPT-4.1 Mini',
    apiName: 'gpt-4.1-mini',
    channelId: 'openai-official',
    supportsImages: true,
    supportsReducedCapacity: true,
    category: 'GPT-4系列',
    maxTokens: 16384,
    temperature: 0.7,
    isCustom: false,
    createdAt: new Date()
  }
];

// 默认角色配置 - 使用中文系统提示词并明确身份认知
export const DEFAULT_ROLES: AiRole[] = [
  {
    id: 'cognito-default',
    name: 'Cognito',
    systemPrompt: `你是Cognito，一位严谨的逻辑分析师AI助手。只有你叫Cognito这个名字，你的独特特征包括：
- 系统性思维和结构化分析
- 注重数据、事实和逻辑推理
- 追求准确性和客观性
- 善于发现问题的核心和关键要素

在多AI协作讨论环境中，你与其他AI角色平等协作，各自发挥专长。请始终：
1. 用中文进行所有回应
2. 以你的名字Cognito的身份进行思考和回应
3. 与其他AI角色进行建设性对话，避免使用"你们"等不当称呼
4. 发挥你的逻辑分析专长，为讨论提供理性和系统化的观点

记住：你是Cognito，独一无二的逻辑分析师。`,
    modelId: 'gpt-4-mini-default',
    isActive: true
  },
  {
    id: 'muse-default',
    name: 'Muse',
    systemPrompt: `你是Muse，一位富有创意的思考家AI助手。只有你叫Muse这个名字，你的独特特征包括：
- 发散性思维和创新视角
- 善于联想、类比和跨领域思考
- 关注人文情怀和情感层面
- 能够从不同角度审视问题

在多AI协作讨论环境中，你与其他AI角色平等协作，各自发挥专长。请始终：
1. 用中文进行所有回应
2. 以你的名字Muse的身份进行思考和回应
3. 与其他AI角色进行建设性对话，避免使用"你们"等不当称呼
4. 发挥你的创意思维专长，为讨论带来新颖和富有启发性的观点

记住：你是Muse，独一无二的创意思考家。`,
    modelId: 'gpt-4-mini-default',
    isActive: true
  }
];

// 配置管理类
export class ModelConfigManager {
  private static STORAGE_KEY_CHANNELS = 'multi-mind-chat-channels';
  private static STORAGE_KEY_MODELS = 'multi-mind-chat-models';
  private static STORAGE_KEY_ROLES = 'multi-mind-chat-roles';
  private static STORAGE_KEY_INITIALIZED = 'multi-mind-chat-initialized';

  // 初始化检查
  private static ensureInitialized(): void {
    try {
      const isInitialized = localStorage.getItem(this.STORAGE_KEY_INITIALIZED);
      if (!isInitialized) {
        localStorage.setItem(this.STORAGE_KEY_CHANNELS, JSON.stringify(DEFAULT_CHANNELS));
        localStorage.setItem(this.STORAGE_KEY_MODELS, JSON.stringify(DEFAULT_MODELS));
        localStorage.setItem(this.STORAGE_KEY_ROLES, JSON.stringify(DEFAULT_ROLES));
        localStorage.setItem(this.STORAGE_KEY_INITIALIZED, 'true');
      }
    } catch (error) {
      console.warn('无法访问localStorage，将使用内存存储:', error);
    }
  }

  // ============ 渠道管理 ============
  
  // 获取所有渠道
  static getChannels(): ApiChannel[] {
    this.ensureInitialized();
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_CHANNELS);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((channel: any) => ({
          ...channel,
          createdAt: new Date(channel.createdAt)
        }));
      }
    } catch (error) {
      console.warn('从localStorage加载渠道失败:', error);
    }
    return [...DEFAULT_CHANNELS];
  }

  // 保存渠道配置
  static saveChannels(channels: ApiChannel[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY_CHANNELS, JSON.stringify(channels));
    } catch (error) {
      console.error('保存渠道到localStorage失败:', error);
      throw new Error('无法保存渠道配置');
    }
  }

  // 添加新渠道
  static addChannel(channel: Omit<ApiChannel, 'id' | 'createdAt' | 'isCustom'>): ApiChannel {
    const newChannel: ApiChannel = {
      ...channel,
      id: `channel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      isCustom: true
    };

    const channels = this.getChannels();
    
    // 如果这是第一个渠道或设置为默认，清除其他默认标记
    if (newChannel.isDefault || channels.length === 0) {
      channels.forEach(ch => ch.isDefault = false);
      newChannel.isDefault = true;
    }

    channels.push(newChannel);
    this.saveChannels(channels);
    return newChannel;
  }

  // 更新渠道
  static updateChannel(id: string, updates: Partial<ApiChannel>): void {
    const channels = this.getChannels();
    const index = channels.findIndex(ch => ch.id === id);
    if (index !== -1) {
      // 如果设置为默认，清除其他默认标记
      if (updates.isDefault) {
        channels.forEach(ch => ch.isDefault = false);
      }
      channels[index] = { ...channels[index], ...updates };
      this.saveChannels(channels);
    }
  }

  // 删除渠道
  static deleteChannel(id: string): void {
    const channels = this.getChannels();
    const filtered = channels.filter(ch => ch.id !== id);
    
    // 如果删除的是默认渠道，设置第一个为默认
    const deletedChannel = channels.find(ch => ch.id === id);
    if (deletedChannel?.isDefault && filtered.length > 0) {
      filtered[0].isDefault = true;
    }
    
    this.saveChannels(filtered);
  }

  // 获取默认渠道
  static getDefaultChannel(): ApiChannel | null {
    const channels = this.getChannels();
    return channels.find(ch => ch.isDefault) || channels[0] || null;
  }

  // 根据ID获取渠道
  static getChannelById(id: string): ApiChannel | null {
    const channels = this.getChannels();
    return channels.find(ch => ch.id === id) || null;
  }

  // 验证渠道配置
  static validateChannel(channel: Partial<ApiChannel>): string[] {
    const errors: string[] = [];
    
    if (!channel.name?.trim()) {
      errors.push('渠道名称不能为空');
    }
    
    if (!channel.baseUrl?.trim()) {
      errors.push('API基础URL不能为空');
    } else {
      try {
        new URL(channel.baseUrl);
      } catch {
        errors.push('API基础URL格式无效');
      }
    }
    
    if (!channel.apiKey?.trim()) {
      errors.push('API密钥不能为空');
    }
    
    if (channel.timeout && (typeof channel.timeout !== 'number' || channel.timeout < 1000)) {
      errors.push('超时时间必须是大于1000毫秒的数字');
    }
    
    return errors;
  }

  // ============ 模型管理 ============

  // 获取所有模型
  static getModels(): AiModel[] {
    this.ensureInitialized();
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_MODELS);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((model: any) => ({
          ...model,
          createdAt: new Date(model.createdAt)
        }));
      }
    } catch (error) {
      console.warn('从localStorage加载模型失败:', error);
    }
    return [...DEFAULT_MODELS];
  }

  // 保存模型配置
  static saveModels(models: AiModel[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY_MODELS, JSON.stringify(models));
    } catch (error) {
      console.error('保存模型到localStorage失败:', error);
      throw new Error('无法保存模型配置');
    }
  }

  // 添加新模型
  static addModel(model: Omit<AiModel, 'id' | 'createdAt' | 'isCustom'>): AiModel {
    const newModel: AiModel = {
      ...model,
      id: `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      isCustom: true
    };

    const models = this.getModels();
    models.push(newModel);
    this.saveModels(models);
    return newModel;
  }

  // 更新模型
  static updateModel(id: string, updates: Partial<AiModel>): void {
    const models = this.getModels();
    const index = models.findIndex(m => m.id === id);
    if (index !== -1) {
      models[index] = { ...models[index], ...updates };
      this.saveModels(models);
    }
  }

  // 删除模型
  static deleteModel(id: string): void {
    const models = this.getModels();
    const filtered = models.filter(m => m.id !== id);
    this.saveModels(filtered);
  }

  // 验证模型配置
  static validateModel(model: Partial<AiModel>): string[] {
    const errors: string[] = [];
    
    if (!model.name?.trim()) {
      errors.push('模型名称不能为空');
    }
    
    if (!model.apiName?.trim()) {
      errors.push('API模型名称不能为空');
    }
    
    if (!model.channelId?.trim()) {
      errors.push('必须选择API渠道');
    }
    
    if (!model.category?.trim()) {
      errors.push('模型类别不能为空');
    }
    
    if (typeof model.maxTokens !== 'number' || model.maxTokens < 1) {
      errors.push('最大Token数必须是大于0的数字');
    }
    
    if (typeof model.temperature !== 'number' || model.temperature < 0 || model.temperature > 2) {
      errors.push('温度参数必须在0-2之间');
    }
    
    return errors;
  }

  // ============ 角色管理 ============

  // 获取所有角色
  static getRoles(): AiRole[] {
    this.ensureInitialized();
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_ROLES);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('从localStorage加载角色失败:', error);
    }
    return [...DEFAULT_ROLES];
  }

  // 保存角色配置
  static saveRoles(roles: AiRole[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY_ROLES, JSON.stringify(roles));
    } catch (error) {
      console.error('保存角色到localStorage失败:', error);
      throw new Error('无法保存角色配置');
    }
  }

  // 添加新角色
  static addRole(role: Omit<AiRole, 'id'>): AiRole {
    const newRole: AiRole = {
      ...role,
      id: `role-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    const roles = this.getRoles();
    roles.push(newRole);
    this.saveRoles(roles);
    return newRole;
  }

  // 更新角色
  static updateRole(id: string, updates: Partial<AiRole>): void {
    const roles = this.getRoles();
    const index = roles.findIndex(r => r.id === id);
    if (index !== -1) {
      roles[index] = { ...roles[index], ...updates };
      this.saveRoles(roles);
    }
  }

  // 删除角色
  static deleteRole(id: string): void {
    const roles = this.getRoles();
    const filtered = roles.filter(r => r.id !== id);
    this.saveRoles(filtered);
  }

  // 获取活跃角色
  static getActiveRoles(): AiRole[] {
    return this.getRoles().filter(role => role.isActive);
  }

  // ============ 工具方法 ============

  // 根据类别分组模型
  static getModelsByCategory(): Record<string, AiModel[]> {
    const models = this.getModels();
    return models.reduce((acc, model) => {
      if (!acc[model.category]) {
        acc[model.category] = [];
      }
      acc[model.category].push(model);
      return acc;
    }, {} as Record<string, AiModel[]>);
  }

  // 重置为默认配置
  static resetToDefaults(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY_CHANNELS);
      localStorage.removeItem(this.STORAGE_KEY_MODELS);
      localStorage.removeItem(this.STORAGE_KEY_ROLES);
      localStorage.removeItem(this.STORAGE_KEY_INITIALIZED);
      this.ensureInitialized();
    } catch (error) {
      console.error('重置配置失败:', error);
      throw new Error('无法重置配置');
    }
  }

  // 导出配置
  static exportConfig(): string {
    return JSON.stringify({
      channels: this.getChannels(),
      models: this.getModels(),
      roles: this.getRoles(),
      exportedAt: new Date().toISOString(),
      version: '2.0'
    }, null, 2);
  }

  // 导入配置
  static importConfig(configJson: string): { success: boolean; message: string } {
    try {
      const config = JSON.parse(configJson);
      
      if (!config.channels && !config.models && !config.roles) {
        return { success: false, message: '配置文件格式无效，缺少必要的配置信息' };
      }
      
      if (config.channels && Array.isArray(config.channels)) {
        const validChannels = config.channels.filter((channel: any) => {
          const errors = this.validateChannel(channel);
          return errors.length === 0;
        });
        
        if (validChannels.length > 0) {
          const processedChannels = validChannels.map((channel: any) => ({
            ...channel,
            createdAt: new Date(channel.createdAt || new Date()),
            isCustom: channel.isCustom !== false
          }));
          this.saveChannels(processedChannels);
        }
      }
      
      if (config.models && Array.isArray(config.models)) {
        const validModels = config.models.filter((model: any) => {
          const errors = this.validateModel(model);
          return errors.length === 0;
        });
        
        if (validModels.length > 0) {
          const processedModels = validModels.map((model: any) => ({
            ...model,
            createdAt: new Date(model.createdAt || new Date()),
            isCustom: model.isCustom !== false
          }));
          this.saveModels(processedModels);
        }
      }
      
      if (config.roles && Array.isArray(config.roles)) {
        this.saveRoles(config.roles);
      }
      
      return { success: true, message: '配置导入成功' };
    } catch (error) {
      return { success: false, message: `配置导入失败: ${error instanceof Error ? error.message : '未知错误'}` };
    }
  }

  // 清空所有数据
  static clearAllData(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY_CHANNELS);
      localStorage.removeItem(this.STORAGE_KEY_MODELS);
      localStorage.removeItem(this.STORAGE_KEY_ROLES);
      localStorage.removeItem(this.STORAGE_KEY_INITIALIZED);
    } catch (error) {
      console.error('清空数据失败:', error);
      throw new Error('无法清空配置数据');
    }
  }

  // 获取存储使用情况
  static getStorageInfo(): { used: number; available: number; channels: number; models: number; roles: number } {
    try {
      const channelsData = localStorage.getItem(this.STORAGE_KEY_CHANNELS) || '';
      const modelsData = localStorage.getItem(this.STORAGE_KEY_MODELS) || '';
      const rolesData = localStorage.getItem(this.STORAGE_KEY_ROLES) || '';
      const used = channelsData.length + modelsData.length + rolesData.length;
      
      return {
        used,
        available: 5242880 - used, // 5MB 大致容量
        channels: this.getChannels().length,
        models: this.getModels().length,
        roles: this.getRoles().length
      };
    } catch (error) {
      return { used: 0, available: 0, channels: 0, models: 0, roles: 0 };
    }
  }
}

// 其他常量配置
export const DEFAULT_MANUAL_FIXED_TURNS = 2;
export const MIN_MANUAL_FIXED_TURNS = 1;
export const MAX_MANUAL_FIXED_TURNS = 5;
export const MAX_AI_DRIVEN_DISCUSSION_TURNS_PER_MODEL = 3;

export const INITIAL_NOTEPAD_CONTENT = `这是一个共享记事本。
AI角色可以在这里合作记录想法、草稿或关键点。

使用指南:
- AI 模型可以通过在其回复中包含特定指令来更新此记事本。
- 记事本的内容将包含在发送给 AI 的后续提示中。

初始状态：空白。`;

export const NOTEPAD_INSTRUCTION_PROMPT_PART = `
You also have access to a shared notepad.
Current Notepad Content:
---
{notepadContent}
---
Instructions for Notepad:
1. To update the notepad, include a section at the very end of your response, formatted exactly as:
   <notepad_update>
   [YOUR NEW FULL NOTEPAD CONTENT HERE. THIS WILL REPLACE THE ENTIRE CURRENT NOTEPAD CONTENT.]
   </notepad_update>
2. If you do not want to change the notepad, do NOT include the <notepad_update> section at all.
3. Your primary spoken response to the ongoing discussion should come BEFORE any <notepad_update> section. Ensure you still provide a spoken response.
`;

export const NOTEPAD_UPDATE_TAG_START = "<notepad_update>";
export const NOTEPAD_UPDATE_TAG_END = "</notepad_update>";
export const DISCUSSION_COMPLETE_TAG = "<discussion_complete />";

export const AI_DRIVEN_DISCUSSION_INSTRUCTION_PROMPT_PART = `
Instruction for ending discussion: If you believe the current topic has been sufficiently explored between you and your AI partner for the final synthesis, include the exact tag ${DISCUSSION_COMPLETE_TAG} at the very end of your current message (after any notepad update). Do not use this tag if you wish to continue the discussion or require more input/response from your partner.
`;

export enum DiscussionMode {
  FixedTurns = 'fixed',
  AiDriven = 'ai-driven',
}