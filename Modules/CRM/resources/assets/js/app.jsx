import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Layouts
import MainLayout from './layouts/MainLayout';

// Pages (Placeholders for now)
import Dashboard from './features/dashboard/Dashboard';
import CampaignList from './features/campaigns/CampaignList';
import CampaignEditor from './features/campaigns/CampaignEditor';
import ContactList from './features/contacts/ContactList';
import AutomationBuilder from './features/automations/AutomationBuilder';

const queryClient = new QueryClient();

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter basename="/admin/crm/app">
                <Routes>
                    <Route path="/" element={<MainLayout />}>
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="campaigns" element={<CampaignList />} />
                        <Route path="campaigns/new" element={<CampaignEditor />} />
                        <Route path="campaigns/:id" element={<CampaignEditor />} />
                        <Route path="contacts" element={<ContactList />} />
                        <Route path="automations" element={<AutomationBuilder />} />
                    </Route>
                </Routes>
            </BrowserRouter>
            <Toaster position="top-right" />
        </QueryClientProvider>
    );
}

const rootElement = document.getElementById('crm-root');
if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}