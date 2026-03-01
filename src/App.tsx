/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  FileText, 
  Brain, 
  AlertCircle, 
  Search, 
  ChevronRight, 
  Activity,
  Target,
  Layers,
  Info,
  Loader2
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { analyzeText, AnalysisResult, Concept } from './utils/nlp';
import { KnowledgeGraph } from './components/KnowledgeGraph';
import { cn } from './utils/nlp';

// Set up PDF.js worker
const PDFJS_VERSION = '5.4.624';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

export default function App() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [question, setQuestion] = useState('');
  const [qaResult, setQaResult] = useState<{ answer: string; reinforcement?: boolean } | null>(null);
  const [showMetrics, setShowMetrics] = useState<Record<string, boolean>>({});

  const toggleMetrics = (id: string) => {
    setShowMetrics(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    setIsAnalyzing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ 
        data: arrayBuffer,
        cMapUrl: `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/cmaps/`,
        cMapPacked: true,
      }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n\n';
      }
      if (fullText.trim().length < 10) {
        throw new Error('The PDF contains too little text to analyze.');
      }
      const analysis = analyzeText(fullText);
      if (analysis.concepts.length === 0) {
        throw new Error('No significant concepts could be extracted.');
      }
      setResult(analysis);
      setSelectedConcept(null);
      setQaResult(null);
      setShowMetrics({});
    } catch (error) {
      console.error('Error processing PDF:', error);
      alert(error instanceof Error ? error.message : 'Failed to process PDF.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!result || !question.trim()) return;

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are an academic cognitive assistant. Use the following context from a PDF to answer the user's question. 
                Context: ${result.paragraphs.slice(0, 10).join("\n")}
                
                Question: ${question}
                
                Guidelines:
                - Answer conversationally but academically.
                - Keep answers structured and concise.
                - Do not return raw text; synthesize an explanation.
                - If the question relates to a concept from this list: ${result.concepts.map(c => c.label).join(", ")}, check its status.
                - If the concept is categorized as "Weak", include reinforcement suggestions.
                - If the concept is "Strong", provide a direct explanation only.`
              }
            ]
          }
        ]
      });

      setQaResult({
        answer: response.text || "I'm sorry, I couldn't generate a response.",
        reinforcement: result.concepts.some(c => question.toLowerCase().includes(c.id) && c.category === 'Weak')
      });
    } catch (error) {
      console.error('Gemini API error:', error);
      setQaResult({
        answer: "Error connecting to AI service. Please try again later.",
        reinforcement: false
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#141414] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-[#E4E4E7] px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-tight text-[#141414]">MemoryMesh</h1>
          <p className="text-[10px] uppercase tracking-widest text-[#71717A] font-medium">Adaptive Cognitive Intelligence</p>
        </div>
        <button className="text-[#71717A] hover:text-[#141414] transition-colors">
          <Activity size={20} />
        </button>
      </header>

      {!result ? (
        <main className="max-w-4xl mx-auto mt-20 p-6">
          <div className="bg-white border border-[#E4E4E7] rounded-xl p-12 text-center space-y-8 shadow-sm">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-[#F4F4F5] rounded-2xl flex items-center justify-center text-[#141414]">
                <Brain size={40} />
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-bold tracking-tight">Map your cognitive landscape.</h2>
              <p className="max-w-md mx-auto text-sm text-[#71717A] leading-relaxed">
                Upload academic papers or study notes to visualize conceptual relationships and identify structural weaknesses.
              </p>
            </div>
            {isAnalyzing ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-64 h-2 bg-[#F4F4F5] rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-[#141414]"
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#71717A]">Extracting Semantic Structures...</p>
              </div>
            ) : (
              <label className="inline-flex items-center gap-3 px-8 py-4 bg-[#141414] text-white rounded-xl hover:opacity-90 transition-opacity cursor-pointer text-sm font-bold uppercase tracking-widest shadow-lg shadow-black/10">
                <Upload size={18} />
                Upload PDF
                <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
              </label>
            )}
          </div>
        </main>
      ) : (
        <div className="grid grid-cols-12 gap-0 min-h-screen">
          {/* Left Sidebar (1/4 of 12 = 3) */}
          <aside className="col-span-3 bg-white border-r border-[#E4E4E7] p-6 space-y-8">
            <section className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-[#141414]">Study Inputs & Strength Overview</h3>
                <label className="flex items-center justify-center gap-2 w-full py-3 bg-[#141414] text-white rounded-lg hover:opacity-90 transition-opacity cursor-pointer text-xs font-bold uppercase tracking-widest shadow-sm">
                  <Upload size={14} />
                  Upload PDF
                  <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>

              <div className="space-y-6">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-[#141414]">Strength Overview</h4>
                  <p className="text-[10px] text-[#71717A]">Concept Strength is calculated using frequency density and graph connectivity.</p>
                </div>

                {['Strong', 'Moderate', 'Weak'].map((cat) => {
                  const filtered = result.concepts.filter(c => c.category === cat);
                  if (filtered.length === 0) return null;
                  return (
                    <div key={cat} className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          cat === 'Strong' ? "bg-[#22C55E]" : cat === 'Moderate' ? "bg-[#F59E0B]" : "bg-[#EF4444]"
                        )} />
                        <h5 className="text-[11px] font-bold text-[#141414] uppercase tracking-wider">
                          {cat} Concepts ({filtered.length})
                        </h5>
                      </div>
                      <div className="space-y-3 pl-4">
                        {filtered.map(concept => (
                          <div key={concept.id} className="space-y-1">
                            <div className="flex justify-between items-end">
                              <span className="text-[11px] font-medium text-[#3F3F46]">{concept.label}</span>
                              <span className="text-[10px] font-bold text-[#71717A]">{(concept.css * 100).toFixed(0)}%</span>
                            </div>
                            <div className="h-1 w-full bg-[#F4F4F5] rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${concept.css * 100}%` }}
                                className={cn(
                                  "h-full rounded-full",
                                  cat === 'Strong' ? "bg-[#22C55E]" : cat === 'Moderate' ? "bg-[#F59E0B]" : "bg-[#EF4444]"
                                )}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </aside>

          {/* Center Panel (2/4 of 12 = 6) */}
          <main className="col-span-6 bg-[#F8F9FA] flex flex-col">
            <div className="p-10 pb-6 space-y-6">
              <div className="grid grid-cols-3 gap-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#71717A]">Overall Preparation Strength</p>
                  <p className="text-lg font-bold">
                    {(result.stats.avgCSS * 100).toFixed(0)}% <span className="text-xs font-medium text-[#F59E0B] ml-1">({result.stats.avgCSS >= 0.8 ? 'Strong' : result.stats.avgCSS >= 0.6 ? 'Moderate' : 'Weak'})</span>
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#71717A]">Structural Balance</p>
                  <p className="text-lg font-bold">{result.stats.balance > 0.8 ? 'High' : result.stats.balance > 0.6 ? 'Moderate' : 'Low'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#71717A]">Topics Needing Reinforcement</p>
                  <p className="text-lg font-bold text-[#EF4444]">{result.stats.weakCount}</p>
                </div>
              </div>
              <p className="text-xs text-[#71717A] italic leading-relaxed">
                Your preparation is {result.stats.avgCSS >= 0.7 ? 'strong' : 'developing'} in core areas but {result.stats.balance < 0.7 ? 'uneven' : 'consistent'} across the conceptual mesh.
              </p>
            </div>

            <div className="px-10 pb-10">
              <KnowledgeGraph 
                concepts={result.concepts} 
                edges={result.edges} 
                onNodeClick={setSelectedConcept}
              />
            </div>
          </main>

          {/* Right Panel (1/4 of 12 = 3) */}
          <aside className="col-span-3 bg-white border-l border-[#E4E4E7] p-6 space-y-8 sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto">
            <section className="space-y-8">
              <h3 className="text-sm font-bold text-[#141414]">Cognitive Insights & Adaptive Q&A</h3>
              
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-[#F59E0B]">
                  <Brain size={16} />
                  <h4 className="text-[11px] font-bold uppercase tracking-widest">Insight Engine</h4>
                </div>

                <div className="space-y-4">
                  {(selectedConcept ? [selectedConcept] : result.concepts.filter(c => c.category !== 'Strong').slice(0, 2)).map((concept) => (
                    <div key={concept.id} className={cn(
                      "p-5 rounded-xl border space-y-4 shadow-sm",
                      concept.category === 'Weak' ? "bg-[#FEF2F2] border-[#FEE2E2]" : "bg-[#FFFBEB] border-[#FEF3C7]"
                    )}>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          concept.category === 'Weak' ? "bg-[#EF4444]" : "bg-[#F59E0B]"
                        )} />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#141414]">Topic Status: {concept.category}</span>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-xs leading-relaxed text-[#3F3F46]">
                          <span className="font-bold">{concept.label}</span> {concept.insights[0].split(concept.label)[1]}
                        </p>
                        <p className="text-[11px] text-[#71717A] leading-relaxed">
                          {concept.insights[1]}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#141414]">Recommended Action:</p>
                        <ul className="space-y-1">
                          {concept.actions.map((action, i) => (
                            <li key={i} className="flex items-start gap-2 text-[11px] text-[#3F3F46]">
                              <span className="text-[#EF4444] mt-1">•</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <button 
                          onClick={() => toggleMetrics(concept.id)}
                          className="text-[10px] font-bold text-[#141414] uppercase tracking-widest hover:underline"
                        >
                          {showMetrics[concept.id] ? 'Hide Technical Metrics' : 'Show Technical Metrics'}
                        </button>
                        
                        <AnimatePresence>
                          {showMetrics[concept.id] && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="pt-2 grid grid-cols-2 gap-2 text-[9px] font-mono uppercase">
                                <div className="p-2 border border-[#141414]/10 rounded bg-white/50">
                                  <p className="opacity-50">Frequency</p>
                                  <p className="font-bold text-sm text-[#141414]">{concept.frequency}</p>
                                </div>
                                <div className="p-2 border border-[#141414]/10 rounded bg-white/50">
                                  <p className="opacity-50">Centrality</p>
                                  <p className="font-bold text-sm text-[#141414]">{(concept.centrality * 100).toFixed(1)}%</p>
                                </div>
                                <div className="p-2 border border-[#141414]/10 rounded bg-white/50">
                                  <p className="opacity-50">Density</p>
                                  <p className="font-bold text-sm text-[#141414]">{(concept.density * 1000).toFixed(2)}‰</p>
                                </div>
                                <div className="p-2 border border-[#141414]/10 rounded bg-white/50">
                                  <p className="opacity-50">CSS Score</p>
                                  <p className="font-bold text-sm text-[#141414]">{(concept.css).toFixed(3)}</p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  ))}

                  <div className="p-5 rounded-xl border border-[#E4E4E7] bg-white space-y-4 shadow-sm">
                    <div className="flex items-center gap-2 text-[#F59E0B]">
                      <AlertCircle size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#141414]">Preparation Balance Analysis</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-bold text-[#71717A]">Preparation Balance</span>
                        <span className="text-[10px] font-bold text-[#EF4444]">High Imbalance ({(1 - result.stats.balance).toFixed(2)})</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#F4F4F5] rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(1 - result.stats.balance) * 100}%` }}
                          className="h-full bg-[#EF4444] rounded-full"
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-[#71717A] leading-relaxed">
                      Your understanding is significantly stronger in certain areas. This may affect performance in integrated problem-solving.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-[#E4E4E7] space-y-6">
                <div className="flex items-center gap-2 text-[#141414]">
                  <FileText size={16} />
                  <h4 className="text-[11px] font-bold uppercase tracking-widest">Context-Aware Clarification</h4>
                </div>
                
                <form onSubmit={handleQuestionSubmit} className="space-y-4">
                  <p className="text-[11px] text-[#71717A]">Ask about a concept to understand how it fits into your knowledge structure...</p>
                  <textarea 
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl p-4 text-xs focus:outline-none focus:ring-1 focus:ring-[#141414] min-h-[100px] resize-none shadow-inner"
                    placeholder="Type your question here..."
                  />
                  <button 
                    type="submit" 
                    disabled={isGenerating}
                    className="w-full py-3 bg-[#141414] text-white rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-black/10"
                  >
                    {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Target size={14} />}
                    {isGenerating ? 'Generating...' : 'Submit Question'}
                  </button>
                </form>

                <AnimatePresence>
                  {qaResult && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-white border border-[#E4E4E7] rounded-xl shadow-md space-y-3"
                    >
                      <div className="text-[11px] leading-relaxed text-[#3F3F46] whitespace-pre-wrap">
                        {qaResult.answer}
                      </div>
                      {qaResult.reinforcement && (
                        <div className="flex items-center gap-2 text-[#EF4444]">
                          <AlertCircle size={12} />
                          <span className="text-[9px] font-bold uppercase tracking-widest">Reinforcement Recommended</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
