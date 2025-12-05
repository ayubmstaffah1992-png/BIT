
import React, { useState, useEffect } from 'react';
import { UserRole, StaffPermissions, ElectionPhase, ElectionPosition, Candidate, Student } from '../types';
import { MOCK_ELECTION_POSITIONS, MOCK_CANDIDATES, MOCK_STUDENTS } from '../constants';
import { 
  Vote, Settings, UserPlus, CheckCircle, Lock, 
  BarChart2, AlertCircle, Play, StopCircle, 
  Users, UserCheck, Plus, Trash2, Shield, Edit, X, Save, List,
  TrendingUp, Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

interface ElectionProps {
  role: UserRole;
  currentUserId: string;
  permissions?: StaffPermissions;
}

export const Election: React.FC<ElectionProps> = ({ role, currentUserId, permissions }) => {
  // --- State ---
  const [phase, setPhase] = useState<ElectionPhase>('IDLE');
  const [positions, setPositions] = useState<ElectionPosition[]>(MOCK_ELECTION_POSITIONS);
  
  // Initialize from LocalStorage or Default
  const [candidates, setCandidates] = useState<Candidate[]>(() => {
    const saved = localStorage.getItem('baobab_election_candidates');
    return saved ? JSON.parse(saved) : MOCK_CANDIDATES;
  });
  
  const [registeredVoters, setRegisteredVoters] = useState<string[]>(() => {
    const saved = localStorage.getItem('baobab_election_voters');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [hasVoted, setHasVoted] = useState<string[]>(() => {
    const saved = localStorage.getItem('baobab_election_has_voted');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [ballot, setBallot] = useState<Record<string, string>>({}); // { positionId: candidateId }

  // Admin Forms
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [newCandidate, setNewCandidate] = useState<Partial<Candidate>>({});

  // Position Management
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [newPositionTitle, setNewPositionTitle] = useState('');

  // Persistence Effects
  useEffect(() => {
    const savedPhase = localStorage.getItem('baobab_election_phase');
    if (savedPhase) setPhase(savedPhase as ElectionPhase);
  }, []);

  useEffect(() => {
    localStorage.setItem('baobab_election_candidates', JSON.stringify(candidates));
  }, [candidates]);

  useEffect(() => {
    localStorage.setItem('baobab_election_voters', JSON.stringify(registeredVoters));
  }, [registeredVoters]);

  useEffect(() => {
    localStorage.setItem('baobab_election_has_voted', JSON.stringify(hasVoted));
  }, [hasVoted]);

  const savePhase = (p: ElectionPhase) => {
    setPhase(p);
    localStorage.setItem('baobab_election_phase', p);
  };

  // --- Actions ---

  // Admin: Phases
  const startRegistration = () => savePhase('REGISTRATION');
  const endRegistration = () => savePhase('REGISTRATION_CLOSED');
  const startVoting = () => savePhase('VOTING');
  const endVoting = () => savePhase('ENDED');
  
  const resetElection = () => {
    if(window.confirm("Are you sure? This will clear all votes and registration data.")) {
        savePhase('IDLE');
        setRegisteredVoters([]);
        setHasVoted([]);
        setCandidates(candidates.map(c => ({...c, votes: 0})));
        localStorage.removeItem('baobab_election_candidates');
        localStorage.removeItem('baobab_election_voters');
        localStorage.removeItem('baobab_election_has_voted');
    }
  };

  // Admin: Candidates
  const openCandidateModal = (candidate?: Candidate) => {
    if (candidate) {
      setNewCandidate({ ...candidate });
      setEditingCandidateId(candidate.id);
    } else {
      setNewCandidate({ positionId: positions[0]?.id || '', name: '', manifesto: '' });
      setEditingCandidateId(null);
    }
    setShowCandidateModal(true);
  };

  const handleSaveCandidate = () => {
    if (!newCandidate.name || !newCandidate.positionId) {
      alert("Name and Position are required");
      return;
    }

    if (editingCandidateId) {
      // Update existing
      setCandidates(candidates.map(c => 
        c.id === editingCandidateId ? { ...c, ...newCandidate } as Candidate : c
      ));
    } else {
      // Add new
      const candidate: Candidate = {
          id: `cand_${Date.now()}`,
          studentId: `temp_${Date.now()}`, // Ideally selected from student list
          name: newCandidate.name,
          positionId: newCandidate.positionId,
          manifesto: newCandidate.manifesto || '',
          votes: 0
      };
      setCandidates([...candidates, candidate]);
    }
    setShowCandidateModal(false);
  };

  const handleDeleteCandidate = (id: string) => {
    if(window.confirm("Delete this candidate?")) {
      setCandidates(candidates.filter(c => c.id !== id));
    }
  };

  // Admin: Positions
  const handleAddPosition = () => {
    if (!newPositionTitle.trim()) return;
    const newPos: ElectionPosition = {
      id: `pos_${Date.now()}`,
      title: newPositionTitle,
      description: 'Custom Position',
      maxVotes: 1
    };
    setPositions([...positions, newPos]);
    setNewPositionTitle('');
  };

  const handleDeletePosition = (id: string) => {
    if (candidates.some(c => c.positionId === id)) {
      alert("Cannot delete a position that has registered candidates. Remove candidates first.");
      return;
    }
    setPositions(positions.filter(p => p.id !== id));
  };

  // Student: Registration
  const handleVoterRegistration = () => {
    if (registeredVoters.includes(currentUserId)) return;
    setRegisteredVoters([...registeredVoters, currentUserId]);
    alert("You have successfully registered to vote.");
  };

  // Student: Voting
  const handleBallotSelection = (posId: string, candId: string) => {
    setBallot({ ...ballot, [posId]: candId });
  };

  const submitVote = () => {
    if (hasVoted.includes(currentUserId)) return;
    
    // Update vote counts
    const updatedCandidates = candidates.map(c => {
        if (Object.values(ballot).includes(c.id)) {
            return { ...c, votes: c.votes + 1 };
        }
        return c;
    });
    
    setCandidates(updatedCandidates);
    setHasVoted([...hasVoted, currentUserId]);
    setBallot({});
    alert("Your vote has been cast. Thank you for participating.");
  };

  // --- 3. Results Component (Visual Analysis) ---
  const renderResults = (isLive = false) => {
      const COLORS = ['#059669', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];
      return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {positions.map(pos => {
                  const posCandidates = candidates.filter(c => c.positionId === pos.id);
                  if(posCandidates.length === 0) return null;

                  const totalVotes = posCandidates.reduce((sum, c) => sum + c.votes, 0);
                  const data = posCandidates.map(c => ({ 
                    name: c.name, 
                    votes: c.votes,
                    percentage: totalVotes > 0 ? ((c.votes / totalVotes) * 100).toFixed(1) : 0 
                  }));
                  
                  // Sort descending
                  data.sort((a,b) => b.votes - a.votes);

                  const winner = data[0];

                  return (
                      <div key={pos.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
                          <div className="flex justify-between items-start mb-4">
                              <div>
                                  <h3 className="font-bold text-lg text-gray-900">{pos.title}</h3>
                                  <p className="text-xs text-gray-500 font-bold uppercase">{totalVotes} Votes Cast</p>
                              </div>
                              {isLive && phase === 'VOTING' && (
                                   <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 animate-pulse">
                                       <div className="w-2 h-2 bg-red-600 rounded-full"></div> 
                                       <span className="text-[10px] font-extrabold tracking-wider">LIVE</span>
                                   </div>
                              )}
                              {!isLive && phase === 'ENDED' && winner && winner.votes > 0 && (
                                  <div className="bg-yellow-50 text-yellow-800 px-3 py-1 rounded-lg border border-yellow-200 text-xs font-bold flex items-center gap-2">
                                      <span>👑 {winner.name}</span>
                                  </div>
                              )}
                          </div>
                          
                          <div className="h-64 mt-auto">
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                                    <XAxis type="number" hide />
                                    <YAxis 
                                      dataKey="name" 
                                      type="category" 
                                      width={100} 
                                      tick={{fontSize: 11, fontWeight: 700, fill: '#374151'}} 
                                    />
                                    <Tooltip 
                                      cursor={{fill: '#f3f4f6'}}
                                      content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                          const d = payload[0].payload;
                                          return (
                                            <div className="bg-white p-2 border border-gray-200 shadow-lg rounded text-xs">
                                              <p className="font-bold">{d.name}</p>
                                              <p>Votes: {d.votes}</p>
                                              <p>Share: {d.percentage}%</p>
                                            </div>
                                          );
                                        }
                                        return null;
                                      }}
                                    />
                                    <Bar dataKey="votes" barSize={24} radius={[0, 4, 4, 0]}>
                                        {data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                        <LabelList dataKey="votes" position="right" style={{ fontSize: 12, fontWeight: 'bold', fill: '#374151' }} />
                                    </Bar>
                                </BarChart>
                             </ResponsiveContainer>
                          </div>
                      </div>
                  );
              })}
          </div>
      );
  };

  // --- Views ---

  // 1. Admin Dashboard
  const renderAdminView = () => (
    <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Phase Control */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
             <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2"><Settings size={18}/> Election Control Center</h3>
             <div className="flex items-center justify-between mb-6 bg-gray-50 p-4 rounded-lg">
                <span className="text-sm font-bold text-gray-500">Current Phase:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-bold border ${
                    phase === 'IDLE' ? 'bg-gray-200 text-gray-700 border-gray-300' :
                    phase === 'REGISTRATION' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                    phase === 'REGISTRATION_CLOSED' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                    phase === 'VOTING' ? 'bg-green-100 text-green-800 border-green-200' :
                    'bg-red-100 text-red-800 border-red-200'
                }`}>{phase.replace('_', ' ')}</span>
             </div>
             
             <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={startRegistration} 
                    disabled={phase === 'REGISTRATION'} 
                    className={`p-3 border rounded-lg font-bold text-sm flex flex-col items-center gap-2 transition-colors ${phase === 'REGISTRATION' ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'}`}
                >
                   <UserPlus size={20}/> Launch Registration
                </button>
                
                <button 
                    onClick={endRegistration} 
                    disabled={phase === 'REGISTRATION_CLOSED' || phase === 'IDLE'} 
                    className={`p-3 border rounded-lg font-bold text-sm flex flex-col items-center gap-2 transition-colors ${phase === 'REGISTRATION_CLOSED' || phase === 'IDLE' ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'}`}
                >
                   <StopCircle size={20}/> End Registration
                </button>

                <button 
                    onClick={startVoting} 
                    disabled={phase === 'VOTING' || phase === 'IDLE'} 
                    className={`p-3 border rounded-lg font-bold text-sm flex flex-col items-center gap-2 transition-colors ${phase === 'VOTING' || phase === 'IDLE' ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'}`}
                >
                   <Play size={20}/> Launch Voting
                </button>
                
                <button 
                    onClick={endVoting} 
                    disabled={phase === 'ENDED' || phase === 'IDLE'} 
                    className={`p-3 border rounded-lg font-bold text-sm flex flex-col items-center gap-2 transition-colors ${phase === 'ENDED' || phase === 'IDLE' ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'}`}
                >
                   <StopCircle size={20}/> End Voting
                </button>
                
                <button onClick={resetElection} className="col-span-2 p-3 border rounded-lg font-bold text-sm text-gray-700 border-gray-300 hover:bg-gray-100 flex flex-col items-center gap-2 mt-2">
                   <Settings size={20}/> Reset System
                </button>
             </div>
          </div>

          {/* Stats */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
             <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2"><Activity size={18}/> Activity Monitor</h3>
             <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded border border-blue-100">
                   <span className="text-sm font-bold text-blue-900">Registered Voters</span>
                   <span className="text-xl font-extrabold text-blue-700">{registeredVoters.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded border border-green-100">
                   <span className="text-sm font-bold text-green-900">Votes Cast</span>
                   <span className="text-xl font-extrabold text-green-700">{hasVoted.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded border border-purple-100">
                   <span className="text-sm font-bold text-purple-900">Turnout</span>
                   <span className="text-xl font-extrabold text-purple-700">
                      {registeredVoters.length > 0 ? Math.round((hasVoted.length / registeredVoters.length) * 100) : 0}%
                   </span>
                </div>
             </div>
          </div>
       </div>

       {/* LIVE VOTING ANALYSIS (ADMIN VIEW) */}
       {(phase === 'VOTING' || phase === 'ENDED') && (
         <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="font-bold text-xl text-gray-900 mb-6 flex items-center gap-2">
               <TrendingUp size={24} className="text-emerald-600" />
               Live Voting Analysis
            </h3>
            {renderResults(phase === 'VOTING')}
         </div>
       )}

       {/* Candidate Management */}
       <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center bg-gray-50 gap-4">
             <h3 className="font-bold text-gray-800 flex items-center gap-2"><Users size={18}/> Candidate Registry</h3>
             <div className="flex gap-2 w-full sm:w-auto">
               <button onClick={() => setShowPositionModal(true)} className="flex-1 sm:flex-none bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-gray-50 flex items-center justify-center gap-2">
                  <List size={16}/> Manage Positions
               </button>
               <button onClick={() => openCandidateModal()} className="flex-1 sm:flex-none bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-emerald-800 flex items-center justify-center gap-2">
                  <Plus size={16}/> Add Candidate
               </button>
             </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
               <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                     <th className="p-3 font-bold text-gray-700">Name</th>
                     <th className="p-3 font-bold text-gray-700">Position</th>
                     <th className="p-3 font-bold text-gray-700">Manifesto</th>
                     <th className="p-3 font-bold text-gray-700 text-right">Votes</th>
                     <th className="p-3 font-bold text-gray-700 text-right">Action</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-200">
                  {candidates.map(c => (
                     <tr key={c.id}>
                        <td className="p-3 font-medium text-gray-900">{c.name}</td>
                        <td className="p-3 text-gray-600">{positions.find(p => p.id === c.positionId)?.title}</td>
                        <td className="p-3 text-gray-500 truncate max-w-xs">{c.manifesto}</td>
                        <td className="p-3 text-right font-bold text-emerald-700">{c.votes}</td>
                        <td className="p-3 text-right">
                           <div className="flex justify-end gap-2">
                             <button onClick={() => openCandidateModal(c)} className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50" title="Edit Candidate">
                               <Edit size={16} />
                             </button>
                             <button onClick={() => handleDeleteCandidate(c.id)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50" title="Delete Candidate">
                               <Trash2 size={16}/>
                             </button>
                           </div>
                        </td>
                     </tr>
                  ))}
                  {candidates.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-gray-500 italic">No candidates registered yet. Add positions then register candidates.</td>
                    </tr>
                  )}
               </tbody>
            </table>
          </div>
       </div>
       
       {/* Candidate Modal (Add / Edit) */}
       {showCandidateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
             <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg">{editingCandidateId ? 'Edit Candidate' : 'Register Candidate'}</h3>
                  <button onClick={() => setShowCandidateModal(false)} className="text-gray-500 hover:text-gray-800"><X size={20}/></button>
                </div>
                
                <div className="space-y-4">
                   <div>
                      <label className="block text-xs font-bold mb-1">Position</label>
                      <div className="flex gap-2">
                        <select 
                          className="w-full p-2 border rounded bg-white" 
                          value={newCandidate.positionId} 
                          onChange={e => setNewCandidate({...newCandidate, positionId: e.target.value})}
                        >
                           <option value="">-- Select Position --</option>
                           {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                        </select>
                        <button onClick={() => setShowPositionModal(true)} className="px-3 py-2 bg-gray-100 border rounded hover:bg-gray-200 text-gray-700" title="Manage Positions">
                          <List size={18}/>
                        </button>
                      </div>
                   </div>
                   <div>
                      <label className="block text-xs font-bold mb-1">Candidate Name</label>
                      <input type="text" className="w-full p-2 border rounded" value={newCandidate.name || ''} onChange={e => setNewCandidate({...newCandidate, name: e.target.value})} placeholder="Full Name" />
                   </div>
                   <div>
                      <label className="block text-xs font-bold mb-1">Manifesto (Short Bio)</label>
                      <textarea className="w-full p-2 border rounded h-20 resize-none" value={newCandidate.manifesto || ''} onChange={e => setNewCandidate({...newCandidate, manifesto: e.target.value})} placeholder="Why should students vote for you?" />
                   </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                   <button onClick={() => setShowCandidateModal(false)} className="px-4 py-2 text-gray-600 font-bold border rounded hover:bg-gray-50">Cancel</button>
                   <button onClick={handleSaveCandidate} className="px-4 py-2 bg-emerald-700 text-white font-bold rounded hover:bg-emerald-800">
                     {editingCandidateId ? 'Save Changes' : 'Register'}
                   </button>
                </div>
             </div>
          </div>
       )}

       {/* Position Management Modal */}
       {showPositionModal && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
               <div className="flex justify-between items-center mb-4 border-b pb-2">
                 <h3 className="font-bold text-lg flex items-center gap-2"><List size={18}/> Manage Positions</h3>
                 <button onClick={() => setShowPositionModal(false)} className="text-gray-500 hover:text-gray-800"><X size={20}/></button>
               </div>
               
               {/* Add Position Form */}
               <div className="flex gap-2 mb-6">
                  <input 
                    type="text" 
                    className="flex-1 p-2 border border-gray-300 rounded text-sm" 
                    placeholder="New Position Title (e.g. Treasurer)" 
                    value={newPositionTitle}
                    onChange={(e) => setNewPositionTitle(e.target.value)}
                  />
                  <button onClick={handleAddPosition} className="bg-blue-600 text-white px-3 py-2 rounded font-bold text-sm hover:bg-blue-700">Add</button>
               </div>

               {/* Position List */}
               <div className="space-y-2 max-h-60 overflow-y-auto bg-gray-50 p-3 rounded border border-gray-200">
                  {positions.length === 0 && <p className="text-center text-xs text-gray-500 italic">No positions defined.</p>}
                  {positions.map(p => (
                    <div key={p.id} className="flex justify-between items-center bg-white p-3 rounded shadow-sm border border-gray-100">
                       <span className="font-bold text-gray-800 text-sm">{p.title}</span>
                       <button onClick={() => handleDeletePosition(p.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                    </div>
                  ))}
               </div>
               
               <div className="mt-4 text-right">
                  <button onClick={() => setShowPositionModal(false)} className="px-4 py-2 bg-gray-800 text-white font-bold rounded text-sm hover:bg-gray-900">Done</button>
               </div>
            </div>
         </div>
       )}
    </div>
  );

  // 2. Student View
  const renderStudentView = () => {
    // Phase: Idle
    if (phase === 'IDLE') {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                <Vote size={64} className="text-gray-300 mb-4"/>
                <h2 className="text-2xl font-bold text-gray-700">No Active Election</h2>
                <p className="text-gray-500">The election process has not started yet. Please check back later.</p>
            </div>
        );
    }

    // Phase: Registration
    if (phase === 'REGISTRATION') {
        const isRegistered = registeredVoters.includes(currentUserId);
        return (
            <div className="max-w-xl mx-auto mt-10">
                <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center">
                    <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        {isRegistered ? <CheckCircle size={40}/> : <UserPlus size={40}/>}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{isRegistered ? 'Registration Complete' : 'Voter Registration Open'}</h2>
                    <p className="text-gray-600 mb-8 font-medium">
                        {isRegistered 
                            ? "You have successfully registered for the upcoming election. You will be notified when voting begins."
                            : "The electoral commission has opened voter registration. Please register to participate in the democratic process."}
                    </p>
                    
                    {!isRegistered && (
                        <button onClick={handleVoterRegistration} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700 shadow-md transition-transform active:scale-95">
                            Register as Voter
                        </button>
                    )}
                    {isRegistered && (
                        <div className="bg-green-50 text-green-800 py-3 rounded-lg font-bold border border-green-200">
                            Status: Verified Voter
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Phase: Registration Closed
    if (phase === 'REGISTRATION_CLOSED') {
        const isRegistered = registeredVoters.includes(currentUserId);
        return (
            <div className="max-w-xl mx-auto mt-10">
                <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center">
                    <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock size={40}/>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Closed</h2>
                    <p className="text-gray-600 mb-8 font-medium">
                        Voter registration has ended. The voting process will begin shortly. 
                    </p>
                    {isRegistered ? (
                         <div className="bg-green-50 text-green-800 py-3 rounded-lg font-bold border border-green-200">
                            You are registered and eligible to vote.
                        </div>
                    ) : (
                        <div className="bg-red-50 text-red-800 py-3 rounded-lg font-bold border border-red-200">
                            You did not register in time.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Phase: Voting (Ballot)
    if (phase === 'VOTING') {
        const isRegistered = registeredVoters.includes(currentUserId);
        const alreadyVoted = hasVoted.includes(currentUserId);

        if (!isRegistered) {
            return (
                <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                    <Lock size={64} className="text-red-300 mb-4"/>
                    <h2 className="text-2xl font-bold text-gray-700">Access Denied</h2>
                    <p className="text-gray-500">You did not register during the registration phase and cannot vote.</p>
                </div>
            );
        }

        if (alreadyVoted) {
             return (
                 <div className="space-y-6">
                    <div className="bg-green-50 p-6 rounded-lg border border-green-200 flex items-center gap-4">
                        <CheckCircle size={32} className="text-green-600"/>
                        <div>
                            <h3 className="font-bold text-green-900 text-lg">Vote Cast Successfully</h3>
                            <p className="text-green-800 text-sm">Thank you for voting. You can watch the live results below.</p>
                        </div>
                    </div>
                    {renderResults(true)}
                 </div>
             );
        }

        return (
            <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="p-6 bg-emerald-900 text-white border-b border-emerald-800">
                        <h2 className="text-2xl font-bold">Official Ballot Paper</h2>
                        <p className="text-emerald-100 text-sm">Select one candidate for each position. Voting cannot be undone.</p>
                    </div>
                    
                    <div className="p-8 space-y-10">
                        {positions.map(pos => (
                            <div key={pos.id} className="space-y-4">
                                <h3 className="font-bold text-lg text-gray-800 border-b pb-2 flex items-center gap-2">
                                    <Shield size={18} className="text-emerald-600"/> {pos.title}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {candidates.filter(c => c.positionId === pos.id).map(cand => (
                                        <label 
                                            key={cand.id} 
                                            className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                                ballot[pos.id] === cand.id 
                                                ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600' 
                                                : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            <input 
                                                type="radio" 
                                                name={pos.id} 
                                                value={cand.id} 
                                                className="absolute opacity-0"
                                                onChange={() => handleBallotSelection(pos.id, cand.id)}
                                            />
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500 overflow-hidden">
                                                    {cand.photo ? <img src={cand.photo} className="w-full h-full object-cover"/> : cand.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">{cand.name}</p>
                                                    <p className="text-xs text-gray-500 italic line-clamp-2">{cand.manifesto}</p>
                                                </div>
                                            </div>
                                            {ballot[pos.id] === cand.id && (
                                                <div className="absolute top-4 right-4 text-emerald-600">
                                                    <CheckCircle size={20} fill="currentColor" className="text-white"/>
                                                </div>
                                            )}
                                        </label>
                                    ))}
                                    {candidates.filter(c => c.positionId === pos.id).length === 0 && (
                                      <div className="col-span-2 text-center text-gray-500 italic p-4 bg-gray-50 rounded">No candidates for this position.</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
                        <button 
                            onClick={submitVote}
                            disabled={Object.keys(ballot).length !== positions.filter(p => candidates.some(c => c.positionId === p.id)).length}
                            className="bg-emerald-700 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-emerald-800 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Vote size={20}/> Submit Vote
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Phase: Ended (Results)
    if (phase === 'ENDED') {
        return (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-emerald-600">
                    <h2 className="text-2xl font-bold text-gray-900">Election Completed</h2>
                    <p className="text-gray-600">Voting has ended. Here are the final results.</p>
                </div>
                {renderResults()}
            </div>
        );
    }
  };

  // --- Main Render ---
  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
       <div className="flex justify-between items-center pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Student Elections</h2>
            <p className="text-sm text-gray-600 font-medium">Democracy in Action</p>
          </div>
          {phase === 'VOTING' && role === UserRole.STUDENT && (
             <div className="bg-red-600 text-white px-4 py-1 rounded-full text-xs font-bold animate-pulse">
                Voting is Live
             </div>
          )}
       </div>

       {role === UserRole.ADMIN || (role === UserRole.STAFF && permissions?.admin_election === 'Editor') 
          ? renderAdminView() 
          : renderStudentView()
       }
       
       {/* Shared View for live results during voting for everyone (if allowed) */}
       {role === UserRole.STUDENT && phase === 'VOTING' && hasVoted.includes(currentUserId) && (
           <div className="mt-8">
               <h3 className="text-xl font-bold text-gray-800 mb-4">Live Results Watch</h3>
               {renderResults(true)}
           </div>
       )}
    </div>
  );
};
