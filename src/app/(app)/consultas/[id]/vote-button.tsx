'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ThumbsUp } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { reasonMessage } from '@/lib/vocabulary';
import { cn } from '@/utils/cn';

/** Apoyar una prioridad (F5 "voten prioridades"): un voto por persona; se puede quitar. */
export function VoteButton({ requestId, initialVoted, initialCount, signedIn }: { requestId: string; initialVoted: boolean; initialCount: number; signedIn: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [voted, setVoted] = useState(initialVoted);
  const [count, setCount] = useState(initialCount);
  const [pending, start] = useTransition();

  function toggle() {
    if (!signedIn) return router.push(`/entrar?next=/consultas/${requestId}`);
    const was = voted;
    setVoted(!was); // respuesta inmediata; se corrige si el servidor rechaza
    setCount((c) => c + (was ? -1 : 1));
    start(async () => {
      const r = await fetch(`/api/v1/requests/${requestId}/vote`, { method: 'POST' });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || body.status !== 'ok') {
        setVoted(was);
        setCount((c) => c + (was ? 1 : -1));
        toast.show(reasonMessage(body.reason), 'error');
        return;
      }
      if (typeof body.support_count === 'number') setCount(body.support_count);
      toast.show(body.voted ? 'Gracias por apoyar este reporte.' : 'Quitaste tu apoyo.');
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={voted}
      className={cn(
        'inline-flex h-13 min-h-[52px] shrink-0 items-center justify-center gap-2.5 whitespace-nowrap rounded-[14px] px-5 text-[16px] font-bold transition',
        voted ? 'bg-brand text-white hover:bg-brand-strong' : 'bg-brand-soft text-brand-strong hover:bg-[#dce8ff]',
      )}
    >
      <ThumbsUp className={cn('size-5', voted && 'fill-current')} aria-hidden />
      {voted ? 'Lo apoyas' : 'Yo también lo veo'}
      <span className="rounded-full bg-white/25 px-2 py-0.5 text-sm">{count}</span>
    </button>
  );
}
