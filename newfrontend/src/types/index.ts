// ── Campaign Types ──
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent';

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: CampaignStatus;
  channel?: 'email' | 'sms' | 'whatsapp' | 'gocontact';
  segment_id?: string;
  listId?: string;
  listName?: string;
  content?: string;
  preheader?: string;
  fromName?: string;
  fromEmail?: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
  trackReplies?: boolean;
  useGoogleAnalytics?: boolean;
  isPublic?: boolean;
  physicalAddress?: string;
  sentCount: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate?: number;
  unsubscribedCount?: number;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Contact Types ──
export interface Contact {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  phone?: string;
  source?: string;
  tags: string[];
  listIds: string[];
  status: 'subscribed' | 'unsubscribed' | 'bounced';
  createdAt: string;
  lastActivity?: string;
  openRate: number;
  clickRate: number;
}

export interface ContactList {
  id: string;
  name: string;
  contactCount: number;
  createdAt: string;
}

// ── Template Types ──
export interface EmailTemplate {
  id: string;
  name: string;
  content: string | any; // JSON string or object
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Analytics Types ──
export interface DailyMetric {
  date: string;
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
}

export interface CampaignMetric {
  campaignId: string;
  campaignName: string;
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
}

// ── Dashboard Types ──
export interface DashboardStats {
  totalSent: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  totalContacts: number;
  contactGrowth: number;
  dailyMetrics: DailyMetric[];
  topCampaigns: CampaignMetric[];
  heatmapData: { day: number; hour: number; value: number }[];
}

export interface MainDashboardTicketStats {
  total: number;
  open_count: number;
  resolved_count: number;
  urgent_count: number;
  new_this_week: number;
  resolved_percentage_label: string;
  resolution_rate_30d: number;
  avg_time_formatted: string;
  avg_time_description: string;
}

export interface MainDashboardMessageStats {
  unread: number;
  sent_this_month: number;
  drafts: number;
  starred: number;
  month_label: string;
}

export interface MainDashboardPost {
  id: string;
  title: string | null;
  content: string;
  is_pinned: boolean;
  published_at: string | null;
  likes_count: number;
  liked_by_me: boolean;
  author: {
    id: string | null;
    name: string | null;
    photo_path?: string | null;
  };
}

export interface MainDashboardActivityStats {
  online_users: number;
  accesses_today: number;
  online_window_minutes: number;
}

export interface MainDashboardData {
  tickets: MainDashboardTicketStats;
  messages: MainDashboardMessageStats;
  activity?: MainDashboardActivityStats;
  posts: MainDashboardPost[];
  dailyMetrics?: DailyMetric[];
  topCampaigns?: CampaignMetric[];
  heatmapData?: { day: number; hour: number; value: number }[];
}

// ── Automation Types ──
export interface AutomationNode {
  id: string;
  type: 'trigger' | 'condition' | 'action' | 'delay';
  label: string;
  config: Record<string, any>;
  position: { x: number; y: number };
}

export interface Automation {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'draft';
  nodes: AutomationNode[];
  connections: { from: string; to: string }[];
  triggeredCount: number;
  createdAt: string;
}

// ── Notification Types ──
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

// ── Admin Types ──
export interface Company {
  id: string;
  name: string;
  slug: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  logo?: string | null;
  settings?: Record<string, any>;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  color?: string | null;
  email?: string | null;
  company_id: string;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string | null;
  company_id?: string | null;
  department_id?: string | null;
  role_id?: string | null;
  role?: string | null;
  phone?: string | null;
  bio?: string | null;
  photo_path?: string | null;
  permissions_allow?: string[] | null;
  permissions_deny?: string[] | null;
  is_active: boolean;
  last_login_at?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  display_name?: string | null;
  description?: string | null;
  permissions: string[];
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EmployeeStatus = 'active' | 'inactive' | 'terminated' | 'on_leave' | string;

export interface Employee {
  id: string;
  employee_code?: string | null;
  name: string;
  email?: string | null;
  system_email?: string | null;
  system_password?: string | null;
  has_system_access?: boolean | null;
  nif?: string | null;
  document_type?: string | null;
  document_number?: string | null;
  document_expiration_date?: string | null;
  nis?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  nationality?: string | null;
  marital_status?: string | null;
  spouse_name?: string | null;
  spouse_nif?: string | null;
  spouse_joint_irs?: boolean | null;
  has_children?: boolean | null;
  children_data?: any[] | null;
  phone?: string | null;
  emergency_contact?: string | null;
  emergency_phone?: string | null;
  address?: string | null;
  address_number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  position?: string | null;
  department_id?: string | null;
  company_id?: string | null;
  hire_date?: string | null;
  termination_date?: string | null;
  salary?: number | null;
  hourly_rate?: number | null;
  vacation_days_balance?: number | null;
  last_vacation_calculation?: string | null;
  employment_type?: string | null;
  contract_duration?: number | null;
  auto_renew?: boolean | null;
  status?: EmployeeStatus | null;
  bank_name?: string | null;
  bank_agency?: string | null;
  bank_account?: string | null;
  account_type?: string | null;
  notes?: string | null;
  photo_path?: string | null;
  has_disability?: boolean | null;
  disability_declarant?: boolean | null;
  disability_spouse?: boolean | null;
  disability_dependents?: number | null;
  documents?: any[] | null;
  medical_aptitude_date?: string | null;
  medical_status?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type VacationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | string;

export type VacationType =
  | 'annual_leave'
  | 'maternity_leave'
  | 'paternity_leave'
  | 'sick_leave'
  | 'marriage_leave'
  | 'bereavement_leave'
  | 'study_leave'
  | 'unpaid_leave'
  | 'compensatory_leave'
  | 'advance_leave'
  | 'other'
  | string;

export interface Vacation {
  id: string;
  employee_id: string;
  company_id: string;
  start_date: string;
  end_date: string;
  requested_days: number;
  approved_days?: number | null;
  vacation_year?: number | null;
  vacation_type: VacationType;
  status: VacationStatus;
  requested_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  employee_notes?: string | null;
  manager_notes?: string | null;
  rejection_reason?: string | null;
  approved_by?: string | null;
  rejected_by?: string | null;
  created_by?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PayrollStatus = 'draft' | 'approved' | 'paid' | 'cancelled' | string;

export interface Payroll {
  id: string;
  employee_id: string;
  company_id: string;
  reference_month: number;
  reference_year: number;
  base_salary: number;
  overtime_hours: number;
  overtime_amount: number;
  holiday_allowance: number;
  christmas_allowance: number;
  meal_allowance: number;
  transport_allowance: number;
  other_allowances: number;
  social_security_employee: number;
  social_security_employer?: number | null;
  irs_withholding: number;
  union_fee: number;
  other_deductions: number;
  gross_total: number;
  total_deductions: number;
  net_total: number;
  status?: PayrollStatus | null;
  pdf_path?: string | null;
  notes?: string | null;
  created_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TimesheetStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'early_leave'
  | 'holiday'
  | 'sick_leave'
  | 'vacation'
  | string;

export type TimesheetDayType = 'workday' | 'weekend' | 'holiday' | 'vacation' | string;

export interface Timesheet {
  id: string;
  employee_id: string;
  company_id: string;
  work_date: string;
  clock_in?: string | null;
  lunch_start?: string | null;
  lunch_end?: string | null;
  clock_out?: string | null;
  total_hours: number;
  lunch_hours?: number | null;
  overtime_hours: number;
  expected_hours?: number | null;
  status: TimesheetStatus;
  day_type?: TimesheetDayType | null;
  ip_address?: string | null;
  location?: string | null;
  device_info?: string | null;
  employee_notes?: string | null;
  manager_notes?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CommunicationMessageFolder = 'inbox' | 'sent' | 'archived' | string;

export interface InternalMessage {
  id: string;
  thread_id?: string | null;
  from_user_id: string;
  to_user_id: string;
  subject: string;
  body: string;
  folder?: CommunicationMessageFolder | null;
  read_at?: string | null;
  sent_at?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  createdAt: string;
  user?: {
    id: string | null;
    name: string | null;
    photo_path?: string | null;
  };
}

export interface AdminPost {
  id: string;
  title: string | null;
  content: string;
  type: 'text' | 'image' | 'video' | 'announcement' | string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent' | string | null;
  is_pinned: boolean;
  featured_image_url?: string | null;
  youtube_video_url?: string | null;
  attachment_urls?: string[];
  published_at: string | null;
  expires_at?: string | null;
  likes_count: number;
  liked_by_me: boolean;
  author: {
    id: string | null;
    name: string | null;
    photo_path?: string | null;
  };
  can_pin?: boolean;
  can_manage?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface VideoCallMeeting {
  id: string;
  title: string;
  meet_url: string;
  scheduled_at?: string | null;
  created_by: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlissProductDescription {
  product_id: string;
  language_id: number;
  name: string;
  description?: string | null;
}

export interface BlissProduct {
  product_id: string;
  model: string;
  price?: number | null;
  quantity?: number | null;
  status?: boolean | null;
  date_added?: string | null;
  date_modified?: string | null;
  image?: string | null;
  image_url?: string | null;
  description?: BlissProductDescription | null;
}

export interface BlissCustomer {
  customer_id: string;
  firstname: string;
  lastname: string;
  email: string;
  telephone?: string | null;
  status?: boolean | null;
  date_added?: string | null;
}

export interface BlissOrderStatus {
  order_status_id: string;
  language_id: number;
  name: string;
}

export interface BlissOrderProduct {
  order_product_id: string;
  order_id: string;
  product_id: string;
  name: string;
  model: string;
  quantity: number;
  price: number;
  total: number;
  tax?: number | null;
  reward?: number | null;
  image_url?: string | null;
}

export interface BlissOrder {
  order_id: string;
  invoice_no?: string | null;
  customer_id: string;
  firstname: string;
  lastname: string;
  email: string;
  telephone?: string | null;
  total: number;
  order_status_id: string;
  date_added?: string | null;
  date_modified?: string | null;
  payment_method?: string | null;
  shipping_method?: string | null;
  status?: BlissOrderStatus | null;
  products?: BlissOrderProduct[];
}

export interface MyFormulaProductDescription {
  product_id: string;
  language_id: number;
  name: string;
  description?: string | null;
}

export interface MyFormulaProduct {
  product_id: string;
  model: string;
  sku?: string | null;
  price?: number | null;
  quantity?: number | null;
  status?: boolean | null;
  date_added?: string | null;
  description?: MyFormulaProductDescription | null;
}

export interface MyFormulaCustomer {
  customer_id: string;
  firstname: string;
  lastname: string;
  email: string;
  telephone?: string | null;
  status?: boolean | null;
  date_added?: string | null;
}

export interface MyFormulaOrderStatus {
  order_status_id: string;
  language_id: number;
  name: string;
}

export interface MyFormulaOrderProduct {
  order_product_id: string;
  order_id: string;
  product_id: string;
  name: string;
  model: string;
  quantity: number;
  price: number;
  total: number;
  tax?: number | null;
}

export interface MyFormulaQuiz {
  quiz_id: string;
  post: any;
  date_added?: string | null;
}

export interface MyFormulaOrder {
  order_id: string;
  invoice_no?: string | null;
  store_name?: string | null;
  customer_id: string;
  firstname: string;
  lastname: string;
  email: string;
  telephone?: string | null;
  total: number;
  order_status_id: string;
  date_added?: string | null;
  date_modified?: string | null;
  payment_method?: string | null;
  payment_code?: string | null;
  approved?: boolean | number | null;
  status?: MyFormulaOrderStatus | null;
  products?: MyFormulaOrderProduct[];
  quiz?: MyFormulaQuiz | null;
}

export interface EspacoAbsolutoCustomer {
  id: number;
  name: string;
  email: string;
  phone: string;
  origin: string;
  status: boolean;
  registered_at: string;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EspacoAbsolutoAppointment {
  id: number;
  customer_id: number;
  treatment: string;
  scheduled_at: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EspacoAbsolutoUserGroup {
  id: number;
  name: string;
  dashboard: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EspacoAbsolutoUserMessage {
  id: number;
  user_id: number;
  email: string;
  subject: string;
  message: string;
  note: string | null;
  date: string;
  created_at: string;
  updated_at: string;
}

// ── Support Types ──
export type SupportTicketStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
export type SupportTicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface SupportCategory {
  id: string;
  company_id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupportTicketAttachment {
  id: string;
  ticket_id: string;
  user_id: string;
  ticket_comment_id?: string | null;
  original_name: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  disk: string;
  created_at: string;
  updated_at: string;
}

export interface SupportTicketComment {
  id: string;
  ticket_id: string;
  user_id: string;
  user_type: string;
  comment: string;
  is_internal: boolean;
  is_solution: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupportTicket {
  id: string;
  company_id: string;
  title: string;
  description: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  category_id?: string | null;
  department_id?: string | null;
  user_id: string;
  user_type: string;
  assigned_to?: string | null;
  due_date?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
}

// ── Finance Types ──
export interface FinanceBankAccount {
  id: string;
  company_id: string;
  name: string;
  bank_name: string;
  account_number: string;
  currency: string;
  initial_balance: number;
  current_balance: number;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceCategory {
  id: string;
  company_id: string;
  parent_id?: string | null;
  name: string;
  type: 'income' | 'expense';
  color?: string | null;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceCostCenter {
  id: string;
  company_id: string;
  name: string;
  code: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceTransaction {
  id: string;
  company_id: string;
  description: string;
  notes?: string | null;
  amount: number;
  due_date?: string | null;
  paid_at?: string | null;
  type: 'income' | 'expense';
  status: 'pending' | 'paid' | 'late' | 'cancelled';
  category_id?: string | null;
  cost_center_id?: string | null;
  bank_account_id?: string | null;
  payer_type?: string | null;
  payer_id?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SystemLogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical' | string;

export interface SystemLog {
  id: string;
  user_id?: string | null;
  action: string;
  model_type?: string | null;
  model_id?: string | null;
  description?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  level: SystemLogLevel;
  context?: any;
  created_at: string;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date?: string | null;
  start_date?: string | null;
  completed_at?: string | null;
  is_all_day: boolean;
  location?: string | null;
  notes?: string | null;
  attachments?: any[];
  taskable_type?: string | null;
  taskable_id?: string | null;
  calendar_event_id?: string | null;
  recurrence_rule?: any;
  is_private: boolean;
  user_id?: string | null;
  shared_with_user_ids?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PersonalNote {
  id: string;
  user_id: string;
  title: string;
  content: string;
  color?: string | null;
  is_favorite: boolean;
  last_modified_by?: string | null;
  shared_with_user_ids?: string[];
  createdAt: string;
  updatedAt: string;
}

// ── API Response wrapper ──
export interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}