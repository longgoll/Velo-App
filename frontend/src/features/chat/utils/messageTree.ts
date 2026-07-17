import type { ChatMessage } from '@/types';

export interface ExtendedChatMessage extends ChatMessage {
  parentId?: string;
  parentUsername?: string;
  replies?: ExtendedChatMessage[];
  uploadProgress?: number;
  fileName?: string;
  isUploading?: boolean;
}

export const buildMessageTree = (messages: ChatMessage[]): ExtendedChatMessage[] => {
  const rootMessages: ExtendedChatMessage[] = [];
  const messageMap: Record<string, ExtendedChatMessage> = {};
  const parentMap: Record<string, string> = {}; // childId -> parentId

  // 1. Initialize messageMap with copies and parse parents
  messages.forEach((msg) => {
    const replyMatch = msg.content.match(/^\[reply:([^:]+):([^\]]+)\]\s*(.*)/);
    if (replyMatch) {
      const [_, parentId, parentUsername, actualContent] = replyMatch;
      parentMap[msg.id] = parentId;
      messageMap[msg.id] = {
        ...msg,
        content: actualContent,
        parentId,
        parentUsername,
        replies: []
      };
    } else {
      messageMap[msg.id] = {
        ...msg,
        replies: []
      };
    }
  });

  // Helper to find the root parent ID in the thread
  const findRootParentId = (childId: string): string => {
    let currentId = childId;
    const visited = new Set<string>();
    while (parentMap[currentId] && !visited.has(currentId)) {
      visited.add(currentId);
      currentId = parentMap[currentId];
    }
    return currentId;
  };

  // 2. Build the hierarchy by flattening under root parents
  messages.forEach((msg) => {
    const mappedMsg = messageMap[msg.id];
    if (!mappedMsg) return;

    if (mappedMsg.parentId) {
      const rootParentId = findRootParentId(msg.id);
      if (messageMap[rootParentId]) {
        messageMap[rootParentId].replies!.push(mappedMsg);
      } else {
        // Root parent not found in active messages, treat as root but with reply headers
        rootMessages.push(mappedMsg);
      }
    } else {
      rootMessages.push(mappedMsg);
    }
  });

  return rootMessages;
};
