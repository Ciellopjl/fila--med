# 🏥 FilaMed - Sistema de Gestão de Filas Inteligente

![FilaMed Banner](https://img.shields.io/badge/FilaMed-Hospital_Grade-blue?style=for-the-badge&logo=mediamarkt)
![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)

O **FilaMed** é uma solução SaaS de alto desempenho projetada para modernizar a gestão de fluxos de pacientes em clínicas e hospitais. Combinando tempo real, automação de chamadas e uma interface premium, o FilaMed transforma a experiência de espera em um processo fluido e profissional.

---

## 🚀 Tecnologias de Ponta

O projeto utiliza o que há de mais moderno no ecossistema JavaScript/TypeScript:

| Tecnologia | Finalidade |
| :--- | :--- |
| **Next.js 16 (App Router)** | Framework full-stack com suporte a Turbopack para performance extrema. |
| **React 19** | Biblioteca de UI com foco em concorrência e componentes de servidor. |
| **Prisma ORM** | Modelagem de dados robusta e queries type-safe com PostgreSQL. |
| **Socket.io** | Comunicação bidirecional em tempo real para chamadas instantâneas no painel. |
| **Tailwind CSS 4** | Estilização moderna e ultra-veloz com suporte nativo a novas propriedades. |
| **Framer Motion** | Animações fluidas e micro-interações que elevam a experiência do usuário. |
| **NextAuth.js** | Autenticação segura com suporte a múltiplos providers e controle de roles. |
| **Recharts** | Visualização de dados e métricas operacionais no dashboard administrativo. |
| **jsPDF & SheetJS** | Geração de relatórios profissionais em PDF e Excel. |
| **Sonner** | Sistema de notificações (toasts) elegante e não intrusivo. |

---

## ✨ Funcionalidades Principais

### 📋 Recepção Inteligente
- Cadastro rápido de pacientes com definição de prioridade (Normal/Prioritário).
- Triagem por especialidade configurável.
- Integração em tempo real com a fila de espera.

### 👨‍⚕️ Painel de Atendimento (Médico)
- Chamada de pacientes com um clique.
- Gestão de status (Aguardando, Chamado, Finalizado).
- Histórico de atendimentos por profissional.

### 📺 Painel de TV (Digital Signage)
- Interface de alta visibilidade para salas de espera.
- **Text-to-Speech (TTS)**: O sistema anuncia o nome do paciente e a sala por voz.
- Alertas visuais e sonoros de última geração.

### 🔐 Administração & Auditoria (ERP)
- **Logs de Auditoria**: Rastreabilidade total de ações (quem chamou, quando entrou, etc).
- **Gestão de Usuários**: Whitelist e controle de permissões por nível (Admin, Médico, Recepção).
- **Configurações Dinâmicas**: Gerencie salas e especialidades sem mexer no código.
- **Métricas Operacionais**: Gráficos de desempenho e fluxo de pacientes.

---

## 🛠️ Configuração e Instalação

### Pré-requisitos
- Node.js (v20+)
- PostgreSQL
- NPM ou Yarn

### Passos
1. **Clonar o repositório**
   ```bash
   git clone https://github.com/seu-usuario/fila-med.git
   cd fila-med
   ```

2. **Instalar dependências**
   ```bash
   npm install
   ```

3. **Variáveis de Ambiente**
   Crie um arquivo `.env` na raiz:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/filamed"
   NEXTAUTH_SECRET="seu_secret_aqui"
   NEXTAUTH_URL="http://localhost:3000"
   GOOGLE_CLIENT_ID="..."
   GOOGLE_CLIENT_SECRET="..."
   ```

4. **Banco de Dados**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Executar em Desenvolvimento**
   ```bash
   npm run dev
   ```

---

## 🎨 Design System

O FilaMed utiliza uma estética **Premium Glassmorphism** e **Dark Mode** otimizado, garantindo que o ambiente hospitalar transmita modernidade e confiança.

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

---

<p align="center">
  Desenvolvido com ❤️ para transformar a saúde.
</p>
