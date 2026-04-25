'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Users, MonitorPlay, Stethoscope, ArrowRight, LogIn, LogOut, History as HistoryIcon, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function Home() {
  const { data: session, status } = useSession();

  const modules = [
    {
      title: 'Recepção',
      description: 'Cadastre pacientes e defina a prioridade do atendimento inicial.',
      icon: Users,
      href: '/reception',
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      border: 'hover:border-blue-500',
      shadow: 'hover:shadow-blue-500/20',
    },
    {
      title: 'Atendimento',
      description: 'Painel para médicos e consultórios realizarem chamadas de pacientes.',
      icon: Stethoscope,
      href: '/attendance',
      color: 'text-emerald-500',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      border: 'hover:border-emerald-500',
      shadow: 'hover:shadow-emerald-500/20',
    },
    {
      title: 'Painel da TV',
      description: 'Exibição pública de chamados com anúncio sonoro automatizado.',
      icon: MonitorPlay,
      href: '/tv',
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      border: 'hover:border-amber-500',
      shadow: 'hover:shadow-amber-500/20',
    },
  ];

  const userEmail = session?.user?.email?.toLowerCase() || '';
  const isAdmin = (session?.user as any)?.isAdmin || userEmail === process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL;

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-500 font-sans">
      {/* Decoração de Fundo */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Navbar Personalizada */}
      <div className="absolute top-8 right-8 z-50">
        {session ? (
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link 
                href="/admin"
                className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-2xl shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center gap-2"
              >
                <HistoryIcon size={18} />
                Acessar Painel
              </Link>
            )}
            <button 
              onClick={() => signOut()}
              className="flex items-center gap-3 px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all text-slate-600 dark:text-slate-400 font-medium group"
            >
              {session.user?.image && (
                <img 
                  src={session.user.image} 
                  alt="Avatar" 
                  className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700" 
                  referrerPolicy="no-referrer"
                />
              )}
              <span className="hidden sm:block max-w-[150px] truncate">{session.user?.name}</span>
              <LogOut size={16} className="group-hover:text-red-500 transition-colors" />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => signIn('google')}
            className="flex items-center gap-3 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-xl shadow-emerald-500/20 transition-all font-bold active:scale-95"
          >
            <LogIn size={20} />
            Entrar com Google
          </button>
        )}
      </div>

      <div className="w-full max-w-6xl z-10 space-y-16">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-black/50 mb-4 transition-transform hover:scale-105">
             <div className="flex items-center justify-center rounded-2xl overflow-hidden bg-slate-950 shadow-inner">
               <Image 
                 src="/logo.png" 
                 alt="FilaMed Logo" 
                 width={56} 
                 height={56} 
                 className="object-contain rounded-2xl"
                 priority
               />
             </div>
             <div className="ml-5 text-left pr-4">
               <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-slate-50 leading-none">
                 FilaMed
               </h1>
               <p className="text-xs font-bold uppercase tracking-widest text-emerald-500 dark:text-emerald-400 mt-1">
                 Plataforma Hospitalar
               </p>
             </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight italic">
              GESTÃO QUE <span className="text-emerald-600 dark:text-emerald-500">SALVA TEMPO.</span>
            </h2>
            <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
              Otimize o fluxo de pacientes com precisão em tempo real. Uma solução completa de ponta a ponta para clínicas e hospitais.
            </p>
          </div>
        </motion.div>

        {/* Modules Grid - Only access logic */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode='wait'>
            {modules.map((module, index) => {
              
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.15 }}
                >
                <div 
                  onClick={() => {
                    if (!session && module.href !== '/tv') {
                      toast.error('Acesso Restrito', {
                        description: 'Por favor, autentique-se com o Google para acessar este módulo.'
                      });
                      signIn('google');
                    }
                  }}
                  className="h-full"
                >
                  <Link 
                    href={(!session && module.href !== '/tv') ? '#' : module.href}
                    className={`group relative flex flex-col justify-between p-10 h-full bg-white/70 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[3rem] border-2 border-transparent ${module.border} hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] ${module.shadow} transition-all duration-500 overflow-hidden cursor-pointer`}
                  >
                    {!session && module.href !== '/tv' && (
                      <div className="absolute top-6 right-6 text-slate-400 dark:text-slate-600">
                        <LogIn size={20} />
                      </div>
                    )}
                    
                    <div className="space-y-8">
                      <div className={`w-20 h-20 rounded-3xl flex items-center justify-center ${module.bg} ${module.color} transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-sm`}>
                        <module.icon size={40} strokeWidth={2.2} />
                      </div>
                      
                      <div className="space-y-3">
                        <h3 className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
                          {module.title}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                          {module.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-10 flex items-center text-sm font-bold text-slate-900 dark:text-white group-hover:gap-4 gap-2 transition-all">
                      {(!session && module.href !== '/tv') ? 'Entrar para Acessar' : 'Abrir Módulo'}
                      <ArrowRight size={20} className={`${module.color} transition-transform group-hover:translate-x-2`} />
                    </div>
                  </Link>
                </div>
              </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Footer info */}
        <div className="pt-10 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 text-xs font-bold uppercase tracking-widest">
           <div className="hidden md:block"></div>
           <div>
             Desenvolvido por{' '}
             <a 
               href="https://ciello-dev.vercel.app/" 
               target="_blank" 
               rel="noopener noreferrer"
               className="text-emerald-500 hover:text-emerald-600 transition-colors border-b border-transparent hover:border-emerald-600"
             >
               Ciello Dev
             </a>
           </div>
        </div>

      </div>
    </div>
  );
}
