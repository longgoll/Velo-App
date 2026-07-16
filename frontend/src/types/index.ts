export interface UserData {
  id: string;
  username: string;
  email: string;
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
}

export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  workspace_id: string;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  user_id: string;
  username: string;
  content: string;
  timestamp: string | number;
}
