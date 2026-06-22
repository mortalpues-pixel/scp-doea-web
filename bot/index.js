require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

// Conexión a la nube de Supabase compartida con la web
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Definimos nuestros dos primeros comandos
const commands = [
  {
    name: 'roster',
    description: 'Muestra el top 5 de agentes del DoEA',
  },
  {
    name: 'puntos',
    description: 'Suma o resta puntos a un agente y lo actualiza en la web',
    options: [
      {
        name: 'id',
        description: 'ID numérico del agente',
        type: 4, // INTEGER
        required: true
      },
      {
        name: 'cantidad',
        description: 'Cantidad de puntos a sumar (escribe un número negativo para restar)',
        type: 4, // INTEGER
        required: true
      }
    ]
  },
  {
    name: 'override',
    description: 'Genera un código de autorización temporal para entrar a la web (Solo Alto Mando)',
  }
];

client.once('ready', async () => {
  console.log(`📡 ENLACE ESTABLECIDO - Logueado como ${client.user.tag}!`);
  
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('Sincronizando comandos con Discord...');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ ¡Comandos cargados! El bot está listo para recibir órdenes.');
  } catch (error) {
    console.error('❌ Error al cargar comandos:', error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // COMANDO /ROSTER
  if (interaction.commandName === 'roster') {
    await interaction.deferReply(); // Pensando...
    
    // Leer la base de datos de Supabase
    const { data: cloudData, error } = await supabase.from('doea_state').select('state').eq('id', 1).single();
    if (error || !cloudData?.state?.personnel) {
      return interaction.editReply('❌ Error al acceder a los archivos clasificados del departamento.');
    }
    
    const personnel = cloudData.state.personnel;
    // Ordenar de más a menos puntos y coger los 5 primeros
    const sorted = personnel.sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 5);
    
    const embed = new EmbedBuilder()
      .setTitle('TOP 5 AGENTES - DoEA ROSTER')
      .setColor('#ff003c')
      .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/e/ec/SCP_Foundation_%28emblem%29.svg')
      .setDescription(sorted.map((p, i) => `**${i+1}. ${p.name}** (Nivel ${p.clearance})\nPuntos: ${p.points || 0} | Faltas: ${p.strikes || 0}`).join('\n\n'));
      
    await interaction.editReply({ embeds: [embed] });
  }
  
  // COMANDO /PUNTOS
  if (interaction.commandName === 'puntos') {
    await interaction.deferReply();
    
    // Aquí en el futuro se puede añadir lógica para que solo Level 4+ lo use.
    
    const agentId = interaction.options.getInteger('id');
    const amount = interaction.options.getInteger('cantidad');
    
    // Bajar la base de datos de Supabase
    const { data: cloudData, error } = await supabase.from('doea_state').select('state').eq('id', 1).single();
    if (error || !cloudData?.state?.personnel) {
      return interaction.editReply('❌ Error de conexión con la terminal.');
    }
    
    const personnel = cloudData.state.personnel;
    const agentIndex = personnel.findIndex(p => p.id === agentId);
    
    if (agentIndex === -1) {
      return interaction.editReply(`⚠️ Agente no encontrado: El ID ${agentId} no existe en el Roster.`);
    }
    
    // Sumar los puntos
    personnel[agentIndex].points = (personnel[agentIndex].points || 0) + amount;
    
    // ¡Añadir una noticia automática al Audit Ticker de la web!
    const newLog = { 
      id: Date.now(), 
      time: new Date().toLocaleTimeString(), 
      message: `DISCORD BOT: Modificados ${amount} puntos para el Agente ID ${agentId}`, 
      timestamp: Date.now() 
    };
    const audit = [newLog, ...(cloudData.state.audit || [])].slice(0, 50);
    cloudData.state.audit = audit;
    
    // Guardar cambios en Supabase
    await supabase.from('doea_state').upsert({ id: 1, state: cloudData.state });
    
    const embed = new EmbedBuilder()
      .setTitle('PUNTUACIÓN ACTUALIZADA')
      .setColor('#00ff00')
      .setDescription(`Se han sumado **${amount} puntos** al agente **${personnel[agentIndex].name}**.\nPuntuación Total: **${personnel[agentIndex].points}**\n\n*Esta acción ya se refleja en la página web.*`);
      
    await interaction.editReply({ embeds: [embed] });
  }

  // COMANDO /OVERRIDE
  if (interaction.commandName === 'override') {
    // Comprobar rol de Discord
    const REQUIRED_ROLE = '1518754009094033561';
    
    // interaction.member contiene información del usuario en el servidor
    if (!interaction.member.roles.cache.has(REQUIRED_ROLE)) {
      return interaction.reply({ content: '⛔ ACCESO DENEGADO. No tienes el nivel de autorización requerido en este servidor para solicitar un código Override.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true }); // Respuesta oculta, solo la ve el usuario
    
    // Generar código aleatorio
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomCode = 'AUTH-' + Array.from({length: 4}, () => letters[Math.floor(Math.random() * letters.length)]).join('');

    // Guardarlo en Supabase
    const { data: cloudData, error } = await supabase.from('doea_state').select('state').eq('id', 1).single();
    if (error || !cloudData?.state) {
      return interaction.editReply('❌ Error de conexión con la base de datos de autorización.');
    }

    // Inicializar el array de códigos si no existe
    const state = cloudData.state;
    state.overrideCodes = state.overrideCodes || [];
    state.overrideCodes.push(randomCode);

    await supabase.from('doea_state').upsert({ id: 1, state: state });

    const embed = new EmbedBuilder()
      .setTitle('CÓDIGO DE AUTORIZACIÓN GENERADO')
      .setColor('#ffaa00')
      .setDescription(`Tu código de acceso temporal de un solo uso es:\n\n**\`${randomCode}\`**\n\nIntrodúcelo en la terminal web en el apartado de *Manual Override*.\nEste código se destruirá después de usarlo.`);
      
    await interaction.editReply({ embeds: [embed] });
  }
});

client.login(process.env.DISCORD_TOKEN);
