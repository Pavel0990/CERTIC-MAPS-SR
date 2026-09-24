"use client";

import React, { useState } from "react";
import { Header } from "@/components/navigation/Header";
import { BottomNav } from "@/components/navigation/BottomNav";
import { InteractiveMap } from "@/features/map/InteractiveMap";
import { MissionsList } from "@/features/missions/MissionsList";
import { RewardsList } from "@/features/rewards/RewardsList";
import { TerritorialPassportView } from "@/features/profile/TerritorialPassportView";
import { MunicipalDashboardView } from "@/features/admin/MunicipalDashboardView";
import { ReportFormModal } from "@/features/reports/ReportFormModal";
import { Mission, CitizenReport } from "@/types";

export default function HomePage() {
  const [currentTab, setCurrentTab] = useState<string>("map");
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [notificationBanner, setNotificationBanner] = useState<string | null>(null);

  const handleSelectMissionFromMap = (mission: Mission) => {
    setCurrentTab("missions");
  };

  const handleMissionCompleted = (mission: Mission, points: number) => {
    setNotificationBanner(`¡Misión "${mission.title}" verificada! Ganaste +${points} puntos.`);
    setTimeout(() => setNotificationBanner(null), 5000);
  };

  const handleSubmitReport = (report: Partial<CitizenReport>) => {
    setNotificationBanner(`Reporte "${report.title}" registrado con éxito y visible en el mapa.`);
    setTimeout(() => setNotificationBanner(null), 5000);
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
      {/* Cabecera Principal */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenReportModal={() => setIsReportModalOpen(true)}
      />

      {/* Banner de Notificaciones Territorial Dinámico */}
      {notificationBanner && (
        <div className="bg-foreground text-surface text-xs font-semibold px-4 py-2.5 text-center flex items-center justify-center gap-2 animate-in slide-in-from-top z-50">
          <span>🔔 {notificationBanner}</span>
        </div>
      )}

      {/* Contenido Principal según Pestaña Activa */}
      <main className="flex-1 relative overflow-y-auto pb-16 md:pb-0">
        {currentTab === "map" && (
          <InteractiveMap
            onSelectMission={handleSelectMissionFromMap}
            onOpenReportModal={() => setIsReportModalOpen(true)}
          />
        )}

        {currentTab === "missions" && (
          <MissionsList onMissionCompleted={handleMissionCompleted} />
        )}

        {currentTab === "rewards" && <RewardsList />}

        {currentTab === "passport" && <TerritorialPassportView />}

        {currentTab === "admin" && <MunicipalDashboardView />}
      </main>

      {/* Navegación Móvil Inferior */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenReportModal={() => setIsReportModalOpen(true)}
      />

      {/* Modal de Creación de Reportes Comunitarios */}
      <ReportFormModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmitReport={handleSubmitReport}
      />
    </div>
  );
}
