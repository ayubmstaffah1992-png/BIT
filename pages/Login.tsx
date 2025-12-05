

import React, { useState } from 'react';
import { UserRole } from '../types';
import { Lock, Phone, User, ArrowRight, KeyRound, AlertCircle } from 'lucide-react';
import { MOCK_STAFF, MOCK_USERS, MOCK_STUDENTS } from '../constants';

interface LoginProps {
  onLogin: (role: UserRole, userId: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loginMethod, setLoginMethod] = useState<'staff' | 'student'>('staff');
  const [step, setStep] = useState<'input' | 'otp'>('input');
  
  // Staff Input
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Student Input
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  
  const [error, setError] = useState('');

  const getSavedPassword = (email: string) => {
    try {
      const overrides = JSON.parse(localStorage.getItem('baobab_user_passwords') || '{}');
      return overrides[email];
    } catch (e) {
      return null;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (loginMethod === 'staff') {
      // Normalize email for comparison (ignore case and spaces)
      const normalizedEmail = email.trim().toLowerCase();
      
      if (!normalizedEmail) {
        setError('Please enter your email address.');
        return;
      }

      // 1. Check Admin
      const admin = MOCK_USERS.find(u => u.email?.toLowerCase() === normalizedEmail);
      if (admin) {
        const savedPass = getSavedPassword(normalizedEmail);
        const validPass = savedPass || admin.password || 'admin123';
        if (password === validPass) {
          onLogin(UserRole.ADMIN, admin.id);
          return;
        } else {
          setError('Incorrect password.');
          return;
        }
      }

      // 2. Check Staff
      const staff = MOCK_STAFF.find(u => u.email?.toLowerCase() === normalizedEmail);
      if (staff) {
        const savedPass = getSavedPassword(normalizedEmail);
        const validPass = savedPass || staff.password || '123';
        if (password === validPass) {
           onLogin(UserRole.STAFF, staff.id);
           return;
        } else {
           setError('Incorrect password.');
           return;
        }
      }

      setError('No account found with this email address.');
    } else {
      // Student / Parent Flow
      if (step === 'input') {
        const student = MOCK_STUDENTS.find(s => s.phone === phone);
        if (student) {
          setStep('otp');
          // In a real app, send OTP API call here
        } else {
          // Check Parent? (Using student's phone for parent mock for now, or assume separate DB)
          // For demo, we stick to student lookup
          setError('Phone number not registered with any student.');
        }
      } else {
        // Verify OTP
        if (otp === '1234') { // Mock OTP
           const student = MOCK_STUDENTS.find(s => s.phone === phone);
           if (student) {
             onLogin(UserRole.STUDENT, student.id);
           }
        } else {
          setError('Invalid OTP Code. Try 1234.');
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 to-emerald-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-emerald-800/30">
        <div className="p-8 bg-emerald-50 text-center border-b border-emerald-100">
          <h1 className="text-2xl font-extrabold text-emerald-900 tracking-tight">BAOBAB INSTITUTE OF TANZANIA</h1>
          <p className="text-sm text-emerald-800 mt-1 font-bold">Management System</p>
        </div>

        <div className="p-8">
          {/* Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6 border border-gray-200">
            <button 
              onClick={() => { setLoginMethod('staff'); setStep('input'); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-md transition-all ${loginMethod === 'staff' ? 'bg-white shadow text-emerald-800 ring-1 ring-black/5' : 'text-gray-600 hover:text-gray-800'}`}
            >
              Staff / Admin
            </button>
            <button 
              onClick={() => { setLoginMethod('student'); setStep('input'); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-md transition-all ${loginMethod === 'student' ? 'bg-white shadow text-emerald-800 ring-1 ring-black/5' : 'text-gray-600 hover:text-gray-800'}`}
            >
              Student / Parent
            </button>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm font-bold">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {loginMethod === 'staff' ? (
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Email Address</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 text-gray-500" size={18} />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 font-medium placeholder:text-gray-500"
                      placeholder="admin@baobab.ac.tz"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 text-gray-500" size={18} />
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 font-medium placeholder:text-gray-500"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {step === 'input' ? (
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">Registered Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 text-gray-500" size={18} />
                      <input 
                        type="tel" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 font-medium placeholder:text-gray-500"
                        placeholder="+255 7XX XXX XXX"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-2 font-medium">You will receive an OTP to verify.</p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">Enter OTP Code</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3 text-gray-500" size={18} />
                      <input 
                        type="text" 
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none tracking-widest text-center font-mono text-lg font-bold text-gray-900"
                        placeholder="1234"
                        maxLength={4}
                        autoFocus
                        required
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <button 
              type="submit"
              className="w-full bg-emerald-700 text-white py-3 rounded-lg hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2 font-bold shadow-md"
            >
              {step === 'input' && loginMethod === 'student' ? 'Get OTP Code' : 'Secure Login'}
              <ArrowRight size={18} />
            </button>

            {step === 'otp' && (
              <button 
                type="button"
                onClick={() => { setStep('input'); setOtp(''); setError(''); }}
                className="w-full text-sm text-gray-600 hover:text-emerald-700 font-medium underline"
              >
                Change Phone Number
              </button>
            )}
            
            <div className="text-center pt-4 border-t border-gray-100">
               <p className="text-xs text-gray-500">
                  Default Staff Password: <span className="font-mono font-bold bg-gray-100 px-1 rounded">123</span><br/>
                  Admin Password: <span className="font-mono font-bold bg-gray-100 px-1 rounded">admin123</span><br/>
                  Mock OTP for Students: <span className="font-mono font-bold bg-gray-100 px-1 rounded">1234</span>
               </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};