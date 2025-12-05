
import React from 'react';
import { UserRole } from '../types';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  Calculator, 
  MessageSquare, 
  BookOpen, 
  Settings,
  LogOut,
  Vote
} from 'lucide-react';

interface SidebarProps {
  role: UserRole;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, activeTab, onTabChange, onLogout }) => {
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.STAFF, UserRole.STUDENT, UserRole.PARENT] },
    { id: 'admin', label: 'Administration', icon: Users, roles: [UserRole.ADMIN, UserRole.STAFF] },
    { id: 'academics', label: 'Academics', icon: GraduationCap, roles: [UserRole.ADMIN, UserRole.STAFF, UserRole.STUDENT, UserRole.PARENT] },
    { id: 'accounting', label: 'Accounting', icon: Calculator, roles: [UserRole.ADMIN, UserRole.STAFF] }, // Students view fees in profile
    { id: 'communication', label: 'Communication', icon: MessageSquare, roles: [UserRole.ADMIN, UserRole.STAFF] },
    { id: 'learning', label: 'Learning (LMS)', icon: BookOpen, roles: [UserRole.ADMIN, UserRole.STAFF, UserRole.STUDENT] },
    { id: 'election', label: 'Elections', icon: Vote, roles: [UserRole.ADMIN, UserRole.STAFF, UserRole.STUDENT] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: [UserRole.ADMIN] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(role));

  return (
    <div className="h-screen w-64 bg-emerald-950 text-white flex flex-col fixed left-0 top-0 z-20 shadow-xl">
      <div className="p-6 flex items-center justify-center border-b border-emerald-800/50 bg-emerald-900/50">
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-wider text-white">BAOBAB</h1>
          <p className="text-xs text-white font-medium opacity-90">Institute of Tanzania</p>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === item.id 
                ? 'bg-emerald-600 text-white shadow-lg font-bold' 
                : 'text-emerald-50 hover:bg-emerald-800/80 hover:text-white font-medium'
            }`}
          >
            <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'text-emerald-100'} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-emerald-800/50 bg-emerald-900/30">
        <button 
          onClick={onLogout}
          className="w-full flex items-center space-x-3 px-4 py-2 text-red-100 hover:bg-red-900/40 hover:text-white rounded-lg transition-colors font-bold"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};
