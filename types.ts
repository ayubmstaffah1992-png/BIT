

export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  STUDENT = 'STUDENT',
  PARENT = 'PARENT'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  phone?: string;
  avatar?: string;
  password?: string;
}

export interface Student extends User {
  studentId: string;
  courseId: string;
  attendancePercentage: number;
  feesCleared: boolean;
  parentId: string;
}

export type AccessPermission = 'None' | 'Viewer' | 'Editor';

export interface StaffPermissions {
  // Administration
  admin_stats: AccessPermission;
  admin_students: AccessPermission;
  admin_staff: AccessPermission;
  admin_attendance: AccessPermission;
  
  // Academics
  acad_data: AccessPermission; // Departments, Courses, Modules
  acad_timetable: AccessPermission;
  acad_reports: AccessPermission;

  // Accounting
  acc_overview: AccessPermission;
  acc_fees: AccessPermission;
  acc_payments: AccessPermission;
  acc_expenses: AccessPermission;
  acc_inventory: AccessPermission;

  // Communication
  comm_general: AccessPermission;

  // Learning
  lms_content: AccessPermission;

  // Election
  admin_election: AccessPermission;
}

export interface Staff extends User {
  staffId: string;
  staffType: 'Faculty' | 'Support';
  department?: string;
  designation: string;
  permissions: StaffPermissions;
}

export interface Parent extends User {
  parentId: string;
  studentIds: string[];
}

export interface Department {
  id: string;
  name: string;
  headOfDept: string; // Staff ID
}

export interface Course {
  id: string;
  name: string;
  departmentId: string;
  mode: 'Physical' | 'Online';
  fee: number;
  installments: number;
  duration: string;
  level: 'Certificate' | 'CPD' | 'Diploma' | 'Bachelor';
}

export interface Module {
  id: string;
  courseId: string;
  name: string;
  code: string;
  lecturerId: string;
  credits: number;
  mode: 'Physical' | 'Online';
}

export interface AttendanceRecord {
  id: string;
  studentId?: string;
  staffId?: string;
  date: string;
  status: 'Present' | 'Absent' | 'Late';
}

export interface FinancialRecord {
  id: string;
  type: 'Income' | 'Expense';
  category: string;
  amount: number;
  date: string;
  description: string;
  studentId?: string; // For fee payments
  reference?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  lastUpdated: string;
}

export interface ChartAccount {
  id: string;
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Income' | 'Expense' | 'Equity';
}

export interface CommunicationLog {
  id: string;
  date: string;
  sender: string;
  recipientGroup: string; // e.g., "Faculty Staff", "Diploma Students"
  recipientCount: number;
  type: 'SMS' | 'Email';
  subject?: string;
  message: string;
  status: 'Sent' | 'Failed';
}

export interface QuizQuestion {
  id: string;
  text: string;
  type: 'MCQ' | 'ShortAnswer' | 'TrueFalse' | 'Matching';
  options?: string[]; // For MCQ
  correctAnswer: string | number | boolean; // Index for MCQ, string for text, boolean for TF
  explanation?: string;
  matchingPairs?: {left: string, right: string}[]; // For Matching
}

export interface LearningMaterial {
  id: string;
  title: string;
  type: 'PDF' | 'Video' | 'Link';
  url: string; // Or base64 data for offline
  description?: string;
}

export interface LibraryResource {
  id: string;
  title: string;
  author: string;
  departmentId: string;
  courseId: string; // e.g., c3 for Pharmacy
  moduleId?: string;
  type: 'Textbook' | 'Manual' | 'Guide' | 'Reference';
  format: 'PDF' | 'HTML' | 'Image';
  relevance: 'Mandatory' | 'Supplementary';
  referenceStandard?: string; // e.g. "Tanzania Pharmaceutical Handbook"
  content: string; // Base64 string or HTML text
  uploadDate: string;
  size?: string;
}

export interface Quiz {
  id: string;
  title: string;
  durationMinutes: number;
  questions: QuizQuestion[];
  status: 'Draft' | 'Scheduled' | 'Active' | 'Completed';
  scheduledDate?: string; // ISO Date String
  startedAt?: string; // ISO Timestamp when switched to Active
}

export interface DiscussionMessage {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  content: string; 
  type: 'text' | 'audio';
  timestamp: string;
}

export interface CompetencyLevel {
  id: string;
  levelNumber: number;
  title: string;
  description: string;
  materials: LearningMaterial[];
  quiz?: Quiz;
  discussions?: DiscussionMessage[];
  liveSessionActive?: boolean;
}

export interface ModuleContent {
  moduleId: string;
  levels: CompetencyLevel[];
}

export interface LiveSession {
  id: string;
  courseId: string;
  title: string;
  active: boolean;
}

export interface GradeRule {
  grade: string;
  minScore: number;
  maxScore: number;
  points: number;
  status: 'Pass' | 'Fail';
}

export interface GradingScheme {
  contextId: string; // 'default' or courseId
  rules: GradeRule[];
}

export interface SystemSettings {
  instituteName: string;
  instituteAddress: string;
  contactEmail: string;
  contactPhone: string;
  currentSemester: string;
  academicYear: string;
  semesterStartDate: string;
  semesterEndDate: string;
  minAttendancePercent: number; // Default 90
  gradingSchemes: GradingScheme[];
}

// --- ELECTION MODULE TYPES ---
export type ElectionPhase = 'IDLE' | 'REGISTRATION' | 'REGISTRATION_CLOSED' | 'VOTING' | 'ENDED';

export interface ElectionPosition {
  id: string;
  title: string;
  description: string;
  maxVotes: number; // Number of candidates a student can pick for this position (usually 1)
}

export interface Candidate {
  id: string;
  studentId: string; // Link to student record
  name: string; // Denormalized for display
  positionId: string;
  manifesto: string;
  photo?: string;
  votes: number;
}
