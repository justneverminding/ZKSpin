"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { SlidersHorizontal, Volume2, VolumeX } from "lucide-react";
import { CasinoAudio, DEFAULT_SOUND, parseSoundPreferences, SOUND_STORAGE_KEY, type CasinoCue, type SoundPreferences } from "../lib/casinoAudio";
import styles from "./CasinoSound.module.css";

const SoundContext = createContext<{ play: (cue: CasinoCue) => () => void }>({ play: () => () => {} });
export const useCasinoSound = () => useContext(SoundContext);

export default function CasinoSound({ children }: { children: React.ReactNode }) {
  const engine = useRef<CasinoAudio | null>(null);
  const preferences = useRef<SoundPreferences>({ ...DEFAULT_SOUND });
  const [settings, setSettings] = useState<SoundPreferences>({ ...DEFAULT_SOUND });
  const [playing, setPlaying] = useState(false);
  const [available, setAvailable] = useState(true);
  const [open, setOpen] = useState(false);
  const controls = useRef<HTMLDivElement>(null);
  const settingsButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const audio = new CasinoAudio();
    engine.current = audio;
    let mounted = true;
    let saved = { ...DEFAULT_SOUND };
    try { saved = parseSoundPreferences(localStorage.getItem(SOUND_STORAGE_KEY)); } catch { /* Private browsing may block storage. */ }
    preferences.current = saved;
    audio.setPreferences(saved);
    // Restore external browser preferences before attempting autoplay.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(saved);
    setAvailable(typeof window.AudioContext !== "undefined");

    const start = () => {
      if (preferences.current.enabled && !document.hidden) {
        void audio.start().then(active => { if (mounted) setPlaying(active); });
      }
    };
    // Browsers that block autoplay leave this pending until a user gesture.
    start();

    const unlock = (event: Event) => {
      if (event.target instanceof Element && event.target.closest("[data-casino-sound]")) return;
      if (event instanceof KeyboardEvent && !["Enter", " "].includes(event.key)) return;
      start();
    };
    const visibility = () => {
      if (document.hidden) { audio.pause(); setPlaying(false); }
      else start();
    };
    document.addEventListener("click", unlock, true);
    document.addEventListener("keydown", unlock, true);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      mounted = false;
      document.removeEventListener("click", unlock, true);
      document.removeEventListener("keydown", unlock, true);
      document.removeEventListener("visibilitychange", visibility);
      audio.dispose();
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !controls.current?.contains(event.target)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); settingsButton.current?.focus(); }
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", escape); };
  }, [open]);

  const play = useCallback((cue: CasinoCue) => engine.current?.play(cue) ?? (() => {}), []);
  const value = useMemo(() => ({ play }), [play]);

  function update(next: SoundPreferences) {
    preferences.current = next;
    setSettings(next);
    engine.current?.setPreferences(next);
    try { localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify(next)); } catch { /* Keep sound usable without persistence. */ }
  }

  function toggle() {
    if (playing) {
      update({ ...preferences.current, enabled: false });
      setPlaying(false);
    } else {
      update({ ...preferences.current, enabled: true });
      void engine.current?.start().then(setPlaying);
    }
  }

  return <SoundContext.Provider value={value}>
    {children}
    <div ref={controls} className={styles.controls} data-casino-sound>
      {open && <section id="casino-sound-settings" className={styles.settings} aria-label="Sound settings">
        <h2>Sound</h2>
        <label htmlFor="casino-music">Lounge music <output>{Math.round(settings.music * 100)}%</output></label>
        <input id="casino-music" type="range" min="0" max="100" step="1" value={Math.round(settings.music * 100)} onChange={event => update({ ...settings, music: Number(event.target.value) / 100 })} />
        <label htmlFor="casino-effects">Wheel &amp; effects <output>{Math.round(settings.effects * 100)}%</output></label>
        <input id="casino-effects" type="range" min="0" max="100" step="1" value={Math.round(settings.effects * 100)} onChange={event => update({ ...settings, effects: Number(event.target.value) / 100 })} />
      </section>}
      <div className={styles.toolbar}>
        <button type="button" disabled={!available} onClick={toggle} aria-label={available ? playing ? "Mute sound" : "Enable sound" : "Audio unavailable"} title={available ? playing ? "Mute sound" : "Enable sound" : "Audio unavailable"} aria-pressed={playing}>
          {playing ? <Volume2 size={19} /> : <VolumeX size={19} />}
        </button>
        <button ref={settingsButton} type="button" disabled={!available} onClick={() => setOpen(current => !current)} aria-label="Sound settings" title="Sound settings" aria-expanded={open} aria-controls="casino-sound-settings"><SlidersHorizontal size={17} /></button>
      </div>
    </div>
  </SoundContext.Provider>;
}
