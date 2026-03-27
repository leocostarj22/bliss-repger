import { useEffect, useState, type ReactElement } from "react";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as HotToaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { fetchMyAccess } from "@/services/api";
import { hasEffectivePermission } from "@/lib/utils";
import { ThemeProvider } from "@/hooks/use-theme";
import Dashboard from "@/pages/Dashboard";
import EmployeeDashboard from "@/pages/EmployeeDashboard";
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
import Modules from "@/pages/admin/modules/Modules";
import BankAccounts from "@/pages/finance/BankAccounts";
import FinanceCategories from "@/pages/finance/FinanceCategories";
import FinanceCostCenters from "@/pages/finance/FinanceCostCenters";
import FinanceTransactions from "@/pages/finance/FinanceTransactions";
import SystemLogs from "@/pages/reports/SystemLogs";
import SystemLogDetail from "@/pages/reports/SystemLogDetail";
import MyTasks from "@/pages/personal/MyTasks";
import TaskForm from "@/pages/personal/TaskForm";
import MyNotes from "@/pages/personal/MyNotes";
import NoteForm from "@/pages/personal/NoteForm";
import HrEmployees from "@/pages/hr/Employees";
import HrEmployeeForm from "@/pages/hr/EmployeeDetail";
import HrEmployeeDetail from "@/pages/hr/EmployeeForm";
import HrPayrolls from "@/pages/hr/Payrolls";
import HrPayrollForm from "@/pages/hr/PayrollDetail";
import HrVacations from "@/pages/hr/Vacations";
import HrVacationForm from "@/pages/hr/VacationDetail";
import HrTimesheets from "@/pages/hr/Timesheets";
import HrTimesheetForm from "@/pages/hr/TimesheetDetail";
import MeHrVacations from "@/pages/me/hr/Vacations";
import MeHrVacationDetail from "@/pages/me/hr/VacationDetail";
import MeHrTimesheets from "@/pages/me/hr/Timesheets";
import MeHrTimesheetDetail from "@/pages/me/hr/TimesheetDetail";
import MeHrPayrolls from "@/pages/me/hr/Payrolls";
import MeHrPayrollDetail from "@/pages/me/hr/PayrollDetail";
import MeSupportTickets from "@/pages/me/support/Tickets";
import MeSupportTicketDetail from "@/pages/me/support/TicketDetail";
import CommVideoCall from "@/pages/communication/VideoCall";
import CommInternalMessages from "@/pages/communication/InternalMessages";
import CommChat from "@/pages/communication/Chat";
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
import MyFormulaProductEdit from "@/pages/myformula/ProductEdit";
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

function AccessDenied(props: { title?: string; description?: string }) {
  const title = props.title ?? "Acesso restrito"
  const description = props.description ?? "O teu cargo não tem permissão para ver esta página."

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">Permissões</p>
        <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
      </div>
      <div className="glass-card p-6 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 mt-0.5" />
        <div className="space-y-3">
          <div>
            <div className="font-semibold">{title}</div>
            <div className="text-sm text-muted-foreground">{description}</div>
          </div>
          <Button variant="outline" asChild>
            <Link to="/">Voltar</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

function RequirePermission(props: { permission: string | string[]; children: ReactElement }) {
  const { permission, children } = props
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const permKey = Array.isArray(permission) ? permission.join("|") : String(permission)

  useEffect(() => {
    let alive = true
    setAllowed(null)

    fetchMyAccess()
      .then((r) => {
        if (!alive) return
        const ok =
          Boolean(r.data.isAdmin) ||
          hasEffectivePermission(r.data.permissions, r.data.permissionsDeny, permission)
        setAllowed(ok)
      })
      .catch(() => {
        if (!alive) return
        setAllowed(false)
      })

    return () => {
      alive = false
    }
  }, [permKey])

  if (allowed === null) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">A carregar…</h1>
          <p className="page-subtitle">Permissões</p>
          <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
        </div>
        <div className="glass-card p-6">
          <div className="text-sm text-muted-foreground">A validar acesso…</div>
        </div>
      </div>
    )
  }

  if (!allowed) {
    return <AccessDenied />
  }

  return children
}

function Home() {
  const [isEmployeeRole, setIsEmployeeRole] = useState<boolean | null>(null)

  useEffect(() => {
    let alive = true
    setIsEmployeeRole(null)

    fetchMyAccess()
      .then((r) => {
        if (!alive) return
        setIsEmployeeRole(Boolean(r.data.isEmployeeRole))
      })
      .catch(() => {
        if (!alive) return
        setIsEmployeeRole(false)
      })

    return () => {
      alive = false
    }
  }, [])

  if (isEmployeeRole === null) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">A carregar…</h1>
          <p className="page-subtitle">Início</p>
          <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
        </div>
        <div className="glass-card p-6">
          <div className="text-sm text-muted-foreground">A preparar o painel…</div>
        </div>
      </div>
    )
  }

  if (isEmployeeRole) {
    return <EmployeeDashboard />
  }

  return <Dashboard />
}

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
              <Route path="/" element={<Home />} />
              <Route path="/gmcentral" element={<Navigate to="/" replace />} />

              <Route path="/admin" element={<Navigate to="/" replace />} />
              <Route
                path="/admin/companies"
                element={
                  <RequirePermission permission="admin.companies.read">
                    <Companies />
                  </RequirePermission>
                }
              />
              <Route
                path="/admin/companies/new"
                element={
                  <RequirePermission permission="admin.companies.write">
                    <CompanyForm />
                  </RequirePermission>
                }
              />
              <Route
                path="/admin/companies/:id"
                element={
                  <RequirePermission permission="admin.companies.read">
                    <CompanyDetail />
                  </RequirePermission>
                }
              />
              <Route
                path="/admin/companies/:id/edit"
                element={
                  <RequirePermission permission="admin.companies.write">
                    <CompanyForm />
                  </RequirePermission>
                }
              />

              <Route
                path="/admin/departments"
                element={
                  <RequirePermission permission="admin.departments.read">
                    <Departments />
                  </RequirePermission>
                }
              />
              <Route
                path="/admin/departments/new"
                element={
                  <RequirePermission permission="admin.departments.write">
                    <DepartmentForm />
                  </RequirePermission>
                }
              />
              <Route
                path="/admin/departments/:id"
                element={
                  <RequirePermission permission="admin.departments.read">
                    <DepartmentDetail />
                  </RequirePermission>
                }
              />
              <Route
                path="/admin/departments/:id/edit"
                element={
                  <RequirePermission permission="admin.departments.write">
                    <DepartmentForm />
                  </RequirePermission>
                }
              />
              <Route
                path="/admin/modules"
                element={
                  <RequirePermission permission="admin.modules.manage">
                    <Modules />
                  </RequirePermission>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <RequirePermission permission="admin.users.read">
                    <Users />
                  </RequirePermission>
                }
              />
              <Route
                path="/admin/users/new"
                element={
                  <RequirePermission permission="admin.users.write">
                    <UserForm />
                  </RequirePermission>
                }
              />
              <Route
                path="/admin/users/:id"
                element={
                  <RequirePermission permission="admin.users.read">
                    <UserDetail />
                  </RequirePermission>
                }
              />
              <Route
                path="/admin/users/:id/edit"
                element={
                  <RequirePermission permission="admin.users.write">
                    <UserForm />
                  </RequirePermission>
                }
              />
              <Route
                path="/admin/roles"
                element={
                  <RequirePermission permission="admin.roles.read">
                    <Roles />
                  </RequirePermission>
                }
              />
              <Route
                path="/admin/roles/new"
                element={
                  <RequirePermission permission="admin.roles.write">
                    <RoleForm />
                  </RequirePermission>
                }
              />
              <Route
                path="/admin/roles/:id"
                element={
                  <RequirePermission permission="admin.roles.read">
                    <RoleDetail />
                  </RequirePermission>
                }
              />
              <Route
                path="/admin/roles/:id/edit"
                element={
                  <RequirePermission permission="admin.roles.write">
                    <RoleForm />
                  </RequirePermission>
                }
              />

              <Route
                path="/support"
                element={
                  <RequirePermission
                    permission={[
                      "support.tickets.read",
                      "support.tickets.write",
                      "support.categories.read",
                      "support.categories.write",
                      "support.*",
                    ]}
                  >
                    <Navigate to="/support/tickets" replace />
                  </RequirePermission>
                }
              />
              <Route
                path="/support/categories"
                element={
                  <RequirePermission permission={["support.categories.read", "support.categories.write"]}>
                    <SupportCategories />
                  </RequirePermission>
                }
              />
              <Route
                path="/support/tickets"
                element={
                  <RequirePermission permission={["support.tickets.read", "support.tickets.write"]}>
                    <SupportTickets />
                  </RequirePermission>
                }
              />

              <Route
                path="/finance"
                element={
                  <RequirePermission
                    permission={[
                      "finance.bank-accounts.read",
                      "finance.bank-accounts.write",
                      "finance.categories.read",
                      "finance.categories.write",
                      "finance.cost-centers.read",
                      "finance.cost-centers.write",
                      "finance.transactions.read",
                      "finance.transactions.write",
                      "finance.*",
                    ]}
                  >
                    <Navigate to="/finance/bank-accounts" replace />
                  </RequirePermission>
                }
              />
              <Route
                path="/finance/bank-accounts"
                element={
                  <RequirePermission permission={["finance.bank-accounts.read", "finance.bank-accounts.write"]}>
                    <BankAccounts />
                  </RequirePermission>
                }
              />
              <Route
                path="/finance/categories"
                element={
                  <RequirePermission permission={["finance.categories.read", "finance.categories.write"]}>
                    <FinanceCategories />
                  </RequirePermission>
                }
              />
              <Route
                path="/finance/cost-centers"
                element={
                  <RequirePermission permission={["finance.cost-centers.read", "finance.cost-centers.write"]}>
                    <FinanceCostCenters />
                  </RequirePermission>
                }
              />
              <Route
                path="/finance/transactions"
                element={
                  <RequirePermission permission={["finance.transactions.read", "finance.transactions.write"]}>
                    <FinanceTransactions />
                  </RequirePermission>
                }
              />

              <Route
                path="/hr"
                element={
                  <RequirePermission
                    permission={[
                      "hr.employees.read",
                      "hr.employees.write",
                      "hr.payrolls.read",
                      "hr.payrolls.write",
                      "hr.vacations.read",
                      "hr.vacations.write",
                      "hr.timesheets.read",
                      "hr.timesheets.write",
                      "hr.*",
                    ]}
                  >
                    <Navigate to="/hr/employees" replace />
                  </RequirePermission>
                }
              />
              <Route
                path="/hr/employees"
                element={
                  <RequirePermission permission={["hr.employees.read", "hr.employees.write"]}>
                    <HrEmployees />
                  </RequirePermission>
                }
              />
              <Route
                path="/hr/employees/new"
                element={
                  <RequirePermission permission="hr.employees.write">
                    <HrEmployeeForm />
                  </RequirePermission>
                }
              />
              <Route
                path="/hr/employees/:id"
                element={
                  <RequirePermission permission={["hr.employees.read", "hr.employees.write"]}>
                    <HrEmployeeDetail />
                  </RequirePermission>
                }
              />
              <Route
                path="/hr/employees/:id/edit"
                element={
                  <RequirePermission permission="hr.employees.write">
                    <HrEmployeeForm />
                  </RequirePermission>
                }
              />
              <Route
                path="/hr/payrolls"
                element={
                  <RequirePermission permission={["hr.payrolls.read", "hr.payrolls.write"]}>
                    <HrPayrolls />
                  </RequirePermission>
                }
              />
              <Route
                path="/hr/payrolls/new"
                element={
                  <RequirePermission permission="hr.payrolls.write">
                    <HrPayrollForm />
                  </RequirePermission>
                }
              />
              <Route
                path="/hr/payrolls/:id/edit"
                element={
                  <RequirePermission permission="hr.payrolls.write">
                    <HrPayrollForm />
                  </RequirePermission>
                }
              />
              <Route
                path="/hr/vacations"
                element={
                  <RequirePermission permission={["hr.vacations.read", "hr.vacations.write"]}>
                    <HrVacations />
                  </RequirePermission>
                }
              />
              <Route
                path="/hr/vacations/new"
                element={
                  <RequirePermission permission="hr.vacations.write">
                    <HrVacationForm />
                  </RequirePermission>
                }
              />
              <Route
                path="/hr/vacations/:id/edit"
                element={
                  <RequirePermission permission="hr.vacations.write">
                    <HrVacationForm />
                  </RequirePermission>
                }
              />
              <Route
                path="/hr/timesheets"
                element={
                  <RequirePermission permission={["hr.timesheets.read", "hr.timesheets.write"]}>
                    <HrTimesheets />
                  </RequirePermission>
                }
              />
              <Route
                path="/hr/timesheets/new"
                element={
                  <RequirePermission permission="hr.timesheets.write">
                    <HrTimesheetForm />
                  </RequirePermission>
                }
              />
              <Route
                path="/hr/timesheets/:id/edit"
                element={
                  <RequirePermission permission="hr.timesheets.write">
                    <HrTimesheetForm />
                  </RequirePermission>
                }
              />

              <Route path="/me/hr" element={<Navigate to="/me/hr/vacations" replace />} />
              <Route path="/me/hr/vacations" element={<MeHrVacations />} />
              <Route path="/me/hr/vacations/new" element={<MeHrVacationDetail />} />
              <Route path="/me/hr/vacations/:id" element={<MeHrVacationDetail />} />
              <Route path="/me/hr/payrolls" element={<MeHrPayrolls />} />
              <Route path="/me/hr/payrolls/:id" element={<MeHrPayrollDetail />} />
              <Route path="/me/hr/timesheets" element={<MeHrTimesheets />} />
              <Route path="/me/hr/timesheets/new" element={<MeHrTimesheetDetail />} />
              <Route path="/me/hr/timesheets/:id" element={<MeHrTimesheetDetail />} />

              <Route path="/me/support" element={<Navigate to="/me/support/tickets" replace />} />
              <Route path="/me/support/tickets" element={<MeSupportTickets />} />
              <Route path="/me/support/tickets/new" element={<MeSupportTicketDetail />} />
              <Route path="/me/support/tickets/:id" element={<MeSupportTicketDetail />} />

              <Route
                path="/communication"
                element={
                  <RequirePermission
                    permission={[
                      "communication.video-call.access",
                      "communication.chat.access",
                      "communication.messages.read",
                      "communication.messages.write",
                      "communication.posts.read",
                      "communication.posts.write",
                      "communication.*",
                    ]}
                  >
                    <Navigate to="/communication/video-call" replace />
                  </RequirePermission>
                }
              />
              <Route
                path="/communication/video-call"
                element={
                  <RequirePermission permission="communication.video-call.access">
                    <CommVideoCall />
                  </RequirePermission>
                }
              />
              <Route
                path="/communication/messages"
                element={
                  <RequirePermission permission={["communication.messages.read", "communication.messages.write"]}>
                    <CommInternalMessages />
                  </RequirePermission>
                }
              />
              <Route
                path="/communication/chat"
                element={
                  <RequirePermission permission="communication.chat.access">
                    <CommChat />
                  </RequirePermission>
                }
              />
              <Route
                path="/communication/posts"
                element={
                  <RequirePermission permission={["communication.posts.read", "communication.posts.write"]}>
                    <CommAdminPosts />
                  </RequirePermission>
                }
              />

              <Route
                path="/blissnatura"
                element={
                  <RequirePermission
                    permission={[
                      "blissnatura.dashboard.read",
                      "blissnatura.orders.read",
                      "blissnatura.customers.read",
                      "blissnatura.products.read",
                      "blissnatura.products.write",
                      "blissnatura.*",
                    ]}
                  >
                    <Navigate to="/blissnatura/dashboard" replace />
                  </RequirePermission>
                }
              />
              <Route
                path="/blissnatura/dashboard"
                element={
                  <RequirePermission permission="blissnatura.dashboard.read">
                    <BlissNaturaDashboard />
                  </RequirePermission>
                }
              />
              <Route
                path="/blissnatura/orders"
                element={
                  <RequirePermission permission="blissnatura.orders.read">
                    <BlissNaturaOrders />
                  </RequirePermission>
                }
              />
              <Route
                path="/blissnatura/orders/:id"
                element={
                  <RequirePermission permission="blissnatura.orders.read">
                    <BlissNaturaOrderDetail />
                  </RequirePermission>
                }
              />
              <Route
                path="/blissnatura/customers"
                element={
                  <RequirePermission permission="blissnatura.customers.read">
                    <BlissNaturaCustomers />
                  </RequirePermission>
                }
              />
              <Route
                path="/blissnatura/products"
                element={
                  <RequirePermission permission={["blissnatura.products.read", "blissnatura.products.write"]}>
                    <BlissNaturaProducts />
                  </RequirePermission>
                }
              />
              <Route
                path="/blissnatura/products/:id/edit"
                element={
                  <RequirePermission permission="blissnatura.products.write">
                    <BlissNaturaProductEdit />
                  </RequirePermission>
                }
              />

              <Route
                path="/espacoabsoluto"
                element={
                  <RequirePermission permission={["espacoabsoluto.customers.read", "espacoabsoluto.*"]}>
                    <Navigate to="/espacoabsoluto/customers" replace />
                  </RequirePermission>
                }
              />
              <Route
                path="/espacoabsoluto/customers"
                element={
                  <RequirePermission permission="espacoabsoluto.customers.read">
                    <EspacoAbsolutoCustomers />
                  </RequirePermission>
                }
              />

              <Route
                path="/myformula"
                element={
                  <RequirePermission
                    permission={[
                      "myformula.dashboard.read",
                      "myformula.orders.read",
                      "myformula.customers.read",
                      "myformula.products.read",
                      "myformula.products.write",
                      "myformula.quizzes.read",
                      "myformula.quizzes.write",
                      "myformula.*",
                    ]}
                  >
                    <Navigate to="/myformula/dashboard" replace />
                  </RequirePermission>
                }
              />
              <Route
                path="/myformula/dashboard"
                element={
                  <RequirePermission permission="myformula.dashboard.read">
                    <MyFormulaDashboard />
                  </RequirePermission>
                }
              />
              <Route
                path="/myformula/orders"
                element={
                  <RequirePermission permission="myformula.orders.read">
                    <MyFormulaOrders />
                  </RequirePermission>
                }
              />
              <Route
                path="/myformula/orders/:id"
                element={
                  <RequirePermission permission="myformula.orders.read">
                    <MyFormulaOrderDetail />
                  </RequirePermission>
                }
              />
              <Route
                path="/myformula/customers"
                element={
                  <RequirePermission permission="myformula.customers.read">
                    <MyFormulaCustomers />
                  </RequirePermission>
                }
              />
              <Route
                path="/myformula/products"
                element={
                  <RequirePermission permission={["myformula.products.read", "myformula.products.write"]}>
                    <MyFormulaProducts />
                  </RequirePermission>
                }
              />
              <Route
                path="/myformula/products/:id/edit"
                element={
                  <RequirePermission permission="myformula.products.write">
                    <MyFormulaProductEdit />
                  </RequirePermission>
                }
              />
              <Route
                path="/myformula/quizzes"
                element={
                  <RequirePermission permission={["myformula.quizzes.read", "myformula.quizzes.write"]}>
                    <MyFormulaQuizzes />
                  </RequirePermission>
                }
              />

              <Route
                path="/reports"
                element={
                  <RequirePermission permission={["reports.system-logs.read", "reports.*"]}>
                    <Navigate to="/reports/system-logs" replace />
                  </RequirePermission>
                }
              />
              <Route
                path="/reports/system-logs"
                element={
                  <RequirePermission permission="reports.system-logs.read">
                    <SystemLogs />
                  </RequirePermission>
                }
              />
              <Route
                path="/reports/system-logs/:id"
                element={
                  <RequirePermission permission="reports.system-logs.read">
                    <SystemLogDetail />
                  </RequirePermission>
                }
              />

              <Route
                path="/personal"
                element={
                  <RequirePermission
                    permission={[
                      "personal.tasks.read",
                      "personal.tasks.write",
                      "personal.notes.read",
                      "personal.notes.write",
                      "personal.*",
                    ]}
                  >
                    <Navigate to="/personal/tasks" replace />
                  </RequirePermission>
                }
              />
              <Route
                path="/personal/tasks"
                element={
                  <RequirePermission permission={["personal.tasks.read", "personal.tasks.write"]}>
                    <MyTasks />
                  </RequirePermission>
                }
              />
              <Route
                path="/personal/tasks/new"
                element={
                  <RequirePermission permission="personal.tasks.write">
                    <TaskForm />
                  </RequirePermission>
                }
              />
              <Route
                path="/personal/tasks/:id/edit"
                element={
                  <RequirePermission permission="personal.tasks.write">
                    <TaskForm />
                  </RequirePermission>
                }
              />
              <Route
                path="/personal/notes"
                element={
                  <RequirePermission permission={["personal.notes.read", "personal.notes.write"]}>
                    <MyNotes />
                  </RequirePermission>
                }
              />
              <Route
                path="/personal/notes/new"
                element={
                  <RequirePermission permission="personal.notes.write">
                    <NoteForm />
                  </RequirePermission>
                }
              />
              <Route
                path="/personal/notes/:id/edit"
                element={
                  <RequirePermission permission="personal.notes.write">
                    <NoteForm />
                  </RequirePermission>
                }
              />
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