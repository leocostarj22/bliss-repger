import { Settings as SettingsIcon } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account and platform preferences</p>
      </div>

      <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
        <SettingsIcon className="w-16 h-16 text-muted-foreground/20 mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground">Coming Soon</h3>
        <p className="text-sm text-muted-foreground/70 mt-1 max-w-md">
          Account settings, API keys, team management, and platform configuration will be available here.
        </p>
      </div>
    </div>
  );
}
