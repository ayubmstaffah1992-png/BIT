
import React, { useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MOCK_FINANCIALS, MOCK_COURSES, MOCK_INVENTORY, MOCK_COA, MOCK_STUDENTS, DEFAULT_PERMISSIONS } from '../constants';
import { Course, FinancialRecord, InventoryItem, ChartAccount, UserRole, StaffPermissions } from '../types';
import { analyzeFinancialHealth } from '../services/geminiService';
import { 
  Sparkles, Plus, Upload, FileSpreadsheet, Printer, 
  TrendingUp, TrendingDown, DollarSign, Package, 
  CreditCard, Settings, Search, FileText, X, Download, Filter,
  AlertCircle, CheckCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface AccountingProps {
  role?: UserRole;
  currentUserId?: string;
  permissions?: StaffPermissions;
}

export const Accounting: React.FC<AccountingProps> = ({ role = UserRole.ADMIN, currentUserId, permissions = DEFAULT_PERMISSIONS }) => {
  // Default view based on permissions
  const defaultView = 
    permissions.acc_overview !== 'None' ? 'overview' : 
    permissions.acc_fees !== 'None' ? 'fees' : 
    permissions.acc_payments !== 'None' ? 'payments' : 'reports';

  const [view, setView] = useState<'overview' | 'fees' | 'payments' | 'expenditure' | 'inventory' | 'coa' | 'reports'>(defaultView as any);
  
  // --- Data States ---
  const [transactions, setTransactions] = useState<FinancialRecord[]>(MOCK_FINANCIALS);
  const [courses, setCourses] = useState<Course[]>(MOCK_COURSES);
  const [inventory, setInventory] = useState<InventoryItem[]>(MOCK_INVENTORY);
  const [coa, setCoa] = useState<ChartAccount[]>(MOCK_COA);
  
  // --- AI Analysis ---
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState(false);

  // --- Modal States ---
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showCoaModal, setShowCoaModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkType, setBulkType] = useState<'payments' | 'expenditure' | 'inventory'>('payments');

  // --- Form Data States ---
  const [newPayment, setNewPayment] = useState<Partial<FinancialRecord>>({ type: 'Income', date: new Date().toISOString().split('T')[0] });
  const [newExpense, setNewExpense] = useState<Partial<FinancialRecord>>({ type: 'Expense', date: new Date().toISOString().split('T')[0] });
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({ lastUpdated: new Date().toISOString().split('T')[0] });
  const [newAccount, setNewAccount] = useState<Partial<ChartAccount>>({ type: 'Expense' });
  
  // --- Report Filters ---
  const [reportFilter, setReportFilter] = useState({
    type: 'fees',
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // --- STUDENT / PARENT PORTAL LOGIC ---
  if (role === UserRole.STUDENT || role === UserRole.PARENT) {
    // ... Existing Student View ...
    let targetStudent = MOCK_STUDENTS.find(s => s.id === currentUserId);
    if (role === UserRole.PARENT) {
      targetStudent = MOCK_STUDENTS.find(s => s.parentId === currentUserId) || MOCK_STUDENTS[0];
    }
    if (!targetStudent) return <div className="p-6">Student record not found.</div>;
    const course = MOCK_COURSES.find(c => c.id === targetStudent?.courseId);
    const studentPayments = transactions.filter(t => t.studentId === targetStudent?.id && t.type === 'Income');
    const totalPaid = studentPayments.reduce((acc, curr) => acc + curr.amount, 0);
    const totalFee = course?.fee || 0;
    const balance = totalFee - totalPaid;
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-full">
         <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            {/* ... Content ... */}
            <div className="flex justify-between items-start border-b border-gray-200 pb-6 mb-6">
               <div><h2 className="text-2xl font-bold text-gray-900">My Fee Statement</h2><p className="text-gray-600 mt-1">Financial status for <span className="font-bold text-emerald-700">{targetStudent.name}</span></p></div>
               <div className="text-right"><p className="text-xs font-bold text-gray-500 uppercase">Course</p><p className="font-bold text-gray-900">{course?.name}</p></div>
            </div>
            {/* ... Stats ... */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
               <div className="bg-gray-50 p-4 rounded-lg border border-gray-200"><p className="text-xs font-bold text-gray-500 uppercase mb-1">Total Course Fee</p><p className="text-2xl font-extrabold text-gray-900">TZS {totalFee.toLocaleString()}</p></div>
               <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200"><p className="text-xs font-bold text-emerald-700 uppercase mb-1">Total Paid</p><p className="text-2xl font-extrabold text-emerald-800">TZS {totalPaid.toLocaleString()}</p></div>
               <div className={`p-4 rounded-lg border ${balance > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}><p className={`text-xs font-bold uppercase mb-1 ${balance > 0 ? 'text-red-700' : 'text-green-700'}`}>Outstanding Balance</p><p className={`text-2xl font-extrabold ${balance > 0 ? 'text-red-800' : 'text-green-800'}`}>TZS {Math.max(0, balance).toLocaleString()}</p>{balance <= 0 && <span className="text-xs font-bold text-green-700 flex items-center gap-1 mt-1"><CheckCircle size={12}/> Fully Paid</span>}</div>
            </div>
            {/* ... Table ... */}
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><CreditCard size={18}/> Payment History</h3>
            <div className="overflow-hidden border border-gray-200 rounded-lg"><table className="w-full text-left text-sm"><thead className="bg-gray-100 text-gray-800"><tr><th className="p-3 font-bold">Date</th><th className="p-3 font-bold">Reference</th><th className="p-3 font-bold">Description</th><th className="p-3 font-bold text-right">Amount Paid</th></tr></thead><tbody className="divide-y divide-gray-200">{studentPayments.length > 0 ? studentPayments.map(p => (<tr key={p.id} className="hover:bg-gray-50"><td className="p-3 font-mono text-gray-700 font-bold">{p.date}</td><td className="p-3 font-mono font-bold text-gray-800">{p.reference || '-'}</td><td className="p-3 text-gray-700">{p.description}</td><td className="p-3 text-right font-bold text-emerald-700">{p.amount.toLocaleString()}</td></tr>)) : (<tr><td colSpan={4} className="p-6 text-center text-gray-500 italic">No payment records found.</td></tr>)}</tbody></table></div>
         </div>
      </div>
    );
  }

  // --- ADMIN / STAFF LOGIC ---

  // ... (Existing Helpers, AI, CRUD)
  const totalIncome = transactions.filter(t => t.type === 'Income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'Expense').reduce((acc, curr) => acc + curr.amount, 0);
  const totalInventoryValue = inventory.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0);

  const handleAiAnalysis = async () => {
    setLoadingAi(true);
    const summary = `Total Income: ${totalIncome}. Total Expense: ${totalExpense}. Net: ${totalIncome - totalExpense}. Top Expense Category: ${transactions.filter(t => t.type === 'Expense').sort((a,b) => b.amount - a.amount)[0]?.category || 'None'}. Inventory Value: ${totalInventoryValue}.`;
    const result = await analyzeFinancialHealth(summary);
    setAiAnalysis(result);
    setLoadingAi(false);
  };
  // ... (Update Functions)
  const handleUpdateFee = (courseId: string, newFee: number) => { setCourses(courses.map(c => c.id === courseId ? { ...c, fee: newFee } : c)); };
  const handleUpdateInstallments = (courseId: string, installments: number) => { setCourses(courses.map(c => c.id === courseId ? { ...c, installments: Math.max(1, installments) } : c)); };
  // ... (Save Handlers)
  const handleSavePayment = (e: React.FormEvent) => { e.preventDefault(); const record: FinancialRecord = { id: `pay_${Date.now()}`, type: 'Income', category: 'Tuition Fees', amount: Number(newPayment.amount), date: newPayment.date!, description: newPayment.description || 'Fee Payment', studentId: newPayment.studentId, reference: newPayment.reference }; setTransactions([record, ...transactions]); setShowPaymentModal(false); setNewPayment({ type: 'Income', date: new Date().toISOString().split('T')[0] }); };
  const handleSaveExpense = (e: React.FormEvent) => { e.preventDefault(); const record: FinancialRecord = { id: `exp_${Date.now()}`, type: 'Expense', category: newExpense.category || 'General', amount: Number(newExpense.amount), date: newExpense.date!, description: newExpense.description || 'Expense', reference: newExpense.reference }; setTransactions([record, ...transactions]); setShowExpenseModal(false); setNewExpense({ type: 'Expense', date: new Date().toISOString().split('T')[0] }); };
  const handleSaveInventory = (e: React.FormEvent) => { e.preventDefault(); const item: InventoryItem = { id: `inv_${Date.now()}`, name: newItem.name!, category: newItem.category || 'General', quantity: Number(newItem.quantity), unitPrice: Number(newItem.unitPrice), lastUpdated: new Date().toISOString().split('T')[0] }; setInventory([...inventory, item]); setShowInventoryModal(false); setNewItem({ lastUpdated: new Date().toISOString().split('T')[0] }); };
  const handleSaveAccount = (e: React.FormEvent) => { e.preventDefault(); const account: ChartAccount = { id: `ca_${Date.now()}`, code: newAccount.code!, name: newAccount.name!, type: newAccount.type! }; setCoa([...coa, account]); setShowCoaModal(false); setNewAccount({ type: 'Expense' }); };

  // ... (Bulk Upload)
  const downloadTemplate = () => { /* ... */ };
  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { /* ... */ };
  // ... (Chart Data)
  const chartData = [{ name: 'Income', amount: totalIncome }, { name: 'Expense', amount: totalExpense }];
  const COLORS = ['#059669', '#DC2626'];
  const expenseCategoryData = transactions.filter(t => t.type === 'Expense').reduce((acc: any[], curr) => { const existing = acc.find(a => a.name === curr.category); if (existing) existing.value += curr.amount; else acc.push({ name: curr.category, value: curr.amount }); return acc; }, []);
  const PIE_COLORS = ['#DC2626', '#EA580C', '#D97706', '#CA8A04', '#65A30D', '#0891B2', '#4F46E5', '#7C3AED'];
  const generateReportData = () => { /* ... */ return []; };

  const tabs = [
    { id: 'overview', label: 'Overview', permission: permissions.acc_overview },
    { id: 'fees', label: 'Fees Setup', permission: permissions.acc_fees },
    { id: 'payments', label: 'Payments', permission: permissions.acc_payments },
    { id: 'expenditure', label: 'Expenditure', permission: permissions.acc_expenses },
    { id: 'inventory', label: 'Inventory', permission: permissions.acc_inventory },
    { id: 'coa', label: 'Chart of Accounts', permission: permissions.acc_overview }, // Tied to overview usually
    { id: 'reports', label: 'Reports', permission: permissions.acc_overview }
  ].filter(t => t.permission !== 'None');

  return (
    <div className="p-6 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Financial Management</h2>
          <p className="text-sm text-gray-600">Manage fees, expenses, inventory & reports.</p>
        </div>
        <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-300 overflow-x-auto max-w-full">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setView(tab.id as any)}
              className={`px-4 py-2 rounded text-sm font-bold whitespace-nowrap transition-colors ${view === tab.id ? 'bg-purple-700 text-white shadow' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              {tab.label}
            </button>
          ))}
          {tabs.length === 0 && <span className="p-2 text-xs text-red-500 font-bold">Access Restricted</span>}
        </div>
      </div>

      {/* --- OVERVIEW VIEW --- */}
      {view === 'overview' && permissions.acc_overview !== 'None' && (
        <div className="space-y-6 animate-fade-in">
          {/* ... Dashboard Widgets ... */}
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-900">Financial Dashboard</h3>
            <button 
              onClick={handleAiAnalysis}
              disabled={loadingAi}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:shadow-lg disabled:opacity-50 font-bold text-sm"
            >
              <Sparkles size={16} />
              {loadingAi ? 'Analyzing...' : 'AI Insight'}
            </button>
          </div>
          {/* ... Graphs ... */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-emerald-500 border border-gray-200">
                <div className="flex justify-between items-start">
                  <div><p className="text-xs font-bold text-gray-500 uppercase">Total Income</p><h4 className="text-2xl font-extrabold text-gray-900 mt-1">TZS {totalIncome.toLocaleString()}</h4></div>
                  <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700"><TrendingUp size={20} /></div>
                </div>
             </div>
             {/* ... */}
          </div>
          {/* ... Chart Containers ... */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-80"><h4 className="font-bold text-gray-800 mb-4">Income vs Expense</h4><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}/><Bar dataKey="amount" fill="#8884d8" radius={[4, 4, 0, 0]}>{chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer></div>
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-80"><h4 className="font-bold text-gray-800 mb-4">Expense Breakdown</h4><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={expenseCategoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{expenseCategoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}</Pie><Tooltip contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}} /></PieChart></ResponsiveContainer></div>
          </div>
        </div>
      )}

      {/* --- FEES SETUP VIEW --- */}
      {view === 'fees' && permissions.acc_fees !== 'None' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-bold text-lg text-gray-900">Course Fee Structure</h3>
            <p className="text-sm text-gray-600">Set the tuition fees and installment plans for each registered course.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 text-gray-800">
                <tr><th className="p-4 font-bold">Course Name</th><th className="p-4 font-bold">Level</th><th className="p-4 font-bold">Mode</th><th className="p-4 font-bold">Total Fee (TZS)</th><th className="p-4 font-bold text-center">Installments</th><th className="p-4 font-bold text-right">Per Installment (TZS)</th><th className="p-4 font-bold text-right">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {courses.map(course => (
                  <tr key={course.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-900">{course.name}</td>
                    <td className="p-4 text-gray-700">{course.level}</td>
                    <td className="p-4 text-gray-700">{course.mode}</td>
                    <td className="p-4">
                      {permissions.acc_fees === 'Editor' ? (
                        <input type="number" className="border border-gray-300 rounded p-1 w-32 font-mono text-gray-800 focus:ring-2 focus:ring-purple-500 outline-none font-medium" value={course.fee} onChange={(e) => handleUpdateFee(course.id, Number(e.target.value))} />
                      ) : (
                        <span className="font-mono text-gray-900">{course.fee.toLocaleString()}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {permissions.acc_fees === 'Editor' ? (
                        <input type="number" min="1" className="border border-gray-300 rounded p-1 w-20 font-mono text-gray-800 focus:ring-2 focus:ring-purple-500 outline-none text-center font-medium" value={course.installments || 1} onChange={(e) => handleUpdateInstallments(course.id, Number(e.target.value))} />
                      ) : (
                        <span className="font-mono text-gray-900">{course.installments || 1}</span>
                      )}
                    </td>
                    <td className="p-4 text-right text-gray-800 font-bold font-mono">{Math.ceil(course.fee / (course.installments || 1)).toLocaleString()}</td>
                    <td className="p-4 text-right"><button disabled={permissions.acc_fees !== 'Editor'} className="text-purple-700 font-bold text-xs hover:underline disabled:opacity-50">Update History</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- PAYMENTS VIEW --- */}
      {view === 'payments' && permissions.acc_payments !== 'None' && (
        <div className="space-y-4">
           <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
             <h3 className="font-bold text-gray-900">Fee Payments Log</h3>
             {permissions.acc_payments === 'Editor' && (
                <div className="flex gap-2">
                  <button onClick={() => { setBulkType('payments'); setShowBulkUpload(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-bold text-sm shadow-sm"><FileSpreadsheet size={16} /> Bulk Upload</button>
                  <button onClick={() => setShowPaymentModal(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 font-bold text-sm shadow-sm"><Plus size={16} /> Record Payment</button>
                </div>
             )}
           </div>
           {/* ... Table ... */}
        </div>
      )}

      {/* --- EXPENDITURE VIEW --- */}
      {view === 'expenditure' && permissions.acc_expenses !== 'None' && (
         /* ... Similar structure check for acc_expenses permission ... */
         <div className="space-y-4">
            {/* ... Content ... */}
         </div>
      )}
      
      {/* ... Other tabs ... */}
    </div>
  );
};
