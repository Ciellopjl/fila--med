'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { pusherClient } from '@/lib/pusher-client';
import { api } from '@/lib/api';
import { Volume2, History, Monitor, Clock, Sparkles, ChevronRight, Speaker } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

interface Call {
  id: string;
  room: string;
  calledAt: string;
  patient: {
    name: string;
    priority: string;
    specialty?: string;
  };
}

export default function TVPage() {
  const [lastCall, setLastCall] = useState<Call | null>(null);
  const [history, setHistory] = useState<Call[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showFlash, setShowFlash] = useState(false);

  // Refs to avoid stale closures in callbacks
  const voiceQueue = useRef<{ name: string; room: string; specialty?: string }[]>([]);
  const isSpeakingRef = useRef(false);
  const isActiveRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

  // Flash on new call
  useEffect(() => {
    if (lastCall) {
      setShowFlash(true);
      const t = setTimeout(() => setShowFlash(false), 2000);
      return () => clearTimeout(t);
    }
  }, [lastCall?.id]);

  // Load persistence
  useEffect(() => {
    if (localStorage.getItem('filamed_tv_active') === 'true') {
      setIsActive(true);
      isActiveRef.current = true;
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.get('/calls/recent');
      const data = res.data;
      if (data.length > 0) {
        setLastCall(data[0]);
        setHistory(data.slice(1, 7));
      }
    } catch (e) {
      console.error('Error fetching history:', e);
    }
  }, []);

  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(554.37, now + 0.2);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.4);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.6);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
      osc.start(now);
      osc.stop(now + 1.5);
    } catch (e) {
      console.error('Chime error:', e);
    }
  };

  // Core speak function - robust with fallback voices
  const speak = (text: string, onDone: () => void) => {
    try {
      const utterance = new SpeechSynthesisUtterance(text);

      // Voice selection: pt-BR > pt > any
      const allVoices = window.speechSynthesis.getVoices();
      const ptBR = allVoices.find(v => v.lang === 'pt-BR');
      const ptAny = allVoices.find(v => v.lang.startsWith('pt'));
      const chosen = ptBR || ptAny || allVoices[0] || null;

      if (chosen) utterance.voice = chosen;
      utterance.lang = 'pt-BR';
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onend = () => onDone();
      utterance.onerror = (e) => {
        // Log only unexpected errors (not normal interruptions)
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.warn('Speech error:', e.error);
        }
        onDone(); // Always call onDone to keep the queue moving
      };

      // Chrome bug: resume if speech stalls
      const keepAlive = setInterval(() => {
        if (!window.speechSynthesis.speaking) clearInterval(keepAlive);
        else window.speechSynthesis.resume();
      }, 5000);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('Speak error:', e);
      onDone();
    }
  };

  // Process queue using refs (no stale closures)
  const processQueue = useCallback(() => {
    if (isSpeakingRef.current || voiceQueue.current.length === 0 || !isActiveRef.current) return;

    const next = voiceQueue.current.shift();
    if (!next) return;

    isSpeakingRef.current = true;
    setIsSpeaking(true);

    // Safety timeout: if speech gets stuck for >15s, force reset
    const safetyTimer = setTimeout(() => {
      if (isSpeakingRef.current) {
        console.warn('Speech timed out — resetting queue state');
        window.speechSynthesis.cancel();
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        processQueue();
      }
    }, 15000);

    playChime();

    setTimeout(() => {
      const setorText = next.specialty ? `, do setor ${next.specialty},` : '';
      const text = `Atenção. Paciente ${next.name}${setorText} favor dirigir-se ao ${next.room}.`;

      speak(text, () => {
        clearTimeout(safetyTimer);
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        setTimeout(processQueue, 800);
      });
    }, 1800);
  }, []); // No deps — uses refs internally

  const handleCall = useCallback((data: { patientName: string; room: string; priority: string; specialty?: string }) => {
    if (!isActiveRef.current) return;
    voiceQueue.current.push({ name: data.patientName, room: data.room, specialty: data.specialty });
    fetchHistory();
    processQueue();
  }, [fetchHistory, processQueue]);

  // Wait for voices to load then process any pending queue
  useEffect(() => {
    const onVoicesChanged = () => processQueue();
    window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
  }, [processQueue]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchHistory();

    if (!pusherClient) return;

    const channel = pusherClient.subscribe('filamed-channel');
    channel.bind('patient_called', handleCall);

    return () => {
      clearInterval(timer);
      channel.unbind('patient_called', handleCall);
      pusherClient?.unsubscribe('filamed-channel');
    };
  }, [handleCall, fetchHistory]);

  if (!isActive) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-emerald-500/5 blur-[120px] rounded-full scale-150" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 space-y-10"
        >
          <div className="w-32 h-32 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto shadow-2xl border-4 border-emerald-500/20">
             <Image src="/logo.png" alt="Logo" width={80} height={80} className="object-contain rounded-3xl" />
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl font-black text-white tracking-tighter leading-none italic uppercase">
              Painel de <span className="text-emerald-500">Chamadas</span>
            </h1>
            <p className="text-slate-500 max-w-sm mx-auto font-medium">
              Clique no botão para ativar as notificações sonoras e o sistema de voz automatizado da sala de espera.
            </p>
          </div>
          <button
            onClick={() => {
              setIsActive(true);
              isActiveRef.current = true;
              localStorage.setItem('filamed_tv_active', 'true');
              playChime();
              // Test voice announcement on activation
              setTimeout(() => {
                speak('FilaMed ativo. Sistema de chamadas iniciado com sucesso.', () => {});
              }, 1800);
            }}
            className="group relative px-12 py-6 bg-emerald-600 hover:bg-emerald-700 text-white text-2xl font-black rounded-[2rem] shadow-2xl shadow-emerald-500/40 transition-all active:scale-95 flex items-center gap-4 mx-auto uppercase italic tracking-tighter"
          >
            <Monitor size={32} />
            Iniciar Transmissão
            <ChevronRight className="group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col overflow-hidden font-sans select-none">
      {/* Flash Effect Overlay */}
      <AnimatePresence>
        {showFlash && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white pointer-events-none mix-blend-overlay"
          />
        )}
      </AnimatePresence>
      
      {/* Upper Bar - Info & Logo */}
      <header className="p-4 md:p-8 flex items-center justify-between bg-slate-900/30 backdrop-blur-3xl border-b border-white/5 relative z-20">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="bg-slate-950 p-2 rounded-2xl shadow-xl shadow-white/5 shrink-0">
             <Image src="/logo.png" alt="Logo" width={40} height={40} className="object-contain md:w-[50px] md:h-[50px] rounded-xl" />
          </div>
          <div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tighter uppercase italic leading-none">FilaMed</h2>
            <div className="flex items-center gap-2 mt-1">
               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
               <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-slate-500">Broadcasting</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          {/* Test voice button - always visible to unlock browser audio */}
          <button
            onClick={() => {
              playChime();
              setTimeout(() => {
                speak('Sistema de voz ativo e funcionando.', () => {});
              }, 1800);
            }}
            title="Testar voz"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/60 border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all text-slate-400 hover:text-emerald-400 text-xs font-black uppercase tracking-wider"
          >
            <Volume2 size={16} />
            <span className="hidden md:inline">Testar Voz</span>
          </button>

          {isSpeaking && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 bg-emerald-600/20 px-4 py-2 rounded-full border border-emerald-500/30"
            >
              <div className="flex gap-1 items-end h-4">
                 {[1, 2, 3].map(i => (
                   <motion.div 
                    key={i}
                    animate={{ height: [8, 16, 8] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.2 }}
                    className="w-1 bg-emerald-500 rounded-full" 
                   />
                 ))}
              </div>
              <span className="text-[10px] font-black uppercase text-emerald-400 tracking-tighter italic">Anunciando...</span>
            </motion.div>
          )}

          <div className="text-right">
             <div className="flex items-center gap-2 justify-end text-emerald-400 mb-1">
               <Clock size={14} className="md:w-4 md:h-4" />
               <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest leading-none">Local</span>
             </div>
             <p className="text-2xl md:text-5xl font-black tracking-tighter font-mono leading-none">
               {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
               <span className="text-sm md:text-2xl opacity-30 ml-1 md:ml-2">{currentTime.toLocaleTimeString('pt-BR', { second: '2-digit' })}</span>
             </p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col xl:flex-row p-4 md:p-10 gap-6 md:gap-10 h-full overflow-hidden relative">
        
        {/* Main Calling Area */}
        <section className="flex-[1.5] min-h-[40vh] md:min-h-0 flex flex-col justify-center items-center bg-gradient-to-br from-slate-900/50 to-transparent rounded-[2.5rem] md:rounded-[5rem] border-4 border-emerald-500/20 shadow-[0_0_100px_rgba(79,70,229,0.1)] relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none" />
          
          <AnimatePresence mode="wait">
            {lastCall ? (
              <motion.div 
                key={lastCall.id}
                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.1, y: -50 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                className="relative z-10 text-center space-y-8 md:space-y-16 py-6 md:py-10 w-full"
              >
                <div className="space-y-6 md:space-y-12">
                  <motion.div 
                    initial={{ opacity: 0, letterSpacing: "1em" }}
                    animate={{ opacity: 1, letterSpacing: "0.2em" }}
                    className="text-emerald-400 text-sm md:text-2xl font-black uppercase tracking-[0.2em] md:tracking-[0.4em] drop-shadow-lg"
                  >
                    Chamando Agora
                  </motion.div>
                  <h1 className="text-4xl md:text-[6rem] lg:text-[9rem] xl:text-[11rem] font-black tracking-tight leading-[0.85] px-4 md:px-10 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] break-words max-w-[90vw] mx-auto">
                    {lastCall.patient.name}
                  </h1>
                </div>
                
                <div className="flex flex-col items-center gap-10 md:gap-20">
                   <div className="relative group px-4 md:px-12 xl:px-24 w-full max-w-5xl mx-auto">
                      <div className="absolute inset-0 bg-white blur-3xl opacity-10 group-hover:opacity-20 transition-opacity" />
                      <div className="relative flex flex-col items-center justify-center bg-white text-slate-950 px-6 py-12 md:px-16 md:py-20 rounded-[2.5rem] md:rounded-[5rem] shadow-[0_60px_150px_rgba(0,0,0,0.5)] border-b-8 md:border-b-[12px] border-slate-200 w-full max-w-4xl mx-auto overflow-hidden min-h-[300px] md:min-h-[500px]">
                        
                        {/* Robust Center Stack */}
                        <div className="flex flex-col items-center gap-6 md:gap-10 w-full text-center">
                          
                          {/* Animated Indicator */}
                          <motion.div 
                            animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
                            transition={{ repeat: Infinity, duration: 3 }}
                            className="w-12 h-12 md:w-20 md:h-20 bg-emerald-50 text-emerald-600 rounded-2xl md:rounded-3xl flex items-center justify-center"
                          >
                            <Volume2 size={32} className="md:w-10 md:h-10" />
                          </motion.div>

                          {/* Refined Guidance Tag */}
                          <div className="bg-slate-100 px-5 py-2 md:px-8 md:py-3 rounded-full">
                            <span className="text-[9px] md:text-sm lg:text-lg font-black uppercase text-slate-500 tracking-[0.3em] leading-none mb-0">Local de Atendimento</span>
                          </div>

                          {/* Responsive Room Identifier */}
                          <div className="w-full px-2">
                            <h2 className="text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tighter leading-tight text-slate-900 uppercase italic break-words">
                              {lastCall.room}
                            </h2>
                          </div>
                        </div>
                      </div>
                   </div>

                  {lastCall.patient.priority === 'PRIORITY' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="inline-flex items-center gap-2 md:gap-4 px-6 md:px-10 py-3 md:py-5 bg-amber-500 text-amber-950 rounded-[1.5rem] md:rounded-[2rem] text-xl md:text-4xl font-black shadow-2xl ring-4 md:ring-8 ring-amber-500/20 italic"
                    >
                      <Sparkles className="md:w-8 md:h-8" />
                      ATENDIMENTO PRIORITÁRIO
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="text-slate-800 text-3xl md:text-5xl font-black uppercase italic tracking-tighter animate-pulse flex items-center gap-4 md:gap-6">
                <Speaker size={48} className="md:w-64 md:h-64 opacity-20" />
                Aguardando...
              </div>
            )}
          </AnimatePresence>
        </section>

        {/* Sidebar History */}
        <aside className="w-full xl:w-[450px] flex flex-col gap-6 md:gap-10">
          <div className="bg-slate-900/40 rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-12 border-2 border-white/5 shadow-2xl flex-1 flex flex-col overflow-hidden">
            <header className="flex items-center justify-between mb-6 md:mb-10">
               <h3 className="text-xl md:text-3xl font-black flex items-center gap-3 md:gap-4 text-slate-400 italic uppercase tracking-tighter">
                <History className="text-emerald-500 w-6 h-6 md:w-8 md:h-8" strokeWidth={3} />
                Histórico
              </h3>
              <span className="text-[8px] md:text-[10px] font-black text-slate-600 border border-slate-800 px-3 py-1 rounded-full">{history.length} REGISTROS</span>
            </header>
            
            <div className="space-y-4 md:space-y-6 flex-1 pr-2 overflow-y-auto custom-scrollbar">
              <AnimatePresence initial={false}>
                {history.map((call, idx) => (
                  <motion.div 
                    layout
                    key={call.id}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-slate-900/80 p-4 md:p-8 rounded-[1.5rem] md:rounded-[3rem] border border-white/5 flex items-center justify-between group hover:bg-emerald-600 transition-all duration-300 shadow-lg"
                  >
                    <div className="flex flex-col gap-0 md:gap-1 overflow-hidden">
                      <span className="text-lg md:text-3xl font-black truncate max-w-[180px] md:max-w-[280px] tracking-tight leading-none group-hover:text-white uppercase italic">{call.patient.name}</span>
                      <span className="text-[10px] md:text-sm text-emerald-500 font-black uppercase tracking-[0.1em] md:tracking-[0.2em] group-hover:text-white/60">{call.room}</span>
                    </div>
                    <div className={`w-8 h-8 md:w-12 md:h-12 flex items-center justify-center rounded-xl md:rounded-2xl border-2 transition-colors shrink-0 ${
                      call.patient.priority === 'PRIORITY' ? 'border-amber-500 text-amber-500 group-hover:border-white group-hover:text-white bg-amber-500/10' : 'border-slate-800 text-slate-600 group-hover:border-white/20 group-hover:text-white'
                    }`}>
                      <ChevronRight size={16} className="md:w-6 md:h-6" strokeWidth={3} />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </aside>
      </main>

      {/* News Ticker Footer */}
      <footer className="h-16 md:h-24 bg-emerald-600 text-white flex items-center overflow-hidden border-t-4 md:border-t-8 border-emerald-700 relative z-30">
        <div className="flex h-full items-center px-6 md:px-12 bg-white text-emerald-700 font-black italic tracking-tighter text-xl md:text-3xl skew-x-[-15deg] origin-left -ml-4 z-40 shadow-2xl pr-8 md:pr-16 border-r-4 md:border-r-8 border-emerald-500">
           FILAMED NEWS
        </div>
        
        <div className="flex-1 whitespace-nowrap animate-marquee flex items-center gap-12 md:gap-24 text-xl md:text-3xl font-black uppercase italic tracking-widest pl-6 md:pl-10">
          <span>Bem-vindo à FilaMed &bull; Acompanhe aqui os chamados em tempo real</span>
          <span className="opacity-50">Tenha em mãos seu documento de identidade</span>
          <span>Prioridade garantida para idosos, gestantes e pessoas com deficiência</span>
          <span className="opacity-50 text-emerald-300 uppercase italic">Siga as instruções nas placas de sinalização interna</span>
          <span>Agilidade e segurança no seu atendimento clínico &bull; 24h por dia</span>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 0px;
        }
      ` }} />
    </div>
  );
}
