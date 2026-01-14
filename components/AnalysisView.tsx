
import React, { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Activity, 
  FileDown, 
  Loader2,
  History,
  Box,
  UserCheck,
  Share2,
  Stethoscope,
  Target,
  FileText,
  Sparkles,
  Scissors,
  Image as ImageIcon,
  Heart,
  AlertCircle,
  Search,
  Globe,
  BookOpen,
  Hospital,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertTriangle,
  Pill
} from 'lucide-react';
import { AnalysisResult, AnalysisCheckpoint, ChatMessage, LongitudinalPoint } from '../types';
import { generateShortSummary, performDeepResearch } from '../services/geminiService';

interface AnalysisViewProps {
  result: AnalysisResult;
  fileNames: string[];
  patientName: string;
  projectId: string;
  chatHistory?: ChatMessage[];
  checkpoints: AnalysisCheckpoint[];
  extendedHistory?: string;
  onExtendedHistoryGenerated: (text: string) => void;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ 
  result, 
  patientName, 
  projectId, 
  checkpoints,
  extendedHistory,
  onExtendedHistoryGenerated
}) => {
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [researchData, setResearchData] = useState<string | null>(result.deepResearchMarkdown || null);
  const [activeTab, setActiveTab] = useState<'report' | 'summary' | 'research' | 'decision' | 'patient' | 'images' | 'comparison'>('report');
  
  const handleGenerateShortSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const summary = await generateShortSummary(result.markdown);
      onExtendedHistoryGenerated(summary);
      setActiveTab('summary');
    } catch (error: any) { alert(`Errore: ${error.message}`); }
    finally { setIsGeneratingSummary(false); }
  };

  const handleDeepResearch = async () => {
    setIsResearching(true);
    setActiveTab('research');
    try {
      const research = await performDeepResearch(result.markdown);
      setResearchData(research);
    } catch (error: any) { alert(`Errore Ricerca: ${error.message}`); }
    finally { setIsResearching(false); }
  };

  const exportProfessionalPDF = (title: string, contentId: string) => {
    const contentElement = document.getElementById(contentId);
    if (!contentElement) {
      alert("Errore tecnico: Sorgente dati non trovata.");
      return;
    }

    const element = document.createElement('div');
    element.className = 'pdf-master-wrapper';
    
    const pdfStyles = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        
        .pdf-master-wrapper {
          width: 170mm; 
          background: white;
          color: #1e293b;
          font-family: 'Inter', sans-serif;
          margin: 0;
          padding: 0;
          line-height: 1.65;
        }

        h1 {
          font-size: 20px;
          font-weight: 900;
          text-align: center;
          color: #0f172a;
          margin-bottom: 25px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e2e8f0;
          text-transform: uppercase;
          page-break-after: avoid;
        }

        h2 {
          font-size: 14px;
          font-weight: 900;
          color: #c5b38a;
          margin: 35px 0 15px 0;
          border-left: 5px solid #c5b38a;
          padding-left: 12px;
          page-break-after: avoid;
          display: block;
        }

        p, li {
          font-size: 11px;
          line-height: 1.7;
          text-align: justify;
          margin-bottom: 12px;
          color: #334155;
          page-break-inside: avoid;
          display: block;
          position: relative;
        }

        .card-pdf {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          page-break-inside: avoid;
          display: block;
        }

        ul, ol { 
          padding-left: 20px; 
          margin-bottom: 15px; 
          page-break-inside: auto; 
        }

        strong { font-weight: 700; color: #0f172a; }

        .pdf-content-body { width: 100%; box-sizing: border-box; }
      </style>
      
      <div class="pdf-content-body">
        <h1>${title}</h1>
        <div class="markdown-source">
          ${contentElement.innerHTML}
        </div>
      </div>
    `;

    element.innerHTML = pdfStyles;

    const opt = {
      margin: [42, 20, 25, 20], 
      filename: `MediMind_${title.replace(/\s+/g, '_')}_${patientName || 'Dossier'}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true,
        scrollY: 0,
        logging: false,
        width: 650 
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { 
        mode: ['css', 'legacy'],
        avoid: ['p', 'h2', 'li', '.card-pdf']
      }
    };

    // @ts-ignore
    window.html2pdf().from(element).set(opt).toPdf().get('pdf').then((pdf) => {
      const totalPages = pdf.internal.getNumberOfPages();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        
        pdf.setDrawColor(197, 179, 138); 
        pdf.setFillColor(197, 179, 138);
        pdf.rect(23, 13, 4, 10, 'F'); 
        pdf.rect(20, 16, 10, 4, 'F'); 

        pdf.setTextColor(197, 179, 138);
        pdf.setFontSize(18);
        pdf.setFont("helvetica", "bold");
        pdf.text('MediMind', 36, 18);

        pdf.setTextColor(197, 179, 138);
        pdf.setFontSize(11);
        pdf.setFont("times", "italic");
        pdf.text('by Antonio de Masellis', 70, 18);

        pdf.setTextColor(197, 179, 138);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.text('DIAGNOSTIC INTELLIGENCE', 36, 22.5);

        pdf.setLineWidth(0.5);
        pdf.line(20, 30, pageWidth - 20, 30);

        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.2);
        pdf.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15);

        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184); 
        pdf.setFont("helvetica", "normal");
        
        pdf.text(`Paziente: ${patientName || 'Riservato'}`, 20, pageHeight - 10);
        
        const dateStr = new Date().toLocaleDateString('it-IT');
        pdf.text(`${dateStr} | Pagina ${i} di ${totalPages}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
      }
    }).save();
  };

  const StatusIcon = ({ status }: { status: LongitudinalPoint['status'] }) => {
    switch (status) {
      case 'improved': return <ArrowUpRight className="text-emerald-500" size={16} />;
      case 'worsened': return <ArrowDownRight className="text-red-500" size={16} />;
      case 'stable': return <Minus className="text-blue-500" size={16} />;
      case 'new': return <Sparkles className="text-amber-500" size={16} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-wrap p-2 bg-slate-200/50 rounded-[2.5rem] w-full justify-center gap-2 border border-slate-200 sticky top-24 z-40 backdrop-blur-md shadow-sm">
        <button onClick={() => setActiveTab('report')} className={`flex items-center gap-2 px-6 py-3 rounded-3xl text-[10px] font-black uppercase transition-all ${activeTab === 'report' ? 'bg-white shadow-lg text-medical-600' : 'text-slate-500 hover:text-slate-700'}`}>
          <FileText size={16} /> <span>Referto Master</span>
        </button>
        <button onClick={() => setActiveTab('comparison')} className={`flex items-center gap-2 px-6 py-3 rounded-3xl text-[10px] font-black uppercase transition-all ${activeTab === 'comparison' ? 'bg-indigo-600 shadow-lg text-white' : 'text-slate-500 hover:text-slate-700'}`}>
          <Clock size={16} /> <span>Timeline Comparativa</span>
        </button>
        <button onClick={() => setActiveTab('decision')} className={`flex items-center gap-2 px-6 py-3 rounded-3xl text-[10px] font-black uppercase transition-all ${activeTab === 'decision' ? 'bg-medical-600 shadow-lg text-white' : 'text-slate-500 hover:text-slate-700'}`}>
          <Stethoscope size={16} /> <span>Decision Support</span>
        </button>
        <button onClick={() => setActiveTab('images')} className={`flex items-center gap-2 px-6 py-3 rounded-3xl text-[10px] font-black uppercase transition-all ${activeTab === 'images' ? 'bg-blue-600 shadow-lg text-white' : 'text-slate-500 hover:text-slate-700'}`}>
          <ImageIcon size={16} /> <span>Indice Strumentale</span>
        </button>
        <button onClick={() => setActiveTab('research')} className={`flex items-center gap-2 px-6 py-3 rounded-3xl text-[10px] font-black uppercase transition-all ${activeTab === 'research' ? 'bg-slate-900 shadow-lg text-white' : 'text-slate-500 hover:text-slate-700'}`}>
          <Globe size={16} /> <span>Deep Research EBM</span>
        </button>
        <button onClick={() => setActiveTab('patient')} className={`flex items-center gap-2 px-6 py-3 rounded-3xl text-[10px] font-black uppercase transition-all ${activeTab === 'patient' ? 'bg-emerald-600 shadow-lg text-white' : 'text-slate-500 hover:text-slate-700'}`}>
          <UserCheck size={16} /> <span>Portale Paziente</span>
        </button>
      </div>

      {activeTab === 'report' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-blue-50 p-3 rounded-2xl text-blue-600"><Activity size={24} /></div>
              <div><h4 className="text-sm font-black uppercase text-slate-800">Dossier Clinico Master</h4><p className="text-[10px] text-slate-400 font-bold uppercase">Esportazione PDF Professionale</p></div>
            </div>
            <button onClick={() => exportProfessionalPDF("Dossier Clinico Master", "markdown-main-content")} className="btn-3d px-5 py-3 rounded-2xl flex items-center gap-2 bg-slate-900 text-white"><FileDown size={18} /> <span className="text-[11px]">Esporta Dossier</span></button>
          </div>
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
            <div id="markdown-main-content" className="p-12 lg:p-20 markdown-body prose prose-slate max-w-none text-justify"><ReactMarkdown>{result.markdown}</ReactMarkdown></div>
          </div>
        </div>
      )}

      {activeTab === 'comparison' && (
        <div className="space-y-8 animate-fade-in">
          <div className="bg-white rounded-[3rem] p-12 border border-slate-200 shadow-2xl overflow-hidden relative">
            <div className="flex items-center justify-between mb-12">
               <div className="flex items-center gap-6">
                 <div className="bg-indigo-50 p-5 rounded-3xl text-indigo-600 shadow-inner"><Clock size={32} /></div>
                 <div>
                   <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Timeline Evolutiva</h2>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Analisi Comparativa Delta Longitudinale</p>
                 </div>
               </div>
               <button onClick={() => exportProfessionalPDF("Analisi Longitudinale Comparativa", "comparison-content")} className="btn-3d px-6 py-3 rounded-2xl bg-indigo-600 text-white flex items-center gap-2"><FileDown size={16}/> <span>PDF Evoluzione</span></button>
            </div>

            <div id="comparison-content" className="relative pl-10 border-l-4 border-slate-100 space-y-12 py-4">
              {Array.isArray(result.longitudinalComparison) && result.longitudinalComparison.length > 0 ? result.longitudinalComparison.map((point, i) => (
                <div key={i} className="relative group">
                  <div className={`absolute -left-[54px] top-0 w-10 h-10 rounded-full border-4 border-white shadow-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                    point.status === 'worsened' ? 'bg-red-500' : point.status === 'improved' ? 'bg-emerald-500' : point.status === 'new' ? 'bg-amber-500' : 'bg-blue-500'
                  }`}>
                    <StatusIcon status={point.status} />
                  </div>
                  
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 group-hover:bg-white transition-all group-hover:shadow-xl group-hover:border-indigo-100">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                      <div>
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{point.date}</span>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mt-1">{point.parameter}</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Delta Clinico</span>
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${
                          point.status === 'worsened' ? 'bg-red-100 text-red-600' : point.status === 'improved' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'
                        }`}>
                          {point.delta || point.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6 pt-6 border-t border-slate-200/50">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Valore Attuale</p>
                        <p className="text-lg font-bold text-slate-800">{point.value}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Valore Precedente</p>
                        <p className="text-lg font-bold text-slate-500">{point.previousValue || 'N/D'}</p>
                      </div>
                    </div>

                    <div className="mt-6 bg-white p-4 rounded-2xl border border-slate-100 italic text-sm text-slate-600">
                      "{point.note}"
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-24 opacity-20">
                  <History size={80} className="mx-auto mb-4" />
                  <p className="font-black uppercase text-xs tracking-widest">Dati comparativi insufficienti.</p>
                  <p className="text-[10px] mt-2">Aggiungi nuovi referti per questo paziente per attivare la timeline.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'decision' && (
        <div className="space-y-8 animate-fade-in">
          <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-2xl">
             <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4"><Target size={32} className="text-medical-600" /><h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Decision Support & CDSS</h2></div>
                <button onClick={() => exportProfessionalPDF("Supporto Decisionale e Farmacovigilanza", "cdss-content")} className="btn-3d px-6 py-3 rounded-2xl bg-medical-600 text-white flex items-center gap-2"><FileDown size={16}/> <span>PDF CDSS</span></button>
             </div>
             <div id="cdss-content" className="space-y-12">
                {/* Suggerimenti Clinici */}
                <section>
                   <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                     <Stethoscope className="text-medical-600" size={20} /> Percorsi Diagnostico-Terapeutici
                   </h3>
                   <div className="space-y-6">
                      {Array.isArray(result.cdssSuggestions) && result.cdssSuggestions.length > 0 ? result.cdssSuggestions.map((sug, i) => (
                        <div key={i} className="card-pdf p-8 bg-slate-50 border border-slate-200 rounded-2xl">
                          <div className="flex gap-6 items-start">
                            <div className="flex-shrink-0 w-12 h-12 bg-white border-2 border-medical-500 rounded-xl flex items-center justify-center text-xl font-black text-medical-600 shadow-sm">{sug.evidenceLevel}</div>
                            <div>
                              <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">{sug.path}</h4>
                              <p className="text-sm text-slate-600 leading-relaxed mb-4">{sug.rationale}</p>
                              {sug.contraindications && sug.contraindications.length > 0 && (
                                <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100">
                                   <p className="text-[10px] font-black text-red-600 uppercase mb-2">Controindicazioni/Rischi:</p>
                                   <ul className="list-disc pl-4 text-xs text-red-700">
                                      {sug.contraindications.map((c, idx) => <li key={idx}>{c}</li>)}
                                   </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )) : <div className="text-center py-10 opacity-30 italic text-sm">Protocolli non generati.</div>}
                   </div>
                </section>

                {/* Interazioni Farmacologiche Dettagliate */}
                <section className="pt-10 border-t border-slate-100">
                   <h3 className="text-lg font-black text-red-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                     <Pill className="text-red-600" size={20} /> Analisi Interazioni Farmacologiche
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {Array.isArray(result.drugInteractions) && result.drugInteractions.length > 0 ? result.drugInteractions.map((int, i) => (
                        <div key={i} className={`p-6 rounded-[2rem] border-l-8 transition-all hover:scale-[1.02] shadow-sm ${int.severity === 'high' ? 'bg-red-50 border-red-500' : 'bg-amber-50 border-amber-500'}`}>
                           <div className="flex items-center justify-between mb-4">
                              <span className="text-[10px] font-black uppercase text-slate-900">{int.drugA} + {int.drugB}</span>
                              <AlertTriangle size={16} className={int.severity === 'high' ? 'text-red-600' : 'text-amber-600'} />
                           </div>
                           <p className="text-[12px] font-bold text-slate-700 leading-relaxed italic">"{int.description}"</p>
                        </div>
                      )) : (
                        <div className="col-span-2 text-center py-20 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200 opacity-40">
                          <p className="text-xs font-black uppercase">Nessuna interazione critica rilevata tra i farmaci citati.</p>
                        </div>
                      )}
                   </div>
                </section>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'research' && (
        <div className="space-y-8 animate-fade-in">
           <div className="bg-indigo-900 text-white p-12 rounded-[4rem] shadow-2xl relative overflow-hidden">
             <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-6">
                   <div className="bg-white/10 p-5 rounded-3xl backdrop-blur-md border border-white/20"><Globe className="h-10 w-10 text-indigo-400" /></div>
                   <div><h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-2">Deep Research Online</h2><p className="text-sm font-bold text-indigo-300 uppercase">Analisi Scientifica EBM</p></div>
                </div>
                <button onClick={() => exportProfessionalPDF("Deep Research EBM & Papers", "research-content")} className="btn-3d px-6 py-3 rounded-2xl bg-white/10 text-white flex items-center gap-2"><FileDown size={16}/> <span>PDF Ricerca</span></button>
             </div>
             {!researchData && !isResearching ? (
               <div className="bg-white/5 border border-white/10 p-12 rounded-[3rem] text-center"><button onClick={handleDeepResearch} className="btn-3d px-10 py-5 rounded-3xl bg-white text-indigo-900">Avvia Analisi Scientifica</button></div>
             ) : isResearching ? (
               <div className="flex flex-col items-center justify-center py-32 space-y-6"><Loader2 className="h-16 w-16 animate-spin text-indigo-400" /><p className="text-xl font-black uppercase animate-pulse">Consultazione Scientific Repositories...</p></div>
             ) : (
               <div id="research-content" className="bg-white rounded-[3rem] p-12 text-slate-800 shadow-inner"><div className="markdown-body prose prose-indigo max-w-none text-justify leading-relaxed"><ReactMarkdown>{researchData || ""}</ReactMarkdown></div></div>
             )}
           </div>
        </div>
      )}

      {activeTab === 'images' && (
        <div className="space-y-8 animate-fade-in">
          <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4"><ImageIcon size={32} className="text-blue-600" /><h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Indice Strumentale</h2></div>
                <button onClick={() => exportProfessionalPDF("Analisi Reperti Strumentali", "images-content")} className="btn-3d px-6 py-3 rounded-2xl bg-blue-600 text-white flex items-center gap-2"><FileDown size={16}/> <span>PDF Indice</span></button>
             </div>
             <div id="images-content" className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {Array.isArray(result.instrumentalImages) && result.instrumentalImages.length > 0 ? result.instrumentalImages.map((img, i) => (
                 <div key={i} className="card-pdf p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                   <p className="text-[9px] font-black text-blue-600 uppercase mb-2">{img.category}</p>
                   <h3 className="text-md font-black text-slate-900 uppercase mb-3">{img.title}</h3>
                   <p className="text-[10px] text-slate-600 italic border-l-2 border-slate-200 pl-3 leading-relaxed">{img.findings}</p>
                 </div>
               )) : <div className="col-span-2 text-center py-24 opacity-30 italic">Nessun reperto strumentale catalogato.</div>}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'patient' && (
        <div className="space-y-10 animate-fade-in">
          <div className="bg-emerald-50 rounded-[4rem] p-12 border-4 border-emerald-100 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-6"><div className="bg-emerald-600 p-6 rounded-3xl text-white text-4xl shadow-lg">🤖</div><div><h2 className="text-3xl font-black text-emerald-900 uppercase tracking-tighter">Assistente AI Paziente</h2><p className="text-sm font-bold text-emerald-700 uppercase tracking-widest">Informazioni Chiare</p></div></div>
              <button onClick={() => exportProfessionalPDF("Informativa per il Paziente", "patient-content")} className="btn-3d px-6 py-3 rounded-2xl bg-emerald-600 text-white flex items-center gap-2"><FileDown size={16}/> <span>PDF Informativa</span></button>
            </div>
            <div id="patient-content" className="bg-white p-12 rounded-[3rem] shadow-xl border border-emerald-200 prose prose-emerald max-w-none text-justify">
              {result.plainLanguageMarkdown ? <ReactMarkdown>{result.plainLanguageMarkdown}</ReactMarkdown> : <p className="text-center py-24 italic opacity-30">Preparazione della guida informativa...</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
