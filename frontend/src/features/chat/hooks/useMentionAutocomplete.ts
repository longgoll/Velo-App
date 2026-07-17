import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useChatStore } from '@/store/useChatStore';
import api from '@/lib/api';
import type { WorkspaceMember, Channel, DMChannel } from '@/types';

export interface SuggestionItem {
  type: 'special' | 'user';
  id: string;
  label: string;
  email?: string;
  description?: string;
  isOnline?: boolean;
  inChannel?: boolean;
}

interface UseMentionAutocompleteProps {
  activeWorkspaceId: string | null;
  channelId: string | null;
  currentUser: any;
  text: string;
  setText: (val: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function useMentionAutocomplete({
  activeWorkspaceId,
  channelId,
  currentUser,
  text,
  setText,
  inputRef,
}: UseMentionAutocompleteProps) {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const { presenceUsers } = useChatStore();

  // Fetch workspace members
  const { data: members = [] } = useQuery<WorkspaceMember[]>({
    queryKey: ['workspace-members', activeWorkspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${activeWorkspaceId}/members`);
      return res.data;
    },
    enabled: !!activeWorkspaceId,
  });

  // Fetch channels list
  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ['channels', activeWorkspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${activeWorkspaceId}/channels`);
      return res.data;
    },
    enabled: !!activeWorkspaceId,
  });

  // Fetch active DM channels
  const { data: dmChannels = [] } = useQuery<DMChannel[]>({
    queryKey: ['dms', activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) return [];
      const res = await api.get(`/workspaces/${activeWorkspaceId}/dms`);
      return res.data;
    },
    enabled: !!activeWorkspaceId,
  });

  const activeChannel = channels.find((c) => c.id === channelId);
  const activeDmChannel = dmChannels.find((d) => d.id === channelId);

  // Fetch private channel members
  const { data: channelMembers = [] } = useQuery<any[]>({
    queryKey: ['channel-members', channelId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${activeWorkspaceId}/channels/${channelId}/members`);
      return res.data;
    },
    enabled: !!activeWorkspaceId && !!channelId && !!activeChannel?.is_private,
  });

  const isMemberInActiveChannel = (userId: string) => {
    if (!channelId) return true;
    if (activeDmChannel) {
      return userId === activeDmChannel.user_one_id || userId === activeDmChannel.user_two_id;
    }
    if (activeChannel?.is_private) {
      return channelMembers.some((cm) => cm.user_id === userId);
    }
    return true;
  };

  const checkMention = (val: string, cursorOffset: number) => {
    const textBeforeCursor = val.substring(0, cursorOffset);
    const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_\u00C0-\u1EF9]*)$/);
    if (match) {
      const query = match[1];
      const startIndex = textBeforeCursor.length - match[0].trimStart().length;
      return { query, startIndex };
    }
    return null;
  };

  const updateMentionStatus = (val: string, cursorOffset: number | null) => {
    if (cursorOffset === null) {
      setMentionQuery(null);
      return;
    }
    const check = checkMention(val, cursorOffset);
    if (check) {
      setMentionQuery(check.query);
      setMentionStartIndex(check.startIndex);
    } else {
      setMentionQuery(null);
    }
  };

  const handleSelectSuggestion = (item: SuggestionItem) => {
    if (mentionQuery === null) return;
    const cursor = inputRef.current?.selectionStart ?? text.length;
    const beforeMention = text.substring(0, mentionStartIndex);
    const afterMention = text.substring(cursor);
    const mentionText = `@${item.label} `;
    const newText = beforeMention + mentionText + afterMention;
    setText(newText);
    setMentionQuery(null);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newCursorPos = mentionStartIndex + mentionText.length;
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mentionQuery !== null && filteredSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredSuggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelectSuggestion(filteredSuggestions[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
      }
    }
  };

  // Build suggestions list
  const filteredSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];

    const allSuggestions: SuggestionItem[] = [];
    if (!activeDmChannel) {
      allSuggestions.push({
        type: 'special',
        id: 'here',
        label: 'here',
        description: 'Notify every online member in this channel.',
      });
      allSuggestions.push({
        type: 'special',
        id: 'channel',
        label: 'channel',
        description: 'Notify everyone in this channel.',
      });
    }

    members.forEach((m) => {
      if (m.user && m.user.id !== currentUser?.id) {
        const status = presenceUsers[m.user.username];
        const isOnline = status === 'online' || status === 'idle' || status === 'dnd';
        allSuggestions.push({
          type: 'user',
          id: m.user.id,
          label: m.user.username,
          email: m.user.email,
          isOnline,
          inChannel: isMemberInActiveChannel(m.user.id),
        });
      }
    });

    const query = mentionQuery.toLowerCase();
    return allSuggestions
      .filter((item) => {
        if (item.type === 'special') {
          return item.label.toLowerCase().includes(query) || (item.description && item.description.toLowerCase().includes(query));
        }
        return (
          item.label.toLowerCase().includes(query) ||
          (item.email && item.email.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => {
        const aPrefix = a.label.toLowerCase().startsWith(query);
        const bPrefix = b.label.toLowerCase().startsWith(query);
        if (aPrefix && !bPrefix) return -1;
        if (!aPrefix && bPrefix) return 1;

        const aInChannel = a.inChannel !== false;
        const bInChannel = b.inChannel !== false;
        if (aInChannel && !bInChannel) return -1;
        if (!aInChannel && bInChannel) return 1;

        const aOnline = a.isOnline || a.type === 'special';
        const bOnline = b.isOnline || b.type === 'special';
        if (aOnline && !bOnline) return -1;
        if (!aOnline && bOnline) return 1;

        return a.label.localeCompare(b.label);
      });
  }, [mentionQuery, members, currentUser, activeDmChannel, presenceUsers, channelMembers]);

  return {
    mentionQuery,
    selectedIndex,
    setSelectedIndex,
    filteredSuggestions,
    handleSelectSuggestion,
    handleKeyDown,
    updateMentionStatus,
    setMentionQuery,
  };
}
