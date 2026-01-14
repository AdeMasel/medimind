
import React from 'react';
import { Upload, FileText, X, ClipboardList, FolderOpen } from 'lucide-react';
import { FileWithPreview } from '../types';

interface FileUploaderProps {
  files: FileWithPreview[];
  onFilesSelected: (files: FileWithPreview[]) => void;
  onRemoveFile: (id: string) => void;
  onDriveClick: () => void;
  disabled: boolean;
  isDriveAvailable: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ 
  files, 
  onFilesSelected, 
  onRemoveFile,
  onDriveClick,
  disabled,
  isDriveAvailable
}) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const selectedFiles = Array.from(event.target.files) as File[];
      const newFiles: FileWithPreview[] = selectedFiles
        .filter(file => file.type === 'application/pdf' || file.type.startsWith('image/'))
        .map((file: File) => ({
          file,
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
          type: file.type.startsWith('image/') ? 'image' : 'pdf',
          id: Math.random().toString(36).substring(7),
          category: 'clinical',
        }));
      onFilesSelected(newFiles);
    }
  };

  return (
    <div className="space-y-8">
      <div className={`border-2 border-dashed rounded-[2.5rem] p-10 transition-all ${
        disabled ? 'bg-gray-50 border-gray-200 opacity-50' : `bg-white border-slate-200 hover:border-medical-500 hover:shadow-2xl`
      }`}>
        <div className="flex flex-col items-center justify-center w-full">
          <div className="bg-medical-50 p-6 rounded-3xl mb-4 border border-medical-100 shadow-inner">
            <ClipboardList className="h-10 w-10 text-medical-600" />
          </div>
          <p className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">Documentazione Clinica</p>
          <p className="text-[11px] text-slate-400 mb-8 font-bold uppercase tracking-[0.3em] text-center px-4">Referti, Blood Tests, Immagini DICOM/RX o Dossier Completi</p>

          <div className="flex flex-col gap-4 w-full max-w-sm">
            <div className="grid grid-cols-2 gap-3">
              <label className={`btn-3d btn-3d-primary flex items-center justify-center gap-3 px-4 py-4 rounded-2xl cursor-pointer ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <Upload size={18} className="text-medical-600" />
                <span className="text-[10px] uppercase font-black tracking-widest">File</span>
                <input 
                  type="file" 
                  className="hidden" 
                  multiple 
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  disabled={disabled}
                />
              </label>

              <label className={`btn-3d btn-3d-primary flex items-center justify-center gap-3 px-4 py-4 rounded-2xl cursor-pointer ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <FolderOpen size={18} className="text-amber-600" />
                <span className="text-[10px] uppercase font-black tracking-widest">Cartella</span>
                <input 
                  type="file" 
                  className="hidden" 
                  multiple 
                  // @ts-ignore
                  webkitdirectory="" 
                  directory=""
                  onChange={handleFileChange}
                  disabled={disabled}
                />
              </label>
            </div>

            <button
              type="button"
              onClick={(e) => { e.preventDefault(); if (isDriveAvailable) onDriveClick(); }}
              disabled={disabled || !isDriveAvailable}
              className={`btn-3d btn-3d-primary flex items-center justify-center gap-3 px-6 py-4 rounded-2xl ${
                disabled || !isDriveAvailable ? 'opacity-50 grayscale' : ''
              }`}
            >
               <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" className="w-5 h-5" alt="Drive" />
               <span className="text-[10px] uppercase font-black tracking-widest">Cloud Drive</span>
            </button>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between px-2">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Coda di Analisi ({files.length} documenti)</p>
          </div>
          <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar p-2">
            {files.map((f) => (
              <div key={f.id} className="flex items-center p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                <div className="h-12 w-12 flex-shrink-0 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden border border-slate-100">
                  {f.type === 'image' && f.preview ? (
                    <img src={f.preview} alt="preview" className="h-full w-full object-cover" />
                  ) : (
                    <FileText className="h-6 w-6 text-medical-600" />
                  )}
                </div>
                <div className="ml-4 flex-1 min-w-0">
                  <p className="text-[11px] font-black text-slate-800 truncate uppercase">{f.file.name}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{(f.file.size / 1024 / 1024).toFixed(2)} MB • {f.type.toUpperCase()}</p>
                </div>
                <button 
                  onClick={() => onRemoveFile(f.id)}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  disabled={disabled}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
