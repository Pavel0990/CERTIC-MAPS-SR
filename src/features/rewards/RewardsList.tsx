"use client";

import React, { useState } from "react";
import { Gift, CheckCircle2, AlertTriangle, Sparkles, Copy, Check } from "lucide-react";
import { Reward } from "@/types";
import { MOCK_REWARDS } from "@/services/mockData";
import { formatDifficulty } from "@/lib/utils";

export const RewardsList: React.FC = () => {
  const [rewards, setRewards] = useState<Reward[]>(MOCK_REWARDS);
  const [redeemedCodes, setRedeemedCodes] = useState<Record<string, string>>({});
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<{ id: string; text: string } | null>(null);

  const handleRedeemReward = (reward: Reward) => {
    if (reward.stock <= 0) {
      setErrorMessage({ id: reward.id, text: "Esta recompensa no dispone de existencias disponibles." });
      return;
    }

    setRedeemingId(reward.id);
    setErrorMessage(null);

    // Simulación del bloqueo atómico FOR UPDATE en PostgreSQL (redeem_reward)
    setTimeout(() => {
      setRedeemingId(null);

      // Descontar stock atómicamente
      setRewards((prev) =>
        prev.map((r) => (r.id === reward.id ? { ...r, stock: r.stock - 1 } : r))
      );

      // Generar voucher único SR-XXXXXX
      const code = `SR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setRedeemedCodes((prev) => ({ ...prev, [reward.id]: code }));
    }, 1000);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-territory-mission font-semibold text-xs uppercase tracking-wider mb-1">
          <Gift className="w-4 h-4" /> Economía Local & Beneficios
        </div>
        <h1 className="font-display font-bold text-2xl text-foreground mb-1">
          Recompensas del Comercio de Santiago Rodríguez
        </h1>
        <p className="text-sm text-territory-neutral">
          Canjea tus puntos y méritos territoriales por cupones, productos y descuentos en establecimientos de Sabaneta, Monción y Los Almácigos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rewards.map((reward) => {
          const code = redeemedCodes[reward.id];
          const isRedeeming = redeemingId === reward.id;
          const isOutOfStock = reward.stock <= 0;
          const diff = formatDifficulty(reward.difficulty_tier);

          return (
            <div
              key={reward.id}
              className={`bg-surface rounded-lg border p-5 transition-all shadow-subtle flex flex-col justify-between ${
                code ? "border-amber-300 bg-amber-50/20" : "border-border hover:shadow-floating"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${diff.color}`}>
                    Tier {diff.label}
                  </span>
                  <span className={`text-xs font-semibold ${isOutOfStock ? "text-red-500" : "text-territory-neutral"}`}>
                    Stock: {reward.stock} {isOutOfStock && "(Agotado)"}
                  </span>
                </div>

                <div className="text-xs text-territory-nature font-medium mb-1">
                  {reward.business_name}
                </div>
                <h3 className="font-display font-bold text-base text-foreground mb-2">
                  {reward.title}
                </h3>
                <p className="text-xs text-territory-neutral mb-3 leading-relaxed">
                  {reward.description}
                </p>
              </div>

              <div>
                {/* Código de Canje Emitido */}
                {code ? (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 mb-2 text-center">
                    <div className="text-[11px] text-territory-mission font-medium mb-1">
                      ¡Voucher generado! Muestra este código en el local:
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-display font-bold text-lg tracking-wider text-foreground">
                        {code}
                      </span>
                      <button
                        onClick={() => handleCopyCode(code)}
                        className="p-1 hover:bg-amber-100 rounded text-territory-neutral"
                        title="Copiar código"
                      >
                        {copiedCode === code ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {errorMessage && errorMessage.id === reward.id && (
                      <div className="p-2 rounded bg-red-50 text-red-700 text-xs mb-2">
                        {errorMessage.text}
                      </div>
                    )}
                    <button
                      onClick={() => handleRedeemReward(reward)}
                      disabled={isOutOfStock || isRedeeming}
                      className="w-full py-2.5 rounded-md bg-foreground text-surface text-xs font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isRedeeming ? (
                        <span>Bloqueando canje en base de datos...</span>
                      ) : isOutOfStock ? (
                        <span>Agotado</span>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Canjear Beneficio</span>
                        </>
                      )}
                    </button>
                  </>
                )}
                <div className="text-[10px] text-territory-neutral/70 mt-2 text-center">
                  {reward.terms_conditions}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
