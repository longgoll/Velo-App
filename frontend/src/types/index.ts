export interface UserData {
  id: string;
  username: string;
  email: string;
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  invite_code?: string;
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

export interface DMChannel {
  id: string;
  workspace_id: string;
  user_one_id: string;
  user_two_id: string;
  created_at: string;
  updated_at: string;
  user_one?: UserData;
  user_two?: UserData;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user?: UserData;
}
