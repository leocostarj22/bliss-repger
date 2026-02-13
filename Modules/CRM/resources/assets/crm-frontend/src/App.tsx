import { Toaster } from "@/components/ui/toaster";
import { Toaster as HotToaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ThemeProvider } from "@/hooks/use-theme";
import Dashboard from "@/pages/Dashboard";
import Campaigns from "@/pages/Campaigns";
import NewCampaign from "@/pages/campaigns/NewCampaign";
import EditCampaign from "@/pages/campaigns/EditCampaign";
import CampaignDetail from "@/pages/campaigns/CampaignDetail";
import Contacts from "@/pages/Contacts";
import NewContact from "@/pages/contacts/NewContact";
import EditContact from "@/pages/contacts/EditContact";
import ContactDetail from "@/pages/contacts/ContactDetail";
import Automations from "@/pages/Automations";
import AutomationBuilder from "@/pages/automations/AutomationBuilder";
import Analytics from "@/pages/Analytics";
import SettingsPage from "@/pages/Settings";
import NotFound from "./pages/NotFound";
import TemplateEditor from "@/pages/TemplateEditor";
import Templates from "@/pages/Templates";


const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <HotToaster />
      <BrowserRouter
        basename={window.location.pathname.startsWith('/admin/crm/app') ? '/admin/crm/app' : '/'}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/campaigns/new" element={<NewCampaign />} />
            <Route path="/campaigns/:id" element={<CampaignDetail />} />
            <Route path="/campaigns/:id/edit" element={<EditCampaign />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/contacts/new" element={<NewContact />} />
            <Route path="/contacts/:id" element={<ContactDetail />} />
            <Route path="/contacts/:id/edit" element={<EditContact />} />
            <Route path="/automations" element={<Automations />} />
            <Route path="/automations/:id" element={<AutomationBuilder />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/templates/editor" element={<TemplateEditor />} />
            <Route path="/templates/editor/:id" element={<TemplateEditor />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
