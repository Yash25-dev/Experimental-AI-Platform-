import React, { useState } from 'react';
import { UserRole, StudentInfo, TeacherInfo } from '../types';

interface Props {
  onLogin: (role: UserRole, info: StudentInfo | TeacherInfo) => void;
}

export const LandingPage: React.FC<Props> = ({ onLogin }) => {
  const [role, setRole] = useState<UserRole>('student');
  const [name, setName] = useState('');
  const [id, setId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !id) return;

    if (role === 'student') {
      onLogin('student', { name, rollNo: id });
    } else {
      onLogin('teacher', { name, teacherId: id });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl animate-scaleIn">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center shadow-lg mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.675.337a4 4 0 01-2.58.344l-2.387-.477a2 2 0 00-1.022.547l-1.162 1.162a2 2 0 000 2.828l1.162 1.162a2 2 0 002.828 0l1.162-1.162a2 2 0 00.547-1.022l.477-2.387a6 6 0 01.517-3.86l.337-.675a4 4 0 00.344-2.58l-.477-2.387a2 2 0 00-.547-1.022l-1.162-1.162a2 2 0 00-2.828 0L4.01 5.172a2 2 0 000 2.828l1.162 1.162a2 2 0 001.022.547l2.387.477a6 6 0 003.86-.517l.675-.337a4 4 0 012.58-.344l2.387.477a2 2 0 001.022-.547l1.162-1.162a2 2 0 000-2.828l-1.162-1.162a2 2 0 00-2.828 0l-1.162 1.162z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter">Experiment AI</h1>
          <p className="text-slate-400 text-sm mt-2">Next-Gen Laboratory Integrity Platform</p>
        </div>

        <div className="flex p-1 bg-slate-950 rounded-xl mb-8 border border-slate-800">
          <button
            onClick={() => setRole('student')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
              role === 'student' ? 'bg-teal-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Student
          </button>
          <button
            onClick={() => setRole('teacher')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
              role === 'teacher' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Teacher
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              {role === 'student' ? 'Roll Number' : 'Teacher ID'}
            </label>
            <input
              type="text"
              required
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder={role === 'student' ? "e.g. PH-2024-001" : "e.g. TCH-882"}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest shadow-xl transition-all active:scale-95 ${
              role === 'student' ? 'bg-teal-500 hover:bg-teal-400 shadow-teal-500/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
            }`}
          >
            Enter Platform
          </button>
        </form>
      </div>
    </div>
  );
};
