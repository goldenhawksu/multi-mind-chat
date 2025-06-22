import { DiscussionRecord, DiscussionStats, DiscussionExportData, ExportOptions, ChatMessage, MessagePurpose } from './types';

export class DiscussionRecordManager {
  private static STORAGE_KEY = 'multi-mind-chat-discussion-records';
  private static MAX_RECORDS = 50; // 最多保存50条记录

  // 保存讨论记录到本地存储
  static saveRecord(record: DiscussionRecord): void {
    try {
      const existingRecords = this.getAllRecords();
      const updatedRecords = [record, ...existingRecords.filter(r => r.id !== record.id)];
      
      // 保持最大记录数限制
      const trimmedRecords = updatedRecords.slice(0, this.MAX_RECORDS);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmedRecords));
    } catch (error) {
      console.error('保存讨论记录失败:', error);
      throw new Error('无法保存讨论记录到本地存储');
    }
  }

  // 获取所有讨论记录
  static getAllRecords(): DiscussionRecord[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const records = JSON.parse(stored);
      return records.map((record: any) => ({
        ...record,
        timestamp: new Date(record.timestamp),
        turns: record.turns.map((turn: any) => ({
          ...turn,
          timestamp: new Date(turn.timestamp)
        })),
        notepadUpdates: record.notepadUpdates.map((update: any) => ({
          ...update,
          timestamp: new Date(update.timestamp)
        })),
        finalAnswer: record.finalAnswer ? {
          ...record.finalAnswer,
          timestamp: new Date(record.finalAnswer.timestamp)
        } : undefined,
        interruptedAt: record.interruptedAt ? new Date(record.interruptedAt) : undefined,
        metadata: {
          ...record.metadata,
          exportedAt: record.metadata.exportedAt ? new Date(record.metadata.exportedAt) : undefined
        }
      }));
    } catch (error) {
      console.error('加载讨论记录失败:', error);
      return [];
    }
  }

  // 根据ID获取单个记录
  static getRecordById(id: string): DiscussionRecord | null {
    const records = this.getAllRecords();
    return records.find(record => record.id === id) || null;
  }

  // 删除指定记录
  static deleteRecord(id: string): void {
    try {
      const records = this.getAllRecords();
      const filteredRecords = records.filter(record => record.id !== id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredRecords));
    } catch (error) {
      console.error('删除讨论记录失败:', error);
      throw new Error('无法删除讨论记录');
    }
  }

  // 清空所有记录
  static clearAllRecords(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('清空讨论记录失败:', error);
      throw new Error('无法清空讨论记录');
    }
  }

  // 计算讨论统计信息
  static calculateStats(record: DiscussionRecord): DiscussionStats {
    const turns = record.turns.filter(turn => turn.durationMs && turn.durationMs > 0);
    const responseTimes = turns.map(turn => turn.durationMs!);
    
    const roleParticipation: Record<string, any> = {};
    
    // 统计每个角色的参与情况
    record.activeRoles.forEach(role => {
      const roleTurns = turns.filter(turn => turn.roleId === role.id);
      const roleResponseTimes = roleTurns.map(turn => turn.durationMs!);
      
      roleParticipation[role.name] = {
        turnCount: roleTurns.length,
        totalResponseTime: roleResponseTimes.reduce((sum, time) => sum + time, 0),
        averageResponseTime: roleResponseTimes.length > 0 
          ? roleResponseTimes.reduce((sum, time) => sum + time, 0) / roleResponseTimes.length 
          : 0
      };
    });

    return {
      totalTurns: turns.length,
      averageResponseTime: responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0,
      longestResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      shortestResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      roleParticipation,
      notepadUpdateFrequency: record.notepadUpdates.length / Math.max(turns.length, 1)
    };
  }

  // 生成完整的讨论文本记录
  static generateTranscript(record: DiscussionRecord, includeMetadata: boolean = true): string {
    let transcript = '';
    
    if (includeMetadata) {
      transcript += `=== CTS Chat 讨论记录 ===\n`;
      transcript += `讨论ID: ${record.id}\n`;
      transcript += `开始时间: ${record.timestamp.toLocaleString()}\n`;
      transcript += `讨论模式: ${record.discussionMode}\n`;
      transcript += `参与角色: ${record.activeRoles.map(r => r.name).join(', ')}\n`;
      transcript += `总耗时: ${(record.totalDuration / 1000).toFixed(2)}秒\n`;
      
      if (record.wasInterrupted) {
        transcript += `状态: 被用户中断 (${record.interruptedAt?.toLocaleString()})\n`;
      } else if (record.isCompleted) {
        transcript += `状态: 正常完成\n`;
      }
      
      transcript += `\n=== 用户查询 ===\n`;
      transcript += `${record.userQuery}\n\n`;
    }

    // 添加讨论过程
    transcript += `=== 讨论过程 ===\n`;
    record.turns.forEach((turn, index) => {
      const timeStr = turn.timestamp.toLocaleTimeString();
      const durationStr = turn.durationMs ? ` (${(turn.durationMs / 1000).toFixed(2)}s)` : '';
      transcript += `[${timeStr}] ${turn.role}${durationStr}:\n${turn.message}\n\n`;
    });

    // 添加记事本更新历史
    if (record.notepadUpdates.length > 0) {
      transcript += `=== 记事本更新历史 ===\n`;
      record.notepadUpdates.forEach((update, index) => {
        const timeStr = update.timestamp.toLocaleTimeString();
        transcript += `[${timeStr}] ${update.updater} 更新了记事本:\n${update.content}\n\n`;
      });
    }

    // 添加最终答案
    if (record.finalAnswer) {
      transcript += `=== 最终答案 ===\n`;
      const timeStr = record.finalAnswer.timestamp.toLocaleTimeString();
      const durationStr = record.finalAnswer.durationMs ? ` (${(record.finalAnswer.durationMs / 1000).toFixed(2)}s)` : '';
      transcript += `[${timeStr}] ${record.finalAnswer.provider}${durationStr}:\n${record.finalAnswer.content}\n\n`;
    }

    return transcript;
  }

  // 导出讨论记录为指定格式
  static exportRecord(record: DiscussionRecord, options: ExportOptions): DiscussionExportData {
    const stats = options.includeStats ? this.calculateStats(record) : {} as DiscussionStats;
    const transcript = this.generateTranscript(record, options.includeMetadata);

    return {
      record: options.includeMetadata ? record : {
        ...record,
        metadata: { version: record.metadata.version, messageCount: 0, notepadUpdateCount: 0 }
      } as DiscussionRecord,
      stats,
      fullTranscript: transcript,
      exportFormat: options.format,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
  }

  // 生成Markdown格式的导出
  static exportAsMarkdown(record: DiscussionRecord, options: ExportOptions): string {
    let markdown = `# CTS Chat 讨论记录\n\n`;
    
    if (options.includeMetadata) {
      markdown += `## 基本信息\n\n`;
      markdown += `- **讨论ID**: ${record.id}\n`;
      markdown += `- **开始时间**: ${record.timestamp.toLocaleString()}\n`;
      markdown += `- **讨论模式**: ${record.discussionMode}\n`;
      markdown += `- **参与角色**: ${record.activeRoles.map(r => r.name).join(', ')}\n`;
      markdown += `- **总耗时**: ${(record.totalDuration / 1000).toFixed(2)}秒\n`;
      
      if (record.wasInterrupted) {
        markdown += `- **状态**: ⚠️ 被用户中断 (${record.interruptedAt?.toLocaleString()})\n`;
      } else if (record.isCompleted) {
        markdown += `- **状态**: ✅ 正常完成\n`;
      }
      
      markdown += `\n`;
    }

    markdown += `## 用户查询\n\n`;
    markdown += `> ${record.userQuery}\n\n`;

    if (record.userImage) {
      markdown += `*用户还上传了图片: ${record.userImage.name} (${(record.userImage.size / 1024).toFixed(1)} KB)*\n\n`;
    }

    markdown += `## 讨论过程\n\n`;
    record.turns.forEach((turn, index) => {
      const timeStr = turn.timestamp.toLocaleTimeString();
      const durationStr = turn.durationMs ? ` *(${(turn.durationMs / 1000).toFixed(2)}s)*` : '';
      markdown += `### ${turn.role} - ${timeStr}${durationStr}\n\n`;
      markdown += `${turn.message}\n\n`;
    });

    if (record.notepadUpdates.length > 0 && options.includeNotepadHistory) {
      markdown += `## 记事本更新历史\n\n`;
      record.notepadUpdates.forEach((update, index) => {
        const timeStr = update.timestamp.toLocaleTimeString();
        markdown += `### ${update.updater} - ${timeStr}\n\n`;
        markdown += `\`\`\`\n${update.content}\n\`\`\`\n\n`;
      });
    }

    if (record.finalAnswer) {
      markdown += `## 最终答案\n\n`;
      const timeStr = record.finalAnswer.timestamp.toLocaleTimeString();
      const durationStr = record.finalAnswer.durationMs ? ` *(${(record.finalAnswer.durationMs / 1000).toFixed(2)}s)*` : '';
      markdown += `### ${record.finalAnswer.provider} - ${timeStr}${durationStr}\n\n`;
      markdown += `${record.finalAnswer.content}\n\n`;
    }

    if (options.includeStats) {
      const stats = this.calculateStats(record);
      markdown += `## 讨论统计\n\n`;
      markdown += `- **总轮次**: ${stats.totalTurns}\n`;
      markdown += `- **平均响应时间**: ${(stats.averageResponseTime / 1000).toFixed(2)}秒\n`;
      markdown += `- **最长响应时间**: ${(stats.longestResponseTime / 1000).toFixed(2)}秒\n`;
      markdown += `- **最短响应时间**: ${(stats.shortestResponseTime / 1000).toFixed(2)}秒\n`;
      markdown += `- **记事本更新频率**: ${(stats.notepadUpdateFrequency * 100).toFixed(1)}%\n\n`;
      
      markdown += `### 角色参与度\n\n`;
      Object.entries(stats.roleParticipation).forEach(([role, data]) => {
        markdown += `- **${role}**: ${data.turnCount}轮, 平均${(data.averageResponseTime / 1000).toFixed(2)}秒\n`;
      });
    }

    markdown += `\n---\n`;
    markdown += `*导出时间: ${new Date().toLocaleString()}*\n`;
    markdown += `*导出版本: CTS Chat v1.0*\n`;

    return markdown;
  }

  // 下载文件的工具函数
  static downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // 导出并下载讨论记录
  static downloadRecord(record: DiscussionRecord, format: 'json' | 'markdown' | 'txt' = 'json'): void {
    const timestamp = record.timestamp.toISOString().split('T')[0];
    const safeQuery = record.userQuery.substring(0, 20).replace(/[^\w\s-]/g, '').trim();
    
    switch (format) {
      case 'json':
        const exportData = this.exportRecord(record, {
          format: 'json',
          includeMetadata: true,
          includeStats: true,
          includeNotepadHistory: true,
          includeSystemMessages: false,
          timestampFormat: 'iso',
          compressOutput: false
        });
        this.downloadFile(
          JSON.stringify(exportData, null, 2),
          `讨论记录-${timestamp}-${safeQuery}.json`,
          'application/json'
        );
        break;
        
      case 'markdown':
        const markdownContent = this.exportAsMarkdown(record, {
          format: 'markdown',
          includeMetadata: true,
          includeStats: true,
          includeNotepadHistory: true,
          includeSystemMessages: false,
          timestampFormat: 'local',
          compressOutput: false
        });
        this.downloadFile(
          markdownContent,
          `讨论记录-${timestamp}-${safeQuery}.md`,
          'text/markdown'
        );
        break;
        
      case 'txt':
        const txtContent = this.generateTranscript(record, true);
        this.downloadFile(
          txtContent,
          `讨论记录-${timestamp}-${safeQuery}.txt`,
          'text/plain'
        );
        break;
    }
  }

  // 搜索讨论记录
  static searchRecords(query: string, maxResults: number = 10): DiscussionRecord[] {
    const records = this.getAllRecords();
    const searchLower = query.toLowerCase();
    
    return records
      .filter(record => 
        record.userQuery.toLowerCase().includes(searchLower) ||
        record.turns.some(turn => turn.message.toLowerCase().includes(searchLower)) ||
        record.finalAnswer?.content.toLowerCase().includes(searchLower)
      )
      .slice(0, maxResults);
  }

  // 获取存储使用情况
  static getStorageInfo(): { used: number; available: number; recordCount: number } {
    try {
      const records = this.getAllRecords();
      const dataSize = JSON.stringify(records).length;
      
      return {
        used: dataSize,
        available: 5242880 - dataSize, // 假设5MB存储限制
        recordCount: records.length
      };
    } catch (error) {
      return { used: 0, available: 0, recordCount: 0 };
    }
  }
}
