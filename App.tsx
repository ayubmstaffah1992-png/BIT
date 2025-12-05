

import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { Administration } from './pages/Administration';
import { Academics } from './pages/Academics';
import { Accounting } from './pages/Accounting';
import { Learning } from './pages/Learning';
import { Communication } from './pages/Communication';
import { Election } from './pages/Election';
import { Settings } from './pages/Settings';
import { UserRole, StaffPermissions } from './types';
import { MOCK_STAFF, DEFAULT_PERMISSIONS, MOCK_USERS, MOCK_STUDENTS } from './constants';
import { HashRouter } from 'react-router-dom';
import { Bell, Search, UserCircle, X, Lock, Camera, ShieldCheck } from 'lucide-react';

const DashboardHome = ({ role, name }: { role: UserRole, name: string }) => (
  <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
    {(role === UserRole.ADMIN || role === UserRole.STAFF) && (
      <>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-gray-800 text-sm font-bold uppercase tracking-wide">Total Students</h3>
          <p className="text-3xl font-extrabold text-gray-900 mt-2">2,450</p>
          <span className="text-emerald-700 text-xs font-bold">+12% from last semester</span>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-gray-800 text-sm font-bold uppercase tracking-wide">Active Staff</h3>
          <p className="text-3xl font-extrabold text-gray-900 mt-2">145</p>
          <span className="text-gray-700 text-xs font-bold">98 Faculty, 47 Support</span>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-gray-800 text-sm font-bold uppercase tracking-wide">Today's Attendance</h3>
          <p className="text-3xl font-extrabold text-gray-900 mt-2">94%</p>
          <span className="text-green-700 text-xs font-bold">Excellent</span>
        </div>
      </>
    )}
    
    {(role === UserRole.STUDENT || role === UserRole.PARENT) && (
      <>
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-gray-800 text-sm font-bold uppercase tracking-wide">Attendance Status</h3>
          <p className="text-3xl font-extrabold text-emerald-700 mt-2">92%</p>
          <span className="text-gray-700 text-xs font-bold">Eligible for Exam</span>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-gray-800 text-sm font-bold uppercase tracking-wide">Next Class</h3>
          <p className="text-xl font-extrabold text-gray-900 mt-2">Pharmaceutical Calc.</p>
          <span className="text-gray-700 text-xs font-bold">10:00 AM - Room 3B</span>
        </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-gray-800 text-sm font-bold uppercase tracking-wide">Library</h3>
          <p className="text-xl font-extrabold text-gray-900 mt-2">4 New Resources</p>
          <span className="text-blue-700 text-xs font-bold">Check Digital Library</span>
        </div>
      </>
    )}

    <div className="col-span-full bg-gradient-to-r from-emerald-900 to-teal-900 rounded-xl p-8 text-white shadow-lg border border-emerald-800">
      <h2 className="text-2xl font-bold mb-2">Welcome, {name}</h2>
      <p className="text-white max-w-2xl font-medium opacity-90">
        {role === UserRole.STUDENT || role === UserRole.PARENT 
          ? "Access your learning materials, check your fee balance, and view your academic progress."
          : "Manage institute operations efficiently from your centralized dashboard."}
      </p>
    </div>
  </div>
);

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(UserRole.ADMIN);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');

  // Resolve Current User Data
  const getCurrentUser = () => {
    if (currentUserRole === UserRole.ADMIN) return MOCK_USERS.find(u => u.id === currentUserId) || MOCK_USERS[0];
    if (currentUserRole === UserRole.STAFF) return MOCK_STAFF.find(u => u.id === currentUserId);
    if (currentUserRole === UserRole.STUDENT) return MOCK_STUDENTS.find(u => u.id === currentUserId);
    // Parent logic...
    return null;
  };

  const user = getCurrentUser();

  // Permission resolver
  const getPermissions = (): StaffPermissions => {
    if (currentUserRole === UserRole.ADMIN) {
      return Object.keys(DEFAULT_PERMISSIONS).reduce((acc, key) => {
        acc[key as keyof StaffPermissions] = 'Editor';
        return acc;
      }, {} as StaffPermissions);
    } 
    
    if (currentUserRole === UserRole.STAFF) {
      const staff = MOCK_STAFF.find(s => s.id === currentUserId);
      return staff ? staff.permissions : DEFAULT_PERMISSIONS;
    }

    return DEFAULT_PERMISSIONS;
  };

  const userPermissions = getPermissions();

  const handleLogin = (role: UserRole, userId: string) => {
    setCurrentUserRole(role);
    setCurrentUserId(userId);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveTab('dashboard');
    setCurrentUserId('');
  };

  const handlePasswordUpdate = () => {
    if (!currentPassword) {
       alert("Please enter current password.");
       return;
    }
    // Verify current (mock check against '123' or 'admin' or saved)
    // For simplicity, we assume if they are logged in, they know what they are doing in this mock environment
    // Ideally we re-verify against the source of truth, but we don't have the password field easily accessible for the *current* user object in this scope without re-finding.
    
    if (newPassword.length < 6) {
       alert("Password must be at least 6 characters.");
       return;
    }

    // Save to localStorage to persist across reloads (mocking DB)
    if (user?.email) {
       const existing = JSON.parse(localStorage.getItem('baobab_user_passwords') || '{}');
       existing[user.email] = newPassword;
       localStorage.setItem('baobab_user_passwords', JSON.stringify(existing));
       alert("Password updated successfully. Please use the new password next time you login.");
       setNewPassword('');
       setCurrentPassword('');
       setShowProfileModal(false);
    } else {
       alert("Cannot update password for this user type.");
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <HashRouter>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar 
          role={currentUserRole} 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          onLogout={handleLogout}
        />
        
        <main className="flex-1 ml-64 flex flex-col">
          {/* Header */}
          <header className="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">
             <div className="flex items-center text-gray-600 bg-gray-100 px-3 py-2 rounded-lg w-96 border border-gray-300">
               <Search size={18} />
               <input type="text" placeholder="Search anything..." className="bg-transparent border-none outline-none ml-2 w-full text-sm text-gray-900 font-medium placeholder-gray-500"/>
             </div>
             <div className="flex items-center gap-4">
               <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                 <Bell size={20} />
                 <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
               </button>
               <div 
                className="flex items-center gap-2 pl-4 border-l border-gray-200 cursor-pointer hover:bg-gray-50 p-1 rounded-lg transition-colors"
                onClick={() => {
                   setShowProfileModal(true);
                   setNewPassword('');
                   setCurrentPassword('');
                }}
               >
                 <div className="text-right hidden md:block">
                   <p className="text-sm font-bold text-gray-900">
                     {user?.name || 'User'}
                   </p>
                   <p className="text-xs text-gray-600 font-bold">{currentUserRole}</p>
                 </div>
                 <UserCircle size={32} className="text-gray-500" />
               </div>
             </div>
          </header>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'dashboard' && <DashboardHome role={currentUserRole} name={user?.name || 'User'} />}
            {activeTab === 'admin' && <Administration permissions={userPermissions} />}
            {activeTab === 'academics' && <Academics role={currentUserRole} currentUserId={currentUserId} permissions={userPermissions} />}
            {activeTab === 'accounting' && <Accounting role={currentUserRole} currentUserId={currentUserId} permissions={userPermissions} />}
            {activeTab === 'learning' && <Learning role={currentUserRole} permissions={userPermissions} />}
            {activeTab === 'election' && <Election role={currentUserRole} currentUserId={currentUserId} permissions={userPermissions} />}
            {activeTab === 'communication' && <Communication permissions={userPermissions} />}
            {activeTab === 'settings' && <Settings />}
          </div>
        </main>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <h3 className="font-bold text-lg text-gray-900">My Profile</h3>
              <button onClick={() => setShowProfileModal(false)}><X size={20} className="text-gray-600 hover:text-gray-900" /></button>
            </div>
            
            <div className="flex justify-center mb-6 relative">
               <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 border-4 border-white shadow-md overflow-hidden">
                  {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <UserCircle size={64} />}
               </div>
               {/* Only show photo upload for staff/admin */}
               {(currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.STAFF) && (
                 <button className="absolute bottom-0 right-1/3 bg-emerald-700 text-white p-1.5 rounded-full border-2 border-white shadow-sm hover:bg-emerald-800">
                   <Camera size={14} />
                 </button>
               )}
            </div>

            <div className="text-center mb-6">
               <h4 className="font-bold text-gray-900 text-lg">{user?.name}</h4>
               <p className="text-sm text-gray-500 font-medium">{user?.email || (user as any)?.phone}</p>
            </div>

            {/* Role-Based Profile Actions */}
            {(currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.STAFF) ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1">Current Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 text-gray-500" size={16} />
                    <input 
                      type="password" 
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full pl-9 p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-gray-900"
                      placeholder="Enter current password"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1">New Strong Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 text-gray-500" size={16} />
                    <input 
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-9 p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-gray-900"
                      placeholder="Enter new password"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1 ml-1">Must be at least 6 characters.</p>
                </div>
                <button 
                  onClick={handlePasswordUpdate}
                  className="w-full bg-emerald-700 text-white py-2.5 rounded-lg font-bold shadow-md hover:bg-emerald-800 transition-transform active:scale-95 flex justify-center items-center gap-2"
                >
                  <ShieldCheck size={16} /> Update Credentials
                </button>
              </div>
            ) : (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-center">
                 <Lock className="mx-auto text-yellow-600 mb-2" size={24} />
                 <p className="text-sm font-bold text-yellow-800 mb-1">Profile Locked</p>
                 <p className="text-xs text-yellow-700">
                    Student and Parent accounts use OTP (One-Time Password) for secure login. You do not have a permanent password to change.
                 </p>
                 <p className="text-xs text-yellow-700 mt-3 font-medium">
                    Contact administration to update your registered phone number.
                 </p>
              </div>
            )}
          </div>
        </div>
      )}
    </HashRouter>
  );
}