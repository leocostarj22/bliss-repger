import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ChatDock } from '@/components/communication/ChatDock';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AppSidebar } from './AppSidebar';
import { Topbar } from './Topbar';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setMobileOpen(true);
    window.addEventListener('gmcentral:sidebar:open', onOpen);
    return () => window.removeEventListener('gmcentral:sidebar:open', onOpen);
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <div className="hidden md:block">
        <AppSidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-screen h-svh max-w-none sm:w-[360px] sm:h-auto">
          <AppSidebar fullWidth />
        </SheetContent>
      </Sheet>

      <ChatDock />
    </div>
  );
}
