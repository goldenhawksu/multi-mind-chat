interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'developer';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
      detail?: 'low' | 'high' | 'auto';
    };
  }>;
}

interface OpenAIResponse {
  text: string;
  durationMs: number;
  error?: string;
}

interface OpenAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason?: string | null;
  }>;
}

const DEFAULT_OPENAI_API_BASE = 'https://api.openai.com/v1';

export const generateResponse = async (
  prompt: string,
  modelName: string,
  systemInstruction?: string,
  shouldUseReducedCapacity: boolean = false,
  imagePart?: { inlineData: { mimeType: string; data: string } },
  customBaseUrl?: string,
  apiKey?: string,
  onStreamChunk?: (newChunk: string, fullText: string, isComplete: boolean) => void
): Promise<OpenAIResponse> => {
  const startTime = performance.now();
  
  try {
    if (!apiKey?.trim()) {
      throw new Error("API密钥未设置。请配置您的OpenAI API密钥。");
    }

    const messages: OpenAIMessage[] = [];
    
    if (systemInstruction) {
      messages.push({
        role: 'system',
        content: systemInstruction
      });
    }

    if (imagePart) {
      const imageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
              detail: 'auto'
            }
          }
        ]
      });
    } else {
      messages.push({
        role: 'user',
        content: prompt
      });
    }

    const requestBody = {
      model: modelName,
      messages: messages,
      stream: !!onStreamChunk, // 只有提供回调时才使用流式
      temperature: shouldUseReducedCapacity ? 0.3 : 0.7,
      max_tokens: shouldUseReducedCapacity ? 1000 : 4000
    };

    const apiBase = customBaseUrl || DEFAULT_OPENAI_API_BASE;
    
    const response = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || response.statusText;
      
      if (response.status === 401) {
        throw new Error(`API密钥无效或已过期: ${errorMessage}`);
      } else if (response.status === 429) {
        throw new Error(`API调用频率超限: ${errorMessage}`);
      } else if (response.status === 404) {
        throw new Error(`模型不存在或无权访问: ${modelName}`);
      } else {
        throw new Error(`OpenAI API 错误 (${response.status}): ${errorMessage}`);
      }
    }

    let fullText = '';
    const durationMs = performance.now() - startTime;

    // 处理流式响应
    if (onStreamChunk && requestBody.stream) {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('无法读取响应流');
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const jsonStr = trimmed.slice(6);
              if (jsonStr === '[DONE]') {
                onStreamChunk('', fullText, true);
                break;
              }

              try {
                const parsed: OpenAIStreamChunk = JSON.parse(jsonStr);
                const content = parsed.choices[0]?.delta?.content;
                if (content) {
                  fullText += content;
                  // 立即回调以实现实时显示
                  onStreamChunk(content, fullText, false);
                }
              } catch (parseError) {
                console.warn('解析流数据时出错:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } else {
      // 处理非流式响应（例如图像请求）
      const data = await response.json();
      fullText = data.choices[0]?.message?.content || '';
    }
    
    if (!fullText.trim()) {
      throw new Error('AI响应为空，请检查模型配置或重试');
    }
    
    return { text: fullText, durationMs };

  } catch (error) {
    console.error("调用OpenAI API时出错:", error);
    const durationMs = performance.now() - startTime;
    
    if (error instanceof Error) {
      if (error.message.includes('API密钥') || error.message.includes('401') || error.message.includes('Unauthorized')) {
        return { text: "API密钥无效或已过期。请检查您的OpenAI API密钥配置。", durationMs, error: "API key not valid" };
      } else if (error.message.includes('429') || error.message.includes('Rate limit')) {
        return { text: "API调用频率超限，请稍后重试。", durationMs, error: "Rate limit exceeded" };
      } else if (error.message.includes('404') || error.message.includes('model')) {
        return { text: `模型 ${modelName} 不存在或无权访问。请检查模型名称或API权限。`, durationMs, error: "Model not found" };
      } else if (error.message.includes('网络') || error.message.includes('fetch')) {
        return { text: "网络连接错误，请检查网络连接后重试。", durationMs, error: "Network error" };
      }
      return { text: `与OpenAI通信时出错: ${error.message}`, durationMs, error: error.message };
    }
    return { text: "与OpenAI通信时发生未知错误。", durationMs, error: "Unknown OpenAI error" };
  }
};