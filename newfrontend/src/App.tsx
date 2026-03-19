import { Toaster } from "@/components/ui/toaster";
import { Toaster as HotToaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ThemeProvider } from "@/hooks/use-theme";
import Dashboard from "@/pages/Dashboard";
import NotFound from "./pages/NotFound";
import Companies from "@/pages/admin/companies/Companies";
import CompanyForm from "@/pages/admin/companies/CompanyForm";
import CompanyDetail from "@/pages/admin/companies/CompanyDetail";
import Departments from "@/pages/admin/departments/Departments";
import DepartmentForm from "@/pages/admin/departments/DepartmentForm";
import DepartmentDetail from "@/pages/admin/departments/DepartmentDetail";
import Users from "@/pages/admin/users/Users";
import UserForm from "@/pages/admin/users/UserForm";
import UserDetail from "@/pages/admin/users/UserDetail";
import Roles from "@/pages/admin/roles/Roles";
import RoleForm from "@/pages/admin/roles/RoleForm";
import RoleDetail from "@/pages/admin/roles/RoleDetail";
import BankAccounts from "@/pages/finance/BankAccounts";
import FinanceCategories from "@/pages/finance/FinanceCategories";
import FinanceCostCenters from "@/pages/finance/FinanceCostCenters";
import FinanceTransactions from "@/pages/finance/FinanceTransactions";
import SystemLogs from "@/pages/reports/SystemLogs";
import MyTasks from "@/pages/personal/MyTasks";
import TaskForm from "@/pages/personal/TaskForm";
import MyNotes from "@/pages/personal/MyNotes";
import HrEmployees from "@/pages/hr/Employees";
import HrEmployeeForm from "@/pages/hr/EmployeeDetail";
import HrEmployeeDetail from "@/pages/hr/EmployeeForm";
import HrPayrolls from "@/pages/hr/Payrolls";
import HrPayrollForm from "@/pages/hr/PayrollDetail";
import HrVacations from "@/pages/hr/Vacations";
import HrVacationForm from "@/pages/hr/VacationDetail";
import HrTimesheets from "@/pages/hr/Timesheets";
import HrTimesheetForm from "@/pages/hr/TimesheetDetail";
import CommVideoCall from "@/pages/communication/VideoCall";
import CommInternalMessages from "@/pages/communication/InternalMessages";
import CommAdminPosts from "@/pages/communication/AdminPosts";
import BlissNaturaDashboard from "@/pages/blissnatura/Dashboard";
import BlissNaturaOrders from "@/pages/blissnatura/Orders";
import BlissNaturaCustomers from "@/pages/blissnatura/Customers";
import BlissNaturaProducts from "@/pages/blissnatura/Products";
import BlissNaturaOrderDetail from "@/pages/blissnatura/OrderDetail";
import BlissNaturaProductEdit from "@/pages/blissnatura/ProductEdit";
import EspacoAbsolutoCustomers from "@/pages/espacoabsoluto/Customers";
import SupportCategories from "@/pages/support/SupportCategories";
import SupportTickets from "@/pages/support/Tickets";
import MyFormulaDashboard from "@/pages/myformula/Dashboard";
import MyFormulaOrders from "@/pages/myformula/Orders";
import MyFormulaOrderDetail from "@/pages/myformula/OrderDetail";
import MyFormulaPurchaseReport from "@/pages/myformula/PurchaseReport";
import MyFormulaCustomers from "@/pages/myformula/Customers";
import MyFormulaProducts from "@/pages/myformula/Products";
import MyFormulaQuizzes from "@/pages/myformula/Quizzes";
import Profile from "@/pages/account/Profile";

const queryClient = new QueryClient();

const ComingSoon = ({ title }: { title: string }) => (
  <div className="space-y-6 animate-slide-up">
    <div className="page-header">
      <h1 className="page-title">{title}</h1>
      <p className="page-subtitle">Em construção</p>
      <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
    </div>
    <div className="glass-card p-6">
      <div className="text-sm text-muted-foreground">Esta secção será implementada a seguir.</div>
    </div>
  </div>
);

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <HotToaster />
        <HashRouter>

          <Routes>
            <Route path="/myformula/orders/:id/purchase-report" element={<MyFormulaPurchaseReport />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/gmcentral" element={<Navigate to="/" replace />} />

              <Route path="/admin" element={<Navigate to="/" replace />} />
              <Route path="/admin/companies" element={<Companies />} />
              <Route path="/admin/companies/new" element={<CompanyForm />} />
              <Route path="/admin/companies/:id" element={<CompanyDetail />} />
              <Route path="/admin/companies/:id/edit" element={<CompanyForm />} />

              <Route path="/admin/departments" element={<Departments />} />
              <Route path="/admin/departments/new" element={<DepartmentForm />} />
              <Route path="/admin/departments/:id" element={<DepartmentDetail />} />
              <Route path="/admin/departments/:id/edit" element={<DepartmentForm />} />
              <Route path="/admin/modules" element={<ComingSoon title="Módulos" />} />
              <Route path="/admin/users" element={<Users />} />
              <Route path="/admin/users/new" element={<UserForm />} />
              <Route path="/admin/users/:id" element={<UserDetail />} />
              <Route path="/admin/users/:id/edit" element={<UserForm />} />
              <Route path="/admin/roles" element={<Roles />} />
              <Route path="/admin/roles/new" element={<RoleForm />} />
              <Route path="/admin/roles/:id" element={<RoleDetail />} />
              <Route path="/admin/roles/:id/edit" element={<RoleForm />} />

              <Route path="/support" element={<Navigate to="/support/tickets" replace />} />
              <Route path="/support/categories" element={<SupportCategories />} />
              <Route path="/support/tickets" element={<SupportTickets />} />

              <Route path="/finance" element={<Navigate to="/finance/bank-accounts" replace />} />
              <Route path="/finance/bank-accounts" element={<BankAccounts />} />
              <Route path="/finance/categories" element={<FinanceCategories />} />
              <Route path="/finance/cost-centers" element={<FinanceCostCenters />} />
              <Route path="/finance/transactions" element={<FinanceTransactions />} />

              <Route path="/hr" element={<Navigate to="/hr/employees" replace />} />
              <Route path="/hr/employees" element={<HrEmployees />} />
              <Route path="/hr/employees/new" element={<HrEmployeeForm />} />
              <Route path="/hr/employees/:id" element={<HrEmployeeDetail />} />
              <Route path="/hr/employees/:id/edit" element={<HrEmployeeForm />} />
              <Route path="/hr/payrolls" element={<HrPayrolls />} />
              <Route path="/hr/payrolls/new" element={<HrPayrollForm />} />
              <Route path="/hr/payrolls/:id/edit" element={<HrPayrollForm />} />
              <Route path="/hr/vacations" element={<HrVacations />} />
              <Route path="/hr/vacations/new" element={<HrVacationForm />} />
              <Route path="/hr/vacations/:id/edit" element={<HrVacationForm />} />
              <Route path="/hr/timesheets" element={<HrTimesheets />} />
              <Route path="/hr/timesheets/new" element={<HrTimesheetForm />} />
              <Route path="/hr/timesheets/:id/edit" element={<HrTimesheetForm />} />

              <Route path="/communication" element={<Navigate to="/communication/video-call" replace />} />
              <Route path="/communication/video-call" element={<CommVideoCall />} />
              <Route path="/communication/messages" element={<CommInternalMessages />} />
              <Route path="/communication/posts" element={<CommAdminPosts />} />

              <Route path="/blissnatura" element={<Navigate to="/blissnatura/dashboard" replace />} />
              <Route path="/blissnatura/dashboard" element={<BlissNaturaDashboard />} />
              <Route path="/blissnatura/orders" element={<BlissNaturaOrders />} />
              <Route path="/blissnatura/orders/:id" element={<BlissNaturaOrderDetail />} />
              <Route path="/blissnatura/customers" element={<BlissNaturaCustomers />} />
              <Route path="/blissnatura/products" element={<BlissNaturaProducts />} />
              <Route path="/blissnatura/products/:id/edit" element={<BlissNaturaProductEdit />} />

              <Route path="/espacoabsoluto" element={<Navigate to="/espacoabsoluto/customers" replace />} />
              <Route path="/espacoabsoluto/customers" element={<EspacoAbsolutoCustomers />} />

              <Route path="/myformula" element={<Navigate to="/myformula/dashboard" replace />} />
              <Route path="/myformula/dashboard" element={<MyFormulaDashboard />} />
              <Route path="/myformula/orders" element={<MyFormulaOrders />} />
              <Route path="/myformula/orders/:id" element={<MyFormulaOrderDetail />} />
              <Route path="/myformula/customers" element={<MyFormulaCustomers />} />
              <Route path="/myformula/products" element={<MyFormulaProducts />} />
              <Route path="/myformula/quizzes" element={<MyFormulaQuizzes />} />

              <Route path="/reports" element={<Navigate to="/reports/system-logs" replace />} />
              <Route path="/reports/system-logs" element={<SystemLogs />} />

              <Route path="/personal" element={<Navigate to="/personal/tasks" replace />} />
              <Route path="/personal/tasks" element={<MyTasks />} />
              <Route path="/personal/tasks/new" element={<TaskForm />} />
              <Route path="/personal/tasks/:id/edit" element={<TaskForm />} />
              <Route path="/personal/notes" element={<MyNotes />} />
              <Route path="/admin/profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
