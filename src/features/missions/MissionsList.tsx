"use client";

import React, { useState } from "react";
import { Target, CheckCircle2, QrCode, MapPin, Award, AlertCircle, ArrowRight } from "lucide-react";
import { Mission } from "@/types";
import { MOCK_MISSIONS } from "@/services/mockData";
import { formatDifficulty } from "@/lib/utils";

interface MissionsListProps {
  onMissionCompleted?: (mission: Mission, points: number) => void;
}

export const MissionsList: React.FC<MissionsListProps> = ({ onMissionCompleted }) => {
  const [missions, setMissions] = useState<Mission[]>(MOCK_MISSIONS);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; success: boolean; message: string } | null>(null);

  const handleVerifyMission = (mission: Mission) => {
    setVerifyingId(mission.id);
    setFeedback(null);

    // Simulación de verificación con PostGIS server-side
    setTimeout(() => {
      setVerifyingId(null);
      if (completedIds.includes(mission.id)) {
        setFeedback({
          id: mission.id,
          success: false,
          message: "Esta misión territorial ya fue completada previamente por tu usuario.",
        });
        return;
      }

      setCompletedIds([...completedIds, mission.id]);
      setFeedback({
        id: mission.id,
        success: true,
        message: `¡Misión verificada con éxito! Has ganado +${mission.reward_points} puntos territoriales y desbloqueado beneficios.`,
      });

      if (onMissionCompleted) {
        onMissionCompleted(mission, mission.reward_points);
      }
    }, 1200);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-territory-mission font-semibold text-xs uppercase tracking-wider mb-1">
          <Target className="w-4 h-4" /> Retos del Territorio
        </div>
        <h1 className="font-display font-bold text-2xl text-foreground mb-1">
          Misiones Territoriales Activas
        </h1>
        <p className="text-sm text-territory-neutral">
          Descubre Santiago Rodríguez, apoya al comercio local y gana sellos exclusivos en tu Pasaporte del Territorio.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {missions.map((mission) => {
          const isDone = completedIds.includes(mission.id);
          const isVerifying = verifyingId === mission.id;
          const diff = formatDifficulty(mission.difficulty);

          return (
            <div
              key={mission.id}
              className={`bg-surface rounded-lg border p-5 transition-all shadow-subtle ${
                isDone ? "border-emerald-200 bg-emerald-50/20" : "border-border hover:shadow-floating"
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${diff.color}`}>
                      Dificultad {diff.label}
                    </span>
                    <span className="text-xs font-semibold text-territory-mission flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" /> +{mission.reward_points} Pts
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-lg text-foreground">
                    {mission.title}
                  </h3>
                </div>
                {isDone ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-territory-nature">
                    <CheckCircle2 className="w-4 h-4" /> Cumplida
                  </span>
                ) : (
                  <span className="text-xs text-territory-neutral flex items-center gap-1">
                    {mission.mission_type === "SCAN_QR" ? <QrCode className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                    {mission.mission_type === "SCAN_QR" ? "Código QR" : "Visita GPS"}
                  </span>
                )}
              </div>

              <p className="text-sm text-territory-neutral mb-4 leading-relaxed">
                {mission.description}
              </p>

              {/* Mensaje de retroalimentación de verificación */}
              {feedback && feedback.id === mission.id && (
                <div
                  className={`p-3 rounded-md text-xs mb-4 flex items-center gap-2 ${
                    feedback.success ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {feedback.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{feedback.message}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-xs text-territory-neutral font-medium">
                  {mission.radius_meters ? `Radio de verificación: ${mission.radius_meters}m` : "Validación local"}
                </span>

                {!isDone ? (
                  <button
                    onClick={() => handleVerifyMission(mission)}
                    disabled={isVerifying}
                    className="flex items-center gap-2 px-4 py-2 rounded-md bg-territory-mission text-surface text-xs font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50"
                  >
                    {isVerifying ? (
                      <span className="inline-block animate-spin mr-1">⏳</span>
                    ) : (
                      <Target className="w-4 h-4" />
                    )}
                    {isVerifying ? "Verificando en Servidor..." : "Verificar y Completar"}
                  </button>
                ) : (
                  <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Registrado en Pasaporte
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
