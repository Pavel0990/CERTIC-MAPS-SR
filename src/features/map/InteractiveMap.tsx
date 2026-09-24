"use client";

import React, { useState, useEffect } from "react";
import { 
  Store, 
  Trees, 
  Footprints, 
  Target, 
  Gift, 
  AlertTriangle, 
  Compass, 
  Navigation, 
  Search, 
  SlidersHorizontal,
  X,
  ExternalLink,
  CheckCircle2
} from "lucide-react";
import { Business, TouristPlace, EcoRoute, CitizenReport, Mission, Reward } from "@/types";
import { MOCK_BUSINESSES, MOCK_TOURIST_PLACES, MOCK_ROUTES, MOCK_REPORTS, MOCK_MISSIONS, MOCK_REWARDS, MOCK_MUNICIPALITIES } from "@/services/mockData";
import { formatDifficulty, formatDistance } from "@/lib/utils";

interface InteractiveMapProps {
  onSelectMission?: (mission: Mission) => void;
  onOpenReportModal?: () => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({ onSelectMission, onOpenReportModal }) => {
  const [selectedLayer, setSelectedLayer] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>({ lat: 19.4752, lng: -71.3412 });
  const [currentMunicipality, setCurrentMunicipality] = useState<string>("San Ignacio de Sabaneta");
  const [mapZoom, setMapZoom] = useState<number>(13);

  // Filtrado de elementos según capa y búsqueda
  const filteredBusinesses = MOCK_BUSINESSES.filter(b => 
    (selectedLayer === "all" || selectedLayer === "businesses") &&
    (b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredTourism = MOCK_TOURIST_PLACES.filter(t => 
    (selectedLayer === "all" || selectedLayer === "tourism") &&
    (t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredMissions = MOCK_MISSIONS.filter(m => 
    (selectedLayer === "all" || selectedLayer === "missions") &&
    (m.title.toLowerCase().includes(searchQuery.toLowerCase()) || m.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredReports = MOCK_REPORTS.filter(r => 
    (selectedLayer === "all" || selectedLayer === "reports") &&
    (r.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Manejador de geolocalización
  const handleLocateUser = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setCurrentMunicipality("San Ignacio de Sabaneta");
        },
        () => {
          // Coordenada por defecto Sabaneta
          setUserLocation({ lat: 19.4752, lng: -71.3412 });
        }
      );
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-64px)] bg-[#EFEFEA] overflow-hidden select-none">
      {/* 1. Barra Flotante de Búsqueda y Filtros Superiores */}
      <div className="absolute top-4 left-4 right-4 z-20 max-w-xl mx-auto flex flex-col gap-2">
        <div className="bg-surface rounded-lg shadow-floating border border-border flex items-center px-4 py-2.5">
          <Search className="w-5 h-5 text-territory-neutral mr-2.5 shrink-0" />
          <input
            type="text"
            placeholder="¿Qué buscas en Santiago Rodríguez? (Casabe, presas, baches...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-foreground placeholder:text-territory-neutral/70 focus:outline-none text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="p-1 hover:bg-muted rounded-full">
              <X className="w-4 h-4 text-territory-neutral" />
            </button>
          )}
        </div>

        {/* Filtros Rápidos en Pastillas */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: "all", label: "Todo el Territorio", icon: Compass },
            { id: "businesses", label: "Comercios", icon: Store },
            { id: "tourism", label: "Turismo & Presas", icon: Trees },
            { id: "missions", label: "Misiones", icon: Target },
            { id: "reports", label: "Reportes Viales", icon: AlertTriangle },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = selectedLayer === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedLayer(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shadow-subtle ${
                  isActive
                    ? "bg-foreground text-surface"
                    : "bg-surface text-territory-neutral hover:text-foreground border border-border"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Lienzo Territorial Interactivo (Mapa Base con Estilo Vectorial Santiago Rodríguez) */}
      <div className="w-full h-full relative flex items-center justify-center bg-gradient-to-b from-[#F2F2EC] to-[#E5E5DE]">
        {/* Grilla y Trazados Geográficos Representativos */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#6F6F6A_1px,transparent_1px)] [background-size:24px_24px]" />
        
        {/* Polígonos y Etiquetas de Municipios */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-full max-w-4xl h-full flex items-center justify-around px-8 opacity-70">
            {/* Monción (Este) */}
            <div className="absolute top-[28%] right-[18%] flex flex-col items-center">
              <div className="w-36 h-36 rounded-full border-2 border-dashed border-territory-nature/40 bg-emerald-500/5 flex items-center justify-center animate-pulse">
                <span className="text-xs font-display font-semibold tracking-wider text-territory-nature uppercase">Monción</span>
              </div>
              <span className="text-[10px] text-territory-neutral font-medium">Presa & Casabe</span>
            </div>

            {/* Sabaneta (Norte - Centro) */}
            <div className="absolute top-[22%] left-[42%] flex flex-col items-center">
              <div className="w-44 h-44 rounded-full border-2 border-dashed border-primary/40 bg-blue-500/5 flex items-center justify-center">
                <span className="text-xs font-display font-semibold tracking-wider text-primary uppercase">Sabaneta</span>
              </div>
              <span className="text-[10px] text-territory-neutral font-medium">Cabecera Provincial</span>
            </div>

            {/* Villa Los Almácigos (Oeste) */}
            <div className="absolute bottom-[28%] left-[16%] flex flex-col items-center">
              <div className="w-36 h-36 rounded-full border-2 border-dashed border-territory-mission/40 bg-amber-500/5 flex items-center justify-center">
                <span className="text-xs font-display font-semibold tracking-wider text-territory-mission uppercase">Los Almácigos</span>
              </div>
              <span className="text-[10px] text-territory-neutral font-medium">Cordillera & Senderos</span>
            </div>
          </div>
        </div>

        {/* 3. Marcadores Avanzados (Advanced Markers Interactivos) */}
        
        {/* Marcadores de Comercios */}
        {filteredBusinesses.map((biz) => (
          <button
            key={biz.id}
            onClick={() => setSelectedEntity({ ...biz, type: "business" })}
            className="absolute z-10 group transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110 focus:outline-none"
            style={{
              top: `${biz.municipality_id.includes("mon") ? 32 : biz.municipality_id.includes("vla") ? 68 : 28}%`,
              left: `${biz.municipality_id.includes("mon") ? 78 : biz.municipality_id.includes("vla") ? 22 : 46}%`,
            }}
          >
            <div className="flex items-center gap-1.5 bg-surface border-2 border-territory-nature rounded-full px-2.5 py-1 shadow-subtle group-hover:shadow-floating">
              <Store className="w-3.5 h-3.5 text-territory-nature" />
              <span className="text-xs font-medium text-foreground max-w-[120px] truncate">{biz.name}</span>
            </div>
          </button>
        ))}

        {/* Marcadores Turísticos */}
        {filteredTourism.map((place) => (
          <button
            key={place.id}
            onClick={() => setSelectedEntity({ ...place, type: "tourism" })}
            className="absolute z-10 group transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110 focus:outline-none"
            style={{
              top: `${place.municipality_id.includes("mon") ? 25 : place.municipality_id.includes("vla") ? 72 : 24}%`,
              left: `${place.municipality_id.includes("mon") ? 82 : place.municipality_id.includes("vla") ? 18 : 50}%`,
            }}
          >
            <div className="flex items-center gap-1.5 bg-surface border-2 border-emerald-600 rounded-full px-2.5 py-1 shadow-subtle group-hover:shadow-floating">
              <Trees className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-medium text-foreground max-w-[120px] truncate">{place.name}</span>
            </div>
          </button>
        ))}

        {/* Marcadores de Misiones */}
        {filteredMissions.map((mis) => (
          <button
            key={mis.id}
            onClick={() => setSelectedEntity({ ...mis, type: "mission" })}
            className="absolute z-10 group transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110 focus:outline-none"
            style={{
              top: `${mis.municipality_id?.includes("mon") ? 38 : mis.municipality_id?.includes("vla") ? 62 : 34}%`,
              left: `${mis.municipality_id?.includes("mon") ? 74 : mis.municipality_id?.includes("vla") ? 26 : 42}%`,
            }}
          >
            <div className="flex items-center gap-1.5 bg-amber-50 border-2 border-territory-mission rounded-full px-2.5 py-1 shadow-subtle group-hover:shadow-floating animate-bounce">
              <Target className="w-3.5 h-3.5 text-territory-mission" />
              <span className="text-xs font-semibold text-territory-mission max-w-[120px] truncate">
                {mis.title}
              </span>
              <span className="text-[10px] bg-territory-mission text-surface rounded-full px-1.5">
                +{mis.reward_points}
              </span>
            </div>
          </button>
        ))}

        {/* Marcadores de Reportes Viales */}
        {filteredReports.map((rep) => (
          <button
            key={rep.id}
            onClick={() => setSelectedEntity({ ...rep, type: "report" })}
            className="absolute z-10 group transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110 focus:outline-none"
            style={{
              top: `${rep.municipality_id.includes("mon") ? 42 : rep.municipality_id.includes("vla") ? 75 : 30}%`,
              left: `${rep.municipality_id.includes("mon") ? 70 : rep.municipality_id.includes("vla") ? 24 : 52}%`,
            }}
          >
            <div className="flex items-center gap-1.5 bg-red-50 border-2 border-territory-alert rounded-full px-2 py-1 shadow-subtle group-hover:shadow-floating">
              <AlertTriangle className="w-3.5 h-3.5 text-territory-alert" />
              <span className="text-xs font-medium text-territory-alert max-w-[100px] truncate">{rep.title}</span>
            </div>
          </button>
        ))}

        {/* Posición del Usuario (GPS) */}
        {userLocation && (
          <div 
            className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ top: "35%", left: "48%" }}
          >
            <div className="relative flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-primary/20 animate-ping absolute" />
              <div className="w-4 h-4 rounded-full bg-primary border-2 border-surface shadow-subtle" />
            </div>
          </div>
        )}

        {/* Cluster Tipográfico de Demostración (05 y 12) */}
        <div 
          className="absolute z-10 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110"
          style={{ top: "45%", left: "55%" }}
        >
          <div className="w-9 h-9 rounded-full bg-surface border-2 border-territory-nature flex items-center justify-center shadow-floating font-display font-bold text-xs text-territory-nature">
            05
          </div>
        </div>
      </div>

      {/* 4. Controles Discretos de Navegación Flotantes */}
      <div className="absolute right-4 bottom-28 z-20 flex flex-col gap-2">
        <button
          onClick={handleLocateUser}
          className="w-10 h-10 rounded-full bg-surface border border-border shadow-floating flex items-center justify-center text-primary hover:bg-muted transition-colors"
          title="Centrar en mi ubicación GPS"
        >
          <Navigation className="w-5 h-5 fill-primary" />
        </button>
        <button
          onClick={() => setMapZoom(z => Math.min(z + 1, 18))}
          className="w-10 h-10 rounded-full bg-surface border border-border shadow-floating flex items-center justify-center text-foreground font-bold hover:bg-muted transition-colors"
          title="Acercar mapa"
        >
          +
        </button>
        <button
          onClick={() => setMapZoom(z => Math.max(z - 1, 10))}
          className="w-10 h-10 rounded-full bg-surface border border-border shadow-floating flex items-center justify-center text-foreground font-bold hover:bg-muted transition-colors"
          title="Alejar mapa"
        >
          -
        </button>
      </div>

      {/* 5. Tarjeta Contextual Flotante Inferior (Responsive Context Card) */}
      {selectedEntity && (
        <div className="absolute bottom-4 left-4 right-4 z-30 max-w-lg mx-auto">
          <div className="bg-surface rounded-lg border border-border shadow-floating p-4 relative animate-in fade-in slide-in-from-bottom-4">
            <button
              onClick={() => setSelectedEntity(null)}
              className="absolute top-3 right-3 p-1 rounded-full text-territory-neutral hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Negocio Seleccionado */}
            {selectedEntity.type === "business" && (
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-territory-nature border border-emerald-200">
                    Comercio Local
                  </span>
                  {selectedEntity.is_verified && (
                    <span className="flex items-center gap-1 text-[11px] text-territory-nature font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verificado
                    </span>
                  )}
                </div>
                <h3 className="font-display font-bold text-base text-foreground mb-1">{selectedEntity.name}</h3>
                <p className="text-xs text-territory-neutral mb-3 line-clamp-2">{selectedEntity.description}</p>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-xs text-territory-neutral">{selectedEntity.address}</span>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedEntity.lat},${selectedEntity.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-surface text-xs font-medium hover:bg-primary/90"
                  >
                    <Navigation className="w-3.5 h-3.5" /> Cómo llegar
                  </a>
                </div>
              </div>
            )}

            {/* Atractivo Turístico Seleccionado */}
            {selectedEntity.type === "tourism" && (
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Ecoturismo
                  </span>
                  {selectedEntity.elevation_meters && (
                    <span className="text-[11px] text-territory-neutral font-medium">
                      Elevación: {selectedEntity.elevation_meters} m
                    </span>
                  )}
                </div>
                <h3 className="font-display font-bold text-base text-foreground mb-1">{selectedEntity.name}</h3>
                <p className="text-xs text-territory-neutral mb-3">{selectedEntity.description}</p>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-xs text-territory-nature font-medium">Acceso: {selectedEntity.access_difficulty || "Fácil"}</span>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedEntity.lat},${selectedEntity.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-surface text-xs font-medium hover:bg-primary/90"
                  >
                    <Navigation className="w-3.5 h-3.5" /> Navegar
                  </a>
                </div>
              </div>
            )}

            {/* Misión Seleccionada */}
            {selectedEntity.type === "mission" && (
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-territory-mission border border-amber-200">
                    Misión Territorial
                  </span>
                  <span className="text-[11px] font-bold text-territory-mission">
                    +{selectedEntity.reward_points} Pts
                  </span>
                </div>
                <h3 className="font-display font-bold text-base text-foreground mb-1">{selectedEntity.title}</h3>
                <p className="text-xs text-territory-neutral mb-3">{selectedEntity.description}</p>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-xs text-territory-neutral">Tipo: {selectedEntity.mission_type}</span>
                  <button
                    onClick={() => onSelectMission && onSelectMission(selectedEntity)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-territory-mission text-surface text-xs font-medium hover:bg-territory-mission/90"
                  >
                    <Target className="w-3.5 h-3.5" /> Iniciar Misión
                  </button>
                </div>
              </div>
            )}

            {/* Reporte Vial Seleccionado */}
            {selectedEntity.type === "report" && (
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-territory-alert border border-red-200">
                    Reporte Ciudadano
                  </span>
                  <span className="text-[11px] text-territory-neutral font-medium">
                    {selectedEntity.votes_count} vecinos respaldan
                  </span>
                </div>
                <h3 className="font-display font-bold text-base text-foreground mb-1">{selectedEntity.title}</h3>
                <p className="text-xs text-territory-neutral mb-3">{selectedEntity.description || "Sin descripción adicional."}</p>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-xs font-semibold text-territory-neutral">Estado: {selectedEntity.status}</span>
                  <span className="text-xs text-territory-alert font-medium">Prioridad {selectedEntity.priority}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
