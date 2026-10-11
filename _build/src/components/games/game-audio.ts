import { useCallback, useEffect, useRef } from 'react';
export type GameSound = 'chip' | 'shake' | 'win' | 'stone' | 'hop' | 'kick' | 'reveal';
export function useGameAudio(enabled: boolean, music=false, volume=.5) {
  const ref = useRef<AudioContext | null>(null);
  const master = useRef<GainNode | null>(null);
  const musicBus = useRef<GainNode | null>(null);
  const settings = useRef({enabled,music,volume});
  const loop = useRef<ReturnType<typeof setInterval>|null>(null);
  useEffect(() => {
    settings.current={enabled,music,volume};
    if(master.current&&ref.current)master.current.gain.setTargetAtTime(enabled?volume:0,ref.current.currentTime,.04);
    if(musicBus.current&&ref.current)musicBus.current.gain.setTargetAtTime(enabled&&music ? .24 : 0,ref.current.currentTime,.1);
  },[enabled,music,volume]);
  useEffect(() => () => {if(loop.current)clearInterval(loop.current);},[]);
  useEffect(() => () => { if (ref.current) void ref.current.close(); }, []);
  return useCallback((kind: GameSound) => {
    if (!settings.current.enabled) return;
    try {
      const ctx = ref.current ?? new AudioContext();
      if(!ref.current) {
        ref.current=ctx;
        const output=ctx.createGain();output.gain.value=settings.current.volume;output.connect(ctx.destination);master.current=output;
        const bus=ctx.createGain();bus.gain.value=settings.current.music ? .24 : 0;bus.connect(output);musicBus.current=bus;
        // Original pentatonic plucked melody with a soft drum and bass accompaniment.
        const melody=[0,2,4,7,9,7,4,2,0,4,7,12,9,7,4,2,2,4,7,9,12,9,7,4,0,2,4,7,4,2,0,-1];
        let beat=0;
        loop.current=setInterval(()=>{
          if(!settings.current.enabled||!settings.current.music||ctx.state!=='running')return;
          const note=melody[beat%melody.length]??0,t=ctx.currentTime;
          if(note>=0){const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='triangle';osc.frequency.value=440*2**((note-9)/12);gain.gain.setValueAtTime(.15,t);gain.gain.exponentialRampToValueAtTime(.001,t+.48);osc.connect(gain);gain.connect(bus);osc.start(t);osc.stop(t+.5);}
          if(beat%4===0){const bass=ctx.createOscillator(),g=ctx.createGain();bass.frequency.value=beat%8===0?130.81:196;g.gain.setValueAtTime(.14,t);g.gain.exponentialRampToValueAtTime(.001,t+.7);bass.connect(g);g.connect(bus);bass.start(t);bass.stop(t+.72);}
          beat++;
        },280);
      }
      void ctx.resume();
      const output=master.current;if(!output)return;
      if(kind==='shake'||kind==='kick') {
        const duration=kind==='shake'?1.3:.16,buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);
        for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/(ctx.sampleRate*(kind==='shake'?.8:.06)))*(kind==='kick'?1:Math.abs(Math.sin(i/ctx.sampleRate*45)));
        const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();filter.type='bandpass';filter.frequency.value=kind==='shake'?1800:800;gain.gain.value=.35;source.buffer=buffer;source.connect(filter);filter.connect(gain);gain.connect(output);source.start();
      }
      const notes = kind === 'win' ? [523,659,784,1047,784,1047] : kind === 'shake' ? [190,240,180,280,210,170,250] : kind === 'reveal' ? [392,523,784] : [kind === 'chip' ? 880 : kind==='hop'?740:kind==='kick'?180:620];
      notes.forEach((frequency, i) => {
        const osc=ctx.createOscillator(), gain=ctx.createGain(), t=ctx.currentTime+i*.09;
        osc.type=kind==='shake'?'triangle':'sine'; osc.frequency.value=frequency;
        if(kind==='hop')osc.frequency.exponentialRampToValueAtTime(frequency*1.6,t+.12);
        gain.gain.setValueAtTime(.10,t); gain.gain.exponentialRampToValueAtTime(.001,t+.22);
        osc.connect(gain); gain.connect(output); osc.start(t); osc.stop(t+.24);
      });
    } catch { /* Muted or unsupported devices still play normally. */ }
  }, []);
}