import { useEffect, useState } from 'react';
import { useVoiceCall } from '@/context/VoiceCallContext';
import { toast } from '@/store/useToastStore';

export function useAudioDevices() {
  const { room, isConnected } = useVoiceCall();
  const [micDropdownOpen, setMicDropdownOpen] = useState(false);
  const [speakerDropdownOpen, setSpeakerDropdownOpen] = useState(false);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>('');
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string>('');

  useEffect(() => {
    const updateDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter((d) => d.kind === 'audioinput');
        const outputs = devices.filter((d) => d.kind === 'audiooutput');
        setAudioInputs(inputs);
        setAudioOutputs(outputs);

        // Auto-select first active device if none selected
        if (inputs.length > 0 && !selectedMicId) {
          setSelectedMicId(inputs[0].deviceId);
        }
        if (outputs.length > 0 && !selectedSpeakerId) {
          setSelectedSpeakerId(outputs[0].deviceId);
        }
      } catch (err) {
        console.warn('Failed to enumerate devices:', err);
      }
    };

    updateDevices();
    navigator.mediaDevices?.addEventListener('devicechange', updateDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', updateDevices);
    };
  }, [isConnected, selectedMicId, selectedSpeakerId]);

  const switchMicrophone = (deviceId: string, deviceLabel: string) => {
    if (room) {
      room.switchActiveDevice('audioinput', deviceId);
    }
    setSelectedMicId(deviceId);
    setMicDropdownOpen(false);
    toast.success(`Đã chuyển microphone sang: ${deviceLabel || 'Mặc định'}`);
  };

  const switchSpeaker = (deviceId: string, deviceLabel: string) => {
    if (room) {
      room.switchActiveDevice('audiooutput', deviceId);
    }
    setSelectedSpeakerId(deviceId);
    setSpeakerDropdownOpen(false);
    toast.success(`Đã chuyển loa/tai nghe sang: ${deviceLabel || 'Mặc định'}`);
  };

  return {
    micDropdownOpen,
    setMicDropdownOpen,
    speakerDropdownOpen,
    setSpeakerDropdownOpen,
    audioInputs,
    audioOutputs,
    selectedMicId,
    setSelectedMicId,
    selectedSpeakerId,
    setSelectedSpeakerId,
    switchMicrophone,
    switchSpeaker,
  };
}
