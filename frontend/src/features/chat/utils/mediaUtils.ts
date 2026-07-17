import { FileText, FileSpreadsheet, FileAudio, Video, FileCode, FileIcon } from 'lucide-react';

export const parseImageContent = (content: string) => {
  if (!content.startsWith('[image:') || !content.endsWith(']')) {
    return null;
  }
  const inner = content.slice(7, -1);
  const firstColonIdx = inner.indexOf(':');
  if (firstColonIdx === -1) return null;
  const fileName = inner.slice(0, firstColonIdx);
  const urlsPart = inner.slice(firstColonIdx + 1);

  const httpMatch = urlsPart.match(/:(https?:\/\/)/);
  if (httpMatch && httpMatch.index !== undefined) {
    const originalUrl = urlsPart.slice(0, httpMatch.index);
    const thumbnailUrl = urlsPart.slice(httpMatch.index + 1);
    return { fileName, url: originalUrl, originalUrl, thumbnailUrl };
  }

  return { fileName, url: urlsPart, originalUrl: urlsPart, thumbnailUrl: undefined };
};

export const parseFileContent = (content: string) => {
  if (!content.startsWith('[file:') || !content.endsWith(']')) {
    return null;
  }
  const inner = content.slice(6, -1);
  const firstColonIdx = inner.indexOf(':');
  if (firstColonIdx === -1) return null;
  const fileName = inner.slice(0, firstColonIdx);
  const urlsPart = inner.slice(firstColonIdx + 1);

  const lastColonIdx = urlsPart.lastIndexOf(':');
  if (lastColonIdx === -1) {
    return { fileName, url: urlsPart, size: 'Unknown' };
  }
  const url = urlsPart.slice(0, lastColonIdx);
  const size = urlsPart.slice(lastColonIdx + 1);

  return { fileName, url, size };
};

export const extractLinks = (content: string) => {
  // Ignore custom codes
  if (content.startsWith('[image:') || content.startsWith('[file:') || content.startsWith('[call:')) {
    return [];
  }
  // Simple url regex
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = content.match(urlRegex);
  return matches || [];
};

export const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
    case 'txt':
    case 'md':
    case 'log':
      return FileText;
    case 'csv':
    case 'xlsx':
    case 'xls':
      return FileSpreadsheet;
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'm4a':
      return FileAudio;
    case 'mp4':
    case 'mov':
    case 'avi':
    case 'mkv':
      return Video;
    case 'js':
    case 'ts':
    case 'tsx':
    case 'jsx':
    case 'go':
    case 'py':
    case 'java':
    case 'cpp':
    case 'c':
    case 'cs':
    case 'html':
    case 'css':
    case 'json':
    case 'yaml':
    case 'yml':
      return FileCode;
    default:
      return FileIcon;
  }
};

export const getDomainName = (url: string) => {
  try {
    const hostname = new URL(url).hostname;
    return hostname.startsWith('www.') ? hostname.substring(4) : hostname;
  } catch {
    return 'Liên kết';
  }
};
