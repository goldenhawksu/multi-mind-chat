import React, { useState, useEffect } from 'react';
import { ChatMessage, MessageSender, MessagePurpose } from '../types';
import { Lightbulb, MessageSquareText, UserCircle, Zap, AlertTriangle, Copy, Check, MoreHorizontal } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface SenderIconProps {
  sender: MessageSender;
  purpose: MessagePurpose;
  messageText: string;
}

const SenderIcon: React.FC<SenderIconProps> = ({ sender, purpose, messageText }) => {
  const iconClass = "w-5 h-5 mr-2 flex-shrink-0";
  switch (sender) {
    case MessageSender.User:
      return <UserCircle className={`${iconClass} text-blue-400`} />;
    case MessageSender.Cognito:
      return <Lightbulb className={`${iconClass} text-green-400`} />;
    case MessageSender.Muse:
      return <Zap className={`${iconClass} text-purple-400`} />;
    case MessageSender.System:
      if (
        purpose === MessagePurpose.SystemNotification &&
        (messageText.toLowerCase().includes("error") ||
          messageText.toLowerCase().includes("错误") ||
          messageText.toLowerCase().includes("警告"))
      ) {
        return <AlertTriangle className={`${iconClass} text-red-400`} />;
      }
      return <MessageSquareText className={`${iconClass} text-gray-400`} />;
    default:
      // For dynamic role names, use a generic bot icon with dynamic color
      const colorClasses = [
        'text-green-400', 'text-purple-400', 'text-blue-400', 
        'text-yellow-400', 'text-pink-400', 'text-indigo-400'
      ];
      const colorIndex = typeof sender === 'string' ? 
        sender.length % colorClasses.length : 0;
      return <Lightbulb className={`${iconClass} ${colorClasses[colorIndex]}`} />;
  }
};

const getSenderNameStyle = (sender: MessageSender): string => {
  switch (sender) {
    case MessageSender.User: return "text-blue-300";
    case MessageSender.Cognito: return "text-green-300";
    case MessageSender.Muse: return "text-purple-300";
    case MessageSender.System: return "text-gray-400";
    default: 
      // For dynamic role names, apply dynamic colors
      const colorClasses = [
        'text-green-300', 'text-purple-300', 'text-blue-300',
        'text-yellow-300', 'text-pink-300', 'text-indigo-300'
      ];
      const colorIndex = typeof sender === 'string' ? 
        sender.length % colorClasses.length : 0;
      return colorClasses[colorIndex];
  }
}

const getBubbleStyle = (sender: MessageSender, purpose: MessagePurpose, messageText: string): string => {
  let baseStyle = "mb-4 p-4 rounded-lg shadow-md max-w-xl break-words relative ";
  if (purpose === MessagePurpose.SystemNotification) {
    if (
      messageText.toLowerCase().includes("error") ||
      messageText.toLowerCase().includes("错误") ||
      messageText.toLowerCase().includes("警告") ||
      messageText.toLowerCase().includes("critical") ||
      messageText.toLowerCase().includes("严重")
    ) {
       return baseStyle + "bg-red-800 border border-red-700 text-center text-sm italic mx-auto text-red-200";
    }
    return baseStyle + "bg-gray-700 text-center text-sm italic mx-auto";
  }
  switch (sender) {
    case MessageSender.User:
      return baseStyle + "bg-blue-600 ml-auto rounded-br-none";
    case MessageSender.Cognito:
      return baseStyle + "bg-green-700 mr-auto rounded-bl-none";
    case MessageSender.Muse:
      return baseStyle + "bg-purple-700 mr-auto rounded-bl-none";
    default:
      // For dynamic role names, use varied background colors
      const bgColors = [
        'bg-green-700', 'bg-purple-700', 'bg-blue-700',
        'bg-yellow-700', 'bg-pink-700', 'bg-indigo-700'
      ];
      const bgIndex = typeof sender === 'string' ? 
        sender.length % bgColors.length : 0;
      return baseStyle + bgColors[bgIndex] + " mr-auto rounded-bl-none";
  }
};

const getPurposePrefix = (purpose: MessagePurpose, sender: MessageSender): string => {
  switch (purpose) {
    case MessagePurpose.CognitoToMuse:
      return `致 ${MessageSender.Muse}的消息: `;
    case MessagePurpose.MuseToCognito:
      return `致 ${MessageSender.Cognito}的消息: `;
    case MessagePurpose.FinalResponse:
      return `最终答案: `;
    default:
      return "";
  }
}

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { text: messageText, sender, purpose, timestamp, durationMs, image } = message;
  const formattedTime = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const [isCopied, setIsCopied] = useState(false);

  // 移除所有流式动画逻辑，直接显示内容
  const isDiscussionStep = purpose === MessagePurpose.CognitoToMuse || purpose === MessagePurpose.MuseToCognito;
  const isFinalResponse = purpose === MessagePurpose.FinalResponse;
  const showDuration = durationMs !== undefined && durationMs > 0;

  const shouldRenderMarkdown = 
    (sender === MessageSender.User || sender === MessageSender.Cognito || sender === MessageSender.Muse || typeof sender === 'string') &&
    purpose !== MessagePurpose.SystemNotification; 

  let sanitizedHtml = '';
  if (shouldRenderMarkdown && messageText) {
    const rawHtml = marked.parse(messageText) as string;
    sanitizedHtml = DOMPurify.sanitize(rawHtml);
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('无法复制文本: ', err);
    }
  };

  const canCopy = (sender === MessageSender.User || sender === MessageSender.Cognito || sender === MessageSender.Muse || typeof sender === 'string') && purpose !== MessagePurpose.SystemNotification;

  return (
    <div className={`flex ${sender === MessageSender.User ? 'justify-end' : 'justify-start'}`}>
      <div className={getBubbleStyle(sender, purpose, messageText)}>
        {canCopy && (
          <button
            onClick={handleCopy}
            title={isCopied ? "已复制!" : "复制消息"}
            className="absolute top-1.5 right-1.5 p-1 text-gray-400 hover:text-sky-300 transition-colors rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {isCopied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
          </button>
        )}
        
        <div className="flex items-center mb-1">
          <SenderIcon sender={sender} purpose={purpose} messageText={messageText} />
          <span className={`font-semibold ${getSenderNameStyle(sender)}`}>{sender}</span>
          {isDiscussionStep && <span className="ml-2 text-xs text-gray-400">(内部讨论)</span>}
        </div>
        
        {messageText ? (
          shouldRenderMarkdown ? (
            <div
              className="chat-markdown-content text-sm text-gray-200"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          ) : (
            <p className="text-sm text-gray-200 whitespace-pre-wrap">
              {messageText}
            </p>
          )
        ) : (
          <p className="text-sm text-gray-400 italic">
            正在生成回复...
          </p>
        )}

        {image && sender === MessageSender.User && (
           <div className={`mt-2 ${messageText ? 'pt-2 border-t border-blue-500' : ''}`}>
            <img 
              src={image.dataUrl} 
              alt={image.name || "用户上传的图片"} 
              className="max-w-xs max-h-64 rounded-md object-contain" 
            />
          </div>
        )}
        
        <div className="text-xs text-gray-400 mt-2 flex justify-between items-center">
          <span>{formattedTime}</span>
          {showDuration && (
            <span className="italic"> (耗时: {(durationMs / 1000).toFixed(2)}s)</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;