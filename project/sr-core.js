(function(){
const TILES={Voyager:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',Claro:'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'};
const SAT='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const I={
home:'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
map:'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
pulse:'M22 12h-4l-3 9L9 3l-3 9H2',
user:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
store:'M3 9l1.5-5h15L21 9M4 9v11h16V9M3 9h18M9 20v-6h6v6',
mountain:'M2 20 9 8l4 6 3-4 6 10z',
route:'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 15V9a4 4 0 0 1 4-4h2M18 9v6a4 4 0 0 1-4 4h-2',
alert:'M12 3 2 21h20zM12 10v5M12 18h.01',
gift:'M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z',
file:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6'
};
const TY={negocio:{c:'#2F6FEB',label:'Negocios',i:I.store},turismo:{c:'#16A34A',label:'Turismo',i:I.mountain},ruta:{c:'#0E9F9A',label:'Rutas',i:I.route},reporte:{c:'#E5484D',label:'Reportes',i:I.alert}};
// Ciclo de estados alineado con ARCHITECTURE.md §21.1: pending → under_review → approved → in_progress → resolved (→ archived, solo panel).
// rejected es terminal y solo se alcanza desde pending/under_review/approved.
const ST=[{k:'pending',t:'Recibido',c:'#4B5563',bg:'#F1F2F4'},{k:'under_review',t:'En revisión',c:'#92400E',bg:'#FEF3C7'},{k:'approved',t:'Aprobado',c:'#6D28D9',bg:'#EDE9FE'},{k:'in_progress',t:'En proceso',c:'#1D4ED8',bg:'#DBEAFE'},{k:'resolved',t:'Resuelto',c:'#15803D',bg:'#DCFCE7'}];
const ST_DONE=4,ST_LAST_REJECTABLE=2;
const REJ={k:'rejected',t:'Rechazado',c:'#B42318',bg:'#FEE4E2'};
const U={lat:19.4738,lng:-71.3402};
const MUNI={'Sabaneta':{lat:19.4752,lng:-71.3412,full:'San Ignacio de Sabaneta'},'Monción':{lat:19.4167,lng:-71.1680,full:'Monción'},'Los Almácigos':{lat:19.4110,lng:-71.4415,full:'Villa Los Almácigos'}};
const PLACES=[
{id:'presa',type:'turismo',tags:[],name:'Presa de Monción',cat:'Embalse · Mirador',lat:19.4335,lng:-71.1795,rating:4.8,reviews:1284,open:true,until:'todo el día',muni:'Monción',desc:'El gran espejo de agua del río Mao, rodeado de lomas. Miradores, pesca artesanal y los mejores atardeceres de la provincia.'},
{id:'parque',type:'turismo',tags:[],name:'Parque Duarte',cat:'Plaza · Centro',lat:19.4752,lng:-71.3412,rating:4.5,reviews:640,open:true,until:'todo el día',muni:'Sabaneta',desc:'Corazón de San Ignacio de Sabaneta. Punto de encuentro, mercado de fin de semana y conciertos al aire libre.'},
{id:'inaje',type:'turismo',tags:[],name:'Balneario Río Inaje',cat:'Río · Balneario',lat:19.4585,lng:-71.3585,rating:4.6,reviews:512,open:true,until:'cierra 6:00 p. m.',muni:'Sabaneta',desc:'Pozas de agua fría entre piedras y sombra, a diez minutos del centro de Sabaneta.'},
{id:'mirador',type:'turismo',tags:[],name:'Mirador Los Almácigos',cat:'Mirador · Montaña',lat:19.4165,lng:-71.4355,rating:4.7,reviews:298,open:true,until:'todo el día',muni:'Los Almácigos',desc:'Vista abierta sobre los valles de la Cordillera Central y los cafetales de la zona alta.'},
{id:'cafe',type:'negocio',tags:['cafe'],name:'Café Monción',cat:'Cafetería',lat:19.4168,lng:-71.1652,rating:4.8,reviews:356,open:true,until:'cierra 9:00 p. m.',muni:'Monción',promo:'10% de descuento en desayunos',desc:'Café de altura tostado en la provincia. Desayunos criollos, dulces de la casa y terraza frente a la calle principal.'},
{id:'casabe',type:'negocio',tags:['restaurante'],name:'Casabería Doña Mercedes',cat:'Casabe artesanal',lat:19.4128,lng:-71.1712,rating:4.9,reviews:421,open:true,until:'cierra 5:00 p. m.',muni:'Monción',desc:'Casabe de yuca hecho a mano en burén, como se hace en Monción desde hace generaciones. Visitas al taller por la mañana.'},
{id:'puente',type:'negocio',tags:['restaurante'],name:'Restaurante El Puente',cat:'Comida criolla',lat:19.4726,lng:-71.3448,rating:4.4,reviews:233,open:true,until:'cierra 10:00 p. m.',muni:'Sabaneta',promo:'15% de descuento de lunes a jueves',desc:'Cocina criolla de la región: chivo, locrio y dulces caseros junto al puente de entrada al pueblo.'},
{id:'hotel',type:'negocio',tags:['hotel'],name:'Hotel Sabaneta Plaza',cat:'Hotel',lat:19.4771,lng:-71.3381,rating:4.3,reviews:187,open:true,until:'recepción 24 h',muni:'Sabaneta',desc:'Hotel céntrico a una cuadra del parque. Punto de partida para rutas por los tres municipios.'},
{id:'lomita',type:'negocio',tags:['cafe'],name:'La Lomita Café',cat:'Cafetería',lat:19.4102,lng:-71.4418,rating:4.6,reviews:98,open:false,until:'abre 7:00 a. m.',muni:'Los Almácigos',desc:'Café de los productores de la zona alta, servido donde se cultiva.'}
];
const GN=[['Colmado',[]],['Farmacia',[]],['Ferretería',[]],['Panadería',['restaurante']],['Salón',[]],['Repostería',['restaurante']],['Taller',[]],['Cafetería',['cafe']],['Agroveterinaria',[]],['Heladería',['restaurante']]];
const GS=['El Cruce','San José','La Esquina','Los Hermanos','Doña Ana','El Progreso','Central','La Fe','Mi Pueblo','La Loma','Don Pedro','El Maizal'];
let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
const GEN=[];[['Sabaneta',22],['Monción',14],['Los Almácigos',9]].forEach(([m,n])=>{const c=MUNI[m];for(let i=0;i<n;i++){const g=GN[Math.floor(rnd()*GN.length)];GEN.push({id:'g'+GEN.length,gen:true,type:'negocio',tags:g[1],name:g[0]+' '+GS[Math.floor(rnd()*GS.length)],cat:g[0],lat:c.lat+(rnd()-.5)*.016,lng:c.lng+(rnd()-.5)*.018,rating:Math.round((4+rnd()*.8)*10)/10,reviews:10+Math.floor(rnd()*140),open:rnd()>.2,until:'cierra 8:00 p. m.',muni:m,desc:'Comercio de ejemplo · datos de demostración (ubicación y nombre generados).'})}});
const ROUTES=[
{id:'rcasabe',type:'ruta',tags:[],name:'Ruta del Casabe',cat:'Ruta cultural · 3 paradas',lat:19.4250,lng:-71.1745,muni:'Monción',pts:['presa','casabe','cafe']},
{id:'rinaje',type:'ruta',tags:[],name:'Sendero del Inaje',cat:'Senderismo · 2 paradas',lat:19.4668,lng:-71.3500,muni:'Sabaneta',pts:['parque','inaje']}
];
const R0=[
{id:'r1',num:1038,kind:'Bache',title:'Bache profundo',addr:'Calle Duarte esq. Restauración',lat:19.4744,lng:-71.3428,status:3,mine:true,muni:'Sabaneta',date:'18 sep',hist:['18 sep · 9:12 a. m.','18 sep · 2:40 p. m.','19 sep · 8:30 a. m.','20 sep · 8:05 a. m.',null]},
{id:'r2',num:1039,kind:'Alumbrado',title:'Poste sin luz',addr:'Av. Hermanas Mirabal',lat:19.4786,lng:-71.3366,status:0,mine:false,support:3,muni:'Sabaneta',date:'23 sep',hist:['23 sep · 7:48 p. m.',null,null,null,null]},
{id:'r3',num:1031,kind:'Basura',title:'Vertedero improvisado',addr:'Salida hacia Mao',lat:19.4190,lng:-71.1600,status:4,mine:true,muni:'Monción',date:'12 sep',hist:['12 sep · 10:02 a. m.','12 sep · 4:15 p. m.','12 sep · 5:00 p. m.','13 sep · 9:30 a. m.','15 sep · 1:20 p. m.']},
{id:'r4',num:1040,kind:'Semáforo',title:'Semáforo intermitente',addr:'Entrada Carretera Sabaneta–Dajabón',lat:19.4712,lng:-71.3355,status:1,mine:false,support:7,muni:'Sabaneta',date:'24 sep',hist:['24 sep · 8:10 a. m.','24 sep · 9:02 a. m.',null,null,null]},
{id:'r5',num:1036,kind:'Calle cerrada',title:'Derrumbe en camino vecinal',addr:'Camino a Los Cafetales',lat:19.4148,lng:-71.4460,status:1,mine:false,support:4,muni:'Los Almácigos',date:'21 sep',hist:['21 sep · 6:30 a. m.','21 sep · 11:10 a. m.',null,null,null]}
];
// Lista de tránsito según las bases (F4: accidentes, cierres, baches, semáforos dañados y desvíos).
// Tránsito (temporal, expira) y servicios municipales (seguimiento hasta resolverse) son flujos distintos (ARCHITECTURE.md §21).
const RTYPES_T=['Accidente','Calle cerrada','Bache','Semáforo','Desvío','Vía inundada'];
const RTYPES_M=['Basura','Alumbrado','Infraestructura','Otro'];
const PEND0=[
{id:'p1',kind:'Negocio',title:'Colmado El Cruce',sub:'Solicitud de registro · Monción'},
{id:'p2',kind:'Ruta',title:'Sendero Los Cafetales',sub:'Propuesta de ruta · Villa Los Almácigos'},
{id:'p3',kind:'Promoción',title:'La Lomita Café · 2x1 en café',sub:'Nueva promoción · Villa Los Almácigos'}
];
// Única fuente de verdad de los KPIs de demostración. Panel, actividad y PDF derivan de aquí; nada se escribe a mano en la vista.
// Semana 39: users, reports, res. Acumulado histórico: totReports, totRes. biz: negocios registrados (stock).
const MSTATS=[{k:'Sabaneta',users:126,reports:21,biz:22,res:15,totReports:67,totRes:40},{k:'Monción',users:78,reports:11,biz:13,res:9,totReports:39,totRes:23},{k:'Los Almácigos',users:39,reports:6,biz:6,res:5,totReports:22,totRes:13}];
// Actividad de hoy (valores fijos de demostración; antes era un contador aleatorio).
const TODAY={users:34,biz:8};
function wpx(lat,lng,z){const s=256*Math.pow(2,z),r=lat*Math.PI/180;return{x:(lng+180)/360*s,y:(1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*s};}
function tl(cx,cy,z,w,h,tpl){const o=[];const n=Math.pow(2,z);const x0=Math.floor((cx-w/2)/256),x1=Math.floor((cx+w/2-1)/256),y0=Math.floor((cy-h/2)/256),y1=Math.floor((cy+h/2-1)/256);for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){if(y<0||y>=n)continue;o.push({src:tpl.replace('{z}',z).replace('{x}',((x%n)+n)%n).replace('{y}',y),l:Math.round(x*256-cx+w/2),t:Math.round(y*256-cy+h/2)});}return o;}
function sat(lat,lng,w,h,z){z=z||17;const p=wpx(lat,lng,z);return tl(p.x,p.y,z,w,h,SAT);}
function km(a,b){const R=6371,dl=(b.lat-a.lat)*Math.PI/180,dn=(b.lng-a.lng)*Math.PI/180;const x=Math.sin(dl/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(x));}
const fkm=d=>d<1?Math.round(d*1000)+' m':d.toFixed(1).replace('.',',')+' km';
const fmin=m=>m<60?Math.max(1,Math.round(m))+' min':Math.floor(m/60)+' h '+Math.round(m%60)+' min';
const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function staticFit(pts,w,h,pad,maxZ,tpl){let z=maxZ;for(;z>8;z--){const ps=pts.map(p=>wpx(p.lat,p.lng,z));const xs=ps.map(p=>p.x),ys=ps.map(p=>p.y);if(Math.max(...xs)-Math.min(...xs)<=w-2*pad&&Math.max(...ys)-Math.min(...ys)<=h-2*pad)break;}const ps=pts.map(p=>wpx(p.lat,p.lng,z));const xs=ps.map(p=>p.x),ys=ps.map(p=>p.y);const cx=(Math.max(...xs)+Math.min(...xs))/2,cy=(Math.max(...ys)+Math.min(...ys))/2;return{tiles:tl(cx,cy,z,w,h,tpl),marks:ps.map(p=>({l:Math.round(p.x-cx+w/2),t:Math.round(p.y-cy+h/2)}))};}
window.SR={TILES,SAT,I,TY,ST,ST_DONE,ST_LAST_REJECTABLE,REJ,U,MUNI,PLACES,GEN,ROUTES,R0,RTYPES_T,RTYPES_M,PEND0,MSTATS,TODAY,wpx,tl,sat,km,fkm,fmin,norm,staticFit};
})();
