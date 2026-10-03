'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Select } from '@/components/ui/form';
import { useToast } from '@/components/ui/toast';
import { reasonMessage } from '@/lib/vocabulary';
import { ActionButton } from '../_components/action-button';
import { grantRole, removeRole } from '../actions';

export function GrantForm({ people, municipalities, canGrantAdmin }: { people: { id: string; name: string }[]; municipalities: { id: string; name: string }[]; canGrantAdmin: boolean }) {
  const [person, setPerson] = useState(people[0]?.id ?? '');
  const [role, setRole] = useState<'moderator' | 'municipal_admin'>('moderator');
  const [muni, setMuni] = useState(municipalities[0]?.id ?? '');
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <div className="flex flex-col gap-3">
      <Field label="Persona">{(a) => <Select {...a} value={person} onChange={(e) => setPerson(e.target.value)}>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>}</Field>
      <Field label="Rol">
        {(a) => (
          <Select {...a} value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
            <option value="moderator">Moderación (revisa reportes y contenido)</option>
            {canGrantAdmin && <option value="municipal_admin">Administración municipal</option>}
          </Select>
        )}
      </Field>
      <Field label="Municipio">{(a) => <Select {...a} value={muni} onChange={(e) => setMuni(e.target.value)}>{municipalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>}</Field>
      <Button
        loading={pending}
        disabled={!person || !muni}
        onClick={() =>
          start(async () => {
            const r = await grantRole(person, role, muni);
            toast.show(r.status === 'ok' ? 'Rol asignado.' : reasonMessage(r.reason), r.status === 'ok' ? 'ok' : 'error');
            router.refresh();
          })
        }
      >
        Dar el rol
      </Button>
    </div>
  );
}

export function RevokeButton({ userId, role, municipalityId, name }: { userId: string; role: 'moderator' | 'municipal_admin'; municipalityId: string; name: string }) {
  return (
    <ActionButton
      label="Quitar"
      done={`Se quitó el rol a ${name}.`}
      variant="ghost"
      run={() => removeRole(userId, role, municipalityId)}
    />
  );
}
