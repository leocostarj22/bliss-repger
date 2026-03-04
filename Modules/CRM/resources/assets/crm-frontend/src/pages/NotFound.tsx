import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="glass-card p-10 w-full max-w-lg text-center bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400/15 to-fuchsia-500/15 border border-primary/20 flex items-center justify-center shadow-[0_0_24px_hsl(var(--ring)/0.10)]">
          <AlertTriangle className="w-6 h-6 text-primary" />
        </div>

        <h1 className="mt-6 text-4xl font-bold tracking-tight">404</h1>
        <p className="mt-2 text-muted-foreground">
          A página <span className="font-mono text-foreground">{location.pathname}</span> não foi encontrada.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-900 px-4 py-2 text-sm font-semibold shadow-lg shadow-cyan-400/20 hover:shadow-cyan-400/40 hover:-translate-y-0.5 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
