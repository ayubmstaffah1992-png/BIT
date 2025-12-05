
import React, { useState } from 'react';
import { MOCK_DEPARTMENTS, MOCK_COURSES, MOCK_MODULES, MOCK_STAFF, MOCK_STUDENTS, DEFAULT_PERMISSIONS } from '../constants';
import { Department, Course, Module, UserRole, StaffPermissions } from '../types';
import { 
  BookOpen, Users, Plus, Calendar, 
  CheckCircle, Trash2, Printer, 
  FileText, Save, X, Edit, Layers,
  Clock, MapPin
} from 'lucide-react';

interface AcademicsProps {
  role?: UserRole;
  currentUserId?: string;
  permissions?: StaffPermissions;
}

interface TimetableCell {
  moduleId: string;
  assessmentType?: 'CAT' | 'Practical' | 'SE';
  venue?: string;
}

export const Academics: React.FC<AcademicsProps> = ({ role = UserRole.ADMIN, currentUserId, permissions = DEFAULT_PERMISSIONS }) => {
  // Determine default view based on permissions
  const defaultView = 
    permissions.acad_data !== 'None' ? 'structure' : 
    permissions.acad_timetable !== 'None' ? 'timetable' : 'reports';

  const [view, setView] = useState<'structure' | 'timetable' | 'reports' | 'my_academics'>('structure');
  
  // --- Data States ---
  const [departments, setDepartments] = useState<Department[]>(MOCK_DEPARTMENTS);
  const [courses, setCourses] = useState<Course[]>(MOCK_COURSES);
  const [modules, setModules] = useState<Module[]>(MOCK_MODULES);

  // --- Course Modal State ---
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [tempModules, setTempModules] = useState<Module[]>([]);
  const [newModuleInput, setNewModuleInput] = useState({ code: '', name: '' });

  // --- Department Modal State ---
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  
  // --- Timetable State ---
  const [timetableType, setTimetableType] = useState<'Lecture' | 'Exam'>('Lecture');
  const [timetableCols, setTimetableCols] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [timetableRows, setTimetableRows] = useState(['08:00 - 09:00', '09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00']);
  
  // Updated Timetable Data Structure
  const [timetableData, setTimetableData] = useState<Record<string, TimetableCell>>({});
  const [editingCell, setEditingCell] = useState<{r: number, c: number} | null>(null);
  const [tempCellData, setTempCellData] = useState<Partial<TimetableCell>>({});

  // --- Reports State ---
  const [selectedReportCourse, setSelectedReportCourse] = useState<string>('');

  // Helpers
  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || id;

  // --- STUDENT / PARENT PORTAL LOGIC ---
  if (role === UserRole.STUDENT || role === UserRole.PARENT) {
     let targetStudent = MOCK_STUDENTS.find(s => s.id === currentUserId);
     if (role === UserRole.PARENT) {
        targetStudent = MOCK_STUDENTS.find(s => s.parentId === currentUserId) || MOCK_STUDENTS[0];
     }

     const myCourse = courses.find(c => c.id === targetStudent?.courseId);
     const myModules = modules.filter(m => m.courseId === myCourse?.id);

     return (
       <div className="p-6 space-y-6 bg-gray-50 min-h-full">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
             <div className="border-b border-gray-200 pb-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-900">My Academics</h2>
                <p className="text-gray-700 mt-1">
                  Academic Record for <span className="font-bold text-emerald-700">{targetStudent?.name}</span>
                </p>
             </div>

             {/* Simple Tabs for Student View */}
             <div className="flex gap-4 mb-6 print:hidden">
                <button className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-lg font-bold text-sm border border-emerald-200">Examination Results</button>
                <button className="px-4 py-2 bg-white text-gray-700 rounded-lg font-bold text-sm border border-gray-200 hover:bg-gray-50">Class Timetable</button>
             </div>

             {/* Results Section */}
             <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden print-area">
                <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center">
                   <div>
                      <h3 className="font-bold text-gray-800">Semester Results</h3>
                      <p className="text-xs text-gray-600">{myCourse?.name} • {myCourse?.level}</p>
                   </div>
                   <button 
                    onClick={() => window.print()}
                    className="flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded border border-blue-200 hover:bg-blue-100 print:hidden"
                   >
                      <Printer size={14}/> Print Transcript
                   </button>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-100 text-gray-800">
                     <tr>
                       <th className="p-4 font-bold">Module Code</th>
                       <th className="p-4 font-bold">Module Name</th>
                       <th className="p-4 font-bold text-center">Credits</th>
                       <th className="p-4 font-bold text-center">Grade</th>
                       <th className="p-4 font-bold text-center">Status</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                     {myModules.map(m => (
                       <tr key={m.id}>
                          <td className="p-4 font-mono font-bold text-gray-700">{m.code}</td>
                          <td className="p-4 font-medium text-gray-900">{m.name}</td>
                          <td className="p-4 text-center text-gray-700">{m.credits}</td>
                          <td className="p-4 text-center font-bold text-emerald-700">A</td> {/* Mock Grade */}
                          <td className="p-4 text-center">
                             <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold border border-green-200">PASS</span>
                          </td>
                       </tr>
                     ))}
                     {myModules.length === 0 && (
                        <tr><td colSpan={5} className="p-6 text-center text-gray-500 italic">No registered modules found.</td></tr>
                     )}
                  </tbody>
                </table>
                <div className="hidden print:block mt-8 p-4 text-center border-t border-gray-300">
                   <p className="text-xs font-bold text-gray-500 uppercase">Official Transcript • Baobab Institute</p>
                </div>
             </div>
          </div>
       </div>
     );
  }

  // --- ADMIN / STAFF LOGIC ---

  // ... (Existing Logic: openCourseModal, handleAddTempModule, etc.)
  const openCourseModal = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      setTempModules(modules.filter(m => m.courseId === course.id));
    } else {
      setEditingCourse({
        id: `c_${Date.now()}`,
        name: '',
        departmentId: departments[0]?.id || '',
        mode: 'Physical',
        fee: 0,
        installments: 1,
        duration: '1 Year',
        level: 'Certificate'
      });
      setTempModules([]);
    }
    setShowCourseModal(true);
  };

  const handleAddTempModule = () => {
    if (newModuleInput.code && newModuleInput.name && editingCourse) {
      const newMod: Module = {
        id: `m_${Date.now()}_${Math.random()}`,
        courseId: editingCourse.id,
        name: newModuleInput.name,
        code: newModuleInput.code,
        lecturerId: 'st1', // Default for demo
        credits: 10,
        mode: 'Physical'
      };
      setTempModules([...tempModules, newMod]);
      setNewModuleInput({ code: '', name: '' });
    }
  };

  const handleRemoveTempModule = (id: string) => {
    setTempModules(tempModules.filter(m => m.id !== id));
  };

  const saveCourse = () => {
    if (!editingCourse || !editingCourse.name) return;
    setCourses(prev => {
      const exists = prev.find(c => c.id === editingCourse.id);
      if (exists) return prev.map(c => c.id === editingCourse.id ? editingCourse : c);
      return [...prev, editingCourse];
    });
    setModules(prev => {
      const otherModules = prev.filter(m => m.courseId !== editingCourse.id);
      return [...otherModules, ...tempModules];
    });
    setShowCourseModal(false);
  };

  const saveDepartment = () => {
    if(newDeptName) {
      setDepartments([...departments, { id: `d_${Date.now()}`, name: newDeptName, headOfDept: 'st1'}]);
      setNewDeptName('');
      setShowDeptModal(false);
    }
  };

  // --- Timetable Logic ---
  const addRow = () => setTimetableRows([...timetableRows, '00:00 - 00:00']);
  const addCol = () => setTimetableCols([...timetableCols, 'Day']);
  
  const updateHeader = (index: number, value: string, type: 'row' | 'col') => {
    if (type === 'col') {
      const newCols = [...timetableCols];
      newCols[index] = value;
      setTimetableCols(newCols);
    } else {
      const newRows = [...timetableRows];
      newRows[index] = value;
      setTimetableRows(newRows);
    }
  };

  const handleCellClick = (row: number, col: number) => {
     if (permissions.acad_timetable !== 'Editor') return; // Restrict editing
     const key = `${row}-${col}`;
     const existing = timetableData[key];
     setEditingCell({r: row, c: col});
     setTempCellData(existing || {});
  };

  const handleDeleteCell = () => {
    if(editingCell) {
        const key = `${editingCell.r}-${editingCell.c}`;
        const newData = {...timetableData};
        delete newData[key];
        setTimetableData(newData);
        setEditingCell(null);
    }
  };

  const saveCellData = () => {
     if(editingCell) {
        const key = `${editingCell.r}-${editingCell.c}`;
        if (tempCellData.moduleId) {
          setTimetableData({...timetableData, [key]: tempCellData as TimetableCell});
        }
        setEditingCell(null);
     }
  };

  const tabs = [
    { id: 'structure', label: 'Structure & Registration', permission: permissions.acad_data },
    { id: 'timetable', label: 'Timetable', permission: permissions.acad_timetable },
    { id: 'reports', label: 'Reports', permission: permissions.acad_reports }
  ].filter(t => t.permission !== 'None');

  return (
    <div className="space-y-6 p-6">
      {/* Header / Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <h2 className="text-2xl font-bold text-gray-900">Academics Management</h2>
        <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-300">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setView(tab.id as any)}
              className={`px-4 py-2 rounded text-sm font-bold transition-colors ${view === tab.id ? 'bg-emerald-700 text-white shadow' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              {tab.label}
            </button>
          ))}
          {tabs.length === 0 && <span className="p-2 text-xs text-red-500 font-bold">Access Restricted</span>}
        </div>
      </div>

      {/* --- STRUCTURE VIEW --- */}
      {view === 'structure' && permissions.acad_data !== 'None' && (
        <div className="space-y-8">
          {/* Departments Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                 <Users className="text-emerald-700" /> Departments
               </h3>
               {permissions.acad_data === 'Editor' && (
                 <button 
                  onClick={() => setShowDeptModal(true)}
                  className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded border border-emerald-200 font-bold hover:bg-emerald-100"
                 >
                   + Add Department
                 </button>
               )}
             </div>
             {/* ... Departments Grid ... */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {departments.map(d => (
                 <div key={d.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50 hover:border-emerald-300 transition-colors">
                   <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-gray-900">{d.name}</p>
                        <p className="text-xs text-gray-700 mt-1">{courses.filter(c => c.departmentId === d.id).length} Courses Registered</p>
                      </div>
                      <Layers size={16} className="text-emerald-200" />
                   </div>
                 </div>
               ))}
             </div>
          </div>

          {/* Courses & Modules Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50">
               <div>
                 <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                   <BookOpen className="text-emerald-700" /> Courses & Modules Registry
                 </h3>
                 <p className="text-sm text-gray-600 mt-1">Register courses under departments and add their modules.</p>
               </div>
               {permissions.acad_data === 'Editor' && (
                 <button 
                   onClick={() => openCourseModal()}
                   className="flex items-center gap-2 bg-emerald-700 text-white px-4 py-2 rounded-lg hover:bg-emerald-800 font-bold shadow-sm whitespace-nowrap"
                 >
                   <Plus size={18} /> Register Course
                 </button>
               )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 border-b border-gray-200 text-gray-800">
                  <tr>
                    <th className="p-4 font-bold">Course Information</th>
                    <th className="p-4 font-bold">Level</th>
                    <th className="p-4 font-bold">Department</th>
                    <th className="p-4 font-bold text-center">Modules</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {courses.map(c => {
                    const courseModules = modules.filter(m => m.courseId === c.id);
                    return (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="p-4">
                          <div className="font-bold text-gray-900">{c.name}</div>
                          <div className="text-xs text-gray-600">{c.duration} • {c.mode}</div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold border ${c.level === 'Bachelor' ? 'bg-purple-100 text-purple-800 border-purple-200' : c.level === 'Diploma' ? 'bg-blue-100 text-blue-800 border-blue-200' : c.level === 'Certificate' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                            {c.level}
                          </span>
                        </td>
                        <td className="p-4 text-gray-800 font-medium">{getDeptName(c.departmentId)}</td>
                        <td className="p-4 text-center">
                           <div className="flex flex-col items-center">
                              <span className="font-bold text-emerald-700">{courseModules.length}</span>
                              <span className="text-[10px] text-gray-500">Registered</span>
                           </div>
                        </td>
                        <td className="p-4 text-right">
                          {permissions.acad_data === 'Editor' && (
                            <button 
                              onClick={() => openCourseModal(c)}
                              className="text-emerald-700 hover:text-emerald-900 font-bold text-xs border border-emerald-300 bg-emerald-50 px-3 py-1.5 rounded transition-colors flex items-center gap-1 ml-auto"
                            >
                              <Edit size={12} /> Manage
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TIMETABLE VIEW --- */}
      {view === 'timetable' && permissions.acad_timetable !== 'None' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 print:hidden">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="text-emerald-700" /> Timetable Generator
              </h3>
              <p className="text-sm text-gray-600">Click a cell to assign a module and details.</p>
            </div>
            {permissions.acad_timetable === 'Editor' && (
              <div className="flex items-center gap-3 flex-wrap">
                 <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                   <button 
                     onClick={() => setTimetableType('Lecture')}
                     className={`px-3 py-1 rounded text-xs font-bold ${timetableType === 'Lecture' ? 'bg-white shadow text-emerald-800' : 'text-gray-600'}`}
                   >
                     Lecture
                   </button>
                   <button 
                     onClick={() => setTimetableType('Exam')}
                     className={`px-3 py-1 rounded text-xs font-bold ${timetableType === 'Exam' ? 'bg-white shadow text-emerald-800' : 'text-gray-600'}`}
                   >
                     Examination
                   </button>
                 </div>
                 <button onClick={addRow} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded font-bold border border-gray-300">
                   + Add Row
                 </button>
                 <button onClick={addCol} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded font-bold border border-gray-300">
                   + Add Col
                 </button>
                 <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 font-bold shadow-sm text-sm">
                   <Printer size={16} /> Print
                 </button>
              </div>
            )}
            {permissions.acad_timetable === 'Viewer' && (
              <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 font-bold shadow-sm text-sm">
                 <Printer size={16} /> Print
               </button>
            )}
          </div>

          {/* Timetable Grid (Printable) */}
          <div className="print-area overflow-x-auto">
             <div className="text-center mb-6 hidden print:block">
               <h1 className="text-xl font-bold uppercase">Baobab Institute of Tanzania</h1>
               <h2 className="text-lg font-semibold">{timetableType} Timetable</h2>
             </div>
             
             <table className="w-full border-collapse border border-gray-400 min-w-[800px]">
               <thead>
                 <tr>
                   <th className="border border-gray-400 bg-gray-100 p-3 w-32 text-center text-sm font-bold text-gray-800">Time / Day</th>
                   {timetableCols.map((day, colIdx) => (
                     <th key={colIdx} className="border border-gray-400 bg-gray-100 p-2 min-w-[120px]">
                       <input 
                         value={day}
                         disabled={permissions.acad_timetable !== 'Editor'}
                         onChange={(e) => updateHeader(colIdx, e.target.value, 'col')}
                         className="w-full bg-transparent text-center font-bold text-gray-900 uppercase text-sm outline-none focus:text-emerald-700 disabled:opacity-80"
                         placeholder="Day..."
                       />
                     </th>
                   ))}
                 </tr>
               </thead>
               <tbody>
                 {timetableRows.map((time, rowIdx) => (
                   <tr key={rowIdx}>
                     <td className="border border-gray-400 bg-gray-50 p-2 text-center">
                        <input 
                         value={time}
                         disabled={permissions.acad_timetable !== 'Editor'}
                         onChange={(e) => updateHeader(rowIdx, e.target.value, 'row')}
                         className="w-full bg-transparent text-center font-mono text-xs font-bold text-gray-800 outline-none disabled:opacity-80"
                         placeholder="00:00 - 00:00"
                       />
                     </td>
                     {timetableCols.map((_, colIdx) => {
                       const cellData = timetableData[`${rowIdx}-${colIdx}`];
                       const module = cellData ? modules.find(m => m.id === cellData.moduleId) : null;
                       
                       return (
                         <td 
                           key={`${rowIdx}-${colIdx}`} 
                           onClick={() => handleCellClick(rowIdx, colIdx)}
                           className={`border border-gray-400 p-1 relative transition-colors h-24 align-top ${permissions.acad_timetable === 'Editor' ? 'cursor-pointer hover:bg-emerald-50' : ''}`}
                         >
                           {cellData ? (
                             <div className="h-full flex flex-col justify-center items-center text-center p-1">
                               {module && (
                                 <>
                                   <span className="font-bold text-xs text-emerald-800">{module.code}</span>
                                   <span className="text-[10px] text-gray-800 leading-tight mb-1 font-semibold">{module.name}</span>
                                 </>
                               )}
                               
                               {cellData.assessmentType && (
                                 <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase mb-1 ${
                                    cellData.assessmentType === 'SE' ? 'bg-red-50 text-red-700 border-red-200' :
                                    cellData.assessmentType === 'Practical' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    'bg-orange-50 text-orange-700 border-orange-200'
                                 }`}>
                                    {cellData.assessmentType}
                                 </span>
                               )}
                               
                               {cellData.venue && (
                                  <div className="flex items-center gap-1 text-[9px] text-gray-600 font-bold mt-auto">
                                     <MapPin size={8} /> {cellData.venue}
                                  </div>
                               )}
                             </div>
                           ) : (
                             <div className="h-full flex items-center justify-center opacity-0 hover:opacity-50">
                                {permissions.acad_timetable === 'Editor' && <Plus size={16} className="text-gray-400" />}
                             </div>
                           )}
                         </td>
                       );
                     })}
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
          {/* Edit Cell Modal */}
          {editingCell && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-sm w-full border border-gray-200 overflow-hidden animate-fade-in">
                   <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                      <h3 className="font-bold text-gray-800">Edit Slot</h3>
                      <button onClick={() => setEditingCell(null)} className="text-gray-500 hover:text-gray-800"><X size={18}/></button>
                   </div>
                   <div className="p-6 space-y-4">
                      {/* ... Inputs ... */}
                      <div>
                        <label className="block text-xs font-bold text-gray-900 mb-1">Select Module</label>
                        <select 
                          className="w-full p-2 border border-gray-300 rounded bg-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                          value={tempCellData.moduleId || ''}
                          onChange={e => setTempCellData({...tempCellData, moduleId: e.target.value})}
                        >
                          <option value="">-- Choose Module --</option>
                          {courses.map(course => (
                            <optgroup key={course.id} label={course.name}>
                              {modules.filter(m => m.courseId === course.id).map(m => (
                                <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-gray-900 mb-1">Assessment Type (Optional)</label>
                        <select 
                           className="w-full p-2 border border-gray-300 rounded bg-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                           value={tempCellData.assessmentType || ''}
                           onChange={e => setTempCellData({...tempCellData, assessmentType: e.target.value ? e.target.value as any : undefined})}
                        >
                           <option value="">-- None --</option>
                           <option value="CAT">CAT (Continuous Assessment Test)</option>
                           <option value="Practical">Practical</option>
                           <option value="SE">SE (Semester Exam)</option>
                        </select>
                      </div>
                      
                      <div>
                         <label className="block text-xs font-bold text-gray-900 mb-1">Venue / Room (Optional)</label>
                         <input 
                            type="text"
                            className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                            value={tempCellData.venue || ''}
                            onChange={e => setTempCellData({...tempCellData, venue: e.target.value})}
                            placeholder="e.g. Lab 1, Hall A"
                         />
                      </div>
                   </div>
                   <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                      <button onClick={handleDeleteCell} className="text-red-600 text-xs font-bold hover:underline flex items-center gap-1"><Trash2 size={12} /> Clear Slot</button>
                      <div className="flex gap-2">
                         <button onClick={() => setEditingCell(null)} className="px-3 py-2 text-gray-600 text-xs font-bold hover:bg-gray-100 rounded">Cancel</button>
                         <button onClick={saveCellData} disabled={!tempCellData.moduleId} className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded hover:bg-emerald-800 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">Save Changes</button>
                      </div>
                   </div>
                </div>
            </div>
          )}
        </div>
      )}

      {/* --- REPORTS VIEW --- */}
      {view === 'reports' && permissions.acad_reports !== 'None' && (
        <div className="space-y-6">
           <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 print:hidden">
             {/* ... */}
             <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
               <FileText className="text-emerald-700" /> Results Report Generator
             </h3>
             <div className="flex gap-4 items-end">
               <div className="w-full md:w-1/2">
                 <label className="block text-sm font-bold text-gray-900 mb-1">Select Course</label>
                 <select 
                   value={selectedReportCourse}
                   onChange={(e) => setSelectedReportCourse(e.target.value)}
                   className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 font-medium bg-white"
                 >
                   <option value="">-- Select a Course --</option>
                   {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.level})</option>)}
                 </select>
               </div>
               <button 
                onClick={() => window.print()}
                disabled={!selectedReportCourse}
                className="bg-blue-700 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-800 disabled:opacity-50 flex items-center gap-2 shadow-sm"
               >
                 <Printer size={18}/> Print Report
               </button>
             </div>
           </div>
           {/* Report Preview */}
           {selectedReportCourse && (
             <div className="bg-white p-10 rounded-lg shadow-sm border border-gray-200 min-h-[600px] print-area">
                {/* ... existing report preview logic ... */}
                <div className="text-center border-b-2 border-black pb-6 mb-6">
                   <h1 className="text-3xl font-extrabold uppercase tracking-widest text-black">Baobab Institute of Tanzania</h1>
                   <p className="text-sm font-bold text-gray-800 tracking-wide mt-1">OFFICIAL ACADEMIC RESULTS</p>
                </div>
                {/* ... */}
                <table className="w-full text-left border border-black text-sm">
                  <thead>
                    <tr className="bg-gray-200 border-b border-black">
                      <th className="p-3 border-r border-black font-extrabold text-black">Student ID</th>
                      <th className="p-3 border-r border-black font-extrabold text-black">Student Name</th>
                      {modules.filter(m => m.courseId === selectedReportCourse).slice(0, 5).map(m => (
                        <th key={m.id} className="p-2 border-r border-black font-bold text-center text-xs text-black w-20">
                          {m.code}
                        </th>
                      ))}
                      <th className="p-3 font-extrabold text-black text-center w-20">GPA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* ... */}
                  </tbody>
                </table>
                {/* ... */}
             </div>
           )}
        </div>
      )}
      {/* Course Modal - Existing code */}
      {showCourseModal && editingCourse && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
          {/* ... */}
           <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full border border-gray-200 my-8">
             <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl sticky top-0 z-10">
               <h3 className="font-bold text-lg text-gray-900">
                 {editingCourse.id.startsWith('c_') && !courses.find(c => c.id === editingCourse.id) ? 'Register New Course' : 'Manage Course & Modules'}
               </h3>
               <button onClick={() => setShowCourseModal(false)} className="text-gray-500 hover:text-gray-700"><X size={20}/></button>
             </div>
             {/* ... Form ... */}
             <div className="p-6 space-y-8">
                {/* ... Fields ... */}
                {/* ... Module Manager ... */}
                <div className="space-y-4">
                   <h4 className="font-bold text-sm text-emerald-800 uppercase tracking-wide border-b border-emerald-100 pb-2">2. Register Modules</h4>
                   <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex gap-2 mb-4">
                        <input placeholder="Code (e.g., CS101)" className="w-1/3 p-2 border border-gray-300 rounded text-sm font-mono font-medium uppercase focus:ring-2 focus:ring-emerald-500 outline-none placeholder-gray-600" value={newModuleInput.code} onChange={(e) => setNewModuleInput({...newModuleInput, code: e.target.value.toUpperCase()})} />
                        <input placeholder="Module Name" className="flex-1 p-2 border border-gray-300 rounded text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none placeholder-gray-600" value={newModuleInput.name} onChange={(e) => setNewModuleInput({...newModuleInput, name: e.target.value})} />
                        <button onClick={handleAddTempModule} disabled={!newModuleInput.code || !newModuleInput.name} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">Add Module</button>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {tempModules.map((m, idx) => (
                          <div key={m.id} className="flex justify-between items-center bg-white p-3 rounded border border-gray-200 shadow-sm">
                             <div><span className="font-mono font-bold text-emerald-700 text-xs bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 mr-2">{m.code}</span><span className="font-medium text-sm text-gray-900">{m.name}</span></div>
                             <button onClick={() => handleRemoveTempModule(m.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
                {/* ... Save Button ... */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button onClick={() => setShowCourseModal(false)} className="px-6 py-2.5 text-gray-700 font-bold hover:bg-gray-100 rounded-lg border border-gray-300">Cancel</button>
                  <button onClick={saveCourse} className="bg-emerald-700 text-white px-8 py-2.5 rounded-lg font-bold hover:bg-emerald-800 shadow-md flex items-center gap-2"><Save size={18} /> Save Course & Modules</button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
