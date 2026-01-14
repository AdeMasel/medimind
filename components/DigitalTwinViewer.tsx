
import { Activity, Box, FlaskConical, MapPin, MessageSquareText, RotateCw, ShieldCheck, TrendingUp, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls';
import { DigitalTwinData, SpatialMarker } from '../types';

interface DigitalTwinViewerProps {
  data: DigitalTwinData;
  patientName: string;
}

export const DigitalTwinViewer: React.FC<DigitalTwinViewerProps> = ({ data, patientName }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const controlsRef = useRef<any>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const markerMeshesRef = useRef<THREE.Mesh[]>([]);
  
  const [selectedMarker, setSelectedMarker] = useState<SpatialMarker | null>(null);
  const [isRotating, setIsRotating] = useState(true);
  const [showSimulations, setShowSimulations] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); 
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    camera.position.set(0, 20, 120);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = isRotating;
    controlsRef.current = controls;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const pointLight1 = new THREE.PointLight(0x0ea5e9, 2);
    pointLight1.position.set(100, 100, 100);
    scene.add(pointLight1);

    // Human Model Placeholder
    const torsoGeom = new THREE.CapsuleGeometry(30, 60, 4, 16);
    const torsoMat = new THREE.MeshPhongMaterial({ 
      color: 0x334155, 
      wireframe: true, 
      transparent: true, 
      opacity: 0.15 
    });
    const torso = new THREE.Mesh(torsoGeom, torsoMat);
    scene.add(torso);

    // Markers
    const meshes: THREE.Mesh[] = [];
    data.markers?.forEach((marker) => {
      const geom = new THREE.SphereGeometry(3, 32, 32);
      const color = marker.status === 'pathological' ? 0xef4444 : (marker.status === 'warning' ? 0xf59e0b : 0x10b981);
      const mat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.4 });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(marker.x - 50, marker.y - 50, marker.z - 50);
      mesh.userData = marker;
      
      const spriteMat = new THREE.SpriteMaterial({
        map: new THREE.TextureLoader().load('https://threejs.org/examples/textures/lensflare/lensflare0.png'),
        color: color,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(12, 12, 1);
      mesh.add(sprite);

      scene.add(mesh);
      meshes.push(mesh);
    });
    markerMeshesRef.current = meshes;

    const onCanvasClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(markerMeshesRef.current);
      if (intersects.length > 0) setSelectedMarker(intersects[0].object.userData as SpatialMarker);
    };

    containerRef.current.addEventListener('click', onCanvasClick);

    const animate = () => {
      requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.autoRotate = isRotating;
        controlsRef.current.update();
      }
      markerMeshesRef.current.forEach(mesh => {
        const isSelected = selectedMarker?.name === mesh.userData.name;
        const scale = isSelected ? 1.8 : 1.0;
        mesh.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
        // @ts-ignore
        mesh.material.emissiveIntensity = isSelected ? 1.5 : 0.4;
      });
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      containerRef.current?.removeEventListener('click', onCanvasClick);
      renderer.dispose();
    };
  }, [data, isRotating, selectedMarker]);

  return (
    <div className="relative bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl border-4 border-slate-800 h-[750px] group/canvas">
      {/* HUD Info Left */}
      <div className="absolute top-8 left-8 z-10 space-y-4 digital-twin-overlay">
        <div className="bg-slate-800/80 backdrop-blur-md p-6 rounded-3xl border border-slate-700 shadow-xl w-64">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="text-medical-500 h-5 w-5" />
            <h4 className="text-sm font-black text-white uppercase tracking-tighter">Digital Twin v5.0</h4>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase mb-4 tracking-widest">In-Silico Simulation Active</p>
          
          <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar pointer-events-auto">
            {data.markers?.map((m, i) => (
              <button 
                key={i} 
                onClick={() => setSelectedMarker(m)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                  selectedMarker?.name === m.name ? 'bg-medical-500 text-white shadow-lg scale-[1.05]' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <div className={`h-2.5 w-2.5 rounded-full ${m.status === 'pathological' ? 'bg-red-500' : (m.status === 'warning' ? 'bg-amber-500' : 'bg-green-500')}`} />
                <span className="text-[10px] font-black uppercase truncate flex-1 text-left">{m.name}</span>
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={() => setShowSimulations(!showSimulations)}
          className={`flex items-center gap-3 px-6 py-4 rounded-3xl border transition-all pointer-events-auto shadow-xl ${
            showSimulations ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
          }`}
        >
          <FlaskConical size={18} />
          <span className="text-[10px] font-black uppercase tracking-widest">In-Silico Predictions</span>
        </button>
      </div>

      {/* Main Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Expanded Simulation Dashboard */}
      {showSimulations && data.simulations && (
        <div className="absolute top-8 right-8 z-10 w-[380px] bg-slate-900/90 backdrop-blur-xl p-8 rounded-[2.5rem] border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.2)] animate-fade-in pointer-events-auto max-h-[90%] overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-emerald-400" />
              <h5 className="text-xs font-black text-white uppercase tracking-widest">Esiti Previsionali AI</h5>
            </div>
            <span className="text-[8px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full uppercase">Real-time Sim</span>
          </div>
          
          <div className="space-y-8">
            {data.simulations?.map((sim, i) => (
              <div key={i} className="bg-white/5 p-6 rounded-[2rem] border border-white/5 hover:border-emerald-500/20 transition-all space-y-4">
                <div className="flex justify-between items-start">
                  <h6 className="text-xs font-black text-white uppercase tracking-tight max-w-[70%]">{sim.treatmentName}</h6>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-500 uppercase leading-none">Efficacia</p>
                    <p className="text-lg font-black text-emerald-400">{sim.efficacyRate}%</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[7px] font-bold uppercase text-slate-400">
                      <span>Success Probability</span>
                      <span>Target Reach</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ width: `${sim.efficacyRate}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[7px] font-bold uppercase text-slate-400">
                      <span>Model Confidence</span>
                      <span>{sim.confidenceRate || 85}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" style={{ width: `${sim.confidenceRate || 85}%` }} />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-xl space-y-2 border border-white/5">
                   <div className="flex items-center gap-2 text-indigo-400">
                      <MessageSquareText size={12} />
                      <span className="text-[8px] font-black uppercase tracking-widest">Esito Previsto</span>
                   </div>
                   <p className="text-[10px] text-slate-300 font-medium leading-relaxed italic">
                     "{sim.predictedOutcome}"
                   </p>
                </div>

                <div className="flex justify-between items-center pt-2">
                   <div className="flex items-center gap-1.5 text-red-400">
                      <ShieldCheck size={10} className="text-red-400" />
                      <span className="text-[7px] font-black uppercase">Rischio Effetti: {sim.sideEffectRisk}%</span>
                   </div>
                   <button className="text-[7px] font-black text-emerald-400 uppercase tracking-widest hover:underline">Vedi Parametri &gt;</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedMarker && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-2xl bg-medical-900/95 backdrop-blur-2xl p-8 rounded-[3rem] border-2 border-medical-500/40 shadow-2xl animate-slide-in-bottom pointer-events-auto">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-5">
              <div className={`p-4 rounded-3xl shadow-lg text-white ${
                selectedMarker.status === 'pathological' ? 'bg-red-500' : 'bg-green-500'
              }`}>
                <MapPin size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none mb-1">{selectedMarker.name}</h3>
                <span className="text-[10px] text-medical-400 font-bold uppercase tracking-widest">{selectedMarker.organSystem} System</span>
              </div>
            </div>
            <button onClick={() => setSelectedMarker(null)} className="p-2 text-white/40 hover:text-white"><X size={24}/></button>
          </div>
          <p className="text-slate-300 text-sm font-medium bg-white/5 p-4 rounded-2xl mb-4 border border-white/10">{selectedMarker.notes}</p>
        </div>
      )}

      <div className="absolute bottom-8 right-8 flex flex-col gap-3 pointer-events-auto">
        <div className="flex flex-col gap-2 bg-slate-800/80 backdrop-blur-md p-2 rounded-2xl border border-slate-700 shadow-lg">
          <button onClick={() => setIsRotating(!isRotating)} className={`p-4 rounded-xl transition-all ${isRotating ? 'bg-medical-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
            <RotateCw size={20} className={isRotating ? 'animate-spin-slow' : ''} />
          </button>
        </div>
      </div>
    </div>
  );
};
