'use client';
import { useEffect, useEffectEvent } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';

export interface TrafficBroadcast {
  id: string;
  type: string;
  severity: number;
  status: string;
  lat: number;
  lng: number;
  expires_at: string;
}

/**
 * Alertas de tránsito en vivo (ADR-012): canal Broadcast público `traffic:{province_id}`.
 * El trigger traffic_reports_broadcast emite solo datos públicos (sin autor ni fotos).
 * Si el canal cae, quien lo use debe seguir pidiendo el viewport cada 60 s.
 */
export function useLiveTraffic(provinceId: string | null, onChange: (event: TrafficBroadcast) => void, onStatus?: (live: boolean) => void) {
  const emit = useEffectEvent((e: TrafficBroadcast) => onChange(e));
  const report = useEffectEvent((live: boolean) => onStatus?.(live));

  useEffect(() => {
    if (!provinceId) return;
    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`traffic:${provinceId}`, { config: { private: false } })
      .on('broadcast', { event: 'traffic_changed' }, ({ payload }) => emit(payload as TrafficBroadcast))
      .subscribe((s) => report(s === 'SUBSCRIBED'));
    return () => {
      report(false);
      void supabase.removeChannel(channel);
    };
  }, [provinceId]);
}

export const isLiveStatus = (status: string) => status === 'active' || status === 'verified';
