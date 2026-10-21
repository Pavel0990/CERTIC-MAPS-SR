'use client';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { cropAvatar, deleteAvatar, uploadAvatar } from '@/modules/media';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { reasonMessage } from '@/lib/vocabulary';
import { saveAvatar } from './actions';

/** Foto de perfil: se recorta y comprime en el teléfono (256×256 WebP) y se sube directo a su ruta fija. */
export function AvatarEditor({ userId, name, src }: { userId: string; name: string; src: string | null }) {
  const toast = useToast();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const shown = preview ?? src;

  const fail = (e: unknown) => toast.show(reasonMessage(e instanceof Error ? e.message : 'upload_failed'), 'error');

  function pick(file: File | undefined) {
    if (!file) return;
    start(async () => {
      try {
        const blob = await cropAvatar(file);
        const url = URL.createObjectURL(blob);
        setPreview((old) => { if (old) URL.revokeObjectURL(old); return url; }); // se ve al instante, mientras sube
        await uploadAvatar(userId, blob);
        const r = await saveAvatar(true);
        if (r.status === 'rejected') throw new Error(r.reason);
        toast.show('Foto actualizada.', 'ok');
        router.refresh();
      } catch (e) {
        setPreview(null);
        fail(e);
      } finally {
        if (input.current) input.current.value = '';
      }
    });
  }

  function remove() {
    start(async () => {
      try {
        await deleteAvatar(userId);
        const r = await saveAvatar(false);
        if (r.status === 'rejected') throw new Error(r.reason);
        setPreview(null);
        toast.show('Quitamos tu foto.', 'ok');
        router.refresh();
      } catch (e) {
        fail(e);
      }
    });
  }

  return (
    <Card className="flex flex-col items-center gap-4 p-5 text-center sm:flex-row sm:text-left">
      <div className="relative">
        <Avatar src={shown} name={name} size={88} priority className={pending ? 'opacity-60 transition-opacity' : 'transition-opacity'} />
        <span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full border-2 border-surface bg-brand text-white" aria-hidden>
          <Camera className="size-4" />
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="text-lg font-bold">Tu foto</h2>
        <p className="text-[15px] text-muted">La ves tú y el personal del municipio. Nunca sale en el mapa público.</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Button icon={<Camera className="size-4" />} loading={pending} onClick={() => input.current?.click()}>
            {shown ? 'Cambiar foto' : 'Poner una foto'}
          </Button>
          {shown && (
            <Button variant="ghost" icon={<Trash2 className="size-4" />} disabled={pending} onClick={remove}>
              Quitar
            </Button>
          )}
        </div>
        <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => pick(e.target.files?.[0])} />
      </div>
    </Card>
  );
}
