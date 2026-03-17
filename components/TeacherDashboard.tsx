import React, { useState } from 'react';
import { Submission, PhysicsResult } from '../types';

interface Props {
  submissions: Submission[];
  onViewStudent: (submission: Submission) => void;
}

export const TeacherDashboard: React.FC<Props> = ({ submissions, onViewStudent }) => {
  const [suspiciousOnly, setSuspiciousOnly] = useState(false);

  const filteredSubmissions = suspiciousOnly
    ? submissions.filter(s => s.result.instructorInsights?.flag !== 'authentic')
    : submissions;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 animate-fadeIn">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Instructor Command Center</h1>
            <p className="text-slate-400 text-sm">Monitor student integrity and experimental performance.</p>
          </div>

          <button
            onClick={() => setSuspiciousOnly(!suspiciousOnly)}
            className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all border ${
              suspiciousOnly 
                ? 'bg-rose-500/10 border-rose-500 text-rose-400 shadow-lg shadow-rose-500/10' 
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {suspiciousOnly ? 'Showing Suspicious Only' : 'View Suspicious Students Only'}
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-950/50 text-slate-500 border-b border-slate-800">
                  <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">Student Details</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">Experiment</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">Integrity</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">Status</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                      No submissions found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-200">{s.student.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{s.student.rollNo}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-300">{s.experimentName}</div>
                        <div className="text-[10px] text-slate-500">{new Date(s.timestamp).toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`text-xl font-black ${
                          s.result.integrity.tag === 'ok' ? 'text-emerald-400' : 
                          s.result.integrity.tag === 'warn' ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {s.result.integrity.score}%
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {s.result.instructorInsights?.flag === 'authentic' && <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded border border-emerald-500/20">AUTHENTIC</span>}
                        {s.result.instructorInsights?.flag === 'caution' && <span className="px-2 py-1 bg-amber-500/10 text-amber-400 text-[10px] font-bold rounded border border-amber-500/20">CAUTION</span>}
                        {s.result.instructorInsights?.flag === 'flagged' && <span className="px-2 py-1 bg-rose-500/10 text-rose-400 text-[10px] font-bold rounded border border-rose-500/20">FLAGGED</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => onViewStudent(s)}
                          className="px-4 py-2 bg-slate-800 hover:bg-teal-500 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all"
                        >
                          Deep Dive
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
