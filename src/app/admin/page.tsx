'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { pusherClient } from '@/lib/pusher-client';
import {
  History,
  Search,
  Filter,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Users,
  Activity,
  RotateCcw,
  Calendar,
  LayoutDashboard,
  Volume2,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  ShieldCheck,
  PieChart,
  User,
  Settings,
  Plus,
  X,
  DoorOpen,
  Stethoscope
} from 'lucide-react';
import { format } from 'date-fns';
import AdminLayout from '@/components/layout/AdminLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FlowChart, PriorityPie } from '@/components/admin/AdminCharts';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Patient {
  id: string;
  name: string;
  symptoms: string;
  priority: 'NORMAL' | 'PRIORITY';
  status: 'WAITING' | 'CALLED' | 'DONE';
  createdAt: string;
}

interface Stats {
  total: number;
  done: number;
  priorities: number;
  avgWaitTime: number;
  dailyFlow?: { name: string; value: number }[];
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isReportMenuOpen, setIsReportMenuOpen] = useState(false);
  const reportMenuRef = useRef<HTMLDivElement>(null);

  const [loadingReports, setLoadingReports] = useState(false);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'STAFF' | 'LOGS' | 'REPORTS' | 'SETTINGS'>('DASHBOARD');
  
  // Original States
  const [authUsers, setAuthUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [staffReports, setStaffReports] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('RECEPTION');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<{ rooms: string[], specialties: string[] }>({ rooms: [], specialties: [] });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [newRoomItem, setNewRoomItem] = useState('');
  const [newSpecialtyItem, setNewSpecialtyItem] = useState('');

  // Close report menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (reportMenuRef.current && !reportMenuRef.current.contains(event.target as Node)) {
        setIsReportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [historyRes, statsRes] = await Promise.all([
        api.get('/patients/history'),
        api.get('/patients/stats')
      ]);
      setPatients(historyRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Erro ao carregar dados administrativos');
    } finally {
      setLoading(false);
    }
  }, []); // Stable dependency to prevent loops

  const handleCall = useCallback(async (patientId: string) => {
    const room = prompt('Para qual sala deseja chamar este paciente?', 'Consultório 01');
    if (!room) return;

    try {
      await api.post('/calls', { patientId, room });
      toast.success('Paciente chamado com sucesso');
      fetchData();
    } catch (error) {
      toast.error('Erro ao chamar paciente');
    }
  }, [fetchData]);

  useEffect(() => {
    if (status === 'authenticated' && session.user) {
      const userEmail = session.user.email?.toLowerCase() || '';
      const isAdmin = (session.user as any).isAdmin || userEmail === process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL;
      
      if (!isAdmin) {
        toast.error('Acesso negado', {
          description: `O e-mail ${userEmail} não tem permissão de administrador.`
        });
        router.push('/');
        return;
      }
    }
    fetchData();

    // Pusher real-time updates
    if (!pusherClient) return;

    const channel = pusherClient.subscribe('filamed-channel');
    channel.bind('queue_updated', fetchData);
    channel.bind('patient_called', fetchData);

    return () => {
      channel.unbind('queue_updated', fetchData);
      channel.unbind('patient_called', fetchData);
      pusherClient?.unsubscribe('filamed-channel');
    };
  }, [fetchData, status, session, router]);


  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este registro?')) return;
    try {
      await api.delete(`/patients/${id}`);
      toast.success('Paciente excluído com sucesso');
      fetchData();
    } catch (error) {
      toast.error('Error ao excluir paciente');
    }
  };

  const fetchAuthUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/auth/users');
      if (res.ok) {
        const data = await res.json();
        setAuthUsers(data);
      }
    } catch (error) {
      toast.error('Erro ao buscar usuários autorizados');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'STAFF') {
      fetchAuthUsers();
    }
  }, [activeTab, fetchAuthUsers]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, role: newRole })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao adicionar e-mail');
      }
      toast.success('Acesso liberado com sucesso!');
      setNewEmail('');
      fetchAuthUsers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Revogar acesso deste e-mail?')) return;
    try {
      const res = await fetch(`/api/auth/users/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Acesso revogado com sucesso!');
      fetchAuthUsers();
    } catch (error) {
      toast.error('Erro ao revogar acesso');
    }
  };

  const fetchAuditLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await api.get('/admin/logs');
      setAuditLogs(res.data);
    } catch (error) {
      toast.error('Erro ao buscar logs de auditoria');
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  const fetchStaffReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const res = await api.get('/admin/reports/staff');
      setStaffReports(res.data);
    } catch (error) {
      toast.error('Erro ao buscar relatórios de staff');
    } finally {
      setLoadingReports(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const res = await api.get('/admin/settings');
      setSettings(res.data);
    } catch (error) {
      toast.error('Erro ao buscar configurações');
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  const saveSettings = async (newSettings: { rooms: string[], specialties: string[] }) => {
    try {
      await api.post('/admin/settings', newSettings);
      toast.success('Configurações salvas!');
      fetchSettings();
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    }
  };

  useEffect(() => {
    if (activeTab === 'LOGS') fetchAuditLogs();
    if (activeTab === 'REPORTS') fetchStaffReports();
    if (activeTab === 'SETTINGS') fetchSettings();
  }, [activeTab, fetchAuditLogs, fetchStaffReports, fetchSettings]);

  useEffect(() => {
    if (!pusherClient) return;

    const channel = pusherClient.subscribe('filamed-channel');
    channel.bind('user_status_changed', (data: { email: string, isOnline: boolean }) => {
      setAuthUsers(prev => prev.map(u => u.email === data.email ? { ...u, isOnline: data.isOnline } : u));
      setStaffReports(prev => prev.map(u => u.email === data.email ? { ...u, isOnline: data.isOnline } : u));
    });
    return () => { 
      channel.unbind('user_status_changed');
      // No unsubscribe here if we share the channel, but actually we use the same channel 'filamed-channel'
    };
  }, []);

  const handleReset = async () => {
    if (!confirm('ATENÇÃO: Isso apagará toda a fila e histórico. Deseja continuar?')) return;
    try {
      await api.post('/patients/reset-queue');
      toast.success('Fila reiniciada com sucesso');
      fetchData();
    } catch (error) {
      toast.error('Error ao reiniciar fila');
    }
  };

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.symptoms && p.symptoms.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Use real data from backend or fallback to empty array
  const flowData = stats?.dailyFlow && stats.dailyFlow.length > 0
    ? stats.dailyFlow 
    : Array.from({ length: 6 }).map((_, i) => ({ name: `${8+i}h`, value: 0 }));

  const pieData = [
    { name: 'Normal', value: stats?.total ? stats.total - stats.priorities : 0 },
    { name: 'Prioritários', value: stats?.priorities || 0 },
  ];

  const exportToExcel = () => {
    let data: any[] = [];
    let fileName = '';
    let sheetName = '';

    if (activeTab === 'DASHBOARD') {
      if (patients.length === 0) return toast.error('Não há dados de pacientes para exportar.');
      data = patients.map(p => ({
        'ID': p.id.split('-')[0],
        'Paciente': p.name,
        'Sintoma / Motivo': p.symptoms || 'Não informado',
        'Prioridade': p.priority === 'PRIORITY' ? 'Prioritário' : 'Normal',
        'Status': p.status === 'DONE' ? 'Concluído' : p.status === 'CALLED' ? 'Atendimento' : 'Na Fila',
        'Data de Entrada': new Date(p.createdAt).toLocaleString('pt-BR')
      }));
      fileName = 'relatorio-pacientes';
      sheetName = 'Pacientes';
    } else if (activeTab === 'REPORTS') {
      if (staffReports.length === 0) return toast.error('Não há dados de equipe para exportar.');
      data = staffReports.map(s => ({
        'Funcionário': s.name || s.email,
        'E-mail': s.email,
        'Cargo': s.role,
        'Total Atendimentos': s.totalCalls,
        'Status': s.isOnline ? 'Online' : 'Offline',
        'Última Atividade': s.lastSeen ? new Date(s.lastSeen).toLocaleString('pt-BR') : 'Nunca'
      }));
      fileName = 'relatorio-equipe';
      sheetName = 'Equipe';
    } else if (activeTab === 'LOGS') {
      if (auditLogs.length === 0) return toast.error('Não há logs para exportar.');
      data = auditLogs.map(l => ({
        'Data/Hora': new Date(l.createdAt).toLocaleString('pt-BR'),
        'Usuário': l.user?.name || l.user?.email || 'Sistema',
        'Ação': l.action,
        'Detalhes': l.details
      }));
      fileName = 'relatorio-auditoria';
      sheetName = 'Logs';
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `filamed-${fileName}-${new Date().toISOString().split('T')[0]}.xlsx`);
    
    setIsReportMenuOpen(false);
    toast.success(`Exportado para Excel com sucesso!`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    let tableColumn: string[] = [];
    let tableRows: any[] = [];
    let title = '';
    let subtitle = '';

    if (activeTab === 'DASHBOARD') {
      if (patients.length === 0) return toast.error('Não há dados de pacientes para exportar.');
      title = "Relatório de Atendimento (Pacientes)";
      subtitle = `Total de Pacientes: ${patients.length}`;
      tableColumn = ["ID", "Paciente", "Sintomas", "Prioridade", "Status", "Data"];
      tableRows = patients.map(p => [
        p.id.split('-')[0],
        p.name,
        p.symptoms || '-',
        p.priority === 'PRIORITY' ? 'Prioritário' : 'Normal',
        p.status === 'DONE' ? 'Concluído' : p.status === 'CALLED' ? 'Atendimento' : 'Na Fila',
        new Date(p.createdAt).toLocaleString('pt-BR')
      ]);
    } else if (activeTab === 'REPORTS') {
      if (staffReports.length === 0) return toast.error('Não há dados de equipe para exportar.');
      title = "Relatório de Performance de Equipe";
      subtitle = `Total de Funcionários: ${staffReports.length}`;
      tableColumn = ["Funcionário", "E-mail", "Cargo", "Atendimentos", "Status"];
      tableRows = staffReports.map(s => [
        s.name || '-',
        s.email,
        s.role,
        s.totalCalls,
        s.isOnline ? 'Online' : 'Offline'
      ]);
    } else if (activeTab === 'LOGS') {
      if (auditLogs.length === 0) return toast.error('Não há logs para exportar.');
      title = "Log de Auditoria do Sistema";
      subtitle = `Total de Registros: ${auditLogs.length}`;
      tableColumn = ["Data/Hora", "Usuário", "Ação", "Detalhes"];
      tableRows = auditLogs.map(l => [
        new Date(l.createdAt).toLocaleString('pt-BR'),
        l.user?.name || l.user?.email || 'Sistema',
        l.action,
        l.details || '-'
      ]);
    }

    doc.setFontSize(18);
    doc.setTextColor(2, 132, 199); // Sky 600
    doc.text(`FilaMed - ${title}`, 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);
    doc.text(subtitle, 14, 36);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 42,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [2, 132, 199], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [240, 249, 255] }
    });

    const fileName = activeTab.toLowerCase();
    doc.save(`filamed-relatorio-${fileName}-${new Date().toISOString().split('T')[0]}.pdf`);
    
    setIsReportMenuOpen(false);
    toast.success(`Exportado para PDF com sucesso!`);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-10 pb-20">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-widest mb-1">
              <LayoutDashboard size={14} />
              Análise Estatística
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-slate-50 tracking-tighter">
              Painel <span className="text-emerald-600">Administrativo</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-5 py-3 bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl font-bold text-sm transition-all hover:bg-red-500 hover:text-white"
            >
              <RotateCcw size={18} />
              Reiniciar Fila
            </button>
            <div className="relative" ref={reportMenuRef}>
              <button 
                onClick={() => setIsReportMenuOpen(!isReportMenuOpen)}
                className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-sm shadow-xl shadow-slate-500/20 transition-all hover:scale-105 active:scale-95"
              >
                <Download size={18} />
                Relatórios
                <ChevronDown size={14} className={`transition-transform duration-300 ${isReportMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isReportMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50"
                  >
                    <div className="p-2 space-y-1">
                      <button 
                        onClick={exportToExcel}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl transition-colors text-left"
                      >
                        <FileSpreadsheet size={18} />
                        Exportar para Excel
                      </button>
                      <button 
                        onClick={exportToPDF}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition-colors text-left"
                      >
                        <FileText size={18} />
                        Exportar para PDF
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-px overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('DASHBOARD')}
            className={`px-6 py-3 font-bold text-sm transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'DASHBOARD' 
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400' 
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:border-slate-300'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('STAFF')}
            className={`px-6 py-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'STAFF' 
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400' 
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:border-slate-300'
            }`}
          >
            <ShieldCheck size={16} />
            Equipe
          </button>
          <button
            onClick={() => setActiveTab('LOGS')}
            className={`px-6 py-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'LOGS' 
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400' 
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:border-slate-300'
            }`}
          >
            <History size={16} />
            Logs de Auditoria
          </button>
          <button
            onClick={() => setActiveTab('REPORTS')}
            className={`px-6 py-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'REPORTS' 
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400' 
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:border-slate-300'
            }`}
          >
            <PieChart size={16} />
            Relatórios de Staff
          </button>
          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`px-6 py-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'SETTINGS' 
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400' 
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:border-slate-300'
            }`}
          >
            <Settings size={16} />
            Configurações
          </button>
        </div>

        {activeTab === 'DASHBOARD' && (
          <div className="space-y-10">
            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
            { label: 'Total Histórico', value: stats?.total || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-600/10' },
            { label: 'Concluídos', value: stats?.done || 0, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-600/10' },
            { label: 'Prioritários', value: stats?.priorities || 0, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-600/10' },
            { label: 'Espera Média', value: `${stats?.avgWaitTime || 0} min`, icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-600/10' },
          ].map((stat, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={stat.label}
              className="group relative bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}>
                  <stat.icon size={24} />
                </div>
                <div className="flex flex-col items-end">
                  <TrendingUp size={16} className="text-emerald-500" />
                  <span className="text-[10px] font-black text-emerald-500 tracking-tighter">↑ 12%</span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</span>
                <p className="text-4xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">{stat.value}</p>
              </div>
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full opacity-50 transition-transform group-hover:scale-150" />
            </motion.div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Fluxo Diário</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Volume de pacientes por hora</p>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl">
                <button className="px-3 py-1 bg-white dark:bg-slate-900 shadow-sm rounded-lg text-xs font-black text-slate-900 dark:text-white transition-all">HOJE</button>
                <button className="px-3 py-1 text-xs font-black text-slate-400 hover:text-slate-900 transition-all">SEMANA</button>
              </div>
            </div>
            <FlowChart data={flowData} />
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="mb-6">
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Prioridades</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Distribuição de triagem</p>
            </div>
            <PriorityPie data={pieData} />
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-3xl border border-emerald-100 dark:border-emerald-500/20">
                <div className="w-2 h-2 rounded-full bg-emerald-600" />
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Normal</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                    {Math.round(((stats?.total ? stats.total - stats.priorities : 0) / (stats?.total || 1)) * 100)}%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 p-4 rounded-3xl border border-amber-100 dark:border-amber-500/20">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Prioritário</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                    {Math.round(((stats?.priorities || 0) / (stats?.total || 1)) * 100)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Table Section */}
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden">

          {/* Table Toolbar */}
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-6 items-center justify-between bg-slate-50/30 dark:bg-slate-900/40">
            <div className="relative w-full md:w-96 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Buscar por nome ou sintoma..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-14 pl-14 pr-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 outline-none transition-all text-sm font-bold shadow-sm"
              />
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button className="flex-1 md:flex-none flex items-center justify-center gap-2 h-14 px-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-500 font-bold text-sm">
                <Filter size={18} />
                Filtrar
              </button>
              <button className="flex-1 md:flex-none flex items-center justify-center gap-2 h-14 px-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-500 font-bold text-sm">
                <Calendar size={18} />
                Período
              </button>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/80">
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">Paciente</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">Sintoma / Motivo</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">Prioridade</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">Status</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                <AnimatePresence>
                  {filteredPatients.map((patient) => (
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -20 }}
                      key={patient.id}
                      className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all cursor-default"
                    >
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                            <Users size={20} />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900 dark:text-slate-100 tracking-tight">{patient.name}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {patient.id.split('-')[0]}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <span className="text-sm text-slate-500 dark:text-slate-400 font-bold italic line-clamp-1 max-w-[200px]">
                          {patient.symptoms || 'Não informado'}
                        </span>
                      </td>
                      <td className="px-10 py-8">
                        <span className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-full ${patient.priority === 'PRIORITY'
                          ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                          }`}>
                          {patient.priority}
                        </span>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-2">
                          {patient.status === 'DONE' ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-tighter border border-emerald-500/20">
                              <CheckCircle2 size={12} />
                              Concluído
                            </div>
                          ) : patient.status === 'CALLED' ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-600 rounded-xl font-black text-[10px] uppercase tracking-tighter border border-amber-500/20">
                              <Clock size={12} />
                              Atendimento
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-xl font-black text-[10px] uppercase tracking-tighter border border-emerald-500/20 animate-pulse">
                              <Activity size={12} />
                              Na Fila
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-10 py-8 text-right">
                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleCall(patient.id)}
                            className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 hover:bg-emerald-600 hover:text-white transition-all shadow-sm group/btn"
                            title="Chamar Paciente"
                          >
                            <Volume2 size={18} className="group-hover/btn:scale-110 transition-transform" />
                          </button>
                          <button 
                            onClick={() => handleDelete(patient.id)}
                            className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredPatients.length === 0 && (
            <div className="p-32 text-center space-y-6">
              <div className="mx-auto w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-slate-200 dark:text-slate-800 transition-transform hover:scale-110">
                <Search size={48} />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Nenhum registro</h4>
                <p className="text-slate-500 font-bold italic max-w-xs mx-auto">Não encontramos nenhum resultado para os critérios de busca informados.</p>
              </div>
            </div>
          )}

          {/* Table Footer */}
          <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-black uppercase tracking-widest text-slate-400">
            <span>Exibindo {filteredPatients.length} de {patients.length} registros</span>
            <div className="flex items-center gap-4">
              <button className="hover:text-emerald-600 transition-colors disabled:opacity-30" disabled>Anterior</button>
              <button className="hover:text-emerald-600 transition-colors disabled:opacity-30" disabled>Próximo</button>
            </div>
          </div>
          </div>
        </div>
        )}

        {/* Staff Tab Content */}
        {activeTab === 'STAFF' && (
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-2xl p-8 space-y-8">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              
              {/* Form to add user */}
              <div className="w-full md:w-1/3 space-y-6 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-700">
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Conceder Acesso</h3>
                  <p className="text-sm font-bold text-slate-500">Adicione e-mails do Google (Recepcionistas, Médicos) para permitir acesso ao painel de atendimento.</p>
                </div>

                <form onSubmit={handleAddUser} className="space-y-4">
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">E-mail (Conta Google)</label>
                    <input 
                      type="email" 
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      placeholder="recepcionista@gmail.com"
                      className="w-full h-12 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 outline-none font-bold text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">Nível de Acesso (Role)</label>
                    <select 
                      value={newRole}
                      onChange={e => setNewRole(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 outline-none font-bold text-sm"
                    >
                      <option value="RECEPTION">Recepção</option>
                      <option value="DOCTOR">Consultório (Médico)</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase rounded-xl shadow-lg transition-all active:scale-95">
                    Liberar Acesso
                  </button>
                </form>
              </div>

              {/* List of authorized users */}
              <div className="w-full md:w-2/3">
                <div className="space-y-2 mb-6">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Usuários Liberados</h3>
                  <p className="text-sm font-bold text-slate-500">Gerencie quem tem acesso ao sistema (além do Master).</p>
                </div>

                {loadingUsers ? (
                  <div className="w-8 h-8 border-4 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin mx-auto mt-10" />
                ) : (
                  <div className="grid gap-4">
                    {authUsers.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                             {user.image ? (
                               <img 
                                 src={user.image} 
                                 alt={user.name || ''} 
                                 className="w-12 h-12 rounded-full object-cover border-2 border-slate-100 dark:border-slate-700" 
                                 referrerPolicy="no-referrer"
                               />
                             ) : (
                               <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xs ${user.role === 'DOCTOR' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                 {user.role === 'DOCTOR' ? 'MD' : 'RC'}
                               </div>
                             )}
                             <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-800 ${user.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                               <p className="font-bold text-slate-900 dark:text-white leading-tight">{user.name || user.email.split('@')[0]}</p>
                               {user.isOnline && <span className="text-[8px] font-black uppercase text-emerald-500 tracking-widest animate-pulse">Online</span>}
                            </div>
                            <p className="text-xs text-slate-400 font-medium">{user.email}</p>
                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1">{user.role}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Revogar Acesso"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {authUsers.length === 0 && (
                      <div className="text-center p-10 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        <p className="text-slate-500 font-bold text-sm">Nenhum e-mail liberado ainda.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* Logs Tab Content */}
        {activeTab === 'LOGS' && (
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden">
             <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Logs de Auditoria</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Ações monitoradas em tempo real</p>
                </div>
                <button 
                  onClick={fetchAuditLogs}
                  className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400"
                >
                  <RotateCcw size={18} className={loadingLogs ? 'animate-spin' : ''} />
                </button>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/80">
                      <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Funcionário</th>
                      <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Ação</th>
                      <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Detalhes</th>
                      <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Data/Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {loadingLogs ? (
                      <tr><td colSpan={4} className="p-20 text-center"><div className="w-8 h-8 border-4 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin mx-auto" /></td></tr>
                    ) : auditLogs.length === 0 ? (
                      <tr><td colSpan={4} className="p-20 text-center text-slate-400 font-bold italic text-sm">Nenhum log encontrado.</td></tr>
                    ) : auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-10 py-6">
                           <div className="flex items-center gap-3">
                              {log.user.image ? (
                                <img 
                                  src={log.user.image} 
                                  alt="" 
                                  className="w-8 h-8 rounded-full" 
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400"><User size={14} /></div>
                              )}
                              <div>
                                <p className="text-xs font-bold text-slate-900 dark:text-white">{log.user.name || log.user.email}</p>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{log.user.role}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-10 py-6">
                           <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-tighter ${
                             log.action.includes('CALL') ? 'bg-blue-500/10 text-blue-600' :
                             log.action.includes('DONE') ? 'bg-emerald-500/10 text-emerald-600' :
                             'bg-slate-500/10 text-slate-500'
                           }`}>
                             {log.action}
                           </span>
                        </td>
                        <td className="px-10 py-6 text-xs text-slate-500 dark:text-slate-400 font-medium italic">
                          {log.details}
                        </td>
                        <td className="px-10 py-6 text-[10px] font-bold text-slate-400 uppercase">
                           {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
             </div>
          </div>
        )}

        {/* Reports Tab Content */}
        {activeTab === 'REPORTS' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
               {loadingReports ? (
                 <div className="col-span-full p-20 text-center"><div className="w-8 h-8 border-4 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin mx-auto" /></div>
               ) : staffReports.length === 0 ? (
                 <div className="col-span-full p-20 text-center text-slate-400 font-bold italic text-sm">Nenhum relatório disponível.</div>
               ) : staffReports.map((staff) => (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   key={staff.id} 
                   className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6"
                 >
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <div className="relative">
                            {staff.image ? (
                              <img 
                                src={staff.image} 
                                alt="" 
                                className="w-14 h-14 rounded-2xl object-cover" 
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black">{staff.role[0]}</div>
                            )}
                            <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-4 border-white dark:border-slate-900 ${staff.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                         </div>
                         <div>
                            <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{staff.name || 'Pendente'}</h4>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{staff.role}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-2xl font-black text-emerald-600 leading-none">{staff.totalCalls}</p>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Atendimentos</p>
                      </div>
                   </div>

                   <div className="space-y-3">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Atividades Recentes</p>
                      <div className="space-y-2">
                         {staff.recentActivity.length === 0 ? (
                           <p className="text-xs text-slate-400 italic font-medium">Nenhuma atividade registrada.</p>
                         ) : staff.recentActivity.map((act: any, idx: number) => (
                           <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                              <div className="flex items-center gap-2">
                                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                 <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Chamou {act.patient}</p>
                              </div>
                              <span className="text-[9px] font-black text-slate-400">{format(new Date(act.at), 'HH:mm')}</span>
                           </div>
                         ))}
                      </div>
                   </div>

                   <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-400 uppercase">Último Acesso</span>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 italic">
                         {staff.lastSeen ? format(new Date(staff.lastSeen), 'dd/MM HH:mm') : 'Nunca'}
                      </span>
                   </div>
                 </motion.div>
               ))}
            </div>
          </div>
        )}
        
        {activeTab === 'SETTINGS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Rooms Management */}
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-2xl p-8 space-y-6">
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <DoorOpen size={20} />
                  </div>
                  Salas / Consultórios
                </h3>
                <p className="text-sm font-bold text-slate-500">Configure os nomes das salas que aparecem no painel de chamada.</p>
              </div>

              <div className="flex gap-3">
                <input 
                  type="text" 
                  value={newRoomItem}
                  onChange={e => setNewRoomItem(e.target.value)}
                  placeholder="Ex: Consultório 05"
                  className="flex-1 h-12 px-5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 outline-none font-bold text-sm"
                />
                <button 
                  onClick={() => {
                    if (newRoomItem) {
                      const newRooms = [...settings.rooms, newRoomItem];
                      saveSettings({ ...settings, rooms: newRooms });
                      setNewRoomItem('');
                    }
                  }}
                  className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center hover:bg-emerald-700 transition-all active:scale-95"
                >
                  <Plus size={20} />
                </button>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                <AnimatePresence>
                  {settings.rooms.map((room, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 group"
                    >
                      <span className="font-bold text-slate-700 dark:text-slate-300">{room}</span>
                      <button 
                        onClick={() => {
                          const newRooms = settings.rooms.filter((_, idx) => idx !== i);
                          saveSettings({ ...settings, rooms: newRooms });
                        }}
                        className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X size={16} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Specialties Management */}
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-2xl p-8 space-y-6">
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Stethoscope size={20} />
                  </div>
                  Especialidades
                </h3>
                <p className="text-sm font-bold text-slate-500">Configure as especialidades disponíveis na recepção.</p>
              </div>

              <div className="flex gap-3">
                <input 
                  type="text" 
                  value={newSpecialtyItem}
                  onChange={e => setNewSpecialtyItem(e.target.value)}
                  placeholder="Ex: Cardiologia"
                  className="flex-1 h-12 px-5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-blue-500 outline-none font-bold text-sm"
                />
                <button 
                  onClick={() => {
                    if (newSpecialtyItem) {
                      const newSpecs = [...settings.specialties, newSpecialtyItem];
                      saveSettings({ ...settings, specialties: newSpecs });
                      setNewSpecialtyItem('');
                    }
                  }}
                  className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-all active:scale-95"
                >
                  <Plus size={20} />
                </button>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                <AnimatePresence>
                  {settings.specialties.map((spec, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 group"
                    >
                      <span className="font-bold text-slate-700 dark:text-slate-300">{spec}</span>
                      <button 
                        onClick={() => {
                          const newSpecs = settings.specialties.filter((_, idx) => idx !== i);
                          saveSettings({ ...settings, specialties: newSpecs });
                        }}
                        className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X size={16} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}
        
        </div>
    </AdminLayout>
  );
}
