import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useLiveKit } from '@/hooks/useLiveKit';
import type { VoiceParticipant } from '@/hooks/useLiveKit';
import { useChatStore } from '@/store/useChatStore';
import api from '@/lib/api';
import { Room } from 'livekit-client';

interface VoiceCallContextType {
  isConnected: boolean;
  isConnecting: boolean;
  participants: VoiceParticipant[];
  error: string | null;
  toggleMicrophone: (enabled?: boolean) => Promise<void>;
  toggleCamera: (enabled?: boolean) => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  disconnectCall: () => void;
  room: Room | null;
}

const VoiceCallContext = createContext<VoiceCallContextType | undefined>(undefined);

export function VoiceCallProvider({ children }: { children: React.ReactNode }) {
  const {
    activeWorkspaceId,
    activeVoiceChannelId,
    voiceMuted,
    voiceDeafened,
    setActiveVoiceChannelId,
    setVoiceMuted,
  } = useChatStore();

  const {
    isConnected,
    isConnecting,
    participants,
    error,
    connect,
    disconnect,
    toggleMicrophone,
    toggleCamera,
    toggleScreenShare,
    room,
  } = useLiveKit();

  const lastChannelIdRef = useRef<string | null>(null);

  // Connect / Disconnect based on activeVoiceChannelId
  useEffect(() => {
    if (activeVoiceChannelId === lastChannelIdRef.current) return;

    if (activeVoiceChannelId && activeWorkspaceId) {
      const joinVoice = async () => {
        try {
          // Fetch token from Go Backend
          const res = await api.post(`/workspaces/${activeWorkspaceId}/channels/${activeVoiceChannelId}/token`);
          const { token, url } = res.data;
          
          // Connect using fetched credentials
          // LiveKit JS SDK connects to ws/wss, so convert http if needed
          const wsUrl = url.replace(/^http/, 'ws');
          await connect(wsUrl, token);
          
          // Sync state to local audio publish
          if (room) {
            await room.localParticipant.setMicrophoneEnabled(!voiceMuted);
          }
        } catch (err) {
          console.error('Failed to join voice channel room:', err);
          setActiveVoiceChannelId(null);
        }
      };

      joinVoice();
    } else {
      disconnect();
    }

    lastChannelIdRef.current = activeVoiceChannelId;
  }, [activeVoiceChannelId, activeWorkspaceId, connect, disconnect, setActiveVoiceChannelId, room, voiceMuted]);

  // Sync mute state when voiceMuted changes
  useEffect(() => {
    if (room && isConnected) {
      room.localParticipant.setMicrophoneEnabled(!voiceMuted);
    }
  }, [voiceMuted, room, isConnected]);

  // Handle local disconnect trigger
  const disconnectCall = () => {
    setActiveVoiceChannelId(null);
  };

  return (
    <VoiceCallContext.Provider
      value={{
        isConnected,
        isConnecting,
        participants,
        error,
        toggleMicrophone,
        toggleCamera,
        toggleScreenShare,
        disconnectCall,
        room,
      }}
    >
      {children}
    </VoiceCallContext.Provider>
  );
}

export function useVoiceCall() {
  const context = useContext(VoiceCallContext);
  if (context === undefined) {
    throw new Error('useVoiceCall must be used within a VoiceCallProvider');
  }
  return context;
}
