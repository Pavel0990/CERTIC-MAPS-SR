'use client';
import { useTransition } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { reasonMessage } from '@/lib/vocabulary';
import { downloadReport } from '../actions';

/** Descarga auditada (ADR-021): registra la descarga y abre una URL firmada de 5 minutos. */
export function DownloadButton({ runId }: { runId: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <Button
      size="sm"
      variant="secondary"
      loading={pending}
      icon={<Download className="size-4" />}
      onClick={() =>
        start(async () => {
          const r = await downloadReport(runId);
          if (r.status === 'ok' && r.url) window.location.assign(r.url);
          else toast.show(reasonMessage(r.reason), 'error');
        })
      }
    >
      Descargar PDF
    </Button>
  );
}
