import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { WeeklyReportData, WeeklyKpis } from '../index';

// Colores de la marca (src/app/globals.css). Helvetica estándar: cubre tildes y eñes sin incrustar fuentes.
const C = { ink: '#111418', muted: '#5b616b', line: '#e6e8eb', brand: '#2f6feb', brandSoft: '#eaf1ff', ok: '#15803d', warn: '#8a5a00' };

const s = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 56, paddingHorizontal: 40, fontFamily: 'Helvetica', fontSize: 10, color: C.ink },
  band: { backgroundColor: C.brand, color: '#ffffff', padding: 18, borderRadius: 8, marginBottom: 18 },
  eyebrow: { fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.85 },
  title: { fontSize: 22, fontFamily: 'Helvetica-Bold', marginTop: 4 },
  subtitle: { fontSize: 11, marginTop: 4 },
  h2: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginTop: 18, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  card: { width: '33.33%', padding: 4 },
  cardInner: { borderWidth: 1, borderColor: C.line, borderRadius: 6, padding: 10 },
  cardValue: { fontSize: 18, fontFamily: 'Helvetica-Bold' },
  cardLabel: { fontSize: 9, color: C.muted, marginTop: 2 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 5, alignItems: 'center' },
  th: { fontFamily: 'Helvetica-Bold', color: C.muted, fontSize: 9 },
  barTrack: { height: 6, backgroundColor: C.brandSoft, borderRadius: 3, flexGrow: 1, marginHorizontal: 8 },
  bar: { height: 6, backgroundColor: C.brand, borderRadius: 3 },
  note: { fontSize: 9, color: C.muted, marginTop: 6 },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: C.muted },
});

const nf = new Intl.NumberFormat('es-DO');
const n = (v: number | null | undefined) => (v == null ? '—' : nf.format(v));
/**
 * Periodo legible: "21 – 27 de septiembre de 2026" o "28 de septiembre – 4 de octubre de 2026".
 * Son fechas civiles (sin hora): se formatean en UTC para no correrse de día.
 */
export function periodLabel(start: string, end: string) {
  const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-DO', { ...o, timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  const from = sameMonth ? fmt(start, { day: 'numeric' }) : fmt(start, { day: 'numeric', month: 'long', ...(sameYear ? {} : { year: 'numeric' }) });
  return `${from} – ${fmt(end, { day: 'numeric', month: 'long', year: 'numeric' })}`;
}
const hours = (h: number | null) => (h == null ? '—' : h < 48 ? `${nf.format(h)} h` : `${nf.format(Math.round((h / 24) * 10) / 10)} días`);

function Card({ value, label }: { value: string; label: string }) {
  return (
    <View style={s.card}>
      <View style={s.cardInner}>
        <Text style={s.cardValue}>{value}</Text>
        <Text style={s.cardLabel}>{label}</Text>
      </View>
    </View>
  );
}

function TrafficByType({ k, names }: { k: WeeklyKpis; names: Record<string, string> }) {
  const rows = Object.entries(k.traffic.by_type).sort((a, b) => b[1] - a[1]);
  if (rows.length === 0) return <Text style={s.note}>No se recibieron alertas de tránsito esta semana.</Text>;
  const max = Math.max(...rows.map(([, v]) => v));
  return (
    <View>
      {rows.map(([code, v]) => (
        <View key={code} style={s.row} wrap={false}>
          <Text style={{ width: 150 }}>{names[code] ?? code}</Text>
          <View style={s.barTrack}><View style={[s.bar, { width: `${Math.max((v / max) * 100, 2)}%` }]} /></View>
          <Text style={{ width: 40, textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>{n(v)}</Text>
        </View>
      ))}
    </View>
  );
}

const MUNI_COLS: { label: string; value: (k: WeeklyKpis) => number | null; width: number }[] = [
  { label: 'Alertas', value: (k) => k.traffic.received, width: 52 },
  { label: 'Publicadas', value: (k) => k.traffic.published, width: 58 },
  { label: 'Consultas', value: (k) => k.requests.received, width: 56 },
  { label: 'Resueltas', value: (k) => k.requests.resolved, width: 54 },
  { label: 'Abiertas', value: (k) => k.requests.open_now, width: 50 },
  { label: 'Negocios', value: (k) => k.businesses.submitted, width: 52 },
  { label: 'Usuarios', value: (k) => k.users.new, width: 50 },
];

/** Informe semanal (ARCHITECTURE.md §9.6). Todo sale del snapshot inmutable de esta ejecución. */
export function WeeklyReportDocument({ data, generatedAt }: { data: WeeklyReportData; generatedAt: Date }) {
  const province = data.snapshots.find((x) => x.municipality_id === null)?.metrics;
  const munis = data.snapshots.filter((x) => x.municipality_id !== null);
  if (!province) throw new Error('falta el snapshot provincial');
  const period = periodLabel(data.period_start, data.period_end);
  const stamp = new Intl.DateTimeFormat('es-DO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Santo_Domingo' }).format(generatedAt);
  const k = province;

  return (
    <Document title={`Informe semanal ${data.province_name} · ${period}`} author="SR Conecta" subject="Informe semanal de gestión municipal" language="es">
      <Page size="A4" style={s.page}>
        <View style={s.band}>
          <Text style={s.eyebrow}>SR Conecta · Informe semanal</Text>
          <Text style={s.title}>Provincia {data.province_name}</Text>
          <Text style={s.subtitle}>Semana del {period} · versión {data.version}{data.trigger === 'manual' ? ' (regenerada)' : ''}</Text>
        </View>

        <Text style={[s.h2, { marginTop: 0 }]}>Resumen de la semana</Text>
        <View style={s.grid}>
          <Card value={n(k.traffic.received)} label="Alertas de tránsito recibidas" />
          <Card value={n(k.traffic.published)} label="Alertas publicadas en el mapa" />
          <Card value={n(k.requests.received)} label="Consultas y reportes recibidos" />
          <Card value={n(k.requests.resolved)} label="Consultas resueltas" />
          <Card value={hours(k.requests.avg_resolution_hours)} label="Tiempo medio de resolución" />
          <Card value={n(k.requests.open_now)} label="Consultas abiertas al cierre" />
          <Card value={n(k.businesses.submitted)} label="Negocios registrados" />
          <Card value={n(k.users.new)} label="Personas nuevas" />
          <Card value={n(k.engagement.views)} label="Vistas de fichas" />
        </View>

        <Text style={s.h2}>Tránsito por tipo</Text>
        <TrafficByType k={k} names={data.traffic_types} />
        <Text style={s.note}>
          Rechazadas por moderación: {n(k.traffic.rejected)} · Fuera de la provincia: {n(k.traffic.out_of_area)}
        </Text>

        <Text style={s.h2}>Consultas más apoyadas por los vecinos</Text>
        {k.requests.top_supported.length === 0 ? (
          <Text style={s.note}>Ninguna consulta pública abierta tiene apoyos todavía.</Text>
        ) : (
          k.requests.top_supported.map((r, i) => (
            <View key={r.id} style={s.row} wrap={false}>
              <Text style={{ width: 18, color: C.muted }}>{i + 1}.</Text>
              <Text style={{ flexGrow: 1, flexShrink: 1 }}>{r.title}</Text>
              <Text style={{ width: 70, textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>{n(r.support_count)} {r.support_count === 1 ? 'apoyo' : 'apoyos'}</Text>
            </View>
          ))
        )}

        <Text style={s.h2}>Negocios y turismo</Text>
        <View style={s.grid}>
          <Card value={n(k.businesses.approved_total)} label="Negocios publicados" />
          <Card value={n(k.businesses.pending_now)} label="Negocios por revisar" />
          <Card value={n(k.tourism.places_published)} label="Lugares turísticos publicados" />
          <Card value={n(k.tourism.routes_published)} label="Rutas publicadas" />
          <Card value={n(k.tourism.proposals_pending)} label="Propuestas por revisar" />
          <Card value={n(k.requests.rejected)} label="Consultas rechazadas" />
        </View>

        <Footer stamp={stamp} />
      </Page>

      <Page size="A4" style={s.page}>
        <Text style={[s.h2, { marginTop: 0 }]}>Por municipio</Text>
        <View style={s.row}>
          <Text style={[s.th, { flexGrow: 1 }]}>Municipio</Text>
          {MUNI_COLS.map((c) => <Text key={c.label} style={[s.th, { width: c.width, textAlign: 'right' }]}>{c.label}</Text>)}
        </View>
        {munis.map((m) => (
          <View key={m.municipality_id} style={s.row} wrap={false}>
            <Text style={{ flexGrow: 1, flexShrink: 1 }}>{m.municipality_name}</Text>
            {MUNI_COLS.map((c) => <Text key={c.label} style={{ width: c.width, textAlign: 'right' }}>{n(c.value(m.metrics))}</Text>)}
          </View>
        ))}
        <View style={[s.row, { borderBottomWidth: 0 }]}>
          <Text style={{ flexGrow: 1, fontFamily: 'Helvetica-Bold' }}>Provincia</Text>
          {MUNI_COLS.map((c) => <Text key={c.label} style={{ width: c.width, textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>{n(c.value(k))}</Text>)}
        </View>
        <Text style={s.note}>
          La fila «Provincia» incluye además lo recibido fuera de los municipios (por ejemplo, alertas fuera del área) y puede no ser la suma exacta de las filas.
        </Text>

        <Text style={s.h2}>Cómo leer este informe</Text>
        <Text style={s.note}>
          Periodo de lunes a domingo en hora de República Dominicana. Las cifras salen de una foto fija tomada al generar esta versión:
          son las mismas que mostraba el panel en ese momento y no cambian aunque el panel siga actualizándose. Si se regenera, se crea
          una versión nueva y las anteriores se conservan. El informe contiene solo cifras agregadas, sin datos personales.
        </Text>
        <Footer stamp={stamp} />
      </Page>
    </Document>
  );
}

function Footer({ stamp }: { stamp: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>SR Conecta · generado el {stamp}</Text>
      <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </View>
  );
}
