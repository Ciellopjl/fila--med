'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, 
  Stethoscope, 
  MonitorPlay, 
  Home, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings,
  History as HistoryIcon,
  Menu, 
  X
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';

const menuItems = [
  { icon: Home, label: 'Início', href: '/' },
  { icon: Users, label: 'Recepção', href: '/reception' },
  { icon: Stethoscope, label: 'Atendimento', href: '/attendance' },
  { icon: MonitorPlay, label: 'Painel TV', href: '/tv' },
  { icon: HistoryIcon, label: 'Painel Admin', href: '/admin', adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Toggle Trigger */}
      <div className="lg:hidden fixed top-4 left-4 z-[60]">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl text-slate-900 dark:text-white"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[40] lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ 
          width: isCollapsed ? 80 : 280,
          x: isOpen ? 0 : (typeof window !== 'undefined' && window.innerWidth < 1024 ? -300 : 0)
        }}
        className="fixed left-0 top-0 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 flex flex-col transition-colors duration-500"
      >
      {/* Header / Logo */}
      <div className="p-6 flex items-center justify-between">
        {!isCollapsed && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 shadow-lg shadow-emerald-500/20">
              <Image src="/logo.png" alt="Logo" width={40} height={40} className="object-cover w-full h-full" />
            </div>
            <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">Fila<span className="text-emerald-600">Med</span></span>
          </motion.div>
        )}
        {isCollapsed && (
          <div className="w-10 h-10 rounded-xl overflow-hidden mx-auto shadow-lg shadow-emerald-500/20">
            <Image src="/logo.png" alt="Logo" width={40} height={40} className="object-cover w-full h-full" />
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-emerald-600 text-white rounded-full items-center justify-center hover:bg-emerald-700 transition-all shadow-lg border-2 border-white dark:border-slate-900"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-8 space-y-2">
        {menuItems.map((item) => {
          if (item.adminOnly && !(session?.user as any)?.isAdmin) return null;
          
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 p-4 rounded-2xl transition-all group ${
                isActive 
                  ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-500/30 font-bold' 
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <item.icon size={22} className={isActive ? 'text-white' : 'group-hover:scale-110 transition-transform'} />
              {!isCollapsed && <span className="text-sm font-bold tracking-tight">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User / Footer */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        {!isCollapsed && session?.user && (
          <div className="mb-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
             <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest leading-none mb-1">Administrador</p>
             <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{session.user.name}</p>
          </div>
        )}
        <button
          onClick={() => signOut()}
          className={`flex items-center gap-4 p-4 w-full rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all group ${isCollapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={22} className="group-hover:rotate-12 transition-transform" />
          {!isCollapsed && <span className="text-sm font-bold tracking-tight">Sair</span>}
        </button>
      </div>
    </motion.aside>
    </>
  );
}
