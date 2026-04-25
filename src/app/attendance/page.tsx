'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { pusherClient } from '@/lib/pusher-client';
import { 
  Users, 
  Play, 
  CheckCircle, 
  Clock, 
  UserRound,
  DoorOpen,
  LayoutDashboard,
  Search,
  CheckCircle2,
  BellRing
} from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { toast } from 'sonner';

interface Patient {
  id: string;
  name: string;
  priority: 'NORMAL' | 'PRIORITY';
  specialty?: string;
  status: 'WAITING' | 'CALLED' | 'DONE';
  createdAt: string;
}

export default function AttendancePage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [callingPatient, setCallingPatient] = useState<Patient | null>(null);
  const [room, setRoom] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('TODOS');
  const [specialties, setSpecialties] = useState<string[]>(['TODOS']);
  const [rooms, setRooms] = useState<string[]>([]);

  const fetchPatients = useCallback(async () => {
    try {
      const response = await api.get('/patients/waiting');
      setPatients(response.data);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Erro ao carregar fila');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get('/admin/settings');
      if (res.data) {
        setSpecialties(['TODOS', ...res.data.specialties]);
        setRooms(res.data.rooms);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
    fetchSettings();
    
    const channel = pusherClient.subscribe('filamed-channel');
    channel.bind('queue_updated', fetchPatients);
    
    return () => { 
      channel.unbind('queue_updated', fetchPatients);
      pusherClient.unsubscribe('filamed-channel');
    };
  }, [fetchPatients, fetchSettings]);

  const handleCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callingPatient || !room) return;

    const toastId = toast.loading(`Chamando ${callingPatient.name}...`);
    try {
      await api.post('/calls', { patientId: callingPatient.id, room });
      toast.success('Chamada realizada!', { id: toastId });
      setCallingPatient(null);
      setRoom('');
      fetchPatients();
    } catch (error) {
      console.error('Error calling patient:', error);
      toast.error('Erro ao chamar paciente', { id: toastId });
    }
  };

  const handleDone = async (id: string, name: string) => {
    const toastId = toast.loading(`Finalizando atendimento de ${name}...`);
    try {
      await api.patch(`/patients/${id}/done`);
      toast.success('Atendimento concluído!', { id: toastId });
      fetchPatients();
    } catch (error) {
      console.error('Error finishing patient:', error);
      toast.error('Erro ao finalizar', { id: toastId });
    }
  };

  const waitingPatients = patients.filter(p => 
    p.status === 'WAITING' && (filterSpecialty === 'TODOS' || p.specialty === filterSpecialty)
  );
  const calledPatients = patients.filter(p => p.status === 'CALLED');



  return (
    <AdminLayout>
      <div className="space-y-10 pb-20 px-2 md:px-0">
        
        {/* Superior Stats Bar */}
        <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-widest mb-1">
              <LayoutDashboard size={14} />
              Monitor de Fluxo
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-50 tracking-tighter">
              Consultório <span className="text-emerald-600">Digital</span>
            </h1>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-around md:justify-start gap-6 md:pr-10">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Aguardando</span>
                <span className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-500">{waitingPatients.length}</span>
              </div>
              <div className="w-px h-10 bg-slate-100 dark:bg-slate-800" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Chamados</span>
                <span className="text-2xl md:text-3xl font-black text-amber-600 dark:text-amber-500">{calledPatients.length}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-500/5 px-6 py-4 rounded-[2rem] border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
               <BellRing size={20} className="animate-bounce" />
               <div className="flex flex-col">
                 <span className="text-[10px] font-black uppercase tracking-widest">Sincronização</span>
                 <span className="text-xs font-bold font-mono">Real-time Ativo</span>
               </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
          
          {/* Fila de Espera */}
          <section className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Clock size={18} />
                </div>
                Fila de Espera
              </h2>
              <div className="flex items-center gap-2">
                <select 
                  value={filterSpecialty}
                  onChange={(e) => setFilterSpecialty(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 outline-none focus:border-emerald-500 transition-all shadow-sm"
                >
                  {specialties.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="space-y-4">
              <LayoutGroup>
                <AnimatePresence mode="popLayout">
                  {waitingPatients.length === 0 ? (
                    <motion.div 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-16 border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-4"
                    >
                      <div className="mx-auto w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-300 dark:text-slate-700">
                        <Search size={32} />
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 font-bold italic text-sm">Nenhum paciente aguardando atendimento.</p>
                    </motion.div>
                  ) : (
                    waitingPatients.map((patient) => (
                      <motion.div 
                        layout
                        key={patient.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="group bg-white dark:bg-slate-900 p-4 md:p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all flex flex-col sm:flex-row items-center justify-between gap-4 sm:pr-6"
                      >
                        <div className="flex items-center gap-5 w-full sm:w-auto">
                          <div className={`p-4 rounded-2xl transition-colors ${
                            patient.priority === 'PRIORITY' 
                              ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-inner' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          }`}>
                            <UserRound size={24} />
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-slate-50 tracking-tight">{patient.name}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              <span className={`text-[10px] uppercase font-black px-3 py-1 rounded-full ${
                                patient.priority === 'PRIORITY'
                                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-500'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                              }`}>
                                {patient.priority === 'PRIORITY' ? 'Prioritário' : 'Normal'}
                              </span>
                              {patient.specialty && (
                                <span className="text-[10px] font-black px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 uppercase tracking-tighter">
                                  {patient.specialty}
                                </span>
                              )}
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                {new Date(patient.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setCallingPatient(patient);
                            // Pre-fill room with patient's registered setor
                            setRoom(patient.specialty || '');
                          }}
                          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 h-12 rounded-[1.2rem] shadow-lg shadow-emerald-500/30 transition-all active:scale-95 flex items-center justify-center gap-3 font-black text-sm uppercase italic tracking-tighter"
                        >
                          <Play size={16} fill="currentColor" />
                          Chamar
                        </button>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </LayoutGroup>
            </div>
          </section>

          {/* Pacientes Chamados */}
          <section className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <DoorOpen size={18} />
                </div>
                Chamados Ativos
              </h2>
            </div>
            
            <div className="space-y-4">
              <LayoutGroup>
                <AnimatePresence mode="popLayout">
                  {calledPatients.length === 0 ? (
                    <motion.div 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-slate-50 dark:bg-slate-900/40 rounded-[2.5rem] p-16 border-2 border-dashed border-slate-200 dark:border-slate-800/50 text-center"
                    >
                      <p className="text-slate-400 dark:text-slate-600 font-bold italic text-sm">Nenhum paciente em atendimento.</p>
                    </motion.div>
                  ) : (
                    calledPatients.map((patient) => (
                      <motion.div 
                        layout
                        key={patient.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border-2 border-amber-500/30 shadow-2xl shadow-amber-500/5 flex flex-col sm:flex-row items-center justify-between gap-6 sm:pr-8 ring-4 ring-amber-500/5"
                      >
                        <div className="flex items-center gap-6 w-full sm:w-auto">
                          <div className="relative flex-shrink-0">
                            <div className="p-4 md:p-5 rounded-3xl bg-amber-500 text-white shadow-xl shadow-amber-500/30 animate-pulse">
                              <UserRound size={28} />
                            </div>
                            <div className="absolute -top-2 -right-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 w-7 h-7 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900">
                               <CheckCircle2 size={12} />
                            </div>
                          </div>
                          <div className="text-center sm:text-left">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tighter leading-none">{patient.name}</h3>
                            <div className="mt-2">
                               <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-500">Aguardando na Sala</span>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDone(patient.id, patient.name)}
                          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 h-14 rounded-2xl shadow-xl shadow-emerald-500/30 transition-all active:scale-95 flex items-center justify-center gap-3 font-black uppercase tracking-tighter"
                        >
                          <CheckCircle size={20} />
                          Finalizar
                        </button>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </LayoutGroup>
            </div>
          </section>

        </div>
      </div>

      {/* Modal Chamada */}
      <AnimatePresence>
        {callingPatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCallingPatient(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-10 shadow-3xl border border-slate-200 dark:border-slate-800 relative z-10"
            >
              <div className="space-y-8">
                <div className="text-center space-y-2">
                  <div className="mx-auto w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                    <DoorOpen size={32} />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight">Destino do Atendimento</h3>
                  <p className="text-slate-500 dark:text-slate-400 font-medium italic text-sm">
                    Para onde <strong>{callingPatient.name}</strong> deve se dirigir?
                  </p>
                </div>
                
                <form onSubmit={handleCall} className="space-y-5">
                  
                  {/* Pre-filled room indicator */}
                  {room && (
                    <div className="bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0">
                        <DoorOpen size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Sala Detectada Automaticamente</p>
                        <p className="text-lg font-black text-slate-900 dark:text-white">{room}</p>
                      </div>
                    </div>
                  )}

                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="Ou digite outra sala..."
                    required
                    className="w-full h-14 px-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-emerald-500 outline-none transition-all text-lg font-bold text-slate-900 dark:text-slate-50 tracking-tight"
                    list="rooms-list"
                  />
                  <datalist id="rooms-list">
                    {rooms.map(r => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>

                  {/* Quick room buttons */}
                  {rooms.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Salas Rápidas</p>
                      <div className="flex flex-wrap gap-2">
                        {rooms.map(r => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setRoom(r)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${
                              room === r
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <button
                      type="button"
                      onClick={() => { setCallingPatient(null); setRoom(''); }}
                      className="h-14 rounded-2xl text-slate-500 font-black uppercase tracking-tighter hover:bg-slate-100 dark:hover:bg-slate-800 transition-all italic text-sm"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-tighter rounded-2xl shadow-xl shadow-emerald-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 italic text-sm"
                    >
                      Chamar
                      <Play size={16} fill="currentColor" />
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </AdminLayout>
  );
}
