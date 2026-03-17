
import React, { useState } from 'react';
import { PhysicsModule } from './components/PhysicsModule';
import { ProgrammingModule } from './components/ProgrammingModule';
import { LandingPage } from './components/LandingPage';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentInfo, TeacherInfo, UserRole, Submission } from './types';
import { COLORS } from './constants';

const SUBJECTS = [
  { id: 'physics', name: 'Physics', subtitle: 'Experiment Evaluator', icon: '⊛', color: 'from-teal-400 to-blue-500' },
  { id: 'programming', name: 'Programming', subtitle: 'AI Compiler', icon: '</>', color: 'from-blue-500 to-indigo-600' },
  { id: 'math', name: 'Mathematics', subtitle: 'Calculus AI', icon: '∑', color: 'from-purple-500 to-pink-600', comingSoon: true },
  { id: 'data', name: 'Data Science', subtitle: 'ML Lab', icon: '◈', color: 'from-orange-500 to-red-600', comingSoon: true },
];

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [viewingSubmission, setViewingSubmission] = useState<Submission | null>(null);

  const handleLogin = (role: UserRole, info: any) => {
    setRole(role);
    if (role === 'student') {
      setStudent(info as StudentInfo);
    } else {
      setTeacher(info as TeacherInfo);
    }
  };

  const handleLogout = () => {
    setRole(null);
    setStudent(null);
    setTeacher(null);
    setActiveSub(null);
    setViewingSubmission(null);
  };

  const handleSaveSubmission = (submission: Submission) => {
    setSubmissions(prev => [submission, ...prev]);
  };

  if (!role) {
    return <LandingPage onLogin={handleLogin} />;
  }

  const currentUser = role === 'student' ? student! : teacher!;
  const currentId = role === 'student' ? student!.rollNo : teacher!.teacherId;

  return (
    <div className="h-screen w-screen flex bg-slate-950 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-950 border-r border-slate-800 flex flex-col">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center">
              <span className="text-white font-black text-xs">EX</span>
            </div>
            <span className="font-bold text-lg tracking-tight">Experiment AI</span>
          </div>

          <nav className="space-y-1">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-4">
              {role === 'student' ? 'Core Modules' : 'Instructor Tools'}
            </p>
            
            {role === 'student' ? (
              SUBJECTS.map(s => (
                <button
                  key={s.id}
                  disabled={s.comingSoon}
                  onClick={() => {
                    setActiveSub(s.id);
                    setViewingSubmission(null);
                  }}
                  className={`w-full group flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                    activeSub === s.id && !viewingSubmission ? 'bg-slate-900 border border-slate-800' : 'hover:bg-slate-900/50'
                  } ${s.comingSoon ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm ${
                    activeSub === s.id && !viewingSubmission ? 'bg-gradient-to-br ' + s.color + ' text-white' : 'bg-slate-800 text-slate-500 group-hover:text-slate-300'
                  }`}>
                    {s.icon}
                  </div>
                  <div className="text-left">
                    <div className={`text-sm font-bold ${activeSub === s.id && !viewingSubmission ? 'text-slate-100' : 'text-slate-500'}`}>{s.name}</div>
                    <div className="text-[10px] text-slate-600 font-medium">{s.subtitle}</div>
                  </div>
                </button>
              ))
            ) : (
              <button
                onClick={() => {
                  setActiveSub(null);
                  setViewingSubmission(null);
                }}
                className={`w-full group flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                  !activeSub && !viewingSubmission ? 'bg-slate-900 border border-slate-800' : 'hover:bg-slate-900/50'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm ${
                  !activeSub && !viewingSubmission ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white' : 'bg-slate-800 text-slate-500 group-hover:text-slate-300'
                }`}>
                  ⊞
                </div>
                <div className="text-left">
                  <div className={`text-sm font-bold ${!activeSub && !viewingSubmission ? 'text-slate-100' : 'text-slate-500'}`}>Dashboard</div>
                  <div className="text-[10px] text-slate-600 font-medium">Student Directory</div>
                </div>
              </button>
            )}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-900 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-slate-300 font-bold border border-slate-700">
                {currentUser.name[0]}
              </div>
              <div className="overflow-hidden">
                <div className="text-sm font-bold text-slate-100 truncate">{currentUser.name}</div>
                <div className="text-[10px] text-slate-500 truncate">{currentId}</div>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-rose-400 hover:border-rose-500/30 font-bold text-xs uppercase tracking-widest transition-all"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {role === 'teacher' && !viewingSubmission && !activeSub && (
          <TeacherDashboard 
            submissions={submissions} 
            onViewStudent={(s) => setViewingSubmission(s)} 
          />
        )}

        {viewingSubmission && (
          <PhysicsModule 
            student={viewingSubmission.student} 
            role="teacher" 
            initialResult={viewingSubmission.result}
            onBack={() => setViewingSubmission(null)}
          />
        )}

        {activeSub && role === 'student' && (
          <>
            {activeSub === 'physics' && (
              <PhysicsModule 
                student={student!} 
                role="student" 
                onSaveSubmission={handleSaveSubmission}
              />
            )}
            {activeSub === 'programming' && <ProgrammingModule student={student!} />}
          </>
        )}

        {role === 'student' && !activeSub && (
          <div className="flex-1 flex flex-col items-center justify-center p-12 overflow-y-auto">
            <div className="max-w-4xl w-full text-center space-y-12">
              <div className="space-y-4">
                <h2 className="text-4xl font-black text-slate-100 tracking-tight">Welcome, {student!.name.split(' ')[0]}</h2>
                <p className="text-slate-400 max-w-lg mx-auto leading-relaxed">Select an active module to begin your experiment evaluation. Gemini AI is standing by to analyze your results and provide adaptive feedback.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {SUBJECTS.filter(s => !s.comingSoon).map(s => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSub(s.id)}
                    className="relative group bg-slate-900 border border-slate-800 hover:border-teal-500/50 rounded-3xl p-8 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-teal-500/10 overflow-hidden"
                  >
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${s.color} opacity-0 group-hover:opacity-5 blur-3xl transition-opacity`}></div>
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-lg mb-6`}>
                       <span className="text-2xl text-white font-bold">{s.icon}</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-100 mb-2">{s.name} Module</h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-6">Analyze lab readings, check data integrity, and reinforce concepts with real-time AI guidance.</p>
                    <div className="flex items-center gap-2 text-teal-400 text-xs font-black uppercase tracking-widest">
                      Launch Environment 
                      <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
