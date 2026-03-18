import { Settings as SettingsIcon } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <h1 className="page-title">Configurações</h1>
        <p className="page-subtitle">Gerencie preferências da plataforma e da sua conta</p>
        <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
      </div>

      <div className="glass-card p-12 flex flex-col items-center justify-center text-center bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400/15 to-fuchsia-500/15 border border-primary/20 flex items-center justify-center shadow-[0_0_24px_hsl(var(--ring)/0.10)] mb-4">
          <SettingsIcon className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Em breve</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          Definições da conta, chaves de API, equipa e configurações da plataforma vão estar disponíveis aqui.
        </p>
      </div>
    </div>
  );
}
