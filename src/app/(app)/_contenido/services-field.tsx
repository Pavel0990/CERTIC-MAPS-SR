'use client';

/** Casillas de servicios (parqueo, baños…) para editar un lugar o una ruta. */
export function ServicesField({ options, value, onChange }: { options: Record<string, string>; value: Record<string, boolean>; onChange: (v: Record<string, boolean>) => void }) {
  return (
    <fieldset>
      <legend className="text-[15px] font-semibold">Servicios <span className="font-normal text-subtle">(marca los que hay)</span></legend>
      <div className="mt-2 grid grid-cols-2 gap-1">
        {Object.entries(options).map(([key, label]) => (
          <label key={key} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[12px] p-2 hover:bg-canvas">
            <input type="checkbox" checked={!!value[key]} onChange={(e) => onChange({ ...value, [key]: e.target.checked })} className="size-6 shrink-0 accent-[#2f6feb]" />
            <span className="font-semibold">{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
