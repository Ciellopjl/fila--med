'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { api } from '@/lib/api';
import { pusherClient } from '@/lib/pusher-client';
import { Clock, User, CheckCircle2, AlertCircle, MapPin, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface PatientStatus {
  id: string;
  name: string;
  status: 'WAITING' | 'CALLED' | 'DONE';
  priority: 'NORMAL' | 'PRIORITY';
  specialty?: string;
  position: number;
}

export default function PatientStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<PatientStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get(`/patients/${id}/status`);
      setData(res.data);
      setError(false);
    } catch (err) {
      console.error('Error fetching status:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStatus();

    const channel = pusherClient.subscribe('filamed-channel');
    channel.bind('queue_updated', fetchStatus);
    channel.bind('patient_called', () => {
        fetchStatus();
    });

    return () => {
      channel.unbind('queue_updated', fetchStatus);
      channel.unbind('patient_called');
      pusherClient.unsubscribe('filamed-channel');
    };
  }, [fetchStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center">
          <AlertCircle size={40} />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Paciente não encontrado</h1>
        <p className="text-slate-500 max-w-xs">Verifique se o link está correto ou se o registro ainda é válido.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex flex-col items-center justify-center font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-4">
           <div className="bg-slate-900 inline-block p-3 rounded-2xl shadow-xl">
             <Image src="/logo.png" alt="FilaMed" width={40} height={40} />
           </div>
           <h2 className="text-sm font-black uppercase tracking-widest text-emerald-600">Acompanhamento em Tempo Real</h2>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-2xl shadow-emerald-500/5 space-y-8">
           <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
                <User size={32} />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{data.name}</h1>
                <div className="flex items-center gap-2">
                   <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${data.priority === 'PRIORITY' ? 'bg-amber-500/10 text-amber-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      {data.priority === 'PRIORITY' ? 'Prioritário' : 'Normal'}
                   </span>
                   {data.specialty && (
                     <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600">
                        {data.specialty}
                     </span>
                   )}
                </div>
              </div>
           </div>

           <div className="h-px bg-slate-100 dark:bg-slate-800" />

           <div className="space-y-6 text-center py-4">
              <AnimatePresence mode="wait">
                {data.status === 'WAITING' ? (
                  <motion.div 
                    key="waiting"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Sua posição na fila</p>
                    <div className="text-8xl font-black text-emerald-600 tracking-tighter tabular-nums">
                       {data.position}º
                    </div>
                    <div className="flex items-center justify-center gap-2 text-slate-400 text-sm font-medium italic">
                       <Clock size={16} />
                       Aguarde ser chamado no painel
                    </div>
                  </motion.div>
                ) : data.status === 'CALLED' ? (
                  <motion.div 
                    key="called"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6 bg-emerald-500 text-white p-8 rounded-3xl shadow-xl shadow-emerald-500/30"
                  >
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto animate-bounce">
                       <Activity size={40} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-3xl font-black tracking-tight leading-none italic uppercase">Você foi Chamado!</h3>
                      <p className="font-bold text-white/80">Dirija-se ao local de atendimento agora.</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="done"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4 py-10"
                  >
                    <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                       <CheckCircle2 size={48} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Atendimento Concluído</h3>
                    <p className="text-slate-500 font-medium italic">A FilaMed deseja uma ótima recuperação!</p>
                  </motion.div>
                )}
              </AnimatePresence>
           </div>
        </div>

        <div className="flex items-center justify-center gap-3 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
           <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
           Live Status Sincronizado
        </div>
      </motion.div>
    </div>
  );
}
