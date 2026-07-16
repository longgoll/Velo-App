import { useEffect, useRef, useState, useCallback } from 'react';
import { Room, RoomEvent, Participant, RemoteParticipant, LocalParticipant, Track, VideoPresets } from 'livekit-client';

export interface VoiceParticipant {
  identity: string;
  name?: string;
  isLocal: boolean;
  isSpeaking: boolean;
  isAudioMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  videoTrack?: any;
  audioTrack?: any;
  screenShareTrack?: any;
}

export function useLiveKit() {
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roomRef = useRef<Room | null>(null);

  const updateParticipantsList = useCallback(() => {
    const room = roomRef.current;
    if (!room) {
      setParticipants([]);
      return;
    }

    const list: VoiceParticipant[] = [];

    // Local participant
    const lp = room.localParticipant;
    if (lp) {
      const audioPub = lp.getTrackPublication(Track.Source.Microphone);
      const videoPub = lp.getTrackPublication(Track.Source.Camera);
      const screenPub = lp.getTrackPublication(Track.Source.ScreenShare);

      list.push({
        identity: lp.identity,
        name: lp.name || 'Bạn',
        isLocal: true,
        isSpeaking: lp.isSpeaking,
        isAudioMuted: !lp.isMicrophoneEnabled,
        isVideoEnabled: lp.isCameraEnabled,
        isScreenSharing: lp.isScreenShareEnabled,
        videoTrack: videoPub?.videoTrack,
        audioTrack: audioPub?.audioTrack,
        screenShareTrack: screenPub?.videoTrack,
      });
    }

    // Remote participants
    room.remoteParticipants.forEach((rp) => {
      const audioPub = rp.getTrackPublication(Track.Source.Microphone);
      const videoPub = rp.getTrackPublication(Track.Source.Camera);
      const screenPub = rp.getTrackPublication(Track.Source.ScreenShare);

      list.push({
        identity: rp.identity,
        name: rp.name || rp.identity,
        isLocal: false,
        isSpeaking: rp.isSpeaking,
        isAudioMuted: !rp.isMicrophoneEnabled,
        isVideoEnabled: rp.isCameraEnabled,
        isScreenSharing: rp.isScreenShareEnabled,
        videoTrack: videoPub?.videoTrack,
        audioTrack: audioPub?.audioTrack,
        screenShareTrack: screenPub?.videoTrack,
      });
    });

    setParticipants(list);
  }, []);

  const connect = useCallback(async (url: string, token: string) => {
    if (isConnecting || isConnected) return;

    setIsConnecting(true);
    setError(null);

    try {
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          videoSimulcastLayers: [VideoPresets.h360, VideoPresets.h180],
        },
      });

      roomRef.current = room;

      // Register event listeners
      room
        .on(RoomEvent.Connected, () => {
          setIsConnected(true);
          setIsConnecting(false);
          updateParticipantsList();
        })
        .on(RoomEvent.Disconnected, () => {
          setIsConnected(false);
          setIsConnecting(false);
          setParticipants([]);
        })
        .on(RoomEvent.ParticipantConnected, updateParticipantsList)
        .on(RoomEvent.ParticipantDisconnected, updateParticipantsList)
        .on(RoomEvent.TrackSubscribed, updateParticipantsList)
        .on(RoomEvent.TrackUnsubscribed, updateParticipantsList)
        .on(RoomEvent.TrackMuted, updateParticipantsList)
        .on(RoomEvent.TrackUnmuted, updateParticipantsList)
        .on(RoomEvent.LocalTrackPublished, updateParticipantsList)
        .on(RoomEvent.LocalTrackUnpublished, updateParticipantsList)
        .on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
          updateParticipantsList();
        });

      await room.connect(url, token);
      
      // Auto-publish audio on join
      await room.localParticipant.setMicrophoneEnabled(true);
      updateParticipantsList();
    } catch (err: any) {
      console.error('Failed to connect to LiveKit room:', err);
      setError(err.message || 'Unknown connection error');
      setIsConnecting(false);
      setIsConnected(false);
    }
  }, [isConnecting, isConnected, updateParticipantsList]);

  const disconnect = useCallback(() => {
    const room = roomRef.current;
    if (room) {
      room.disconnect();
      roomRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setParticipants([]);
  }, []);

  const toggleMicrophone = useCallback(async (enabled?: boolean) => {
    const room = roomRef.current;
    if (!room) return;
    const nextState = enabled !== undefined ? enabled : !room.localParticipant.isMicrophoneEnabled;
    await room.localParticipant.setMicrophoneEnabled(nextState);
    updateParticipantsList();
  }, [updateParticipantsList]);

  const toggleCamera = useCallback(async (enabled?: boolean) => {
    const room = roomRef.current;
    if (!room) return;
    const nextState = enabled !== undefined ? enabled : !room.localParticipant.isCameraEnabled;
    await room.localParticipant.setCameraEnabled(nextState);
    updateParticipantsList();
  }, [updateParticipantsList]);

  const toggleScreenShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const nextState = !room.localParticipant.isScreenShareEnabled;
    await room.localParticipant.setScreenShareEnabled(nextState);
    updateParticipantsList();
  }, [updateParticipantsList]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    participants,
    error,
    connect,
    disconnect,
    toggleMicrophone,
    toggleCamera,
    toggleScreenShare,
    room: roomRef.current
  };
}
