"use client";

import React from "react";
import { Compass, Target, Gift, User, Building2, PlusCircle, Bell } from "lucide-react";

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onOpenReportModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onTabChange, onOpenReportModal }) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-surface/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between shadow-subtle">
      {/* Logotipo e Identidad Territorial */}
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => onTabChange("map")}>
        <div className="w-8 h-8 rounded-lg bg-foreground text-surface flex items-center justify-center font-display font-extrabold text-sm tracking-tight shadow-subtle">
          SR
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-display font-black text-sm tracking-wider text-foreground">
              CONECTA
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-territory-nature animate-pulse" />
          </div>
          <span className="text-[10px] text-territory-neutral font-medium block -mt-0.5">
            Santiago Rodríguez · El Territorio Está Vivo
          </span>
        </div>
      </div>

      {/* Navegación Desktop */}
      <nav className="hidden md:flex items-center gap-1 bg-background p-1 rounded-lg border border-border">
        {[
          { id: "map", label: "Mapa Vivo", icon: Compass },
          { id: "missions", label: "Misiones", icon: Target },
          { id: "rewards", label: "Recompensas", icon: Gift },
          { id: "passport", label: "Pasaporte", icon: User },
          { id: "admin", label: "Panel Municipal", icon: Building2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                isActive
                  ? "bg-surface text-foreground shadow-subtle"
                  : "text-territory-neutral hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Acciones Rápidas */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenReportModal}
          className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-territory-alert text-surface text-xs font-semibold hover:bg-red-700 transition-colors shadow-subtle"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Reportar Incidencia
        </button>

        <button
          onClick={() => onTabChange("admin")}
          className="md:hidden flex items-center justify-center p-2 rounded-md border border-border text-territory-neutral hover:bg-muted"
          title="Panel Municipal"
        >
          <Building2 className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
