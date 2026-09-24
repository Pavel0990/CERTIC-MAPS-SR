"use client";

import React from "react";
import { Compass, Target, Gift, User, AlertCircle, Building2 } from "lucide-react";

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onOpenReportModal: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange, onOpenReportModal }) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border px-2 py-2 flex items-center justify-around shadow-floating">
      <button
        onClick={() => onTabChange("map")}
        className={`flex flex-col items-center gap-1 p-1 rounded-md transition-colors ${
          currentTab === "map" ? "text-primary font-bold" : "text-territory-neutral hover:text-foreground"
        }`}
      >
        <Compass className="w-5 h-5" />
        <span className="text-[10px]">Mapa</span>
      </button>

      <button
        onClick={() => onTabChange("missions")}
        className={`flex flex-col items-center gap-1 p-1 rounded-md transition-colors ${
          currentTab === "missions" ? "text-territory-mission font-bold" : "text-territory-neutral hover:text-foreground"
        }`}
      >
        <Target className="w-5 h-5" />
        <span className="text-[10px]">Misiones</span>
      </button>

      {/* Botón Central Protagónico: Reportar Incidencia */}
      <button
        onClick={onOpenReportModal}
        className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-territory-alert text-surface -mt-5 shadow-floating border-2 border-surface transition-transform active:scale-95"
        title="Crear Reporte Vial o Cívico"
      >
        <AlertCircle className="w-6 h-6" />
      </button>

      <button
        onClick={() => onTabChange("rewards")}
        className={`flex flex-col items-center gap-1 p-1 rounded-md transition-colors ${
          currentTab === "rewards" ? "text-amber-500 font-bold" : "text-territory-neutral hover:text-foreground"
        }`}
      >
        <Gift className="w-5 h-5" />
        <span className="text-[10px]">Premios</span>
      </button>

      <button
        onClick={() => onTabChange("passport")}
        className={`flex flex-col items-center gap-1 p-1 rounded-md transition-colors ${
          currentTab === "passport" ? "text-foreground font-bold" : "text-territory-neutral hover:text-foreground"
        }`}
      >
        <User className="w-5 h-5" />
        <span className="text-[10px]">Pasaporte</span>
      </button>
    </nav>
  );
};
