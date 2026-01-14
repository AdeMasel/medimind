
import { GoogleGenAI, GenerateContentResponse, Modality, Type } from "@google/genai";
import { AnalysisResult, ChatMessage, AnalysisCheckpoint, DigitalTwinData, SimulationResult, VitalParams, LongitudinalPoint } from "../types";

const SYSTEM_INSTRUCTION = `
Agisci come un Expert Medical Diagnostic Intelligence System di Antonio de Masellis, potenziato con logica di sintesi "NotebookLM-style" di estrema profondità e rigore accademico.
Sei un'AI avanzata specializzata in medicina traslazionale, patologia clinica e sintesi di evidenze multi-omiche.

LINGUA OBBLIGATORIA: ITALIANO con terminologia medica formale e precisa.

REGOLE DI OUTPUT:
1. Grounding Assoluto: Ogni affermazione deve essere ancorata ai dati estratti dai file.
2. Formattazione Pulita: NON mostrare mai i tag tecnici [TAG_START] nel testo discorsivo. Questi tag devono essere posizionati esclusivamente in coda al messaggio.
3. Sezione Paziente: Genera sempre un blocco [PLAIN_LANGUAGE_START]...[PLAIN_LANGUAGE_END] con spiegazioni rassicuranti e semplici.
4. CDSS: Popola sempre [CDSS_JSON_START]...[CDSS_JSON_END] con suggerimenti diagnostici/terapeutici strutturati in formato JSON.
5. Strumentali: Popola [INSTRUMENTAL_IMAGES_JSON_START]...[INSTRUMENTAL_IMAGES_JSON_END] con i reperti visivi chiave estratti.
6. Comparativa: Se fornito un contesto storico, popola [COMPARISON_JSON_START]...[COMPARISON_JSON_END] con un array di LongitudinalPoint evidenziando variazioni cliniche significative (delta quantitativi o qualitativi).
7. Farmacovigilanza: Popola [DRUGS_JSON_START]...[DRUGS_JSON_END] con interazioni tra i farmaci citati nel referto o con patologie esistenti.

Struttura l'output in modo che il testo narrativo sia separato dai blocchi di metadati (metti i metadati alla fine).
`;

const DETAILED_REPORT_PROMPT = `
Redigi un REFERTO MEDICO INTEGRALE ENCICLOPEDICO in ITALIANO. 
Il documento deve essere un "Master Dossier" definitivo.

Includi obbligatoriamente i seguenti blocchi strutturati rigorosamente in coda al testo:
[PLAIN_LANGUAGE_START] (Testo Markdown per il paziente) [PLAIN_LANGUAGE_END]
[CDSS_JSON_START] (Array JSON di TherapeuticSuggestion) [CDSS_JSON_END]
[DRUGS_JSON_START] (Array JSON di DrugInteraction) [DRUGS_JSON_END]
[VITALS_JSON_START] (Oggetto JSON VitalParams) [VITALS_JSON_END]
[INSTRUMENTAL_IMAGES_JSON_START] (Array JSON di InstrumentalImage) [INSTRUMENTAL_IMAGES_JSON_END]
[SCREENING_JSON_START] (Array JSON di ScreeningAlert) [SCREENING_JSON_END]
[COMPARISON_JSON_START] (Array JSON di LongitudinalPoint - confronta esplicitamente i dati attuali con quelli passati se forniti) [COMPARISON_JSON_END]
`;

const cleanMarkdown = (text: string) => {
  return text.replace(/\[[A-Z_]+_START\][\s\S]*?\[[A-Z_]+_END\]/gi, '').trim();
};

const safeParse = (str: string | null) => {
  if (!str) return undefined;
  try { 
    const cleanStr = str.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanStr); 
  } catch(e) { 
    console.error("JSON Parse Error:", e);
    return undefined; 
  }
};

const extractFromTags = (text: string, start: string, end: string) => {
  const match = text.match(new RegExp(`${start.replace('[', '\\[').replace(']', '\\]')}([\\s\\S]*?)${end.replace('[', '\\[').replace(']', '\\]')}`));
  return match ? match[1].trim() : null;
};

export const analyzeMedicalFiles = async (
  files: { file: File; base64: string; mimeType: string; category: string }[],
  previousReport?: string,
  historicalRecords?: any[]
): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) throw new Error("API Key mancante.");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const parts: any[] = files.map((f) => ({
    inlineData: { data: f.base64, mimeType: f.mimeType },
  }));

  const fileNames = files.map(f => f.file.name).join(', ');
  let prompt = `${DETAILED_REPORT_PROMPT}\n\nDocumenti: ${fileNames}.\nGenera il referto integrale.`;

  if (historicalRecords && historicalRecords.length > 0) {
    const historicalContext = historicalRecords.slice(0, 5).map(r => `[Data: ${new Date(r.timestamp).toLocaleDateString()}] Referto: ${r.result.markdown.slice(0, 800)}`).join('\n\n');
    prompt += `\n\nANALISI COMPARATIVA LONGITUDINALE RICHIESTA:\nConfronta i nuovi dati con la seguente storia clinica precedente per generare la timeline comparativa:\n${historicalContext}`;
  }

  if (previousReport) {
    prompt = `${DETAILED_REPORT_PROMPT}\n\nINTEGRAZIONE CON CONTESTO PRECEDENTE:\n${previousReport.slice(-10000)}\n\nNUOVI DATI: ${fileNames}.`;
  }

  parts.push({ text: prompt });

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-3-pro-preview", 
    contents: { parts },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }],
      temperature: 0.1,
      maxOutputTokens: 32768,
      thinkingConfig: { thinkingBudget: 16000 }
    },
  });

  const text = response.text || "";
  
  return {
    markdown: cleanMarkdown(text),
    plainLanguageMarkdown: extractFromTags(text, '[PLAIN_LANGUAGE_START]', '[PLAIN_LANGUAGE_END]') || undefined,
    fhirData: safeParse(extractFromTags(text, '[FHIR_JSON_START]', '[FHIR_JSON_END]')),
    cdssSuggestions: safeParse(extractFromTags(text, '[CDSS_JSON_START]', '[CDSS_JSON_END]')),
    drugInteractions: safeParse(extractFromTags(text, '[DRUGS_JSON_START]', '[DRUGS_JSON_END]')),
    scribe: safeParse(extractFromTags(text, '[SCRIBE_JSON_START]', '[SCRIBE_JSON_END]')),
    patientActionPlan: safeParse(extractFromTags(text, '[PATIENT_PLAN_JSON_START]', '[PATIENT_PLAN_JSON_END]')),
    screeningAlerts: safeParse(extractFromTags(text, '[SCREENING_JSON_START]', '[SCREENING_JSON_END]')),
    instrumentalImages: safeParse(extractFromTags(text, '[INSTRUMENTAL_IMAGES_JSON_START]', '[INSTRUMENTAL_IMAGES_JSON_END]')),
    vitals: safeParse(extractFromTags(text, '[VITALS_JSON_START]', '[VITALS_JSON_END]')),
    longitudinalComparison: safeParse(extractFromTags(text, '[COMPARISON_JSON_START]', '[COMPARISON_JSON_END]')),
    isRedCode: !!text.match(/^!!! RED CODE: (.*?) !!!/m),
    redCodeReason: text.match(/^!!! RED CODE: (.*?) !!!/m)?.[1],
    groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks || []) as any[],
    rawText: text,
    timestamp: Date.now(),
    digitalTwin: safeParse(extractFromTags(text, '[JSON_SPATIAL_START]', '[JSON_SPATIAL_END]'))
  };
};

export const performDeepResearch = async (reportContext: string): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API Key mancante.");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `DEEP RESEARCH & CLINICAL EXCELLENCE - ITALIANO.
  Sulla base del referto, esegui una ricerca avanzata EBM su:
  1. Paper scientifici 2024-2025 su trattamenti e diagnostica specifica del caso.
  2. Protocolli innovativi e trial clinici.
  3. Suggerisci centri di eccellenza.
  
  CONTESTO:
  ${reportContext.slice(0, 15000)}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: [{ parts: [{ text: prompt }] }],
    config: { 
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }],
      temperature: 0.2,
      maxOutputTokens: 10000,
    },
  });

  return response.text || "Ricerca online non disponibile.";
};

export const runWhatIfSimulation = async (intervention: string, reportContext: string): Promise<SimulationResult> => {
  if (!process.env.API_KEY) throw new Error("API Key mancante.");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: [{ parts: [{ text: `Simulazione: ${intervention}. Contesto: ${reportContext.slice(0, 10000)}` }] }],
    config: { responseMimeType: "application/json", temperature: 0.2 }
  });
  return JSON.parse(response.text || "{}");
};

export const generateShortSummary = async (detailedReport: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: `Executive Summary in Italiano del report: ${detailedReport.slice(0, 20000)}` }] }],
  });
  return response.text || "";
};

export const chatWithMedicalAI = async (message: string, history: ChatMessage[], contextReport?: string): Promise<ChatMessage> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const context = contextReport && contextReport.length > 20000 ? contextReport.slice(-20000) : contextReport;
  const prompt = context ? `CONTESTO CLINICO:\n${context}\n\nDOMANDA: ${message}` : message;
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { tools: [{ googleSearch: {} }], temperature: 0.2 }
  });
  return { role: 'model', text: response.text || "Errore.", timestamp: Date.now(), groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks || []) as any[] };
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
  });
};

export const processScribeSession = async (transcript: string, currentReport?: string): Promise<Partial<AnalysisResult>> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: [{ parts: [{ text: `Scribe AI transcript: ${transcript}` }] }],
    config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.2 }
  });
  return { scribe: safeParse(extractFromTags(response.text, '[SCRIBE_JSON_START]', '[SCRIBE_JSON_END]')) };
};
