import React, { useState, useEffect } from 'react';
import { MOCK_STUDENTS, MOCK_STAFF, MOCK_COURSES, MOCK_COMMUNICATION_LOGS, DEFAULT_PERMISSIONS } from '../constants';
import { CommunicationLog, StaffPermissions } from '../types';
import { 
  MessageSquare, Mail, Send, Users, History, 
  Filter, CheckSquare, Square, Smartphone, Search
} from 'lucide-react';

interface CommunicationProps {
  permissions?: StaffPermissions;
}

export const Communication: React.FC<CommunicationProps> = ({ permissions = DEFAULT_PERMISSIONS }) => {
  const [view, setView] = useState<'compose' | 'history'>('compose');
  
  // --- Compose State ---
  const [messageType, setMessageType] = useState<'SMS' | 'Email'>('SMS');
  const [recipientType, setRecipientType] = useState<'staff' | 'student' | 'parent'>('staff');
  
  // Filters
  const [staffFilter, setStaffFilter] = useState<'all' | 'Faculty' | 'Support'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  
  // Selection
  const [filteredList, setFilteredList] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Message Content
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  
  // --- History State ---
  const [logs, setLogs] = useState<CommunicationLog[]>(MOCK_COMMUNICATION_LOGS);

  // --- Effects ---
  // Update filtered list when filters change
  useEffect(() => {
    let list: any[] = [];
    if (recipientType === 'staff') {
      list = MOCK_STAFF.filter(s => staffFilter === 'all' ? true : s.staffType === staffFilter);
    } else if (recipientType === 'student') {
      list = MOCK_STUDENTS.filter(s => courseFilter === 'all' ? true : s.courseId === courseFilter);
    } else if (recipientType === 'parent') {
      // For parents, we list the student name they are associated with for clarity
      list = MOCK_STUDENTS.filter(s => courseFilter === 'all' ? true : s.courseId === courseFilter).map(s => ({
        ...s,
        id: s.parentId, // Use parent ID
        name: `Parent of ${s.name}`, // Display Name
        phone: s.phone, // Assuming parent phone is same/linked for mock
        email: s.email // Assuming parent email linked
      }));
    }
    setFilteredList(list);
    setSelectedIds(list.map(i => i.id)); // Default select all
  }, [recipientType, staffFilter, courseFilter]);

  // --- Handlers ---
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredList.map(i => i.id));
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      alert("Please select at least one recipient.");
      return;
    }
    if (!messageBody) {
      alert("Message body cannot be empty.");
      return;
    }

    // Create Log Description
    let groupName = '';
    if (recipientType === 'staff') groupName = staffFilter === 'all' ? 'All Staff' : `${staffFilter} Staff`;
    else {
      const courseName = courseFilter === 'all' ? 'All Courses' : MOCK_COURSES.find(c => c.id === courseFilter)?.name;
      groupName = recipientType === 'student' ? `${courseName} Students` : `Parents of ${courseName} Students`;
    }
    if (selectedIds.length !== filteredList.length) {
      groupName += ` (Selected ${selectedIds.length})`;
    }

    const newLog: CommunicationLog = {
      id: `log_${Date.now()}`,
      date: new Date().toLocaleString(),
      sender: 'Admin User',
      recipientGroup: groupName,
      recipientCount: selectedIds.length,
      type: messageType,
      subject: messageType === 'Email' ? subject : undefined,
      message: messageBody,
      status: 'Sent'
    };

    setLogs([newLog, ...logs]);
    alert(`Successfully sent ${messageType} to ${selectedIds.length} recipients.`);
    
    // Reset form
    setMessageBody('');
    setSubject('');
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Communication Hub</h2>
          <p className="text-sm text-gray-600 font-medium">Send bulk SMS and Emails to staff, students, and parents.</p>
        </div>
        <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-300">
          <button 
            onClick={() => setView('compose')}
            className={`px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-colors ${view === 'compose' ? 'bg-emerald-700 text-white shadow' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <Send size={16} /> Compose
          </button>
          <button 
            onClick={() => setView('history')}
            className={`px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-colors ${view === 'history' ? 'bg-emerald-700 text-white shadow' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <History size={16} /> Logs & History
          </button>
        </div>
      </div>

      {/* --- COMPOSE VIEW --- */}
      {view === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Filters & Recipients */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
               <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Filter size={18} className="text-emerald-600"/> Target Audience</h3>
               
               <div className="space-y-4">
                 {/* Recipient Type */}
                 <div>
                   <label className="block text-xs font-bold text-gray-800 mb-1">Who are you messaging?</label>
                   <div className="grid grid-cols-3 gap-2">
                     {['staff', 'student', 'parent'].map((t) => (
                       <button 
                        key={t}
                        onClick={() => setRecipientType(t as any)}
                        className={`py-2 text-xs font-bold capitalize rounded border ${recipientType === t ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                       >
                         {t}
                       </button>
                     ))}
                   </div>
                 </div>

                 {/* Secondary Filter */}
                 {recipientType === 'staff' && (
                   <div>
                     <label className="block text-xs font-bold text-gray-800 mb-1">Staff Category</label>
                     <select 
                      value={staffFilter}
                      onChange={(e) => setStaffFilter(e.target.value as any)}
                      className="w-full p-2 border border-gray-300 rounded text-sm bg-white text-gray-900 font-medium"
                     >
                       <option value="all">All Staff</option>
                       <option value="Faculty">Faculty Only</option>
                       <option value="Support">Support Staff Only</option>
                     </select>
                   </div>
                 )}

                 {(recipientType === 'student' || recipientType === 'parent') && (
                   <div>
                     <label className="block text-xs font-bold text-gray-800 mb-1">Filter by Course</label>
                     <select 
                      value={courseFilter}
                      onChange={(e) => setCourseFilter(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded text-sm bg-white text-gray-900 font-medium"
                     >
                       <option value="all">All Courses</option>
                       {MOCK_COURSES.map(c => (
                         <option key={c.id} value={c.id}>{c.name}</option>
                       ))}
                     </select>
                   </div>
                 )}
               </div>
            </div>

            {/* Recipient List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[400px]">
               <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                 <h4 className="font-bold text-sm text-gray-800">Recipients ({selectedIds.length})</h4>
                 <button onClick={handleSelectAll} className="text-xs font-bold text-emerald-700 hover:underline">
                   {selectedIds.length === filteredList.length ? 'Deselect All' : 'Select All'}
                 </button>
               </div>
               <div className="overflow-y-auto flex-1 p-2 space-y-1">
                 {filteredList.length === 0 && <p className="text-center text-gray-500 text-xs mt-4 font-medium">No recipients found.</p>}
                 {filteredList.map(r => (
                   <div 
                    key={r.id}
                    onClick={() => toggleSelection(r.id)}
                    className={`flex items-center gap-3 p-2 rounded cursor-pointer border ${selectedIds.includes(r.id) ? 'bg-emerald-50 border-emerald-200' : 'hover:bg-gray-50 border-transparent'}`}
                   >
                     <div className={`text-emerald-600 ${selectedIds.includes(r.id) ? 'opacity-100' : 'opacity-40'}`}>
                       {selectedIds.includes(r.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                     </div>
                     <div className="overflow-hidden">
                       <p className="text-sm font-bold text-gray-900 truncate">{r.name}</p>
                       <p className="text-xs text-gray-600 truncate font-medium">{recipientType === 'staff' ? r.staffId : r.studentId || 'Parent'}</p>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>

          {/* Right Column: Message Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
               <div className="p-6 border-b border-gray-200">
                  <h3 className="font-bold text-lg text-gray-900">Compose Message</h3>
               </div>
               <form onSubmit={handleSend} className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2">Channel</label>
                    <div className="flex gap-4">
                      <label className={`flex-1 p-4 border rounded-lg cursor-pointer flex items-center gap-3 transition-all ${messageType === 'SMS' ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'hover:bg-gray-50 border-gray-200'}`}>
                        <input type="radio" name="channel" className="hidden" checked={messageType === 'SMS'} onChange={() => setMessageType('SMS')} />
                        <div className={`p-2 rounded-full ${messageType === 'SMS' ? 'bg-emerald-200 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}><Smartphone size={20} /></div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">SMS</p>
                          <p className="text-xs text-gray-500 font-medium">Direct to phone</p>
                        </div>
                      </label>
                      <label className={`flex-1 p-4 border rounded-lg cursor-pointer flex items-center gap-3 transition-all ${messageType === 'Email' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'hover:bg-gray-50 border-gray-200'}`}>
                        <input type="radio" name="channel" className="hidden" checked={messageType === 'Email'} onChange={() => setMessageType('Email')} />
                        <div className={`p-2 rounded-full ${messageType === 'Email' ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-600'}`}><Mail size={20} /></div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">Email</p>
                          <p className="text-xs text-gray-500 font-medium">Newsletter & Updates</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {messageType === 'Email' && (
                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-1">Subject Line</label>
                      <input 
                        type="text" 
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 font-medium"
                        placeholder="Enter email subject..."
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-1">Message Content</label>
                    <textarea 
                      value={messageBody}
                      onChange={(e) => setMessageBody(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg h-40 outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 font-medium resize-none"
                      placeholder="Type your message here..."
                    ></textarea>
                    <div className="flex justify-between mt-2">
                       <p className="text-xs text-gray-500 font-bold">
                         {messageBody.length} characters
                         {messageType === 'SMS' && (
                            <span className={messageBody.length > 160 ? 'text-red-500' : 'text-emerald-600'}>
                               {messageBody.length > 160 ? ' (Multiple segments)' : ' (1 segment)'}
                            </span>
                         )}
                       </p>
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-emerald-700 text-white py-3 rounded-lg font-bold hover:bg-emerald-800 shadow-md flex items-center justify-center gap-2">
                     <Send size={18} /> Send {messageType} Blast
                  </button>
               </form>
            </div>
          </div>
        </div>
      )}

      {/* --- HISTORY VIEW --- */}
      {view === 'history' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 print-area">
           <div className="p-6 border-b border-gray-200 flex justify-between items-center print:hidden">
              <h3 className="font-bold text-lg text-gray-900">Communication Logs</h3>
              <div className="flex gap-3">
                 <div className="relative">
                   <Search className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                   <input type="text" placeholder="Search logs..." className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500" />
                 </div>
                 <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-800">
                   <History size={16} /> Print Logs
                 </button>
              </div>
           </div>
           
           <div className="overflow-x-auto">
             <div className="hidden print:block p-4 text-center border-b border-gray-300">
                <h1 className="text-xl font-bold">COMMUNICATION LOG REPORT</h1>
                <p className="text-sm text-gray-600">{new Date().toLocaleDateString()}</p>
             </div>
             <table className="w-full text-left text-sm">
               <thead className="bg-gray-100 text-gray-800 border-b border-gray-200">
                 <tr>
                   <th className="p-4 font-bold">Date</th>
                   <th className="p-4 font-bold">Sender</th>
                   <th className="p-4 font-bold">Recipient Group</th>
                   <th className="p-4 font-bold">Type</th>
                   <th className="p-4 font-bold">Message Preview</th>
                   <th className="p-4 font-bold text-center">Status</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-200">
                 {logs.map(log => (
                   <tr key={log.id} className="hover:bg-gray-50">
                     <td className="p-4 text-gray-600 font-mono text-xs font-bold">{log.date}</td>
                     <td className="p-4 font-bold text-gray-900">{log.sender}</td>
                     <td className="p-4">
                       <p className="font-bold text-gray-800">{log.recipientGroup}</p>
                       <p className="text-xs text-gray-500 font-medium">{log.recipientCount} Recipients</p>
                     </td>
                     <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold border ${log.type === 'Email' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                          {log.type}
                        </span>
                     </td>
                     <td className="p-4 max-w-xs">
                        {log.subject && <p className="font-bold text-gray-900 text-xs mb-1">Subject: {log.subject}</p>}
                        <p className="text-gray-600 truncate font-medium">{log.message}</p>
                     </td>
                     <td className="p-4 text-center">
                        <span className="text-green-700 font-bold text-xs flex items-center justify-center gap-1">
                          <CheckSquare size={12} /> {log.status}
                        </span>
                     </td>
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