import {
  Baby, Ban, Bike, Bus, Car, CarFront, Church, CircleAlert, CircleHelp, Coffee, Construction, Dog, Droplets, Dumbbell,
  Flame, Fuel, Hammer, HardHat, HeartPulse, Hotel, Landmark, Lightbulb, MessageCircleQuestion, MessageSquareWarning, Mountain, Music,
  Palette, PawPrint, Pill, School, Scissors, Shirt, ShieldAlert, ShoppingBasket, Signpost, Sparkles, Sprout, Store, Tractor,
  TrafficCone, Trash2, TreePine, UtensilsCrossed, Volume2, Waves, Wifi, Wrench, Zap, type LucideIcon,
} from 'lucide-react';

/**
 * Íconos de los catálogos (tipos de tránsito, categorías de reportes y de negocios).
 * La base guarda el nombre (columna `icon`); la administración lo elige en Panel → Catálogos.
 * Un nombre desconocido muestra el ícono de reserva de cada formulario.
 */
export const CATALOG_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  // Tránsito
  'car-crash': { icon: CarFront, label: 'Choque' },
  'road-block': { icon: Ban, label: 'Paso cerrado' },
  pothole: { icon: Construction, label: 'Bache u obra' },
  'traffic-light': { icon: TrafficCone, label: 'Señal o cono' },
  detour: { icon: Signpost, label: 'Desvío' },
  landslide: { icon: Mountain, label: 'Derrumbe' },
  flood: { icon: Waves, label: 'Agua o inundación' },
  cone: { icon: HardHat, label: 'Trabajos' },
  car: { icon: Car, label: 'Vehículo' },
  bus: { icon: Bus, label: 'Autobús' },
  bike: { icon: Bike, label: 'Bicicleta o motor' },
  fuel: { icon: Fuel, label: 'Combustible' },
  dog: { icon: Dog, label: 'Animal' },
  tractor: { icon: Tractor, label: 'Tractor' },
  // Reportes al municipio
  alert: { icon: CircleAlert, label: 'Alerta' },
  trash: { icon: Trash2, label: 'Basura' },
  lightbulb: { icon: Lightbulb, label: 'Luz' },
  hammer: { icon: Hammer, label: 'Reparación' },
  droplet: { icon: Droplets, label: 'Agua' },
  zap: { icon: Zap, label: 'Electricidad' },
  volume: { icon: Volume2, label: 'Ruido' },
  flame: { icon: Flame, label: 'Fuego' },
  shield: { icon: ShieldAlert, label: 'Seguridad' },
  tree: { icon: TreePine, label: 'Árbol o parque' },
  wifi: { icon: Wifi, label: 'Internet' },
  'help-circle': { icon: MessageCircleQuestion, label: 'Pregunta' },
  question: { icon: CircleHelp, label: 'Duda' },
  message: { icon: MessageSquareWarning, label: 'Queja' },
  'lightbulb-on': { icon: Sparkles, label: 'Idea' },
  school: { icon: School, label: 'Escuela' },
  // Negocios
  store: { icon: Store, label: 'Tienda' },
  'shopping-basket': { icon: ShoppingBasket, label: 'Colmado' },
  utensils: { icon: UtensilsCrossed, label: 'Comida' },
  coffee: { icon: Coffee, label: 'Café' },
  bed: { icon: Hotel, label: 'Alojamiento' },
  leaf: { icon: Sprout, label: 'Campo' },
  palette: { icon: Palette, label: 'Artesanía' },
  wrench: { icon: Wrench, label: 'Servicios' },
  landmark: { icon: Landmark, label: 'Banco' },
  pill: { icon: Pill, label: 'Farmacia' },
  heart: { icon: HeartPulse, label: 'Salud' },
  scissors: { icon: Scissors, label: 'Peluquería' },
  shirt: { icon: Shirt, label: 'Ropa' },
  dumbbell: { icon: Dumbbell, label: 'Deporte' },
  music: { icon: Music, label: 'Música' },
  church: { icon: Church, label: 'Iglesia' },
  baby: { icon: Baby, label: 'Niños' },
  paw: { icon: PawPrint, label: 'Mascotas' },
};

export function catalogIcon(name: string | null | undefined, fallback: LucideIcon): LucideIcon {
  return (name && CATALOG_ICONS[name]?.icon) || fallback;
}
