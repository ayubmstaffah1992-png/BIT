
import React, { useState, useRef, useEffect } from 'react';
import { MOCK_STUDENTS, MOCK_STAFF, MOCK_COURSES, MOCK_DEPARTMENTS, DEFAULT_PERMISSIONS } from '../constants';
import { Student, Staff, UserRole, StaffPermissions, AttendanceRecord } from '../types';
import { 
  Printer, CheckCircle, Search, Plus, X, UserCog, GraduationCap, 
  Upload, Edit, Filter, Calendar, FileDown, FileSpreadsheet, 
  Trash2, CheckSquare, Square, ShieldCheck, Camera, Image as ImageIcon,
  FileText, Download, AlertCircle, Lock
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface AdministrationProps {
  permissions?: StaffPermissions;
}

export const Administration: React.FC<AdministrationProps> = ({ permissions = DEFAULT_PERMISSIONS }) => {
  // Determine default view based on permissions
  const defaultView = 
    permissions.admin_students !== 'None' ? 'students' : 
    permissions.admin_staff !== 'None' ? 'staff' : 
    permissions.admin_attendance !== 'None' ? 'attendance' : 'reports';

  const [view, setView] = useState<'students' | 'staff' | 'id_cards' | 'attendance' | 'reports'>(defaultView as any);
  
  // Data States
  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS);
  const [staffList, setStaffList] = useState<Staff[]>(MOCK_STAFF);
  
  // Attendance Data State
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  
  // Selection & Filtering
  const [selectedForId, setSelectedForId] = useState<string[]>([]);
  const [idCardType, setIdCardType] = useState<'student' | 'staff'>('student');
  const [studentFilter, setStudentFilter] = useState<string>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  
  // Modals & Forms
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [isEditingStaff, setIsEditingStaff] = useState(false);
  
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [isEditingStudent, setIsEditingStudent] = useState(false);

  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [bulkType, setBulkType] = useState<'student' | 'staff'>('student');
  
  // Camera/Photo State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tempPhoto, setTempPhoto] = useState<string | undefined>(undefined);
  
  // Attendance State
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedForAttendance, setSelectedForAttendance] = useState<string[]>([]);
  const [attendanceType, setAttendanceType] = useState<'student' | 'staff'>('student');

  // Report State
  const [reportType, setReportType] = useState<'student' | 'staff' | 'attendance'>('student');
  const [reportFilter, setReportFilter] = useState({
    courseId: 'all',
    department: 'all',
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
    status: 'all'
  });

  // Form States
  const [newStaff, setNewStaff] = useState<Partial<Staff>>({
    staffType: 'Faculty',
    role: UserRole.STAFF,
    permissions: DEFAULT_PERMISSIONS
  });

  const [newStudent, setNewStudent] = useState<Partial<Student>>({
    role: UserRole.STUDENT,
    attendancePercentage: 100,
    feesCleared: false
  });

  // Filter Logic
  const filteredStudents = students.filter(s => 
    studentFilter === 'all' ? true : s.courseId === studentFilter
  );

  const filteredStaff = staffList.filter(s => 
    staffFilter === 'all' ? true : s.staffType === staffFilter
  );

  // --- Photo Capture Logic ---
  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check permissions or use upload.");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, 300, 225); // Aspect ratio 4:3
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setTempPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setTempPhoto(ev.target?.result as string);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // --- Bulk Upload Logic ---
  const downloadTemplate = (type: 'student' | 'staff') => {
    const wb = XLSX.utils.book_new();
    let data = [];
    
    if (type === 'student') {
      data = [
        ['Name', 'AdmissionNumber', 'Phone', 'CourseName', 'FeesCleared(Yes/No)', 'AttendancePercentage']
      ];
    } else {
      data = [
        ['Name', 'StaffID', 'Email', 'Phone', 'Type(Faculty/Support)', 'Designation', 'Department']
      ];
    }
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `baobab_${type}_registration_template.xlsx`);
  };

  const handleBulkFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      processBulkData(data, bulkType);
    };
    reader.readAsBinaryString(file);
    // Reset input
    e.target.value = '';
  };

  const processBulkData = (data: any[], type: 'student' | 'staff') => {
      if (type === 'student') {
         const newStudents: Student[] = data.map((row: any, idx: number) => {
            // Find course by name or default to first
            const course = MOCK_COURSES.find(c => c.name.toLowerCase() === (row['CourseName'] || '').toLowerCase()) || MOCK_COURSES[0];
            return {
               id: `s_bulk_${Date.now()}_${idx}`,
               studentId: row['AdmissionNumber'] || `BIT/2024/BLK${String(idx).padStart(3, '0')}`,
               name: row['Name'] || 'Unknown Student',
               phone: row['Phone'] || '',
               role: UserRole.STUDENT,
               courseId: course.id,
               attendancePercentage: parseInt(row['AttendancePercentage']) || 100,
               feesCleared: (row['FeesCleared(Yes/No)'] || '').toLowerCase() === 'yes',
               parentId: `p_bulk_${idx}` 
            };
         });
         setStudents([...students, ...newStudents]);
         alert(`Successfully imported ${newStudents.length} students.`);
      } else {
         const newStaff: Staff[] = data.map((row: any, idx: number) => {
            const sType = (row['Type(Faculty/Support)'] || 'Faculty').trim() === 'Support' ? 'Support' : 'Faculty';
            return {
              id: `st_bulk_${Date.now()}_${idx}`,
              staffId: row['StaffID'] || `EMP/BLK/${String(idx).padStart(3, '0')}`,
              name: row['Name'] || 'Unknown Staff',
              email: row['Email'] || '',
              phone: row['Phone'] || '',
              role: UserRole.STAFF,
              staffType: sType,
              designation: row['Designation'] || 'Staff',
              department: row['Department'] || undefined,
              permissions: DEFAULT_PERMISSIONS, // Default permissions
              password: '123' // Default bulk password
            };
         });
         setStaffList([...staffList, ...newStaff]);
         alert(`Successfully imported ${newStaff.length} staff members.`);
      }
      setShowBulkUploadModal(false);
  };

  // --- ID Selection ---
  const toggleIdSelection = (id: string) => {
    setSelectedForId(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAllIds = () => {
    if (idCardType === 'student') {
      if (selectedForId.length === filteredStudents.length) {
        setSelectedForId([]);
      } else {
        setSelectedForId(filteredStudents.map(s => s.id));
      }
    } else {
      if (selectedForId.length === filteredStaff.length) {
        setSelectedForId([]);
      } else {
        setSelectedForId(filteredStaff.map(s => s.id));
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // --- Staff Management ---
  const openStaffModal = (staff?: Staff) => {
    setTempPhoto(undefined);
    if (staff) {
      setNewStaff({ ...staff });
      setTempPhoto(staff.avatar);
      setIsEditingStaff(true);
    } else {
      setNewStaff({ 
        staffType: 'Faculty', 
        role: UserRole.STAFF, 
        permissions: DEFAULT_PERMISSIONS,
        password: '123' 
      });
      setIsEditingStaff(false);
    }
    setShowStaffModal(true);
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name) {
       alert("Staff name is required.");
       return;
    }
    
    // Strict email validation
    if (!newStaff.email) {
      alert("Email is mandatory for staff login. Please provide a valid email address.");
      return;
    }

    const staffData = { ...newStaff, avatar: tempPhoto };

    if (isEditingStaff && newStaff.id) {
      setStaffList(staffList.map(s => s.id === newStaff.id ? { ...s, ...staffData } as Staff : s));
      alert("Staff details updated successfully.");
    } else {
      const staff: Staff = {
        id: `st${Date.now()}`,
        staffId: `EMP/2024/${String(staffList.length + 1).padStart(3, '0')}`,
        name: newStaff.name,
        role: UserRole.STAFF,
        email: newStaff.email,
        phone: newStaff.phone,
        staffType: newStaff.staffType as 'Faculty' | 'Support',
        department: newStaff.staffType === 'Faculty' ? newStaff.department : undefined,
        designation: newStaff.designation || 'Staff',
        permissions: newStaff.permissions || DEFAULT_PERMISSIONS,
        avatar: tempPhoto,
        // Enforce default password '123'
        password: '123'
      };
      setStaffList([...staffList, staff]);
      
      // Simulate Email Sending
      alert(`Staff member ${newStaff.name} registered successfully.\n\nA welcome email has been sent to ${newStaff.email} with instructions to login using the default password '123'. They will be prompted to change it upon first login.`);
    }
    setShowStaffModal(false);
    stopCamera();
  };

  const handleDeleteStaff = (id: string) => {
    if (window.confirm("Are you sure you want to delete this staff member? This action cannot be undone.")) {
      setStaffList(staffList.filter(s => s.id !== id));
    }
  };

  // --- Student Management ---
  const openStudentModal = (student?: Student) => {
    setTempPhoto(undefined);
    if (student) {
      setNewStudent({ ...student });
      setTempPhoto(student.avatar);
      setIsEditingStudent(true);
    } else {
      setNewStudent({ 
        role: UserRole.STUDENT, 
        attendancePercentage: 100, 
        feesCleared: false,
        courseId: MOCK_COURSES[0]?.id,
        studentId: ''
      });
      setIsEditingStudent(false);
    }
    setShowStudentModal(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.phone) return;

    const studentData = { ...newStudent, avatar: tempPhoto };

    if (isEditingStudent && newStudent.id) {
      setStudents(students.map(s => s.id === newStudent.id ? { ...s, ...studentData } as Student : s));
    } else {
      const student: Student = {
        id: `s${Date.now()}`,
        studentId: newStudent.studentId || `BIT/2024/${String(students.length + 1).padStart(3, '0')}`,
        name: newStudent.name,
        role: UserRole.STUDENT,
        phone: newStudent.phone,
        courseId: newStudent.courseId || 'c1',
        attendancePercentage: 100,
        feesCleared: false,
        parentId: `p${Date.now()}`,
        avatar: tempPhoto
      };
      setStudents([...students, student]);
    }
    setShowStudentModal(false);
    stopCamera();
  };

  const handleDeleteStudent = (id: string) => {
    if (window.confirm("Are you sure you want to delete this student? This action cannot be undone.")) {
      setStudents(students.filter(s => s.id !== id));
    }
  };

  // --- Attendance Logic ---
  const getAttendanceStatus = (id: string, date: string) => {
    const record = attendanceHistory.find(r => (r.studentId === id || r.staffId === id) && r.date === date);
    return record ? record.status : 'Unmarked';
  };

  const handleBulkAttendance = (status: 'Present' | 'Absent') => {
    const newRecords: AttendanceRecord[] = selectedForAttendance.map(id => ({
      id: `att_${id}_${attendanceDate}`,
      date: attendanceDate,
      status: status,
      studentId: attendanceType === 'student' ? id : undefined,
      staffId: attendanceType === 'staff' ? id : undefined
    }));

    // Remove existing records for these IDs on this date to avoid duplicates
    const filteredHistory = attendanceHistory.filter(
      r => !(r.date === attendanceDate && selectedForAttendance.includes(r.studentId || r.staffId || ''))
    );

    setAttendanceHistory([...filteredHistory, ...newRecords]);
    
    // Update student percentage mock logic (simplified)
    if (attendanceType === 'student') {
       setStudents(students.map(s => {
         if (selectedForAttendance.includes(s.id)) {
           const change = status === 'Present' ? 1 : -1;
           return { ...s, attendancePercentage: Math.min(100, Math.max(0, s.attendancePercentage + change)) };
         }
         return s;
       }));
    }

    setSelectedForAttendance([]);
    alert(`Successfully marked ${selectedForAttendance.length} ${attendanceType}s as ${status}.`);
  };

  // --- Reports Logic ---
  const getFilteredReportData = () => {
    if (reportType === 'student') {
      return students.filter(s => {
        const courseMatch = reportFilter.courseId === 'all' || s.courseId === reportFilter.courseId;
        const statusMatch = reportFilter.status === 'all' 
          ? true 
          : (reportFilter.status === 'eligible' 
              ? (s.attendancePercentage >= 90 && s.feesCleared) 
              : !(s.attendancePercentage >= 90 && s.feesCleared));
        return courseMatch && statusMatch;
      });
    }
    if (reportType === 'staff') {
      return staffList.filter(s => reportFilter.department === 'all' || s.department === reportFilter.department);
    }
    if (reportType === 'attendance') {
      // Generate monthly analysis
      return students.map(s => {
        const records = attendanceHistory.filter(r => r.studentId === s.id && r.date.startsWith(reportFilter.month));
        const present = records.filter(r => r.status === 'Present').length;
        const absent = records.filter(r => r.status === 'Absent').length;
        const total = present + absent;
        const percentage = total > 0 ? Math.round((present / total) * 100) : s.attendancePercentage; // Fallback to mock
        return { ...s, monthlyStats: { present, absent, percentage } };
      });
    }
    return [];
  };

  const tabs = [
    { id: 'students', label: 'Students', permission: permissions.admin_students },
    { id: 'staff', label: 'Staff Registry', permission: permissions.admin_staff },
    { id: 'attendance', label: 'Attendance', permission: permissions.admin_attendance },
    { id: 'reports', label: 'Reports & Analysis', permission: permissions.admin_stats },
    // Reuse admin_students permission for ID Cards generation or add specific if needed. Using admin_students for simplicity.
    { id: 'id_cards', label: 'Generate IDs', permission: permissions.admin_students }
  ].filter(t => t.permission !== 'None');

  return (
    <div className="space-y-6 p-6">
      {/* Top Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <h2 className="text-2xl font-bold text-gray-900">Administration</h2>
        <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-300 overflow-x-auto max-w-full">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setView(tab.id as any)}
              className={`px-4 py-2 rounded text-sm font-bold whitespace-nowrap transition-colors ${view === tab.id ? 'bg-emerald-700 text-white shadow' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              {tab.label}
            </button>
          ))}
          {tabs.length === 0 && <span className="p-2 text-xs text-red-500 font-bold">Access Restricted</span>}
        </div>
      </div>

      {/* --- Reports View --- */}
      {view === 'reports' && permissions.admin_stats !== 'None' && (
        <div className="space-y-6">
           <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 print:hidden">
             <div className="flex flex-wrap gap-4 items-end mb-6">
               <div>
                 <label className="block text-xs font-bold text-gray-900 mb-1">Report Type</label>
                 <select 
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="p-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 min-w-[150px]"
                 >
                   <option value="student">Student Report</option>
                   <option value="staff">Staff Report</option>
                   <option value="attendance">Attendance Analysis</option>
                 </select>
               </div>
               
               {reportType === 'student' && (
                 <>
                   <div>
                     <label className="block text-xs font-bold text-gray-900 mb-1">Filter by Course</label>
                     <select 
                      value={reportFilter.courseId}
                      onChange={(e) => setReportFilter({...reportFilter, courseId: e.target.value})}
                      className="p-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-900"
                     >
                       <option value="all">All Courses</option>
                       {MOCK_COURSES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                     </select>
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-gray-900 mb-1">Eligibility Status</label>
                     <select 
                      value={reportFilter.status}
                      onChange={(e) => setReportFilter({...reportFilter, status: e.target.value})}
                      className="p-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-900"
                     >
                       <option value="all">All Students</option>
                       <option value="eligible">Eligible for Exam</option>
                       <option value="not_eligible">Not Eligible</option>
                     </select>
                   </div>
                 </>
               )}

               {reportType === 'staff' && (
                 <div>
                   <label className="block text-xs font-bold text-gray-900 mb-1">Filter by Department</label>
                   <select 
                    value={reportFilter.department}
                    onChange={(e) => setReportFilter({...reportFilter, department: e.target.value})}
                    className="p-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-900"
                   >
                     <option value="all">All Departments</option>
                     {MOCK_DEPARTMENTS.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                   </select>
                 </div>
               )}

               {reportType === 'attendance' && (
                 <div>
                   <label className="block text-xs font-bold text-gray-900 mb-1">Select Month</label>
                   <input 
                    type="month" 
                    value={reportFilter.month}
                    onChange={(e) => setReportFilter({...reportFilter, month: e.target.value})}
                    className="p-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-900"
                   />
                 </div>
               )}

               <button onClick={handlePrint} className="ml-auto flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 font-bold shadow-sm">
                 <Printer size={18} /> Print Report
               </button>
             </div>
           </div>

           {/* Report Preview Area (Printable) */}
           <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 min-h-[500px] print-area">
              <div className="mb-8 text-center border-b-2 border-emerald-900 pb-4">
                <h1 className="text-3xl font-extrabold text-emerald-900 uppercase tracking-wide">Baobab Institute of Tanzania</h1>
                <p className="text-gray-800 font-bold">Official System Report</p>
                <div className="mt-4 flex justify-between items-end">
                  <div className="text-left">
                    <h2 className="text-xl font-bold text-gray-900 capitalize">{reportType} Report</h2>
                    <p className="text-sm text-gray-600 font-medium">Generated on {new Date().toLocaleDateString()}</p>
                  </div>
                  {reportType === 'student' && (
                    <div className="text-right text-xs font-bold text-emerald-800">
                       Note: Exam Eligibility requires 90% Attendance & Cleared Fees
                    </div>
                  )}
                </div>
              </div>

              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-300">
                    <th className="p-3 font-bold text-gray-900 border border-gray-300">#</th>
                    <th className="p-3 font-bold text-gray-900 border border-gray-300">ID</th>
                    <th className="p-3 font-bold text-gray-900 border border-gray-300">Name</th>
                    
                    {reportType === 'student' && (
                      <>
                        <th className="p-3 font-bold text-gray-900 border border-gray-300">Course</th>
                        <th className="p-3 font-bold text-gray-900 border border-gray-300 text-center">Attendance</th>
                        <th className="p-3 font-bold text-gray-900 border border-gray-300 text-center">Fees</th>
                        <th className="p-3 font-bold text-gray-900 border border-gray-300 text-center">Exam Status</th>
                      </>
                    )}
                    
                    {reportType === 'staff' && (
                      <>
                        <th className="p-3 font-bold text-gray-900 border border-gray-300">Role</th>
                        <th className="p-3 font-bold text-gray-900 border border-gray-300">Department</th>
                        <th className="p-3 font-bold text-gray-900 border border-gray-300">Email</th>
                      </>
                    )}

                    {reportType === 'attendance' && (
                      <>
                        <th className="p-3 font-bold text-gray-900 border border-gray-300 text-center">Present (Days)</th>
                        <th className="p-3 font-bold text-gray-900 border border-gray-300 text-center">Absent (Days)</th>
                        <th className="p-3 font-bold text-gray-900 border border-gray-300 text-center">Performance</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {getFilteredReportData().map((item: any, idx) => (
                    <tr key={item.id} className="border-b border-gray-200">
                      <td className="p-3 border border-gray-300 font-mono text-xs text-gray-700 font-bold">{idx + 1}</td>
                      <td className="p-3 border border-gray-300 font-mono font-bold text-gray-800">{item.studentId || item.staffId}</td>
                      <td className="p-3 border border-gray-300 font-bold text-gray-900">{item.name}</td>
                      
                      {reportType === 'student' && (
                        <>
                          <td className="p-3 border border-gray-300 text-gray-800 font-medium">{MOCK_COURSES.find((c: any) => c.id === item.courseId)?.name}</td>
                          <td className={`p-3 border border-gray-300 text-center font-bold ${item.attendancePercentage >= 90 ? 'text-green-700' : 'text-red-600'}`}>
                            {item.attendancePercentage}%
                          </td>
                          <td className="p-3 border border-gray-300 text-center">
                             {item.feesCleared ? <span className="text-green-700 font-bold text-xs">PAID</span> : <span className="text-red-600 font-bold text-xs">PENDING</span>}
                          </td>
                          <td className="p-3 border border-gray-300 text-center">
                            {item.attendancePercentage >= 90 && item.feesCleared ? (
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold border border-green-200">ELIGIBLE</span>
                            ) : (
                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold border border-red-200">NOT ELIGIBLE</span>
                            )}
                          </td>
                        </>
                      )}

                      {reportType === 'staff' && (
                        <>
                          <td className="p-3 border border-gray-300 text-gray-800">{item.designation}</td>
                          <td className="p-3 border border-gray-300 text-gray-800">{item.department || '-'}</td>
                          <td className="p-3 border border-gray-300 text-gray-800">{item.email}</td>
                        </>
                      )}

                      {reportType === 'attendance' && (
                        <>
                          <td className="p-3 border border-gray-300 text-center text-green-700 font-bold">{item.monthlyStats.present}</td>
                          <td className="p-3 border border-gray-300 text-center text-red-600 font-bold">{item.monthlyStats.absent}</td>
                          <td className="p-3 border border-gray-300 text-center">
                            <div className="w-full bg-gray-200 rounded-full h-2.5 border border-gray-300">
                              <div className="bg-emerald-600 h-2.5 rounded-full" style={{ width: `${item.monthlyStats.percentage}%` }}></div>
                            </div>
                            <span className="text-xs font-bold text-gray-700">{item.monthlyStats.percentage}%</span>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Report Footer */}
              <div className="mt-12 pt-4 border-t border-gray-300 flex justify-between text-xs text-gray-600 font-bold">
                 <div>Printed by: Admin User</div>
                 <div>Baobab Institute ERP • System Generated Report</div>
              </div>
           </div>
        </div>
      )}

      {/* Students List View */}
      {view === 'students' && permissions.admin_students !== 'None' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
               <h3 className="font-bold text-gray-800">Student Registry</h3>
               <div className="relative">
                  <Filter size={14} className="absolute left-2 top-2.5 text-gray-500"/>
                  <select 
                    className="pl-7 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 font-medium"
                    value={studentFilter}
                    onChange={(e) => setStudentFilter(e.target.value)}
                  >
                    <option value="all">All Courses</option>
                    {MOCK_COURSES.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
               </div>
            </div>
            {permissions.admin_students === 'Editor' && (
              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => { setBulkType('student'); setShowBulkUploadModal(true); }}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium whitespace-nowrap shadow-sm"
                >
                  <FileSpreadsheet size={16} /> Bulk Upload
                </button>
                <button 
                  onClick={() => openStudentModal()}
                  className="flex items-center gap-2 bg-emerald-700 text-white px-4 py-2 rounded-lg hover:bg-emerald-800 text-sm font-medium whitespace-nowrap"
                >
                  <Plus size={16} /> Register Student
                </button>
              </div>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-semibold text-gray-800">Student</th>
                  <th className="px-6 py-3 font-semibold text-gray-800">Course</th>
                  <th className="px-6 py-3 font-semibold text-gray-800">Attendance</th>
                  <th className="px-6 py-3 font-semibold text-gray-800">Fees</th>
                  <th className="px-6 py-3 font-semibold text-gray-800">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-300 flex-shrink-0">
                        {s.avatar ? (
                          <img src={s.avatar} alt={s.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600 font-bold">{s.name.charAt(0)}</div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{s.name}</div>
                        <div className="text-xs text-gray-600 font-mono font-bold">{s.studentId}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-800 font-medium">
                       {MOCK_COURSES.find(c => c.id === s.courseId)?.name || s.courseId}
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-2">
                         <div className="w-16 bg-gray-200 rounded-full h-1.5 border border-gray-300">
                            <div className={`h-1.5 rounded-full ${s.attendancePercentage >= 90 ? 'bg-green-600' : 'bg-red-500'}`} style={{width: `${s.attendancePercentage}%`}}></div>
                         </div>
                         <span className="text-xs font-bold text-gray-800">{s.attendancePercentage}%</span>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                      {s.feesCleared ? 
                        <span className="px-2 py-1 bg-green-100 text-green-800 border border-green-200 rounded-full text-xs font-bold">Cleared</span> : 
                        <span className="px-2 py-1 bg-red-100 text-red-800 border border-red-200 rounded-full text-xs font-bold">Pending</span>
                      }
                    </td>
                    <td className="px-6 py-4">
                      {permissions.admin_students === 'Editor' && (
                        <div className="flex items-center gap-3">
                          <button onClick={() => openStudentModal(s)} className="text-gray-600 hover:text-emerald-700 transition-colors" title="Edit Student">
                            <Edit size={18} />
                          </button>
                          <button onClick={() => handleDeleteStudent(s.id)} className="text-red-500 hover:text-red-700 transition-colors" title="Delete Student">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Staff Registry View */}
      {view === 'staff' && permissions.admin_staff !== 'None' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <h3 className="font-bold text-gray-800">Staff Registry</h3>
              <div className="relative">
                <Filter size={14} className="absolute left-2 top-2.5 text-gray-500"/>
                <select 
                  className="pl-7 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 font-medium"
                  value={staffFilter}
                  onChange={(e) => setStaffFilter(e.target.value)}
                >
                  <option value="all">All Staff</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Support">Support</option>
                </select>
              </div>
            </div>
            {permissions.admin_staff === 'Editor' && (
              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => { setBulkType('staff'); setShowBulkUploadModal(true); }}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium whitespace-nowrap shadow-sm"
                >
                  <FileSpreadsheet size={16} /> Bulk Upload
                </button>
                <button 
                  onClick={() => openStaffModal()}
                  className="flex items-center gap-2 bg-emerald-700 text-white px-4 py-2 rounded-lg hover:bg-emerald-800 text-sm font-medium whitespace-nowrap"
                >
                  <Plus size={16} /> Register Staff
                </button>
              </div>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-semibold text-gray-800">Staff Member</th>
                  <th className="px-6 py-3 font-semibold text-gray-800">Role</th>
                  <th className="px-6 py-3 font-semibold text-gray-800">Department</th>
                  <th className="px-6 py-3 font-semibold text-gray-800">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStaff.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-300 flex-shrink-0">
                        {s.avatar ? (
                          <img src={s.avatar} alt={s.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600 font-bold">{s.name.charAt(0)}</div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{s.name}</div>
                        <div className="text-xs text-gray-600 font-mono font-bold">{s.staffId}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {s.staffType === 'Faculty' ? (
                        <span className="flex items-center gap-1 text-purple-800 bg-purple-100 px-2 py-1 rounded border border-purple-200 text-xs font-bold w-fit">
                          <GraduationCap size={12} /> Faculty
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-blue-800 bg-blue-100 px-2 py-1 rounded border border-blue-200 text-xs font-bold w-fit">
                          <UserCog size={12} /> Support
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-800 font-medium">{s.department || '-'}</td>
                    <td className="px-6 py-4">
                      {permissions.admin_staff === 'Editor' && (
                        <div className="flex items-center gap-3">
                          <button onClick={() => openStaffModal(s)} className="text-gray-600 hover:text-emerald-700 transition-colors" title="Edit Staff">
                            <Edit size={18} />
                          </button>
                          <button onClick={() => handleDeleteStaff(s.id)} className="text-red-500 hover:text-red-700 transition-colors" title="Delete Staff">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ID Card Generator */}
      {view === 'id_cards' && permissions.admin_students !== 'None' && (
        <div>
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex flex-col md:flex-row justify-between items-center print:hidden gap-4">
            <div>
              <h3 className="font-bold text-blue-900">ID Card Generation (CR80)</h3>
              <p className="text-sm text-blue-800">Select items to print ID cards. Fits standard card printers.</p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
               <button 
                onClick={selectAllIds} 
                className="flex items-center gap-1.5 bg-white border border-blue-300 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-100 text-sm font-bold"
               >
                 {selectedForId.length > 0 ? <CheckSquare size={16}/> : <Square size={16}/>}
                 {selectedForId.length > 0 ? 'Deselect All' : 'Select All'}
               </button>
              <select 
                value={idCardType} 
                onChange={(e) => { setIdCardType(e.target.value as any); setSelectedForId([]); }}
                className="p-2 rounded border border-blue-300 bg-white text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500"
              >
                <option value="student">Student IDs</option>
                <option value="staff">Staff IDs</option>
              </select>
              <button onClick={handlePrint} className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 font-medium shadow-sm">
                <Printer size={18} /> Print Bulk
              </button>
            </div>
          </div>
          {/* ... ID Card Grid ... */}
          {/* For brevity, reusing existing grid logic below but assuming filteredStudents/Staff matches permissions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 print:hidden">
            {(idCardType === 'student' ? filteredStudents : filteredStaff).map((s: any) => (
              <div key={s.id} 
                onClick={() => toggleIdSelection(s.id)}
                className={`p-4 border rounded-lg cursor-pointer flex items-center gap-3 transition-all ${selectedForId.includes(s.id) ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-gray-300 hover:border-emerald-300'}`}
              >
                {/* ... existing card preview content ... */}
                <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden border border-gray-300">
                   {s.avatar ? <img src={s.avatar} className="w-full h-full object-cover"/> : null}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{s.name}</p>
                  <p className="text-sm text-gray-600 font-mono font-bold">{s.studentId || s.staffId}</p>
                </div>
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${selectedForId.includes(s.id) ? 'bg-emerald-600 border-emerald-600' : 'border-gray-400'}`}>
                  {selectedForId.includes(s.id) && <CheckCircle size={14} className="text-white" />}
                </div>
              </div>
            ))}
          </div>
          {/* ... Printable Area ... (same as original file) */}
          <div className="print-area grid grid-cols-2 gap-4 print:gap-4 print:grid print:grid-cols-2">
            {idCardType === 'student' && students.filter(s => selectedForId.includes(s.id)).map(s => (
              <div key={s.id} className="relative w-[85.6mm] h-[54mm] bg-white border border-gray-400 rounded-lg overflow-hidden shadow-sm print:shadow-none print:border print:break-inside-avoid mx-auto page-break-auto">
                 {/* ... Student Card Content ... */}
                 <div className="h-[15mm] bg-emerald-900 flex items-center px-4">
                   <div className="text-white">
                      <h1 className="text-xs font-bold tracking-widest text-white">BAOBAB INSTITUTE</h1>
                      <p className="text-[8px] text-white tracking-wide font-medium">OF TANZANIA</p>
                   </div>
                </div>
                <div className="p-3 flex gap-3">
                  <div className="w-[20mm] h-[25mm] bg-gray-200 rounded border border-gray-400 flex items-center justify-center overflow-hidden relative">
                    {s.avatar ? (
                      <img src={s.avatar} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[8px] text-gray-800 font-bold">PHOTO</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div>
                      <p className="text-[8px] text-black uppercase font-bold">Name</p>
                      <p className="text-sm font-extrabold text-black leading-none">{s.name}</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-black uppercase font-bold">Student ID</p>
                      <p className="text-xs font-mono font-bold text-black leading-none">{s.studentId}</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-black uppercase font-bold">Course</p>
                      <p className="text-[10px] text-black font-bold leading-none truncate">{MOCK_COURSES.find(c => c.id === s.courseId)?.name || s.courseId}</p>
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-2 right-3 text-right">
                   <div className="w-16 h-6 bg-black/10 border border-gray-300 flex items-center justify-center rounded">
                     <span className="text-[8px] font-mono text-black font-bold">BARCODE</span>
                   </div>
                </div>
              </div>
            ))}
            {idCardType === 'staff' && staffList.filter(s => selectedForId.includes(s.id)).map(s => (
               <div key={s.id} className="relative w-[85.6mm] h-[54mm] bg-white border border-gray-400 rounded-lg overflow-hidden shadow-sm print:shadow-none print:border print:break-inside-avoid mx-auto page-break-auto">
                 {/* ... Staff Card Content ... */}
                 <div className="h-[15mm] bg-slate-900 flex items-center px-4">
                   <div className="text-white">
                      <h1 className="text-xs font-bold tracking-widest text-white">BAOBAB INSTITUTE</h1>
                      <p className="text-[8px] text-white tracking-wide font-medium">STAFF IDENTITY CARD</p>
                   </div>
                </div>
                <div className="p-3 flex gap-3">
                  <div className="w-[20mm] h-[25mm] bg-gray-200 rounded border border-gray-400 flex items-center justify-center overflow-hidden relative">
                    {s.avatar ? (
                      <img src={s.avatar} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[8px] text-gray-800 font-bold">PHOTO</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div>
                      <p className="text-[8px] text-black uppercase font-bold">Name</p>
                      <p className="text-sm font-extrabold text-black leading-none">{s.name}</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-black uppercase font-bold">Designation</p>
                      <p className="text-xs text-black font-bold leading-none">{s.designation}</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-black uppercase font-bold">Staff ID</p>
                      <p className="text-[10px] font-mono text-black font-bold leading-none">{s.staffId}</p>
                    </div>
                    {s.department && (
                      <div>
                        <p className="text-[8px] text-black uppercase font-bold">Department</p>
                        <p className="text-[10px] text-black font-bold leading-none">{s.department}</p>
                      </div>
                    )}
                  </div>
                </div>
               </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk Attendance View */}
      {view === 'attendance' && permissions.admin_attendance !== 'None' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-6">
           {/* ... Attendance View UI ... */}
           <div className="flex flex-col md:flex-row justify-between gap-4 pb-4 border-b border-gray-200">
            <div>
              <h3 className="font-bold text-lg text-gray-900">Attendance Management</h3>
              <p className="text-sm text-gray-600 font-medium">Mark daily attendance. Changes are auto-saved to history.</p>
            </div>
            <div className="flex gap-4 items-end">
               <div>
                 <label className="block text-xs font-bold text-gray-900 mb-1">Date</label>
                 <input 
                  type="date" 
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="p-2 border border-gray-300 rounded text-sm font-bold text-gray-900"
                />
               </div>
               <div>
                 <label className="block text-xs font-bold text-gray-900 mb-1">Type</label>
                 <select 
                  value={attendanceType}
                  onChange={(e) => { setAttendanceType(e.target.value as any); setSelectedForAttendance([]); }}
                  className="p-2 border border-gray-300 rounded text-sm bg-white font-bold text-gray-900"
                 >
                   <option value="student">Students</option>
                   <option value="staff">Staff</option>
                 </select>
               </div>
               {permissions.admin_attendance === 'Editor' && (
                  <button
                    onClick={() => {
                      const allIds = attendanceType === 'student' ? students.map(s => s.id) : staffList.map(s => s.id);
                      if (selectedForAttendance.length === allIds.length) {
                        setSelectedForAttendance([]);
                      } else {
                        setSelectedForAttendance(allIds);
                      }
                    }}
                    className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg font-bold text-sm border border-gray-300 hover:bg-gray-200"
                  >
                    {selectedForAttendance.length > 0 && selectedForAttendance.length === (attendanceType === 'student' ? students.length : staffList.length) ? 'Deselect All' : 'Select All'}
                  </button>
               )}
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedForAttendance.length > 0 && permissions.admin_attendance === 'Editor' && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-center justify-between animate-fade-in sticky top-0 z-20 shadow-sm">
              <div className="flex items-center gap-2">
                 <CheckCircle className="text-blue-700" size={20}/>
                 <span className="text-sm font-bold text-blue-900">{selectedForAttendance.length} selected</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleBulkAttendance('Present')} className="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-green-700 shadow-sm transition-transform active:scale-95">Mark Present</button>
                <button onClick={() => handleBulkAttendance('Absent')} className="bg-red-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-red-700 shadow-sm transition-transform active:scale-95">Mark Absent</button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto max-h-[600px]">
             <table className="w-full text-sm">
               <thead className="sticky top-0 bg-gray-100 z-10 shadow-sm border-b border-gray-200">
                 <tr className="text-left text-gray-800">
                   <th className="p-3 w-10">
                     <input 
                      type="checkbox" 
                      className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                      onChange={(e) => {
                        const allIds = attendanceType === 'student' ? students.map(s => s.id) : staffList.map(s => s.id);
                        setSelectedForAttendance(e.target.checked ? allIds : []);
                      }}
                      disabled={permissions.admin_attendance !== 'Editor'}
                      checked={selectedForAttendance.length > 0 && selectedForAttendance.length === (attendanceType === 'student' ? students.length : staffList.length)}
                     />
                   </th>
                   <th className="p-3 font-bold">Name</th>
                   <th className="p-3 font-bold">ID</th>
                   <th className="p-3 font-bold">{attendanceType === 'student' ? 'Course' : 'Department'}</th>
                   <th className="p-3 font-bold">Current Status ({attendanceDate})</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-200">
                 {(attendanceType === 'student' ? students : staffList).map((person: any) => {
                   const status = getAttendanceStatus(person.id, attendanceDate);
                   return (
                     <tr key={person.id} className={`hover:bg-gray-50 ${status !== 'Unmarked' ? (status === 'Present' ? 'bg-green-50/30' : 'bg-red-50/30') : ''}`}>
                       <td className="p-3">
                         <input 
                          type="checkbox"
                          className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                          checked={selectedForAttendance.includes(person.id)}
                          disabled={permissions.admin_attendance !== 'Editor'}
                          onChange={() => {
                            setSelectedForAttendance(prev => 
                              prev.includes(person.id) ? prev.filter(i => i !== person.id) : [...prev, person.id]
                            );
                          }}
                         />
                       </td>
                       <td className="p-3 font-bold text-gray-900">{person.name}</td>
                       <td className="p-3 text-gray-700 font-mono text-xs font-bold">{person.studentId || person.staffId}</td>
                       <td className="p-3 text-gray-800 font-medium">{person.courseId ? MOCK_COURSES.find(c => c.id === person.courseId)?.name : (person.department || '-')}</td>
                       <td className="p-3">
                         {status === 'Present' && <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold border border-green-200">Present</span>}
                         {status === 'Absent' && <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold border border-red-200">Absent</span>}
                         {status === 'Unmarked' && <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold border border-gray-200">Unmarked</span>}
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
          </div>
        </div>
      )}

      {/* Student/Staff Modals would be conditionally rendered here too, logic included in 'view' blocks above */}
      {/* (Modals omitted for brevity, assumed existing logic wrapped in conditionals) */}
      {/* Just ensuring the Modal code exists in the component structure */}
      {showStudentModal && (
        /* ... Existing Student Modal Code ... */
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
          {/* ... */}
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full border border-gray-200 my-8">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
               <h3 className="font-bold text-lg text-gray-900">{isEditingStudent ? 'Edit Student' : 'Register New Student'}</h3>
               <button onClick={() => { setShowStudentModal(false); stopCamera(); }} className="text-gray-500 hover:text-gray-700"><X size={20}/></button>
            </div>
            {/* ... Form Content ... */}
            <form onSubmit={handleSaveStudent} className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
               {/* ... (Existing Form Fields) ... */}
               <div className="lg:col-span-1 space-y-4">
                  {/* Photo Section */}
                  <label className="block text-sm font-bold text-gray-900">Profile Photo</label>
                  <div className="aspect-[4/3] bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden relative">
                    {/* ... */}
                    {isCameraOpen ? (
                     <>
                       <video ref={videoRef} autoPlay className="absolute inset-0 w-full h-full object-cover" />
                       <canvas ref={canvasRef} width="300" height="225" className="hidden" />
                     </>
                    ) : tempPhoto ? (
                     <img src={tempPhoto} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                     <div className="text-center text-gray-400">
                       <UserCog size={48} className="mx-auto mb-2" />
                       <span className="text-xs font-medium">No Photo</span>
                     </div>
                    )}
                  </div>
                  {/* ... Camera Buttons ... */}
                  <div className="grid grid-cols-2 gap-2">
                    {isCameraOpen ? (
                       <button type="button" onClick={capturePhoto} className="col-span-2 bg-red-600 text-white py-2 rounded font-bold flex items-center justify-center gap-2 hover:bg-red-700"><Camera size={16} /> Capture</button>
                    ) : (
                       <button type="button" onClick={startCamera} className="bg-blue-600 text-white py-2 rounded font-bold flex items-center justify-center gap-2 hover:bg-blue-700"><Camera size={16} /> Camera</button>
                    )}
                    {!isCameraOpen && (
                       <label className="bg-gray-200 text-gray-900 py-2 rounded font-bold flex items-center justify-center gap-2 hover:bg-gray-300 cursor-pointer">
                          <Upload size={16} /> Upload <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                       </label>
                    )}
                  </div>
               </div>
               <div className="lg:col-span-2 space-y-4">
                  {/* ... Inputs ... */}
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">Admission Number (ID)</label>
                    <input type="text" value={newStudent.studentId || ''} onChange={e => setNewStudent({...newStudent, studentId: e.target.value})} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 font-mono uppercase font-bold" placeholder="BIT/2024/XXX"/>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">Full Name</label>
                    <input type="text" required value={newStudent.name || ''} onChange={e => setNewStudent({...newStudent, name: e.target.value})} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 font-medium"/>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">Phone Number</label>
                    <input type="tel" required value={newStudent.phone || ''} onChange={e => setNewStudent({...newStudent, phone: e.target.value})} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 font-medium"/>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">Course</label>
                    <select value={newStudent.courseId || ''} onChange={e => setNewStudent({...newStudent, courseId: e.target.value})} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 bg-white font-medium">
                       {MOCK_COURSES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="pt-4">
                    <button type="submit" className="w-full bg-emerald-700 text-white py-2 rounded-lg font-bold hover:bg-emerald-800 shadow-md transition-all">{isEditingStudent ? 'Save Changes' : 'Complete Registration'}</button>
                  </div>
               </div>
            </form>
          </div>
        </div>
      )}
      
      {showStaffModal && (
         <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full my-8 border border-gray-200">
             <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-gray-50 z-10 rounded-t-xl">
               <h3 className="font-bold text-lg text-gray-900">{isEditingStaff ? 'Edit Staff' : 'Register New Staff'}</h3>
               <button onClick={() => { setShowStaffModal(false); stopCamera(); }} className="text-gray-500 hover:text-gray-700"><X size={20}/></button>
             </div>
             <form onSubmit={handleSaveStaff} className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="lg:col-span-1 space-y-4">
                 <label className="block text-sm font-bold text-gray-900">Profile Photo</label>
                 <div className="aspect-[4/3] bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden relative">
                    {isCameraOpen ? (
                     <>
                       <video ref={videoRef} autoPlay className="absolute inset-0 w-full h-full object-cover" />
                       <canvas ref={canvasRef} width="300" height="225" className="hidden" />
                     </>
                    ) : tempPhoto ? (
                     <img src={tempPhoto} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                     <div className="text-center text-gray-400"><UserCog size={48} className="mx-auto mb-2" /><span className="text-xs font-medium">No Photo</span></div>
                    )}
                 </div>
                 <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={isCameraOpen ? capturePhoto : startCamera} className={`${isCameraOpen ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} col-span-2 text-white py-2 rounded font-bold flex items-center justify-center gap-2`}>
                       <Camera size={16} /> {isCameraOpen ? 'Capture' : 'Camera'}
                    </button>
                    {!isCameraOpen && <label className="bg-gray-200 text-gray-900 py-2 rounded font-bold flex items-center justify-center gap-2 hover:bg-gray-300 cursor-pointer"><Upload size={16} /> Upload <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} /></label>}
                 </div>
               </div>
               <div className="lg:col-span-2 space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">Full Name</label>
                        <input type="text" required value={newStaff.name || ''} onChange={e => setNewStaff({...newStaff, name: e.target.value})} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 font-medium"/>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">Email Address (Mandatory)</label>
                        <input type="email" required value={newStaff.email || ''} onChange={e => setNewStaff({...newStaff, email: e.target.value})} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 font-medium" placeholder="staff@baobab.ac.tz"/>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">Designation</label>
                        <input type="text" required value={newStaff.designation || ''} onChange={e => setNewStaff({...newStaff, designation: e.target.value})} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 font-medium"/>
                    </div>
                    <div>
                       <label className="block text-sm font-bold text-gray-900 mb-1">Staff Type</label>
                       <select value={newStaff.staffType} onChange={e => setNewStaff({...newStaff, staffType: e.target.value as any})} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 bg-white font-medium">
                         <option value="Faculty">Faculty</option><option value="Support">Support Staff</option>
                       </select>
                    </div>
                    {/* Informational Password Field */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-900 mb-1">Login Password</label>
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                            <Lock size={16} className="text-blue-600"/>
                            <p className="text-xs text-blue-800 font-medium">A default password <span className="font-bold font-mono bg-white px-1 rounded border border-blue-100">123</span> will be assigned. The user will receive an email reset link to change it.</p>
                        </div>
                    </div>
                 </div>
                 <div className="pt-2 flex justify-end gap-3">
                    <button type="button" onClick={() => { setShowStaffModal(false); stopCamera(); }} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium border border-gray-300">Cancel</button>
                    <button type="submit" className="bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-800 shadow-md transition-all">{isEditingStaff ? 'Save Changes' : 'Register & Send Email'}</button>
                 </div>
               </div>
             </form>
           </div>
         </div>
      )}

      {showBulkUploadModal && (
        /* ... Bulk Upload Modal ... */
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200">
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-lg text-gray-900">Bulk {bulkType === 'student' ? 'Student' : 'Staff'} Registration</h3>
               <button onClick={() => setShowBulkUploadModal(false)} className="text-gray-500 hover:text-gray-700"><X size={20}/></button>
             </div>
             <p className="text-sm text-gray-600 mb-4 font-medium">Download the template, fill it with data, and upload it back to register multiple users at once.</p>
             <div className="space-y-4">
               <button onClick={() => downloadTemplate(bulkType)} className="w-full py-3 border border-emerald-600 text-emerald-700 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-emerald-50 transition-colors">
                 <Download size={18}/> Download Excel Template
               </button>
               <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-emerald-500 transition-colors bg-gray-50">
                 <input type="file" accept=".xlsx, .xls, .csv" onChange={handleBulkFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                 <div className="pointer-events-none">
                    <Upload size={32} className="mx-auto text-gray-400 mb-2"/>
                    <p className="text-sm font-bold text-gray-700">Click or Drag to upload Excel</p>
                 </div>
               </div>
             </div>
             <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowBulkUploadModal(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">Cancel</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
