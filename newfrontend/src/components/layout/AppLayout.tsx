import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ChatDock } from '@/components/communication/ChatDock';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AppSidebar } from './AppSidebar';
import { Topbar } from './Topbar';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onOpen = () => setMobileOpen(true);
    const onClose = () => setMobileOpen(false);
    window.addEventListener('nexterp:sidebar:open', onOpen);
    window.addEventListener('nexterp:sidebar:close', onClose);
    return () => {
      window.removeEventListener('nexterp:sidebar:open', onOpen);
      window.removeEventListener('nexterp:sidebar:close', onClose);
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex w-full min-h-screen bg-background">
      <div className="hidden md:block">
        <AppSidebar />
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="overflow-auto flex-1 p-6">
          <Outlet />
        </main>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-screen h-svh max-w-none sm:w-[360px] sm:h-auto">
          <AppSidebar fullWidth onRequestClose={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <ChatDock />
    </div>
  );
}
