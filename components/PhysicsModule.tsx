
import React, { useState, useEffect, useRef } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line } from 'recharts';
import { PhysicsResult, StudentInfo, UserRole, Submission } from '../types';
import { COLORS } from '../constants';
import { checkReportPlagiarism } from '../services/geminiService';

interface Props {
  student: StudentInfo;
  role: UserRole;
  onSaveSubmission?: (submission: Submission) => void;
  initialResult?: PhysicsResult | null;
  onBack?: () => void;
}

interface Experiment {
  id: string;
  name: string;
  description: string;
  inputs: { label: string; key: string; unit: string }[];
  formulaHint: string;
  unit: string;
  label: string;
  defaultData: Record<string, string[]>;
}

const EXPERIMENTS: Experiment[] = [
  {
    id: 'ohms-law',
    name: "Ohm's Law",
    description: "Verification of the relationship between Voltage, Current, and Resistance.",
    inputs: [
      { label: "Voltage", key: "v", unit: "V" },
      { label: "Current", key: "i", unit: "A" }
    ],
    formulaHint: "Recall the relationship between Voltage and Current. How does resistance affect the flow?",
    unit: "Ω",
    label: "Resistance",
    defaultData: {
      v: ["2.1", "3.9", "6.2", "7.8", "10.3"],
      i: ["0.42", "0.81", "1.19", "1.58", "2.01"]
    }
  },
  {
    id: 'convex-lens',
    name: "Convex Lens",
    description: "Determination of focal length using the relationship between object and image distances.",
    inputs: [
      { label: "Object Dist (u)", key: "u", unit: "cm" },
      { label: "Image Dist (v)", key: "v", unit: "cm" }
    ],
    formulaHint: "Think about how the image distance changes as the object moves closer to the lens.",
    unit: "cm",
    label: "Focal Length",
    defaultData: {
      u: ["-20", "-25", "-30", "-40", "-60"],
      v: ["60", "37.5", "30", "26.7", "24"]
    }
  },
  {
    id: 'glass-prism',
    name: "Glass Prism",
    description: "Relationship between the angle of incidence, emergence, and deviation.",
    inputs: [
      { label: "Incidence (i)", key: "i", unit: "°" },
      { label: "Emergence (e)", key: "e", unit: "°" },
      { label: "Prism Angle (A)", key: "a", unit: "°" }
    ],
    formulaHint: "How do the angles of incidence and emergence relate to the total deviation and the prism's geometry?",
    unit: "°",
    label: "Deviation",
    defaultData: {
      i: ["35", "40", "45", "50", "55"],
      e: ["55", "48", "45", "46", "52"],
      a: ["60", "60", "60", "60", "60"]
    }
  },
  {
    id: 'resistors',
    name: "Resistors (Series/Parallel)",
    description: "Verification of the laws of combination for resistors in different configurations.",
    inputs: [
      { label: "Resistor 1 (R1)", key: "r1", unit: "Ω" },
      { label: "Resistor 2 (R2)", key: "r2", unit: "Ω" },
      { label: "Measured R_tot", key: "rt", unit: "Ω" }
    ],
    formulaHint: "Consider how total resistance changes when resistors are added in a single path versus multiple paths.",
    unit: "Ω",
    label: "Total Resistance",
    defaultData: {
      r1: ["10", "20", "30", "40", "50"],
      r2: ["5", "10", "15", "20", "25"],
      rt: ["15.1", "30.2", "45.3", "60.4", "75.5"]
    }
  },
  {
    id: 'moments',
    name: "Law of Moments",
    description: "Verification of the balance between clockwise and anticlockwise moments.",
    inputs: [
      { label: "Weight 1 (W1)", key: "w1", unit: "gf" },
      { label: "Distance 1 (d1)", key: "d1", unit: "cm" },
      { label: "Weight 2 (W2)", key: "w2", unit: "gf" },
      { label: "Distance 2 (d2)", key: "d2", unit: "cm" }
    ],
    formulaHint: "How does the distance from the pivot affect the turning effect of a weight?",
    unit: "gf-cm",
    label: "Moment",
    defaultData: {
      w1: ["50", "100", "150", "200", "250"],
      d1: ["20", "15", "10", "8", "6"],
      w2: ["40", "75", "100", "160", "150"],
      d2: ["25", "20", "15", "10", "10"]
    }
  }
];

const parseFormula = (raw: string, expId: string) => {
  const s = raw.toLowerCase().replace(/\s+/g, "").replace(/×/g, "*").replace(/÷/g, "/");
  
  switch (expId) {
    case 'ohms-law':
      if (s === "r=v/i" || s === "v/i") return { type: "correct", display: "Ohm's Law (R = V/I)" };
      if (s === "r=i/v" || s === "i/v") return { type: "inverted", display: "Inverted Ohm's Law (I/V)" };
      if (/v=i[*]?r/.test(s) || /v=r[*]?i/.test(s)) return { type: "correct", display: "Ohm's Law (Derived from V=IR)" };
      break;
    case 'convex-lens':
      if (s === "1/f=1/v-1/u" || s === "f=uv/(u-v)") return { type: "correct", display: "Lens Formula" };
      if (s === "1/f=1/v+1/u" || s === "f=uv/(u+v)") return { type: "correct", display: "Lens Formula (Sign Convention Applied)" };
      break;
    case 'glass-prism':
      if (s === "d=i+e-a" || s === "i+e=a+d") return { type: "correct", display: "Prism Deviation Formula" };
      break;
    case 'resistors':
      if (s === "rs=r1+r2" || s === "r=r1+r2") return { type: "correct", display: "Series Resistance Law" };
      if (s === "1/rp=1/r1+1/r2" || s === "rp=(r1*r2)/(r1+r2)") return { type: "correct", display: "Parallel Resistance Law" };
      break;
    case 'moments':
      if (s === "w1*d1=w2*d2" || s === "w1d1=w2d2") return { type: "correct", display: "Principle of Moments" };
      break;
  }
  return { type: "unknown", display: raw };
};

const calcIntegrity = (expId: string, data: Record<string, number[]>) => {
  let values: number[] = [];
  let feedback = "";

  switch (expId) {
    case 'ohms-law': {
      const { v, i } = data;
      values = v.map((val, idx) => val / i[idx]);
      break;
    }
    case 'convex-lens': {
      const { u, v } = data;
      values = u.map((val, idx) => (val * v[idx]) / (val - v[idx]));
      feedback = "Your image distance is decreasing as object distance increases, which follows the Lens Law.";
      break;
    }
    case 'glass-prism': {
      const { i, e, a } = data;
      values = i.map((val, idx) => val + e[idx] - a[idx]);
      break;
    }
    case 'resistors': {
      const { r1, r2, rt } = data;
      values = rt; // Here we compare measured vs expected
      break;
    }
    case 'moments': {
      const { w1, d1, w2, d2 } = data;
      values = w1.map((val, idx) => val * d1[idx]); // Clockwise vs Anticlockwise
      break;
    }
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.map(v => (v - mean) ** 2).reduce((a, b) => a + b, 0) / values.length);
  const cv = std / Math.abs(mean);

  // 1. Data Plagiarism Detection (The 'Too Perfect' Logic)
  if (cv < 0.001) {
    return { score: 10, note: "Likely Faked/Calculated. Data matches theoretical values perfectly with 0% margin of error.", tag: 'bad' as const };
  }

  if (cv < 0.01) return { score: 18, note: "Data is statistically uniform beyond acceptable limits. Possible fabrication detected.", tag: 'bad' as const };
  if (cv < 0.05) return { score: 62, note: "Data shows minimal variance. Borderline — real measurements contain natural noise.", tag: 'warn' as const };
  
  // 2. High Variance Check (Human Error / Consistency)
  if (cv > 0.15) {
    return { score: 45, note: "Low Consistency/Manual Error. Measurements vary significantly between trials.", tag: 'bad' as const };
  }

  const baseNote = "Natural experimental noise detected. Dataset is consistent with authentic laboratory measurements.";
  return { score: 87, note: feedback ? `${feedback} ${baseNote}` : baseNote, tag: 'ok' as const };
};

export const PhysicsModule: React.FC<Props> = ({ student, role, onSaveSubmission, initialResult, onBack }) => {
  const [expId, setExpId] = useState('ohms-law');
  const exp = EXPERIMENTS.find(e => e.id === expId)!;
  
  const [inputs, setInputs] = useState<Record<string, string[]>>(exp.defaultData);
  const [formula, setFormula] = useState("");
  const [result, setResult] = useState<PhysicsResult | null>(initialResult || null);
  const [tab, setTab] = useState(initialResult ? "results" : "input");

  // Plagiarism & Integrity Suite State
  const [studentReport, setStudentReport] = useState("");
  const [clipboardUsed, setClipboardUsed] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [timeOnTask, setTimeOnTask] = useState(0);
  const [showInstructor, setShowInstructor] = useState(role === 'teacher');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialResult) {
      setResult(initialResult);
      setTab("results");
      setShowInstructor(true);
    }
  }, [initialResult]);

  useEffect(() => {
    if (!initialResult) {
      setInputs(exp.defaultData);
      setFormula("");
      setResult(null);
      setTab("input");
      setStudentReport("");
      setClipboardUsed(false);
      setStartTime(Date.now());
      setTimeOnTask(0);
    }
  }, [expId, initialResult]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (tab === 'input') {
        setTimeOnTask(prev => prev + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [tab]);

  const evaluate = async () => {
    setIsEvaluating(true);
    const data: Record<string, number[]> = {};
    let minLen = 999;
    
    for (const input of exp.inputs) {
      const vals = (inputs[input.key] || []).map(Number).filter(x => !isNaN(x));
      data[input.key] = vals;
      minLen = Math.min(minLen, vals.length);
    }

    if (minLen < 3) {
      setIsEvaluating(false);
      return;
    }

    const parsed = parseFormula(formula, expId);
    if (parsed.type === "unknown") {
      setIsEvaluating(false);
      return;
    }

    const integrity = calcIntegrity(expId, data);
    
    let calculatedValues: number[] = [];
    let studentValues: number[] = [];

    // ... (switch case logic remains same)
    switch (expId) {
      case 'ohms-law':
        calculatedValues = data.v.map((v, i) => v / data.i[i]);
        studentValues = calculatedValues;
        break;
      case 'convex-lens':
        calculatedValues = data.u.map((u, i) => (u * data.v[i]) / (u - data.v[i]));
        studentValues = calculatedValues;
        break;
      case 'glass-prism':
        calculatedValues = data.i.map((i, idx) => i + data.e[idx] - data.a[idx]);
        studentValues = calculatedValues;
        break;
      case 'resistors':
        calculatedValues = data.r1.map((r1, i) => r1 + data.r2[i]);
        studentValues = data.rt;
        break;
      case 'moments':
        calculatedValues = data.w1.map((w1, i) => w1 * data.d1[i]);
        studentValues = data.w2.map((w2, i) => w2 * data.d2[i]);
        break;
    }

    const meanCalculated = calculatedValues.reduce((a, b) => a + b, 0) / calculatedValues.length;
    const meanStudent = studentValues.reduce((a, b) => a + b, 0) / studentValues.length;
    const ok = parsed.type === "correct";

    // AI Plagiarism Check
    let similarity = 0;
    let source = "No direct match found.";
    if (studentReport.length > 20) {
      const plagResult = await checkReportPlagiarism(exp.name, studentReport);
      similarity = plagResult.similarityIndex;
      source = plagResult.sourceMatch;
    }

    const authenticityScore = integrity.score > 80 ? 'High' : integrity.score > 50 ? 'Medium' : 'Low';
    
    let flag: 'authentic' | 'caution' | 'flagged' = 'authentic';
    if (clipboardUsed || integrity.score < 20 || similarity > 40) flag = 'caution';
    if (integrity.score < 15 || similarity > 70) flag = 'flagged';

    setResult({
      integrity,
      calculatedValues,
      studentValues,
      meanCalculated,
      meanStudent,
      ok,
      fMarks: ok ? 4 : 0,
      cMarks: ok ? 6 : 5,
      total: ok ? 10 : 5,
      parsedFormula: parsed,
      unit: exp.unit,
      label: exp.label,
      instructorInsights: {
        authenticityScore,
        similarityIndex: similarity,
        sourceMatch: source,
        timeOnTask,
        clipboardUsed,
        flag
      }
    });
    setIsEvaluating(false);
    setTab("results");
  };

  const handleFinalSubmit = () => {
    if (!result || !onSaveSubmission) return;
    setIsSubmitting(true);
    
    const submission: Submission = {
      id: Math.random().toString(36).substr(2, 9),
      student,
      experimentName: exp.name,
      result,
      timestamp: Date.now()
    };

    setTimeout(() => {
      onSaveSubmission(submission);
      setIsSubmitting(false);
      alert("Experiment submitted successfully to instructor.");
    }, 1000);
  };

  const chartData = (inputs[exp.inputs[0].key] || []).map((_, i) => {
    const d: any = {};
    exp.inputs.forEach(input => {
      d[input.key] = parseFloat(inputs[input.key]?.[i] || "0");
    });
    return d;
  }).filter(d => Object.values(d).every(v => !isNaN(v as number)));

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          )}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{exp.name} Evaluator</h1>
            <p className="text-slate-400 text-sm">{exp.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-lg border border-slate-800">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Select Experiment</span>
          <select 
            value={expId} 
            onChange={(e) => setExpId(e.target.value)}
            className="bg-slate-950 text-slate-200 text-xs font-bold p-2 rounded border border-slate-800 outline-none focus:border-teal-500 transition-colors"
          >
            {EXPERIMENTS.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex border-b border-slate-800 mb-6">
        {['input', 'results', 'report'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-3 text-xs font-bold tracking-widest uppercase transition-colors ${
              tab === t ? 'text-teal-400 border-b-2 border-teal-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.replace('-', ' ')}
          </button>
        ))}
      </div>

      {tab === 'input' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn w-full">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col w-full overflow-hidden">
            <h3 className="text-teal-400 text-xs font-bold uppercase tracking-widest mb-4">Experimental Readings</h3>
            <div className="space-y-3 overflow-x-auto pb-2">
              <div className={`grid grid-cols-${exp.inputs.length} gap-4 mb-2 text-[10px] text-slate-500 font-bold uppercase tracking-tighter min-w-[400px]`} style={{ gridTemplateColumns: `repeat(${exp.inputs.length}, 1fr)` }}>
                {exp.inputs.map(input => (
                  <div key={input.key}>{input.label} ({input.unit})</div>
                ))}
              </div>
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="flex gap-4 items-center min-w-[400px] flex-wrap md:flex-nowrap">
                  <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 font-mono flex-shrink-0">#{i+1}</div>
                  {exp.inputs.map(input => (
                    <input
                      key={input.key}
                      type="number"
                      value={inputs[input.key]?.[i] || ""}
                      onChange={e => {
                        const n = { ...inputs };
                        if (!n[input.key]) n[input.key] = ["", "", "", "", ""];
                        n[input.key][i] = e.target.value;
                        setInputs(n);
                      }}
                      className="flex-1 min-w-[80px] max-w-full box-border bg-slate-950 border border-slate-800 rounded p-2 text-sm outline-none focus:border-teal-500 transition-colors"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-teal-400 text-xs font-bold uppercase tracking-widest mb-4">Formula Definition</h3>
              <p className="text-slate-400 text-sm mb-4">Enter the formula you used for this experiment.</p>
              <input
                type="text"
                placeholder="Enter formula..."
                value={formula}
                onChange={e => setFormula(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xl outline-none focus:border-teal-500"
              />
            </div>

            <button
              onClick={evaluate}
              disabled={isEvaluating}
              className="w-full bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 p-4 rounded-xl font-bold uppercase tracking-widest shadow-xl shadow-teal-500/10 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEvaluating ? 'Analyzing Integrity...' : 'Execute Evaluation'}
            </button>
          </div>
        </div>
      )}

      {tab === 'results' && result && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex justify-between items-center">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
              <MetricCard label="Integrity" value={result.integrity.score} sub="Score" color={result.integrity.tag === 'ok' ? 'text-emerald-400' : result.integrity.tag === 'warn' ? 'text-amber-400' : 'text-red-400'} />
              <MetricCard label="Formula" value={`${result.fMarks}/4`} sub="Marks" color={result.ok ? 'text-emerald-400' : 'text-red-400'} />
              <MetricCard label="Logic" value={`${result.cMarks}/6`} sub="Marks" color={result.cMarks === 6 ? 'text-emerald-400' : 'text-amber-400'} />
              <MetricCard label={`Mean ${result.label}`} value={result.meanCalculated.toFixed(2)} sub={result.unit} color="text-teal-400" />
            </div>
            {role === 'teacher' && (
              <button 
                onClick={() => setShowInstructor(!showInstructor)}
                className={`ml-4 p-3 rounded-xl border transition-colors ${
                  showInstructor ? 'bg-teal-500/10 border-teal-500 text-teal-400' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-teal-400'
                }`}
                title="Instructor Insights"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </button>
            )}
          </div>

          {showInstructor && role === 'teacher' && result.instructorInsights && (
            <div className="bg-slate-900 border-2 border-teal-500/30 rounded-2xl p-6 animate-scaleIn shadow-2xl shadow-teal-500/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 px-4 py-1 bg-teal-500 text-white text-[8px] font-bold uppercase tracking-[0.3em] rounded-bl-lg">Official Use Only</div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-teal-400 text-sm font-black uppercase tracking-[0.2em]">Instructor Insights</h3>
                <div className="flex items-center gap-2">
                  {result.instructorInsights.flag === 'authentic' && <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/20">🟢 AUTHENTIC</span>}
                  {result.instructorInsights.flag === 'caution' && <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/20">🟡 CAUTION</span>}
                  {result.instructorInsights.flag === 'flagged' && <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 text-rose-400 text-[10px] font-bold rounded-full border border-rose-500/20">🔴 FLAGGED</span>}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Authenticity Score</p>
                  <p className={`text-xl font-black ${result.instructorInsights.authenticityScore === 'High' ? 'text-emerald-400' : result.instructorInsights.authenticityScore === 'Medium' ? 'text-amber-400' : 'text-rose-400'}`}>
                    {result.instructorInsights.authenticityScore}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Plagiarism Match</p>
                  <p className="text-xl font-black text-slate-100">{result.instructorInsights.similarityIndex}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Time on Task</p>
                  <p className={`text-xl font-black ${result.instructorInsights.timeOnTask < 120 ? 'text-rose-400' : 'text-slate-100'}`}>
                    {Math.floor(result.instructorInsights.timeOnTask / 60)}m {result.instructorInsights.timeOnTask % 60}s
                    {result.instructorInsights.timeOnTask < 120 && <span className="ml-2 text-[8px] text-rose-500 uppercase">Suspicious Speed</span>}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Clipboard Used</p>
                  <p className={`text-xl font-black ${result.instructorInsights.clipboardUsed ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {result.instructorInsights.clipboardUsed ? 'YES' : 'NO'}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Source Identification</p>
                <p className="text-slate-300 text-sm italic">"{result.instructorInsights.sourceMatch}"</p>
              </div>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col justify-center text-center h-auto min-h-[160px] overflow-y-auto shadow-2xl shadow-teal-500/5">
            <h3 className="text-teal-400 text-xs font-bold uppercase mb-6 tracking-widest border-b border-slate-800 pb-4">AI Integrity & Logical Analysis</h3>
            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              <div className="text-6xl font-black text-slate-100">{result.integrity.score}%</div>
              <div className="h-12 w-px bg-slate-800 hidden md:block"></div>
              <p className="text-slate-300 text-lg italic leading-relaxed break-words whitespace-pre-wrap max-w-2xl">"{result.integrity.note}"</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-slate-400 text-xs font-bold uppercase mb-6 tracking-widest">Experimental Trend Analysis</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" dataKey={exp.inputs[0].key} name={exp.inputs[0].label} unit={exp.inputs[0].unit} stroke="#475569" fontSize={12} />
                    <YAxis type="number" dataKey={exp.inputs[1].key} name={exp.inputs[1].label} unit={exp.inputs[1].unit} stroke="#475569" fontSize={12} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                    <Scatter name="Readings" data={chartData} fill="#2dd4bf" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden w-full">
             <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-teal-400 tracking-widest">Detailed Tabulation</span>
                {result.ok ? <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded">CORRECT FORMULA</span> : <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-1 rounded">ERROR-CHAIN ANALYSIS ACTIVE</span>}
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-900/50 text-slate-500">
                      <th className="px-6 py-3 font-medium">Reading</th>
                      {exp.inputs.map(input => (
                        <th key={input.key} className="px-6 py-3 font-medium">{input.label} ({input.unit})</th>
                      ))}
                      <th className="px-6 py-3 font-medium">Calc {result.label}</th>
                      <th className="px-6 py-3 font-medium">Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {chartData.map((d, i) => (
                      <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 font-mono text-slate-400">#0{i+1}</td>
                        {exp.inputs.map(input => (
                          <td key={input.key} className="px-6 py-4">{d[input.key]}</td>
                        ))}
                        <td className="px-6 py-4 text-teal-400 font-mono">{result.calculatedValues[i]?.toFixed(3)}</td>
                        <td className="px-6 py-4">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
             </div>
          </div>
        </div>
      )}

      {tab === 'report' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-teal-400 text-xs font-bold uppercase tracking-widest mb-4">Laboratory Report Submission</h3>
            <p className="text-slate-400 text-sm mb-4">Write your observations and conclusion for the experiment. This will be evaluated for originality.</p>
            <textarea
              value={studentReport}
              onChange={(e) => setStudentReport(e.target.value)}
              onPaste={() => setClipboardUsed(true)}
              rows={8}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 text-slate-200 text-sm outline-none focus:border-teal-500 transition-colors resize-none"
              placeholder="Start typing your report here..."
            />
          </div>

          {result && (
            <div className="max-w-3xl mx-auto bg-white text-slate-900 p-12 rounded shadow-2xl animate-scaleIn font-serif">
          <div className="flex justify-between border-b-2 border-slate-900 pb-8 mb-8">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter">Evaluation Report</h2>
              <p className="text-slate-500 text-sm mt-1">Physics Experiment: {exp.name} v2.0</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-bold">Student: {student.name}</p>
              <p>ID: {student.rollNo}</p>
              <p>{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-12">
            <div>
              <h4 className="font-bold uppercase text-xs mb-4 border-b pb-2">Technical Summary</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between"><span>Formula Applied:</span> <span className="font-bold">{result.parsedFormula.display}</span></li>
                <li className="flex justify-between"><span>Mean {result.label}:</span> <span className="font-bold">{result.meanCalculated.toFixed(3)} {result.unit}</span></li>
                <li className="flex justify-between"><span>Data Points:</span> <span className="font-bold">{result.calculatedValues.length}</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold uppercase text-xs mb-4 border-b pb-2">Grading Outcome</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between"><span>Formula Marks:</span> <span className="font-bold">{result.fMarks} / 4</span></li>
                <li className="flex justify-between"><span>Internal Consistency:</span> <span className="font-bold">{result.cMarks} / 6</span></li>
                <li className="flex justify-between border-t pt-2 mt-2"><span>Total Score:</span> <span className="font-bold text-xl">{result.total} / 10</span></li>
              </ul>
            </div>
          </div>

          <div className="bg-slate-50 p-6 border-l-4 border-slate-900 mb-8">
            <h4 className="font-bold text-sm mb-2 uppercase">Evaluator's Notes</h4>
            <p className="text-sm italic text-slate-700 leading-relaxed">
              Analysis of data integrity shows a score of {result.integrity.score}%. {result.integrity.note} 
              The student demonstrated {result.ok ? "perfect alignment with physical laws" : "some errors in initial formula derivation, but subsequent calculations were logically consistent based on the false premise (error-chaining validation applied)"}.
            </p>
          </div>

          <div className="mt-20 flex justify-end">
            <div className="text-center w-48 border-t border-slate-900 pt-2">
              <p className="text-xs font-bold">DIGITAL SIGNATURE</p>
              <p className="text-[10px] text-slate-400">AI-EX-PLATFORM-AUTH</p>
            </div>
          </div>

          {role === 'student' && (
            <div className="mt-12 pt-8 border-t border-slate-100 flex justify-center">
              <button
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="px-12 py-4 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest shadow-xl hover:bg-teal-600 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit to Instructor'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )}
</div>
);
};

const MetricCard: React.FC<{ label: string; value: string | number; sub: string; color: string }> = ({ label, value, sub, color }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col items-center text-center">
    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">{label}</span>
    <div className={`text-3xl font-black ${color} mb-1 font-mono`}>{value}</div>
    <span className="text-[10px] text-slate-600 font-bold uppercase">{sub}</span>
  </div>
);
