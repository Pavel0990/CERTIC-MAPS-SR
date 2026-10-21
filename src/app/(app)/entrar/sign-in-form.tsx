'use client';
import { useActionState, useState } from 'react';
import { MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { ErrorNote } from '@/components/ui/primitives';
import { requestAccess, verifyCode, type AuthState } from './actions';
import { HumanCheck, type CaptchaConfig } from './human-check';

/** `tries` cuenta los envíos: el captcha se vuelve a montar con cada uno porque su token sirve una sola vez. */
type SentState = AuthState & { tries: number };

export function SignInForm({ next, linkError, captcha }: { next: string; linkError: boolean; captcha?: CaptchaConfig }) {
  const [sent, send, sending] = useActionState<SentState, FormData>(
    async (prev, form) => ({ ...(await requestAccess(prev, form)), tries: prev.tries + 1 }),
    { step: 'email', tries: 0 },
  );
  const [checked, check, checking] = useActionState<AuthState, FormData>(verifyCode, { step: 'code' });
  const [haveCode, setHaveCode] = useState(false);
  const [typedEmail, setTypedEmail] = useState('');
  const email = sent.email ?? typedEmail;

  if (sent.step === 'code' || haveCode) {
    return (
      <div className="mt-8 flex flex-col gap-5">
        {sent.step === 'code' ? (
        <div className="flex gap-3 rounded-[16px] bg-ok-soft p-4 text-ok">
          <MailCheck className="mt-0.5 size-6 shrink-0" aria-hidden />
          <div className="text-[16px]">
            <p className="font-bold">Te enviamos un correo a {email}</p>
            <p className="mt-1 text-ink">
              Ábrelo en este teléfono y toca <strong>Entrar</strong>. Si el correo trae un código, escríbelo aquí abajo.
            </p>
          </div>
        </div>
        ) : (
          <p className="text-[16px] text-muted">Escribe tu correo y el código que te llegó.</p>
        )}
        <form action={check} className="flex flex-col gap-4">
          {sent.step === 'code' ? (
            <input type="hidden" name="email" value={email} />
          ) : (
            <Field label="Tu correo electrónico">
              {(a) => <Input {...a} name="email" type="email" inputMode="email" autoComplete="email" required value={typedEmail} onChange={(e) => setTypedEmail(e.target.value)} />}
            </Field>
          )}
          <input type="hidden" name="next" value={next} />
          <Field label="Código del correo" error={checked.error} hint="Son de 6 a 8 números.">
            {(a) => (
              <Input {...a} name="token" inputMode="numeric" autoComplete="one-time-code" maxLength={10} className="text-center text-2xl font-bold tracking-[0.3em]" />
            )}
          </Field>
          <Button type="submit" size="lg" block loading={checking}>
            Entrar
          </Button>
        </form>
        <form action={send} className="flex flex-col gap-3">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="next" value={next} />
          {captcha && <HumanCheck key={sent.tries} {...captcha} />}
          {sent.error && <ErrorNote>{sent.error}</ErrorNote>}
          <Button type="submit" variant="ghost" block loading={sending}>
            No me llegó: enviar otro correo
          </Button>
        </form>
        {sent.step === 'code' ? (
          <p className="text-sm text-muted">Revisa también la carpeta de spam o «Promociones».</p>
        ) : (
          <Button variant="ghost" block onClick={() => setHaveCode(false)}>
            Volver
          </Button>
        )}
      </div>
    );
  }

  return (
    <form action={send} className="mt-8 flex flex-col gap-4">
      {linkError && <ErrorNote>El enlace venció o ya se usó. Pide uno nuevo con tu correo.</ErrorNote>}
      <input type="hidden" name="next" value={next} />
      <Field label="Tu correo electrónico" error={sent.error}>
        {(a) => <Input {...a} name="email" type="email" inputMode="email" autoComplete="email" required placeholder="nombre@gmail.com" defaultValue={email} />}
      </Field>
      {captcha && <HumanCheck key={sent.tries} {...captcha} />}
      <Button type="submit" size="lg" block loading={sending}>
        Enviarme el correo para entrar
      </Button>
      <Button variant="secondary" block onClick={() => setHaveCode(true)}>
        Ya tengo un código
      </Button>
    </form>
  );
}
