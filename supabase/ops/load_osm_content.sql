-- =====================================================================
-- SR Conecta · Contenido REAL de la provincia desde OpenStreetMap
-- Generado por data/import-osm-content.mjs. No editar a mano.
-- Datos © colaboradores de OpenStreetMap, ODbL 1.0 (https://www.openstreetmap.org/copyright).
-- 84 negocios, 19 lugares turísticos y 3 rutas trazadas sobre caminos reales.
-- Idempotente (upsert por slug). Los registros llevan "-osm" en el slug.
-- Lo que cae fuera de los municipios de la provincia se descarta.
-- Uso: npx supabase db query --linked -f supabase/ops/load_osm_content.sql
-- =====================================================================

-- Categorías que faltaban para lo que hay en la provincia (editables en Panel → Catálogos)
insert into public.business_categories (slug, name, icon, sort) values
  ('gasolinera', 'Gasolinera', 'fuel', 75),
  ('banco', 'Bancos y cooperativas', 'landmark', 77)
on conflict (slug) do nothing;

with src (slug, name, category, label, lng, lat, phone, website) as (values
  ('club-centro-progresista-palmarejo-osmn3715353552', 'Club Centro Progresista Palmarejo', 'restaurante', 'Comida y bebida', -71.2636985, 19.3864782, null, null),
  ('bodega-rodrigue-tulo-osmn3832563027', 'Bodega Rodrigue ¨Tulo¨', 'colmado', 'Colmado o supermercado', -71.2649258, 19.387157, null, null),
  ('repuesto-estevez-osmn3832572437', 'Repuesto Estevez', 'servicios', 'Servicios', -71.2651769, 19.3868904, null, null),
  ('ney-pica-pollo-osmn4166685557', 'Ñey Pica Pollo', 'restaurante', 'Comida y bebida', -71.3423904, 19.475796, null, null),
  ('heladeria-bon-osmn4166685558', 'Heladeria Bon', 'cafeteria', 'Cafetería y heladería', -71.3423324, 19.4756477, null, null),
  ('esso-osmn4166685560', 'Esso', 'gasolinera', 'Estación de combustible', -71.3394203, 19.4776229, null, null),
  ('el-patio-restaurant-osmn4377990193', 'El Patio Restaurant', 'restaurante', 'Comida y bebida', -71.3422724, 19.4767476, '809-382-0294', null),
  ('el-ceron-osmn4600226891', 'El Cerón', 'restaurante', 'Comida y bebida', -71.1503783, 19.4106076, null, null),
  ('el-mediterraneo-osmn4600226892', 'El Mediterraneo', 'restaurante', 'Comida y bebida', -71.1505491, 19.4113222, null, null),
  ('banreservas-osmn4600227190', 'Banreservas', 'banco', 'Banco o cooperativa', -71.1508573, 19.4107816, null, null),
  ('colmado-el-mello-osmn4665691495', 'Colmado El Mello', 'colmado', 'Colmado o supermercado', -71.1609884, 19.4113377, null, null),
  ('estacion-isla-osmn4710577694', 'Estación Isla', 'gasolinera', 'Estación de combustible', -71.3207957, 19.4801476, null, null),
  ('farmacia-ananias-osmn4710625494', 'Farmacia Ananías', 'salud', 'Salud', -71.4380026, 19.4108471, '809-579-0387', null),
  ('banco-ademi-osmn4710625598', 'Banco Ademi', 'banco', 'Banco o cooperativa', -71.3455717, 19.4755101, null, null),
  ('texaco-osmn4710625599', 'Texaco', 'gasolinera', 'Estación de combustible', -71.3396391, 19.476512, null, null),
  ('texaco-osmn4710663589', 'Texaco', 'gasolinera', 'Estación de combustible', -71.4378245, 19.4107258, null, null),
  ('variedades-malgo-osmn4728288490', 'Variedades Malgó', 'otro', 'Tienda', -71.4426662, 19.408231, null, null),
  ('banreservas-osmn4728288491', 'Banreservas', 'banco', 'Banco o cooperativa', -71.4413868, 19.4079428, null, null),
  ('petronan-osmn4728288492', 'Petronan', 'gasolinera', 'Estación de combustible', -71.3507671, 19.4722202, null, null),
  ('estacion-esso-la-novia-de-villa-osmn4728383089', 'Estación Esso La Novia de Villa', 'gasolinera', 'Estación de combustible', -71.4443961, 19.4094719, null, null),
  ('ferreteria-l-n-osmn4728383090', 'Ferretería L&N', 'servicios', 'Servicios', -71.444111, 19.4090874, '809-579-0197', null),
  ('nelson-racing-osmn4728383189', 'Nelson Racing', 'servicios', 'Servicios', -71.4445903, 19.4100888, null, null),
  ('ecopetroleo-osmn4728383190', 'EcoPetróleo', 'gasolinera', 'Estación de combustible', -71.361556, 19.4601531, null, null),
  ('coopsano-club-osmn4728383191', 'Coopsano Club', 'banco', 'Banco o cooperativa', -71.3601317, 19.4620761, null, null),
  ('supermercado-baez-osmn4728383989', 'Supermercado Báez', 'colmado', 'Colmado o supermercado', -71.4411142, 19.4079221, '809-579-0125', null),
  ('pinturas-reservas-osmn4728384189', 'Pinturas Reservas', 'servicios', 'Servicios', -71.4411832, 19.4078125, null, null),
  ('coopbueno-osmn4728384389', 'CoopBueno', 'banco', 'Banco o cooperativa', -71.4406148, 19.4083685, null, null),
  ('cabanas-turisticas-dominicantica-spanish-osmn4728384589', 'Cabañas Turísticas Dominicantica Spanish', 'hotel', 'Alojamiento', -71.3606088, 19.4611728, null, null),
  ('aferme-gas-osmn4728384889', 'Aferme Gas', 'gasolinera', 'Estación de combustible', -71.3591765, 19.4625857, null, null),
  ('ferreteria-genere-osmn4740497215', 'Ferretería Genere', 'servicios', 'Servicios', -71.3412896, 19.4775797, null, null),
  ('caribe-express-osmn4740497219', 'Caribe Express', 'servicios', 'Servicios', -71.3403324, 19.4777218, null, null),
  ('laboratorio-clinico-rodriguez-taveras-osmn4740503062', 'Laboratorio Clínico Rodríguez Taveras', 'salud', 'Salud', -71.3407128, 19.4775456, null, null),
  ('electronica-j-e-osmn4740503065', 'Electrónica J&E', 'servicios', 'Servicios', -71.3406335, 19.4775659, null, null),
  ('d-laura-osmn4740503067', 'D''Laura', 'cafeteria', 'Cafetería y heladería', -71.3405658, 19.4775707, null, null),
  ('r-m-computer-osmn4740503070', 'R&M Computer', 'servicios', 'Servicios', -71.3405105, 19.4775777, null, null),
  ('salon-bucles-osmn4740503072', 'Salón Bucles', 'servicios', 'Servicios', -71.3404348, 19.4775936, null, null),
  ('supermercado-leduc-osmn4740504244', 'Supermercado Leduc', 'colmado', 'Colmado o supermercado', -71.3284808, 19.4805597, '809-580-9224', null),
  ('heladeia-cafeteria-uvis-osmn4834488422', 'Heladeia Cafeteria Uvis', 'cafeteria', 'Cafetería y heladería', -71.1509583, 19.4107881, null, null),
  ('tienda-20-10-osmn4888134321', 'Tienda 20 & 10', 'otro', 'Tienda', -71.1507969, 19.4107687, '809-977-2010', null),
  ('hotel-metropolitano-osmn5047214658', 'Hotel Metropolitano', 'hotel', 'Alojamiento', -71.3445847, 19.4756214, null, null),
  ('centro-medico-gran-poder-de-dios-osmn5047231120', 'Centro Medico Gran Poder de Dios', 'salud', 'Salud', -71.3420931, 19.4767403, null, null),
  ('banco-adopem-osmn5047233728', 'Banco ADOPEM', 'banco', 'Banco o cooperativa', -71.3440547, 19.4758495, null, null),
  ('asociacion-la-nacional-osmn5047234529', 'Asociacion la Nacional', 'banco', 'Banco o cooperativa', -71.3439298, 19.4772703, null, null),
  ('hotel-marien-osmn5047235080', 'Hotel Marién', 'hotel', 'Alojamiento', -71.3397385, 19.4778461, null, null),
  ('hotel-don-chucho-osmn5047235081', 'Hotel Don Chucho', 'hotel', 'Alojamiento', -71.3391566, 19.4777027, null, null),
  ('banco-agricola-osmn5047237705', 'Banco AGRICOLA', 'banco', 'Banco o cooperativa', -71.3387462, 19.4779599, null, null),
  ('coopsano-osmn5047239036', 'Coopsano', 'banco', 'Banco o cooperativa', -71.3384187, 19.4782968, null, null),
  ('hotel-la-plaza-osmn5047243323', 'Hotel la Plaza', 'hotel', 'Alojamiento', -71.332176, 19.4802544, null, null),
  ('la-hacienda-bar-restaurante-osmn5108011934', 'La Hacienda Bar & Restaurante', 'restaurante', 'Comida y bebida', -71.328311, 19.469532, '809-382-0294', null),
  ('banreservas-osmn5229212724', 'Banreservas', 'banco', 'Banco o cooperativa', -71.343925, 19.4762417, null, null),
  ('comedor-peralta-osmn5406065922', 'Comedor peralta', 'restaurante', 'Comida y bebida', -71.151881, 19.4113951, null, null),
  ('hospital-regional-osmn6573843588', 'Hospital Regional', 'salud', 'Salud', -71.3416197, 19.4782191, null, null),
  ('doble-aa-osmn6573858889', 'Doble AA', 'colmado', 'Colmado o supermercado', -71.342256, 19.4773564, null, null),
  ('chao-osmn6573858891', 'chao', 'cafeteria', 'Cafetería y heladería', -71.3439128, 19.4759147, null, null),
  ('gran-poder-de-dios-osmn6573858892', 'Gran Poder de Dios', 'salud', 'Salud', -71.3409857, 19.476645, null, null),
  ('el-mosquito-osmn6573858893', 'El Mosquito', 'servicios', 'Servicios', -71.3947546, 19.4332282, null, null),
  ('el-gordo-osmn6573859585', 'El Gordo', 'restaurante', 'Comida y bebida', -71.3373539, 19.4750718, null, null),
  ('zona-digital-osmn6907159728', 'Zona Digital', 'servicios', 'Servicios', -71.342604, 19.4772633, null, null),
  ('villa-paula-osmn10262424309', 'Villa Paula', 'hotel', 'Alojamiento', -71.3086971, 19.4830449, null, null),
  ('clinica-villafana-jimenez-osmn11618613790', 'Clínica Villafaña Jiménez', 'salud', 'Salud', -71.3383622, 19.4780565, '809-580-2480', null),
  ('helados-bon-osmn13568200952', 'Helados Bon', 'cafeteria', 'Cafetería y heladería', -71.150489, 19.4112448, null, null),
  ('helados-splash-osmn13568200961', 'Helados Splash', 'cafeteria', 'Cafetería y heladería', -71.1507391, 19.411126, null, null),
  ('hospital-regional-villa-los-almacigos-osmw688997805', 'Hospital Regional Villa Los Almácigos', 'salud', 'Salud', -71.4437535, 19.4105901, null, null),
  ('hospital-general-santiago-rodriguez-osmw689224699', 'Hospital General Santiago Rodríguez', 'salud', 'Salud', -71.3418717, 19.4787053, null, null),
  ('hospital-municipal-de-moncion-osmw1177064538', 'Hospital Municipal de Monción', 'salud', 'Salud', -71.1619108, 19.4101896, null, null),
  ('ecopetroleo-osmw1177064540', 'EcoPetróleo', 'gasolinera', 'Estación de combustible', -71.1635629, 19.4135697, null, null),
  ('texaco-osmw1177064543', 'Texaco', 'colmado', 'Colmado o supermercado', -71.156974, 19.4119056, null, null),
  ('clinica-dr-morel-osmw1359382093', 'Clínica Dr. Morel', 'salud', 'Salud', -71.1550734, 19.4112653, null, null),
  ('cooperativa-mamoncito-osmw1359382135', 'Cooperativa Mamoncito', 'banco', 'Banco o cooperativa', -71.1509356, 19.4105535, null, null),
  ('farmacia-moncion-osmw1359382137', 'Farmacia Monción', 'salud', 'Salud', -71.1506696, 19.4103392, null, null),
  ('el-patio-osmw1359382138', 'El Patio', 'restaurante', 'Comida y bebida', -71.1505072, 19.4105558, null, null),
  ('supermercado-espinal-osmw1359507522', 'Supermercado Espinal', 'colmado', 'Colmado o supermercado', -71.1517791, 19.4109687, null, null),
  ('colmado-radame-osmw1359507526', 'Colmado Radame', 'colmado', 'Colmado o supermercado', -71.1492004, 19.4144656, null, null),
  ('comedor-magalis-osmw1359716292', 'Comedor Magalis', 'restaurante', 'Comida y bebida', -71.1633948, 19.4188628, null, null),
  ('farmacia-moncion-osmw1359717645', 'Farmacia Moncion', 'salud', 'Salud', -71.1624657, 19.410605, null, null),
  ('colmado-el-manguito-osmw1360245106', 'Colmado El Manguito', 'colmado', 'Colmado o supermercado', -71.1522245, 19.410755, null, null),
  ('tienda-madera-osmw1360245107', 'Tienda Madera', 'otro', 'Tienda', -71.1524237, 19.4108134, null, null),
  ('d-amigos-cafe-osmw1360245111', 'D''Amigos Café', 'restaurante', 'Comida y bebida', -71.1529631, 19.4113568, null, null),
  ('danilo-food-truck-osmw1360245154', 'Danilo Food Truck', 'restaurante', 'Comida y bebida', -71.1505978, 19.4105784, null, null),
  ('el-pollo-comida-rapida-osmw1360245155', 'El Pollo Comida Rapida', 'restaurante', 'Comida y bebida', -71.1506945, 19.4116686, null, null),
  ('almacen-ferreteria-reyes-osmw1360245156', 'Almacén Ferretería Reyes', 'servicios', 'Servicios', -71.1518627, 19.4116439, '809-579-0682', null),
  ('farmacia-moncion-osmw1361565200', 'Farmacia Monción', 'salud', 'Salud', -71.1554962, 19.4101032, null, null),
  ('ferreteria-las-heneas-osmw1372208532', 'Ferreteria Las Heneas', 'servicios', 'Servicios', -71.1630803, 19.4090035, null, null),
  ('repuestos-ivan-osmw1479036744', 'Repuestos Ivan', 'servicios', 'Servicios', -71.1500061, 19.4114575, null, null)
), located as (
  select s.*, l.municipality_id, l.province_id, m.name as muni,
         extensions.st_setsrid(extensions.st_point(s.lng, s.lat), 4326) as geom
  from src s
  cross join lateral private.locate(extensions.st_setsrid(extensions.st_point(s.lng, s.lat), 4326)) l
  join public.municipalities m on m.id = l.municipality_id
)
insert into public.businesses (province_id, municipality_id, category_id, slug, name, description, geom, phone, website, status)
select l.province_id, l.municipality_id, c.id, l.slug, l.name,
       l.label || ' en ' || l.muni || '. Datos de OpenStreetMap: si es tu negocio, regístralo en SR Conecta para completar horario, fotos y contacto.',
       l.geom, l.phone, l.website, 'approved'
from located l join public.business_categories c on c.slug = l.category
on conflict (province_id, slug) do update
  set name = excluded.name, category_id = excluded.category_id, geom = excluded.geom,
      phone = coalesce(public.businesses.phone, excluded.phone), website = coalesce(public.businesses.website, excluded.website);

with src (slug, name, kind, label, lng, lat, opening) as (values
  ('iglesia-de-las-mercedes-osmn2037619928', 'Iglesia De Las Mercedes', 'cultural', 'Templo', -71.341219, 19.4756564, null),
  ('capilla-san-pedro-osmn3715356481', 'Capilla San Pedro', 'cultural', 'Templo', -71.2640817, 19.3863381, null),
  ('rotonda-de-cepillo-osmn4665755594', 'Rotonda de Cepillo', 'historico', 'Monumento', -71.165087, 19.4150598, null),
  ('monumento-moncion-osmn13568229710', 'Monumento Moncion', 'historico', 'Monumento', -71.164628, 19.4244933, null),
  ('monumento-a-cristo-osmn13568229711', 'Monumento a Cristo', 'historico', 'Monumento', -71.1646349, 19.4248809, null),
  ('parador-fotografico-mata-del-jobo-osmn14100122920', 'Parador Fotográfico Mata del Jobo', 'mirador', 'Parador fotográfico', -71.3111387, 19.453749, null),
  ('parador-fotografico-caimito-osmn14100139568', 'Parador Fotográfico Caimito', 'mirador', 'Parador fotográfico', -71.2823441, 19.4957868, null),
  ('parque-central-osmw415676032', 'Parque Central', 'cultural', 'Parque', -71.341797, 19.4756636, null),
  ('parque-central-de-moncion-osmw493307705', 'Parque Central de Monción', 'cultural', 'Parque', -71.1501753, 19.4108604, null),
  ('iglesia-catolica-de-moncion-osmw493307800', 'Iglesia Católica de Monción', 'cultural', 'Templo', -71.1498975, 19.4108083, null),
  ('reserva-forestal-alto-mao-osmw728271897', 'Reserva Forestal Alto Mao', 'naturaleza', 'Área natural protegida', -71.2415846, 19.3221547, null),
  ('parque-nacional-nalga-de-maco-osmw728271899', 'Parque Nacional Nalga de Maco', 'naturaleza', 'Área natural protegida', -71.4747693, 19.2397286, null),
  ('reserva-forestal-rio-cana-osmw728275584', 'Reserva Forestal Río Cana', 'naturaleza', 'Área natural protegida', -71.2418241, 19.5719708, null),
  ('parque-nacional-piky-lora-osmw740592842', 'Parque Nacional Piky Lora', 'naturaleza', 'Área natural protegida', -71.0218452, 19.4360497, null),
  ('parque-barrio-nuevo-osmw1177064537', 'Parque Barrio Nuevo', 'cultural', 'Parque', -71.1629972, 19.4109928, null),
  ('parque-las-flores-osmw1177064566', 'Parque Las Flores', 'cultural', 'Parque', -71.1497069, 19.4092894, null),
  ('parque-nacional-jose-armando-bermudez-osmr10078631', 'Parque Nacional José Armando Bermúdez', 'naturaleza', 'Área natural protegida', -71.1204413, 19.1539203, null),
  ('presa-de-moncion-osmw49190186', 'Presa de Monción', 'naturaleza', 'Presa y embalse', -71.1190648, 19.4056983, null),
  ('contraembalse-moncion-osmw366125649', 'Contraembalse Moncion', 'naturaleza', 'Presa y embalse', -71.0804595, 19.4665411, null)
), located as (
  select s.*, l.municipality_id, l.province_id, m.name as muni,
         extensions.st_setsrid(extensions.st_point(s.lng, s.lat), 4326) as geom
  from src s
  cross join lateral private.locate(extensions.st_setsrid(extensions.st_point(s.lng, s.lat), 4326)) l
  join public.municipalities m on m.id = l.municipality_id
)
insert into public.tourism_places (province_id, municipality_id, slug, name, kind, description, opening_info, geom, status)
select l.province_id, l.municipality_id, l.slug, l.name, l.kind,
       l.label || ' en ' || l.muni || '. Ubicación de OpenStreetMap; la descripción la completa el municipio desde el panel.',
       l.opening, l.geom, 'published'
from located l
on conflict (province_id, slug) do update set name = excluded.name, kind = excluded.kind, geom = excluded.geom;

with src (slug, name, kind, difficulty, duration_min, description, geojson) as (values
  ('moncion-presa-osm', 'De Monción a la Presa', 'ecologica', 'baja', 60, 'Caminata desde el Parque Central de Monción hasta la Presa de Monción, sobre el río Mao. El trazado sigue calles y caminos que existen en OpenStreetMap; conviene validarlo con el municipio antes de recomendarlo.', '{"type":"MultiLineString","coordinates":[[[-71.150208,19.410864],[-71.150093,19.410842],[-71.150117,19.410658],[-71.149703,19.410597],[-71.149661,19.410591],[-71.149666,19.410553],[-71.148633,19.410401],[-71.148594,19.410396],[-71.148546,19.410386],[-71.148357,19.410347],[-71.148233,19.41034],[-71.148016,19.410369],[-71.147702,19.410431],[-71.147286,19.410512],[-71.146955,19.409349],[-71.146782,19.409336],[-71.146472,19.409267],[-71.145925,19.409145],[-71.145225,19.408989],[-71.143598,19.40881],[-71.143308,19.408688],[-71.142604,19.407963],[-71.142156,19.407488],[-71.141798,19.407149],[-71.14158,19.407065],[-71.141094,19.407078],[-71.139748,19.407151],[-71.137705,19.407086],[-71.13646,19.407086],[-71.136301,19.407109],[-71.135543,19.407427],[-71.135367,19.40748],[-71.134393,19.407357],[-71.134263,19.407311],[-71.133271,19.406959],[-71.132836,19.406779],[-71.132575,19.406555],[-71.132418,19.406172],[-71.132399,19.405873],[-71.132335,19.405619],[-71.132169,19.405402],[-71.131377,19.405052],[-71.130966,19.405015],[-71.130423,19.405077],[-71.129683,19.404947],[-71.128974,19.404849],[-71.128418,19.404562],[-71.128159,19.404275],[-71.127536,19.403594],[-71.127262,19.403513],[-71.126873,19.403462],[-71.126337,19.403407],[-71.126081,19.403486],[-71.125885,19.403656],[-71.125638,19.403908],[-71.125494,19.404057],[-71.125344,19.404285],[-71.125036,19.404526],[-71.124812,19.404652],[-71.124577,19.404758],[-71.124411,19.404915],[-71.124362,19.405049],[-71.124318,19.405409],[-71.124181,19.405731],[-71.124063,19.405861],[-71.123804,19.405921],[-71.123281,19.406045],[-71.123215,19.406046],[-71.122985,19.405928],[-71.122328,19.405595],[-71.122008,19.405447],[-71.121901,19.405454],[-71.121824,19.405507],[-71.121751,19.405567],[-71.121599,19.405731],[-71.121535,19.405792],[-71.120701,19.406613],[-71.120595,19.406723],[-71.120416,19.40688],[-71.120351,19.406905],[-71.120277,19.40691],[-71.12018,19.406873],[-71.120055,19.406808],[-71.119069,19.405725]]]}'),
  ('sabaneta-mata-del-jobo-osm', 'Sabaneta al Parador de Mata del Jobo', 'cultural', 'baja', 70, 'Recorrido desde el Parque Central de San Ignacio de Sabaneta hasta el Parador Fotográfico de Mata del Jobo. El trazado sigue calles y caminos que existen en OpenStreetMap; conviene validarlo con el municipio antes de recomendarlo.', '{"type":"MultiLineString","coordinates":[[[-71.341849,19.476013],[-71.341481,19.476065],[-71.341299,19.475407],[-71.34106,19.475475],[-71.340899,19.47552],[-71.339978,19.475804],[-71.339913,19.475824],[-71.339418,19.475987],[-71.339315,19.476021],[-71.339249,19.476042],[-71.338662,19.476222],[-71.338482,19.476276],[-71.338396,19.476281],[-71.338312,19.47624],[-71.338156,19.476103],[-71.337795,19.475775],[-71.337579,19.475483],[-71.337411,19.475265],[-71.337221,19.475056],[-71.336766,19.47473],[-71.336607,19.474693],[-71.336368,19.474628],[-71.335714,19.474344],[-71.335498,19.474311],[-71.335267,19.474293],[-71.335004,19.474325],[-71.334446,19.474505],[-71.334315,19.474529],[-71.334193,19.474421],[-71.333987,19.474022],[-71.333792,19.473678],[-71.333533,19.473418],[-71.333069,19.473206],[-71.33281,19.473119],[-71.332688,19.473051],[-71.332591,19.472938],[-71.332469,19.472784],[-71.332334,19.472613],[-71.332067,19.472378],[-71.331864,19.472201],[-71.33173,19.472084],[-71.331561,19.471937],[-71.330891,19.471397],[-71.329946,19.470611],[-71.328875,19.469652],[-71.328641,19.46947],[-71.328288,19.469035],[-71.327985,19.468677],[-71.327823,19.468463],[-71.327572,19.468188],[-71.327306,19.467805],[-71.326781,19.467383],[-71.32626,19.467063],[-71.326207,19.467034],[-71.326052,19.466938],[-71.32566,19.466882],[-71.325412,19.466873],[-71.325248,19.466913],[-71.325074,19.466955],[-71.324694,19.467137],[-71.324472,19.46727],[-71.324222,19.467399],[-71.323808,19.467558],[-71.323419,19.467702],[-71.323142,19.467778],[-71.322757,19.46786],[-71.322648,19.467883],[-71.322481,19.467917],[-71.32197,19.467958],[-71.321959,19.467959],[-71.321251,19.467959],[-71.321012,19.467927],[-71.320834,19.467878],[-71.320468,19.467778],[-71.320254,19.467705],[-71.320093,19.467629],[-71.319949,19.46754],[-71.31963,19.467318],[-71.319567,19.467268],[-71.319454,19.467181],[-71.319216,19.467008],[-71.319038,19.466867],[-71.318905,19.466734],[-71.318863,19.466681],[-71.318694,19.466485],[-71.318535,19.466273],[-71.318463,19.466163],[-71.318399,19.466003],[-71.318377,19.465967],[-71.318324,19.465859],[-71.318277,19.465778],[-71.317697,19.465014],[-71.3175,19.464786],[-71.317439,19.464702],[-71.316906,19.46416],[-71.31685,19.46409],[-71.316781,19.463993],[-71.316714,19.463885],[-71.316492,19.463542],[-71.316306,19.463252],[-71.316278,19.463184],[-71.316239,19.463016],[-71.316136,19.462587],[-71.316063,19.462328],[-71.315952,19.461987],[-71.315681,19.461116],[-71.315453,19.460799],[-71.31517,19.460442],[-71.314955,19.460066],[-71.313569,19.457953],[-71.31324,19.45746],[-71.312936,19.456963],[-71.312655,19.456407],[-71.31222,19.455095],[-71.312099,19.454903],[-71.311901,19.454639],[-71.311669,19.454443],[-71.311418,19.45421],[-71.311132,19.453878],[-71.311028,19.453754]]]}'),
  ('sabaneta-caimito-osm', 'Sabaneta al Parador de Caimito', 'aventura', 'media', 111, 'Ruta larga desde el Parque Central de Sabaneta hasta el Parador Fotográfico de Caimito. El trazado sigue calles y caminos que existen en OpenStreetMap; conviene validarlo con el municipio antes de recomendarlo.', '{"type":"MultiLineString","coordinates":[[[-71.341849,19.476013],[-71.341481,19.476065],[-71.341299,19.475407],[-71.34106,19.475475],[-71.340899,19.47552],[-71.339978,19.475804],[-71.339913,19.475824],[-71.339418,19.475987],[-71.339315,19.476021],[-71.339249,19.476042],[-71.338662,19.476222],[-71.338482,19.476276],[-71.338396,19.476281],[-71.338312,19.47624],[-71.338156,19.476103],[-71.337795,19.475775],[-71.337579,19.475483],[-71.337411,19.475265],[-71.337221,19.475056],[-71.336766,19.47473],[-71.336607,19.474693],[-71.336368,19.474628],[-71.335714,19.474344],[-71.335498,19.474311],[-71.335267,19.474293],[-71.335004,19.474325],[-71.334446,19.474505],[-71.334315,19.474529],[-71.334106,19.474711],[-71.333835,19.474711],[-71.331182,19.475692],[-71.330255,19.475942],[-71.329924,19.476111],[-71.329921,19.476771],[-71.329946,19.477278],[-71.329816,19.477345],[-71.329468,19.477524],[-71.329229,19.477739],[-71.328969,19.477929],[-71.328765,19.47802],[-71.328094,19.47807],[-71.327636,19.478151],[-71.326907,19.478257],[-71.325603,19.478453],[-71.325678,19.478892],[-71.325749,19.479483],[-71.325061,19.479599],[-71.323354,19.479832],[-71.322772,19.479959],[-71.322219,19.480041],[-71.322287,19.480549],[-71.322294,19.480735],[-71.322023,19.480766],[-71.321365,19.480527],[-71.321411,19.480415],[-71.321242,19.480363],[-71.321192,19.480348],[-71.320832,19.480248],[-71.320764,19.480227],[-71.320328,19.480144],[-71.320077,19.48011],[-71.319767,19.480088],[-71.319397,19.480071],[-71.31885,19.480059],[-71.318306,19.480054],[-71.317693,19.480049],[-71.317379,19.48005],[-71.316918,19.480055],[-71.315925,19.480112],[-71.315456,19.480155],[-71.315214,19.480175],[-71.314752,19.480214],[-71.314324,19.480238],[-71.313846,19.480297],[-71.31362,19.480325],[-71.313382,19.480382],[-71.31309,19.480465],[-71.312433,19.480714],[-71.312116,19.480848],[-71.311852,19.480962],[-71.311581,19.481078],[-71.310821,19.481387],[-71.310433,19.481541],[-71.310144,19.48166],[-71.309838,19.481795],[-71.309539,19.481919],[-71.30903,19.482136],[-71.308639,19.482303],[-71.307857,19.482625],[-71.307347,19.482821],[-71.307098,19.4829],[-71.306795,19.482965],[-71.306626,19.48299],[-71.306309,19.483009],[-71.306005,19.483017],[-71.305789,19.483006],[-71.305308,19.482951],[-71.304991,19.482903],[-71.304617,19.48285],[-71.304338,19.482831],[-71.304141,19.482819],[-71.303916,19.482817],[-71.303584,19.482837],[-71.303194,19.482901],[-71.302664,19.48301],[-71.30211,19.483118],[-71.301539,19.48324],[-71.300946,19.483358],[-71.300794,19.483389],[-71.300368,19.483474],[-71.300228,19.483502],[-71.299593,19.483627],[-71.29833,19.483883],[-71.297622,19.484028],[-71.297301,19.484094],[-71.296852,19.484238],[-71.296521,19.484367],[-71.296261,19.484497],[-71.295889,19.484751],[-71.295361,19.485179],[-71.294801,19.485698],[-71.294273,19.486167],[-71.293859,19.486548],[-71.293236,19.487118],[-71.292696,19.487619],[-71.29215,19.488123],[-71.291732,19.488501],[-71.2913,19.488935],[-71.290163,19.490067],[-71.289834,19.490402],[-71.289303,19.490936],[-71.288253,19.491989],[-71.287954,19.492304],[-71.287491,19.492753],[-71.287014,19.493214],[-71.286786,19.493408],[-71.286652,19.493518],[-71.28648,19.493629],[-71.286225,19.493767],[-71.285968,19.493901],[-71.285513,19.494126],[-71.284857,19.494454],[-71.284138,19.494812],[-71.283844,19.494954],[-71.2835,19.495119],[-71.283118,19.495313],[-71.282522,19.495614],[-71.282264,19.495729]]]}')
), geo as (
  select s.*, extensions.st_setsrid(extensions.st_geomfromgeojson(s.geojson), 4326) as geom from src s
)
insert into public.eco_routes (province_id, municipality_id, slug, name, kind, difficulty, duration_min, description, geom, status)
select l.province_id, l.municipality_id, g.slug, g.name, g.kind, g.difficulty, g.duration_min, g.description, g.geom, 'published'
from geo g
cross join lateral private.locate(extensions.st_startpoint(extensions.st_geometryn(g.geom, 1))) l
where l.municipality_id is not null
on conflict (province_id, slug) do update
  set name = excluded.name, geom = excluded.geom, duration_min = excluded.duration_min, difficulty = excluded.difficulty, description = excluded.description;

select (select count(*) from public.businesses where slug like '%-osm%') as negocios_osm,
       (select count(*) from public.tourism_places where slug like '%-osm%') as lugares_osm,
       (select count(*) from public.eco_routes where slug like '%-osm%') as rutas_osm;
