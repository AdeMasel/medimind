
export interface FileWithPreview {
  file: File;
  preview?: string;
  type: 'image' | 'pdf';
  id: string;
  category: 'clinical';
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface LongitudinalPoint {
  date: string;
  parameter: string;
  value: string;
  previousValue?: string;
  delta?: string;
  status: 'stable' | 'improved' | 'worsened' | 'new';
  note: string;
}

export interface InstrumentalImage {
  id: string;
  category: string;
  title: string;
  description: string;
  findings: string;
  clinicalSignificance: string;
}

export interface VitalParams {
  bpm?: number;
  pressure?: string;
  temp?: number;
  oxygen?: number;
  respiratoryRate?: number;
}

export interface SpatialMarker {
  name: string;
  x: number;
  y: number;
  z: number;
  status: 'normal' | 'pathological' | 'warning';
  notes: string;
  organSystem: 'brain' | 'thoracic' | 'abdominal' | 'skeletal' | 'vascular';
}

export interface SimulationResult {
  treatmentName: string;
  efficacyRate: number;
  sideEffectRisk: number;
  confidenceRate: number;
  predictedOutcome: string;
}

export interface DigitalTwinData {
  markers: SpatialMarker[];
  surgicalPath?: { x: number, y: number, z: number }[];
  predictionModel?: {
    growthRate: string;
    affectedRegions: string[];
  };
  simulations?: SimulationResult[];
}

export interface TherapeuticSuggestion {
  path: string;
  evidenceLevel: 'A' | 'B' | 'C' | 'D';
  rationale: string;
  contraindications: string[];
}

export interface ProactiveCareStep {
  phase: string;
  action: string;
  timeline: string;
  priority: 'high' | 'medium' | 'low';
  triggeredBy: string;
}

export interface DrugInteraction {
  drugA: string;
  drugB: string;
  severity: 'high' | 'moderate' | 'low';
  description: string;
}

export interface PatientActionTask {
  id: string;
  task: string;
  deadline: string;
  completed: boolean;
  type: 'medication' | 'booking' | 'lifestyle';
}

export interface ScreeningAlert {
  title: string;
  dueDate: string;
  reason: string;
  urgency: 'routine' | 'urgent';
}

export interface ScribeOutput {
  anamnesis: string;
  symptoms: string;
  plan: string;
}

export interface AnalysisResult {
  markdown: string;
  plainLanguageMarkdown?: string;
  deepResearchMarkdown?: string;
  fhirData?: any;
  cdssSuggestions?: TherapeuticSuggestion[];
  carePlan?: ProactiveCareStep[];
  isRedCode: boolean;
  redCodeReason?: string;
  groundingChunks?: GroundingChunk[];
  rawText: string;
  timestamp: number;
  patientId?: string;
  digitalTwin?: DigitalTwinData;
  drugInteractions?: DrugInteraction[];
  patientActionPlan?: PatientActionTask[];
  screeningAlerts?: ScreeningAlert[];
  scribe?: ScribeOutput;
  instrumentalImages?: InstrumentalImage[];
  vitals?: VitalParams;
  longitudinalComparison?: LongitudinalPoint[];
}

export interface AnalysisCheckpoint {
  id: string;
  timestamp: number;
  markdown: string;
  filesAnalysed: string[];
  isRedCode: boolean;
}

export interface ProcessingState {
  status: 'idle' | 'analyzing' | 'complete' | 'error';
  message?: string;
}

export interface AnalysisRecord {
  id: string;
  timestamp: number;
  result: AnalysisResult;
  fileNames: string[];
  patientName: string;
  chatHistory?: ChatMessage[];
  checkpoints: AnalysisCheckpoint[];
  extendedHistory?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  groundingChunks?: GroundingChunk[];
}

export type AppModule = 'diagnostic' | 'doctor' | 'patient' | 'system' | 'prevention' | 'management';
