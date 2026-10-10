/** The Sound tab in the Start menu: music and effects volume, and mute. Settings are saved on this device. */
import { t } from '@/platform';
import { audio } from './engine';
import { useAudioSettings } from './useAudioSettings';

export function SoundSettings() {
  const s = useAudioSettings();
  const slider = (key: 'music' | 'sfx') => (
    <label className="mt-2 block text-sm">
      <span className="flex justify-between font-bold">
        {t(`sound.${key}`)} <span className="tabular-nums">{Math.round(s[key] * 100)}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={s[key]}
        onChange={(e) => {
          audio.unlock();
          audio.update({ [key]: Number(e.target.value) });
          if (key === 'sfx') audio.sfx('blip');
        }}
        className="w-full accent-[#3a4a6b]"
      />
    </label>
  );
  return (
    <div>
      <p className="text-sm">{t('sound.intro')}</p>
      {slider('music')}
      {slider('sfx')}
      <label className="mt-3 flex items-center gap-2 text-sm font-bold">
        <input type="checkbox" checked={s.muted} onChange={(e) => audio.update({ muted: e.target.checked })} className="h-5 w-5 accent-[#3a4a6b]" />
        {t('sound.mute')}
      </label>
      <button
        type="button"
        onClick={() => {
          audio.unlock();
          audio.jingle('badge');
        }}
        className="mt-3 rounded bg-[#3a4a6b] px-3 py-1.5 text-sm font-bold text-white"
      >
        {t('sound.test')}
      </button>
    </div>
  );
}
