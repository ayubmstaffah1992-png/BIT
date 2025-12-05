
import React, { useState, useEffect, useRef } from 'react';
import { UserRole, Module, CompetencyLevel, QuizQuestion, LibraryResource, ModuleContent, LearningMaterial, Quiz, DiscussionMessage } from '../types';
import { MOCK_COURSES, MOCK_MODULES, MOCK_STUDENTS, MOCK_LEARNING_CONTENT, MOCK_LIBRARY_RESOURCES } from '../constants';
import { generateQuiz } from '../services/geminiService';
import * as XLSX from 'xlsx';
import { 
  BookOpen, Video, Play, CheckCircle, AlertTriangle, 
  FileText, Download, ArrowLeft, Layers, BrainCircuit,
  Lock, Award, Clock, Printer, Search, Filter, Star, X, Eye,
  Upload, Save, Image as ImageIcon, Plus, Link as LinkIcon,
  Calendar, StopCircle, RefreshCw, Trash2, Sparkles, FileSpreadsheet, Edit,
  MessageCircle, Mic, Send, User as UserIcon
} from 'lucide-react';

interface LearningProps {
  role: UserRole;
  permissions?: any; // Added permissions prop support
}

// Mock current student ID for "Student" role view
const CURRENT_STUDENT_ID = 's1'; 

export const Learning: React.FC<LearningProps> = ({ role, permissions }) => {
  // --- State ---
  const [view, setView] = useState<'dashboard' | 'module' | 'level' | 'quiz' | 'library'>('dashboard');
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<CompetencyLevel | null>(null);
  const [levelTab, setLevelTab] = useState<'resources' | 'discussion'>('resources');
  
  // Learning Content State (Replaces static import for mutation)
  const [learningContent, setLearningContent] = useState<ModuleContent[]>(MOCK_LEARNING_CONTENT);

  // Library Data State (Replaces static import for mutation)
  const [resources, setResources] = useState<LibraryResource[]>(MOCK_LIBRARY_RESOURCES);

  // Quiz State (Taking Quiz)
  const [quizActive, setQuizActive] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, any>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // Assessment Builder State
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [newQuiz, setNewQuiz] = useState<Partial<Quiz>>({
    status: 'Draft',
    durationMinutes: 30,
    questions: []
  });
  const [newQuestion, setNewQuestion] = useState<Partial<QuizQuestion>>({
    type: 'MCQ',
    options: ['', '', '', ''],
    correctAnswer: 0
  });
  
  // AI & Bulk Upload State
  const [aiTopic, setAiTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Discussion State
  const [chatInput, setChatInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Library State
  const [searchQuery, setSearchQuery] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('All');
  const [relevanceFilter, setRelevanceFilter] = useState<'All' | 'Mandatory' | 'Supplementary'>('All');
  const [selectedResource, setSelectedResource] = useState<LibraryResource | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);

  // Library Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newResource, setNewResource] = useState<Partial<LibraryResource>>({
    type: 'Textbook',
    format: 'PDF',
    relevance: 'Supplementary',
    departmentId: 'all',
    courseId: 'all'
  });

  // Course Material Upload Modal State
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [newMaterial, setNewMaterial] = useState<Partial<LearningMaterial>>({
    type: 'PDF'
  });

  const [isUploading, setIsUploading] = useState(false);

  // Student Data (for eligibility)
  const currentStudent = MOCK_STUDENTS.find(s => s.id === CURRENT_STUDENT_ID);
  const isEligible = currentStudent ? (currentStudent.attendancePercentage >= 90 && currentStudent.feesCleared) : false;
  
  // Permission Check
  const canEditContent = (role === UserRole.ADMIN || role === UserRole.STAFF) && permissions?.lms_content === 'Editor';

  // --- Effects ---
  useEffect(() => {
    const saved = localStorage.getItem('baobab_recent_resources');
    if (saved) {
      setRecentlyViewed(JSON.parse(saved));
    }
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    if (view === 'level' && levelTab === 'discussion') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [levelTab, selectedLevel?.discussions]);

  // Auto-End Quiz Checker
  useEffect(() => {
    const interval = setInterval(() => {
      setLearningContent(prevContent => {
        let updated = false;
        const newContent = prevContent.map(mod => ({
          ...mod,
          levels: mod.levels.map(lvl => {
            if (lvl.quiz && lvl.quiz.status === 'Active' && lvl.quiz.startedAt) {
              const start = new Date(lvl.quiz.startedAt).getTime();
              const durationMs = lvl.quiz.durationMinutes * 60 * 1000;
              const bufferMs = 15 * 60 * 1000; // 15 mins buffer additional
              if (Date.now() > start + durationMs + bufferMs) {
                updated = true;
                return { ...lvl, quiz: { ...lvl.quiz, status: 'Completed' } as Quiz };
              }
            }
            return lvl;
          })
        }));
        return updated ? newContent : prevContent;
      });
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // --- Navigation Helpers ---
  const handleModuleSelect = (mod: Module) => {
    setSelectedModule(mod);
    setView('module');
  };

  const handleLevelSelect = (lvl: CompetencyLevel) => {
    // Refresh level data from state to get latest status
    const freshLevel = getModuleContent(selectedModule!.id).find(l => l.id === lvl.id);
    setSelectedLevel(freshLevel || lvl);
    setView('level');
    setLevelTab('resources'); // Default tab
    // Pre-fill AI topic
    setAiTopic(lvl.title);
  };

  // --- Quiz Lifecycle Management (Lecturer) ---
  const handleLaunchQuiz = () => {
    if (!selectedModule || !selectedLevel || !selectedLevel.quiz) return;
    const updatedQuiz: Quiz = {
       ...selectedLevel.quiz,
       status: 'Active',
       startedAt: new Date().toISOString()
    };
    updateLevelQuiz(updatedQuiz);
  };

  const handleEndQuiz = () => {
    if (!selectedModule || !selectedLevel || !selectedLevel.quiz) return;
    const updatedQuiz: Quiz = { ...selectedLevel.quiz, status: 'Completed' };
    updateLevelQuiz(updatedQuiz);
  };

  const handleEditAssessment = () => {
    if (!selectedLevel?.quiz) return;
    setNewQuiz({ ...selectedLevel.quiz });
    setShowAssessmentModal(true);
  };

  const updateLevelQuiz = (quiz: Quiz) => {
    const updatedContent = learningContent.map(mc => {
      if (mc.moduleId === selectedModule?.id) {
         return {
            ...mc,
            levels: mc.levels.map(l => l.id === selectedLevel?.id ? { ...l, quiz } : l)
         };
      }
      return mc;
    });
    setLearningContent(updatedContent);
    // Force refresh selected level
    const freshLevel = updatedContent.find(mc => mc.moduleId === selectedModule?.id)?.levels.find(l => l.id === selectedLevel?.id);
    if(freshLevel) setSelectedLevel(freshLevel);
  };

  // --- Discussion Helpers ---
  const handleSendMessage = () => {
    if ((!chatInput.trim() && !isRecording) || !selectedModule || !selectedLevel) return;

    const newMessage: DiscussionMessage = {
      id: `msg_${Date.now()}`,
      userId: role === UserRole.STUDENT ? currentStudent?.id || 's1' : 'st1', // Mock IDs
      userName: role === UserRole.STUDENT ? currentStudent?.name || 'Student' : 'Lecturer',
      userRole: role,
      content: chatInput,
      type: 'text',
      timestamp: new Date().toLocaleString()
    };

    updateLevelDiscussion(newMessage);
    setChatInput('');
  };

  const handleRecordAudio = () => {
    if (isRecording) {
      // "Stop" recording and send mock audio
      const newMessage: DiscussionMessage = {
        id: `msg_${Date.now()}`,
        userId: role === UserRole.STUDENT ? currentStudent?.id || 's1' : 'st1',
        userName: role === UserRole.STUDENT ? currentStudent?.name || 'Student' : 'Lecturer',
        userRole: role,
        content: 'Audio Note (0:15)',
        type: 'audio',
        timestamp: new Date().toLocaleString()
      };
      updateLevelDiscussion(newMessage);
      setIsRecording(false);
    } else {
      setIsRecording(true);
    }
  };

  const handleToggleLiveSession = () => {
    if (!selectedModule || !selectedLevel) return;
    const newState = !selectedLevel.liveSessionActive;
    
    const updatedContent = learningContent.map(mc => {
      if (mc.moduleId === selectedModule.id) {
         return {
            ...mc,
            levels: mc.levels.map(l => l.id === selectedLevel.id ? { ...l, liveSessionActive: newState } : l)
         };
      }
      return mc;
    });
    setLearningContent(updatedContent);
    const freshLevel = updatedContent.find(mc => mc.moduleId === selectedModule.id)?.levels.find(l => l.id === selectedLevel.id);
    if(freshLevel) setSelectedLevel(freshLevel);
    
    if (newState) alert("Live session started! Students can now join.");
    else alert("Live session ended.");
  };

  const updateLevelDiscussion = (msg: DiscussionMessage) => {
    const updatedContent = learningContent.map(mc => {
      if (mc.moduleId === selectedModule?.id) {
         return {
            ...mc,
            levels: mc.levels.map(l => l.id === selectedLevel?.id ? { ...l, discussions: [...(l.discussions || []), msg] } : l)
         };
      }
      return mc;
    });
    setLearningContent(updatedContent);
    const freshLevel = updatedContent.find(mc => mc.moduleId === selectedModule?.id)?.levels.find(l => l.id === selectedLevel?.id);
    if(freshLevel) setSelectedLevel(freshLevel);
  };

  // --- Assessment Builder Helpers ---
  const handleAddQuestion = () => {
    if (!newQuestion.text) return;
    const q: QuizQuestion = {
      id: `q_${Date.now()}`,
      text: newQuestion.text,
      type: newQuestion.type as any,
      options: newQuestion.type === 'MCQ' ? newQuestion.options : undefined,
      correctAnswer: newQuestion.correctAnswer!,
      matchingPairs: newQuestion.type === 'Matching' ? newQuestion.matchingPairs : undefined,
      explanation: newQuestion.explanation
    };
    setNewQuiz(prev => ({ ...prev, questions: [...(prev.questions || []), q] }));
    // Reset question form
    setNewQuestion({
      type: 'MCQ',
      options: ['', '', '', ''],
      correctAnswer: 0,
      text: ''
    });
  };

  const handleGenerateQuiz = async () => {
    if (!aiTopic) {
        alert("Please enter a topic for AI generation.");
        return;
    }
    setIsGenerating(true);
    try {
        const questions = await generateQuiz(aiTopic, 5); // Default 5 questions
        if (questions && questions.length > 0) {
            setNewQuiz(prev => ({
                ...prev,
                questions: [...(prev.questions || []), ...questions]
            }));
            alert(`Success! Generated ${questions.length} questions on "${aiTopic}".`);
        } else {
            alert("AI could not generate questions. Please try a different topic.");
        }
    } catch (e) {
        console.error(e);
        alert("Error generating quiz. Please check your connection.");
    } finally {
        setIsGenerating(false);
    }
  };

  const downloadQuizTemplate = () => {
    const headers = ['Question Text', 'Type (MCQ/TrueFalse/ShortAnswer)', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Correct Answer', 'Explanation'];
    const sample = ['What is the standard dosage unit?', 'MCQ', 'Gram', 'Liter', 'Meter', 'Second', '1', 'Gram is mass.'];
    const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Quiz Template");
    XLSX.writeFile(wb, "baobab_assessment_template.xlsx");
  };

  const handleBulkQuizUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        // Skip header row
        const rows = data.slice(1) as any[];
        const newQuestions: QuizQuestion[] = [];

        rows.forEach((row, idx) => {
            if (!row[0]) return;
            const type = row[1] || 'MCQ';
            const question: QuizQuestion = {
                id: `q_bulk_${Date.now()}_${idx}`,
                text: row[0],
                type: type as any,
                explanation: row[7],
                correctAnswer: ''
            };

            if (type === 'MCQ') {
                question.options = [row[2], row[3], row[4], row[5]].filter(o => o !== undefined);
                const ans = row[6];
                if (typeof ans === 'number') {
                    question.correctAnswer = ans - 1; // Convert 1-based to 0-based
                } else {
                    const idx = question.options.findIndex(o => String(o).trim() === String(ans).trim());
                    question.correctAnswer = idx >= 0 ? idx : 0; 
                }
            } else if (type === 'TrueFalse') {
                const ans = String(row[6]).toLowerCase();
                question.correctAnswer = ans === 'true' || ans === 'yes';
            } else {
                question.correctAnswer = String(row[6]);
            }
            newQuestions.push(question);
        });

        setNewQuiz(prev => ({
            ...prev,
            questions: [...(prev.questions || []), ...newQuestions]
        }));
        alert(`Successfully imported ${newQuestions.length} questions from Excel.`);
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleSaveAssessment = () => {
    if (!newQuiz.title || (newQuiz.questions?.length || 0) === 0) {
      alert("Please provide a title and at least one question.");
      return;
    }
    const quiz: Quiz = {
      id: newQuiz.id || `quiz_${Date.now()}`,
      title: newQuiz.title!,
      durationMinutes: newQuiz.durationMinutes || 30,
      questions: newQuiz.questions!,
      status: newQuiz.status || 'Scheduled',
      scheduledDate: newQuiz.scheduledDate
    };
    updateLevelQuiz(quiz);
    setShowAssessmentModal(false);
    setNewQuiz({ status: 'Draft', durationMinutes: 30, questions: [] });
  };

  // --- Quiz Taking Helpers ---
  const handleStartQuiz = () => {
    if (!selectedLevel?.quiz || selectedLevel.quiz.status !== 'Active') return;
    setQuizActive(true);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setCurrentQuestionIndex(0);
    setView('quiz');
  };

  const handleAnswerChange = (qId: string, value: any) => {
    if (quizSubmitted) return;
    setQuizAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const handleSubmitQuiz = () => {
    if (!selectedLevel?.quiz) return;
    let score = 0;
    selectedLevel.quiz.questions.forEach(q => {
      const userAnswer = quizAnswers[q.id];
      if (q.type === 'MCQ' && userAnswer === q.correctAnswer) score++;
      else if (q.type === 'TrueFalse' && userAnswer === q.correctAnswer) score++;
      else if (q.type === 'ShortAnswer' && String(userAnswer).toLowerCase().trim() === String(q.correctAnswer).toLowerCase().trim()) score++;
      else if (q.type === 'Matching') {
         // Check if all pairs match. Assume userAnswer is { leftKey: rightValue }
         const correctPairs = q.matchingPairs || [];
         const allCorrect = correctPairs.every(p => userAnswer?.[p.left] === p.right);
         if (allCorrect) score++;
      }
    });
    setQuizScore(Math.round((score / selectedLevel.quiz.questions.length) * 100));
    setQuizSubmitted(true);
  };

  const handleExitQuiz = () => {
    setQuizActive(false);
    setView('level');
  };

  // --- Library Helpers ---
  const getFilteredResources = () => {
    let filtered = resources;
    if (role === UserRole.STUDENT && currentStudent) {
      filtered = filtered.filter(r => r.courseId === currentStudent.courseId || r.courseId === 'all');
    } else if (role === UserRole.PARENT) {
      filtered = filtered.filter(r => r.type === 'Guide' || r.relevance === 'Supplementary');
    }
    return filtered.filter(r => {
      const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            r.author.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = resourceTypeFilter === 'All' || r.type === resourceTypeFilter;
      const matchesRelevance = relevanceFilter === 'All' || r.relevance === relevanceFilter;
      return matchesSearch && matchesType && matchesRelevance;
    });
  };

  const openResource = (resource: LibraryResource) => {
    setSelectedResource(resource);
    const newRecent = [resource.id, ...recentlyViewed.filter(id => id !== resource.id)].slice(0, 5);
    setRecentlyViewed(newRecent);
    localStorage.setItem('baobab_recent_resources', JSON.stringify(newRecent));
  };

  const closeResource = () => {
    setSelectedResource(null);
  };

  // --- Upload Handlers ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isLibrary: boolean = true) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        const base64 = result.split(',')[1];
        if (isLibrary) {
          setNewResource(prev => ({
            ...prev,
            content: base64,
            format: file.type.includes('pdf') ? 'PDF' : file.type.includes('image') ? 'Image' : 'HTML',
            size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`
          }));
        } else {
           setNewMaterial(prev => ({ ...prev, url: base64 }));
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResource.title || !newResource.content) { alert("Please provide a title and upload a file."); return; }
    const resource: LibraryResource = {
      id: `lib_${Date.now()}`,
      title: newResource.title!,
      author: newResource.author || 'Baobab Staff',
      departmentId: newResource.departmentId || 'all',
      courseId: newResource.courseId || 'all',
      type: newResource.type as any,
      format: newResource.format as any,
      relevance: newResource.relevance as any,
      referenceStandard: newResource.referenceStandard,
      content: newResource.content!,
      uploadDate: new Date().toISOString().split('T')[0],
      size: newResource.size || '1.0 MB',
      moduleId: newResource.moduleId
    };
    setResources([resource, ...resources]);
    setShowUploadModal(false);
    setNewResource({ type: 'Textbook', format: 'PDF', relevance: 'Supplementary', departmentId: 'all', courseId: 'all' });
    alert("Resource uploaded successfully.");
  };

  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModule || !selectedLevel) return;
    if (!newMaterial.title || (!newMaterial.url && newMaterial.type !== 'Link')) { alert("Please provide a title and content."); return; }
    const material: LearningMaterial = {
       id: `mat_${Date.now()}`,
       title: newMaterial.title!,
       type: newMaterial.type as any,
       url: newMaterial.url || '#',
       description: newMaterial.description
    };
    const updatedContent = learningContent.map(mc => {
       if (mc.moduleId === selectedModule.id) {
          return {
             ...mc,
             levels: mc.levels.map(lvl => lvl.id === selectedLevel.id ? { ...lvl, materials: [...lvl.materials, material] } : lvl)
          };
       }
       return mc;
    });
    setLearningContent(updatedContent);
    const updatedLevel = updatedContent.find(mc => mc.moduleId === selectedModule.id)?.levels.find(l => l.id === selectedLevel.id);
    if (updatedLevel) setSelectedLevel(updatedLevel);
    setShowMaterialModal(false);
    setNewMaterial({ type: 'PDF' });
    alert("Material added successfully.");
  };

  const getModuleContent = (moduleId: string) => {
    return learningContent.find(c => c.moduleId === moduleId)?.levels || [];
  };

  const availableModules = role === UserRole.STUDENT && currentStudent
    ? MOCK_MODULES.filter(m => m.courseId === currentStudent.courseId)
    : MOCK_MODULES;

  // --- RENDER ---
  if (selectedResource) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex flex-col animate-fade-in">
        <div className="bg-emerald-900 text-white p-4 flex justify-between items-center shadow-md">
           <div><h3 className="font-bold text-lg">{selectedResource.title}</h3><p className="text-xs text-white font-medium opacity-90">{selectedResource.author} • {selectedResource.format}</p></div>
           <button onClick={closeResource} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"><X size={24} /></button>
        </div>
        <div className="flex-1 bg-gray-100 overflow-auto flex justify-center p-4">
           <div className="bg-white shadow-2xl max-w-5xl w-full min-h-full rounded-lg overflow-hidden flex flex-col">
              {selectedResource.format === 'PDF' && <iframe src={`data:application/pdf;base64,${selectedResource.content}`} className="w-full flex-1 h-[80vh]" title="PDF Viewer"/>}
              {selectedResource.format === 'Image' && <div className="flex-1 flex items-center justify-center bg-gray-900"><img src={`data:image/png;base64,${selectedResource.content}`} className="max-w-full max-h-full object-contain" alt={selectedResource.title}/></div>}
              {selectedResource.format === 'HTML' && <div className="p-8 prose max-w-none text-gray-900"><div dangerouslySetInnerHTML={{ __html: selectedResource.content }} /></div>}
           </div>
        </div>
      </div>
    );
  }

  // --- QUIZ TAKING VIEW ---
  if (view === 'quiz' && selectedLevel?.quiz) {
    // ... (Existing Quiz Taking View - Unchanged for brevity, kept structure valid) ...
    const question = selectedLevel.quiz.questions[currentQuestionIndex];
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6 bg-gray-50 min-h-screen">
        <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div>
            <h2 className="font-bold text-xl text-gray-900">{selectedLevel.quiz.title}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-600 font-medium mt-1">
              <span className="flex items-center gap-1"><Clock size={14}/> {selectedLevel.quiz.durationMinutes} Mins</span>
              <span className="flex items-center gap-1"><Layers size={14}/> {currentQuestionIndex + 1} / {selectedLevel.quiz.questions.length}</span>
            </div>
          </div>
        </div>

        {!quizSubmitted ? (
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 min-h-[400px] flex flex-col">
             <div className="flex-1">
               <h3 className="text-lg font-bold text-gray-900 mb-6">{question.text}</h3>
               
               {question.type === 'MCQ' && (
                 <div className="space-y-3">
                   {question.options?.map((opt, idx) => (
                     <button key={idx} onClick={() => handleAnswerChange(question.id, idx)} className={`w-full text-left p-4 rounded-lg border transition-all font-medium ${quizAnswers[question.id] === idx ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500 text-emerald-900' : 'border-gray-200 hover:bg-gray-50 text-gray-800'}`}>
                       <span className="inline-block w-6 font-bold text-gray-500">{String.fromCharCode(65 + idx)}.</span> {opt}
                     </button>
                   ))}
                 </div>
               )}

               {question.type === 'TrueFalse' && (
                  <div className="flex gap-4">
                     <button onClick={() => handleAnswerChange(question.id, true)} className={`flex-1 p-6 rounded-lg border font-bold text-lg ${quizAnswers[question.id] === true ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-gray-50 border-gray-200'}`}>TRUE</button>
                     <button onClick={() => handleAnswerChange(question.id, false)} className={`flex-1 p-6 rounded-lg border font-bold text-lg ${quizAnswers[question.id] === false ? 'bg-red-50 border-red-500 text-red-800' : 'bg-gray-50 border-gray-200'}`}>FALSE</button>
                  </div>
               )}

               {question.type === 'ShortAnswer' && (
                  <input 
                    type="text" 
                    placeholder="Type your answer here..." 
                    className="w-full p-4 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-lg"
                    value={quizAnswers[question.id] || ''} 
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  />
               )}

               {question.type === 'Matching' && (
                  <div className="grid grid-cols-2 gap-8">
                     <div className="space-y-4">
                        {question.matchingPairs?.map((pair, idx) => (
                           <div key={idx} className="p-4 bg-gray-100 rounded border border-gray-200 font-bold text-gray-800">{pair.left}</div>
                        ))}
                     </div>
                     <div className="space-y-4">
                        {question.matchingPairs?.map((pair, idx) => (
                           <select 
                              key={idx}
                              className="w-full p-4 border border-gray-300 rounded bg-white font-medium"
                              value={quizAnswers[question.id]?.[pair.left] || ''}
                              onChange={(e) => handleAnswerChange(question.id, { ...quizAnswers[question.id], [pair.left]: e.target.value })}
                           >
                              <option value="">-- Select Match --</option>
                              {[...question.matchingPairs!].sort(() => Math.random() - 0.5).map((p, i) => (
                                 <option key={i} value={p.right}>{p.right}</option>
                              ))}
                           </select>
                        ))}
                     </div>
                  </div>
               )}
             </div>
             
             <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between">
                <button disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex(prev => prev - 1)} className="px-6 py-2 text-gray-700 font-bold hover:bg-gray-100 rounded-lg disabled:opacity-50 border border-gray-300">Previous</button>
                {currentQuestionIndex < selectedLevel.quiz.questions.length - 1 ? (
                   <button onClick={() => setCurrentQuestionIndex(prev => prev + 1)} className="px-6 py-2 bg-emerald-700 text-white font-bold rounded-lg hover:bg-emerald-800">Next Question</button>
                ) : (
                  <button onClick={handleSubmitQuiz} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md">Submit Assessment</button>
                )}
             </div>
          </div>
        ) : (
          <div className="space-y-6">
             <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center print-area">
                <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto flex items-center justify-center mb-4 border border-gray-200">
                   {quizScore >= 50 ? <Award size={48} className="text-emerald-600"/> : <AlertTriangle size={48} className="text-red-500"/>}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{quizScore >= 50 ? 'Competency Achieved' : 'Competency Not Yet Achieved'}</h2>
                <p className="text-gray-700 mb-6 font-medium">You scored <span className={`font-bold text-xl ${quizScore >= 50 ? 'text-emerald-700' : 'text-red-700'}`}>{quizScore}%</span>.</p>
                <div className="flex justify-center gap-4 print:hidden">
                   <button onClick={handleExitQuiz} className="px-6 py-2 border border-gray-300 rounded-lg font-bold hover:bg-gray-50 text-gray-700">Return to Level</button>
                   <button onClick={() => window.print()} className="px-6 py-2 bg-emerald-700 text-white rounded-lg font-bold hover:bg-emerald-800 flex items-center gap-2"><Printer size={18}/> Download Result PDF</button>
                </div>
             </div>
          </div>
        )}
      </div>
    );
  }

  // --- LIBRARY VIEW ---
  if (view === 'library') {
     // ... (Existing Library View - Unchanged) ...
     const filteredResources = getFilteredResources();
     return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
         <div className="flex items-center justify-between">
            <button onClick={() => setView('dashboard')} className="flex items-center gap-1 text-sm font-bold text-gray-600 hover:text-gray-900"><ArrowLeft size={16}/> Back to Courses</button>
            <div className="flex gap-2">
               {canEditContent && (
                 <button onClick={() => setShowUploadModal(true)} className="bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-emerald-800 flex items-center gap-2 shadow-sm"><Upload size={16}/> Upload Resource</button>
               )}
            </div>
         </div>
         {/* ... (Search and Filters) ... */}
         <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center">
             <BookOpen size={48} className="mx-auto text-emerald-700 mb-4" />
             <h2 className="text-3xl font-bold text-gray-900">Digital Library</h2>
              <div className="max-w-2xl mx-auto mt-6 relative">
                <Search className="absolute left-3 top-3.5 text-gray-500" size={20} />
                <input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-3 rounded-full border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm text-gray-900 font-medium placeholder-gray-500" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
             </div>
         </div>
         <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-64 flex-shrink-0 space-y-6">
               <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Filter size={16}/> Filters</h4>
                  <div className="space-y-4">
                     <div>
                        <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">Resource Type</label>
                        <div className="space-y-2">{['All', 'Textbook', 'Manual', 'Guide', 'Reference'].map(type => (<label key={type} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="resourceType" checked={resourceTypeFilter === type} onChange={() => setResourceTypeFilter(type)} className="text-emerald-600 focus:ring-emerald-500"/><span className="text-sm text-gray-800 font-medium">{type}</span></label>))}</div>
                     </div>
                  </div>
               </div>
            </div>
            <div className="flex-1">
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredResources.map(resource => (
                    <div key={resource.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-all flex flex-col">
                       <div className="p-4 flex-1">
                          <h3 className="font-bold text-gray-900 mb-1 line-clamp-2" title={resource.title}>{resource.title}</h3>
                          <p className="text-xs text-gray-600 mb-3 font-medium">By {resource.author}</p>
                       </div>
                       <div className="bg-gray-50 p-3 border-t border-gray-200 flex justify-between items-center">
                          <span className="text-[10px] text-gray-500 font-bold">{resource.size}</span>
                          <button onClick={() => openResource(resource)} className="bg-white border border-gray-300 text-gray-700 px-3 py-1 rounded-md text-xs font-bold hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-1"><Eye size={12} /> Open</button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
         </div>
         {showUploadModal && (
           /* ... (Upload Modal) ... */
           <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
             <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full border border-gray-200 my-8">
               <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
                 <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><Upload size={20} className="text-emerald-700"/> Upload Library Resource</h3>
                 <button onClick={() => setShowUploadModal(false)} className="text-gray-500 hover:text-gray-700"><X size={20}/></button>
               </div>
               <form onSubmit={handleSaveResource} className="p-6 space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                       <label className="block text-sm font-bold text-gray-900 mb-1">Resource Title</label>
                       <input type="text" required value={newResource.title || ''} onChange={e => setNewResource({...newResource, title: e.target.value})} className="w-full p-2 border border-gray-300 rounded outline-none text-gray-900 font-medium" />
                    </div>
                 </div>
                 <div className="pt-2">
                    <label className="block text-sm font-bold text-gray-900 mb-2">Upload File</label>
                    <input type="file" accept=".pdf, .jpg, .png" onChange={(e) => handleFileChange(e, true)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"/>
                 </div>
                 <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button type="button" onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg border border-gray-300">Cancel</button>
                    <button type="submit" disabled={!newResource.content} className="bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-800 shadow-md flex items-center gap-2 disabled:opacity-50"><Save size={18} /> Save Resource</button>
                 </div>
               </form>
             </div>
           </div>
         )}
        </div>
     );
  }

  // --- MAIN LMS VIEW ---
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-4">
        <div><h2 className="text-2xl font-bold text-gray-900">Learning Management System</h2><p className="text-sm text-gray-600 font-medium">Competency Based Education & Training (CBET)</p></div>
        <div className="flex gap-2">
           <button onClick={() => { setView('dashboard'); setSelectedModule(null); setSelectedLevel(null); }} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors ${view === 'dashboard' ? 'bg-emerald-700 text-white shadow' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}><Layers size={16} /> My Courses</button>
           <button onClick={() => setView('library')} className="px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"><BookOpen size={16} /> Digital Library</button>
        </div>
      </div>

      {view === 'dashboard' && (
        <div className="space-y-6">
           {role === UserRole.STUDENT && (
             <div className={`p-4 rounded-lg border flex items-start gap-3 ${isEligible ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                {isEligible ? <CheckCircle className="text-green-600 mt-0.5" size={20}/> : <AlertTriangle className="text-red-600 mt-0.5" size={20}/>}
                <div>
                  <h4 className={`font-bold ${isEligible ? 'text-green-800' : 'text-red-800'}`}>{isEligible ? 'You are eligible for End-of-Semester Exams' : 'Not Eligible for Exams'}</h4>
                  <p className="text-sm text-gray-700 mt-1 font-medium">Attendance: <strong>{currentStudent?.attendancePercentage}%</strong> (Req: 90%) • Fees: <strong>{currentStudent?.feesCleared ? 'Cleared' : 'Pending'}</strong></p>
                </div>
             </div>
           )}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableModules.map(mod => {
                return (
                  <div key={mod.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:border-emerald-400 transition-all flex flex-col">
                     <div className="bg-gray-100 h-32 flex items-center justify-center border-b border-gray-200 relative">
                        <BookOpen size={40} className="text-gray-400" />
                        <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded text-xs font-bold text-emerald-800 shadow-sm border border-gray-200">{mod.code}</div>
                     </div>
                     <div className="p-5 flex-1 flex flex-col">
                        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">{mod.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-600 font-medium mb-4"><span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{mod.mode}</span><span>•</span><span>{mod.credits} Credits</span></div>
                        <button onClick={() => handleModuleSelect(mod)} className="w-full mt-auto bg-emerald-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-sm">Continue Learning</button>
                     </div>
                  </div>
                );
              })}
           </div>
        </div>
      )}

      {view === 'module' && selectedModule && (
        <div className="space-y-6">
           <button onClick={() => setView('dashboard')} className="flex items-center gap-1 text-sm font-bold text-gray-600 hover:text-gray-900"><ArrowLeft size={16}/> Back to Dashboard</button>
           <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"><h2 className="text-2xl font-bold text-gray-900">{selectedModule.name}</h2><p className="text-gray-600 font-medium mt-1">Module Code: {selectedModule.code} • NTA Level 4 Curriculum</p></div>
           <div className="space-y-4">
              {getModuleContent(selectedModule.id).map(lvl => (
                <div key={lvl.id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6 items-start md:items-center">
                   <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-800 font-bold text-lg border border-emerald-200">{lvl.levelNumber}</div>
                   <div className="flex-1"><h3 className="font-bold text-lg text-gray-900">{lvl.title}</h3><p className="text-sm text-gray-700 mt-1 font-medium">{lvl.description}</p></div>
                   <button onClick={() => handleLevelSelect(lvl)} className="bg-gray-900 text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-800 whitespace-nowrap shadow-sm">View Content</button>
                </div>
              ))}
           </div>
        </div>
      )}

      {view === 'level' && selectedLevel && selectedModule && (
        <div className="space-y-4 h-[calc(100vh-140px)] flex flex-col">
           <div className="flex-shrink-0">
              <div className="flex justify-between items-center mb-4">
                  <button onClick={() => setView('module')} className="flex items-center gap-1 text-sm font-bold text-gray-600 hover:text-gray-900"><ArrowLeft size={16}/> Back to {selectedModule.name}</button>
                  {levelTab === 'discussion' && (
                     <h2 className="text-lg font-bold text-gray-900 truncate ml-4 hidden md:block">{selectedLevel.title}</h2>
                  )}
              </div>

              {levelTab !== 'discussion' && (
                <div className="bg-emerald-900 text-white p-6 rounded-lg shadow-lg mb-6 transition-all">
                   <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2"><span>Level {selectedLevel.levelNumber}</span><span>•</span><span>Competency Unit</span></div>
                   <h2 className="text-2xl font-bold">{selectedLevel.title}</h2>
                   <p className="text-emerald-50 mt-2 text-sm max-w-3xl font-medium opacity-90">{selectedLevel.description}</p>
                </div>
              )}
              
              {/* Level Tabs */}
              <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 mb-2 w-fit">
                 <button 
                    onClick={() => setLevelTab('resources')} 
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${levelTab === 'resources' ? 'bg-white text-emerald-800 shadow' : 'text-gray-600 hover:bg-gray-200'}`}
                 >
                    <BookOpen size={16}/> Materials & Assessment
                 </button>
                 <button 
                    onClick={() => setLevelTab('discussion')} 
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${levelTab === 'discussion' ? 'bg-white text-emerald-800 shadow' : 'text-gray-600 hover:bg-gray-200'}`}
                 >
                    <MessageCircle size={16}/> Class Discussion
                 </button>
              </div>
           </div>

           {/* --- Tab Content: Materials & Assessment --- */}
           {levelTab === 'resources' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-y-auto">
                 <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center">
                       <h3 className="font-bold text-gray-900 flex items-center gap-2"><BookOpen size={18}/> Learning Materials</h3>
                       {canEditContent && <button onClick={() => setShowMaterialModal(true)} className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded border border-emerald-200 font-bold hover:bg-emerald-100"><Plus size={14} /> Add Material</button>}
                    </div>
                    {selectedLevel.materials.map(mat => (
                      <div key={mat.id} className="bg-white p-4 rounded-lg border border-gray-200 flex items-start gap-4 hover:bg-gray-50 transition-colors cursor-pointer shadow-sm">
                         <div className={`p-3 rounded-lg ${mat.type === 'Video' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{mat.type === 'Video' ? <Video size={24}/> : <FileText size={24}/>}</div>
                         <div className="flex-1"><h4 className="font-bold text-gray-900 text-sm">{mat.title}</h4><p className="text-xs text-gray-600 mt-1 font-medium">{mat.description || 'No description provided.'}</p>
                            <div className="mt-2">
                               {mat.type === 'Link' ? (<a href={mat.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline"><LinkIcon size={12}/> Open External Link</a>) : (
                                  <button onClick={() => openResource({id: mat.id, title: mat.title, author: 'Course Material', type: mat.type === 'Video' ? 'Reference' : 'Textbook', format: mat.type === 'PDF' ? 'PDF' : 'HTML', relevance: 'Mandatory', content: mat.url, uploadDate: '', departmentId: '', courseId: ''})} className="text-xs font-bold text-emerald-700 hover:underline">{mat.type === 'Video' ? 'Watch Video' : 'View Document'}</button>
                               )}
                            </div>
                         </div>
                      </div>
                    ))}
                    {selectedLevel.materials.length === 0 && <div className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded border border-gray-200 font-medium text-center">No study materials uploaded for this level yet.</div>}
                 </div>

                 {/* Assessment Card */}
                 <div className="lg:col-span-1">
                    <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm sticky top-0">
                       <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4"><BrainCircuit size={18}/> Competency Assessment</h3>
                       
                       {selectedLevel.quiz ? (
                         <div className="space-y-4">
                           <div className={`p-4 rounded border ${selectedLevel.quiz.status === 'Active' ? 'bg-green-50 border-green-200' : selectedLevel.quiz.status === 'Completed' ? 'bg-gray-100 border-gray-300' : 'bg-orange-50 border-orange-100'}`}>
                              <h4 className="font-bold text-gray-900 text-sm">{selectedLevel.quiz.title}</h4>
                              <div className="flex justify-between text-xs text-gray-600 mt-2 font-bold">
                                 <span>{selectedLevel.quiz.questions.length} Questions</span>
                                 <span>{selectedLevel.quiz.durationMinutes} Mins</span>
                              </div>
                              <div className="mt-2 text-xs font-bold">Status: <span className="uppercase text-emerald-700">{selectedLevel.quiz.status}</span></div>
                              {selectedLevel.quiz.scheduledDate && <div className="text-xs text-gray-500 mt-1">Scheduled: {selectedLevel.quiz.scheduledDate}</div>}
                           </div>
                           
                           {/* Student Controls */}
                           {role === UserRole.STUDENT && (
                              <>
                                 {selectedLevel.quiz.status === 'Active' ? (
                                    <button onClick={handleStartQuiz} className="w-full bg-emerald-700 text-white py-3 rounded-lg font-bold hover:bg-emerald-800 shadow-md flex justify-center items-center gap-2"><Play size={16}/> Start Assessment</button>
                                 ) : selectedLevel.quiz.status === 'Completed' ? (
                                    <button disabled className="w-full bg-gray-300 text-gray-600 py-3 rounded-lg font-bold cursor-not-allowed">Assessment Ended</button>
                                 ) : (
                                    <button disabled className="w-full bg-gray-300 text-gray-600 py-3 rounded-lg font-bold cursor-not-allowed flex justify-center items-center gap-2"><Clock size={16}/> Scheduled</button>
                                 )}
                              </>
                           )}

                           {/* Lecturer Controls */}
                           {canEditContent && (
                              <div className="space-y-2 pt-2 border-t border-gray-100">
                                 <p className="text-xs font-bold text-gray-500 uppercase mb-2">Instructor Controls</p>
                                 
                                 <div className="grid grid-cols-2 gap-2">
                                    <button 
                                       onClick={handleLaunchQuiz} 
                                       disabled={selectedLevel.quiz.status === 'Active'}
                                       className="w-full bg-green-600 text-white py-2 rounded font-bold text-xs hover:bg-green-700 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                       <Play size={12}/> {selectedLevel.quiz.status === 'Completed' ? 'Re-Launch' : 'Launch'}
                                    </button>
                                    <button 
                                       onClick={handleEndQuiz} 
                                       disabled={selectedLevel.quiz.status !== 'Active'}
                                       className="w-full bg-red-600 text-white py-2 rounded font-bold text-xs hover:bg-red-700 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                       <StopCircle size={12}/> End
                                    </button>
                                 </div>

                                 <button onClick={handleEditAssessment} className="w-full bg-white text-emerald-700 py-2 rounded font-bold text-xs hover:bg-emerald-50 border border-emerald-200 flex justify-center items-center gap-2"><Edit size={12}/> Edit Configuration</button>
                                 <button onClick={() => {
                                    const confirmDelete = window.confirm("Are you sure you want to delete this assessment?");
                                    if(confirmDelete) {
                                       const updatedContent = learningContent.map(mc => {
                                         if (mc.moduleId === selectedModule.id) {
                                            return { ...mc, levels: mc.levels.map(l => l.id === selectedLevel.id ? { ...l, quiz: undefined } : l) };
                                         } return mc;
                                       });
                                       setLearningContent(updatedContent);
                                       setSelectedLevel({ ...selectedLevel, quiz: undefined });
                                    }
                                 }} className="w-full bg-gray-100 text-red-600 py-2 rounded font-bold text-xs hover:bg-gray-200 border border-gray-200 flex justify-center items-center gap-2"><Trash2 size={12}/> Delete Quiz</button>
                              </div>
                           )}
                         </div>
                       ) : (
                         <div className="text-center py-6">
                           <div className="text-sm text-gray-500 italic mb-4 font-medium">No assessment created yet.</div>
                           {canEditContent && (
                              <button onClick={() => setShowAssessmentModal(true)} className="bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-emerald-800 shadow-sm flex items-center justify-center gap-2 mx-auto"><Plus size={14}/> Create Assessment</button>
                           )}
                         </div>
                       )}
                    </div>
                 </div>
              </div>
           )}

           {/* --- Tab Content: Class Discussion --- */}
           {levelTab === 'discussion' && (
              <div className="flex flex-col flex-1 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                 {/* Discussion Header */}
                 <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                       <h3 className="font-bold text-gray-900">{selectedLevel.title} - Discussion</h3>
                       <p className="text-xs text-gray-500">Post questions, voice notes, or join live classes.</p>
                    </div>
                    {/* Live Class Controls */}
                    <div className="flex items-center gap-2">
                       {canEditContent && (
                          <button 
                             onClick={handleToggleLiveSession}
                             className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm ${selectedLevel.liveSessionActive ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                          >
                             <Video size={16}/> {selectedLevel.liveSessionActive ? 'End Live Session' : 'Start Live Video Class'}
                          </button>
                       )}
                       {role === UserRole.STUDENT && selectedLevel.liveSessionActive && (
                          <button className="px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm bg-green-600 text-white hover:bg-green-700 animate-pulse">
                             <Video size={16}/> Join Live Class Now
                          </button>
                       )}
                    </div>
                 </div>

                 {/* Chat Area */}
                 <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
                    {(selectedLevel.discussions || []).length === 0 && (
                       <div className="text-center text-gray-400 py-10 italic">No messages yet. Start the conversation!</div>
                    )}
                    {(selectedLevel.discussions || []).map((msg) => (
                       <div key={msg.id} className={`flex gap-3 ${msg.userId === (role === UserRole.STUDENT ? currentStudent?.id : 'st1') ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${msg.userRole === UserRole.STAFF ? 'bg-purple-600' : 'bg-emerald-600'}`}>
                             {msg.userName.charAt(0)}
                          </div>
                          <div className={`max-w-[70%] ${msg.userId === (role === UserRole.STUDENT ? currentStudent?.id : 'st1') ? 'items-end' : 'items-start'} flex flex-col`}>
                             <div className={`p-3 rounded-lg shadow-sm text-sm ${msg.userId === (role === UserRole.STUDENT ? currentStudent?.id : 'st1') ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'}`}>
                                {msg.userRole === UserRole.STAFF && msg.userId !== (role === UserRole.STUDENT ? currentStudent?.id : 'st1') && (
                                   <div className="text-xs font-bold text-purple-700 mb-1 flex items-center gap-1"><UserIcon size={10}/> {msg.userName}</div>
                                )}
                                {msg.type === 'audio' ? (
                                   <div className="flex items-center gap-2">
                                      <button className="p-1.5 bg-white/20 rounded-full hover:bg-white/30"><Play size={16} fill="currentColor" /></button>
                                      <div className="h-1 w-24 bg-current/30 rounded-full relative"><div className="absolute top-0 left-0 h-full w-1/3 bg-current rounded-full"></div></div>
                                      <span className="text-xs opacity-80">0:15</span>
                                   </div>
                                ) : (
                                   <p className="whitespace-pre-wrap">{msg.content}</p>
                                )}
                             </div>
                             <span className="text-[10px] text-gray-400 mt-1">{msg.timestamp}</span>
                          </div>
                       </div>
                    ))}
                    <div ref={chatBottomRef} />
                 </div>

                 {/* Input Area */}
                 <div className="p-4 bg-white border-t border-gray-200">
                    <div className="flex items-center gap-2">
                       <button 
                          onClick={handleRecordAudio}
                          className={`p-3 rounded-full transition-colors ${isRecording ? 'bg-red-50 text-red-600 animate-pulse border border-red-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                          title="Record Voice Note"
                       >
                          <Mic size={20} />
                       </button>
                       <div className="flex-1 relative">
                          <input 
                             type="text" 
                             value={chatInput}
                             onChange={(e) => setChatInput(e.target.value)}
                             onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                             placeholder={isRecording ? "Recording audio..." : "Type a message..."}
                             disabled={isRecording}
                             className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-900 bg-gray-50"
                          />
                          <button 
                             onClick={handleSendMessage}
                             disabled={!chatInput.trim() && !isRecording}
                             className="absolute right-2 top-2 p-1.5 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm"
                          >
                             <Send size={16} />
                          </button>
                       </div>
                    </div>
                 </div>
              </div>
           )}
           
           {/* Assessment Builder Modal - (Kept from existing code) */}
           {showAssessmentModal && (
             <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full border border-gray-200 flex flex-col max-h-[90vh]">
                   <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl flex-shrink-0">
                      <h3 className="font-bold text-lg text-gray-900">Assessment Manager</h3>
                      <button onClick={() => setShowAssessmentModal(false)} className="text-gray-500 hover:text-gray-700"><X size={20}/></button>
                   </div>
                   <div className="p-6 space-y-6 overflow-y-auto">
                      {/* Smart Actions: AI & Bulk */}
                      <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg">
                          <h4 className="font-bold text-emerald-900 mb-3 flex items-center gap-2"><Sparkles size={16}/> Smart Tools</h4>
                          <div className="flex flex-col md:flex-row gap-4">
                             <div className="flex-1 flex gap-2 items-center bg-white p-2 rounded border border-emerald-200">
                                <input 
                                  type="text" 
                                  placeholder="Topic for AI Generation..." 
                                  value={aiTopic}
                                  onChange={e => setAiTopic(e.target.value)}
                                  className="flex-1 p-2 text-sm border-none outline-none font-medium bg-transparent"
                                />
                                <button 
                                  onClick={handleGenerateQuiz}
                                  disabled={isGenerating}
                                  className="bg-emerald-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap"
                                >
                                  {isGenerating ? 'Generating...' : 'Generate with AI'}
                                </button>
                             </div>
                             <div className="flex gap-2">
                                <button 
                                  onClick={downloadQuizTemplate}
                                  className="bg-white text-gray-700 px-3 py-2 rounded text-xs font-bold border border-gray-300 hover:bg-gray-50 flex items-center gap-2 whitespace-nowrap"
                                >
                                  <Download size={14}/> Download Template
                                </button>
                                <label className="bg-blue-600 text-white px-3 py-2 rounded text-xs font-bold hover:bg-blue-700 flex items-center gap-2 cursor-pointer whitespace-nowrap">
                                  <FileSpreadsheet size={14}/> Bulk Upload
                                  <input type="file" accept=".xlsx, .xls" onChange={handleBulkQuizUpload} className="hidden" />
                                </label>
                             </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-900 mb-1">Assessment Title</label>
                            <input type="text" className="w-full p-2 border border-gray-300 rounded font-medium" value={newQuiz.title || ''} onChange={e => setNewQuiz({...newQuiz, title: e.target.value})} placeholder="e.g. End of Module Competency Test" />
                         </div>
                         <div>
                            <label className="block text-sm font-bold text-gray-900 mb-1">Duration (Minutes)</label>
                            <input type="number" className="w-full p-2 border border-gray-300 rounded font-medium" value={newQuiz.durationMinutes} onChange={e => setNewQuiz({...newQuiz, durationMinutes: parseInt(e.target.value)})} />
                         </div>
                         <div>
                            <label className="block text-sm font-bold text-gray-900 mb-1">Schedule Date</label>
                            <input type="date" className="w-full p-2 border border-gray-300 rounded font-medium" value={newQuiz.scheduledDate || ''} onChange={e => setNewQuiz({...newQuiz, scheduledDate: e.target.value})} />
                         </div>
                      </div>

                      <div className="border-t border-gray-200 pt-4">
                         <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Plus size={16}/> Manual Entry</h4>
                         <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                            <div>
                               <label className="block text-xs font-bold text-gray-700 mb-1">Question Text</label>
                               <input type="text" className="w-full p-2 border border-gray-300 rounded text-sm font-medium" value={newQuestion.text || ''} onChange={e => setNewQuestion({...newQuestion, text: e.target.value})} placeholder="Enter question..." />
                            </div>
                            <div>
                               <label className="block text-xs font-bold text-gray-700 mb-1">Question Type</label>
                               <select 
                                  className="w-full p-2 border border-gray-300 rounded text-sm font-medium"
                                  value={newQuestion.type}
                                  onChange={e => setNewQuestion({
                                     ...newQuestion, 
                                     type: e.target.value as any, 
                                     options: e.target.value === 'MCQ' ? ['', '', '', ''] : undefined,
                                     matchingPairs: e.target.value === 'Matching' ? [{left:'', right:''}] : undefined,
                                     correctAnswer: e.target.value === 'TrueFalse' ? true : e.target.value === 'MCQ' ? 0 : ''
                                  })}
                               >
                                  <option value="MCQ">Multiple Choice</option>
                                  <option value="TrueFalse">True / False</option>
                                  <option value="ShortAnswer">Short Answer</option>
                                  <option value="Matching">Matching Items</option>
                               </select>
                            </div>
                            
                            {/* Type Specific Inputs */}
                            {newQuestion.type === 'MCQ' && (
                               <div className="space-y-2">
                                  <label className="block text-xs font-bold text-gray-700">Options (Select radio for correct answer)</label>
                                  {newQuestion.options?.map((opt, idx) => (
                                     <div key={idx} className="flex gap-2 items-center">
                                        <input type="radio" name="correctOption" checked={newQuestion.correctAnswer === idx} onChange={() => setNewQuestion({...newQuestion, correctAnswer: idx})} />
                                        <input type="text" className="flex-1 p-2 border border-gray-300 rounded text-sm" value={opt} onChange={e => {
                                           const newOpts = [...newQuestion.options!]; newOpts[idx] = e.target.value; setNewQuestion({...newQuestion, options: newOpts});
                                        }} placeholder={`Option ${idx + 1}`} />
                                     </div>
                                  ))}
                               </div>
                            )}

                            {newQuestion.type === 'TrueFalse' && (
                               <div>
                                  <label className="block text-xs font-bold text-gray-700 mb-1">Correct Answer</label>
                                  <div className="flex gap-4">
                                     <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="tf" checked={newQuestion.correctAnswer === true} onChange={() => setNewQuestion({...newQuestion, correctAnswer: true})} /> True
                                     </label>
                                     <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="tf" checked={newQuestion.correctAnswer === false} onChange={() => setNewQuestion({...newQuestion, correctAnswer: false})} /> False
                                     </label>
                                  </div>
                               </div>
                            )}

                            {newQuestion.type === 'ShortAnswer' && (
                               <div>
                                  <label className="block text-xs font-bold text-gray-700 mb-1">Correct Answer (Keyword/Phrase)</label>
                                  <input type="text" className="w-full p-2 border border-gray-300 rounded text-sm" value={newQuestion.correctAnswer as string} onChange={e => setNewQuestion({...newQuestion, correctAnswer: e.target.value})} />
                               </div>
                            )}

                            {newQuestion.type === 'Matching' && (
                               <div className="space-y-2">
                                  <label className="block text-xs font-bold text-gray-700">Matching Pairs</label>
                                  {newQuestion.matchingPairs?.map((pair, idx) => (
                                     <div key={idx} className="flex gap-2">
                                        <input type="text" className="flex-1 p-2 border border-gray-300 rounded text-sm" placeholder="Left Item" value={pair.left} onChange={e => {
                                           const newPairs = [...newQuestion.matchingPairs!]; newPairs[idx].left = e.target.value; setNewQuestion({...newQuestion, matchingPairs: newPairs});
                                        }} />
                                        <input type="text" className="flex-1 p-2 border border-gray-300 rounded text-sm" placeholder="Right Match" value={pair.right} onChange={e => {
                                           const newPairs = [...newQuestion.matchingPairs!]; newPairs[idx].right = e.target.value; setNewQuestion({...newQuestion, matchingPairs: newPairs});
                                        }} />
                                        <button onClick={() => {
                                            const newPairs = newQuestion.matchingPairs!.filter((_, i) => i !== idx);
                                            setNewQuestion({...newQuestion, matchingPairs: newPairs});
                                        }} className="text-red-500"><Trash2 size={16}/></button>
                                     </div>
                                  ))}
                                  <button onClick={() => setNewQuestion({...newQuestion, matchingPairs: [...(newQuestion.matchingPairs || []), {left:'', right:''}]})} className="text-xs font-bold text-emerald-700">+ Add Pair</button>
                               </div>
                            )}
                            
                            <div className="pt-2">
                               <button onClick={handleAddQuestion} className="bg-gray-900 text-white px-4 py-2 rounded font-bold text-xs hover:bg-gray-800">Save Question</button>
                            </div>
                         </div>
                      </div>

                      {/* Question List Preview */}
                      <div className="border-t border-gray-200 pt-4">
                         <h4 className="font-bold text-gray-900 mb-2">Questions Added ({newQuiz.questions?.length || 0})</h4>
                         <div className="space-y-2 max-h-40 overflow-y-auto">
                            {newQuiz.questions?.map((q, i) => (
                               <div key={i} className="p-2 bg-white border border-gray-200 rounded text-sm flex justify-between">
                                  <span className="truncate flex-1 font-medium">{i+1}. {q.text} <span className="text-xs text-gray-500 bg-gray-100 px-1 rounded ml-2">{q.type}</span></span>
                                  <button onClick={() => setNewQuiz(prev => ({...prev, questions: prev.questions?.filter((_, idx) => idx !== i)}))} className="text-red-500"><Trash2 size={14}/></button>
                               </div>
                            ))}
                         </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                         <button onClick={() => setShowAssessmentModal(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg border border-gray-300">Cancel</button>
                         <button onClick={handleSaveAssessment} className="bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-800 shadow-md">Create Assessment</button>
                      </div>
                   </div>
                </div>
             </div>
           )}
           {/* Material Modal remains unchanged */}
           {showMaterialModal && (
             <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
               <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-gray-200">
                  <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <h3 className="font-bold text-gray-900">Add Material to Level {selectedLevel.levelNumber}</h3>
                    <button onClick={() => setShowMaterialModal(false)} className="text-gray-500 hover:text-gray-700"><X size={20}/></button>
                  </div>
                  <form onSubmit={handleSaveMaterial} className="p-6 space-y-4">
                     <div><label className="block text-sm font-bold text-gray-900 mb-1">Title</label><input type="text" required value={newMaterial.title || ''} onChange={e => setNewMaterial({...newMaterial, title: e.target.value})} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 font-medium" /></div>
                     <div><label className="block text-sm font-bold text-gray-900 mb-1">Description</label><textarea value={newMaterial.description || ''} onChange={e => setNewMaterial({...newMaterial, description: e.target.value})} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 font-medium h-20 resize-none"></textarea></div>
                     <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">Type</label>
                        <select value={newMaterial.type} onChange={e => setNewMaterial({...newMaterial, type: e.target.value as any})} className="w-full p-2 border border-gray-300 rounded bg-white text-gray-900 font-medium"><option value="PDF">PDF Document</option><option value="Video">Video Resource</option><option value="Link">External Link</option></select>
                     </div>
                     {newMaterial.type === 'Link' ? (
                        <div><label className="block text-sm font-bold text-gray-900 mb-1">External URL</label><input type="url" placeholder="https://..." value={newMaterial.url || ''} onChange={e => setNewMaterial({...newMaterial, url: e.target.value})} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 font-medium" /></div>
                     ) : (
                        <div><label className="block text-sm font-bold text-gray-900 mb-2">Upload File (PDF/MP4)</label><input type="file" accept={newMaterial.type === 'PDF' ? ".pdf" : ".mp4, .webm"} onChange={(e) => handleFileChange(e, false)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"/>{newMaterial.url && <p className="text-xs text-green-600 font-bold mt-2 flex items-center gap-1"><CheckCircle size={12}/> File ready for upload</p>}</div>
                     )}
                     <div className="flex justify-end gap-3 pt-4 border-t border-gray-100"><button type="button" onClick={() => setShowMaterialModal(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">Cancel</button><button type="submit" disabled={isUploading} className="bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-800 shadow-md disabled:opacity-50">{isUploading ? 'Processing...' : 'Add Material'}</button></div>
                  </form>
               </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
};
