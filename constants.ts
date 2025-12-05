

import { UserRole, Course, Student, FinancialRecord, User, Staff, Department, Module, InventoryItem, ChartAccount, CommunicationLog, ModuleContent, LibraryResource, SystemSettings, StaffPermissions, ElectionPosition, Candidate } from './types';

export const MOCK_DEPARTMENTS: Department[] = [
  { id: 'dept1', name: 'Information Technology', headOfDept: 'st1' },
  { id: 'dept2', name: 'Business Administration', headOfDept: 'st3' },
  { id: 'dept3', name: 'Health & Allied Sciences', headOfDept: 'st4' },
];

export const MOCK_COURSES: Course[] = [
  { id: 'c1', name: 'Diploma in Computer Science', departmentId: 'dept1', mode: 'Physical', fee: 1500000, installments: 4, duration: '2 Years', level: 'Diploma' },
  { id: 'c2', name: 'Certificate in Business Admin', departmentId: 'dept2', mode: 'Online', fee: 900000, installments: 2, duration: '1 Year', level: 'Certificate' },
  { id: 'c3', name: 'Diploma in Pharmaceutical Sciences', departmentId: 'dept3', mode: 'Physical', fee: 2000000, installments: 4, duration: '3 Years', level: 'Diploma' },
];

export const MOCK_MODULES: Module[] = [
  { id: 'm1', courseId: 'c1', name: 'Programming Fundamentals', code: 'CS101', lecturerId: 'st1', credits: 10, mode: 'Physical' },
  { id: 'm2', courseId: 'c1', name: 'Database Management', code: 'CS102', lecturerId: 'st1', credits: 10, mode: 'Physical' },
  { id: 'm3', courseId: 'c2', name: 'Business Communication', code: 'BA101', lecturerId: 'st3', credits: 8, mode: 'Online' },
  { id: 'm4', courseId: 'c3', name: 'Pharmaceutical Calculations', code: 'PHARM101', lecturerId: 'st1', credits: 12, mode: 'Physical' },
];

// NTA Level 4 Aligned Content Structure
export const MOCK_LEARNING_CONTENT: ModuleContent[] = [
  {
    moduleId: 'm4', // Pharmaceutical Calculations
    levels: [
      {
        id: 'lvl1',
        levelNumber: 1,
        title: 'Fundamentals of Pharmaceutical Measurement',
        description: 'Introduction to the metric system, common household measures, and conversions based on Ansels Pharmaceutical Calculations.',
        materials: [
          { id: 'mat1', title: 'Lecture Notes: Metric System', type: 'PDF', url: '#', description: 'Core concepts of grams, liters, and meters.' },
          { id: 'mat2', title: 'Video: Converting Units', type: 'Video', url: '#', description: 'Step-by-step guide to dimensional analysis.' }
        ],
        quiz: {
          id: 'q1',
          title: 'Competency Test: Unit Conversions',
          durationMinutes: 30,
          status: 'Scheduled',
          scheduledDate: '2025-06-01',
          questions: [
            {
              id: 'q1_1',
              text: 'Convert 2.5 grams to milligrams.',
              type: 'MCQ',
              options: ['25 mg', '250 mg', '2500 mg', '0.0025 mg'],
              correctAnswer: 2,
              explanation: 'To convert grams to milligrams, multiply by 1000. 2.5 * 1000 = 2500 mg.'
            },
            {
              id: 'q1_2',
              text: 'A teaspoon is approximately equivalent to 5 mL.',
              type: 'TrueFalse',
              correctAnswer: true,
              explanation: 'Standard pharmaceutical practice accepts 1 teaspoon = 5 mL.'
            },
            {
              id: 'q1_3',
              text: 'Calculate the total volume if a patient takes 1 tablespoon twice daily for 7 days. (Answer in mL)',
              type: 'ShortAnswer',
              correctAnswer: '210',
              explanation: '1 tablespoon = 15 mL. Twice daily = 30 mL/day. 7 days = 30 * 7 = 210 mL.'
            }
          ]
        },
        discussions: [
          {
            id: 'd1',
            userId: 'st1',
            userName: 'Dr. John Doe',
            userRole: UserRole.STAFF,
            content: 'Welcome to Level 1. Please review the metric system notes before our live session.',
            type: 'text',
            timestamp: '2024-05-20 09:00'
          },
          {
            id: 'd2',
            userId: 's1',
            userName: 'Juma Hassan',
            userRole: UserRole.STUDENT,
            content: 'Doctor, is the "grain" unit still examinable in NTA Level 4?',
            type: 'text',
            timestamp: '2024-05-20 10:15'
          }
        ],
        liveSessionActive: true
      },
      {
        id: 'lvl2',
        levelNumber: 2,
        title: 'Ratio and Proportion',
        description: 'Applying ratios to dosage calculations.',
        materials: [],
        discussions: [],
        liveSessionActive: false
      }
    ]
  },
  {
    moduleId: 'm1', // Programming
    levels: [
      {
        id: 'lvl_cs_1',
        levelNumber: 1,
        title: 'Introduction to Logic',
        description: 'Boolean logic and flowcharts.',
        materials: [{ id: 'm_cs_1', title: 'Logic Gates PDF', type: 'PDF', url: '#' }],
        quiz: {
          id: 'q_cs_1',
          title: 'Logic Quiz',
          durationMinutes: 15,
          status: 'Active',
          startedAt: new Date().toISOString(),
          questions: [
             { id: 'q_cs_1a', text: 'What is the output of TRUE AND FALSE?', type: 'MCQ', options: ['TRUE', 'FALSE', 'NULL', 'undefined'], correctAnswer: 1 }
          ]
        },
        discussions: [],
        liveSessionActive: false
      }
    ]
  }
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Admin User', role: UserRole.ADMIN, email: 'admin@baobab.ac.tz', password: 'admin123' },
];

export const MOCK_STUDENTS: Student[] = [
  { 
    id: 's1', 
    studentId: 'BIT/2024/001', 
    name: 'Juma Hassan', 
    role: UserRole.STUDENT, 
    phone: '0712345678', 
    courseId: 'c3', // Pharmacy
    attendancePercentage: 92,
    feesCleared: true,
    parentId: 'p1'
  },
  { 
    id: 's2', 
    studentId: 'BIT/2024/002', 
    name: 'Asha Rose', 
    role: UserRole.STUDENT, 
    phone: '0787654321', 
    courseId: 'c1',
    attendancePercentage: 85,
    feesCleared: false,
    parentId: 'p2'
  },
  { 
    id: 's3', 
    studentId: 'BIT/2024/003', 
    name: 'Baraka John', 
    role: UserRole.STUDENT, 
    phone: '0655112233', 
    courseId: 'c2',
    attendancePercentage: 40,
    feesCleared: true,
    parentId: 'p3'
  },
];

export const DEFAULT_PERMISSIONS: StaffPermissions = {
  admin_stats: 'None',
  admin_students: 'None',
  admin_staff: 'None',
  admin_attendance: 'None',
  acad_data: 'None',
  acad_timetable: 'None',
  acad_reports: 'None',
  acc_overview: 'None',
  acc_fees: 'None',
  acc_payments: 'None',
  acc_expenses: 'None',
  acc_inventory: 'None',
  comm_general: 'None',
  lms_content: 'None',
  admin_election: 'None'
};

export const MOCK_STAFF: Staff[] = [
  {
    id: 'st1',
    staffId: 'EMP/2024/001',
    name: 'Dr. John Doe',
    role: UserRole.STAFF,
    email: 'john.doe@baobab.ac.tz',
    phone: '0711223344',
    staffType: 'Faculty',
    department: 'IT',
    designation: 'Senior Lecturer',
    permissions: {
      ...DEFAULT_PERMISSIONS,
      acad_data: 'Editor',
      acad_timetable: 'Editor',
      acad_reports: 'Viewer',
      lms_content: 'Editor',
      comm_general: 'Viewer'
    },
    password: '123'
  },
  {
    id: 'st2',
    staffId: 'EMP/2024/002',
    name: 'Alice M. Kapinga',
    role: UserRole.STAFF,
    email: 'alice@baobab.ac.tz',
    phone: '0755667788',
    staffType: 'Support',
    designation: 'Human Resources Manager',
    permissions: {
      ...DEFAULT_PERMISSIONS,
      admin_stats: 'Viewer',
      admin_staff: 'Editor',
      admin_attendance: 'Viewer',
      comm_general: 'Editor',
      admin_election: 'Editor'
    },
    password: '123'
  },
  {
    id: 'st3',
    staffId: 'EMP/2024/003',
    name: 'Prof. Mary Smith',
    role: UserRole.STAFF,
    email: 'mary@baobab.ac.tz',
    phone: '0766554433',
    staffType: 'Faculty',
    department: 'Business',
    designation: 'HOD Business',
    permissions: {
      ...DEFAULT_PERMISSIONS,
      acad_data: 'Editor',
      acad_timetable: 'Viewer',
      acad_reports: 'Editor',
      lms_content: 'Editor'
    },
    password: '123'
  }
];

export const MOCK_FINANCIALS: FinancialRecord[] = [
  { id: 'f1', type: 'Income', category: 'Tuition Fees', amount: 1500000, date: '2024-05-01', description: 'Sem 1 Fees - Juma Hassan', studentId: 's1', reference: 'RCPT-001' },
  { id: 'f2', type: 'Expense', category: 'Utilities', amount: 50000, date: '2024-05-02', description: 'Electricity Bill', reference: 'BILL-992' },
  { id: 'f3', type: 'Income', category: 'Tuition Fees', amount: 900000, date: '2024-05-05', description: 'Sem 1 Fees - Online Student', reference: 'RCPT-002' },
  { id: 'f4', type: 'Expense', category: 'Salaries', amount: 800000, date: '2024-05-30', description: 'Staff Salary - May', reference: 'PAYROLL-MAY' },
  { id: 'f5', type: 'Expense', category: 'Inventory', amount: 200000, date: '2024-06-01', description: 'Stationery Purchase', reference: 'INV-2024' },
];

export const MOCK_INVENTORY: InventoryItem[] = [
  { id: 'inv1', name: 'A4 Paper Ream', category: 'Stationery', quantity: 50, unitPrice: 15000, lastUpdated: '2024-05-01' },
  { id: 'inv2', name: 'Whiteboard Markers', category: 'Stationery', quantity: 100, unitPrice: 2000, lastUpdated: '2024-05-10' },
  { id: 'inv3', name: 'Desk Chairs', category: 'Furniture', quantity: 20, unitPrice: 150000, lastUpdated: '2024-02-15' },
  { id: 'inv4', name: 'Projector', category: 'Equipment', quantity: 5, unitPrice: 800000, lastUpdated: '2024-01-20' },
];

export const MOCK_COA: ChartAccount[] = [
  { id: 'ca1', code: '1000', name: 'Cash on Hand', type: 'Asset' },
  { id: 'ca2', code: '1010', name: 'Bank Account (CRDB)', type: 'Asset' },
  { id: 'ca3', code: '2000', name: 'Accounts Payable', type: 'Liability' },
  { id: 'ca4', code: '4000', name: 'Tuition Fees', type: 'Income' },
  { id: 'ca5', code: '4010', name: 'Registration Fees', type: 'Income' },
  { id: 'ca6', code: '5000', name: 'Staff Salaries', type: 'Expense' },
  { id: 'ca7', code: '5010', name: 'Utilities', type: 'Expense' },
  { id: 'ca8', code: '5020', name: 'Office Supplies', type: 'Expense' },
];

export const MOCK_COMMUNICATION_LOGS: CommunicationLog[] = [
  { 
    id: 'log1', 
    date: '2024-06-01 09:30', 
    sender: 'Admin User', 
    recipientGroup: 'Faculty Staff', 
    recipientCount: 15, 
    type: 'SMS', 
    message: 'Meeting reminder: Staff meeting at 2pm in the main hall.', 
    status: 'Sent' 
  },
  { 
    id: 'log2', 
    date: '2024-06-02 14:00', 
    sender: 'Admin User', 
    recipientGroup: 'Diploma in Computer Science Students', 
    recipientCount: 45, 
    type: 'Email', 
    subject: 'Exam Timetable Released',
    message: 'Dear Student, the end of semester exam timetable is now available on the portal.', 
    status: 'Sent' 
  },
];

// MOCK LIBRARY RESOURCES
export const MOCK_LIBRARY_RESOURCES: LibraryResource[] = [
  {
    id: 'lib1',
    title: 'Pharmaceutical Calculations 15th Ed.',
    author: 'Howard C. Ansel',
    departmentId: 'dept3',
    courseId: 'c3', // Pharmacy
    moduleId: 'm4',
    type: 'Textbook',
    format: 'PDF',
    relevance: 'Mandatory',
    referenceStandard: 'NTA Level 4 PST Curriculum',
    uploadDate: '2024-01-15',
    size: '5.2 MB',
    content: 'JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXwKICAvTWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSCGMgICAgPj4KICA+PgogIC9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKCjQgMCBvYmoKPDwKICAvVHlwZSAvRm9udAogIC9TdWJ0eXBlIC9UeXBlMQogIC9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iagoKNSAwIG9iago8PAogIC9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCjcwIDUwIFRECi9GMSAxMiBUZgooSGVsbG8sIFdvcmxkISkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNjAgMDAwMDAgbiAKMDAwMDAwMDExNCAwMDAwMCBuIAowMDAwMDAwMjI1IDAwMDAwIG4gCjAwMDAwMDAzMTIgMDAwMDAgbiAKdHJhaWxlcgo8PAogIC9TaXplIDYKICAvUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKNDA5CiUlRU9GCg=='
  },
  {
    id: 'lib2',
    title: 'Tanzania Pharmaceutical Handbook (TPH)',
    author: 'Ministry of Health',
    departmentId: 'dept3',
    courseId: 'c3',
    type: 'Reference',
    format: 'HTML',
    relevance: 'Mandatory',
    referenceStandard: 'MoH Regulation',
    uploadDate: '2023-06-10',
    size: '1.5 MB',
    content: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h1 style="color: #064e3b;">Tanzania Pharmaceutical Handbook</h1>
        <p><strong>Part I: General Guidelines</strong></p>
        <p>The preparation, storage, and dispensing of medicines must adhere to the highest standards of hygiene...</p>
        <hr/>
        <h3>Common Abbreviations</h3>
        <ul>
          <li><strong>b.d.</strong> - Bis die (Twice a day)</li>
          <li><strong>o.d.</strong> - Omni die (Once a day)</li>
          <li><strong>p.r.n.</strong> - Pro re nata (When required)</li>
        </ul>
        <p style="font-size: 0.8em; color: gray;">(Content simulated for demonstration)</p>
      </div>
    `
  },
  {
    id: 'lib3',
    title: 'Student Guide: Academic Regulations',
    author: 'Baobab Institute Admin',
    departmentId: 'all',
    courseId: 'all',
    type: 'Guide',
    format: 'PDF',
    relevance: 'Supplementary',
    uploadDate: '2024-02-01',
    size: '0.5 MB',
    content: 'JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXwKICAvTWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSCGMgICAgPj4KICA+PgogIC9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKCjQgMCBvYmoKPDwKICAvVHlwZSAvRm9udAogIC9TdWJ0eXBlIC9UeXBlMQogIC9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iagoKNSAwIG9iago8PAogIC9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCjcwIDUwIFRECi9GMSAxMiBUZgooSGVsbG8sIFdvcmxkISkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNjAgMDAwMDAgbiAKMDAwMDAwMDExNCAwMDAwMCBuIAowMDAwMDAwMjI1IDAwMDAwIG4gCjAwMDAwMDAzMTIgMDAwMDAgbiAKdHJhaWxlcgo8PAogIC9TaXplIDYKICAvUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKNDA5CiUlRU9GCg=='
  },
  {
    id: 'lib4',
    title: 'Clinical Medicine: Patient History Taking',
    author: 'Dr. A. Mwakalinga',
    departmentId: 'dept3',
    courseId: 'c1', // Assuming related to IT for demo, but practically another Dept.
    type: 'Manual',
    format: 'HTML',
    relevance: 'Mandatory',
    uploadDate: '2024-03-12',
    content: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2 style="color: #065f46;">History Taking Protocol</h2>
        <ol>
          <li><strong>Presenting Complaint (PC):</strong> The main reason for the visit.</li>
          <li><strong>History of Presenting Complaint (HPC):</strong> SOCRATES method (Site, Onset, Character, Radiation, Associated symptoms, Time, Exacerbating/Relieving factors, Severity).</li>
        </ol>
      </div>
    `
  }
];

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  instituteName: 'Baobab Institute of Tanzania',
  instituteAddress: 'P.O. Box 1234, Dar es Salaam, Tanzania',
  contactEmail: 'info@baobab.ac.tz',
  contactPhone: '+255 22 234 5678',
  currentSemester: 'Semester 1',
  academicYear: '2024/2025',
  semesterStartDate: '2024-09-01',
  semesterEndDate: '2025-01-30',
  minAttendancePercent: 90,
  gradingSchemes: [
    {
      contextId: 'default',
      rules: [
        { grade: 'A', minScore: 80, maxScore: 100, points: 5.0, status: 'Pass' },
        { grade: 'B+', minScore: 70, maxScore: 79, points: 4.0, status: 'Pass' },
        { grade: 'B', minScore: 60, maxScore: 69, points: 3.0, status: 'Pass' },
        { grade: 'C', minScore: 50, maxScore: 59, points: 2.0, status: 'Pass' },
        { grade: 'D', minScore: 40, maxScore: 49, points: 1.0, status: 'Pass' },
        { grade: 'F', minScore: 0, maxScore: 39, points: 0.0, status: 'Fail' },
      ]
    }
  ]
};

// ELECTION MOCK DATA
export const MOCK_ELECTION_POSITIONS: ElectionPosition[] = [
  { id: 'pos1', title: 'President', description: 'Student Organization President', maxVotes: 1 },
  { id: 'pos2', title: 'Vice President', description: 'Student Organization Vice President', maxVotes: 1 },
  { id: 'pos3', title: 'General Secretary', description: 'Head of Secretariat', maxVotes: 1 },
];

export const MOCK_CANDIDATES: Candidate[] = [
  { 
    id: 'cand1', 
    studentId: 's1', 
    name: 'Juma Hassan', 
    positionId: 'pos1', 
    manifesto: 'I promise better internet connectivity for all students.', 
    votes: 45 
  },
  { 
    id: 'cand2', 
    studentId: 's2', 
    name: 'Asha Rose', 
    positionId: 'pos1', 
    manifesto: 'Focusing on academic excellence and digital library resources.', 
    votes: 38 
  },
  { 
    id: 'cand3', 
    studentId: 's3', 
    name: 'Baraka John', 
    positionId: 'pos2', 
    manifesto: 'Sports and entertainment reform.', 
    votes: 62 
  },
];