"use client";

import React from "react";
import { Award, Compass, Gift, AlertTriangle, ShieldCheck, CheckCircle2, User } from "lucide-react";
import { TerritorialPassport } from "@/types";
import { MOCK_PASSPORT } from "@/services/mockData";

export const TerritorialPassportView: React.FC = () => {
  const passport = MOCK_PASSPORT;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* 1. Cabecera del Pasaporte (Identidad Territorial) */}
      <div className="bg-surface rounded-lg border border-border shadow-floating p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -mr-10 -mt-10" />
        
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-foreground text-surface flex items-center justify-center font-display font-bold text-xl shadow-subtle">
            {passport.display_name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                Identidad Digital Ciudadana
              </span>
              <span className="flex items-center gap-1 text-xs text-territory-nature font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> Reputación: {passport.reputation}/100
              </span>
            </div>
            <h1 className="font-display font-bold text-2xl text-foreground">
              {passport.display_name}
            </h1>
            <p className="text-xs text-territory-neutral">
              Provincia Santiago Rodríguez · Miembro Activo
            </p>
          </div>
        </div>

        {/* 2. Estadísticas Numéricas Clave del Pasaporte */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border">
          <div className="bg-background rounded-lg p-3 text-center border border-border">
            <div className="font-display font-extrabold text-2xl text-foreground">
              07
            </div>
            <div className="text-[10px] uppercase tracking-wider text-territory-neutral font-semibold mt-0.5">
              Lugares Visitados
            </div>
          </div>

          <div className="bg-background rounded-lg p-3 text-center border border-border">
            <div className="font-display font-extrabold text-2xl text-territory-mission">
              04
            </div>
            <div className="text-[10px] uppercase tracking-wider text-territory-neutral font-semibold mt-0.5">
              Misiones
            </div>
          </div>

          <div className="bg-background rounded-lg p-3 text-center border border-border">
            <div className="font-display font-extrabold text-2xl text-emerald-600">
              03
            </div>
            <div className="text-[10px] uppercase tracking-wider text-territory-neutral font-semibold mt-0.5">
              Recompensas
            </div>
          </div>

          <div className="bg-background rounded-lg p-3 text-center border border-border">
            <div className="font-display font-extrabold text-2xl text-territory-alert">
              05
            </div>
            <div className="text-[10px] uppercase tracking-wider text-territory-neutral font-semibold mt-0.5">
              Reportes
            </div>
          </div>
        </div>
      </div>

      {/* 3. Insignias Territoriales Ganadas */}
      <div className="bg-surface rounded-lg border border-border shadow-floating p-6 mb-6">
        <h2 className="font-display font-bold text-base text-foreground mb-1 flex items-center gap-2">
          <Award className="w-5 h-5 text-territory-mission" /> Insignias y Méritos Territoriales
        </h2>
        <p className="text-xs text-territory-neutral mb-4">
          Reconocimientos acumulados por explorar senderos, apoyar al comercio y cuidar el municipio.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              id: "PIONERO_TERRITORIAL",
              name: "Pionero Territorial",
              desc: "Completó su primera misión de descubrimiento en la provincia.",
              achieved: true,
            },
            {
              id: "EXPLORADOR_DE_SABANETA",
              name: "Explorador de Sabaneta",
              desc: "Visitó los hitos históricos del Parque Juan Rosado y Centro Cívico.",
              achieved: true,
            },
            {
              id: "IMPULSOR_LOCAL",
              name: "Impulsor del Comercio",
              desc: "Canjeó 3 o más recompensas en establecimientos de Monción y Sabaneta.",
              achieved: true,
            },
            {
              id: "GUARDIAN_CIVICO",
              name: "Guardián Cívico",
              desc: "Colaboró con reportes viales resueltos favorablemente por la alcaldía.",
              achieved: true,
            },
          ].map((badge) => (
            <div
              key={badge.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background"
            >
              <div className="w-8 h-8 rounded-full bg-amber-500/10 text-territory-mission flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-territory-nature" />
              </div>
              <div>
                <h4 className="font-display font-bold text-xs text-foreground">{badge.name}</h4>
                <p className="text-[11px] text-territory-neutral mt-0.5 leading-snug">{badge.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Resumen de Actividad Reciente */}
      <div className="bg-surface rounded-lg border border-border shadow-floating p-6">
        <h3 className="font-display font-bold text-sm text-foreground mb-3">
          Últimos Movimientos Territoriales
        </h3>
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="text-foreground font-medium">Canje de voucher "10% en Casabe Gourmet"</span>
            <span className="text-territory-neutral text-[11px]">Hoy</span>
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="text-foreground font-medium">Misión cumplida: "Guardián Histórico de Sabaneta"</span>
            <span className="text-territory-neutral text-[11px]">Ayer</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-foreground font-medium">Reporte resuelto: "Limpieza en acceso a Balneario"</span>
            <span className="text-territory-neutral text-[11px]">Hace 3 días</span>
          </div>
        </div>
      </div>
    </div>
  );
};
