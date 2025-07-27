const {
  Client,
  IntentsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  SlashCommandBuilder,
  Collection,
  UserSelectMenuBuilder,
  StringSelectMenuBuilder,
  PermissionsBitField,
  AttachmentBuilder
} = require('discord.js');
const schedule = require('node-schedule');
const fs = require('fs');
const moment = require('moment-timezone');
// PeakyBoys
const TOKEN = 'MTM5OTE1MjgwNzkzNTczNzg2Ng.G3GIue.a5LHj-cFi5y-0vaIg2a4qGqH5DIErk0xv2RmTs';
const LOG_CHANNEL_ID = '1371685796708352041';
const INACTIVITY_CHANNEL_ID = '1371685848852074597';
const STORAGE_FILE = 'registros.json';
const GUILD_ID = '1340202784707973120';
const EXCUSED_ROLE_ID = '1371698196417482874';
const ALLOWED_ROLES = [
  '1340202784720551944',
  '1340202784720551943',
  '1340202784720551941',  
  '1340202784720551940'
];

const GRAFFITI_CHANNEL_ID = '1374226489075306497';
const GRAFFITI_LOG_CHANNEL_ID = '1374976245191671931';
const GRAFFITI_MESSAGE_KEY = 'graffiti_message';
const GRAFFITI_ZONES = [
  'DAVIS', 'RANCHO', 'MURRIETA', 'LA MESA', 'CYPRESS', 'EL BURRO',
  'CHAMBER', 'BANNING', 'ELYSIAN', 'STRAWBERRY', 'MAZEBANK',
  'LA PUERTA', 'TATAVIAN', 'AEROPUERTO'
];
const GRAFFITI_REG_CHANNEL_ID = '1375316977480106135';  
const DEFENSE_CHANNEL_ID       = '1340202787728003103';   
const DEFENSE_ROLE_ID          = '1358937489393451079';   
const REMINDERS_FILE           = 'graffitiReminders.json';
let graffitiSessions = new Map();
if (!fs.existsSync(REMINDERS_FILE)) {
  fs.writeFileSync(REMINDERS_FILE, JSON.stringify([]), 'utf8');
}

const DEALER_CHANNEL_ID = '1374226501557293077';
const DEALER_LOG_CHANNEL_ID = '1374976302951432283';
const DEALER_MESSAGE_KEY = 'dealer_message';
const DEALER_OPTIONS = [
  'Cypress (Dealer #1)',
  'Rancho (Dealer #2)',
  'Paleto Cove (Dealer #3)',
  'El Burro (Dealer #4)',
  'Grand Senora (Dealer #5)',
  'Paleto Bay (Dealer #6)',
  'Vinewood (Dealer #7)',
  'Elysian Fields (Dealer #8)'
];

const RECRUIT_CHANNEL_ID = '1374462025442525274';
const RECRUIT_LOG_CHANNEL_ID = '1374560437151989800';
const RECRUIT_MESSAGE_KEY = 'recruitment_message';

let registrosCount = 0;
let userRegistros = new Map();
let activityStats = new Map();
let activityHistory = new Map();
let activityMessageStore = {};
let absenceTimeoutsData = {};
let inactivityPending = {};
let inactivityStatus = new Map(); 
let recruitmentSessions = new Map();
let recruitmentData = new Map();
let isRecovering = false;

if (!fs.existsSync(STORAGE_FILE)) {
  fs.writeFileSync(STORAGE_FILE, JSON.stringify({
    registrosCount: 0,
    userRegistros: {},
    activityStats: {},
    activityHistory: {},
    activityMessageStore: {},
    absenceTimeoutsData: {},
    inactivityPending: {}
  }, null, 2));
}

let lastSaveTime = 0;
const SAVE_COOLDOWN = 5000;
let pendingChanges = false;

const scheduleSave = () => {
  if (!pendingChanges) {
    pendingChanges = true;
    setTimeout(() => {
      if (pendingChanges) {
        saveData();
        pendingChanges = false;
      }
    }, SAVE_COOLDOWN);
  }
};

const saveData = () => {
  const now = Date.now();
  if (now - lastSaveTime < SAVE_COOLDOWN) {
    scheduleSave();
    return;
  }
  lastSaveTime = now;
  
  try {
    const data = {
      registrosCount,
      userRegistros: Object.fromEntries(userRegistros),
      activityStats: Object.fromEntries(
        Array.from(activityStats.entries()).map(([key, value]) => [
          key,
          Object.fromEntries(value)
        ])
      ),
      activityHistory: Object.fromEntries(
        Array.from(activityHistory.entries()).map(([key, value]) => [
          key,
          value
        ])
      ),
      activityMessageStore,
      absenceTimeoutsData,
      inactivityPending,
      recruitmentData: Object.fromEntries(recruitmentData)
    };
    
    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(STORAGE_FILE, jsonString, 'utf8');
    
    console.log('💾 [BOT] Datos guardados en registros.json');
    console.log('Resumen:', {
      registrosCount: data.registrosCount,
      usuarios: Object.keys(data.userRegistros).length,
      actividades: Object.keys(data.activityStats).length,
      tamaño: Math.round(jsonString.length / 1024) + 'KB'
    });
  } catch (err) {
    console.error('❌ [BOT] Error al guardar registros.json:', err);
  }
};

const loadData = () => {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      console.log('[BOT] Cargando datos de registros.json...');
      const fileContent = fs.readFileSync(STORAGE_FILE, 'utf8');
      const fileSize = Math.round(fileContent.length / 1024);
      console.log(`[BOT] Tamaño del archivo: ${fileSize}KB`);
      
      if (fileSize > 5000) {
        console.warn('[BOT] ⚠️ Archivo muy grande detectado. Considera limpiar datos antiguos.');
      }
      
      const data = JSON.parse(fileContent);
      registrosCount = data.registrosCount || 0;
      userRegistros = new Map(Object.entries(data.userRegistros || {}));
      activityStats = new Map(
        Object.entries(data.activityStats || {}).map(([key, value]) => [
          key,
          new Map(Object.entries(value))
        ])
      );
      activityHistory = new Map(
        Object.entries(data.activityHistory || {}).map(([key, value]) => [
          key,
          Array.isArray(value) ? value : []
        ])
      );
      activityMessageStore = data.activityMessageStore || {};
      absenceTimeoutsData = data.absenceTimeoutsData || {};
      inactivityPending = data.inactivityPending || {};
      recruitmentData = new Map(Object.entries(data.recruitmentData || {}));
      
      console.log('[BOT] Datos cargados correctamente de registros.json');
      console.log('Resumen cargado:', {
        registrosCount,
        usuarios: userRegistros.size,
        actividades: activityStats.size,
        historial: activityHistory.size
      });
    } else {
      console.log('[BOT] registros.json no encontrado, inicializando datos.');
    }
  } catch (err) {
    console.error('[BOT] Error al cargar registros.json:', err);
    registrosCount = 0;
    userRegistros = new Map();
    activityStats = new Map();
    activityHistory = new Map();
    activityMessageStore = {};
    absenceTimeoutsData = {};
    inactivityPending = {};
    recruitmentData = new Map();
    console.log('[BOT] Datos inicializados debido a un error de carga.');
  }
};

const activities = [
  {
    title: '🔬 Reparto de químicos',
    channelId: '1371685583994490940',
    description: 'El contacto se ha quedado sin químicos para seguir con la producción. Te ha enviado la lista de productos que necesita para continuar.',
    requirements: ['Tarro de pintura azul (Pandilla)', 'Hojas de coca (MotorClub)', 'Gas butano (Grupos)'],
    image: 'https://media.discordapp.net/attachments/1364686840325607589/1364799539248369744/image.png?ex=6820141e&is=681ec29e&hm=a82986aa9095d73103c55935c4daac5a0200e468783ea24b3d9cbf224e5fa950&=',
    points: 10,
    schedules: [
      { cron: '0 14 * * 4', tz: 'Etc/UTC', durationMs: 6 * 3600 * 1000 },
      { cron: '0 14 * * 0', tz: 'Etc/UTC', durationMs: 6 * 3600 * 1000 }
    ]
  },
  {
    title: '🚚 Roba la camioneta de pintura',
    channelId: '1371685255739736135',
    description: 'Deberás ir en búsqueda de una camioneta de una empresa de pinturas, llevártela y luego toma lo que hay en su maletero.',
    requirements: [],
    image: 'https://cdn.discordapp.com/attachments/1364686840325607589/1364799538917015636/image.png',
    points: 12,
    schedules: [
      { cron: '0 2 * * 2', tz: 'Etc/UTC', durationMs: 2 * 3600 * 1000 },
      { cron: '0 9 * * 2', tz: 'Etc/UTC', durationMs: 2 * 3600 * 1000 },
      { cron: '0 15 * * 2', tz: 'Etc/UTC', durationMs: 2 * 3600 * 1000 },
      { cron: '0 21 * * 2', tz: 'Etc/UTC', durationMs: 1 * 3600 * 1000 },
      { cron: '0 2 * * 4', tz: 'Etc/UTC', durationMs: 2 * 3600 * 1000 },
      { cron: '0 9 * * 4', tz: 'Etc/UTC', durationMs: 2 * 3600 * 1000 },
      { cron: '0 15 * * 4', tz: 'Etc/UTC', durationMs: 2 * 3600 * 1000 },
      { cron: '0 21 * * 4', tz: 'Etc/UTC', durationMs: 1 * 3600 * 1000 }
    ]
  },
  {
    title: '🚨 Misión de tráfico ilegal',
    channelId: '1371685622854713415',
    description: 'Deberas ir en busqueda de la carga, encontrarla lo más rapido para tomarla, llevarla a salvo hasta su punto de entrega y luego reclamar la recompensa que lleve dentro.',
    requirements: [],
    image: 'https://cdn.discordapp.com/attachments/1364686840325607589/1364799538543460362/image.png',
    points: 2,
    schedules: [
      { cron: '0 16 * * *', tz: 'Etc/UTC', durationMs: 2 * 3600 * 1000 },
      { cron: '0 21 * * *', tz: 'Etc/UTC', durationMs: 1 * 3600 * 1000 }
    ]
  },
  {
    title: '🏪 Robo a negocio',
    channelId: '1371685384131575808',
    description: 'Dirigete a un negocio a la cual puedes ingresar para robar, lo que encuentres de valor en su interior puedes venderlo y obtener ganancias.',
    requirements: ['Tablet', 'Martillo', 'Plano arquitectonico'],
    image: 'https://cdn.discordapp.com/attachments/1364686840325607589/1364799538149327021/image.png?ex=680afc1e&is=6809aa9e&hm=0df8da646229d98483b3ae06aadd7425fffe13ff2d5600b94c4be1805d945bd6&',
    points: 7,
    schedules: [
      { cron: '0 0 * * 1,3,5,0', tz: 'Etc/UTC', durationMs: 11 * 3600 * 1000 },
      { cron: '0 12 * * 1,3,5,0', tz: 'Etc/UTC', durationMs: 11 * 3600 * 1000 }
    ]
  },
  {
    title: '🏠 Robo de propiedad',
    channelId: '1371685308449554556',
    description: 'Dirigete a una propiedad a la cual puedes ingresar para robar, lo que encuentres de valor en su interior puedes venderlo y obtener tu ganancia.',
    requirements: ['Plano arquitectonico'],
    image: 'https://cdn.discordapp.com/attachments/1364686840325607589/1364799537822040074/image.png?ex=680afc1e&is=6809aa9e&hm=6e4801b5034f674295f1242611b04d57a59d9c671cd64714ffdbc4e1e1bb2666&',
    points: 11,
    schedules: [
      { cron: '0 0 * * 2,4,6', tz: 'Etc/UTC', durationMs: 11 * 3600 * 1000 },
      { cron: '0 12 * * 2,4,6', tz: 'Etc/UTC', durationMs: 11 * 3600 * 1000 }
    ]
  },
  {
    title: '🚗 Robo de vehículo',
    channelId: '1371685210684653641',
    description: 'Deberas ir en busqueda de un vehiculo para robarlo y luego entregarlo a un contacto de venta rapida.',
    requirements: ['Destornillador'],
    image: 'https://cdn.discordapp.com/attachments/1364686840325607589/1364799815560724540/image.png?ex=680afc60&is=6809aae0&hm=dbbe1506da2910575935a1c1369436edc50679157f6db75061bc0ab101eed345&',
    points: 1,
    schedules: [
      { cron: '0 1 * * *', tz: 'Etc/UTC', durationMs: 2 * 3600 * 1000 },
      { cron: '0 13 * * *', tz: 'Etc/UTC', durationMs: 2 * 3600 * 1000 },
      { cron: '0 17 * * *', tz: 'Etc/UTC', durationMs: 1 * 3600 * 1000 },
      { cron: '0 19 * * *', tz: 'Etc/UTC', durationMs: 1 * 3600 * 1000 },
      { cron: '0 20 * * *', tz: 'Etc/UTC', durationMs: 2 * 3600 * 1000 },
      { cron: '0 22 * * *', tz: 'Etc/UTC', durationMs: 1 * 3600 * 1000 }
    ]
  },
  {
    title: '📦 Búsqueda contenedores',
    channelId: '1371685418273083502',
    description: 'Deberias ir en busqueda de mercancia, esa se ha camuflado entre contenedores para no levantar sospechas, hazte con su contenido lo antes posible, asi no se lo roban.',
    requirements: ['Un taladro'],
    image: 'https://cdn.discordapp.com/attachments/1364686840325607589/1364799539550093393/image.png?ex=680afc1e&is=6809aa9e&hm=f633543f5449e5018466d61bd96d2765d545343163b61840fec1bada7aee0e8a&',
    points: 7,
    schedules: [
      { cron: '0 2 * * 0,1,3,5,6', tz: 'Etc/UTC', durationMs: 2 * 3600 * 1000 },
      { cron: '0 9 * * 0,1,3,5,6', tz: 'Etc/UTC', durationMs: 2 * 3600 * 1000 },
      { cron: '0 15 * * 0,1,3,5,6', tz: 'Etc/UTC', durationMs: 2 * 3600 * 1000 },
      { cron: '0 21 * * 0,1,3,5,6', tz: 'Etc/UTC', durationMs: 1 * 3600 * 1000 }
    ]
  },
  {
    title: '🌱 Cuidado de plantación (Día 1)',
    channelId: '1371685448165888112',
    description: 'En este primer día, tendrás que revisar tus plantas y asegurarte de que tengan todo lo que necesitan para crecer. Riega tus plantas, fertiliza el suelo y asegúrate de que estén libres de plagas. Documenta tu progreso y prepárate para la siguiente etapa.\n\n⚠️ Recuerda guardar bien la fotografía que obtendrás. Sin esta NO podrás reclamar tu recompensa al finalizar la semana.',
    requirements: ['Rociador'],
    image: 'https://cdn.discordapp.com/attachments/1368810311922090074/1368833191259148308/image.png?ex=6819a8c0&is=68185740&hm=9cc84d8ce9127c5cb8e656d536d3d7f04ef632d421b5da140de10a42fcc97120&',
    points: 32,
    schedules: [
      { cron: '0 7 * * 1', tz: 'Etc/UTC', durationMs: 16 * 3600 * 1000 }
    ]
  },
  {
    title: '🌱 Cuidado de plantación (Día 2)',
    channelId: '1371685478985896096',
    description: 'En el segundo día, tendrás que continuar revisando y manteniendo tus plantas, pero esta vez, tus plantas habrán crecido más grandes y fuertes gracias a tu arduo trabajo en el primer día. Asegúrate de documentar tu progreso y encender el sistema de riego para que tus plantas sigan creciendo de manera saludable.\n\n⚠️ Recuerda guardar bien la fotografía que obtendrás. Sin esta NO podrás reclamar tu recompensa al finalizar la semana.',
    requirements: ['Rociador'],
    image: 'https://media.discordapp.net/attachments/1368810311922090074/1368833191586037780/image.png?ex=6819a8c0&is=68185740&hm=bb7b8c8c6d3d16e3e666608965f28bbd0cc844bb3f5cebcef09952068181630d&',
    points: 32,
    schedules: [
      { cron: '0 7 * * 3', tz: 'Etc/UTC', durationMs: 16 * 3600 * 1000 }
    ]
  },
  {
    title: '🌱 Cuidado de plantación (Día 3)',
    channelId: '1371685507314221107',
    description: 'En el tercer día, tus plantas habrán crecido aún más y necesitarán más atención y cuidado para poder cosechar una buena cantidad de marihuana. Continúa manteniendo tus plantas y documenta tu progreso mientras esperas ansiosamente por la cosecha.\n\n⚠️ Recuerda guardar bien la fotografía que obtendrás. Sin esta NO podrás reclamar tu recompensa al finalizar la semana.',
    requirements: ['Rociador'],
    image: 'https://media.discordapp.net/attachments/1368810311922090074/1368833191972175882/image.png?ex=6819a8c0&is=68185740&hm=d1e50647da67ecc48cca9362cdf1636e012ab97c3b321073a6dcb17c68d59af8&',
    points: 32,
    schedules: [
      { cron: '0 7 * * 5', tz: 'Etc/UTC', durationMs: 16 * 3600 * 1000 }
    ]
  },
  {
    title: '🏆 Día de recompensa',
    channelId: '1371685549580095569',
    description: 'En este último día, presentarás las fotos que tomaste de tu progreso en las tres etapas anteriores. Si completaste todas las etapas satisfactoriamente, recibirás una gran recompensa por tu arduo trabajo y dedicación.\n\n⚠️ Recuerda llevar las tres fotografías de los días anteriores. Sin estas NO podrás reclamar tu recompensa.',
    requirements: ['Foto del dia 1,2 y 3'],
    image: 'https://cdn.discordapp.com/attachments/1368810311922090074/1368833192294875146/image.png?ex=6819a8c0&is=68185740&hm=57cee753ed632d325b19da02acb22e1d160227707536a8f9e519d50a0c4ded07&',
    points: 100,
    schedules: [
      { cron: '0 7 * * 0', tz: 'Etc/UTC', durationMs: 16 * 3600 * 1000 }
    ]
  },
];

const commands = [
  new SlashCommandBuilder()
    .setName('veractividades')
    .setDescription('Ver actividades realizadas por un usuario en un período')
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('Usuario a consultar')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('fecha_inicio')
        .setDescription('Fecha de inicio (DD/MM/YYYY)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('fecha_fin')
        .setDescription('Fecha de fin (DD/MM/YYYY)')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('rankings')
    .setDescription('Ver ranking de usuarios con más actividades')
    .addStringOption(option =>
      option.setName('fecha_inicio')
        .setDescription('Fecha de inicio (DD/MM/YYYY)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('fecha_fin')
        .setDescription('Fecha de fin (DD/MM/YYYY)')
        .setRequired(false)),
  new SlashCommandBuilder()
    .setName('anuncio')
    .setDescription('Enviar un anuncio a miembros con rol mínimo o a un usuario específico')
    .addStringOption(option =>
      option.setName('titulo')
        .setDescription('Título del anuncio')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('mensaje')
        .setDescription('Contenido del anuncio')
        .setRequired(true))
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Usuario específico para enviar el anuncio (opcional)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('url_imagen')
        .setDescription('URL de la imagen para el anuncio (opcional)')
        .setRequired(false)),
  new SlashCommandBuilder()
    .setName('verdatos')
    .setDescription('Ver datos de un usuario')
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('Usuario a consultar')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('verpago')
    .setDescription('Ver el estado de pago y comprobante de un usuario')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Usuario a consultar')
        .setRequired(true)),
];

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildMembers
  ],
  rest: {
    timeout: 15000, 
    retries: 3, 
  },
  ws: {
    properties: {
      browser: 'Discord iOS'
    }
  }
});

let activityMessages = {};
let tempSelections = new Map();
const rankingPagination = new Map();
const ABSENCE_TIMEOUT = 24 * 60 * 60 * 1000;
const absenceTimeouts = new Map();
const IMAGE_UPLOAD_TIMEOUT = 60000; 

process.on('uncaughtException', (err) => {
  console.error('Excepción no controlada:', err);
  saveData();
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesa no manejada:', reason);
  saveData();
});

process.on('SIGINT', () => {
  console.log('[BOT] Cerrando bot... Guardando datos finales...');
  saveData();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[BOT] Cerrando bot... Guardando datos finales...');
  saveData();
  process.exit(0);
});

client.on('error', (error) => {
  console.error('[BOT] Error de conexión:', error);
  if (error.code === 'UND_ERR_CONNECT_TIMEOUT') {
    isRecovering = true;
    console.log('[BOT] Problema de conexión detectado. El bot entró en modo recuperación.');
    setTimeout(() => {
      client.login(TOKEN).catch(err => {
        console.error('[BOT] Error al reconectar:', err);
      });
    }, 30000);
  }
});

client.on('disconnect', () => {
  console.log('[BOT] Bot desconectado. Intentando reconectar...');
  setTimeout(() => {
    client.login(TOKEN).catch(err => {
      console.error('[BOT] Error al reconectar después de desconexión:', err);
    });
  }, 5000);
});

const sendPrivateWarning = async (userId) => {
  try {
    const user = await client.users.fetch(userId);
    const embed = new EmbedBuilder()
      .setTitle('⚠️ Aviso de Inactividad - PeakyBoys GTAHUB Orion')
      .setColor('#ff6961')
      .setDescription('Has estado inactivo en las actividades de la organización. Por favor, realiza actividades para mantener tu participación activa.')
      .addFields(
        { name: '📋 Recordatorio', value: 'Las actividades son importantes para el funcionamiento de la organización. Tu participación es necesaria.' },
        { name: '⏰ Próxima verificación', value: 'El sistema verificará tu actividad nuevamente en 24 horas.' }
      )
      .setFooter({ text: 'PeakyBoys APP - Sistema de Inactividad', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    await user.send({ embeds: [embed] });
    return true;
  } catch (error) {
    if (error.code === 50007) {
      console.log(`[SISTEMA DE INACTIVIDAD] ⚠️ No se pudo enviar aviso de inactividad a ${userId}`);
      console.log('Razón: El usuario tiene los mensajes privados desactivados o ha bloqueado al bot');
      console.log('Acción requerida: Avisar manualmente al usuario sobre su inactividad');
    } else {
      console.log(`[SISTEMA DE INACTIVIDAD] ❌ Error al enviar aviso de inactividad a ${userId}`);
      console.log(`Tipo de error: ${error.message}`);
    }
    return false;
  }
};

const sendFinalAbsenceWarning = async (userId) => {
  try {
    const user = await client.users.fetch(userId);
    const embed = new EmbedBuilder()
      .setTitle('⛔ Ausencia Prolongada - PeakyBoys GTAHUB Orion')
      .setColor('#ff0000')
      .setDescription('Tu ausencia fue muy larga e injustificada. Por favor, comunícate con tus superiores para evitar sanciones.')
      .addFields(
        { name: '⚠️ Importante', value: 'Si no realizas actividades pronto, podrías recibir sanciones.' },
        { name: '📞 Contacto', value: 'Comunícate con tus superiores para justificar tu ausencia.' }
      )
      .setFooter({ text: 'PeakyBoys APP - Sistema de Inactividad', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    await user.send({ embeds: [embed] });
    return true;
  } catch (error) {
    if (error.code === 50007) {
      console.log(`[SISTEMA DE INACTIVIDAD] ⚠️ - No se pudo enviar advertencia final a ${userId}`);
      console.log('Razón: El usuario tiene los mensajes privados desactivados o ha bloqueado al bot');
      console.log('Acción requerida: Avisar manualmente al usuario sobre su ausencia prolongada');
    } else {
      console.log(`[SISTEMA DE INACTIVIDAD] ❌ - Error al enviar advertencia final a ${userId}`);
      console.log(`Tipo de error: ${error.message}`);
    }
    return false;
  }
};

const sendExcusedAbsenceInfo = async (userId) => {
  try {
    const user = await client.users.fetch(userId);
    const embed = new EmbedBuilder()
      .setTitle('🟢 Ausencia Justificada - PeakyBoys GTAHUB Orion')
      .setColor('#43b581')
      .setDescription('Tu ausencia está justificada. No se tomarán medidas en tu contra mientras mantengas el estado de ausente justificado.')
      .setFooter({ text: 'PeakyBoys APP - Sistema de Inactividad', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    await user.send({ embeds: [embed] });
    return true;
  } catch (error) {
    if (error.code === 50007) {
      console.log(`[SISTEMA DE INACTIVIDAD] ⚠️ - No se pudo enviar mensaje privado a ${userId}`);
      console.log('Razón: El usuario tiene los mensajes privados desactivados o ha bloqueado al bot');
      console.log('Acción requerida: Avisar manualmente al usuario sobre su ausencia justificada');
    } else {
      console.log(`[SISTEMA DE INACTIVIDAD] ❌ - Error al enviar mensaje privado a ${userId}`);
      console.log(`Tipo de error: ${error.message}`);
    }
    return false;
  }
};

function setInactivityStatus(userId, data) {
  inactivityStatus.set(userId, { ...inactivityStatus.get(userId), ...data });
  saveData();
}

async function sendOrUpdateInactivityWarning(userId, member, userActivities) {
  const inactivityChannel = await client.channels.fetch(INACTIVITY_CHANNEL_ID);
  const user = await client.users.fetch(userId);
  const status = inactivityStatus.get(userId) || {};
  let embed = new EmbedBuilder()
    .setTitle('⚠️ Usuario Inactivo Detectado')
    .setColor('#ff6961')
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      { name: 'Usuario', value: `${user.tag} (${member.displayName})`, inline: false },
      { name: 'Ausencia justificada?', value: status.status === 'justified' ? '✅ Sí' : '❌ No', inline: true },
      { name: 'Última actividad', value: userActivities.length > 0 ? `• Actividad: ${userActivities[userActivities.length-1].activity}\n• Fecha: <t:${Math.floor(userActivities[userActivities.length-1].timestamp / 1000)}:F>` : 'Nunca', inline: false },
      { name: 'Días inactivo', value: userActivities.length > 0 ? `${Math.floor((Date.now() - userActivities[userActivities.length-1].timestamp) / (24 * 60 * 60 * 1000))} días` : 'Todos', inline: true },
      { name: 'Total de actividades', value: `${userActivities.length}`, inline: true },
      { name: '¿Alerta enviada?', value: status.status === 'warned' ? '✅ Sí' : '❌ No', inline: false },
      { name: 'Estado actual', value: status.status ? status.status : 'inactivo', inline: false }
    )
    .setFooter({ text: 'PeakyBoys APP - Sistema de Inactividad', iconURL: client.user.displayAvatarURL() })
    .setTimestamp();
  const button = new ButtonBuilder()
    .setCustomId(`warn_${userId}`)
    .setLabel('Avisar al privado')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('📨')
    .setDisabled(status.status === 'justified');
  const aclararBtn = new ButtonBuilder()
    .setCustomId(`aclarar_${userId}`)
    .setLabel('Ausencia ya aclarada')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('🟢')
    .setDisabled(status.status === 'justified');
  const row = new ActionRowBuilder().addComponents(button, aclararBtn);
  if (status.messageId) {
    try {
      const msg = await inactivityChannel.messages.fetch(status.messageId);
      await msg.edit({ embeds: [embed], components: [row] });
    } catch (e) {
      const msg = await inactivityChannel.send({ embeds: [embed], components: [row] });
      setInactivityStatus(userId, { messageId: msg.id, status: 'warned', lastWarn: Date.now() });
    }
  } else {
    const msg = await inactivityChannel.send({ embeds: [embed], components: [row] });
    setInactivityStatus(userId, { messageId: msg.id, status: 'warned', lastWarn: Date.now() });
  }
}

const checkInactivity = async () => {
  const now = Date.now();
  const guild = await client.guilds.fetch(GUILD_ID);
  const role = guild.roles.cache.get('1358937489393451079');
  if (!role) {
    console.error('No se encontró el rol de actividad para inactividad.');
    return;
  }
  const miembros = await role.members;
  for (const [userId, member] of miembros) {
    if (member.user.bot) continue;
    if (member.roles.cache.has(EXCUSED_ROLE_ID)) continue;
    const userActivities = activityHistory.get(userId) || [];
    if (userActivities.length === 0) continue;
    const status = inactivityStatus.get(userId);
    if (status && status.lastWarn && (now - status.lastWarn < 24*60*60*1000)) continue;
    const sortedActivities = userActivities.sort((a, b) => b.timestamp - a.timestamp);
    const lastActivity = sortedActivities[0];
    const diasSinActividad = Math.floor((now - lastActivity.timestamp) / (24 * 60 * 60 * 1000));
    if (diasSinActividad > 3) {
      await sendOrUpdateInactivityWarning(userId, member, userActivities);
    }
  }
};

const graffitiSessionLocks = new Set();
const graffitiStepSessions = new Map(); 

async function ensureRecruitmentMessage() {
  const recruitChannel = await client.channels.fetch(RECRUIT_CHANNEL_ID);
  let recruitMsgId = activityMessageStore[RECRUIT_MESSAGE_KEY]?.messageId;
  let exists = false;
  if (recruitMsgId) {
    try {
      const msg = await recruitChannel.messages.fetch(recruitMsgId);
      if (msg) exists = true;
    } catch (e) {}
  }
  if (exists) return;
  const embed = new EmbedBuilder()
    .setDescription('**¿Haz sido reclutado IC? Rellena tu información \n\n - Recuerda que debes pagar la couta inicial de $350.000**')
    .setColor('#ff0000')
    .setThumbnail(client.user.displayAvatarURL())
    .setFooter({ text: 'PeakyBoys APP - Reclutamiento', iconURL: client.user.displayAvatarURL() })
    .setTimestamp();
  const button = new ButtonBuilder()
    .setCustomId('recruitment_fillinfo')
    .setLabel('Rellenar información')
    .setStyle(ButtonStyle.Danger);
  const row = new ActionRowBuilder().addComponents(button);
  const msg = await recruitChannel.send({ embeds: [embed], components: [row] });
  activityMessageStore[RECRUIT_MESSAGE_KEY] = { messageId: msg.id, channelId: RECRUIT_CHANNEL_ID };
  saveData();
}

async function ensureGraffitiMessage() {
  const graffitiChannel = await client.channels.fetch(GRAFFITI_CHANNEL_ID);
  let graffitiMsgId = activityMessageStore[GRAFFITI_MESSAGE_KEY]?.messageId;
  let exists = false;
  if (graffitiMsgId) {
    try {
      const msg = await graffitiChannel.messages.fetch(graffitiMsgId);
      if (msg) exists = true;
    } catch (e) {}
  }
  if (exists) return;
  const embed = new EmbedBuilder()
    .setTitle('Registro de participación en Graffitis')
    .setDescription('¿Participaste en el graffiti actual? Registra tu participación seleccionando la zona y subiendo la imagen de prueba.\n\n**Zonas disponibles:**\n' + GRAFFITI_ZONES.map(z => `• ${z}`).join('\n'))
    .setColor('#ff0000')
    .setThumbnail('https://cdn.discordapp.com/attachments/1370661672582381569/1371573782858301550/imgg1212.jpg?ex=6823a120&is=68224fa0&hm=1c062ba021b11014de961a7422d13fd90a25fbfe193578160e77861a7f387854&')
    .setFooter({ text: 'PeakyBoys APP - Graffitis', iconURL: client.user.displayAvatarURL() })
    .setTimestamp();
  const button = new ButtonBuilder()
    .setCustomId('graffiti_participate')
    .setLabel('Registrar participación')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('🥷');
  const row = new ActionRowBuilder().addComponents(button);
  const graffitiMsg = await graffitiChannel.send({ embeds: [embed], components: [row] });
  activityMessageStore[GRAFFITI_MESSAGE_KEY] = { messageId: graffitiMsg.id, channelId: GRAFFITI_CHANNEL_ID };
  saveData();
}

async function ensureDealerMessage() {
  const dealerChannel = await client.channels.fetch(DEALER_CHANNEL_ID);
  let dealerMsgId = activityMessageStore[DEALER_MESSAGE_KEY]?.messageId;
  let exists = false;
  if (dealerMsgId) {
    try {
      const msg = await dealerChannel.messages.fetch(dealerMsgId);
      if (msg) exists = true;
    } catch (e) {}
  }
  if (exists) return;
  const embed = new EmbedBuilder()
    .setTitle('Registro de participación en Dealer')
    .setDescription('¿Participaste en el dealer actual? Registra tu participación seleccionando cuál y subiendo la imagen de prueba.\n\n**Dealers disponibles:**\n' + DEALER_OPTIONS.map(z => `• ${z}`).join('\n'))
    .setColor('#ff0000')
    .setThumbnail('https://cdn.discordapp.com/attachments/1370661672582381569/1371573782858301550/imgg1212.jpg?ex=6823a120&is=68224fa0&hm=1c062ba021b11014de961a7422d13fd90a25fbfe193578160e77861a7f387854&')
    .setFooter({ text: 'PeakyBoys APP - Dealer', iconURL: client.user.displayAvatarURL() })
    .setTimestamp();
  const button = new ButtonBuilder()
    .setCustomId('dealer_participate')
    .setLabel('Registrar participación')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('💼');
  const row = new ActionRowBuilder().addComponents(button);
  const dealerMsg = await dealerChannel.send({ embeds: [embed], components: [row] });
  activityMessageStore[DEALER_MESSAGE_KEY] = { messageId: dealerMsg.id, channelId: DEALER_CHANNEL_ID };
  saveData();
}

async function sendGraffitiStartEmbed(channel) {
  const GRAFFITI_LOGO_URL = 'https://cdn.discordapp.com/attachments/1370661672582381569/1371573782858301550/imgg1212.jpg?ex=6823a120&is=68224fa0&hm=1c062ba021b11014de961a7422d13fd90a25fbfe193578160e77861a7f387854&';
  const embed = new EmbedBuilder()
    .setTitle('Registro de Graffiti — PeakyBoys')
    .setDescription('**¿Quieres registrar un graffiti ganado?**\n\nRecuerda realizar bien el registro, si te equivocas, cancelalo, sigue bien las instrucciones.\n\nPresiona el botón para iniciar el registro.\n\n> Si ya iniciaste un registro y quieres cancelarlo, usa el botón de cancelar.')
    .setColor('#FF0000')
    .setThumbnail(GRAFFITI_LOGO_URL)
    .setFooter({ text: 'PeakyBoys APP - Graffitis', iconURL: GRAFFITI_LOGO_URL })
    .setTimestamp();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('graffiti_start').setLabel('Iniciar registro').setStyle(ButtonStyle.Success).setEmoji('📝'),
    new ButtonBuilder().setCustomId('graffiti_cancel').setLabel('Cancelar registro').setStyle(ButtonStyle.Danger).setEmoji('❌')
  );
  const msg = await channel.send({ embeds: [embed], components: [row] });
  activityMessageStore['graffiti_step_message'] = { messageId: msg.id, channelId: channel.id };
  saveData();
}

client.once('ready', async () => {
  console.log(`Bot conectado como ${client.user.tag}`);
  loadData(); 

  const estados = [
    'PeakyBoys',
    'Recuerda conectarte a diario o justificar tu ausencia',
    '¡Participa en actividades!',
    '¡Defiende y ayuda a ganar los graffitis!',
    '¡Participa en los Dealers!',
    '¡Sé activo!',
    '¡Mantente al día!',
    '¡No seas inactivo!',
    '¡Evita sanciones!',
    '¡No te olvides de pagar la couta!'
  ];

  let estadoIndex = 0;
  const cambiarEstado = () => {
    client.user.setPresence({
      activities: [{
        name: 'GTAHUB Orion', 
        type: 0 
      }, {
        name: estados[estadoIndex], 
        type: 4 
      }],
      status: 'online'
    });
    estadoIndex = (estadoIndex + 1) % estados.length;
  };

  cambiarEstado();

  setInterval(cambiarEstado, 15000);

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.commands.set(commands);
    console.log('Comandos registrados correctamente en el servidor');
  } catch (error) {
    console.error('Error al registrar comandos:', error);
  }

  schedule.scheduleJob('0 0 */5 * *', { timezone: 'Europe/Madrid' }, checkInactivity);
  console.log('Sistema de verificación de inactividad programado');

  activities.forEach(activity => {
    activity.schedules.forEach(rule => {
      schedule.scheduleJob({ rule: rule.cron, tz: rule.tz }, async () => {
        const channel = await client.channels.fetch(activity.channelId);
        const horaHoy = moment().tz('Europe/Madrid').format('HH:mm');
        const parts = rule.cron.split(' ');
        const minute = parts[0];
        const hourStr = parts[1];
        const durHoras = rule.durationMs / (3600 * 1000);
        const start = parseInt(hourStr, 10);
        const end = start + durHoras;
        const scheduleText = `${start}hs-${end}hs Hora HUB (dura ${durHoras}hs)`;
        const fechaActividad = moment().tz('Europe/Madrid').set({ hour: start, minute: parseInt(minute, 10), second: 0, millisecond: 0 }).format('YYYYMMDD_HHmm');
        const buttonId = `complete_${activity.title.replace(/\s+/g, '_')}_${fechaActividad}`;
        
        const embed = new EmbedBuilder()
          .setTitle(activity.title)
          .setColor('#FF0000')
          .setDescription(activity.description)
          .setThumbnail('https://cdn.discordapp.com/attachments/1370661672582381569/1371573782858301550/imgg1212.jpg?ex=6823a120&is=68224fa0&hm=1c062ba021b11014de961a7422d13fd90a25fbfe193578160e77861a7f387854&')
          .addFields(
            ...(activity.requirements.length
              ? [{ name: '⚠️ Requisitos', value: activity.requirements.map(r => `- ${r}`).join('\n'), inline: false }]
              : []),
            { name: '🛡️ Puntos diarios', value: `${activity.points}`, inline: true },
            { name: '⏰ Horario', value: scheduleText, inline: true },
            { name: '📍 Estado', value: 'Disponible', inline: true }
          )
          .setImage(activity.image)
          .setFooter({ text: `PeakyBoys APP`, iconURL: client.user.displayAvatarURL() })
          .setTimestamp();

        const button = new ButtonBuilder()
          .setCustomId(buttonId)
          .setLabel('Marcar como completada')
          .setStyle(ButtonStyle.Success);
        const row = new ActionRowBuilder().addComponents(button);
        
        const msg = await channel.send({
          content: `<@&1358937489393451079> Actividad disponible`,
          embeds: [embed],
          components: [row]
        });
        
        activityMessages[buttonId] = { message: msg, completed: false };
        activityMessageStore[buttonId] = { messageId: msg.id, channelId: activity.channelId, completed: false };
        saveData();
      });
    });
  });
  console.log('Sistema de actividades programado');

  await ensureRecruitmentMessage();
  await ensureGraffitiMessage();
  await ensureDealerMessage();
  await sendGraffitiStartEmbed(await client.channels.fetch(GRAFFITI_REG_CHANNEL_ID));

  let savedRems = [];
  try {
    if (fs.existsSync(REMINDERS_FILE)) {
        savedRems = JSON.parse(fs.readFileSync(REMINDERS_FILE, 'utf8'));
        console.log('[BOT] Recordatorios pendientes leídos correctamente del archivo.', savedRems.length);
    }
  } catch (e) {
    console.error('[BOT] Error al leer graffitiReminders.json al iniciar. Inicializando vacío.', e);
    if (fs.existsSync(REMINDERS_FILE)) {
        fs.renameSync(REMINDERS_FILE, `${REMINDERS_FILE}.bak-${Date.now()}`);
        console.log(`[BOT] Archivo ${REMINDERS_FILE} corrupto. Se creó un respaldo.`);
    }
  }

  const now = Date.now();
  let validRems = [];
  let reprogrammedCount = 0;

  for (const r of savedRems) {
    if (r && typeof r.defTimestamp === 'number' && typeof r.remTimestamp === 'number' && r.number && r.location) {
      const remDate = new Date(r.remTimestamp);
      const defDate = new Date(r.defTimestamp);

      if (now < defDate.getTime()) {
        validRems.push(r); 
        console.log(`[BOT] Reprogramando recordatorio para graffiti ${r.number} en ${defDate.toISOString()}`);

        if (now < remDate.getTime()) {
           console.log(`[BOT] Programando recordatorio (30 min antes) con node-schedule para: ${remDate.toISOString()}`);
           schedule.scheduleJob(remDate, async () => {
             try {
               console.log(`[GRAFFITI AVISO] [REPROGRAMADO] Ejecutando recordatorio para graffiti ${r.number}. Hora programada: ${remDate.toISOString()}`);
                 const ch = await client.channels.fetch(DEFENSE_CHANNEL_ID);
                 const embed = new EmbedBuilder()
                   .setTitle('RECORDATORIO DE DEFENSA')
                   .setColor('#ff9900')
                   .setDescription(`<@&${DEFENSE_ROLE_ID}> RECORDATORIO: En 30 min defiende el graffiti ${r.number} en ${r.location}.`)
                   .addFields(
                     { name: '📅 Fecha del registro', value: `<t:${Math.floor(r.defTimestamp / 1000 - 43200)}:F>`, inline: true },
                     { name: '⏰ Hora del registro', value: `<t:${Math.floor(r.defTimestamp / 1000 - 43200)}:t>`, inline: true }
                   )
                   .setImage(r.imageUrl)
                   .setFooter({ text: 'PeakyBoys APP - Graffitis', iconURL: client.user.displayAvatarURL() })
                   .setTimestamp();
                 await ch.send({ embeds: [embed] });
                 console.log(`[GRAFFITI AVISO] [REPROGRAMADO] Aviso de recordatorio enviado para graffiti ${r.number}.`);
             } catch (e) {
               console.error('[GRAFFITI AVISO] [REPROGRAMADO] Error al enviar aviso de recordatorio:', e);
             }
           });
        }

        console.log(`[BOT] Programando aviso de defensa (hora exacta) con node-schedule para: ${defDate.toISOString()}`);
        const jobDefReprogramado = schedule.scheduleJob(defDate, async () => {
          try {
            console.log(`[GRAFFITI AVISO] [REPROGRAMADO] Ejecutando aviso de defensa para graffiti ${r.number}. Hora programada: ${defDate.toISOString()}`);
            const ch = await client.channels.fetch(DEFENSE_CHANNEL_ID);
            const embed = new EmbedBuilder()
              .setTitle('¡HORA DE DEFENDER!')
              .setColor('#ff0000')
              .setDescription(`<@&${DEFENSE_ROLE_ID}> ¡HORA DE DEFENDER el graffiti ${r.number} en ${r.location}!`)
              .addFields(
                { name: '📅 Fecha del registro', value: `<t:${Math.floor(r.defTimestamp / 1000 - 43200)}:F>`, inline: true },
                { name: '⏰ Hora del registro', value: `<t:${Math.floor(r.defTimestamp / 1000 - 43200)}:t>`, inline: true }
              )
              .setImage(r.imageUrl)
              .setFooter({ text: 'PeakyBoys APP - Graffitis', iconURL: client.user.displayAvatarURL() })
              .setTimestamp();
            await ch.send({ embeds: [embed] });
            console.log(`[GRAFFITI AVISO] [REPROGRAMADO] Aviso de defensa enviado para graffiti ${r.number}.`);
            try {
              const currentRems = JSON.parse(fs.readFileSync(REMINDERS_FILE,'utf8'));
              const filteredRems = currentRems.filter(x=> x.defTimestamp !== r.defTimestamp);
              fs.writeFileSync(REMINDERS_FILE, JSON.stringify(filteredRems, null, 2), 'utf8');
              console.log(`[GRAFFITI AVISO] [REPROGRAMADO] Recordatorio para ${r.number} eliminado del archivo.`);
            } catch (e) {
              console.error('[GRAFFITI AVISO] [REPROGRAMADO] Error al eliminar recordatorio del archivo:', e);
            }
          } catch (e) {
            console.error('[GRAFFITI AVISO] [REPROGRAMADO] Error al enviar aviso de defensa o eliminar recordatorio:', e);
          }
        });
        reprogrammedCount++;

      } else {
         console.log(`[BOT] Recordatorio para graffiti ${r.number} en ${defDate.toISOString()} ya pasó. No se reprograma.`);
      }
    } else {
      console.warn('[BOT] Recordatorio inválido encontrado al cargar:', r, '. Será ignorado.');
    }
  }

  try {
    fs.writeFileSync(REMINDERS_FILE, JSON.stringify(validRems, null, 2), 'utf8');
    console.log(`[BOT] graffitiReminders.json reescrito con ${validRems.length} recordatorios futuros.`);
  } catch (e) {
    console.error('[BOT] Error al reescribir graffitiReminders.json:', e);
  }

  console.log(`[BOT] Total de recordatorios cargados: ${savedRems.length}. Reprogramados para el futuro: ${reprogrammedCount}. Descartados (pasados/inválidos): ${savedRems.length - reprogrammedCount}.`);

  if (isRecovering) {
    loadData();
    isRecovering = false;
    console.log('[BOT] El bot se ha recuperado y está listo para usarse.');
  }
});

client.on('messageDelete', async (message) => {
});

client.on('interactionCreate', async interaction => { 
  if (interaction.isCommand()) {
    console.log(`[COMANDO] ${interaction.user.tag} (${interaction.user.id}) ejecutó /${interaction.commandName} en ${interaction.guild?.name || 'DM'} (${interaction.guildId || 'DM'})`);
  }

  if (isRecovering) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.reply({
        content: '⚠️ El bot está recuperándose de un problema de conexión con Discord. Por favor, intenta de nuevo en unos segundos. Si el problema persiste, avisa a un administrador.',
        ephemeral: true
      });
    }
    return;
  }

  if (interaction.isCommand() && (interaction.commandName === 'veractividades' || interaction.commandName === 'rankings' || interaction.commandName === 'anuncio')) {
    const member = interaction.guild.members.cache.get(interaction.user.id);
    if (!member.roles.cache.some(role => ALLOWED_ROLES.includes(role.id))) {
      console.log(`[PERMISOS] ${interaction.user.tag} (${interaction.user.id}) intentó usar /${interaction.commandName} sin permisos.`);
      await interaction.reply({ content: '⛔ No tienes permisos para usar este comando.', ephemeral: true });
      return;
    }
  }

  if (interaction.isButton() && (interaction.customId.startsWith('warn_') || interaction.customId.startsWith('aclarar_'))) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.roles.cache.some(role => ALLOWED_ROLES.includes(role.id))) {
      console.log(`[PERMISOS] ${interaction.user.tag} (${interaction.user.id}) intentó usar un botón de ausencia sin permisos.`);
      await interaction.reply({ content: '⛔ No tienes permisos para usar este botón.', ephemeral: true });
      return;
    }
  }

  if (interaction.isButton() && interaction.customId.startsWith('warn_')) {
    const userId = interaction.customId.replace('warn_', '');
    const guild = getSafeGuild();
    if (!guild) return;
    const member = await guild.members.fetch(userId);
    if (member.roles.cache.has(EXCUSED_ROLE_ID)) {
      await interaction.reply({ content: 'Este usuario está ausente de manera justificada. No se enviará alerta.', ephemeral: true });
      return;
    }
    const success = await sendPrivateWarning(userId);
    console.log(`[BOT] ${interaction.user.tag} (${interaction.user.id}) intentó avisar por privado a ${userId}. Éxito: ${success}`);

    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
    const fields = embed.data.fields.map(f => {
      if (f.name === '¿Alerta enviada?') {
        return {
          name: '¿Alerta enviada?',
          value: success
            ? `✅ Alertado, en 24hs se volverá a revisar`
            : '❌ No se pudo enviar el mensaje privado',
          inline: false
        };
      }
      return f;
    });
    if (!fields.some(f => f.name === '¿Alerta enviada?')) {
      fields.push({
        name: '¿Alerta enviada?',
        value: success ? `✅ Alertado, en 24hs se volverá a revisar` : '❌ No se pudo enviar el mensaje privado',
        inline: false
      });
    }
    embed.setFields(fields);

    const button = ButtonBuilder.from(interaction.message.components[0].components[0])
      .setStyle(success ? ButtonStyle.Success : ButtonStyle.Danger)
      .setLabel(success ? 'Aviso enviado ✓' : 'Error al enviar - Click para reintentar')
      .setEmoji(success ? '✅' : '⚠️')
      .setDisabled(success);
    const aclararBtn = ButtonBuilder.from(interaction.message.components[0].components[1]).setDisabled(false);
    const row = new ActionRowBuilder().addComponents(button, aclararBtn);
    await interaction.update({ embeds: [embed], components: [row] });

    if (!success) {
      const inactivityChannel = await client.channels.fetch(INACTIVITY_CHANNEL_ID);
      await inactivityChannel.send({
        content: `⚠️ No se pudo enviar la alerta privada a <@${userId}>. Por favor, comunicate con el y dile que:\n• No tenga bloqueado al bot\n• Tenga permitidos los mensajes privados del servidor\n\nPuedes intentar enviar el aviso nuevamente haciendo clic en el botón.`,
        allowedMentions: { users: [userId] }
      });
    }

    if (success) {
      console.log(`[SISTEMA DE INACTIVIDAD] Programando revisión para ${userId} en ${ABSENCE_TIMEOUT/1000} segundos`);
      const nextCheck = Date.now() + ABSENCE_TIMEOUT;
      inactivityPending[userId] = {
        avisoEnviado: Date.now(),
        nextReview: nextCheck,
        estado: 'avisado'
      };
      saveData();
      const timeout = setTimeout(async () => {
        try {
          console.log(`[SISTEMA DE INACTIVIDAD] Ejecutando revisión programada para ${userId}`);
          const refreshedGuild = await client.guilds.fetch(GUILD_ID, { force: true });
          const refreshedMember = await refreshedGuild.members.fetch(userId, { force: true });
          
          if (refreshedMember.roles.cache.has(EXCUSED_ROLE_ID)) {
            console.log(`[SISTEMA DE INACTIVIDAD] Usuario ${userId} tiene ausencia justificada, no se enviará advertencia final`);
            await sendExcusedAbsenceInfo(userId);
            return;
          }

          const userActivities = activityHistory.get(userId) || [];
          const lastActivity = userActivities.length > 0 
            ? userActivities.sort((a, b) => b.timestamp - a.timestamp)[0] 
            : null;

          console.log(`[SISTEMA DE INACTIVIDAD] Última actividad de ${userId}:`, lastActivity ? new Date(lastActivity.timestamp).toLocaleString() : 'Sin actividades');

          if (!lastActivity || (Date.now() - lastActivity.timestamp > (ABSENCE_TIMEOUT - 1000))) {
            console.log(`[SISTEMA DE INACTIVIDAD] Enviando advertencia final a ${userId}`);
            const finalWarningSent = await sendFinalAbsenceWarning(userId);
            
            const inactivityChannel = await client.channels.fetch(INACTIVITY_CHANNEL_ID);
            const embed = EmbedBuilder.from(interaction.message.embeds[0]);
            const fields = embed.data.fields.map(f => {
              if (f.name === '¿Alerta enviada?') {
                return {
                  name: '¿Alerta enviada?',
                  value: finalWarningSent 
                    ? '✅ Advertencia final enviada'
                    : '❌ No se pudo enviar la advertencia final',
                  inline: false
                };
              }
              return f;
            });
            embed.setFields(fields);
            console.log('Enviando registro al canal de logs:', embed.data);
            await inactivityChannel.send({ embeds: [embed] });
          } else {
            console.log(`[SISTEMA DE INACTIVIDAD] Usuario ${userId} ha realizado actividad reciente, no se enviará advertencia final`);
          }
        } catch (err) {
          console.error('[SISTEMA DE INACTIVIDAD] Error en revisión de ausencia:', err);
        }
        delete inactivityPending[userId];
        saveData();
      }, ABSENCE_TIMEOUT);
      absenceTimeouts.set(userId, timeout);
    }
  }

  if (interaction.isButton() && interaction.customId.startsWith('aclarar_')) {
    const userId = interaction.customId.replace('aclarar_', '');
    const guild = getSafeGuild();
    if (!guild) return;
    const member = await guild.members.fetch(userId);
    if (!member.roles.cache.has(EXCUSED_ROLE_ID)) {
      await member.roles.add(EXCUSED_ROLE_ID);
    }
    await sendExcusedAbsenceInfo(userId);
    console.log(`[BOT] ${interaction.user.tag} (${interaction.user.id}) aclaró ausencia para ${userId}`);
    if (absenceTimeouts.has(userId)) {
      clearTimeout(absenceTimeouts.get(userId));
      absenceTimeouts.delete(userId);
      delete inactivityPending[userId];
      saveData();
    }
    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
    const fields = embed.data.fields.map(f => {
      if (f.name === '¿Alerta enviada?') {
        return {
          name: '¿Alerta enviada?',
          value: `✅ Ausencia aclarada y justificada por <@${interaction.user.id}>`,
          inline: false
        };
      }
      if (f.name === 'Ausencia justificada?') {
        return {
          name: 'Ausencia justificada?',
          value: '✅ Sí',
          inline: true
        };
      }
      return f;
    });
    embed.setFields(fields);
    const btn1 = ButtonBuilder.from(interaction.message.components[0].components[0]).setDisabled(true);
    const btn2 = ButtonBuilder.from(interaction.message.components[0].components[1]).setDisabled(true);
    const row = new ActionRowBuilder().addComponents(btn1, btn2);
    await interaction.update({ embeds: [embed], components: [row] });
  }

  if (interaction.isButton() && interaction.customId.startsWith('complete_')) {
    console.log(`[BOT] ${interaction.user.tag} (${interaction.user.id}) inició registro de actividad (${interaction.customId})`);
    const buttonId = interaction.customId;
    const modal = new ModalBuilder()
      .setCustomId(`registro_modal|${buttonId}`)
      .setTitle('Registro de Actividad');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('mas_participantes')
          .setLabel('¿Alguien más participó? (Sí/No)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
    await interaction.showModal(modal);

    const timeout = setTimeout(async () => {
      const temp = tempSelections.get(interaction.user.id);
      if (temp && !temp.imageUrl) {
        tempSelections.delete(interaction.user.id);   
        try {
          const comprobanteChannel = await client.channels.fetch('1372030159896576000');
          await comprobanteChannel.send({
            content: `<@${interaction.user.id}>, ❌ Proceso de subir imagen cancelado por inactividad (90 segundos).`,
            allowedMentions: { users: [interaction.user.id] }
          });
        } catch (e) {
          console.error('Error al enviar mensaje de timeout:', e);
        }
      }
    }, 90000);

    tempSelections.set(interaction.user.id, { 
      buttonId, 
      imageTimeout: timeout 
    });
    return;
  }

  if (interaction.isModalSubmit()) {
    const [prefix, buttonId] = interaction.customId.split('|');
    if (prefix !== 'registro_modal') return;
    const masParticipantes = interaction.fields.getTextInputValue('mas_participantes').trim().toLowerCase();
    const uid = interaction.user.id;
    console.log(`[BOT] ${interaction.user.tag} (${uid}) respondió participantes: ${masParticipantes}`);

    if (masParticipantes === 'no') {
      tempSelections.set(uid, { buttonId, solo: true });
      const prevTemp = tempSelections.get(uid);
      if (prevTemp && prevTemp.imageTimeout) {
        clearTimeout(prevTemp.imageTimeout);
      }
      await safeInteractionReply(interaction, { 
        content: 'Envia SOLO LA IMAGEN de prueba en el canal https://discord.com/channels/1340202784707973120/1372030159896576000. NO ELIMINAR LA IMAGEN LUEGO DE REGISTRARLA, tienes 90 segundos para subir la imagen a ese canal.',
        ephemeral: true 
      });
      const timeout = setTimeout(async () => {
        const temp = tempSelections.get(uid);
        if (temp && !temp.imageUrl) {
          tempSelections.delete(uid);
          try {
            const comprobanteChannel = await client.channels.fetch('1372030159896576000');
            await comprobanteChannel.send({
              content: `<@${uid}>, ❌ Tardaste demasiado en subir la actividad [90 segundos].`,
              allowedMentions: { users: [uid] }
            });
          } catch (e) {
            console.error('Error al enviar mensaje de timeout:', e);
          }
        }
      }, 90000);
      tempSelections.set(uid, { buttonId, solo: true, imageTimeout: timeout });
      return;
    }
    if (masParticipantes === 'sí' || masParticipantes === 'si') {
      tempSelections.set(uid, { buttonId, solo: false });
      const userSelect = new UserSelectMenuBuilder()
        .setCustomId(`userselect|${buttonId}`)
        .setPlaceholder('Selecciona a los que ayudaron (no te incluyas)')
        .setMinValues(1)
        .setMaxValues(10);
      const row = new ActionRowBuilder().addComponents(userSelect);
      await interaction.reply({ 
        content: 'Selecciona a los que ayudaron en la actividad. Luego tendras que subir en un canal la imagen.',
        components: [row], 
        ephemeral: true 
      });
      return;
    }
    return interaction.reply({ content: 'Responde "Sí" o "No" en la pregunta de participantes.', ephemeral: true });
  }

  if (interaction.isUserSelectMenu() && interaction.customId.startsWith('userselect|')) {
    console.log(`[BOT] ${interaction.user.tag} (${interaction.user.id}) seleccionó participantes: ${interaction.values.join(', ')}`);
    const buttonId = interaction.customId.split('|')[1];
    const uid = interaction.user.id;
    const temp = tempSelections.get(uid);
    if (!temp) {
      return safeInteractionReply(interaction, { content: 'Error interno, inténtalo de nuevo.', ephemeral: true });
    }
    if (temp.imageTimeout) {
      clearTimeout(temp.imageTimeout);
    }
    tempSelections.set(uid, { ...temp, seleccionados: interaction.values });
    await safeInteractionReply(interaction, { 
      content: 'Envia SOLO LA IMAGEN de prueba en el canal https://discord.com/channels/1340202784707973120/1372030159896576000. NO ELIMINAR LA IMAGEN LUEGO DE REGISTRARLA, tienes 90 segundos para subir la imagen a ese canal.',
      ephemeral: true 
    });
    const timeout = setTimeout(async () => {
      const temp = tempSelections.get(uid);
      if (temp && !temp.imageUrl) {
        tempSelections.delete(uid);
        try {
          const comprobanteChannel = await client.channels.fetch('1372030159896576000');
          await comprobanteChannel.send({
            content: `<@${uid}>, ❌ Tardaste demasiado en subir la actividad [90 segundos].`,
            allowedMentions: { users: [uid] }
          });
        } catch (e) {
          console.error('Error al enviar mensaje de timeout:', e);
        }
      }
    }, 90000);
    tempSelections.set(uid, { ...temp, seleccionados: interaction.values, imageTimeout: timeout });
    return;
  }

  if (interaction.isMessageComponent() && interaction.customId.startsWith('confirmar|')) {
    console.log(`[BOT] ${interaction.user.tag} (${interaction.user.id}) confirmó registro de actividad: ${interaction.customId}`);
    const buttonId = interaction.customId.split('|')[1];
    const uid = interaction.user.id;
    const temp = tempSelections.get(uid);
    if (!temp) {
      return safeInteractionReply(interaction, { content: 'Error interno, inténtalo de nuevo.', ephemeral: true });
    }
    const imageUrl = temp.imageUrl;
    if (!imageUrl) {
      return safeInteractionReply(interaction, { content: 'No se encontró la imagen. Por favor, intenta de nuevo.', ephemeral: true });
    }
    const activityTitle = buttonId.replace('complete_', '').replace(/_/g, ' ');
    console.log(`[BOT] ${interaction.user.tag} (${uid}) confirmó registro de actividad: ${activityTitle}`);

    try {
      if (temp.solo) {
        if (!activityStats.has(uid)) {
          activityStats.set(uid, new Map());
        }
        if (!activityHistory.has(uid)) {
          activityHistory.set(uid, []);
        }
        
        const stats = activityStats.get(uid);
        stats.set(activityTitle, (stats.get(activityTitle) || 0) + 1);
        
        const activityData = {
          activity: activityTitle,
          timestamp: Date.now(),
          points: activities.find(a => a.title === activityTitle)?.points || 0,
          imageUrl: imageUrl
        };
        
        activityHistory.get(uid).push(activityData);
        registrosCount++;
        userRegistros.set(uid, (userRegistros.get(uid) || 0) + 1);
        console.log('🟢 [REGISTRO INDIVIDUAL]');
        console.log('Usuario:', uid);
        console.log('Actividad:', activityTitle);
        console.log('Stats:', Object.fromEntries(stats));
        console.log('Historial:', JSON.stringify(activityHistory.get(uid), null, 2));
        saveData();
        updateActivityEmbedCompleted(buttonId, uid, Date.now());
        const logCh = await client.channels.fetch(LOG_CHANNEL_ID);
        const puntos = activities.find(a => a.title === activityTitle)?.points || 0;
        const userStats = activityStats.get(uid) || new Map();
        const totalActividades = Array.from(userStats.values()).reduce((a, b) => a + b, 0);
        const logEmbed = new EmbedBuilder()
          .setTitle(`Una actividad se registro.`)
          .setColor('#FF0000')
          .addFields(
            { name: 'Actividad', value: activityTitle, inline: false },
            { name: 'Participante', value: `<@${uid}>`, inline: false },
            { name: 'Puntos obtenidos', value: `${puntos}`, inline: true },
            { name: 'Fecha y hora', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true },
            { name: 'Total de actividades de este usuario', value: `${totalActividades}`, inline: true }
          )
          .setImage(imageUrl)
          .setThumbnail((await client.users.fetch(uid)).displayAvatarURL())
          .setFooter({ text: 'PeakyBoys APP', iconURL: client.user.displayAvatarURL() })
          .setTimestamp();
        try {
          await logCh.send({ embeds: [logEmbed] });
          console.log('📤 [LOG ENVIADO] Embed:', {
            actividad: activityTitle,
            participante: `<@${uid}>`,
            puntos,
            fecha: new Date().toLocaleString()
          });
        } catch (err) {
          console.error('❌ [ERROR ENVIANDO LOG INDIVIDUAL]', err);
          console.error('Embed fallido:', logEmbed.data);
        }
        await interaction.reply({ content: 'Actividad registrada correctamente (solo).', ephemeral: true });
      } else {
        const seleccionados = temp.seleccionados || [];
        if (seleccionados.includes(uid)) {
          return interaction.reply({ content: 'No puedes seleccionarte a ti mismo, solo debes elegir a los que te ayudaron.', ephemeral: true });
        }
        
        const todos = Array.from(new Set([uid, ...seleccionados]));
        console.log(`🟢 [REGISTRO GRUPAL]`);
        console.log('Participantes:', todos);
        console.log('Actividad:', activityTitle);
        console.log('Stats:', Object.fromEntries(activityStats));
        console.log('Historial:', JSON.stringify(Object.fromEntries(activityHistory), null, 2));
        todos.forEach(pid => {
          if (!activityStats.has(pid)) {
            activityStats.set(pid, new Map());
          }
          if (!activityHistory.has(pid)) {
            activityHistory.set(pid, []);
          }
          
          const stats = activityStats.get(pid);
          stats.set(activityTitle, (stats.get(activityTitle) || 0) + 1);
          
          const activityData = {
            activity: activityTitle,
            timestamp: Date.now(),
            points: activities.find(a => a.title === activityTitle)?.points || 0,
            imageUrl: imageUrl
          };
          
          activityHistory.get(pid).push(activityData);
        });
        
        registrosCount++;
        saveData();
        updateActivityEmbedCompleted(buttonId, todos, Date.now());
        const logCh = await client.channels.fetch(LOG_CHANNEL_ID);
        const puntos = activities.find(a => a.title === activityTitle)?.points || 0;
        const participantesTexto = todos.map(pid => `<@${pid}>`).join('\n');
        const logEmbed = new EmbedBuilder()
          .setTitle(`Una actividad se registro.`)
          .setColor('#FF0000')
          .addFields(
            { name: 'Actividad', value: activityTitle, inline: false },
            { name: 'Participantes', value: participantesTexto, inline: false },
            { name: 'Puntos obtenidos', value: `${puntos}`, inline: true },
            { name: 'Fecha y hora', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
          )
          .setImage(imageUrl)
          .setFooter({ text: 'PeakyBoys APP', iconURL: client.user.displayAvatarURL() })
          .setTimestamp();
        try {
          await logCh.send({ embeds: [logEmbed] });
          console.log('📤 [LOG GRUPAL ENVIADO] Embed:', {
            actividad: activityTitle,
            participantes: participantesTexto,
            puntos,
            fecha: new Date().toLocaleString()
          });
        } catch (err) {
          console.error('❌ [ERROR ENVIANDO LOG GRUPAL]', err);
          console.error('Embed fallido:', logEmbed.data);
        }
        await interaction.reply({ content: `Actividad registrada correctamente con ${todos.length} participantes.`, ephemeral: true });
      }

      tempSelections.delete(uid);
      try { await interaction.message.delete(); } catch (e) {}
    } catch (error) {
      console.error('Error al registrar actividad:', error);
      await interaction.reply({ content: '❌ Ocurrió un error al registrar la actividad. Por favor, intenta nuevamente.', ephemeral: true });
    }
    return;
  }

  if (interaction.isMessageComponent() && interaction.customId.startsWith('cancelar|')) {
    console.log(`[BOT] ${interaction.user.tag} (${interaction.user.id}) canceló el registro de actividad.`);
    const temp = tempSelections.get(interaction.user.id);
    tempSelections.delete(interaction.user.id);
    await interaction.reply({ content: 'Registro cancelado.', ephemeral: true });
    try { 
      const confirmMessage = await interaction.message;
      await confirmMessage.delete();
    } catch (e) {
      console.error('Error al eliminar mensaje de confirmación:', e);
    }
    return;
  }

  if (interaction.isCommand() && interaction.commandName === 'anuncio') {
    const titulo = interaction.options.getString('titulo');
    const mensaje = interaction.options.getString('mensaje');
    const usuario = interaction.options.getUser('usuario');
    const urlImagen = interaction.options.getString('url_imagen');
    const color = '#ff0000';
    const logoURL = 'https://cdn.discordapp.com/attachments/1370661672582381569/1371573782858301550/imgg1212.jpg?ex=6823a120&is=68224fa0&hm=1c062ba021b11014de961a7422d13fd90a25fbfe193578160e77861a7f387854&';
    const ROL_MINIMO_ID = '1358938287661781075';
    
    await interaction.deferReply();
    let failedUsers = [];
    let sentCount = 0;
    let failedCount = 0;

    const statsEmbed = new EmbedBuilder()
      .setTitle('📢 Enviando Anuncio')
      .setColor(color)
      .setDescription('Iniciando envío de anuncios...')
      .addFields(
        { name: '✅ Enviados', value: '0', inline: true },
        { name: '❌ Fallidos', value: '0', inline: true },
        { name: '⏳ Pendientes', value: 'Calculando...', inline: true },
        { name: '❌ Usuarios con mensajes bloqueados', value: 'Ninguno', inline: false }
      )
      .setThumbnail(logoURL)
      .setFooter({ text: 'PeakyBoys APP - Sistema de Anuncios', iconURL: logoURL })
      .setTimestamp();

    await interaction.editReply({ embeds: [statsEmbed] });

    try {
      const guild = await client.guilds.fetch(GUILD_ID);
      const members = await guild.members.fetch();
      const anuncioEmbed = new EmbedBuilder()
        .setTitle(titulo)
        .setColor(color)
        .setDescription(mensaje)
        .setThumbnail(logoURL)
        .setFooter({ text: 'PeakyBoys APP - Sistema de Anuncios', iconURL: logoURL })
        .setTimestamp();
      if (urlImagen) {
        anuncioEmbed.setImage(urlImagen);
      }

      const sleep = ms => new Promise(res => setTimeout(res, ms));
      let destinatarios = [];

      if (usuario) {
        try {
          const member = await guild.members.fetch(usuario.id);
          const rolMinimo = guild.roles.cache.get(ROL_MINIMO_ID);
          
          if (!member) {
            await interaction.editReply({ 
              content: '❌ El usuario no se encuentra en el servidor.',
              embeds: [] 
            });
            return;
          }

          if (member.roles.cache.has(ROL_MINIMO_ID) || 
              (rolMinimo && member.roles.highest.position >= rolMinimo.position)) {
            destinatarios = [member];
          } else {
            await interaction.editReply({ 
              content: '❌ El usuario seleccionado no tiene el rol mínimo requerido para recibir el anuncio.',
              embeds: [] 
            });
            return;
          }
        } catch (error) {
          console.error('Error al procesar usuario específico:', error);
          await interaction.editReply({ 
            content: '❌ Error al procesar el usuario seleccionado. Verifica que el usuario existe y tiene los permisos necesarios.',
            embeds: [] 
          });
          return;
        }
      } else {
        const rolMinimo = guild.roles.cache.get(ROL_MINIMO_ID);
        if (!rolMinimo) {
          await interaction.editReply({ 
            content: '❌ Error: No se encontró el rol mínimo configurado.',
            embeds: [] 
          });
          return;
        }

        destinatarios = members.filter(member =>
          !member.user.bot &&
          (member.roles.cache.has(ROL_MINIMO_ID) || member.roles.highest.position >= rolMinimo.position)
        ).map(m => m);
      }

      const totalMembers = destinatarios.length;
      if (totalMembers === 0) {
        await interaction.editReply({ 
          content: '❌ No se encontraron destinatarios válidos para el anuncio.',
          embeds: [] 
        });
        return;
      }

      for (const member of destinatarios) {
        try {
          let mensajePersonalizado = mensaje;
          if (mensaje.includes('<user>')) {
            mensajePersonalizado = mensaje.replace(/<user>/g, `<@${member.user.id}>`);
          }
          const embedPersonalizado = EmbedBuilder.from(anuncioEmbed).setDescription(mensajePersonalizado);
          await member.user.send({ embeds: [embedPersonalizado] });
          sentCount++;
          console.log(`[ANUNCIO] Mensaje enviado correctamente a ${member.user.tag} (${member.user.id})`);
        } catch (error) {
          failedCount++;
          failedUsers.push(`<@${member.user.id}>`);
          console.log(`[ANUNCIO] Fallo al enviar mensaje a ${member.user.tag} (${member.user.id}): ${error.message}`);
        }

        const updatedEmbed = EmbedBuilder.from(statsEmbed)
          .setFields(
            { name: '✅ Enviados', value: sentCount.toString(), inline: true },
            { name: '❌ Fallidos', value: failedCount.toString(), inline: true },
            { name: '⏳ Pendientes', value: (totalMembers - sentCount - failedCount).toString(), inline: true },
            { name: '❌ Usuarios con mensajes bloqueados', value: failedUsers.length > 0 ? failedUsers.join(', ') : 'Ninguno', inline: false }
          );

        await interaction.editReply({ embeds: [updatedEmbed] });
        await sleep(1000);
      }

      const finalEmbed = new EmbedBuilder()
        .setTitle('Anuncio Completado')
        .setColor(color)
        .setDescription('El anuncio ha sido enviado a los destinatarios.')
        .addFields(
          { name: '✅ Enviados', value: sentCount.toString(), inline: true },
          { name: '❌ Fallidos', value: failedCount.toString(), inline: true },
          { name: '❌ Usuarios con mensajes bloqueados', value: failedUsers.length > 0 ? failedUsers.join(', ') : 'Ninguno', inline: false },
          { name: '📝 Recordatorio', value: 'Para recibir anuncios importantes, asegúrate de:\n• No tener bloqueado al bot\n• Tener permitidos los mensajes privados del servidor', inline: false }
        )
        .setThumbnail(logoURL)
        .setFooter({ text: 'PeakyBoys APP - Sistema de Anuncios', iconURL: logoURL })
        .setTimestamp();

      await interaction.editReply({ embeds: [finalEmbed] });
      console.log(`[ANUNCIO] Proceso completado. Enviados: ${sentCount}, Fallidos: ${failedCount}`);
    } catch (error) {
      console.error('Error en el comando anuncio:', error);
      await interaction.editReply({ 
        content: '❌ Ocurrió un error al procesar el anuncio. Por favor, intenta nuevamente.',
        embeds: [] 
      });
    }
  }

  if (interaction.isCommand() && interaction.commandName === 'rankings') {
    try {
      await interaction.deferReply();
      const fechaInicioStr = interaction.options.getString('fecha_inicio');
      const fechaFinStr = interaction.options.getString('fecha_fin');
      
      let fechaInicio = null;
      let fechaFin = null;
      
      if (fechaInicioStr) {
        fechaInicio = moment(fechaInicioStr, 'DD/MM/YYYY').startOf('day');
        if (!fechaInicio.isValid()) {
          await interaction.editReply({ content: '❌ Formato de fecha de inicio inválido. Use DD/MM/YYYY', embeds: [] });
          return;
        }
      }
      
      if (fechaFinStr) {
        fechaFin = moment(fechaFinStr, 'DD/MM/YYYY').endOf('day');
        if (!fechaFin.isValid()) {
          await interaction.editReply({ content: '❌ Formato de fecha de fin inválido. Use DD/MM/YYYY', embeds: [] });
          return;
        }
      }

      const userTotals = new Map();
      for (const [userId, actividades] of activityHistory.entries()) {
        let count = 0;
        for (const act of actividades) {
          if (fechaInicio && fechaFin) {
            const fecha = moment(act.timestamp);
            if (fecha.isBetween(fechaInicio, fechaFin, 'day', '[]')) count++;
          } else {
            count++;
          }
        }
        if (count > 0) userTotals.set(userId, count);
      }

      const ranking = Array.from(userTotals.entries()).sort((a, b) => b[1] - a[1]);
      let rankingText = ranking.length > 0
        ? ranking.map(([userId, count], i) => `${i + 1}. <@${userId}> — **${count}** actividades`).join('\n')
        : 'No hay actividades registradas en este período.';

      let periodo = 'Todos los tiempos';
      if (fechaInicio && fechaFin) {
        periodo = `${fechaInicio.format('DD/MM/YYYY')} a ${fechaFin.format('DD/MM/YYYY')}`;
      }

      const embed = new EmbedBuilder()
        .setTitle('🏆 Ranking de actividades')
        .setDescription(rankingText)
        .addFields({ name: '📅 Período', value: periodo, inline: false })
        .setColor('#FF0000')
        .setFooter({ text: 'PeakyBoys APP', iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error en el comando rankings:', error);
      await interaction.editReply({ 
        content: '❌ Ocurrió un error al procesar el ranking. Por favor, intenta nuevamente.',
        embeds: [] 
      });
    }
    return;
  }

  if (interaction.isCommand() && interaction.commandName === 'veractividades') {
    try {
      await interaction.deferReply();
      const user = interaction.options.getUser('usuario');
      if (!user) {
        await interaction.editReply({ content: '❌ Usuario no encontrado.', embeds: [] });
        return;
      }

      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        await interaction.editReply({ content: '❌ El usuario no se encuentra en el servidor.', embeds: [] });
        return;
      }

      const fechaInicio = moment(interaction.options.getString('fecha_inicio'), 'DD/MM/YYYY').startOf('day');
      const fechaFin = moment(interaction.options.getString('fecha_fin'), 'DD/MM/YYYY').endOf('day');

      if (!fechaInicio.isValid() || !fechaFin.isValid()) {
        await interaction.editReply({ content: '❌ Formato de fecha inválido. Use DD/MM/YYYY', embeds: [] });
        return;
      }

      const userActivities = activityHistory.get(user.id) || [];
      const filteredActivities = userActivities.filter(activity => {
        const activityDate = moment(activity.timestamp);
        return activityDate.isBetween(fechaInicio, fechaFin, 'day', '[]');
      });

      const normalActs = new Map();
      const graffitiActs = new Map();
      const dealerActs = new Map();
      filteredActivities.forEach(activity => {
        if (activity.activity.startsWith('Graffiti - ')) {
          const zona = activity.activity.replace('Graffiti - ', '');
          graffitiActs.set(zona, (graffitiActs.get(zona) || 0) + 1);
        } else if (activity.activity.startsWith('Dealer - ')) {
          const dealer = activity.activity.replace('Dealer - ', '');
          dealerActs.set(dealer, (dealerActs.get(dealer) || 0) + 1);
        } else {
          const baseName = activity.activity.replace(/\s\d{8,}\s\d{4}$/, '').trim();
          normalActs.set(baseName, (normalActs.get(baseName) || 0) + 1);
        }
      });

      const apodo = member ? member.displayName : user.username;
      const fechaUnion = member && member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:D>` : 'Desconocida';

      let actividadesText = normalActs.size > 0
        ? Array.from(normalActs.entries()).map(([activity, count]) => `• ${activity}: ${count} realizadas`).join('\n')
        : '❌ Ninguna actividad registrada en este período.';
      let graffitiText = graffitiActs.size > 0
        ? Array.from(graffitiActs.entries()).map(([zona, count]) => `• ${zona}: ${count} realizados`).join('\n')
        : '❌ Ningún graffiti registrado en este período.';
      let dealerText = dealerActs.size > 0
        ? Array.from(dealerActs.entries()).map(([dealer, count]) => `• ${dealer}: ${count} realizados`).join('\n')
        : '❌ Ningún dealer registrado en este período.';

      const total = filteredActivities.length;

      const actividadesFields = splitField('📊 Actividades', actividadesText);
      const graffitiFields = splitField('🥊 Graffitis', graffitiText);
      const dealerFields = splitField('💼 Dealers', dealerText);

      const embed = new EmbedBuilder()
        .setTitle(`📋 Actividades de ${user.username}`)
        .setColor(total > 0 ? '#43b581' : '#ff6961')
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: '👤 Apodo actual', value: apodo, inline: false },
          { name: '📅 Período', value: `${fechaInicio.format('DD/MM/YYYY')} a ${fechaFin.format('DD/MM/YYYY')}`, inline: false },
          ...actividadesFields,
          ...graffitiFields,
          ...dealerFields,
          { name: '🔢 Total general', value: `**${total}**`, inline: false },
          { name: '📥 Miembro desde', value: fechaUnion, inline: false }
        )
        .setFooter({ text: 'PeakyBoys APP', iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error en el comando veractividades:', error);
      await interaction.editReply({ 
        content: '❌ Ocurrió un error al procesar las actividades. Por favor, intenta nuevamente.',
        embeds: [] 
      });
    }
    return;
  }

  if (interaction.isButton() && interaction.customId === 'graffiti_participate') {
    const select = new StringSelectMenuBuilder()
      .setCustomId('graffiti_zone_select')
      .setPlaceholder('Selecciona la zona del graffiti')
      .addOptions(GRAFFITI_ZONES.map(z => ({ label: z, value: z })));
    const row = new ActionRowBuilder().addComponents(select);
    await interaction.reply({
      content: 'Selecciona la zona donde participaste en el graffiti:',
      components: [row],
      ephemeral: true
    });
    tempSelections.set(interaction.user.id, { graffiti: true });
    return;
  }
  if (interaction.isStringSelectMenu() && interaction.customId === 'graffiti_zone_select') {
    const zone = interaction.values[0];
    if (!GRAFFITI_ZONES.includes(zone)) {
      await interaction.reply({ content: 'Zona inválida.', ephemeral: true });
      return;
    }
    tempSelections.set(interaction.user.id, { graffiti: true, zone });
    await interaction.reply({
      content: 'Ahora sube la imagen de tu participación en el graffiti en el canal <#1372030159896576000>. NO ELIMINES LA IMAGEN LUEGO DE REGISTRARLA, tienes 90 segundos para subir la imagen a ese canal.',
      ephemeral: true
    });
    const timeout = setTimeout(() => handleImageTimeout(interaction.user.id, interaction, 'graffiti'), IMAGE_UPLOAD_TIMEOUT);
    tempSelections.set(interaction.user.id, { graffiti: true, zone, imageTimeout: timeout });
    return;
  }

  if (interaction.isMessageComponent() && interaction.customId === 'graffiti_confirm') {
    const temp = tempSelections.get(interaction.user.id);
    if (!temp || !temp.graffiti || !temp.zone || !temp.imageUrl) {
      await interaction.reply({ content: 'Error interno en el registro de graffiti, inténtalo de nuevo.', ephemeral: true });
      await safeInteractionReply(interaction, { content: 'Error interno en el registro de graffiti, inténtalo de nuevo.', ephemeral: true });
      try { await interaction.message.delete().catch(()=>{}); } catch (e) {} 
      return;
    }
    
    const graffitiLogCh = await client.channels.fetch(GRAFFITI_LOG_CHANNEL_ID);
    const embed = new EmbedBuilder()
      .setTitle('Registro de participación en Graffiti')
      .setColor('#ff0000')
      .addFields(
        { name: 'Participante', value: `<@${interaction.user.id}>`, inline: false },
        { name: 'Zona', value: temp.zone, inline: true },
        { name: 'Fecha y hora', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
      )
      .setImage(temp.imageUrl)
      .setThumbnail((await client.users.fetch(interaction.user.id)).displayAvatarURL())
      .setFooter({ text: 'PeakyBoys APP - Graffitis', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    await graffitiLogCh.send({ embeds: [embed] });
    
    if (!activityHistory.has(interaction.user.id)) activityHistory.set(interaction.user.id, []);
    activityHistory.get(interaction.user.id).push({
      activity: `Graffiti - ${temp.zone}`,
      timestamp: Date.now(),
      points: 0,
      imageUrl: temp.imageUrl
    });
    saveData();
    
    await interaction.reply({ content: '¡Registro de graffiti guardado correctamente!', ephemeral: true });
    tempSelections.delete(interaction.user.id); 
    try { await interaction.message.delete().catch(()=>{}); } catch (e) {} 
    return;
  }
  
  if (interaction.isMessageComponent() && interaction.customId === 'graffiti_cancel') {
    const temp = tempSelections.get(interaction.user.id);
    if (temp && temp.graffiti) { 
       tempSelections.delete(interaction.user.id);
       await interaction.reply({ content: 'Registro de graffiti cancelado.', ephemeral: true });
       try { await interaction.message.delete().catch(()=>{}); } catch (e) {} 
    }
    return;
  }

  if (interaction.isButton() && interaction.customId === 'dealer_participate') {
    const select = new StringSelectMenuBuilder()
      .setCustomId('dealer_select')
      .setPlaceholder('Selecciona el dealer')
      .addOptions(DEALER_OPTIONS.map(z => ({ label: z, value: z })));
    const row = new ActionRowBuilder().addComponents(select);
    await interaction.reply({
      content: 'Selecciona en cuál dealer participaste:',
      components: [row],
      ephemeral: true
    });
    tempSelections.set(interaction.user.id, { dealer: true });
    return;
  }
  if (interaction.isStringSelectMenu() && interaction.customId === 'dealer_select') {
    const dealer = interaction.values[0];
    if (!DEALER_OPTIONS.includes(dealer)) {
      await interaction.reply({ content: 'Dealer inválido.', ephemeral: true });
      return;
    }
    tempSelections.set(interaction.user.id, { dealer: true, dealerName: dealer });
    await interaction.reply({
      content: 'Ahora sube la imagen de tu participación en el dealer en el canal <#1372030159896576000>. NO ELIMINES LA IMAGEN LUEGO DE REGISTRARLA, tienes 90 segundos para subir la imagen a ese canal.',
      ephemeral: true
    });
    const timeout = setTimeout(() => handleImageTimeout(interaction.user.id, interaction, 'dealer'), IMAGE_UPLOAD_TIMEOUT);
    tempSelections.set(interaction.user.id, { dealer: true, dealerName: dealer, imageTimeout: timeout });
    return;
  }
  if (interaction.isMessageComponent() && interaction.customId === 'dealer_confirm') {
    const temp = tempSelections.get(interaction.user.id);
    if (!temp || !temp.dealer || !temp.dealerName || !temp.imageUrl) {
      await interaction.reply({ content: 'Error interno en el registro de dealer, inténtalo de nuevo.', ephemeral: true });
      tempSelections.delete(interaction.user.id); 
      try { await interaction.message.delete().catch(()=>{}); } catch (e) {} 
      return;
    }
    
    const dealerLogCh = await client.channels.fetch(DEALER_LOG_CHANNEL_ID);
    const embed = new EmbedBuilder()
      .setTitle('Registro de participación en Dealer')
      .setColor('#ff0000')
      .addFields(
        { name: 'Participante', value: `<@${interaction.user.id}>`, inline: false },
        { name: 'Dealer', value: temp.dealerName, inline: true },
        { name: 'Fecha y hora', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
      )
      .setImage(temp.imageUrl)
      .setThumbnail((await client.users.fetch(interaction.user.id)).displayAvatarURL())
      .setFooter({ text: 'PeakyBoys APP - Dealer', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    await dealerLogCh.send({ embeds: [embed] });
    
    if (!activityHistory.has(interaction.user.id)) activityHistory.set(interaction.user.id, []);
    activityHistory.get(interaction.user.id).push({
      activity: `Dealer - ${temp.dealerName}`,
      timestamp: Date.now(),
      points: 0,
      imageUrl: temp.imageUrl
    });
    saveData();
    
    await interaction.reply({ content: '¡Registro de dealer guardado correctamente!', ephemeral: true });
    tempSelections.delete(interaction.user.id); 
    try { await interaction.message.delete().catch(()=>{}); } catch (e) {} 
    return;
  }
  
  if (interaction.isMessageComponent() && interaction.customId === 'dealer_cancel') {
    const temp = tempSelections.get(interaction.user.id);
    if (temp && temp.dealer) { 
      tempSelections.delete(interaction.user.id);
      await interaction.reply({ content: 'Registro de dealer cancelado.', ephemeral: true });
      try { await interaction.message.delete().catch(()=>{}); } catch (e) {} 
    }
    return;
  }

  if (interaction.isButton() && interaction.customId === 'recruitment_fillinfo') {
    await interaction.deferReply({ ephemeral: true });

    const user = interaction.user;
    const guild = interaction.guild;
    if (!guild) {
      await interaction.editReply({ content: 'Error: no se pudo crear el canal.' });
      return;
    }

    if (recruitmentSessions.has(user.id)) {
      const channelId = recruitmentSessions.get(user.id);
      try {
        const existingChannel = await guild.channels.fetch(channelId);
        if (existingChannel) {
          await interaction.editReply({ content: `⛔ Ya tienes un canal de reclutamiento abierto: <#${channelId}>. Por favor, completa el proceso ahí antes de abrir uno nuevo.` });
          return;
        }
      } catch (e) {
        recruitmentSessions.delete(user.id);
      }
    }

    const channelName = `reclutamiento-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const overwrites = [
      { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
    ];
    for (const roleId of ALLOWED_ROLES) {
      overwrites.push({ id: roleId, allow: [PermissionsBitField.Flags.ViewChannel] });
    }
    try {
      const channel = await guild.channels.create({
        name: channelName,
        permissionOverwrites: overwrites,
        type: 0, 
        parent: '1374977403855835288'   
      });
      recruitmentSessions.set(user.id, channel.id);

      await interaction.editReply({ content: `Canal de reclutamiento creado: <#${channel.id}>` });

      const instructionsEmbed = new EmbedBuilder()
        .setTitle('📝 Proceso de Reclutamiento')
        .setColor('#ff0000')
        .setDescription('Bienvenido al proceso de reclutamiento de PeakyBoys. Por favor, sigue estas instrucciones:\n\n' +
          '1️⃣ Deberás proporcionar la siguiente información:\n' +
          '• Nombre y Apellido\n' +
          '• Número IC\n' +
          '• Hash\n' +
          '• Foto de tu rostro\n' +
          '• Comprobante de pago ($350.000)\n\n' +
          '2️⃣ Para cada paso:\n' +
          '• Responde la pregunta que se te haga\n' +
          '• Confirma tu respuesta con el botón "Confirmar"\n' +
          '• Si necesitas corregir, usa el botón "Cancelar"\n\n' +
          '3️⃣ Para las imágenes:\n' +
          '• Sube directamente la imagen al canal\n' +
          '• Asegúrate de que sea clara y legible\n' +
          '• Confirma que sea la correcta\n\n' +
          '⚠️ **IMPORTANTE**: Tienes 24 horas para completar el proceso. Si no lo completas, deberás iniciarlo nuevamente.\n\n' +
          '---\n' +
          'Si te equivocaste y no realizaste correctamente el relleno de información, clickea este botón para volver a comenzar')
        .setFooter({ text: 'PeakyBoys APP - Reclutamiento', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

      const reiniciarRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('recruit_restart')
          .setLabel('Reiniciar')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🔄')
      );

      await channel.send({ embeds: [instructionsEmbed], components: [reiniciarRow] });

      const filter = m => m.author.id === user.id;
      let name = '';
      while (true) {
        await channel.send('**¡LEE EL PASO A PASO ANTES DE ENVIAR! SOLO ENVÍA LA INFORMACIÓN SOLICITADA, NO MÁS.**');
        await channel.send(`<@${user.id}>, ¿Cuál es tu nombre y apellido? (máximo 20 caracteres)`);
        const collectedName = await channel.awaitMessages({ filter, max: 1, time: 86400000 });
        const responseName = collectedName.first();
        if (!responseName) return; 
        name = responseName.content.trim();
        if (name.length > 20) {
          await channel.send('❌ El nombre y apellido debe tener máximo 20 caracteres. Intenta de nuevo.');
          continue;
        }
        const embed = new EmbedBuilder()
          .setTitle('Nombre y Apellido')
          .setDescription(name)
          .setColor('#ff0000');
        const confirmBtn = new ButtonBuilder().setCustomId('recruit_name_confirm').setLabel('Confirmar').setStyle(ButtonStyle.Success);
        const cancelBtn = new ButtonBuilder().setCustomId('recruit_name_cancel').setLabel('Cancelar').setStyle(ButtonStyle.Danger);
        const row = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);
        const confirmMessage = await channel.send({ content: '¿Es este tu nombre y apellido correcto?', embeds: [embed], components: [row] });
        const decision = await confirmMessage.awaitMessageComponent({ filter: i => i.user.id === user.id, componentType: 2, time: 86400000 });
        if (decision.customId === 'recruit_name_confirm') {
          await decision.update({
            content: '=======================================\n\n ● :speaking_head:​ 𝙉𝙤𝙢𝙗𝙧𝙚 𝙮 𝙖𝙥𝙚𝙡𝙡𝙞𝙙𝙤 𝙘𝙤𝙣𝙛𝙞𝙧𝙢𝙖𝙙𝙤𝙨.:white_check_mark:\n\n=======================================',
            embeds: [],
            components: []
          });
          break;
        } else {
          await decision.update({ content: '✏️ Por favor ingresa nuevamente tu nombre y apellido.', embeds: [], components: [] });
          continue;
        }
      }

      let ic = '';
      while (true) {
        await channel.send(`<@${user.id}>, ¿Cuál es tu número IC? (máximo 6 dígitos)`);
        const collectedIC = await channel.awaitMessages({ filter, max: 1, time: 86400000 });
        const responseIC = collectedIC.first();
        if (!responseIC) return;
        ic = responseIC.content.trim();
        if (!/^\d{1,6}$/.test(ic)) {
          await channel.send('❌ El número IC debe ser solo números y máximo 6 dígitos. Ejemplo: 123456');
          continue;
        }
        const embed = new EmbedBuilder()
          .setTitle('Número IC')
          .setDescription(ic)
          .setColor('#ff0000');
        const confirmBtn = new ButtonBuilder().setCustomId('recruit_ic_confirm').setLabel('Confirmar').setStyle(ButtonStyle.Success);
        const cancelBtn = new ButtonBuilder().setCustomId('recruit_ic_cancel').setLabel('Cancelar').setStyle(ButtonStyle.Danger);
        const row = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);
        const confirmMessage = await channel.send({ content: '¿Es este tu número IC correcto?', embeds: [embed], components: [row] });
        const decision = await confirmMessage.awaitMessageComponent({ filter: i => i.user.id === user.id, componentType: 2, time: 86400000 });
        if (decision.customId === 'recruit_ic_confirm') {
          await decision.update({
            content: '=======================================\n\n ● :calling: 𝙉𝙪𝙢𝙚𝙧𝙤 𝙄𝘾 𝙘𝙤𝙣𝙛𝙞𝙧𝙢𝙖𝙙𝙤. :white_check_mark:\n\n=======================================',
            embeds: [],
            components: []
          });
          break;
        } else {
          await decision.update({ content: '✏️ Por favor ingresa nuevamente tu número IC.', embeds: [], components: [] });
          continue;
        }
      }

      let hash = '';
      while (true) {
        await channel.send(`<@${user.id}>, ¿Cuál es tu hash? (Ejemplo: #ASDF, máximo 5 caracteres incluyendo el #, envialos en mayusculas)`);
        const collectedHash = await channel.awaitMessages({ filter, max: 1, time: 86400000 });
        const responseHash = collectedHash.first();
        if (!responseHash) return;
        hash = responseHash.content.trim();
        if (!/^#[A-Za-z0-9]{1,4}$/.test(hash)) {
          await channel.send('❌ El hash debe empezar con # y tener máximo 5 caracteres en total. Ejemplo: #ASDF');
          continue;
        }
        const embed = new EmbedBuilder()
          .setTitle('Hash')
          .setDescription(hash)
          .setColor('#ff0000');
        const confirmBtn = new ButtonBuilder().setCustomId('recruit_hash_confirm').setLabel('Confirmar').setStyle(ButtonStyle.Success);
        const cancelBtn = new ButtonBuilder().setCustomId('recruit_hash_cancel').setLabel('Cancelar').setStyle(ButtonStyle.Danger);
        const row = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);
        const confirmMessage = await channel.send({ content: '¿Es este tu hash correcto?', embeds: [embed], components: [row] });
        const decision = await confirmMessage.awaitMessageComponent({ filter: i => i.user.id === user.id, componentType: 2, time: 86400000 });
        if (decision.customId === 'recruit_hash_confirm') {
          await decision.update({
            content: '=======================================\n\n ● :key: 𝙃𝙖𝙨𝙝 𝙘𝙤𝙣𝙛𝙞𝙧𝙢𝙖𝙙𝙤. :white_check_mark:\n\n=======================================',
            embeds: [],
            components: []
          });
          break;
        } else {
          await decision.update({ content: '✏️ Por favor ingresa nuevamente tu hash.', embeds: [], components: [] });
          continue;
        }
      }

      const urlRegex = /^(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/i;
      let photoUrl = '';
      while (true) {
        await channel.send(`<@${user.id}>, por favor, sube una foto de tu rostro SIN ACCESORIOS, QUE SE VEA EL ROSTRO CLARAMENTE (adjunta la imagen o envía el enlace).`);
        const collectedPhoto = await channel.awaitMessages({ filter: m => m.author.id === user.id && (m.attachments.size > 0 || urlRegex.test(m.content.trim())), max: 1, time: 86400000 });
        const photoMsg = collectedPhoto.first();
        if (!photoMsg) return;
        let imageLink = null;
        if (photoMsg.attachments.size > 0) {
          imageLink = photoMsg.attachments.first().url;
        } else {
          imageLink = photoMsg.content.trim();
        }
        if (!imageLink.match(urlRegex)) {
          await channel.send('❌ Formato inválido. Asegúrate de que sea una imagen (jpg, png, gif, webp).');
          continue;
        }
        const embed = new EmbedBuilder()
          .setTitle('Foto de reclutamiento')
          .setImage(imageLink)
          .setColor('#ff0000');
        const confirmBtn = new ButtonBuilder().setCustomId('recruit_photo_confirm').setLabel('Confirmar').setStyle(ButtonStyle.Success);
        const cancelBtn = new ButtonBuilder().setCustomId('recruit_photo_cancel').setLabel('Cancelar').setStyle(ButtonStyle.Danger);
        const row = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);
        const confirmMessage = await channel.send({ content: '¿Es esta la foto que deseas registrar?', embeds: [embed], components: [row] });
        const decision = await confirmMessage.awaitMessageComponent({ filter: i => i.user.id === user.id, componentType: 2, time: 86400000 });
        if (decision.customId === 'recruit_photo_confirm') {
          photoUrl = imageLink;
          await decision.update({
            content: '=======================================\n\n ● :sunglasses:​ 𝙍𝙤𝙨𝙩𝙧𝙤 𝙛𝙖𝙘𝙞𝙖𝙡 𝙘𝙤𝙣𝙛𝙞𝙧𝙢𝙖𝙙𝙤:white_check_mark:\n\n=======================================',
            embeds: [],
            components: []
          });
          break;
        } else {
          await decision.update({ content: '✏️ Por favor, sube nuevamente tu foto.', embeds: [], components: [] });
          continue;
        }
      }

      let paymentUrl = '';
      while (true) {
        await channel.send(`<@${user.id}>, por favor, sube la imagen del comprobante de pago de la couta inicial ($350.000 o el monto que hayas pagado) \n\n Si no haz pagado todo, quedaras debiendo el restante \n\n Si haz pagado hace tiempo, adjunta una imagen (Solo toma imagen) que tenga escrito "Pagado anteriormente".`);
        const collectedPay = await channel.awaitMessages({ filter: m => m.author.id === user.id && (m.attachments.size > 0 || urlRegex.test(m.content.trim())), max: 1, time: 86400000 });
        const payMsg = collectedPay.first();
        if (!payMsg) return;
        let imageLink = null;
        if (payMsg.attachments.size > 0) {
          imageLink = payMsg.attachments.first().url;
        } else {
          imageLink = payMsg.content.trim();
        }
        if (!imageLink.match(urlRegex)) {
          await channel.send('❌ Formato inválido. Asegúrate de que sea una imagen (jpg, png, gif, webp).');
          continue;
        }
        const embed = new EmbedBuilder()
          .setTitle('Comprobante de Pago')
          .setImage(imageLink)
          .setColor('#ff0000');
        const confirmBtn = new ButtonBuilder().setCustomId('recruit_payment_confirm').setLabel('Confirmar').setStyle(ButtonStyle.Success);
        const cancelBtn = new ButtonBuilder().setCustomId('recruit_payment_cancel').setLabel('Cancelar').setStyle(ButtonStyle.Danger);
        const row = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);
        const confirmMessage = await channel.send({ content: '¿Es esta la imagen del comprobante de pago que deseas registrar?', embeds: [embed], components: [row] });
        const decision = await confirmMessage.awaitMessageComponent({ filter: i => i.user.id === user.id, componentType: 2, time: 86400000 });
        if (decision.customId === 'recruit_payment_confirm') {
          paymentUrl = imageLink;
          await decision.update({ content: '✅ Comprobante de pago confirmado.', embeds: [], components: [] });
          break;
        } else {
          await decision.update({ content: '✏️ Por favor, sube nuevamente el comprobante de pago.', embeds: [], components: [] });
          continue;
        }
      }

      const logChannel = await client.channels.fetch(RECRUIT_LOG_CHANNEL_ID);
      const embedLog = new EmbedBuilder()
        .setTitle('Nuevo reclutamiento')
        .setColor('#ff0000')
        .addFields(
          { name: 'Participante', value: `<@${user.id}>`, inline: false },
          { name: 'Nombre y Apellido', value: name, inline: false },
          { name: 'Número IC', value: ic, inline: false },
          { name: 'Hash', value: hash, inline: false }
        )
        .setImage(paymentUrl)
        .addFields({ name: 'Foto de Rostro', value: photoUrl, inline: false })
        .setFooter({ text: 'PeakyBoys APP - Reclutamiento', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`verify_paid_${user.id}`)
          .setLabel('Verificado, ya pagó')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅'),
        new ButtonBuilder()
          .setCustomId(`verify_unpaid_${user.id}`)
          .setLabel('No terminó de pagar')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('❌')
      );

      await logChannel.send({ embeds: [embedLog], components: [row] });

      if (recruitmentData.has(user.id)) {
        console.log(`[RECLUTAMIENTO] El usuario ${user.id} ya tenía datos previos, se actualizarán con los nuevos datos.`);
      }
      recruitmentData.set(user.id, {
        name,
        ic,
        hash,
        photoUrl,
        paymentUrl,
        timestamp: Date.now(),
        paymentStatus: 'pending' 
      });
      saveData();

      await channel.send(`======================================================\n\n⭐​ ● 𝙁𝙪𝙞𝙨𝙩𝙚 𝙖ñ𝙖𝙙𝙞𝙙𝙤 𝙚𝙭𝙞𝙩𝙤𝙨𝙖𝙢𝙚𝙣𝙩𝙚  𝙖 𝙡𝙖 𝙗𝙖𝙨𝙚 𝙙𝙚 𝙙𝙖𝙩𝙤𝙨! ✔️​\n\n➡️​ ● 𝘼𝙝𝙤𝙧𝙖 𝙥𝙤𝙙𝙧𝙖𝙨 𝙪𝙨𝙖𝙧 /𝙫𝙚𝙧𝙙𝙖𝙩𝙤𝙨 <@${user.id}>\n\n======================================================`); // Mensaje final con formato y mención
      return;
    } catch (error) {
      console.error('Error al crear canal de reclutamiento:', error);
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ content: '❌ Ocurrió un error al crear el canal de reclutamiento.' });
        }
      } catch (e) {
        console.error('No se pudo responder a la interacción de reclutamiento:', e);
      }
      return;
    }
  }

  if (interaction.isCommand() && interaction.commandName === 'verdatos') {
    const VERDATOS_ALLOWED_ROLES = ['1358937489393451079', ...ALLOWED_ROLES];
    const member = interaction.guild.members.cache.get(interaction.user.id);
    if (!member || !member.roles.cache.some(role => VERDATOS_ALLOWED_ROLES.includes(role.id))) {
      console.log(`[PERMISOS] ${interaction.user.tag} (${interaction.user.id}) intentó usar /verdatos sin permisos.`);
      await interaction.reply({ content: '⛔ No tienes permisos para usar este comando.', ephemeral: true });
      return;
    }
    try {
      await interaction.deferReply({ ephemeral: true });
      const user = interaction.options.getUser('usuario');
      if (!user) {
        await interaction.editReply({ content: '❌ Usuario no encontrado.', embeds: [] });
        return;
      }

      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        await interaction.editReply({ content: '❌ El usuario no se encuentra en el servidor.', embeds: [] });
        return;
      }

      const userData = recruitmentData.get(user.id);
      if (!userData) {
        await interaction.editReply({ content: '❌ Este usuario no tiene datos de miembro registrados.', embeds: [] });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`📋 Datos de: - ${user.username}`)
        .setColor('#ff0000')
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: '👤 Nombre y Apellido', value: userData.name, inline: false },
          { name: '🔢 Número IC', value: userData.ic, inline: true },
          { name: '🔑 Hash', value: userData.hash, inline: true },
          { name: '💰 Estado de Pago', value: userData.paymentStatus === 'paid' ? '✅ Pagado' : userData.paymentStatus === 'unpaid' ? '❌ No pagado' : '⏳ Pendiente', inline: true },
          { name: '📅 Fecha de registro', value: `<t:${Math.floor(userData.timestamp / 1000)}:F>`, inline: false }
        )
        .setImage(userData.photoUrl)
        .setFooter({ text: 'PeakyBoys APP - Datos de miembro', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`veractividades_${user.id}`)
          .setLabel('Ver Actividades')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('📊')
      );

      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error('Error en el comando verdatos:', error);
      try {
      await interaction.editReply({ 
          content: '❌ Error de conexión con Discord o el servidor. Intenta de nuevo en unos segundos.',
        embeds: [] 
      });
      } catch (e) {
        
        console.error('No se pudo responder a la interacción:', e);
      }
    }
    return;
  }

  if (interaction.isButton() && interaction.customId.startsWith('veractividades_')) {
    try {
      await interaction.deferReply();
      const userId = interaction.customId.replace('veractividades_', '');
      const user = await client.users.fetch(userId);
      
      if (!user) {
        await interaction.editReply({ content: '❌ Usuario no encontrado.', embeds: [] });
        return;
      }

      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      if (!member) {
        await interaction.editReply({ content: '❌ El usuario no se encuentra en el servidor.', embeds: [] });
        return;
      }

      const userActivities = activityHistory.get(userId) || [];
      const sortedActivities = userActivities.sort((a, b) => b.timestamp - a.timestamp);
      const last30Days = sortedActivities.filter(act => 
        Date.now() - act.timestamp <= 30 * 24 * 60 * 60 * 1000
      );

      const normalActs = new Map();
      const graffitiActs = new Map();
      const dealerActs = new Map();
      last30Days.forEach(activity => {
        if (activity.activity.startsWith('Graffiti - ')) {
          const zona = activity.activity.replace('Graffiti - ', '');
          graffitiActs.set(zona, (graffitiActs.get(zona) || 0) + 1);
        } else if (activity.activity.startsWith('Dealer - ')) {
          const dealer = activity.activity.replace('Dealer - ', '');
          dealerActs.set(dealer, (dealerActs.get(dealer) || 0) + 1);
        } else {
          const baseName = activity.activity.replace(/\s\d{8,}\s\d{4}$/, '').trim();
          normalActs.set(baseName, (normalActs.get(baseName) || 0) + 1);
        }
      });

      const apodo = member ? member.displayName : user.username;
      const fechaUnion = member && member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:D>` : 'Desconocida';

      let actividadesText = normalActs.size > 0
        ? Array.from(normalActs.entries()).map(([activity, count]) => `• ${activity}: ${count} realizadas`).join('\n')
        : '❌ Ninguna actividad registrada en este período.';
      let graffitiText = graffitiActs.size > 0
        ? Array.from(graffitiActs.entries()).map(([zona, count]) => `• ${zona}: ${count} realizados`).join('\n')
        : '❌ Ningún graffiti registrado en este período.';
      let dealerText = dealerActs.size > 0
        ? Array.from(dealerActs.entries()).map(([dealer, count]) => `• ${dealer}: ${count} realizados`).join('\n')
        : '❌ Ningún dealer registrado en este período.';

      const total = last30Days.length;

      const actividadesFields = splitField('📊 Actividades', actividadesText);
      const graffitiFields = splitField('🥊 Graffitis', graffitiText);
      const dealerFields = splitField('💼 Dealers', dealerText);

      const embed = new EmbedBuilder()
        .setTitle(`📋 Actividades de ${user.username} (Últimos 30 días)`)
        .setColor(total > 0 ? '#43b581' : '#ff6961')
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: '👤 Apodo actual', value: apodo, inline: false },
          ...actividadesFields,
          ...graffitiFields,
          ...dealerFields,
          { name: '🔢 Total general', value: `**${total}**`, inline: false },
          { name: '📥 Miembro desde', value: fechaUnion, inline: false }
        )
        .setFooter({ text: 'PeakyBoys APP', iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error al mostrar actividades:', error);
      await interaction.editReply({ 
        content: '❌ Ocurrió un error al procesar las actividades. Por favor, intenta nuevamente.',
        embeds: [] 
      });
    }
    return;
  }

  if (interaction.isButton() && (interaction.customId.startsWith('verify_paid_') || interaction.customId.startsWith('verify_unpaid_'))) {
    try {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (!member.roles.cache.some(role => ALLOWED_ROLES.includes(role.id))) {
        await interaction.reply({ content: '⛔ No tienes permisos para verificar pagos.', ephemeral: true });
        return;
      }

      const userId = interaction.customId.split('_')[2];
      const isPaid = interaction.customId.startsWith('verify_paid_');
      const targetMember = await interaction.guild.members.fetch(userId);
      
      if (!targetMember) {
        await interaction.reply({ content: '❌ Usuario no encontrado en el servidor.', ephemeral: true });
        return;
      }

      await targetMember.roles.remove(['1358938287661781075', '1358937489393451079']);
      
      if (isPaid) {
        await targetMember.roles.add('1358937489393451079');
      } else {
        await targetMember.roles.add('1358938287661781075');
      }

      const userData = recruitmentData.get(userId);
      if (userData) {
        userData.paymentStatus = isPaid ? 'paid' : 'unpaid';
        recruitmentData.set(userId, userData);
        saveData();
      }

      const embed = EmbedBuilder.from(interaction.message.embeds[0]);
      const statusField = embed.data.fields.find(f => f.name === 'Estado de Pago');
      if (statusField) {
        statusField.value = isPaid ? '✅ Pagado' : '❌ No pagado';
      } else {
        embed.addFields({ name: 'Estado de Pago', value: isPaid ? '✅ Pagado' : '❌ No pagado', inline: false });
      }

      let row;
      if (isPaid) {
        row = new ActionRowBuilder().addComponents(
          ButtonBuilder.from(interaction.message.components[0].components[0]).setDisabled(true),
          ButtonBuilder.from(interaction.message.components[0].components[1]).setDisabled(true)
        );
      } else {
        row = new ActionRowBuilder().addComponents(
          ButtonBuilder.from(interaction.message.components[0].components[0]).setDisabled(false),
          ButtonBuilder.from(interaction.message.components[0].components[1]).setDisabled(false)
        );
      }

      await interaction.message.edit({ embeds: [embed], components: [row] });
      await interaction.reply({ content: `✅ Estado de pago actualizado para <@${userId}>`, ephemeral: true });
    } catch (error) {
      console.error('Error al verificar pago:', error);
      await interaction.reply({ content: '❌ Ocurrió un error al verificar el pago.', ephemeral: true });
    }
    return;
  }

  if (interaction.isCommand() && interaction.commandName === 'verpago') { 
    const member = interaction.guild.members.cache.get(interaction.user.id);
    if (!member || !member.roles.cache.some(role => ALLOWED_ROLES.includes(role.id))) {
      console.log(`[PERMISOS] ${interaction.user.tag} (${interaction.user.id}) intentó usar /verpago sin permisos.`);
      await interaction.reply({ content: '⛔ No tienes permisos para usar este comando.', ephemeral: true });
      return;
    }

    try {
      await interaction.deferReply();
      const user = interaction.options.getUser('usuario');
      if (!user) {
        await interaction.editReply({ content: '❌ Usuario no encontrado.', embeds: [] });
        return;
      }
      const userData = recruitmentData.get(user.id);
      if (!userData) {
        await interaction.editReply({ content: '❌ Este usuario no tiene datos de reclutamiento registrados.', embeds: [] });
        return;
      }
      const estadoPago = userData.paymentStatus === 'paid' ? '✅ Pagado' : userData.paymentStatus === 'unpaid' ? '❌ No pagado' : '⏳ Pendiente';
      const embed = new EmbedBuilder()
        .setTitle(`Estado de pago de: ${user.username}`)
        .setColor(userData.paymentStatus === 'paid' ? '#43b581' : userData.paymentStatus === 'unpaid' ? '#ff6961' : '#ffaa00')
        .addFields(
          { name: 'Estado de Pago', value: estadoPago, inline: false }
        )
        .setImage(userData.paymentUrl)
        .setFooter({ text: 'PeakyBoys APP - Pago de reclutamiento', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`verify_paid_${user.id}`)
          .setLabel('Verificado, ya pagó')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅'),
        new ButtonBuilder()
          .setCustomId(`verify_unpaid_${user.id}`)
          .setLabel('No terminó de pagar')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('❌')
      );

      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error('Error en el comando verpago:', error);
      await interaction.editReply({ 
        content: '❌ Ocurrió un error al consultar el pago. Por favor, intenta nuevamente.',
        embeds: [] 
      });
    }
    return;
  }

  if (interaction.isButton() && interaction.customId === 'recruit_restart') {
    if (interaction.channel && interaction.user && interaction.channel.name === `reclutamiento-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '-')) {
      await interaction.reply({ content: '🔄 Proceso cancelado. El canal será eliminado. Por favor, vuelve a presionar el botón "Rellenar información" en el canal principal de reclutamiento para comenzar de nuevo: https://discord.com/channels/1340202784707973120/1374462025442525274', ephemeral: true });
      recruitmentSessions.delete(interaction.user.id);
      setTimeout(async () => {
        try { await interaction.channel.delete('Reinicio de proceso de reclutamiento solicitado por el usuario'); } catch (e) {}
      }, 1500);
    } else {
      await interaction.reply({ content: '⛔ Solo puedes reiniciar tu propio proceso de reclutamiento en tu canal.', ephemeral: true });
    }
    return;
  }

  if (!interaction.isButton()) return;
  if (interaction.channelId !== GRAFFITI_REG_CHANNEL_ID) return;
  const uid = interaction.user.id;
  if (interaction.customId === 'graffiti_start') {
    if (graffitiSessionLocks.has(uid)) return;
    graffitiSessionLocks.add(uid);
    await handleGraffitiRegistration(interaction);
    graffitiSessionLocks.delete(uid);
    return;
  }
  if (interaction.customId === 'graffiti_cancel') {
    if (!graffitiStepSessions.has(uid)) {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'No tienes un registro en curso.', flags: 64 });
      }
      return;
    }
    const regCh = await interaction.channel;
    const session = graffitiStepSessions.get(uid);
    for (const mid of session.messages) {
      const m = await regCh.messages.fetch(mid).catch(()=>null);
      if (m) await m.delete().catch(()=>{});
    }
    graffitiStepSessions.delete(uid);
    await sendGraffitiStartEmbed(regCh);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Registro cancelado.', flags: 64 });
    }
    return;
  }
  if (interaction.customId.startsWith('graffiti_confirm_') || interaction.customId.startsWith('graffiti_step_cancel_')) {
    const [_, step, userId] = interaction.customId.split('_');
    if (userId !== uid) {
      return;
    }
    const session = graffitiStepSessions.get(uid);
    if (!session) return;
    const regCh = await interaction.channel;
    if (interaction.customId.startsWith('graffiti_step_cancel_')) {
      for (const mid of session.messages) {
        const m = await regCh.messages.fetch(mid).catch(()=>null);
        if (m) await m.delete().catch(()=>{});
      }
      graffitiStepSessions.delete(uid);
      await sendGraffitiStartEmbed(regCh);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Registro cancelado.', flags: 64 });
      }
      return;
    }
    session.step++;
    if (session.step === 3) {
      const msg = await regCh.send('Indica la hora de conquista (HH:mm, ejemplo: 15:00):');
      session.messages.push(msg.id);
    } else if (session.step === 4) {
      const msg = await regCh.send('Indica la ubicación del graffiti:');
      session.messages.push(msg.id);
    } else if (session.step === 5) {
      const msg = await regCh.send('Sube la imagen de prueba (adjunta la imagen en este canal):');
      session.messages.push(msg.id);
    }
    if (!interaction.replied && !interaction.deferred) {
      await interaction.message.delete().catch(()=>{});
    }
    return;
  }
});

async function updateActivityEmbedCompleted(buttonId, participantes, timestamp) {
  let rec = activityMessages[buttonId];
  if (!rec && activityMessageStore[buttonId]) {
    try {
      const { messageId, channelId } = activityMessageStore[buttonId];
      const channel = await client.channels.fetch(channelId);
      const message = await channel.messages.fetch(messageId);
      rec = { message, completed: false };
      activityMessages[buttonId] = rec;
    } catch (e) {
      console.error('Error al recuperar mensaje de actividad:', e);
      return;
    }
  }
  
  if (rec && !rec.completed) {
    rec.completed = true;
    activityMessageStore[buttonId].completed = true;
    saveData();
    
    const orig = rec.message;
    const participantesTexto = Array.isArray(participantes)
      ? participantes.map(pid => `<@${pid}>`).join(', ')
      : `<@${participantes}>`;
      
    const upd = EmbedBuilder.from(orig.embeds[0])
      .setFields(
        { name: '📍 Estado', value: `Completada por ${participantesTexto} el <t:${Math.floor(timestamp / 1000)}:f>`, inline: false }
      );
      
    const disabledBtn = ButtonBuilder.from(orig.components[0].components[0]).setDisabled(true);
    await orig.edit({ embeds: [upd], components: [new ActionRowBuilder().addComponents(disabledBtn)] });
  }
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const GRAFFITI_REG_CHANNEL_ID = '1375316977480106135';
  const COMPROBANTE_CHANNEL_ID = '1372030159896576000';

  if (message.channel.id === COMPROBANTE_CHANNEL_ID) {
    const uid = message.author.id;
    const temp = tempSelections.get(uid);

    if (temp && (temp.buttonId || temp.graffiti || temp.dealer) && !temp.imageUrl) {
      let imageUrl = null;
      if (message.attachments.size > 0) {
        imageUrl = message.attachments.first().url;
      } else {
        const urlRegex = /^(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/i;
        if (urlRegex.test(message.content.trim())) {
          imageUrl = message.content.trim();
        }
      }

      if (imageUrl) {
        temp.imageUrl = imageUrl;
        tempSelections.set(uid, temp);

        if (temp.imageTimeout) {
          clearTimeout(temp.imageTimeout);
        }

        let confirmButtonId;
        let cancelButtonId;
        if (temp.graffiti) {
          confirmButtonId = 'graffiti_confirm';
          cancelButtonId = 'graffiti_cancel';
        } else if (temp.dealer) {
          confirmButtonId = 'dealer_confirm';
          cancelButtonId = 'dealer_cancel';
        } else if (temp.buttonId) {
           confirmButtonId = `confirmar|${temp.buttonId}`;
           cancelButtonId = `cancelar|${temp.buttonId}`;
        } else {
           console.warn(`[BOT] Imagen subida por ${uid} en canal de comprobantes sin sesión activa clara.`);
           return;
        }

        const embed = new EmbedBuilder()
          .setTitle('Imagen de prueba recibida')
          .setDescription('Por favor, confirma o cancela tu registro.')
          .setColor('#ff0000')
          .setImage(imageUrl)
          .setFooter({ text: 'PeakyBoys APP'})
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(confirmButtonId)
            .setLabel('Confirmar registro')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(cancelButtonId)
            .setLabel('Cancelar')
            .setStyle(ButtonStyle.Danger)
        );

        try {
          const replyMsg = await message.reply({
            content: `<@${uid}>,`,
            embeds: [embed],
            components: [row]
          });


        } catch (e) {
          console.error('Error al enviar mensaje de confirmación en el canal de comprobantes:', e);
          try {
            await message.reply({
              content: `<@${uid}>, se recibió tu imagen pero hubo un problema al enviar la confirmación. Por favor, contacta a un administrador.`,
              ephemeral: true
            });
          } catch (fallbackError) {
            console.error('Error al enviar mensaje de fallback:', fallbackError);
          }
        }
        return;
      } else {
        return;
      }
    }
    return;
  }

  if (message.channel.id === GRAFFITI_REG_CHANNEL_ID) {
    const session = graffitiStepSessions.get(message.author.id);
    if (session) {
      if (session.step === 2) {
        const value = message.content.trim();
        if (!['1/4', '2/4', '3/4', '4/4'].includes(value)) {
          await message.reply('❌ El número debe ser uno de: 1/4, 2/4, 3/4, 4/4. Intenta de nuevo.');
          return;
        }
        session.data.numero = value;
        session.step = 3;
        const msg = await message.channel.send('Indica la hora de conquista (HH:mm, ejemplo: 15:00):');
        session.messages.push(msg.id);
        return;
      }
      if (session.step === 3) {
        const value = message.content.trim();
        if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(value)) {
          await message.reply('❌ La hora debe tener formato HH:mm (ejemplo: 15:00). Intenta de nuevo.');
          return;
        }
        session.data.hora = value;
        session.step = 4;
        const msg = await message.channel.send('Indica la ubicación del graffiti:');
        session.messages.push(msg.id);
      return;
    }
      if (session.step === 4) {
        const value = message.content.trim();
        if (value.length < 3) {
          await message.reply('❌ La ubicación debe tener al menos 3 caracteres. Intenta de nuevo.');
    return;
  }
        session.data.ubicacion = value;
        session.step = 5;
        const msg = await message.channel.send('Sube la imagen de prueba (adjunta la imagen en este canal):');
        session.messages.push(msg.id);
        return;
      }
      if (session.step === 5) {
    let imageUrl = null;
    if (message.attachments.size > 0) {
      imageUrl = message.attachments.first().url;
    } else {
      const urlRegex = /^(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/i;
      if (urlRegex.test(message.content.trim())) {
        imageUrl = message.content.trim();
      }
    }
    if (!imageUrl) {
          await message.reply('❌ Por favor, adjunta una imagen o envía un enlace válido (jpg, png, gif, webp).');
      return;
    }
        session.data.imagen = imageUrl;
        const graffitiLogCh = await message.client.channels.fetch('1374976245191671931');
        const embed = new EmbedBuilder()
          .setTitle('Registro de Graffiti')
          .setColor('#ff0000')
          .addFields(
            { name: 'Participante', value: `<@${message.author.id}>`, inline: false },
            { name: 'Número', value: session.data.numero, inline: true },
            { name: 'Hora', value: session.data.hora, inline: true },
            { name: 'Ubicación', value: session.data.ubicacion, inline: false },
            { name: 'Fecha y hora', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: false }
          )
          .setImage(imageUrl)
          .setThumbnail(message.author.displayAvatarURL())
          .setFooter({ text: 'PeakyBoys APP - Graffitis', iconURL: message.client.user.displayAvatarURL() })
          .setTimestamp();
        await graffitiLogCh.send({ embeds: [embed] });
        if (!activityHistory.has(message.author.id)) activityHistory.set(message.author.id, []);
        activityHistory.get(message.author.id).push({
          activity: `Graffiti - ${session.data.ubicacion}`,
          timestamp: Date.now(),
          points: 0,
          imageUrl: imageUrl
        });
        saveData();

        const channelMsgs = await message.channel.messages.fetch({ limit: 50 });
        for (const m of channelMsgs.filter(m => m.author.id === message.author.id && m.id !== message.id).values()) {
          await m.delete().catch(()=>{});
        }
        const publicEmbed = new EmbedBuilder()
          .setTitle('Registro de graffiti ganado')
          .setColor('#ff0000')
          .setDescription('**Se ha registrado un graffiti ganado.**')
          .addFields(
            { name: 'Participante', value: `<@${message.author.id}>`, inline: false },
            { name: 'Número', value: session.data.numero, inline: true },
            { name: 'Hora', value: session.data.hora, inline: true },
            { name: 'Ubicación', value: session.data.ubicacion, inline: false }
          )
          .setImage(imageUrl)
          .setThumbnail('https://cdn.discordapp.com/attachments/1370661672582381569/1371573782858301550/imgg1212.jpg?ex=6823a120&is=68224fa0&hm=1c062ba021b11014de961a7f387854&')
          .setFooter({ text: 'PeakyBoys APP - Graffitis', iconURL: message.client.user.displayAvatarURL() })
          .setTimestamp();
        await message.channel.send({ embeds: [publicEmbed] });

        const moment = require('moment-timezone');
        const horaGraffiti = session.data.hora; 
        const [h, m] = horaGraffiti.split(':').map(Number);

        let graffitiBase = moment.utc().startOf('day').set({ hour: h, minute: m, second: 0, millisecond: 0 });
        console.log(`[GRAFFITI REGISTRO] Hora ingresada (${session.data.hora} UTC) aplicada al inicio de hoy UTC: ${graffitiBase.toISOString()}`);

        let defDate = graffitiBase.clone().add(12, 'hours');
        let remDate = graffitiBase.clone().add(11, 'hours').add(30, 'minutes');
        
        const nowUTC = moment.utc();

        console.log(`[GRAFFITI REGISTRO] Hora actual (UTC): ${nowUTC.toISOString()}`);
        console.log(`[GRAFFITI REGISTRO] Horario de recordatorio calculado (${session.data.hora} UTC + 11h30m): ${remDate.toISOString()}`);
        console.log(`[GRAFFITI REGISTRO] Horario de defensa real calculado (${session.data.hora} UTC + 12h): ${defDate.toISOString()}`);

        if (defDate.isAfter(nowUTC)) {
          console.log('[GRAFFITI REGISTRO] Horario de defensa calculado es futuro. Programando aviso.');
          
          console.log(`[BOT] Programando aviso de defensa (hora exacta) con node-schedule para: ${defDate.toISOString()}`);
          const jobDefNuevo = schedule.scheduleJob(defDate.toDate(), async () => {
            try {
              console.log(`[GRAFFITI AVISO] [NUEVO] Ejecutando aviso de defensa para graffiti ${session.data.numero}. Hora programada: ${defDate.toISOString()}`);
              const ch = await client.channels.fetch(DEFENSE_CHANNEL_ID);
              const embed = new EmbedBuilder()
                .setTitle('¡HORA DE DEFENDER!')
                .setColor('#ff0000')
                .setDescription(`<@&${DEFENSE_ROLE_ID}> ¡HORA DE DEFENDER el graffiti ${session.data.numero} en ${session.data.ubicacion}!`)
                .addFields(
                  { name: '📅 Fecha del registro', value: `<t:${Math.floor(graffitiBase.valueOf() / 1000)}:F>`, inline: true },
                  { name: '⏰ Hora del registro', value: `<t:${Math.floor(graffitiBase.valueOf() / 1000)}:t>`, inline: true }
                )
                .setImage(session.data.imagen)
                .setFooter({ text: 'PeakyBoys APP - Graffitis', iconURL: client.user.displayAvatarURL() })
                .setTimestamp();
              await ch.send({ embeds: [embed] });
              console.log(`[GRAFFITI AVISO] [NUEVO] Aviso de defensa enviado para graffiti ${session.data.numero}.`);
            } catch (e) {
              console.error('[GRAFFITI AVISO] [NUEVO] Error al enviar aviso de defensa:', e);
            }
          });

          if (remDate.isAfter(nowUTC)) {
             console.log(`[BOT] Programando recordatorio (30 min antes) con node-schedule para: ${remDate.toISOString()}`);
             const jobRemNuevo = schedule.scheduleJob(remDate.toDate(), async () => {
               try {
                 console.log(`[GRAFFITI AVISO] [NUEVO] Ejecutando recordatorio para graffiti ${session.data.numero}. Hora programada: ${remDate.toISOString()}`);
                 const ch = await client.channels.fetch(DEFENSE_CHANNEL_ID);
                 const embed = new EmbedBuilder()
                   .setTitle('RECORDATORIO DE DEFENSA')
                   .setColor('#ff9900')
                   .setDescription(`<@&${DEFENSE_ROLE_ID}> RECORDATORIO: En 30 min defiende el graffiti ${session.data.numero} en ${session.data.ubicacion}.`)
                   .addFields(
                     { name: '📅 Fecha del registro', value: `<t:${Math.floor(graffitiBase.valueOf() / 1000)}:F>`, inline: true },
                     { name: '⏰ Hora del registro', value: `<t:${Math.floor(graffitiBase.valueOf() / 1000)}:t>`, inline: true }
                   )
                   .setImage(session.data.imagen)
                   .setFooter({ text: 'PeakyBoys APP - Graffitis', iconURL: client.user.displayAvatarURL() })
                   .setTimestamp();
                 await ch.send({ embeds: [embed] });
                 console.log(`[GRAFFITI AVISO] [NUEVO] Aviso de recordatorio enviado para graffiti ${session.data.numero}.`);
               } catch (e) {
                 console.error('[GRAFFITI AVISO] [NUEVO] Error al enviar aviso de recordatorio:', e);
               }
             });
              console.log('[GRAFFITI REGISTRO] Horario de recordatorio calculado es futuro. Programando recordatorio.');
  } else {
              console.log('[GRAFFITI REGISTRO] El horario de recordatorio calculado ya pasó o es igual al momento actual. No se programará recordatorio.');
          }

          let allRems = [];
          try {
            allRems = JSON.parse(fs.readFileSync(REMINDERS_FILE, 'utf8'));
          } catch (e) {
            console.error('[GRAFFITI REGISTRO] Error leyendo graffitiReminders.json para persistencia antes de escribir:', e);
            allRems = [];
          }
          allRems.push({
            number: session.data.numero,
            location: session.data.ubicacion,
            remTimestamp: remDate.valueOf(),
            defTimestamp: defDate.valueOf(),
            imageUrl: session.data.imagen
          });
          try {
             fs.writeFileSync(REMINDERS_FILE, JSON.stringify(allRems, null, 2), 'utf8');
             console.log('[GRAFFITI REGISTRO] Recordatorio persistido correctamente en graffitiReminders.json');
          } catch (e) {
             console.error('[GRAFFITI REGISTRO] Error escribiendo graffitiReminders.json:', e);
          }
        } else {
          console.log('[GRAFFITI REGISTRO] El horario de defensa calculado ya pasó o es igual al momento actual. No se programará aviso.');
          await message.channel.send(':warning: El horario de defensa calculado (' + defDate.format('YYYY-MM-DD HH:mm UTC') + ') ya pasó o es igual al momento actual, no se programó ningún aviso.');
        }

        await sendGraffitiStartEmbed(message.channel);

        for (const mid of session.messages) {
          const m = await message.channel.messages.fetch(mid).catch(()=>null);
          if (m) await m.delete().catch(()=>{});
        }
        graffitiStepSessions.delete(message.author.id);
    return;
      }
    }
  }

});

client.login(TOKEN);

function getSafeGuild() {
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) {
    console.error('No se pudo encontrar el servidor con el GUILD_ID configurado.');
    return null;
  }
  return guild;
}

async function handleGraffitiRegistration(interaction) {
  const uid = interaction.user.id;
  
  if (graffitiStepSessions.has(uid)) {
    await interaction.reply({ 
      content: 'Ya tienes un registro de graffiti en curso. Por favor, cancélalo antes de iniciar uno nuevo.', 
      ephemeral: true 
    });
    return;
  }

  graffitiStepSessions.set(uid, {
    step: 2,
    data: {},
    messages: []
  });

  const msg = await interaction.reply({
    content: 'Indica el número de graffiti (1/4, 2/4, 3/4, 4/4):',
      ephemeral: true 
    });
  graffitiStepSessions.get(uid).messages.push(msg.id);
}

const safeInteractionReply = async (interaction, content, options = {}) => {
  try {
    if (interaction.deferred) {
      return await interaction.editReply(content);
    } else if (interaction.replied) {
      return await interaction.followUp(content);
    } else {
      return await interaction.reply(content);
    }
  } catch (error) {
    console.error(`[INTERACTION ERROR] Error al responder a interacción ${interaction.id}:`, error.message);
    if (error.code === 10062) {
      console.log(`[INTERACTION ERROR] Interacción ${interaction.id} expiró`);
    }
  }
};

const canRespondToInteraction = (interaction) => {
  return !interaction.replied && !interaction.deferred;
};

function splitField(name, text) {
  const chunks = [];
  let current = '';
  for (const line of text.split('\n')) {
    if ((current + line + '\n').length > 1024) {
      chunks.push(current);
      current = '';
    }
    current += line + '\n';
  }
  if (current) chunks.push(current);
  return chunks.map((chunk, i) => ({
    name: i === 0 ? name : `${name} (cont.)`,
    value: chunk.trim(),
    inline: false
  }));
}
