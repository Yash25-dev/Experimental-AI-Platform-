
import React, { useState, useEffect } from 'react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-java';
import { 
  StudentInfo, 
  UserProfile, 
  CodeErrorInfo, 
  AiExplanation, 
  Quiz, 
  QuizResult 
} from '../types';
import { STARTER_CODE, CONCEPTS } from '../constants';
import { analyzeCode, generateQuiz, evaluateQuizAnswer } from '../services/geminiService';

interface Props {
  student: StudentInfo;
}

const PRISM_LANG_MAP: Record<string, any> = {
  "Python 3": languages.python,
  "C": languages.c,
  "C++": languages.cpp,
  "Java": languages.java,
};

export const ProgrammingModule: React.FC<Props> = ({ student }) => {
  const [language, setLang] = useState("Python 3");
  const [code, setCode] = useState(STARTER_CODE["Python 3"]);
  const [output, setOutput] = useState<string | null>(null);
  const [errorInfo, setError] = useState<CodeErrorInfo | null>(null);
  const [running, setRunning] = useState(false);
  const [aiExp, setAiExp] = useState<AiExplanation | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizResults, setQuizResults] = useState<Record<number, QuizResult>>({});
  const [quizEvaluating, setQuizEvaluating] = useState<Record<number, boolean>>({});
  
  const [profile, setProfile] = useState<UserProfile>({
    totalRuns: 0,
    successRuns: 0,
    quizTotal: 0,
    quizCorrect: 0,
    currentProfile: "New Learner",
    conceptStats: {},
  });

  const handleRun = async () => {
    if (!code.trim()) return;

    setRunning(true);
    setAiExp(null);
    setQuiz(null);
    setOutput(null);
    setError(null);
    setQuizResults({});

    const newProfile = { ...profile, totalRuns: profile.totalRuns + 1 };
    
    try {
      // Force execution and analysis
      const result = await analyzeCode(language, code, 0);
      
      if (!result.execution.success && result.execution.error) {
        const err = result.execution.error;
        setError(err);
        setAiExp(result.explanation || null);
        
        // IMMEDIATELY stop loader so results show up
        setRunning(false);

        // Update profile stats
        const cKey = err.type;
        const prev = newProfile.conceptStats[cKey] || { count: 0, improved: false };
        newProfile.conceptStats[cKey] = { ...prev, count: prev.count + 1, lastSeen: Date.now() };
        
        // Set 'Syntax Struggle' profile if it's a syntax error
        if (["SyntaxError", "IndentationError", "CompileError", "NameError"].includes(err.type)) {
          newProfile.currentProfile = "Syntax Struggle";
        } else {
          newProfile.currentProfile = "Concept Explorer";
        }
        
        setProfile(newProfile);

        // Generate Quiz separately (background)
        setQuizLoading(true);
        try {
          const q = await generateQuiz(
            language, 
            err.type, 
            result.explanation?.concept || "General Programming",
            newProfile.conceptStats[cKey].count
          );
          setQuiz(q);
        } finally {
          setQuizLoading(false);
        }
      } else {
        setError(null);
        setOutput(result.execution.output || `Program executed successfully.\n\n[Console: ${language}]\n> Exit code: 0`);
        newProfile.successRuns += 1;
        newProfile.currentProfile = "Code Master";
        setProfile(newProfile);
        setRunning(false);
      }
    } catch (err: any) {
      console.error(err);
      setRunning(false);
      if (err?.message?.includes('429')) {
        setOutput("Error: API Quota Exceeded. Please wait a moment before trying again.");
      } else {
        setError({ type: "SystemError", msg: "Communication with AI failed. Check your connection.", concept: "networking" });
      }
    }
  };

  const evalQuestion = async (qi: number, question: any) => {
    const ans = quizAnswers[qi] || question.starter_code || "";
    if (!ans.trim() && !question.starter_code) return;

    setQuizEvaluating(prev => ({ ...prev, [qi]: true }));
    try {
      const res = await evaluateQuizAnswer(language, question.description, question.expected_behavior, ans);
      
      // Update profile with quiz results to drive the progress bar
      setProfile(p => ({
        ...p,
        quizTotal: p.quizTotal + 1,
        quizCorrect: p.quizCorrect + (res.correct ? 1 : 0)
      }));

      setQuizResults(prev => {
        const next = { ...prev, [qi]: res };
        const results = Object.values(next) as QuizResult[];
        if (results.filter(r => r.correct).length === 5) {
          if (errorInfo) {
            setProfile(p => ({
              ...p,
              conceptStats: {
                ...p.conceptStats,
                [errorInfo.type]: { ...p.conceptStats[errorInfo.type], improved: true }
              }
            }));
          }
        }
        return next;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setQuizEvaluating(prev => ({ ...prev, [qi]: false }));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 scroll-smooth">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">AI Intelligent Compiler</h1>
              <p className="text-slate-400 text-sm">Adaptive Reinforcement Learning Console</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select 
              value={language} 
              onChange={e => {
                setLang(e.target.value);
                setCode(STARTER_CODE[e.target.value]);
                setError(null); setOutput(null); setAiExp(null); setQuiz(null);
              }}
              className="bg-slate-900 border border-slate-800 text-slate-300 text-sm rounded-lg px-4 py-2 outline-none focus:border-blue-500"
            >
              {Object.keys(STARTER_CODE).map(l => <option key={l}>{l}</option>)}
            </select>
            <button 
              onClick={handleRun}
              disabled={running}
              className={`px-8 py-2 rounded-lg font-bold text-sm uppercase tracking-widest transition-all ${
                running ? 'bg-slate-800 text-slate-500' : 'bg-emerald-500 hover:bg-emerald-400 text-emerald-950 shadow-lg shadow-emerald-500/20'
              }`}
            >
              {running ? 'Analyzing...' : 'Run Code'}
            </button>
          </div>
        </div>

        <div className="space-y-6 mb-12">
          {/* Editor - EMPTY BY DEFAULT */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Editor — main</span>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>
              </div>
            </div>
            <div className="flex min-h-[400px]">
              <div className="w-12 bg-slate-950/50 border-r border-slate-800 p-4 text-right text-slate-700 font-mono text-xs select-none">
                {code.split('\n').map((_, i) => <div key={i}>{i+1}</div>)}
              </div>
              <Editor
                value={code}
                onValueChange={code => setCode(code)}
                highlight={code => highlight(code, PRISM_LANG_MAP[language] || languages.plain || languages.clike, language)}
                padding={16}
                className="flex-1 code-editor text-blue-100 outline-none leading-relaxed"
              />
            </div>
          </div>

          {/* Output Screen */}
          <div className={`rounded-xl overflow-hidden transition-all duration-500 border ${
            errorInfo ? 'bg-red-950/20 border-red-500/30' : 'bg-slate-900 border-slate-800 shadow-xl'
          }`}>
            <div className={`px-4 py-2 border-b flex justify-between items-center ${
              errorInfo ? 'border-red-500/20 bg-red-500/5' : 'border-slate-800 bg-slate-950'
            }`}>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${errorInfo ? 'text-red-400' : 'text-slate-500'}`}>
                {errorInfo ? 'Standard Error Output' : 'Standard Output'}
              </span>
              {errorInfo && <span className="text-[10px] font-black text-red-500 animate-pulse">CRITICAL ERROR</span>}
            </div>
            <div className="p-6 font-mono text-xs min-h-[140px] whitespace-pre-wrap leading-relaxed bg-[#050c16]">
              {errorInfo ? (
                <div className="text-red-400">
                  <p className="font-bold mb-1">Traceback (most recent call last):</p>
                  <p>  File "main", line 1, in &lt;module&gt;</p>
                  <p className="text-red-300 mt-2 font-bold">{errorInfo.type}: {errorInfo.msg}</p>
                </div>
              ) : output ? (
                <div className="text-emerald-400">{output}</div>
              ) : (
                <div className="text-slate-600 italic">No output generated. Write and run code to begin.</div>
              )}
            </div>
          </div>

          {/* AI Logical Analysis - DIRECTLY BELOW OUTPUT */}
          {running && (
            <div className="bg-blue-950/20 border border-blue-500/30 rounded-xl p-8 animate-pulse text-center">
              <p className="text-blue-400 text-sm font-medium">Gemini AI is examining code logic and simulating results...</p>
            </div>
          )}

          {aiExp && (
            <div className="bg-slate-900 border border-blue-900/40 rounded-xl p-4 md:p-8 shadow-2xl animate-fadeIn h-auto min-h-[120px] flex flex-col overflow-y-auto">
              <h3 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-8 border-b border-blue-900/40 pb-4">AI Logical Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                <AiSection label="What Happened" content={aiExp.what_happened} color="text-red-400" />
                <AiSection label="Root Cause" content={aiExp.why_it_happened} color="text-amber-400" />
                <AiSection label="Concept" content={aiExp.concept} color="text-blue-400" />
                <AiSection label="How to Fix" content={aiExp.how_to_fix} color="text-emerald-400" />
                {aiExp.deeper_note && <div className="md:col-span-2"><AiSection label="Deep Dive" content={aiExp.deeper_note} color="text-purple-400" /></div>}
              </div>
            </div>
          )}

          {/* Progress Dashboard */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-1">
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Learning Progress</h3>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-tighter ${
                    profile.currentProfile === 'Syntax Struggle' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                    profile.currentProfile === 'Code Master' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    {profile.currentProfile}
                  </span>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Runs: <span className="text-slate-200">{profile.totalRuns + profile.quizTotal}</span></div>
                <div className="text-[10px] text-slate-500 uppercase font-bold">Passed: <span className="text-emerald-400">{profile.successRuns + profile.quizCorrect}</span></div>
              </div>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-1000" 
                style={{ width: `${(profile.totalRuns + profile.quizTotal) ? ((profile.successRuns + profile.quizCorrect) / (profile.totalRuns + profile.quizTotal)) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Adaptive Quiz */}
        {(quizLoading || quiz) && (
          <div className="space-y-6 pb-24">
            <div className="flex items-center gap-3 mb-4">
               <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent to-amber-500/30"></div>
               <h2 className="text-amber-500 text-sm font-bold uppercase tracking-[0.2em] whitespace-nowrap">Skill Verification Quiz</h2>
               <div className="h-0.5 flex-1 bg-gradient-to-l from-transparent to-amber-500/30"></div>
            </div>

            {quizLoading ? (
              <div className="text-center py-12 text-amber-500/50 italic animate-pulse">Generating personalized challenge based on recent errors...</div>
            ) : (
              quiz?.questions.map((q, i) => (
                <div key={q.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-fadeIn">
                  <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-xs font-bold">{q.id}</span>
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{q.title}</span>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                      q.difficulty === 'Very Easy' ? 'bg-emerald-500/10 text-emerald-400' :
                      q.difficulty === 'Easy' ? 'bg-blue-500/10 text-blue-400' :
                      q.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-rose-500/10 text-rose-400'
                    }`}>
                      {q.difficulty}
                    </span>
                  </div>
                  <div className="p-8">
                    <p className="text-slate-300 mb-6 leading-relaxed">{q.description}</p>
                    <div className="bg-slate-950 rounded-xl border border-slate-800 p-1 mb-6 shadow-inner">
                      <textarea
                        value={quizAnswers[i] ?? q.starter_code}
                        onChange={e => setQuizAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                        rows={5}
                        className="w-full bg-transparent p-4 font-mono text-sm outline-none resize-none text-blue-100"
                        placeholder="Complete the solution here..."
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <button 
                        onClick={() => evalQuestion(i, q)}
                        disabled={quizEvaluating[i]}
                        className="bg-amber-500 hover:bg-amber-400 text-amber-950 px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-amber-500/10"
                      >
                        {quizEvaluating[i] ? 'Evaluating...' : 'Check Answer'}
                      </button>
                      <div className="bg-slate-950/50 border border-slate-800 rounded p-4 mt-2 h-auto min-h-[80px] flex flex-col items-center justify-center text-center overflow-y-auto">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest italic font-bold mb-1">Hint</p>
                        <p className="text-slate-400 text-xs leading-relaxed break-words whitespace-pre-wrap">{q.hint}</p>
                      </div>
                    </div>

                    {quizResults[i] && (
                      <div className={`mt-8 p-6 rounded-xl border animate-scaleIn ${
                        quizResults[i].correct ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'
                      }`}>
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`text-sm font-bold uppercase tracking-widest ${quizResults[i].correct ? 'text-emerald-400' : 'text-red-400'}`}>
                            {quizResults[i].correct ? 'Success' : 'Incorrect'}
                          </span>
                          <div className="h-px flex-1 bg-slate-800"></div>
                        </div>
                        <p className="text-slate-300 text-sm mb-4 leading-relaxed">{quizResults[i].feedback}</p>
                        
                        {quizResults[i].correct_code && !quizResults[i].correct && (
                          <div className="mt-4 p-4 bg-slate-950 rounded-lg border border-slate-800/50">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Reference Solution:</div>
                            <pre className="text-xs font-mono text-blue-300 whitespace-pre-wrap">{quizResults[i].correct_code}</pre>
                          </div>
                        )}

                        {quizResults[i].improvement && (
                           <div className="text-xs text-amber-400 bg-amber-400/5 p-3 rounded-lg border border-amber-400/20 mt-4">
                             <span className="font-bold uppercase mr-2">Tip:</span>
                             {quizResults[i].improvement}
                           </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const AiSection: React.FC<{ label: string; content: string; color: string }> = ({ label, content, color }) => (
  <div className="space-y-2 flex flex-col items-center justify-center text-center">
    <div className={`text-[10px] font-black uppercase tracking-widest ${color}`}>{label}</div>
    <p className="text-slate-300 text-sm leading-relaxed break-words whitespace-pre-wrap">{content}</p>
  </div>
);
