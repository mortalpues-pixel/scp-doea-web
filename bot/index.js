require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

// Conexión a la nube de Supabase compartida con la web
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const processedDMs = new Set();
const activePolygraphs = new Map();

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
  },
  {
    name: 'redact',
    description: 'Generates an official SCP classified document from text',
    options: [
      {
        name: 'text',
        description: 'Text to redact. Use [brackets] to force redact specific words.',
        type: 3, // STRING
        required: true
      },
      {
        name: 'level',
        description: 'Redaction level (1: Light, 2: Medium, 3: Heavy)',
        type: 4, // INTEGER
        required: false,
        choices: [
          { name: 'Level 1 (Light)', value: 1 },
          { name: 'Level 2 (Medium)', value: 2 },
          { name: 'Level 3 (Heavy)', value: 3 }
        ]
      }
    ]
  },
  {
    name: 'polygraph',
    description: 'Attaches or detaches a polygraph to an agent in the current channel',
    options: [
      {
        name: 'action',
        description: 'Start or Stop the polygraph',
        type: 3, // STRING
        required: true,
        choices: [
          { name: 'Start Interrogation', value: 'start' },
          { name: 'Stop Interrogation', value: 'stop' }
        ]
      },
      {
        name: 'target',
        description: 'The user to interrogate',
        type: 6, // USER
        required: true
      }
    ]
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

  // Check for pending DMs every 10 seconds
  setInterval(async () => {
    try {
      const { data: cloudData, error } = await supabase.from('doea_state').select('state').eq('id', 1).single();
      if (error || !cloudData?.state?.pendingDMs || cloudData.state.pendingDMs.length === 0) return;

      const state = cloudData.state;
      const dms = state.pendingDMs;
      
      let changed = false;
      for (const dm of dms) {
        if (!dm.dmId) {
          // If old format (no dmId), assign a random one so we don't block
          dm.dmId = Date.now().toString() + Math.random();
        }
        if (processedDMs.has(dm.dmId)) continue;
        
        try {
            if (dm.action === 'APPLICATION') {
              let channel = client.channels.cache.get('1518962078252007454');
              if (!channel) {
                try {
                  channel = await client.channels.fetch('1518962078252007454');
                } catch (e) {
                  console.error('Failed to fetch application channel by ID:', e);
                }
              }
              if (!channel) {
                const guild = client.guilds.cache.first();
                if (guild) {
                  channel = guild.channels.cache.find(c => c.name.includes('apply') || c.name.includes('admin') || c.name.includes('command') || c.name.includes('staff')) || guild.channels.cache.filter(c => c.isTextBased()).first();
                }
                if (channel) {
                  const embed = new EmbedBuilder()
                    .setTitle('NEW APPLICATION RECEIVED')
                    .setColor('#ffaa00')
                    .setDescription(`New application for the DoEA submitted via the secure terminal.`)
                    .addFields(
                      { name: 'APPLICANT DISCORD', value: dm.discordId ? `<@${dm.discordId}> (${dm.discordId})` : 'Unknown', inline: false },
                      { name: 'CHARACTER NAME', value: dm.charName || 'Not specified', inline: false },
                      { name: 'DESIRED ROLE', value: dm.role || 'Not specified', inline: false },
                      { name: 'EXPERIENCE / BACKGROUND', value: dm.experience || 'None', inline: false },
                      { name: 'MOTIVE / REASON', value: dm.reason || 'Not specified', inline: false }
                    )
                    .setFooter({ text: 'Department of External Affairs - Recruitment Division' });
                  
                  const row = new ActionRowBuilder()
                    .addComponents(
                      new ButtonBuilder().setCustomId(`app_accept_${dm.discordId}`).setLabel('ACCEPT').setStyle(ButtonStyle.Success),
                      new ButtonBuilder().setCustomId(`app_reject_${dm.discordId}`).setLabel('REJECT').setStyle(ButtonStyle.Danger)
                    );
                  await channel.send({ embeds: [embed], components: [row] });
                } else {
                  console.error('Failed to find channel for APPLICATION');
                }
              }
              processedDMs.add(dm.dmId);
              changed = true;
              continue;
            }

            if (dm.action === 'MISSION') {
              const guild = client.guilds.cache.first();
              if (guild) {
                const channel = guild.channels.cache.find(c => c.name.includes('mision') || c.name.includes('mission') || c.name.includes('operacion') || c.name.includes('anuncio')) || guild.channels.cache.filter(c => c.isTextBased()).first();
                if (channel) {
                  const embed = new EmbedBuilder()
                    .setTitle(`[NEW DIRECTIVE] - ${dm.title}`)
                    .setColor('#00ffcc')
                    .setDescription(dm.description)
                    .addFields(
                      { name: 'TARGET GOI', value: dm.targetGoi || 'None', inline: true },
                      { name: 'THREAT LEVEL', value: dm.threat, inline: true }
                    )
                    .setFooter({ text: 'DoEA Operations Command' });
                  
                  const row = new ActionRowBuilder()
                    .addComponents(
                      new ButtonBuilder().setCustomId(`mission_join_${dm.missionId}`).setLabel('SIGN UP FOR MISSION').setStyle(ButtonStyle.Primary)
                    );
                  await channel.send({ content: '@everyone', embeds: [embed], components: [row] });
                }
              }
              processedDMs.add(dm.dmId);
              changed = true;
              continue;
            }

            if (dm.action === 'CONTRACT') {
              const guild = client.guilds.cache.first();
              if (guild) {
                const channel = guild.channels.cache.find(c => c.name.toLowerCase().includes(dm.goiName.toLowerCase()) || c.name.includes('diploma')) || guild.channels.cache.filter(c => c.isTextBased()).first();
                if (channel) {
                  const embed = new EmbedBuilder()
                    .setTitle('OFFICIAL TREATY PROPOSAL')
                    .setColor('#ffbb00')
                    .setDescription(`The Department of External Affairs (SCP Foundation) has proposed a formal treaty to the **${dm.goiName}**.\n\n**TERMS:**\n${dm.terms}`)
                    .setFooter({ text: 'DoEA Diplomatic Corps' });
                  
                  const row = new ActionRowBuilder()
                    .addComponents(
                      new ButtonBuilder().setCustomId(`contract_sign_${dm.goiId}`).setLabel('SIGN TREATY').setStyle(ButtonStyle.Success),
                      new ButtonBuilder().setCustomId(`contract_reject_${dm.goiId}`).setLabel('REJECT').setStyle(ButtonStyle.Danger)
                    );
                  await channel.send({ content: dm.discordId ? `<@${dm.discordId}>` : '', embeds: [embed], components: [row] });
                }
              }
              processedDMs.add(dm.dmId);
              changed = true;
              continue;
            }

            const user = await client.users.fetch(dm.discordId);
          if (user) {
            let embed;
            let files = [];
            
            if (dm.action === 'DELETE') {
              embed = new EmbedBuilder()
                .setTitle('[WARNING] - PERSONNEL FILE TERMINATED')
                .setColor('#ff0000')
                .setDescription(`Agent **${dm.name}**, your personnel file has been deleted from the DoEA database. Your access is revoked.`)
                .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/e/ec/SCP_Foundation_%28emblem%29.svg')
                .setFooter({ text: 'Department of External Affairs' });
            } else if (dm.action === 'EDIT') {
              embed = new EmbedBuilder()
                .setTitle('[SYSTEM UPDATE] - PERSONNEL FILE UPDATED')
                .setColor('#ffff00')
                .setDescription(`Agent **${dm.name}**, your personnel file in the DoEA database has been updated.`)
                .addFields(
                  { name: 'ROLE', value: dm.role, inline: true },
                  { name: 'DEPARTMENT', value: dm.department, inline: true },
                  { name: 'CLEARANCE LEVEL', value: `Level ${dm.clearance}`, inline: true }
                )
                .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/e/ec/SCP_Foundation_%28emblem%29.svg')
                .setFooter({ text: 'Department of External Affairs' });
            } else { // CREATE
              embed = new EmbedBuilder()
                .setTitle('[SECURE CHANNEL] - DoEA IDENTIFICATION ISSUED')
                .setColor('#00ccff')
                .addFields(
                  { name: 'AGENT NAME', value: dm.name, inline: true },
                  { name: 'ROLE', value: dm.role, inline: true },
                  { name: 'DEPARTMENT', value: dm.department, inline: true },
                  { name: 'CLEARANCE LEVEL', value: `Level ${dm.clearance}`, inline: true },
                  { name: 'AUTHORIZATION CODE', value: `**\`${dm.code}\`**`, inline: false }
                )
                .setFooter({ text: 'Welcome to the Department of External Affairs. Keep this code secure.' });

              if (dm.photoData) {
                const base64Data = dm.photoData.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, 'base64');
                const attachment = new AttachmentBuilder(buffer, { name: 'idcard.png' });
                files.push(attachment);
                embed.setImage('attachment://idcard.png');
              } else {
                embed.setThumbnail('https://upload.wikimedia.org/wikipedia/commons/e/ec/SCP_Foundation_%28emblem%29.svg');
              }
            }

            await user.send({ embeds: [embed], files });
            console.log(`✅ DM (${dm.action || 'CREATE'}) sent to ${dm.name} (${dm.discordId})`);
            processedDMs.add(dm.dmId);
            changed = true;
          }
        } catch (e) {
          console.error(`❌ Failed to send DM to ${dm.discordId}:`, e);
          processedDMs.add(dm.dmId);
          changed = true;
        }
      }

      if (changed) {
        state.pendingDMs = state.pendingDMs.filter(dm => !processedDMs.has(dm.dmId));
        await supabase.from('doea_state').upsert({ id: 1, state });
      }

    } catch (err) {
      console.error('Error checking pending DMs:', err);
    }
  }, 10000);

  // Check for Avatar Requests every 2 seconds
  setInterval(async () => {
    try {
      const { data: cloudData, error } = await supabase.from('doea_state').select('state').eq('id', 1).single();
      if (error || !cloudData?.state?.avatarRequests || cloudData.state.avatarRequests.length === 0) return;

      const state = cloudData.state;
      const requests = state.avatarRequests;
      state.avatarResponses = state.avatarResponses || [];

      let changed = false;
      for (const req of requests) {
        try {
          const user = await client.users.fetch(req.discordId);
          const url = user.displayAvatarURL({ extension: 'png', size: 256 });
          state.avatarResponses.push({ reqId: req.reqId, url });
          changed = true;
        } catch (e) {
          state.avatarResponses.push({ reqId: req.reqId, url: null });
          changed = true;
        }
      }

      if (changed) {
        state.avatarRequests = [];
        await supabase.from('doea_state').upsert({ id: 1, state });
      }
    } catch (err) { }
  }, 2000);
});

  client.on('interactionCreate', async interaction => {
    if (interaction.isButton()) {
      try {
        if (interaction.customId.startsWith('app_accept_')) {
          const applicantId = interaction.customId.replace('app_accept_', '');
          await interaction.reply({ content: `✅ <@${applicantId}> has been accepted into the DoEA! Make sure to register them in the terminal.`, ephemeral: false });
          return;
        }
        if (interaction.customId.startsWith('app_reject_')) {
          const applicantId = interaction.customId.replace('app_reject_', '');
          await interaction.reply({ content: `❌ <@${applicantId}>'s application has been rejected.`, ephemeral: false });
          return;
        }
        if (interaction.customId.startsWith('mission_join_')) {
          const missionId = interaction.customId.replace('mission_join_', '');
          await interaction.reply({ content: `🛡️ <@${interaction.user.id}> has signed up for the mission!`, ephemeral: false });
          return;
        }
        if (interaction.customId.startsWith('contract_sign_')) {
          const goiId = interaction.customId.replace('contract_sign_', '');
          await interaction.reply({ content: `🤝 The proposed treaty has been **SIGNED** by <@${interaction.user.id}>.`, ephemeral: false });
          return;
        }
        if (interaction.customId.startsWith('contract_reject_')) {
          const goiId = interaction.customId.replace('contract_reject_', '');
          await interaction.reply({ content: `⚠️ The proposed treaty has been **REJECTED** by <@${interaction.user.id}>.`, ephemeral: false });
          return;
        }
      } catch (err) {
        console.error('Error handling button interaction:', err);
      }
      return;
    }

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
  // COMANDO /REDACT
  if (interaction.commandName === 'redact') {
    const text = interaction.options.getString('text');
    const level = interaction.options.getInteger('level') || 2;
    
    // Explicit brackets
    let redactedText = text.replace(/\[(.*?)\]/g, (match, p1) => {
      return '█'.repeat(p1.length);
    });

    const words = redactedText.split(' ');
    const probability = level === 1 ? 0.15 : (level === 2 ? 0.35 : 0.65);
    
    const finalWords = words.map(word => {
      if (!word.includes('█') && word.length > 3 && Math.random() < probability) {
        return '█'.repeat(word.length);
      }
      return word;
    });

    const embed = new EmbedBuilder()
      .setTitle('CLASSIFIED DOCUMENT - LEVEL 4 CLEARANCE REQUIRED')
      .setColor('#000000')
      .setDescription(finalWords.join(' '))
      .setFooter({ text: 'DoEA Information Security Administration' });

    await interaction.reply({ embeds: [embed] });
  }

  // COMANDO /POLYGRAPH
  if (interaction.commandName === 'polygraph') {
    const action = interaction.options.getString('action');
    const target = interaction.options.getUser('target');
    
    if (action === 'start') {
      activePolygraphs.set(target.id, interaction.channelId);
      const embed = new EmbedBuilder()
        .setTitle('🩺 POLYGRAPH ATTACHED')
        .setColor('#ffff00')
        .setDescription(`Vitals monitoring initiated for **${target.username}**.\n*Awaiting subject response...*`);
      await interaction.reply({ embeds: [embed] });
    } else {
      if (activePolygraphs.has(target.id)) {
        activePolygraphs.delete(target.id);
        const embed = new EmbedBuilder()
          .setTitle('🔌 POLYGRAPH DETACHED')
          .setColor('#00ff00')
          .setDescription(`Vitals monitoring terminated for **${target.username}**.`);
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ content: `No active polygraph found for ${target.username}.`, ephemeral: true });
      }
    }
  }
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  
  if (activePolygraphs.has(message.author.id)) {
    const channelId = activePolygraphs.get(message.author.id);
    if (message.channelId === channelId) {
      const isLying = Math.random() > 0.5;
      const percentage = Math.floor(Math.random() * 30) + 70;
      
      let embed;
      if (isLying) {
        embed = new EmbedBuilder()
          .setColor('#ff0000')
          .setDescription(`🔴 **[POLYGRAPH ANOMALY DETECTED]**\nVitals Spike. Probability of deception: **${percentage}%**`);
      } else {
        embed = new EmbedBuilder()
          .setColor('#00ff00')
          .setDescription(`🟢 **[VITALS STABLE]**\nStatement aligns with baseline truth parameters.`);
      }
      
      await message.reply({ embeds: [embed] });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
