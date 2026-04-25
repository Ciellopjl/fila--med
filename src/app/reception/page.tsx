'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { UserPlus, CheckCircle2, AlertCircle, Sparkles, UserCheck, ShieldCheck, ArrowRight } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';


export default function ReceptionPage() {
  const [name, setName] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [loading, setLoading] = useState(false);
  const [lastRegistered, setLastRegistered] = useState<any>(null);
  const [specialties, setSpecialties] = useState<string[]>(['Sala de Triagem', 'Clínica Geral', 'Pediatria', 'Ortopedia', 'Ginecologia', 'Odontologia']);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get('/admin/settings');
      if (res.data) {
        // Combine rooms and specialties into one unified list for the Setor dropdown
        const rooms = res.data.rooms || [];
        const specs = res.data.specialties || [];
        const combined = [...new Set([...rooms, ...specs])];
        if (combined.length > 0) {
          setSpecialties(combined);
          if (!combined.includes(specialty)) {
            setSpecialty(combined[0]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }, [specialty]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setLoading(true);
    const toastId = toast.loading('Registrando paciente...');
    
    try {
      const response = await api.post('/patients', { name, symptoms, priority, specialty });
      const newPatient = response.data;
      setLastRegistered(newPatient);
      toast.success('Paciente registrado!', {
        id: toastId,
        description: `${name} foi adicionado à fila com sucesso.`
      });
      setName('');
      setSymptoms('');
      setSpecialty(specialties[0] || 'Clínica Geral');
      setPriority('NORMAL');
    } catch (error) {
      console.error('Error creating patient:', error);
      toast.error('Erro no registro', {
        id: toastId,
        description: 'Não foi possível cadastrar o paciente. Tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] lg:py-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl px-4 md:px-0"
        >
          {/* Header Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-6 md:p-10 shadow-2xl shadow-emerald-500/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none hidden md:block">
              <UserPlus size={120} />
            </div>

            <div className="relative z-10 space-y-8">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-2">
                  <Sparkles size={12} />
                  Triagem Médica
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                  Recepção de <span className="text-emerald-600">Pacientes</span>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium italic text-sm">
                  Inicie o fluxo de atendimento cadastrando os dados básicos abaixo.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
                <div className="grid grid-cols-1 gap-6 md:gap-8">
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1 flex items-center gap-2">
                      Nome Completo
                      <ShieldCheck size={14} className="text-emerald-500" />
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: João Victor Silva"
                      required
                      className="w-full h-14 md:h-16 px-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all text-lg md:text-xl font-bold text-slate-900 dark:text-slate-50 placeholder:text-slate-300 dark:placeholder:text-slate-700"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1 flex items-center gap-2">
                      Sintomas / Motivo
                      <Sparkles size={14} className="text-amber-500" />
                    </label>
                    <input
                      type="text"
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      placeholder="Ex: Dor de cabeça forte"
                      className="w-full h-14 md:h-16 px-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all text-lg md:text-xl font-bold text-slate-900 dark:text-slate-50 placeholder:text-slate-300 dark:placeholder:text-slate-700"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1 flex items-center gap-2">
                      Especialidade / Setor
                      <ShieldCheck size={14} className="text-blue-500" />
                    </label>
                    <select
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      className="w-full h-14 md:h-16 px-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all text-lg md:text-xl font-bold text-slate-900 dark:text-slate-50"
                    >
                      {specialties.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                    Classificação de Risco
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setPriority('NORMAL')}
                      className={`group relative p-4 md:p-6 rounded-[2rem] border-2 transition-all duration-300 flex items-center gap-4 ${
                        priority === 'NORMAL'
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/5 ring-4 ring-emerald-500/10'
                          : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700 shadow-sm'
                      }`}
                    >
                      <div className={`p-3 rounded-2xl transition-colors ${
                        priority === 'NORMAL' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}>
                        <UserCheck size={20} />
                      </div>
                      <div className="text-left">
                        <span className={`block font-bold text-lg leading-none ${priority === 'NORMAL' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>Normal</span>
                        <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1">Fluxo Padrão</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPriority('PRIORITY')}
                      className={`group relative p-4 md:p-6 rounded-[2rem] border-2 transition-all duration-300 flex items-center gap-4 ${
                        priority === 'PRIORITY'
                          ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-500/5 ring-4 ring-amber-500/10'
                          : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700 shadow-sm'
                      }`}
                    >
                      <div className={`p-3 rounded-2xl transition-colors ${
                        priority === 'PRIORITY' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/40' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}>
                        <AlertCircle size={20} />
                      </div>
                      <div className="text-left">
                        <span className={`block font-bold text-lg leading-none ${priority === 'PRIORITY' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'}`}>Prioritário</span>
                        <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1">Urgência / Idoso</span>
                      </div>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !name}
                  className="group relative w-full h-16 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white font-black rounded-2xl shadow-2xl shadow-emerald-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-lg overflow-hidden"
                >
                  <AnimatePresence mode="wait">
                    {loading ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin"
                      />
                    ) : (
                      <motion.div
                        key="content"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-3"
                      >
                        Confirmar Registro
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </form>

              <AnimatePresence>
                {lastRegistered && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-6"
                  >
                    <div className="bg-emerald-500/10 border-2 border-emerald-500/20 rounded-3xl p-6 space-y-4">
                      <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 font-black text-sm uppercase tracking-tighter">
                        <CheckCircle2 size={20} />
                        Registro Concluído!
                      </div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        O paciente <strong>{lastRegistered.name}</strong> já está na fila. Você pode abrir o painel de acompanhamento para ele abaixo:
                      </p>
                      <div className="flex gap-3">
                        <a
                          href={`/status/${lastRegistered.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 h-12 bg-white dark:bg-slate-800 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all shadow-sm"
                        >
                           Abrir Ticket
                           <ArrowRight size={14} />
                        </a>
                        <button
                          onClick={() => setLastRegistered(null)}
                          className="px-4 h-12 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
                        >
                          Fechar
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 md:gap-8 text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Sincronizado
            </div>
            <div className="flex items-center gap-2 text-emerald-500/50">
              Protocolo Seguro
            </div>
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
