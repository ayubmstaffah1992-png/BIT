
import React, { useState, useEffect } from 'react';
import { MOCK_STAFF, DEFAULT_SYSTEM_SETTINGS, MOCK_COURSES, DEFAULT_PERMISSIONS } from '../constants';
import { Staff, StaffPermissions, SystemSettings, GradeRule, AccessPermission, GradingScheme } from '../types';
import { 
  Shield, Search, Eye, Edit3, Lock, Save, 
  Building2, GraduationCap, Settings2, RefreshCw,
  CheckCircle, AlertTriangle, Plus, Trash2, Calendar
} from 'lucide-react';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'academics' | 'grading' | 'access'>('general');
  
  // --- Data State ---
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [staffList, setStaffList] = useState<Staff[]>(MOCK_STAFF);
  
  // --- Grading State ---
  const [selectedGradingCourseId, setSelectedGradingCourseId] = useState<string>('default');
  
  // --- Access Control State ---
  const [accessSearchTerm, setAccessSearchTerm] = useState('');

  // --- Load from LocalStorage on Mount (Simulation) ---
  useEffect(() => {
    const savedSettings = localStorage.getItem('baobab_system_settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
    
    const savedStaff = localStorage.getItem('baobab_staff_permissions');
    if (savedStaff) {
      setStaffList(JSON.parse(savedStaff));
    }
  }, []);

  // --- Handlers ---
  const handleSaveSettings = () => {
    localStorage.setItem('baobab_system_settings', JSON.stringify(settings));
    alert("System settings updated successfully!");
  };

  const handleSavePermissions = () => {
    localStorage.setItem('baobab_staff_permissions', JSON.stringify(staffList));
    alert("Staff access permissions updated successfully!");
  };

  const cyclePermission = (staffId: string, module: keyof StaffPermissions) => {
    setStaffList(staffList.map(s => {
      if (s.id === staffId) {
        const current = s.permissions[module];
        let next: AccessPermission = 'None';
        if (current === 'None') next = 'Viewer';
        else if (current === 'Viewer') next = 'Editor';
        else next = 'None'; // Cycle back
        
        return {
          ...s,
          permissions: {
            ...s.permissions,
            [module]: next
          }
        };
      }
      return s;
    }));
  };

  // --- Grading Logic ---
  const getCurrentGradingRules = () => {
    const scheme = settings.gradingSchemes.find(s => s.contextId === selectedGradingCourseId);
    if (scheme) return scheme.rules;
    
    // Fallback to default if specific course not found
    const defaultScheme = settings.gradingSchemes.find(s => s.contextId === 'default');
    return defaultScheme ? defaultScheme.rules : [];
  };

  const updateGradingRule = (index: number, field: keyof GradeRule, value: any) => {
    let schemes = [...settings.gradingSchemes];
    let schemeIndex = schemes.findIndex(s => s.contextId === selectedGradingCourseId);

    // If scheme doesn't exist for this course yet, create it by cloning default or empty
    if (schemeIndex === -1) {
       const defaultRules = schemes.find(s => s.contextId === 'default')?.rules || [];
       const newScheme: GradingScheme = {
         contextId: selectedGradingCourseId,
         rules: JSON.parse(JSON.stringify(defaultRules)) // Deep copy
       };
       schemes.push(newScheme);
       schemeIndex = schemes.length - 1;
    }

    const newRules = [...schemes[schemeIndex].rules];
    newRules[index] = { ...newRules[index], [field]: value };
    schemes[schemeIndex].rules = newRules;

    setSettings({ ...settings, gradingSchemes: schemes });
  };

  const addGradingRule = () => {
    let schemes = [...settings.gradingSchemes];
    let schemeIndex = schemes.findIndex(s => s.contextId === selectedGradingCourseId);

    if (schemeIndex === -1) {
       const newScheme: GradingScheme = { contextId: selectedGradingCourseId, rules: [] };
       schemes.push(newScheme);
       schemeIndex = schemes.length - 1;
    }

    schemes[schemeIndex].rules.push({
      grade: 'New', minScore: 0, maxScore: 0, points: 0, status: 'Fail'
    });

    setSettings({ ...settings, gradingSchemes: schemes });
  };

  const removeGradingRule = (index: number) => {
    let schemes = [...settings.gradingSchemes];
    let schemeIndex = schemes.findIndex(s => s.contextId === selectedGradingCourseId);
    if (schemeIndex !== -1) {
       schemes[schemeIndex].rules = schemes[schemeIndex].rules.filter((_, i) => i !== index);
       setSettings({ ...settings, gradingSchemes: schemes });
    }
  };

  // Filter staff for Access Tab
  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(accessSearchTerm.toLowerCase()) || 
    s.staffId.toLowerCase().includes(accessSearchTerm.toLowerCase())
  );

  const permissionGroups = {
    'Administration': ['admin_stats', 'admin_students', 'admin_staff', 'admin_attendance'],
    'Academics': ['acad_data', 'acad_timetable', 'acad_reports'],
    'Accounting': ['acc_overview', 'acc_fees', 'acc_payments', 'acc_expenses', 'acc_inventory'],
    'Communication & LMS': ['comm_general', 'lms_content']
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Configuration</h2>
          <p className="text-sm text-gray-600">Manage global settings, academic rules, and user access.</p>
        </div>
        
        <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-300 overflow-x-auto max-w-full">
          {[
            { id: 'general', label: 'General Profile', icon: Building2 },
            { id: 'academics', label: 'Academic Rules', icon: GraduationCap },
            { id: 'grading', label: 'Grading System', icon: Settings2 },
            { id: 'access', label: 'Access Control', icon: Shield }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-emerald-700 text-white shadow' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* --- GENERAL SETTINGS TAB --- */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 max-w-4xl">
           <div className="p-6 border-b border-gray-200">
             <h3 className="font-bold text-lg text-gray-900">Institute Profile</h3>
             <p className="text-sm text-gray-500">These details appear on reports, ID cards, and receipts.</p>
           </div>
           <div className="p-6 space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">Institute Name</label>
                   <input 
                     type="text"
                     value={settings.instituteName}
                     onChange={(e) => setSettings({...settings, instituteName: e.target.value})}
                     className="w-full p-2 border border-gray-300 rounded font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                   />
                </div>
                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">Official Email</label>
                   <input 
                     type="email"
                     value={settings.contactEmail}
                     onChange={(e) => setSettings({...settings, contactEmail: e.target.value})}
                     className="w-full p-2 border border-gray-300 rounded font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                   />
                </div>
                <div className="md:col-span-2">
                   <label className="block text-sm font-bold text-gray-700 mb-1">Physical Address</label>
                   <input 
                     type="text"
                     value={settings.instituteAddress}
                     onChange={(e) => setSettings({...settings, instituteAddress: e.target.value})}
                     className="w-full p-2 border border-gray-300 rounded font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                   />
                </div>
                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">Contact Phone</label>
                   <input 
                     type="tel"
                     value={settings.contactPhone}
                     onChange={(e) => setSettings({...settings, contactPhone: e.target.value})}
                     className="w-full p-2 border border-gray-300 rounded font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                   />
                </div>
             </div>
             
             <div className="flex justify-end pt-4 border-t border-gray-100">
                <button onClick={handleSaveSettings} className="bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-800 flex items-center gap-2 shadow-sm">
                   <Save size={18} /> Save Profile
                </button>
             </div>
           </div>
        </div>
      )}

      {/* --- ACADEMIC RULES TAB --- */}
      {activeTab === 'academics' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 max-w-4xl">
           <div className="p-6 border-b border-gray-200">
             <h3 className="font-bold text-lg text-gray-900">Academic Session Management</h3>
             <p className="text-sm text-gray-500">Activate and manage academic years and semesters. This controls student promotion and fee generation.</p>
           </div>
           <div className="p-6 space-y-8">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                     <h4 className="font-bold text-blue-900 flex items-center gap-2"><Calendar size={18}/> Active Session</h4>
                     <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                           <label className="block text-xs font-bold text-blue-800 mb-1">Academic Year</label>
                           <input 
                              type="text"
                              value={settings.academicYear}
                              onChange={(e) => setSettings({...settings, academicYear: e.target.value})}
                              className="w-full p-2 border border-blue-200 rounded text-sm bg-white font-bold"
                              placeholder="e.g. 2024/2025"
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-blue-800 mb-1">Current Semester</label>
                           <select 
                              value={settings.currentSemester}
                              onChange={(e) => setSettings({...settings, currentSemester: e.target.value})}
                              className="w-full p-2 border border-blue-200 rounded text-sm bg-white font-bold"
                           >
                              <option value="Semester 1">Semester 1</option>
                              <option value="Semester 2">Semester 2</option>
                           </select>
                        </div>
                     </div>
                  </div>
                  <div className="flex-1 border-t md:border-t-0 md:border-l border-blue-200 pt-4 md:pt-0 md:pl-6">
                      <h4 className="font-bold text-blue-900">Duration</h4>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                           <label className="block text-xs font-bold text-blue-800 mb-1">Start Date</label>
                           <input 
                              type="date"
                              value={settings.semesterStartDate || ''}
                              onChange={(e) => setSettings({...settings, semesterStartDate: e.target.value})}
                              className="w-full p-2 border border-blue-200 rounded text-sm bg-white"
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-blue-800 mb-1">End Date</label>
                           <input 
                              type="date"
                              value={settings.semesterEndDate || ''}
                              onChange={(e) => setSettings({...settings, semesterEndDate: e.target.value})}
                              className="w-full p-2 border border-blue-200 rounded text-sm bg-white"
                           />
                        </div>
                      </div>
                  </div>
              </div>

              <div>
                 <h4 className="font-bold text-gray-900 mb-3">Eligibility Rules</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                       <label className="block text-sm font-bold text-gray-700 mb-1">Minimum Attendance (%)</label>
                       <div className="relative">
                         <input 
                           type="number"
                           value={settings.minAttendancePercent}
                           onChange={(e) => setSettings({...settings, minAttendancePercent: Number(e.target.value)})}
                           className="w-full p-2 border border-gray-300 rounded font-medium"
                         />
                         <span className="absolute right-8 top-2 text-gray-500 font-bold">%</span>
                       </div>
                       <p className="text-xs text-gray-500 mt-1">Students below this threshold are flagged as ineligible for exams.</p>
                    </div>
                 </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-start gap-3">
                 <AlertTriangle className="text-yellow-600 flex-shrink-0" size={20} />
                 <div>
                    <h4 className="font-bold text-yellow-800 text-sm">Warning</h4>
                    <p className="text-xs text-yellow-700 mt-1">
                       Saving a new academic year or semester will update the global system state. Ensure you have archived previous results before activating a new session.
                    </p>
                 </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button onClick={handleSaveSettings} className="bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-800 flex items-center gap-2 shadow-sm">
                   <Save size={18} /> Activate & Save Rules
                </button>
             </div>
           </div>
        </div>
      )}

      {/* --- GRADING SYSTEM TAB --- */}
      {activeTab === 'grading' && (
         <div className="bg-white rounded-lg shadow-sm border border-gray-200">
           <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
             <div>
               <h3 className="font-bold text-lg text-gray-900">Grading Configuration</h3>
               <p className="text-sm text-gray-500">Define grading logic per course or use the system default.</p>
             </div>
             <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-lg border border-gray-200">
               <span className="text-xs font-bold text-gray-500 pl-2">Context:</span>
               <select 
                  value={selectedGradingCourseId}
                  onChange={(e) => setSelectedGradingCourseId(e.target.value)}
                  className="bg-white border border-gray-300 text-gray-800 text-sm rounded p-1.5 font-bold outline-none focus:ring-2 focus:ring-emerald-500"
               >
                  <option value="default">System Default</option>
                  {MOCK_COURSES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
             </div>
           </div>
           
           <div className="p-4 bg-emerald-50 border-b border-emerald-100 text-center text-emerald-800 text-sm font-medium">
              Editing Grading Rules for: <span className="font-bold">{selectedGradingCourseId === 'default' ? 'System Default (All Courses)' : MOCK_COURSES.find(c => c.id === selectedGradingCourseId)?.name}</span>
           </div>

           <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-700 border-b border-gray-200">
                   <tr>
                     <th className="p-4 font-bold">Grade</th>
                     <th className="p-4 font-bold text-center">Min Score</th>
                     <th className="p-4 font-bold text-center">Max Score</th>
                     <th className="p-4 font-bold text-center">Points</th>
                     <th className="p-4 font-bold text-center">Status</th>
                     <th className="p-4 font-bold text-right">Action</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                   {getCurrentGradingRules().length === 0 && (
                     <tr><td colSpan={6} className="p-8 text-center text-gray-500 italic">No rules defined for this context. Add a rule to start.</td></tr>
                   )}
                   {getCurrentGradingRules().map((rule, idx) => (
                     <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-4">
                           <input 
                             type="text" 
                             value={rule.grade}
                             onChange={(e) => updateGradingRule(idx, 'grade', e.target.value)}
                             className="w-16 text-center font-bold text-gray-900 border-b border-gray-300 focus:border-emerald-500 outline-none bg-transparent"
                           />
                        </td>
                        <td className="p-4 text-center">
                           <input 
                             type="number" 
                             value={rule.minScore}
                             onChange={(e) => updateGradingRule(idx, 'minScore', Number(e.target.value))}
                             className="w-20 text-center border border-gray-300 rounded p-1"
                           />
                        </td>
                        <td className="p-4 text-center">
                           <input 
                             type="number" 
                             value={rule.maxScore}
                             onChange={(e) => updateGradingRule(idx, 'maxScore', Number(e.target.value))}
                             className="w-20 text-center border border-gray-300 rounded p-1"
                           />
                        </td>
                        <td className="p-4 text-center">
                           <input 
                             type="number" 
                             step="0.1"
                             value={rule.points}
                             onChange={(e) => updateGradingRule(idx, 'points', Number(e.target.value))}
                             className="w-20 text-center border border-gray-300 rounded p-1"
                           />
                        </td>
                        <td className="p-4 text-center">
                           <select 
                             value={rule.status}
                             onChange={(e) => updateGradingRule(idx, 'status', e.target.value)}
                             className={`p-1 rounded text-xs font-bold border ${rule.status === 'Pass' ? 'text-green-700 border-green-200 bg-green-50' : 'text-red-700 border-red-200 bg-red-50'}`}
                           >
                             <option value="Pass">Pass</option>
                             <option value="Fail">Fail</option>
                           </select>
                        </td>
                        <td className="p-4 text-right">
                           <button onClick={() => removeGradingRule(idx)} className="text-gray-400 hover:text-red-600 transition-colors">
                             <Trash2 size={16} />
                           </button>
                        </td>
                     </tr>
                   ))}
                </tbody>
              </table>
           </div>
           <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <button onClick={addGradingRule} className="text-emerald-700 font-bold text-sm flex items-center gap-1 hover:underline">
                 <Plus size={16} /> Add Grade Rule
              </button>
              <button onClick={handleSaveSettings} className="bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-800 flex items-center gap-2 shadow-sm text-sm">
                 <Save size={16} /> Save Grading Scheme
              </button>
           </div>
         </div>
      )}

      {/* --- ACCESS CONTROL TAB --- */}
      {activeTab === 'access' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-200px)]">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
               <h3 className="font-bold text-gray-900">Staff Granular Permissions</h3>
               <p className="text-xs text-gray-500">Click on a permission badge to toggle: None → Viewer → Editor.</p>
            </div>
            <div className="flex items-center gap-4">
               <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <input 
                    type="text" 
                    placeholder="Search staff..." 
                    value={accessSearchTerm}
                    onChange={(e) => setAccessSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" 
                  />
               </div>
               <button onClick={handleSavePermissions} className="bg-blue-700 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-800 flex items-center gap-2 shadow-sm text-sm">
                  <Save size={16} /> Save Changes
               </button>
            </div>
          </div>

          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 font-semibold text-gray-700 sticky left-0 bg-gray-100 z-20">Staff Member</th>
                  {Object.keys(permissionGroups).map(groupName => (
                    <th key={groupName} colSpan={(permissionGroups as any)[groupName].length} className="px-4 py-3 font-bold text-gray-800 text-center border-l border-gray-300">
                      {groupName}
                    </th>
                  ))}
                </tr>
                <tr className="border-b border-gray-200 bg-gray-50">
                   <th className="sticky left-0 bg-gray-50 z-20"></th>
                   {Object.values(permissionGroups).flat().map((permKey) => (
                      <th key={permKey} className="px-2 py-2 font-mono text-xs text-gray-500 text-center border-l border-gray-200">
                         {permKey.split('_')[1] || permKey}
                      </th>
                   ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStaff.map(staff => (
                  <tr key={staff.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 sticky left-0 bg-white z-10 border-r border-gray-200 shadow-[4px_0_4px_-2px_rgba(0,0,0,0.05)]">
                      <div>
                        <p className="font-bold text-gray-900">{staff.name}</p>
                        <p className="text-xs text-gray-600 font-mono">{staff.staffId}</p>
                        <p className="text-[10px] text-gray-400 uppercase mt-1">{staff.designation}</p>
                      </div>
                    </td>
                    {Object.values(permissionGroups).flat().map((permKey) => {
                      const module = permKey as keyof StaffPermissions;
                      const perm = staff.permissions[module];
                      return (
                        <td key={module} className="px-2 py-4 text-center border-l border-gray-100">
                           <button
                             onClick={() => cyclePermission(staff.id, module)}
                             className={`px-2 py-1 rounded-full text-[10px] font-bold border transition-all w-16 flex items-center justify-center gap-1 mx-auto ${
                               perm === 'Editor' ? 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' :
                               perm === 'Viewer' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200' :
                               'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200'
                             }`}
                           >
                             {perm === 'Editor' && <Edit3 size={8} />}
                             {perm === 'Viewer' && <Eye size={8} />}
                             {perm === 'None' && <Lock size={8} />}
                             {perm === 'None' ? 'No' : perm}
                           </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
