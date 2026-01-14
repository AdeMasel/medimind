
import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { FileUploader } from './components/FileUploader';
import { AnalysisView } from './components/AnalysisView';
import { MedicalChatbot } from './components/MedicalChatbot';
import { analyzeMedicalFiles, fileToBase64, processScribeSession, runWhatIfSimulation } from './services/geminiService';
import { googleDriveService } from './services/googleDriveService';
import { FileWithPreview, ProcessingState, AnalysisResult, AnalysisRecord, ChatMessage, AnalysisCheckpoint, AppModule, SimulationResult } from './types';
import { 
  Loader2, AlertCircle, Activity, History,
  Stethoscope, User, ShieldCheck, CalendarCheck, LayoutDashboard,
  Mic, MicOff, Radio, Heart, Bell, X,
  TrendingUp, Database, Trash2, DownloadCloud, UploadCloud, Save,
  BarChart3, FlaskConical, CheckCircle2, Thermometer, Droplets, Zap, Shield, FileOutput, FileInput
} from 'lucide-react';

const CHUNK_SIZE = 15;

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<AppModule>('diagnostic');
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [processingState, setProcessingState] = useState<ProcessingState>({ status: 'idle' });
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [patientName, setPatientName] = useState<string>("");
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [checkpoints, setCheckpoints] = useState<AnalysisCheckpoint[]>([]);
  const [extendedHistory, setExtendedHistory] = useState<string | undefined>(undefined);
  const [isDriveAvailable, setIsDriveAvailable] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const [isScribeRecording, setIsScribeRecording] = useState(false);
  const [isAnonymized, setIsAnonymized] = useState(false);
  const [whatIfIntervention, setWhatIfIntervention] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [totalSizeMB, setTotalSizeMB] = useState(0);

  useEffect(() => {
    const size = files.reduce((acc, f) => acc + (f.file.size / 1024 / 1024), 0);
    setTotalSizeMB(size);
  }, [files]);

  useEffect(() => {
    const initDrive = async () => {
      try {
        await googleDriveService.init();
        setIsDriveAvailable(googleDriveService.isConfigured);
      } catch (e) { console.error("Drive Error:", e); }
    };
    initDrive();
    const savedHistory = localStorage.getItem('medimind_history');
    if (savedHistory) {
      try { setHistory(JSON.parse(savedHistory)); } catch (e) { console.error(e); }
    }
  }, []);

  const saveProject = useCallback((result: AnalysisResult, names: string[], pName: string, id?: string, chat?: ChatMessage[], cPoints?: AnalysisCheckpoint[], extHistory?: string) => {
    const projectId = id || currentProjectId || Math.random().toString(36).substring(7);
    const recordCheckpoints = (cPoints || checkpoints).slice(-30);
    const newRecord: AnalysisRecord = { 
      id: projectId, timestamp: Date.now(), result, fileNames: names, patientName: pName,
      chatHistory: chat || chatMessages, checkpoints: recordCheckpoints, extendedHistory: extHistory || extendedHistory
    };
    setHistory(prev => {
      const filtered = prev.filter(r => r.id !== projectId);
      const updated = [newRecord, ...filtered].slice(0, 100);
      localStorage.setItem('medimind_history', JSON.stringify(updated));
      return updated;
    });
    if (!currentProjectId) setCurrentProjectId(projectId);
  }, [currentProjectId, chatMessages, checkpoints, extendedHistory]);

  const handleAnalyze = async () => {
    if (files.length === 0) return;
    setProcessingState({ status: 'analyzing', message: "Deep-Analysis Master Dossier in corso..." });
    try {
      let currentReport = analysisResult?.markdown;
      let allNames = history.find(r => r.id === currentProjectId)?.fileNames || [];
      let tempCheckpoints = [...checkpoints];
      let lastRes: AnalysisResult | null = null;
      
      // Get historical context for longitudinal comparison
      const patientHistoricalRecords = history.filter(r => r.patientName.toLowerCase() === patientName.toLowerCase());

      for (let i = 0; i < files.length; i += CHUNK_SIZE) {
        const chunk = files.slice(i, i + CHUNK_SIZE);
        const preparedChunk = await Promise.all(chunk.map(async (f) => ({
          file: f.file, base64: await fileToBase64(f.file), mimeType: f.file.type, category: f.category
        })));
        lastRes = await analyzeMedicalFiles(preparedChunk, currentReport, patientHistoricalRecords);
        currentReport = lastRes.markdown;
        const chunkFileNames = chunk.map(f => f.file.name);
        allNames = [...new Set([...allNames, ...chunkFileNames])];
        tempCheckpoints.push({ id: Math.random().toString(36).substring(7), timestamp: Date.now(), markdown: lastRes.markdown, filesAnalysed: chunkFileNames, isRedCode: lastRes.isRedCode });
        setCheckpoints([...tempCheckpoints]);
      }
      if (lastRes) {
        setAnalysisResult(lastRes);
        saveProject(lastRes, allNames, patientName, undefined, undefined, tempCheckpoints, extendedHistory);
      }
      setProcessingState({ status: 'complete' });
      setFiles([]); 
    } catch (error: any) { setProcessingState({ status: 'error', message: error.message }); }
  };

  const handleBackupExport = () => {
    const dataStr = JSON.stringify(history, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `MediMind_Backup_${new Date().toISOString().slice(0,10)}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleBackupImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        if (Array.isArray(importedData)) {
          setHistory(importedData);
          localStorage.setItem('medimind_history', JSON.stringify(importedData));
          alert("Archivio ripristinato con successo!");
        }
      } catch (err) { alert("Errore durante l'importazione del backup. File non valido."); }
    };
    reader.readAsText(file);
  };

  const handleResetAppData = () => {
    if (window.confirm("Cancellare definitivamente l'archivio clinico?")) {
      localStorage.removeItem('medimind_history');
      window.location.reload();
    }
  };

  const handleToggleScribe = async () => {
    if (isScribeRecording) {
      setIsScribeRecording(false);
      try {
        const scribeRes = await processScribeSession("Trascrizione sessione clinica simulata...");
        if (analysisResult) setAnalysisResult({ ...analysisResult, ...scribeRes });
      } catch (e) { console.error(e); }
    } else { setIsScribeRecording(true); }
  };

  const handleRunWhatIf = async () => {
    if (!whatIfIntervention.trim() || !analysisResult) return;
    setIsSimulating(true);
    try {
      const result = await runWhatIfSimulation(whatIfIntervention, analysisResult.markdown);
      setSimulationResult(result);
    } catch (e: any) { alert(e.message); }
    finally { setIsSimulating(false); }
  };

  return (
    <div className="min-h-screen pb-24">
      <Header />
      <div className="max-w-7xl mx-auto px-4 mt-8">
        <div className="flex flex-wrap justify-center gap-4 p-4 bg-white/60 backdrop-blur-xl rounded-[3rem] border border-white shadow-2xl">
          <ModuleButton active={activeModule === 'diagnostic'} onClick={() => setActiveModule('diagnostic')} icon={<LayoutDashboard size={20}/>} label="Diagnostica" />
          <ModuleButton active={activeModule === 'doctor'} onClick={() => setActiveModule('doctor')} icon={<Stethoscope size={20}/>} label="Medico" />
          <ModuleButton active={activeModule === 'patient'} onClick={() => setActiveModule('patient')} icon={<User size={20}/>} label="Paziente" />
          <ModuleButton active={activeModule === 'system'} onClick={() => setActiveModule('system')} icon={<ShieldCheck size={20}/>} label="Sistema" />
          <ModuleButton active={activeModule === 'prevention'} onClick={() => setActiveModule('prevention')} icon={<CalendarCheck size={20}/>} label="Prevenzione" />
          <ModuleButton active={activeModule === 'management'} onClick={() => setActiveModule('management')} icon={<Database size={20}/>} label="Gestione" />
        </div>
      </div>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {activeModule !== 'management' && activeModule !== 'system' && (
          <div className="mb-10 flex flex-col md:flex-row gap-4 items-center justify-between">
             <div className="flex items-center gap-4 bg-white p-2 rounded-full border border-slate-200 shadow-sm w-full md:w-auto">
                <div className="bg-medical-100 p-3 rounded-full text-medical-600 shadow-sm"><User size={20}/></div>
                <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Identificativo Paziente..." className="bg-transparent border-none font-bold outline-none text-slate-800 px-2 min-w-[300px]" />
             </div>
             <button onClick={() => setShowHistory(true)} className="flex items-center gap-2 btn-3d btn-3d-primary px-8 py-4 rounded-full text-[11px]"><History size={18} className="text-medical-600"/> <span>Archivio Master</span></button>
          </div>
        )}
        
        {activeModule === 'diagnostic' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-white p-2 rounded-[3rem] shadow-xl border border-slate-100">
                <FileUploader files={files} onFilesSelected={f => setFiles([...files, ...f])} onRemoveFile={id => setFiles(files.filter(f => f.id !== id))} onDriveClick={() => googleDriveService.openPicker().then(newFiles => {
                  setFiles([...files, ...newFiles.map(file => ({ file, type: file.type.startsWith('image/') ? 'image' as const : 'pdf' as const, id: Math.random().toString(36).substring(7), category: 'clinical' as const }))]);
                })} disabled={processingState.status === 'analyzing'} isDriveAvailable={isDriveAvailable} />
                <div className="px-6 pb-6">
                  <button onClick={handleAnalyze} disabled={files.length === 0 || processingState.status === 'analyzing' || !patientName.trim()} className="mt-6 btn-3d w-full btn-3d-medical p-6 rounded-3xl flex justify-center gap-4">
                    {processingState.status === 'analyzing' ? <Loader2 className="animate-spin h-6 w-6"/> : <Activity className="h-6 w-6" />}<span className="font-black uppercase tracking-widest text-sm">{processingState.status === 'analyzing' ? 'Elaborazione Master...' : 'Genera Master Dossier'}</span>
                  </button>
                  {!patientName.trim() && <p className="text-[9px] text-red-500 font-black uppercase text-center mt-2">Inserire Nome Paziente per l'analisi</p>}
                </div>
              </div>
            </div>
            <div className="lg:col-span-8">
              {analysisResult ? <AnalysisView result={analysisResult} fileNames={[]} patientName={patientName} projectId={currentProjectId || ""} checkpoints={checkpoints} onExtendedHistoryGenerated={setExtendedHistory} extendedHistory={extendedHistory} /> : <div className="h-full min-h-[500px] border-4 border-dashed border-slate-200 rounded-[4rem] bg-slate-50/30 flex items-center justify-center p-16 text-center animate-pulse"><LayoutDashboard size={80} className="text-slate-200" /></div>}
            </div>
          </div>
        )}

        {activeModule === 'doctor' && (
          <div className="space-y-10 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="bg-white p-12 rounded-[4rem] shadow-2xl border-b-8 border-medical-600 transition-all hover:shadow-medical-100/50">
                <div className="flex justify-between items-start mb-8">
                  <div><h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Scribe AI Pro</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trascrizione e Anamnesi Dinamica</p></div>
                  <button onClick={handleToggleScribe} className={`p-8 rounded-[2rem] shadow-2xl transition-all ${isScribeRecording ? 'bg-red-500 animate-pulse text-white shadow-red-200' : 'bg-medical-50 text-medical-600 hover:bg-medical-100'}`}>{isScribeRecording ? <MicOff size={40}/> : <Mic size={40}/>}</button>
                </div>
                {analysisResult?.scribe && <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-inner"><p className="text-md font-medium text-slate-700 italic">"{analysisResult.scribe.anamnesis}"</p></div>}
              </div>
              <div className="bg-white p-12 rounded-[4rem] shadow-2xl border-b-8 border-red-600 transition-all hover:shadow-red-100/50">
                <h3 className="text-3xl font-black uppercase tracking-tighter text-red-900 flex items-center gap-4 mb-8"><AlertCircle className="text-red-600" size={32}/> Farmacovigilanza Attiva</h3>
                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                  {Array.isArray(analysisResult?.drugInteractions) && analysisResult.drugInteractions.length > 0 ? analysisResult.drugInteractions.map((int, i) => (
                    <div key={i} className={`p-6 rounded-[2rem] border-l-8 transition-all hover:scale-[1.02] ${int.severity === 'high' ? 'bg-red-50 border-red-500' : 'bg-amber-50 border-amber-500'}`}>
                      <p className="text-[11px] font-black uppercase text-slate-900 mb-1">{int.drugA} + {int.drugB}</p>
                      <p className="text-[12px] font-bold text-slate-700 mt-3">{int.description}</p>
                    </div>
                  )) : <div className="text-center py-24 opacity-20"><ShieldCheck size={60} className="mx-auto" /></div>}
                </div>
              </div>
            </div>
            <div className="bg-slate-900 text-white p-16 rounded-[5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] border-4 border-slate-800 relative overflow-hidden group">
               <h3 className="text-4xl font-black uppercase tracking-tighter flex items-center gap-6 relative z-10 mb-12"><Radio className="text-medical-400 animate-pulse h-10 w-10" /> Simulazione Proiettiva "What-If"</h3>
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 relative z-10">
                  <div className="space-y-10 bg-white/5 p-10 rounded-[3rem] border border-white/10 backdrop-blur-md">
                    <input type="text" value={whatIfIntervention} onChange={(e) => setWhatIfIntervention(e.target.value)} placeholder="Terapia da simulare..." className="w-full bg-black/40 border border-white/10 p-6 rounded-2xl text-white outline-none focus:ring-2 focus:ring-medical-500 font-bold" />
                    <button onClick={handleRunWhatIf} disabled={isSimulating || !whatIfIntervention.trim() || !analysisResult} className="w-full btn-3d btn-3d-medical p-6 rounded-3xl flex items-center justify-center gap-4">
                      {isSimulating ? <Loader2 className="animate-spin" /> : <TrendingUp size={24}/>}<span className="font-black uppercase tracking-widest text-sm">Simulazione In-Silico</span>
                    </button>
                  </div>
                  <div className="lg:col-span-2 bg-black/60 p-12 rounded-[4rem] border-2 border-slate-800 min-h-[400px]">
                    {simulationResult ? (
                      <div className="animate-fade-in space-y-10">
                         <h4 className="text-2xl font-black uppercase text-medical-400">{simulationResult.treatmentName}</h4>
                         <div className="grid grid-cols-3 gap-10">
                           <div className="text-center"><p className="text-[9px] font-black text-slate-500 uppercase">Efficacia</p><p className="text-4xl font-black text-emerald-400">{simulationResult.efficacyRate}%</p></div>
                           <div className="text-center"><p className="text-[9px] font-black text-slate-500 uppercase">Confidenza</p><p className="text-4xl font-black text-indigo-400">{simulationResult.confidenceRate}%</p></div>
                           <div className="text-center"><p className="text-[9px] font-black text-slate-500 uppercase">Effetti Coll.</p><p className="text-4xl font-black text-red-400">{simulationResult.sideEffectRisk}%</p></div>
                         </div>
                         <div className="bg-white/5 p-8 rounded-[2.5rem] italic text-slate-200 text-lg leading-relaxed">"{simulationResult.predictedOutcome}"</div>
                      </div>
                    ) : <div className="flex h-full items-center justify-center opacity-10"><TrendingUp size={120} /></div>}
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeModule === 'management' && (
          <div className="max-w-4xl mx-auto space-y-12 animate-fade-in">
             <div className="bg-white p-16 rounded-[5rem] shadow-2xl border-4 border-slate-100 text-center">
                <Database size={60} className="mx-auto mb-8 text-medical-600" />
                <h3 className="text-4xl font-black uppercase tracking-tighter mb-8 text-slate-900">Backup & Gestione Archivio</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                   <div className="p-8 bg-slate-50 rounded-[3rem] border border-slate-200">
                      <FileOutput size={40} className="mx-auto mb-4 text-indigo-600" />
                      <p className="text-xs font-black uppercase text-slate-400 mb-6">Esporta Archivio Completo</p>
                      <button onClick={handleBackupExport} className="w-full btn-3d btn-3d-primary py-4 rounded-2xl">Download Backup JSON</button>
                   </div>
                   <div className="p-8 bg-slate-50 rounded-[3rem] border border-slate-200">
                      <FileInput size={40} className="mx-auto mb-4 text-emerald-600" />
                      <p className="text-xs font-black uppercase text-slate-400 mb-6">Ripristina Archivio</p>
                      <label className="block w-full btn-3d btn-3d-primary py-4 rounded-2xl cursor-pointer">
                         <span>Carica Backup JSON</span>
                         <input type="file" accept=".json" onChange={handleBackupImport} className="hidden" />
                      </label>
                   </div>
                </div>
                <div className="pt-8 border-t border-slate-100">
                   <button onClick={handleResetAppData} className="flex items-center gap-3 mx-auto text-red-600 font-black uppercase text-xs hover:bg-red-50 p-4 rounded-2xl transition-all">
                      <Trash2 size={20}/> Cancella Archivio Locale
                   </button>
                </div>
             </div>
          </div>
        )}

        {activeModule === 'system' && (
          <div className="max-w-4xl mx-auto space-y-10 animate-fade-in">
            <div className="bg-white p-12 rounded-[4rem] shadow-2xl border-t-8 border-slate-900">
              <div className="flex items-center gap-6 mb-12">
                <div className="bg-slate-900 p-5 rounded-3xl text-white shadow-xl"><ShieldCheck size={40}/></div>
                <div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900 leading-none">Status MediMind Node</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Diagnostica Core & Crittografia</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <SystemStat icon={<Zap size={24}/>} label="AI Diagnostic Engine" value="Gemini 3 Pro (Preview)" status="Operational" color="emerald" />
                <SystemStat icon={<Shield size={24}/>} label="Crittografia Dati" value="AES-256 E2E" status="Secure" color="blue" />
                <SystemStat icon={<Database size={24}/>} label="Database Clinico" value="Persistent Local" status="Active" color="indigo" />
                <SystemStat icon={<Activity size={24}/>} label="Grounding Pipeline" value="PubMed + Web" status="Active" color="emerald" />
              </div>
            </div>
          </div>
        )}

        {activeModule === 'prevention' && (
          <div className="max-w-7xl mx-auto space-y-12 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-7 h-full">
                <div className="bg-white p-12 rounded-[4rem] shadow-2xl border-t-8 border-medical-500 flex flex-col h-full">
                  <h3 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-4 mb-12"><Bell className="text-medical-600 animate-bounce" size={40}/> Smart Follow-up NotebookLM</h3>
                  <div className="space-y-6 flex-1">
                    {Array.isArray(analysisResult?.screeningAlerts) && analysisResult.screeningAlerts.length > 0 ? analysisResult.screeningAlerts.map((alert, i) => (
                      <div key={i} className={`p-8 rounded-[2.5rem] border-2 flex justify-between items-center transition-all hover:scale-[1.02] shadow-sm ${alert.urgency === 'urgent' ? 'bg-red-50 border-red-100' : 'bg-medical-50 border-medical-100'}`}>
                        <div>
                          <p className="text-xl font-black uppercase text-slate-800 tracking-tight">{alert.title}</p>
                          <p className="text-[12px] font-bold text-slate-500 mt-2 leading-relaxed">{alert.reason}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-medical-600 mb-1">{alert.dueDate}</p>
                        </div>
                      </div>
                    )) : <div className="text-center py-32 opacity-20 font-black uppercase text-xs tracking-widest flex flex-col items-center gap-6"><CalendarCheck size={80}/><p>Nessun alert pianificato</p></div>}
                  </div>
                </div>
              </div>
              <div className="lg:col-span-5 h-full">
                <div className="bg-slate-900 text-white p-12 rounded-[4rem] shadow-2xl flex flex-col h-full border-4 border-slate-800">
                  <h3 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-4 mb-12"><Heart className="text-red-500 animate-pulse" size={40}/> Vitals Real-time Sync</h3>
                  <div className="space-y-5 flex-1">
                    <VitalsCard icon={<Activity size={28}/>} label="Frequenza Cardiaca" value={analysisResult?.vitals?.bpm ? `${analysisResult.vitals.bpm} BPM` : '--'} color="red" />
                    <VitalsCard icon={<Droplets size={28}/>} label="Pressione Arteriosa" value={analysisResult?.vitals?.pressure || '--'} color="medical" />
                    <VitalsCard icon={<Thermometer size={28}/>} label="Temperatura Corporea" value={analysisResult?.vitals?.temp ? `${analysisResult.vitals.temp} °C` : '--'} color="amber" />
                    <VitalsCard icon={<Activity size={28}/>} label="Saturazione SpO2" value={analysisResult?.vitals?.oxygen ? `${analysisResult.vitals.oxygen} %` : '--'} color="emerald" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeModule === 'patient' && (
          <div className="max-w-5xl mx-auto animate-fade-in space-y-12">
             <div className="bg-emerald-50 rounded-[4rem] p-12 border-4 border-emerald-100 shadow-3xl">
                <div className="flex items-center gap-6 mb-12">
                   <div className="bg-emerald-600 p-6 rounded-[2rem] text-white text-5xl shadow-xl shadow-emerald-200">🤖</div>
                   <div>
                      <h2 className="text-4xl font-black text-emerald-900 uppercase tracking-tighter leading-none mb-2">Assistente AI</h2>
                      <p className="text-md font-bold text-emerald-700 uppercase tracking-widest">Linguaggio semplice e rassicurante</p>
                   </div>
                </div>
                <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-emerald-200 prose prose-emerald max-w-none text-lg text-justify leading-relaxed">
                   {analysisResult?.plainLanguageMarkdown ? (
                     <AnalysisView result={{...analysisResult, markdown: analysisResult.plainLanguageMarkdown}} fileNames={[]} patientName={patientName} projectId="" checkpoints={[]} extendedHistory="" onExtendedHistoryGenerated={() => {}} />
                   ) : <div className="text-center py-24 opacity-20"><User size={80} className="mx-auto" /></div>}
                </div>
             </div>
          </div>
        )}
      </main>

      <MedicalChatbot contextReport={analysisResult} messages={chatMessages} setMessages={setChatMessages}/>
      {showHistory && <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xl" onClick={() => setShowHistory(false)}></div>
          <div className="relative w-full max-w-md h-full bg-white shadow-2xl p-12 overflow-y-auto animate-slide-in-right">
            <div className="flex justify-between items-center mb-16">
              <h2 className="text-3xl font-black uppercase tracking-tighter">Archivio Master</h2>
              <button onClick={() => setShowHistory(false)} className="p-4 hover:bg-slate-100 rounded-full"><X size={32} /></button>
            </div>
            <div className="space-y-8">
              {history.length > 0 ? history.map(record => (
                <div key={record.id} onClick={() => { setAnalysisResult(record.result); setPatientName(record.patientName); setCurrentProjectId(record.id); setChatMessages(record.chatHistory || []); setCheckpoints(record.checkpoints || []); setExtendedHistory(record.extendedHistory); setShowHistory(false); }} className="p-8 rounded-[3rem] border border-slate-100 bg-slate-50 cursor-pointer hover:border-medical-500 hover:bg-white transition-all group">
                  <p className="text-lg font-black uppercase text-slate-800 mb-2 truncate">{record.patientName || 'Anonimo'}</p>
                  <p className="text-[11px] text-slate-400 font-bold uppercase">{new Date(record.timestamp).toLocaleString('it-IT')}</p>
                </div>
              )) : <div className="text-center py-32 opacity-20"><History size={60} className="mx-auto mb-4"/></div>}
            </div>
          </div>
        </div>}
    </div>
  );
};

interface VitalsCardProps { icon: React.ReactNode; label: string; value: string; color: 'red' | 'medical' | 'amber' | 'emerald'; }
const VitalsCard: React.FC<VitalsCardProps> = ({ icon, label, value, color }) => {
  const colorClasses = { red: 'bg-red-500/20 text-red-500', medical: 'bg-medical-500/20 text-medical-500', amber: 'bg-amber-500/20 text-amber-500', emerald: 'bg-emerald-500/20 text-emerald-500' };
  return ( 
    <div className="p-7 bg-white/5 rounded-[2rem] border border-white/10 flex items-center justify-between group hover:bg-white/10 transition-all shadow-sm">
      <div className="flex items-center gap-5">
        <div className={`p-4 rounded-2xl border ${colorClasses[color]} shadow-lg transition-transform group-hover:scale-110`}>{icon}</div>
        <span className="text-[12px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">{label}</span>
      </div>
      <span className="text-2xl font-black text-white group-hover:scale-105 transition-transform">{value}</span>
    </div> 
  );
};

interface SystemStatProps { icon: React.ReactNode; label: string; value: string; status: string; color: 'emerald' | 'blue' | 'indigo'; }
const SystemStat: React.FC<SystemStatProps> = ({ icon, label, value, status, color }) => {
  const colorMap = { emerald: 'text-emerald-500 bg-emerald-50', blue: 'text-blue-500 bg-blue-50', indigo: 'text-indigo-500 bg-indigo-50' };
  return (
    <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl hover:shadow-lg transition-all">
      <div className="flex items-center gap-4 mb-4">
        <div className={`p-3 rounded-2xl ${colorMap[color]}`}>{icon}</div>
        <div><p className="text-[9px] font-black uppercase text-slate-400">{label}</p><p className="text-md font-black text-slate-800 mt-1">{value}</p></div>
      </div>
      <div className="flex items-center gap-2"><div className={`h-1.5 w-1.5 rounded-full animate-pulse ${color === 'emerald' ? 'bg-emerald-500' : 'bg-blue-500'}`} /><span className="text-[9px] font-black uppercase text-slate-500">{status}</span></div>
    </div>
  );
};

interface ModuleButtonProps { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; }
const ModuleButton: React.FC<ModuleButtonProps> = ({ active, onClick, icon, label }) => ( 
  <button onClick={onClick} className={`flex items-center gap-4 px-10 py-5 rounded-full text-[12px] font-black uppercase transition-all shadow-lg hover:scale-105 active:scale-95 ${active ? 'bg-medical-600 text-white shadow-medical-200' : 'bg-white text-slate-500 hover:text-medical-600'}`}>
    {icon} <span className="tracking-[0.2em]">{label}</span>
  </button> 
);

export default App;
