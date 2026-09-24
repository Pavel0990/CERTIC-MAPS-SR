"use client";

import React, { useState } from "react";
import { 
  Building2, 
  FileText, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  Download,
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import { MOCK_MUNICIPALITIES, MOCK_REPORTS } from "@/services/mockData";
import { CitizenReport } from "@/types";

export const MunicipalDashboardView: React.FC = () => {
  const [selectedMuni, setSelectedMuni] = useState<string>("muni-sab-01");
  const [reports, setReports] = useState<CitizenReport[]>(MOCK_REPORTS);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfDownloaded, setPdfDownloaded] = useState<boolean>(false);

  const handleStatusChange = (reportId: string, newStatus: CitizenReport["status"]) => {
    setReports(prev =>
      prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r)
    );
  };

  const handleGeneratePdf = () => {
    setIsGeneratingPdf(true);
    setPdfDownloaded(false);

    // Simula la llamada al Route Handler /api/v1/internal/reports/weekly-pdf
    setTimeout(() => {
      setIsGeneratingPdf(false);
      setPdfDownloaded(true);
      setTimeout(() => setPdfDownloaded(false), 4000);
    }, 1500);
  };

  const currentMuniName = MOCK_MUNICIPALITIES.find(m => m.id === selectedMuni)?.name || "Provincia Santiago Rodríguez";

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* 1. Barra de Control de la Alcaldía y Selector Municipal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" /> Panel de Inteligencia Territorial
          </div>
          <h1 className="font-display font-bold text-2xl text-foreground">
            Alcaldía de {currentMuniName}
          </h1>
          <p className="text-xs text-territory-neutral">
            Monitoreo y resolución de servicios públicos, dinamización comercial y gobernanza
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedMuni}
            onChange={(e) => setSelectedMuni(e.target.value)}
            className="px-3 py-2 rounded-md border border-border bg-surface text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {MOCK_MUNICIPALITIES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleGeneratePdf}
            disabled={isGeneratingPdf}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-foreground text-surface text-xs font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-50 shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            {isGeneratingPdf ? "Generando PDF..." : "Reporte Semanal PDF"}
          </button>
        </div>
      </div>

      {pdfDownloaded && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs flex items-center justify-between animate-in fade-in">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Informe territorial semanal compilado y archivado en Supabase Storage (reports-pdf).
          </span>
          <span className="text-[11px] font-semibold underline cursor-pointer">Abrir descarga</span>
        </div>
      )}

      {/* 2. Cuadrícula de KPIs Territoriales Oficiales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface rounded-lg border border-border p-4 shadow-subtle">
          <div className="flex items-center justify-between text-territory-neutral mb-2">
            <span className="text-xs font-medium">Tasa de Resolución</span>
            <TrendingUp className="w-4 h-4 text-territory-nature" />
          </div>
          <div className="font-display font-bold text-2xl text-foreground mb-1">
            84.2%
          </div>
          <div className="text-[11px] text-territory-nature font-medium">
            ↑ +6.5% vs mes anterior
          </div>
        </div>

        <div className="bg-surface rounded-lg border border-border p-4 shadow-subtle">
          <div className="flex items-center justify-between text-territory-neutral mb-2">
            <span className="text-xs font-medium">Tiempo Medio (MTTR)</span>
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div className="font-display font-bold text-2xl text-foreground mb-1">
            38.5 hrs
          </div>
          <div className="text-[11px] text-primary font-medium">
            Resolución en menos de 2 días
          </div>
        </div>

        <div className="bg-surface rounded-lg border border-border p-4 shadow-subtle">
          <div className="flex items-center justify-between text-territory-neutral mb-2">
            <span className="text-xs font-medium">Comercios Activos</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-display font-bold text-2xl text-foreground mb-1">
            42 Locales
          </div>
          <div className="text-[11px] text-territory-neutral">
            100% georreferenciados
          </div>
        </div>

        <div className="bg-surface rounded-lg border border-border p-4 shadow-subtle">
          <div className="flex items-center justify-between text-territory-neutral mb-2">
            <span className="text-xs font-medium">Misiones Cumplidas</span>
            <CheckCircle2 className="w-4 h-4 text-territory-mission" />
          </div>
          <div className="font-display font-bold text-2xl text-foreground mb-1">
            128 Retos
          </div>
          <div className="text-[11px] text-territory-mission font-medium">
            Turistas y vecinos activos
          </div>
        </div>
      </div>

      {/* 3. Bandeja de Incidencias Viales y Reportes Ciudadanos */}
      <div className="bg-surface rounded-lg border border-border shadow-floating overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-base text-foreground">
              Bandeja Operativa de Incidencias Comunitarias
            </h2>
            <p className="text-xs text-territory-neutral">
              Asignación y cambio de estado directo para cuadrillas municipales
            </p>
          </div>
        </div>

        <div className="divide-y divide-border">
          {reports.map((report) => (
            <div key={report.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-background/50 transition-colors">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    report.status === "RESOLVED"
                      ? "bg-emerald-50 text-territory-nature border border-emerald-200"
                      : report.status === "IN_PROGRESS"
                      ? "bg-blue-50 text-primary border border-blue-200"
                      : "bg-amber-50 text-territory-mission border border-amber-200"
                  }`}>
                    {report.status}
                  </span>
                  <span className="text-[11px] font-semibold text-territory-alert">
                    Prioridad {report.priority}
                  </span>
                  <span className="text-xs text-territory-neutral">
                    · {report.votes_count} apoyos vecinales
                  </span>
                </div>
                <h3 className="font-display font-semibold text-sm text-foreground">
                  {report.title}
                </h3>
                <p className="text-xs text-territory-neutral mt-0.5">
                  {report.address_reference}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {report.status !== "IN_PROGRESS" && report.status !== "RESOLVED" && (
                  <button
                    onClick={() => handleStatusChange(report.id, "IN_PROGRESS")}
                    className="px-3 py-1.5 rounded-md bg-blue-50 text-primary border border-blue-200 text-xs font-medium hover:bg-blue-100"
                  >
                    Asignar Cuadrilla
                  </button>
                )}
                {report.status !== "RESOLVED" && (
                  <button
                    onClick={() => handleStatusChange(report.id, "RESOLVED")}
                    className="px-3 py-1.5 rounded-md bg-emerald-600 text-surface text-xs font-semibold hover:bg-emerald-700"
                  >
                    Marcar Resuelto
                  </button>
                )}
                {report.status === "RESOLVED" && (
                  <span className="flex items-center gap-1 text-xs text-territory-nature font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Reparación Verificada
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
