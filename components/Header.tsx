
import { Activity, ShieldCheck, Zap } from 'lucide-react';
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-24">
          <div className="flex items-center gap-5">
            {/* Logo Ufficiale MediMind: Cervello + Croce Medica Oro */}
            <div className="relative h-20 w-20 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Silhouette Cervello stilizzata */}
                <path d="M50 78C55 78 58 75 60 72C65 74 72 72 75 68C80 62 82 55 80 48C78 40 72 35 65 32C62 25 55 22 45 22C35 22 28 28 25 35C20 40 18 48 20 55C22 65 28 72 35 75C38 78 45 78 50 78Z" stroke="#c5b38a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                
                {/* Croce Medica Centrale */}
                <path d="M44 50H56M50 44V56" stroke="#c5b38a" strokeWidth="5" strokeLinecap="round" />
                
                {/* Dettagli interni emisferi */}
                <path d="M35 45C38 42 42 40 46 40" stroke="#c5b38a" strokeWidth="1" opacity="0.6" strokeLinecap="round"/>
                <path d="M65 45C62 42 58 40 54 40" stroke="#c5b38a" strokeWidth="1" opacity="0.6" strokeLinecap="round"/>
                <path d="M40 65C45 68 55 68 60 65" stroke="#c5b38a" strokeWidth="1" opacity="0.6" strokeLinecap="round"/>
                
                {/* Tronco encefalico stilizzato */}
                <path d="M48 78L48 85L52 88" stroke="#c5b38a" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <h1 className="text-3xl font-black tracking-tighter leading-none" style={{ color: '#c5b38a' }}>MediMind</h1>
                <span 
                  className="text-xl font-medium rotate-[-4deg] transform origin-bottom-left select-none italic"
                  style={{ fontFamily: "'Dancing Script', cursive", color: '#c5b38a' }}
                >
                  by Antonio de Masellis
                </span>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] mt-1" style={{ color: '#c5b38a' }}>Diagnostic Intelligence</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden lg:flex flex-col items-end">
              <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                <Zap className="h-4 w-4 fill-emerald-500 animate-pulse" />
                <span>MediMind Engine Active</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-[9px] font-bold uppercase tracking-widest mt-1">
                <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
                <span>E2E Medical Encryption</span>
              </div>
            </div>
            <span className="btn-3d bg-slate-900 px-5 py-2.5 rounded-full text-[10px] text-white border-transparent shadow-lg">
              GEMINI 3 PRO NODE
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
