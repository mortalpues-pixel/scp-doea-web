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
    description: 'Displays the top 5 DoEA agents',
  },
  {
    name: 'puntos',
    description: 'Adds or subtracts points from an agent and updates the web',
    options: [
      {
        name: 'id',
        description: 'Numeric ID of the agent',
        type: 4, // INTEGER
        required: true
      },
      {
        name: 'cantidad',
        description: 'Amount of points to add (use negative to subtract)',
        type: 4, // INTEGER
        required: true
      }
    ]
  },
  {
    name: 'override',
    description: 'Generates a temporary authorization code to enter the web (High Command Only)',
  }
];

client.once('ready', async () => {
  console.log(`📡 LINK ESTABLISHED - Logged in as ${client.user.tag}!`);
  
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('Synchronizing commands with Discord...');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ Commands loaded! The bot is ready to receive orders.');
  } catch (error) {
    console.error('❌ Error loading commands:', error);
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
      return interaction.editReply('❌ Error accessing classified department files.');
    }
    
    const personnel = cloudData.state.personnel;
    // Ordenar de más a menos puntos y coger los 5 primeros
    const sorted = personnel.sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 5);
    
    const embed = new EmbedBuilder()
      .setTitle('TOP 5 AGENTES - DoEA ROSTER')
      .setColor('#ff003c')
      .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/e/ec/SCP_Foundation_%28emblem%29.svg')
      .setDescription(sorted.map((p, i) => `**${i+1}. ${p.name}** (Level ${p.clearance})\nPoints: ${p.points || 0} | Strikes: ${p.strikes || 0}`).join('\n\n'));
      
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
      return interaction.editReply('❌ Connection error with the terminal.');
    }
    
    const personnel = cloudData.state.personnel;
    const agentIndex = personnel.findIndex(p => p.id === agentId);
    
    if (agentIndex === -1) {
      return interaction.editReply(`⚠️ Agent not found: ID ${agentId} does not exist in the Roster.`);
    }
    
    // Sumar los puntos
    personnel[agentIndex].points = (personnel[agentIndex].points || 0) + amount;
    
    // ¡Añadir una noticia automática al Audit Ticker de la web!
    const newLog = { 
      id: Date.now(), 
      time: new Date().toLocaleTimeString(), 
      message: `DISCORD BOT: Modified ${amount} points for Agent ID ${agentId}`, 
      timestamp: Date.now() 
    };
    const audit = [newLog, ...(cloudData.state.audit || [])].slice(0, 50);
    cloudData.state.audit = audit;
    
    // Guardar cambios en Supabase
    await supabase.from('doea_state').upsert({ id: 1, state: cloudData.state });
    
    const embed = new EmbedBuilder()
      .setTitle('SCORE UPDATED')
      .setColor('#00ff00')
      .setDescription(`Added **${amount} points** to agent **${personnel[agentIndex].name}**.\nTotal Score: **${personnel[agentIndex].points}**\n\n*This action is already reflected on the web.*`);
      
    await interaction.editReply({ embeds: [embed] });
  }

  // COMANDO /OVERRIDE
  if (interaction.commandName === 'override') {
    // Comprobar rol de Discord
    const REQUIRED_ROLE = '1518754009094033561';
    
    // interaction.member contiene información del usuario en el servidor
    if (!interaction.member.roles.cache.has(REQUIRED_ROLE)) {
      return interaction.reply({ content: '⛔ ACCESS DENIED. You do not have the required authorization level in this server to request an Override code.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true }); // Respuesta oculta, solo la ve el usuario
    
    // Generar código aleatorio
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomCode = 'AUTH-' + Array.from({length: 4}, () => letters[Math.floor(Math.random() * letters.length)]).join('');

    // Guardarlo en Supabase
    const { data: cloudData, error } = await supabase.from('doea_state').select('state').eq('id', 1).single();
    if (error || !cloudData?.state) {
      return interaction.editReply('❌ Connection error with the authorization database.');
    }

    // Inicializar el array de códigos si no existe
    const state = cloudData.state;
    state.overrideCodes = state.overrideCodes || [];
    state.overrideCodes.push(randomCode);

    await supabase.from('doea_state').upsert({ id: 1, state: state });

    const embed = new EmbedBuilder()
      .setTitle('AUTHORIZATION CODE GENERATED')
      .setColor('#ffaa00')
      .setDescription(`Your temporary single-use access code is:\n\n**\`${randomCode}\`**\n\nEnter it in the web terminal under *Manual Override*.\nThis code will be destroyed after use.`);
      
    await interaction.editReply({ embeds: [embed] });
  }
});

client.login(process.env.DISCORD_TOKEN);
