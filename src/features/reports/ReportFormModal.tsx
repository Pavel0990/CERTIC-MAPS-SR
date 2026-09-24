"use client";

import React, { useState } from "react";
import { 
  AlertTriangle, 
  X, 
  MapPin, 
  Camera, 
  CheckCircle2, 
  Construction, 
  Lightbulb, 
  Trash2, 
  Car, 
  HelpCircle 
} from "lucide-react";
import { CitizenReport } from "@/types";

interface ReportFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitReport?: (report: Partial<CitizenReport>) => void;
}

const CATEGORIES = [
  { id: "cat-bache", name: "Bache Vial", icon: Construction, color: "text-amber-600 bg-amber-50" },
  { id: "cat-accidente", name: "Accidente de Tránsito", icon: Car, color: "text-red-600 bg-red-50" },
  { id: "cat-alumbrado", name: "Alumbrado Público", icon: Lightbulb, color: "text-yellow-600 bg-yellow-50" },
  { id: "cat-basura", name: "Limpieza o Basura", icon: Trash2, color: "text-emerald-600 bg-emerald-50" },
  { id: "cat-otro", name: "Otra Incidencia", icon: HelpCircle, color: "text-blue-600 bg-blue-50" },
];

export const ReportFormModal: React.FC<ReportFormModalProps> = ({ isOpen, onClose, onSubmitReport }) => {
  const [selectedCat, setSelectedCat] = useState<string>("cat-bache");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [addressRef, setAddressRef] = useState<string>("Calle Próceres de la Restauración, Sabaneta");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);

    // Simulación de envío con clave de idempotencia
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);

      if (onSubmitReport) {
        onSubmitReport({
          title,
          description,
          category_id: selectedCat,
          address_reference: addressRef,
          status: "RECEIVED",
          priority: "HIGH",
          votes_count: 1,
        });
      }

      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        setTitle("");
        setDescription("");
      }, 1500);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-surface rounded-lg border border-border shadow-floating w-full max-w-lg overflow-hidden">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-territory-alert">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-foreground">
                Reportar Problema Comunitario o Vial
              </h2>
              <p className="text-[11px] text-territory-neutral">
                Notifica a la alcaldía y alerta a la comunidad sobre el mapa
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-territory-neutral hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center flex flex-col items-center justify-center animate-in zoom-in-95">
            <CheckCircle2 className="w-12 h-12 text-territory-nature mb-3" />
            <h3 className="font-display font-bold text-lg text-foreground mb-1">
              ¡Reporte Registrado con Éxito!
            </h3>
            <p className="text-xs text-territory-neutral max-w-xs">
              Tu incidencia ha sido ubicada en el mapa y remitida a la cuadrilla municipal correspondiente.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
            {/* 1. Categorías Rápidas con Iconos Grandes */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">
                1. Selecciona la Categoría
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCat === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCat(cat.id)}
                      className={`flex flex-col items-center text-center p-3 rounded-lg border transition-all ${
                        isSelected
                          ? "border-territory-alert bg-red-50/50 shadow-subtle ring-1 ring-territory-alert"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 ${cat.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-medium text-foreground">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Título y Descripción */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                2. ¿Qué ocurre exactamente?
              </label>
              <input
                type="text"
                placeholder="Ej. Bache profundo frente a la ferretería"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary mb-2"
              />
              <textarea
                placeholder="Detalles adicionales (opcional)..."
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            {/* 3. Ubicación y Evidencia */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border text-xs">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span className="text-territory-neutral truncate max-w-[240px]">{addressRef}</span>
              </div>
              <button
                type="button"
                className="flex items-center gap-1 text-[11px] font-medium text-foreground hover:text-primary"
              >
                <Camera className="w-3.5 h-3.5" /> Foto
              </button>
            </div>

            {/* Botón de Envío */}
            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="text-[10px] text-territory-neutral">
                🔒 Sincronización protegida con Idempotencia
              </span>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="px-5 py-2 rounded-md bg-territory-alert text-surface text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Enviando Reporte..." : "Enviar Reporte"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
