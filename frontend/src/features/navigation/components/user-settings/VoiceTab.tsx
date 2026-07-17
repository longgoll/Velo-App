import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

// Custom toggle switch component
const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`w-10 h-6 flex items-center rounded-full p-1 transition-all duration-200 outline-none border-0 cursor-pointer ${
      checked ? 'bg-indigo-600' : 'bg-zinc-800'
    }`}
  >
    <div
      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
        checked ? 'translate-x-4' : 'translate-x-0'
      }`}
    />
  </button>
);

export function VoiceTab() {
  const [inputs, setInputs] = useState<MediaDeviceInfo[]>([]);
  const [outputs, setOutputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedInput, setSelectedInput] = useState('');
  const [selectedOutput, setSelectedOutput] = useState('');
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [noiseSuppression, setNoiseSuppression] = useState(true);

  // Enumerate hardware devices
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        const mics = list.filter(d => d.kind === 'audioinput');
        const speakers = list.filter(d => d.kind === 'audiooutput');
        setInputs(mics);
        setOutputs(speakers);
        if (mics.length > 0 && !selectedInput) setSelectedInput(mics[0].deviceId);
        if (speakers.length > 0 && !selectedOutput) setSelectedOutput(speakers[0].deviceId);
      } catch (err) {
        console.warn('Cannot query media devices:', err);
      }
    };
    fetchDevices();
  }, [selectedInput, selectedOutput]);

  // Simulate Mic volume feedback
  useEffect(() => {
    let intervalId: any;
    if (isTestingMic) {
      intervalId = setInterval(() => {
        // Randomly simulate vocal activity peaks
        setMicVolume(Math.floor(Math.random() * 85) + 15);
      }, 100);
    } else {
      setMicVolume(0);
    }
    return () => clearInterval(intervalId);
  }, [isTestingMic]);

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h3 className="text-xl font-bold text-white">Âm thanh & Video</h3>
        <p className="text-xs text-zinc-400 mt-1">Cấu hình thiết bị ghi âm, phát âm thanh và chất lượng cuộc gọi.</p>
      </div>

      {/* Device Selectors */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5 text-left">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Input Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Thiết bị đầu vào (Microphone)</label>
            <select
              value={selectedInput}
              onChange={(e) => setSelectedInput(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 rounded-lg outline-none focus:border-indigo-500 cursor-pointer"
            >
              {inputs.length > 0 ? (
                inputs.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Default Microphone'}</option>)
              ) : (
                <option value="">Default Microphone Device</option>
              )}
            </select>
          </div>

          {/* Output Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Thiết bị đầu ra (Speaker)</label>
            <select
              value={selectedOutput}
              onChange={(e) => setSelectedOutput(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 rounded-lg outline-none focus:border-indigo-500 cursor-pointer"
            >
              {outputs.length > 0 ? (
                outputs.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Default Speakers'}</option>)
              ) : (
                <option value="">Default Audio Speaker</option>
              )}
            </select>
          </div>
        </div>

        {/* Voice Testing Area */}
        <div className="border-t border-zinc-850 pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 text-left">
              <div className="text-xs font-bold text-zinc-300">Kiểm tra micro của bạn</div>
              <p className="text-[11px] text-zinc-450">Bật tính năng này để kiểm tra xem micro có hoạt động bình thường không.</p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsTestingMic(!isTestingMic)}
              className={`text-xs border-0 ${
                isTestingMic ? 'bg-rose-650 hover:bg-rose-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {isTestingMic ? 'Dừng kiểm tra' : 'Kiểm tra micro'}
            </Button>
          </div>

          {/* Animated Volume bar */}
          <div className="space-y-1 text-left">
            <span className="text-[10px] text-zinc-550 font-bold uppercase">Mức âm lượng đầu vào</span>
            <div className="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden flex">
              <div 
                className="bg-indigo-500 transition-all duration-75 ease-out rounded-full" 
                style={{ width: `${micVolume}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-zinc-600">
              <span>Im lặng</span>
              <span>Hoàn hảo</span>
            </div>
          </div>
        </div>

        {/* Noise Suppression */}
        <div className="border-t border-zinc-850 pt-5 flex items-center justify-between">
          <div className="space-y-0.5 max-w-sm text-left">
            <div className="text-xs font-bold text-zinc-300 flex items-center gap-2">
              Lọc nhiễu thông minh (AI Noise Suppression)
              <span className="text-[9px] font-bold text-indigo-400 bg-indigo-950 border border-indigo-900 px-1.5 py-0.5 rounded">Bản Beta</span>
            </div>
            <p className="text-[11px] text-zinc-455 leading-relaxed">
              Loại bỏ các tiếng ồn xung quanh như tiếng gõ bàn phím, tiếng quạt gió bằng mô hình học máy.
            </p>
          </div>
          <ToggleSwitch checked={noiseSuppression} onChange={setNoiseSuppression} />
        </div>
      </div>
    </div>
  );
}
