import { useState, useEffect, useRef } from 'react';
import { Database, ShieldAlert, Target, Activity, Share2, X, MessageSquare, Printer, Lock, Volume2, VolumeX, Terminal as TerminalIcon, Users, Calendar, Image as ImageIcon, Download } from 'lucide-react';
import { audio } from './AudioSystem';
import html2canvas from 'html2canvas';
import { supabase } from './supabaseClient';
import './App.css';

const SCP_LOGO_URL = "https://upload.wikimedia.org/wikipedia/commons/e/ec/SCP_Foundation_%28emblem%29.svg";

const fetchAvatarThroughBot = async (discordId) => {
  const reqId = Date.now().toString();
  try {
    const { data: cloudData } = await supabase.from('doea_state').select('state').eq('id', 1).single();
    let state = cloudData.state || {};
    state.avatarRequests = [...(state.avatarRequests || []), { reqId, discordId }];
    await supabase.from('doea_state').upsert({ id: 1, state });

    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const { data: pollData } = await supabase.from('doea_state').select('state').eq('id', 1).single();
      const res = (pollData?.state?.avatarResponses || []).find(r => r.reqId === reqId);
      if (res) {
        pollData.state.avatarResponses = pollData.state.avatarResponses.filter(r => r.reqId !== reqId);
        await supabase.from('doea_state').upsert({ id: 1, state: pollData.state });
        return res.url;
      }
    }
  } catch (e) {
    console.error("Avatar fetch error", e);
  }
  return null;
};

const initialData = {
  gois: [
    { id: 1, name: 'Valravn Corp', type: 'PMC', threat: 'High', status: 'Hostile', relation: 'Hostile' },
    { id: 2, name: 'Archon Co', type: 'Anomalous Tech', threat: 'Medium', status: 'Unknown', relation: 'Neutral' },
    { id: 3, name: 'Chaos Insurgency', type: 'Splinter Group', threat: 'Critical', status: 'Hostile', relation: 'Hostile' },
    { id: 4, name: 'Global Occult Coalition', type: 'UN Agency', threat: 'High', status: 'Active', relation: 'Allied' }
  ],
  incidents: [
    { id: 1, date: '2026-06-15', goiId: 3, location: 'Heavy Containment', severity: 'High', description: 'Attempted breach of containment wing.' }
  ],
  deployments: [
    { id: 1, date: '2026-06-18', team: 'MTF Nu-7', location: 'Surface', purpose: 'Special Interview', outcome: 'In Progress' }
  ],
  comms: [
    { id: 1, date: '2026-06-16', goiId: 1, agent: 'Dr. Jacoby', transcript: 'Initial contact established. Valravn representatives refused to disclose anomalous asset locations. Negotiations tense.' }
  ],
  personnel: [
    { id: 1, name: 'Dr. Jacoby', role: 'Director of External Affairs', clearance: 4, department: 'DoEA', status: 'Active', points: 1500, honor: 200, timezone: 'EST (UTC-5)', strikes: 0 },
    { id: 2, name: 'Agent Smith', role: 'Field Operative', clearance: 3, department: 'MTF Pi-1', status: 'Active', points: 450, honor: 50, timezone: 'CET (UTC+1)', strikes: 1 }
  ],
  meetings: [
    { id: 1, date: '2026-06-25T14:00', goiId: 4, agent: 'Dr. Jacoby', topic: 'Joint Operation Planning', status: 'Scheduled' }
  ],
  audit: [
    { id: 1, time: new Date().toLocaleTimeString(), message: 'SYSTEM INITIALIZED', timestamp: Date.now() }
  ]
};

function BootSequence({ onComplete }) {
  const [lines, setLines] = useState([]);
  const bootText = [
    "INITIALIZING O5 COMMAND SECURE CONNECTION...",
    "HANDSHAKE PROTOCOL: ACCEPTED",
    "DECRYPTING DoEA DATABASE...",
    "VERIFYING CREDENTIALS... [SITE JACOBY]",
    "ACCESS GRANTED.",
    "LOADING TERMINAL INTERFACE..."
  ];

  useEffect(() => {
    let currentLine = 0;
    const interval = setInterval(() => {
      setLines(prev => [...prev, bootText[currentLine]]);
      audio.playBeep('type');
      currentLine++;
      if (currentLine >= bootText.length) {
        clearInterval(interval);
        setTimeout(onComplete, 1500);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="boot-sequence">
      <img src={SCP_LOGO_URL} alt="SCP Logo" className="boot-logo" />
      <div className="boot-text-container">
        {lines.map((line, i) => <div key={i} className="boot-line">{line}</div>)}
        <div className="cursor">_</div>
      </div>
    </div>
  );
}

function PublicApplyView({ setData, onClose, applicationsOpen }) {
  const [submitted, setSubmitted] = useState(false);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    audio.playBeep('click');
    const fd = new FormData(e.target);
    const charName = fd.get('charName');
    const discordId = fd.get('discordId');
    const role = fd.get('role');
    const experience = fd.get('experience');
    const reason = fd.get('reason');
    
    const newDM = {
      dmId: Date.now().toString(),
      action: 'APPLICATION',
      charName,
      discordId,
      role,
      experience,
      reason
    };
    
    setData(prev => prev, { pendingDMs: [newDM] });
    setSubmitted(true);
  };

  if (applicationsOpen === false) {
    return (
      <div className="login-container fade-in">
        <div className="login-box glow-panel" style={{position: 'relative'}}>
          <button onClick={onClose} style={{position: 'absolute', top: '10px', left: '10px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 'bold'}}>{"< BACK"}</button>
          <div style={{display: 'flex', justifyContent: 'center', marginBottom: '20px'}}>
            <img src={SCP_LOGO_URL} crossOrigin="anonymous" alt="SCP Logo" width="80" height="80" />
          </div>
          <h2 style={{textAlign: 'center', color: 'var(--text-highlight)'}}>RECRUITMENT CLOSED</h2>
          <p style={{textAlign: 'center', color: 'var(--text-muted)'}}>The Department of External Affairs is not currently accepting new applications. Please try again later.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="login-container fade-in">
        <div className="login-box glow-panel">
          <div style={{display: 'flex', justifyContent: 'center', marginBottom: '20px'}}>
            <img src={SCP_LOGO_URL} crossOrigin="anonymous" alt="SCP Logo" width="80" height="80" />
          </div>
          <h2 style={{textAlign: 'center', color: 'var(--text-highlight)'}}>APPLICATION RECEIVED</h2>
          <p style={{textAlign: 'center', color: 'var(--text-muted)', marginBottom: '20px'}}>Your application has been submitted to the Department of External Affairs. If accepted, you will be contacted via secure channels.</p>
          <button onClick={onClose} className="primary" style={{width: '100%'}}>RETURN TO LOGIN</button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container fade-in" style={{justifyContent: 'flex-start', alignItems: 'center', paddingTop: '50px', paddingBottom: '50px', overflowY: 'auto'}}>
      <div className="login-box glow-panel" style={{width: '600px', maxWidth: '90%', position: 'relative'}}>
        <button onClick={onClose} style={{position: 'absolute', top: '10px', left: '10px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 'bold'}}>{"< BACK"}</button>
        <div style={{display: 'flex', justifyContent: 'center', marginBottom: '20px'}}>
          <img src={SCP_LOGO_URL} crossOrigin="anonymous" alt="SCP Logo" width="80" height="80" />
        </div>
        <h2 style={{textAlign: 'center', color: 'var(--text-highlight)', marginBottom: '10px'}}>DEPARTMENT OF EXTERNAL AFFAIRS</h2>
        <p style={{textAlign: 'center', color: 'var(--text-muted)', marginBottom: '30px'}}>Official Application Form - Level 1 Clearance Required</p>
        
        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '20px'}} onChange={() => audio.playBeep('type')}>
          <div>
            <label style={{color: 'var(--text-highlight)'}}>Character Name</label>
            <input name="charName" required placeholder="e.g. Dr. John Doe" style={{width: '100%'}}/>
          </div>
          <div>
            <label style={{color: 'var(--text-highlight)'}}>Discord ID (Required for contact)</label>
            <input name="discordId" required placeholder="e.g. 1234567890" style={{width: '100%'}}/>
          </div>
          <div>
            <label style={{color: 'var(--text-highlight)'}}>Desired Position / Specialization</label>
            <input name="role" required placeholder="e.g. Diplomat, Field Agent, Cover-up Specialist" style={{width: '100%'}}/>
          </div>
          <div>
            <label style={{color: 'var(--text-highlight)'}}>Previous Experience / Background</label>
            <textarea name="experience" required rows="3" style={{width: '100%', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '10px', outline: 'none', fontFamily: 'inherit', resize: 'vertical'}} placeholder="List any previous roles in the Foundation or relevant skills..." />
          </div>
          <div>
            <label style={{color: 'var(--text-highlight)'}}>Why do you wish to join the DoEA?</label>
            <textarea name="reason" required rows="4" style={{width: '100%', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '10px', outline: 'none', fontFamily: 'inherit', resize: 'vertical'}} placeholder="Explain your motives for transferring to External Affairs..." />
          </div>
          <button type="submit" className="primary" style={{marginTop: '10px', width: '100%', padding: '15px'}}>SUBMIT APPLICATION</button>
        </form>
      </div>
    </div>
  );
}

function LoginView({ onLogin, personnel, data, setData }) {
  const [mode, setMode] = useState('auth'); // 'auth' or 'manual'
  const [isScanning, setIsScanning] = useState(false);

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    audio.playBeep('click');
    const code = e.target.authCode.value.trim();
    // find personnel by id
    const person = personnel.find(p => p.id.toString() === parseInt(code, 10).toString());
    if (person) {
      onLogin({ name: person.name, clearance: person.clearance });
    } else {
      audio.playBeep('error');
      alert("ERROR: INVALID AUTH CODE. ACCESS DENIED.");
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    audio.playBeep('click');
    
    const overrideCode = e.target.overrideCode.value.trim();
    
    // Fetch directly from cloud to avoid stale state
    const { data: cloudData } = await supabase.from('doea_state').select('state').eq('id', 1).single();
    const codes = cloudData?.state?.overrideCodes || [];
    
    if (codes.includes(overrideCode)) {
      // Remove the code so it's one-time use
      const newCodes = codes.filter(c => c !== overrideCode);
      const newState = { ...cloudData.state, overrideCodes: newCodes };
      
      setData(newState); // This will update local state and upsert to supabase
      
      const name = e.target.name.value;
      const clearance = parseInt(e.target.clearance.value);
      onLogin({ name, clearance });
    } else {
      audio.playBeep('error');
      alert("ERROR: INVALID AUTHORIZATION CODE.");
    }
  };

  const simulateScan = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    audio.playBeep('radar');
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      audio.playBeep('click');
    }, 2000);
  };

  if (mode === 'apply') {
    return <PublicApplyView setData={setData} onClose={() => setMode('auth')} applicationsOpen={data?.applicationsOpen} />;
  }

  return (
    <div className="login-container">
      <div className="login-panel glow-panel fade-in">
        <h2 className="login-title">AUTHORIZED ACCESS ONLY</h2>
        <div style={{textAlign: 'center', marginBottom: '20px', position: 'relative', overflow: 'hidden', width: '100px', margin: '0 auto 20px'}}>
          {isScanning && <div className="scanner-laser"></div>}
          <Lock size={48} color="var(--accent-red)" style={{opacity: isScanning ? 0.3 : 1}} />
        </div>
        
        {mode === 'auth' ? (
          <form onSubmit={handleAuthSubmit} style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
            <div style={{textAlign: 'center'}}>
              <label style={{backgroundColor: 'var(--bg-panel)', color: 'var(--accent-red)', cursor: 'pointer', padding: '8px 16px', border: '1px solid var(--accent-red)', fontWeight: 'bold', display: 'inline-block'}}>
                [ATTACH ID CARD SCAN]
                <input type="file" style={{display: 'none'}} accept="image/*" onChange={simulateScan} />
              </label>
            </div>
            <div>
              <label>6-DIGIT AUTH CODE</label>
              <input name="authCode" required placeholder="e.g. 000001" onChange={() => audio.playBeep('type')} />
            </div>
            <button className="primary" type="submit" style={{marginTop: '10px'}} disabled={isScanning}>
              {isScanning ? 'SCANNING...' : 'AUTHENTICATE'}
            </button>
            <button type="button" onClick={() => { audio.playBeep('click'); setMode('apply'); }} style={{fontSize: '0.8rem', padding: '10px', border: '1px solid var(--accent-red)', background: 'transparent', color: 'var(--text-highlight)', marginTop: '5px'}}>
              RECRUITMENT APPLICATION
            </button>
            <button type="button" onClick={() => { audio.playBeep('click'); setMode('manual'); }} style={{fontSize: '0.7rem', padding: '4px', border: 'none', background: 'transparent', color: 'var(--text-muted)'}}>
              [MANUAL OVERRIDE]
            </button>
          </form>
        ) : (
          <form onSubmit={handleManualSubmit} style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
            <div>
              <label>AGENT NAME / DESIGNATION</label>
              <input name="name" required placeholder="e.g. Researcher Jacoby" onChange={() => audio.playBeep('type')} />
            </div>
            <div>
              <label>CLEARANCE LEVEL</label>
              <select name="clearance" required onChange={() => audio.playBeep('click')}>
                <option value="1">Level 1 (Restricted)</option>
                <option value="2">Level 2 (Confidential)</option>
                <option value="3">Level 3 (Secret)</option>
                <option value="4">Level 4 (Top Secret)</option>
                <option value="5">Level 5 (Thaumiel / O5)</option>
              </select>
            </div>
            <div>
              <label style={{color: '#ffaa00'}}>AUTHORIZATION CODE</label>
              <input name="overrideCode" required placeholder="e.g. AUTH-7X9B" style={{borderColor: '#ffaa00'}} onChange={() => audio.playBeep('type')} />
              <div style={{fontSize: '0.65rem', color: '#ffaa00', marginTop: '5px'}}>Get this code using /override in Discord.</div>
            </div>
            <button className="primary" type="submit" style={{marginTop: '10px'}}>OVERRIDE LOGIN</button>
            <button type="button" onClick={() => { audio.playBeep('click'); setMode('auth'); }} style={{fontSize: '0.7rem', padding: '4px', border: 'none', background: 'transparent', color: 'var(--text-muted)'}}>
              [RETURN TO AUTH SCANNER]
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Redacted({ children, clearance, required, text }) {
  // Disabled clearance block for local testing
  return children || text;
}

function App() {
  const [isBooted, setIsBooted] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [documentToPrint, setDocumentToPrint] = useState(null);
  const [idCardToPrint, setIdCardToPrint] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  const [data, setLocalData] = useState(initialData);

  useEffect(() => {
    const fetchCloudData = async () => {
      const { data: cloudData, error } = await supabase
        .from('doea_state')
        .select('state')
        .eq('id', 1)
        .single();
        
      if (cloudData && cloudData.state) {
        setLocalData(cloudData.state);
      } else {
        const saved = localStorage.getItem('scp_doea_data');
        if (saved) setLocalData(JSON.parse(saved));
      }
    };
    fetchCloudData();
  }, []);

  const setData = async (actionOrData, customQueues = null) => {
    let newData;
    setLocalData(prev => {
      newData = typeof actionOrData === 'function' ? actionOrData(prev) : actionOrData;
      localStorage.setItem('scp_doea_data', JSON.stringify(newData));
      return newData;
    });

    try {
      const { data: cloudData } = await supabase.from('doea_state').select('state').eq('id', 1).single();
      const finalState = { ...newData };
      
      if (cloudData && cloudData.state) {
        if (customQueues && customQueues.pendingDMs) {
          finalState.pendingDMs = [...(cloudData.state.pendingDMs || []), ...customQueues.pendingDMs];
        } else {
          finalState.pendingDMs = cloudData.state.pendingDMs || [];
        }
        
        finalState.avatarRequests = cloudData.state.avatarRequests || [];
        finalState.avatarResponses = cloudData.state.avatarResponses || [];
      } else if (customQueues && customQueues.pendingDMs) {
        finalState.pendingDMs = customQueues.pendingDMs;
      }
      
      await supabase.from('doea_state').upsert({ id: 1, state: finalState });
    } catch(e) {
      console.error(e);
    }
  };

  const toggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    audio.toggle(next);
    if(next) audio.playBeep('click');
  };

  const navTo = (tab) => {
    audio.playBeep('click');
    setActiveTab(tab);
  };

  const logAction = (message) => {
    const newLog = { id: Date.now(), time: new Date().toLocaleTimeString(), message: `${currentUser?.name || 'SYSTEM'} - ${message}`, timestamp: Date.now() };
    setData(prev => ({...prev, audit: [newLog, ...(prev.audit || [])].slice(0, 50)}));
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
    const newLog = { id: Date.now(), time: new Date().toLocaleTimeString(), message: `LOGIN: Agent ${user.name} (Clearance ${user.clearance})`, timestamp: Date.now() };
    setData(prev => ({...prev, audit: [newLog, ...(prev.audit || [])].slice(0, 50)}));
  };

  if (!isBooted) {
    return <BootSequence onComplete={() => setIsBooted(true)} />;
  }

  if (!currentUser) {
    return <LoginView onLogin={handleLogin} personnel={data.personnel || []} data={data} setData={setData} />;
  }

  // ID Card Print Overlay
  if (idCardToPrint) {
    const downloadIdCard = async () => {
      audio.playBeep('radar');
      const element = document.getElementById('id-card-element');
      if (!element) return;
      try {
        const canvas = await html2canvas(element, { 
          backgroundColor: '#ffffff', 
          scale: 2,
          useCORS: true,
          allowTaint: true
        });
        const image = canvas.toDataURL("image/png", 1.0);
        const link = document.createElement('a');
        link.download = `ID_CARD_${idCardToPrint.name.replace(/\s+/g, '_')}.png`;
        link.href = image;
        link.click();
        logAction(`DOWNLOADED ID CARD FOR: ${idCardToPrint.name}`);
      } catch (e) {
        console.error("Failed to generate ID card", e);
      }
    };

    return (
      <div className="id-card-view-wrapper">
        <div id="id-card-element" className="id-card" style={{opacity: 1}}>
          <div className="id-card-header">
            <img src={SCP_LOGO_URL} crossOrigin="anonymous" alt="SCP Logo" className="id-card-logo" />
            <div className="id-card-title">
              <h2 style={{color: 'white'}}>SCP FOUNDATION</h2>
              <p style={{color: '#aaaaaa'}}>SECURE. CONTAIN. PROTECT.</p>
            </div>
          </div>
          
          <div className="id-card-body">
            <div className="id-photo-container">
              <div className="id-photo" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100%', overflow:'hidden'}}>
                {idCardToPrint.avatarUrl ? (
                  <img src={idCardToPrint.avatarUrl} crossOrigin="anonymous" alt="Avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                ) : (
                  <ImageIcon size={64} color="#333333" />
                )}
              </div>
            </div>
            <div className="id-details" style={{color: 'black'}}>
              <div className="id-field">
                <label style={{color: '#666666'}}>NAME</label>
                <div style={{color: 'black'}}>{idCardToPrint.name.toUpperCase()}</div>
              </div>
              <div className="id-field">
                <label style={{color: '#666666'}}>ROLE</label>
                <div style={{color: 'black'}}>{idCardToPrint.role.toUpperCase()}</div>
              </div>
              <div className="id-field">
                <label style={{color: '#666666'}}>DEPARTMENT</label>
                <div style={{color: 'black'}}>{idCardToPrint.department.toUpperCase()}</div>
              </div>
            </div>
          </div>

          <div className="id-card-footer">
            <div className="id-clearance" style={{color: '#333333'}}>
              CLEARANCE LEVEL
              <div className="id-level-number" style={{color: '#b71c1c'}}>{idCardToPrint.clearance}</div>
            </div>
            <div className="id-barcode" style={{color: 'black'}}>
              ||| ||||| |||| || ||| |||| ||
              <div style={{color: 'black'}}>AUTH: {idCardToPrint.id.toString().padStart(6, '0')}</div>
            </div>
          </div>
        </div>
        
        <div className="no-print" style={{marginTop: '40px', display: 'flex', gap: '10px', justifyContent: 'center'}}>
          <button onClick={downloadIdCard} className="primary" style={{backgroundColor: '#0066cc', color: 'white', borderColor: '#004499', display: 'flex', gap: '5px', alignItems: 'center'}}>
            <Download size={16}/> DOWNLOAD AS PNG
          </button>
          <button onClick={() => { audio.playBeep('click'); window.print(); }} className="primary" style={{backgroundColor: 'black', color: 'white', borderColor: 'black'}}>PRINT ID</button>
          <button onClick={() => { audio.playBeep('click'); setIdCardToPrint(null); }}>RETURN TO TERMINAL</button>
        </div>
      </div>
    );
  }

  // Print View Overlay
  if (documentToPrint) {
    return (
      <div className="document-view">
        <div className="doc-header">
          <img src={SCP_LOGO_URL} alt="SCP Logo" style={{width: '100px'}} />
          <div style={{textAlign: 'right'}}>
            <div><strong>DEPARTMENT OF EXTERNAL AFFAIRS</strong></div>
            <div><strong>CLEARANCE:</strong> LEVEL {currentUser.clearance}</div>
            <div><strong>DATE:</strong> {new Date().toISOString().split('T')[0]}</div>
          </div>
        </div>
        <div className="doc-title">{documentToPrint.title}</div>
        <div style={{marginTop: '20px', whiteSpace: 'pre-wrap', lineHeight: '1.6'}}>
          {documentToPrint.content}
        </div>
        <div className="no-print" style={{marginTop: '40px', display: 'flex', gap: '10px'}}>
          <button onClick={() => { audio.playBeep('click'); window.print(); }} className="primary" style={{backgroundColor: 'black', color: 'white', borderColor: 'black'}}>PRINT TO PDF / SCREENSHOT</button>
          <button onClick={() => { audio.playBeep('click'); setDocumentToPrint(null); }}>RETURN TO TERMINAL</button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView data={data} setData={setData} logAction={logAction} currentUser={currentUser} />;
      case 'messages':
        return <MessagesView data={data} setData={setData} logAction={logAction} currentUser={currentUser} />;
      case 'evaluations':
        return <EvaluationsView data={data} setData={setData} logAction={logAction} currentUser={currentUser} />;
      case 'personnel':
        return <PersonnelView data={data} setData={setData} logAction={logAction} currentUser={currentUser} setPrint={setIdCardToPrint} />;
      case 'deployments':
        return <DeploymentsKanbanView data={data} setData={setData} logAction={logAction} currentUser={currentUser} />;
      case 'meetings':
        return <MeetingsView data={data} setData={setData} logAction={logAction} currentUser={currentUser} />;
      case 'goi':
        return <GoiView data={data} setData={setData} logAction={logAction} currentUser={currentUser} />;
      case 'incidents':
        return <IncidentsView data={data} setData={setData} logAction={logAction} currentUser={currentUser} setPrint={setDocumentToPrint} />;
      case 'comms':
        return <CommsView data={data} setData={setData} logAction={logAction} currentUser={currentUser} setPrint={setDocumentToPrint} />;
      case 'schema':
        return <SchemaView data={data} currentUser={currentUser} />;
      case 'terminal':
        return <TerminalView data={data} currentUser={currentUser} />;
      default:
        return <DashboardView data={data} setData={setData} logAction={logAction} currentUser={currentUser} />;
    }
  };

  return (
    <div className="app-container crt-effect">
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src={SCP_LOGO_URL} alt="SCP Logo" className="sidebar-logo" />
          <div className="dept-name">DoEA SECURE TERMINAL</div>
          <button onClick={toggleAudio} style={{marginTop: '10px', fontSize: '0.7rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '5px', margin: '10px auto'}}>
            {audioEnabled ? <Volume2 size={14}/> : <VolumeX size={14}/>} {audioEnabled ? 'AUDIO ON' : 'AUDIO OFF'}
          </button>
        </div>
        <nav className="nav-links">
          <div className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => navTo('dashboard')}>
            <Activity size={18} /> OVERVIEW
          </div>
          <div className={`nav-link ${activeTab === 'personnel' ? 'active' : ''}`} onClick={() => navTo('personnel')}>
            <Users size={18} /> PERSONNEL
          </div>
          <div className={`nav-link ${activeTab === 'evaluations' ? 'active' : ''}`} onClick={() => navTo('evaluations')}>
            <Activity size={18} /> EVALUATIONS
          </div>
          <div className={`nav-link ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => navTo('messages')}>
            <MessageSquare size={18} /> INBOX
          </div>
          <div className={`nav-link ${activeTab === 'deployments' ? 'active' : ''}`} onClick={() => navTo('deployments')}>
            <Target size={18} /> DEPLOYMENTS
          </div>
          <div className={`nav-link ${activeTab === 'meetings' ? 'active' : ''}`} onClick={() => navTo('meetings')}>
            <Calendar size={18} /> MEETINGS
          </div>
          <div className={`nav-link ${activeTab === 'goi' ? 'active' : ''}`} onClick={() => navTo('goi')}>
            <Database size={18} /> GOI REGISTRY
          </div>
          <div className={`nav-link ${activeTab === 'schema' ? 'active' : ''}`} onClick={() => navTo('schema')}>
            <Share2 size={18} /> NETWORK SCHEMA
          </div>
          <div className={`nav-link ${activeTab === 'incidents' ? 'active' : ''}`} onClick={() => navTo('incidents')}>
            <ShieldAlert size={18} /> INCIDENTS
          </div>
          <div className={`nav-link ${activeTab === 'comms' ? 'active' : ''}`} onClick={() => navTo('comms')}>
            <MessageSquare size={18} /> COMMS LOGS
          </div>
          <div className={`nav-link ${activeTab === 'terminal' ? 'active' : ''}`} onClick={() => navTo('terminal')}>
            <TerminalIcon size={18} /> CMD TERMINAL
          </div>
        </nav>
        
        <div style={{marginTop: 'auto', padding: '20px', borderTop: '1px solid var(--border-color)', fontSize: '0.8rem'}}>
          <div style={{color: 'var(--text-highlight)'}}>LOGGED IN AS:</div>
          <div style={{color: 'var(--accent-red)', fontWeight: 'bold'}}>{currentUser.name}</div>
          <div>CLEARANCE: Level {currentUser.clearance}</div>
          <button style={{marginTop: '10px', fontSize: '0.7rem', padding: '4px 8px'}} onClick={() => { audio.playBeep('click'); setCurrentUser(null); }}>LOGOUT</button>
        </div>
      </aside>
      
      <main className="main-content">
        <header className="topbar">
          <div className="glow-text">SITE JACOBY - AUTHORIZED PERSONNEL ONLY</div>
          <div className="glow-text">{new Date().toISOString().split('T')[0]} - SECURE CONNECTION</div>
        </header>
        <div className="content-area" style={{paddingBottom: '50px'}}>
          {renderContent()}
        </div>
      </main>

      {/* Audit Ticker */}
      <div className="audit-ticker">
        <div className="ticker-content">
          {(data.audit || []).filter(log => log.timestamp && (Date.now() - log.timestamp <= 5 * 60 * 1000)).map(log => (
            <span key={log.id} className="ticker-item">[{log.time}] {log.message}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Custom Views

function MessagesView({ data, setData, logAction, currentUser }) {
  const [showModal, setShowModal] = useState(false);
  const messages = data.messages || [];
  
  // Filter messages intended for the current user
  const myMessages = messages.filter(m => m.to === currentUser.name);

  const handleSend = (e) => {
    e.preventDefault();
    audio.playBeep('click');
    const fd = new FormData(e.target);
    const newMsg = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      from: currentUser.name,
      to: fd.get('to'),
      subject: fd.get('subject'),
      body: fd.get('body'),
      read: false
    };
    setData({...data, messages: [newMsg, ...messages]});
    logAction(`SENT SECURE MESSAGE TO: ${newMsg.to}`);
    setShowModal(false);
  };

  const markAsRead = (id) => {
    const updated = messages.map(m => m.id === id ? { ...m, read: true } : m);
    setData({...data, messages: updated});
  };

  return (
    <div className="fade-in" style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h2>SECURE INBOX</h2>
        <button className="primary" onClick={() => { audio.playBeep('click'); setShowModal(true); }}>+ COMPOSE MESSAGE</button>
      </div>

      <div style={{display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto'}}>
        {myMessages.length === 0 ? (
          <div className="glow-panel" style={{textAlign: 'center', color: 'var(--text-muted)'}}>
            NO UNREAD MESSAGES IN INBOX.
          </div>
        ) : myMessages.map(msg => (
          <div key={msg.id} className="terminal-panel glow-panel" style={{borderColor: msg.read ? 'var(--border-color)' : 'var(--accent-red)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
              <div>
                <strong>FROM:</strong> {msg.from} <br/>
                <span style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>{msg.date}</span>
              </div>
              {!msg.read && <span style={{color: 'var(--accent-red)', fontWeight: 'bold'}}>[UNREAD]</span>}
            </div>
            <div style={{fontWeight: 'bold', color: 'var(--text-highlight)', marginBottom: '10px'}}>{msg.subject}</div>
            <div style={{whiteSpace: 'pre-wrap', color: 'var(--text-main)', marginBottom: '15px'}}>{msg.body}</div>
            {!msg.read && (
              <button style={{fontSize: '0.8rem', padding: '5px 10px'}} onClick={() => { audio.playBeep('click'); markAsRead(msg.id); }}>
                MARK AS READ
              </button>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <Modal title="COMPOSE SECURE MESSAGE" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSend} style={{display: 'flex', flexDirection: 'column', gap: '15px'}} onChange={() => audio.playBeep('type')}>
            <div>
              <label>TO (AGENT NAME)</label>
              <select name="to" required>
                {(data.personnel || []).filter(p => p.name !== currentUser.name).map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label>SUBJECT</label>
              <input name="subject" required />
            </div>
            <div>
              <label>MESSAGE BODY</label>
              <textarea name="body" rows="5" required style={{width: '100%', background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '10px'}}></textarea>
            </div>
            <button className="primary" type="submit" style={{marginTop: '10px'}}>TRANSMIT ENCRYPTED MESSAGE</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function TerminalView({ data, currentUser }) {
  const [history, setHistory] = useState([
    "DoEA Secure Terminal OS v1.4",
    "Type 'HELP' for available commands."
  ]);
  const [input, setInput] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    if(endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleCommand = (e) => {
    e.preventDefault();
    if(!input.trim()) return;
    audio.playBeep('click');

    const cmd = input.trim();
    let response = [];
    const parts = cmd.split(' ');
    const mainCmd = parts[0].toUpperCase();

    switch(mainCmd) {
      case 'HELP':
        response = [
          "AVAILABLE COMMANDS:",
          "  STATUS - Shows current database statistics",
          "  SEARCH [NAME] - Searches GOI registry by name",
          "  CLEAR - Clears terminal output",
          "  WHOAMI - Displays current user info"
        ];
        break;
      case 'STATUS':
        response = [
          `ACTIVE GOI RECORDS: ${(data.gois || []).length}`,
          `UNRESOLVED INCIDENTS: ${(data.incidents || []).length}`,
          `ACTIVE DEPLOYMENTS: ${(data.deployments || []).length}`,
          "SYSTEM OPERATIONAL."
        ];
        break;
      case 'CLEAR':
        setHistory(["Terminal cleared."]);
        setInput('');
        return;
      case 'WHOAMI':
        response = [
          `AGENT DESIGNATION: ${currentUser.name}`,
          `SECURITY CLEARANCE: LEVEL ${currentUser.clearance}`
        ];
        break;
      case 'SEARCH':
        if(parts.length < 2) {
          response = ["ERROR: Missing search parameter. Usage: SEARCH [NAME]"];
          audio.playBeep('error');
        } else {
          const term = parts.slice(1).join(' ').toLowerCase();
          const found = (data.gois || []).filter(g => g.name.toLowerCase().includes(term));
          if(found.length > 0) {
            response = found.map(g => `[RECORD FOUND] - ${g.name} | THREAT: ${g.threat} | RELATION: ${g.relation}`);
          } else {
            response = [`NO RECORDS FOUND FOR: ${term}`];
            audio.playBeep('error');
          }
        }
        break;
      default:
        response = [`ERROR: Command not recognized '${mainCmd}'. Type HELP for options.`];
        audio.playBeep('error');
    }

    setHistory(prev => [...prev, `C:\\DoEA\\> ${cmd}`, ...response]);
    setInput('');
  };

  return (
    <div className="fade-in" style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h2>COMMAND LINE INTERFACE</h2>
      </div>
      <div className="terminal-panel glow-panel" style={{flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'black', fontFamily: 'Courier New, monospace', fontSize: '1.1rem'}}>
        <div style={{flex: 1, overflowY: 'auto', marginBottom: '10px'}}>
          {history.map((line, i) => (
            <div key={i} style={{color: line.startsWith('ERROR') ? 'var(--accent-red)' : 'var(--text-highlight)', marginBottom: '5px'}}>
              {line}
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <form onSubmit={handleCommand} style={{display: 'flex', borderTop: '1px solid var(--border-color)', paddingTop: '10px'}}>
          <span style={{color: 'var(--accent-red-light)', marginRight: '10px'}}>C:\DoEA\&gt;</span>
          <input 
            value={input} 
            onChange={(e) => { setInput(e.target.value); audio.playBeep('type'); }} 
            autoFocus 
            style={{background: 'transparent', border: 'none', color: 'var(--text-highlight)', flex: 1, outline: 'none', fontFamily: 'Courier New, monospace', fontSize: '1.1rem', padding: 0}} 
          />
        </form>
      </div>
    </div>
  );
}

function PersonnelView({ data, setData, logAction, currentUser, setPrint }) {
  const [showModal, setShowModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    audio.playBeep('click');
    const fd = new FormData(e.target);
    const isNew = !editingPerson;
    const newId = isNew ? Math.floor(100000 + Math.random() * 900000) : editingPerson.id;
    const discordId = fd.get('discordId')?.trim();

    setSaveStatus('AUTHENTICATING WITH SECURE MAINFRAME...');
    let avatarUrl = editingPerson?.avatarUrl || null;
    if (discordId) {
       avatarUrl = await fetchAvatarThroughBot(discordId) || avatarUrl;
    }
    setSaveStatus('');

    const personData = {
      id: newId,
      name: fd.get('name'),
      role: fd.get('role'),
      clearance: parseInt(fd.get('clearance')),
      department: fd.get('department'),
      status: fd.get('status'),
      points: editingPerson ? (editingPerson.points || 0) : 0,
      honor: editingPerson ? (editingPerson.honor || 0) : 0,
      timezone: editingPerson ? (editingPerson.timezone || 'Unknown') : 'Unknown',
      strikes: editingPerson ? (editingPerson.strikes || 0) : 0,
      discordId: discordId || editingPerson?.discordId,
      avatarUrl
    };
    
    if (editingPerson) {
      let newDM = null;
      if (editingPerson.discordId || discordId) {
         newDM = {
            dmId: Date.now().toString(),
            action: 'EDIT',
            discordId: discordId || editingPerson.discordId,
            name: personData.name,
            role: personData.role,
            department: personData.department,
            clearance: personData.clearance,
            code: personData.id
         };
      }
      setData({...data, personnel: (data.personnel || []).map(p => p.id === editingPerson.id ? personData : p)}, newDM ? { pendingDMs: [newDM] } : null);
      logAction(`UPDATED PERSONNEL: ${personData.name}`);
    } else {
      let newDM = null;
      if (discordId) {
        // --- INVISIBLE PHOTO STUDIO ---
        const wrapper = document.createElement('div');
        wrapper.className = 'id-card-view-wrapper';
        wrapper.style.position = 'absolute';
        wrapper.style.left = '-9999px';
        wrapper.style.top = '-9999px';
        wrapper.style.opacity = '1';
        
        wrapper.innerHTML = `
        <div id="hidden-id-card-${personData.id}" class="id-card" style="opacity: 1">
          <div class="id-card-header">
            <img src="${SCP_LOGO_URL}" crossorigin="anonymous" alt="SCP Logo" class="id-card-logo" />
            <div class="id-card-title">
              <h2 style="color: white; margin:0; font-size:1.5rem">SCP FOUNDATION</h2>
              <p style="color: #aaaaaa; margin:0; font-size:0.7rem; letter-spacing:1px">SECURE. CONTAIN. PROTECT.</p>
            </div>
          </div>
          
          <div class="id-card-body">
            <div class="id-photo-container">
              <div class="id-photo" style="display:flex; justify-content:center; align-items:center; height:100%; overflow:hidden;">
                ${personData.avatarUrl ? `<img src="${personData.avatarUrl}" crossorigin="anonymous" style="width:100%; height:100%; object-fit:cover;" />` : `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`}
              </div>
            </div>
            <div class="id-details" style="color: black">
              <div class="id-field">
                <label style="color: #666666">NAME</label>
                <div style="color: black">${personData.name.toUpperCase()}</div>
              </div>
              <div class="id-field">
                <label style="color: #666666">ROLE</label>
                <div style="color: black">${personData.role.toUpperCase()}</div>
              </div>
              <div class="id-field">
                <label style="color: #666666">DEPARTMENT</label>
                <div style="color: black">${personData.department.toUpperCase()}</div>
              </div>
            </div>
          </div>

          <div class="id-card-footer">
            <div class="id-clearance" style="color: #333333">
              CLEARANCE LEVEL
              <div class="id-level-number" style="color: #b71c1c">${personData.clearance}</div>
            </div>
            <div class="id-barcode" style="color: black">
              ||| ||||| |||| || ||| |||| ||
              <div style="color: black">AUTH: ${personData.id.toString().padStart(6, '0')}</div>
            </div>
          </div>
        </div>
        `;
        document.body.appendChild(wrapper);
        
        let photoData = null;
        try {
          const element = document.getElementById(`hidden-id-card-${personData.id}`);
          const canvas = await html2canvas(element, { 
            backgroundColor: '#ffffff', 
            scale: 2,
            useCORS: true,
            allowTaint: true
          });
          photoData = canvas.toDataURL("image/png", 1.0);
        } catch(e) {
          console.error("Failed hidden canvas capture", e);
        } finally {
          document.body.removeChild(wrapper);
        }

        newDM = {
          dmId: Date.now().toString(),
          action: 'CREATE',
          discordId,
          name: personData.name,
          role: personData.role,
          department: personData.department,
          clearance: personData.clearance,
          code: personData.id,
          photoData
        };
      }
      setData({...data, personnel: [personData, ...(data.personnel || [])]}, newDM ? { pendingDMs: [newDM] } : null);
      logAction(`REGISTERED PERSONNEL: ${personData.name}`);
    }
    
    setShowModal(false);
    setEditingPerson(null);
  };

  return (
    <div className="fade-in">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h2>PERSONNEL DIRECTORY</h2>
        <div style={{display: 'flex', gap: '10px'}}>
          {currentUser.clearance >= 4 && (
            <button 
              className={data.applicationsOpen === false ? "primary" : ""} 
              style={data.applicationsOpen !== false ? { backgroundColor: '#500', color: 'white', border: '1px solid #a00', padding: '10px' } : { padding: '10px' }}
              onClick={() => {
                audio.playBeep('click');
                const newState = data.applicationsOpen === false ? true : false;
                setData({...data, applicationsOpen: newState});
                logAction(newState ? 'OPENED PUBLIC APPLICATIONS' : 'CLOSED PUBLIC APPLICATIONS');
              }}>
              {data.applicationsOpen === false ? 'OPEN RECRUITMENT' : 'CLOSE RECRUITMENT'}
            </button>
          )}
          {currentUser.clearance >= 3 && <button className="primary" onClick={() => { 
            audio.playBeep('click'); 
            setEditingPerson(null); 
            setShowModal(true); 
          }}>+ ADD PERSONNEL</button>}
        </div>
      </div>
      
      <div className="grid-layout" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))'}}>
        {(data.personnel || []).map(person => (
          <div key={person.id} className="terminal-panel glow-panel" style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <h3 style={{margin: 0, color: 'var(--text-highlight)'}}>{person.name}</h3>
              <span className={`status-badge ${person.status === 'Active' ? 'status-allied' : 'status-unknown'}`}>{person.status}</span>
            </div>
            <div style={{color: 'var(--accent-red-light)'}}>{person.role}</div>
            <div style={{color: 'var(--text-muted)'}}>DEPT: {person.department}</div>
            <div style={{color: 'var(--warning)', fontWeight: 'bold'}}>CLEARANCE: L{person.clearance}</div>
            <div style={{marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '5px'}}>
              <button 
                style={{display: 'flex', justifyContent: 'center', gap: '10px'}} 
                onClick={() => { audio.playBeep('click'); setPrint(person); logAction(`GENERATED ID FOR: ${person.name}`); }}>
                <Printer size={16}/> GENERATE ID CARD
              </button>
              
              {currentUser.clearance >= 4 && (
                <div style={{display: 'flex', gap: '5px', marginTop: '5px'}}>
                  <button style={{flex: 1, padding: '5px', fontSize: '0.8rem'}} onClick={() => { 
                    audio.playBeep('click'); 
                    setEditingPerson(person); 
                    setShowModal(true); 
                  }}>EDIT</button>
                  <button style={{flex: 1, padding: '5px', fontSize: '0.8rem', backgroundColor: '#500', borderColor: '#a00', color: 'white'}} onClick={() => { 
                    audio.playBeep('error'); 
                    if(confirm(`Are you sure you want to terminate the record for ${person.name}?`)) {
                      let newDM = null;
                      if (person.discordId) {
                         newDM = {
                            dmId: Date.now().toString(),
                            action: 'DELETE',
                            discordId: person.discordId,
                            name: person.name
                         };
                      }
                      setData({...data, personnel: data.personnel.filter(p => p.id !== person.id)}, newDM ? { pendingDMs: [newDM] } : null);
                      logAction(`DELETED PERSONNEL RECORD: ${person.name}`);
                    }
                  }}>DELETE</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <Modal title={editingPerson ? "EDIT PERSONNEL" : "ADD PERSONNEL"} onClose={() => { setShowModal(false); setEditingPerson(null); }}>
            <form onSubmit={handleAdd} style={{display: 'flex', flexDirection: 'column', gap: '15px'}} onChange={() => audio.playBeep('type')}>
              <div><label>Name</label><input name="name" required defaultValue={editingPerson?.name || ''} /></div>
              <div><label>Role / Title</label><input name="role" required defaultValue={editingPerson?.role || ''} /></div>
              <div>
                <label>Clearance Level</label>
                <select name="clearance" defaultValue={editingPerson?.clearance || '1'}>
                  <option value="1">1 - Restricted</option>
                  <option value="2">2 - Confidential</option>
                  <option value="3">3 - Secret</option>
                  <option value="4">4 - Top Secret</option>
                  <option value="5">5 - Thaumiel</option>
                </select>
              </div>
              <div><label>Department</label><input name="department" required defaultValue={editingPerson?.department || ''} /></div>
              <div>
                <label>Status</label>
                <select name="status" defaultValue={editingPerson?.status || 'Active'}>
                  <option>Active</option><option>MIA</option><option>KIA</option><option>Terminated</option>
                </select>
              </div>
              {!editingPerson && (
                <div>
                  <label style={{color: '#7289da'}}>Discord User ID (Optional)</label>
                  <input name="discordId" placeholder="e.g. 1518754009094033561" style={{borderColor: '#7289da'}} />
                  <div style={{fontSize: '0.65rem', color: '#7289da', marginTop: '5px'}}>If provided, the bot will DM their ID and code.</div>
                </div>
              )}
              <button className="primary" type="submit" style={{marginTop: '10px'}} disabled={!!saveStatus}>{saveStatus || (editingPerson ? "UPDATE RECORD" : "SAVE PERSONNEL")}</button>
            </form>
        </Modal>
      )}
    </div>
  );
}

function DeploymentsKanbanView({ data, setData, logAction, currentUser }) {
  const [showModal, setShowModal] = useState(false);
  const statuses = ['Planning', 'In Progress', 'Completed', 'Failed'];

  const deployments = data.deployments || [];

  const handleAdd = (e) => {
    e.preventDefault();
    audio.playBeep('click');
    const fd = new FormData(e.target);
    const newDep = {
      id: Date.now(),
      date: fd.get('date'),
      team: fd.get('team'),
      location: fd.get('location'),
      purpose: fd.get('purpose'),
      outcome: 'Planning' // Default to planning
    };
    
    const newDM = {
      dmId: Date.now().toString(),
      action: 'MISSION',
      missionId: newDep.id.toString(),
      title: `Operation for ${newDep.team}`,
      description: newDep.purpose,
      threat: 'Unknown',
      targetGoi: 'TBD'
    };

    setData({...data, deployments: [newDep, ...deployments]}, { pendingDMs: [newDM] });
    logAction(`PLANNED NEW OPERATION FOR ${newDep.team}`);
    setShowModal(false);
  };

  const changeStatus = (id, newStatus) => {
    audio.playBeep('click');
    const updated = deployments.map(d => d.id === id ? { ...d, outcome: newStatus } : d);
    setData({...data, deployments: updated});
    logAction(`OPERATION ${id} STATUS UPDATED TO: ${newStatus.toUpperCase()}`);
  };

  return (
    <div className="fade-in" style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h2>TACTICAL OPERATIONS BOARD</h2>
        {currentUser.clearance >= 3 && <button className="primary" onClick={() => { audio.playBeep('click'); setShowModal(true); }}>+ PLAN OPERATION</button>}
      </div>
      
      <div className="kanban-board">
        {statuses.map(status => (
          <div key={status} className="kanban-column glow-panel">
            <h3 className="kanban-title">{status.toUpperCase()}</h3>
            <div className="kanban-cards">
              {deployments.filter(d => d.outcome === status).map(dep => (
                <div key={dep.id} className="kanban-card">
                  <div style={{fontWeight: 'bold', color: 'var(--accent-red)', marginBottom: '5px'}}>{dep.team}</div>
                  <div style={{fontSize: '0.9rem', color: 'var(--text-highlight)', marginBottom: '10px'}}>{dep.purpose}</div>
                  <div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>LOC: {dep.location}</div>
                  <div style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px'}}>DATE: {dep.date}</div>
                  
                  {currentUser.clearance >= 3 && (
                    <select 
                      value={status} 
                      onChange={(e) => changeStatus(dep.id, e.target.value)}
                      style={{padding: '4px', fontSize: '0.8rem', backgroundColor: 'var(--bg-dark)'}}
                    >
                      {statuses.map(s => <option key={s} value={s}>Move to: {s}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <Modal title="PLAN OPERATION" onClose={() => setShowModal(false)}>
          <form onSubmit={handleAdd} style={{display: 'flex', flexDirection: 'column', gap: '15px'}} onChange={() => audio.playBeep('type')}>
            <div><label>Date</label><input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]}/></div>
            <div><label>Team / Personnel Assigned</label><input name="team" placeholder="e.g. MTF Nu-7" required /></div>
            <div><label>Location</label><input name="location" required /></div>
            <div><label>Objective</label><input name="purpose" placeholder="e.g. Secure artifact, Diplomatic escort" required /></div>
            <button className="primary" type="submit" style={{marginTop: '10px'}}>CREATE OPERATION</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function MeetingsView({ data, setData, logAction, currentUser }) {
  const [showModal, setShowModal] = useState(false);
  
  const handleAdd = (e) => {
    e.preventDefault();
    audio.playBeep('click');
    const fd = new FormData(e.target);
    const newMeeting = {
      id: Date.now(),
      date: fd.get('date'),
      goiId: parseInt(fd.get('goiId')),
      agent: fd.get('agent'),
      topic: fd.get('topic'),
      status: fd.get('status')
    };
    setData({...data, meetings: [newMeeting, ...(data.meetings || [])]});
    logAction(`SCHEDULED MEETING WITH GOI ID ${newMeeting.goiId}`);
    setShowModal(false);
  };

  return (
    <div className="fade-in">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h2>DIPLOMATIC AGENDA</h2>
        {currentUser.clearance >= 2 && <button className="primary" onClick={() => { audio.playBeep('click'); setShowModal(true); }}>+ SCHEDULE MEETING</button>}
      </div>
      
      <div className="terminal-panel glow-panel">
        <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
          <thead>
            <tr style={{borderBottom: '1px solid var(--border-color)'}}>
              <th style={{padding: '10px'}}>DATE & TIME</th>
              <th style={{padding: '10px'}}>INTERLOCUTOR (GOI)</th>
              <th style={{padding: '10px'}}>AGENT ASSIGNED</th>
              <th style={{padding: '10px'}}>TOPIC</th>
              <th style={{padding: '10px'}}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {(data.meetings || []).sort((a,b) => new Date(a.date) - new Date(b.date)).map(meeting => {
              const goi = (data.gois || []).find(g => g.id === meeting.goiId);
              return (
              <tr key={meeting.id} style={{borderBottom: '1px solid var(--border-color)'}} className="table-row">
                <td style={{padding: '10px', color: 'var(--text-highlight)'}}>{meeting.date.replace('T', ' ')}</td>
                <td style={{padding: '10px', fontWeight: 'bold'}}>{goi ? goi.name : 'UNKNOWN'}</td>
                <td style={{padding: '10px', color: 'var(--accent-red-light)'}}>{meeting.agent}</td>
                <td style={{padding: '10px'}}>{meeting.topic}</td>
                <td style={{padding: '10px'}}>
                  <span className={`status-badge ${meeting.status === 'Scheduled' ? 'status-neutral' : (meeting.status === 'Completed' ? 'status-allied' : 'status-hostile')}`}>{meeting.status}</span>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="SCHEDULE MEETING" onClose={() => setShowModal(false)}>
          <form onSubmit={handleAdd} style={{display: 'flex', flexDirection: 'column', gap: '15px'}} onChange={() => audio.playBeep('type')}>
            <div><label>Date & Time</label><input type="datetime-local" name="date" required /></div>
            <div>
              <label>GOI</label>
              <select name="goiId">
                {(data.gois || []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div><label>Agent Assigned</label><input name="agent" defaultValue={currentUser.name} required /></div>
            <div><label>Topic / Purpose</label><input name="topic" required /></div>
            <div>
              <label>Status</label>
              <select name="status">
                <option>Scheduled</option><option>Completed</option><option>Cancelled</option>
              </select>
            </div>
            <button className="primary" type="submit" style={{marginTop: '10px'}}>SAVE MEETING</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function DashboardView({ data, setData, logAction }) {
  const exportData = () => {
    audio.playBeep('click');
    logAction("EXPORTED SECURE DATABASE BACKUP");
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "doea_secure_backup.json");
    dlAnchorElem.click();
  };

  const importData = (e) => {
    audio.playBeep('click');
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if(importedData.gois && importedData.incidents) {
          setData(importedData);
          logAction("RESTORED DATABASE FROM BACKUP");
          alert("ACCESS GRANTED: DATABASE RESTORED SUCCESSFULLY");
        } else {
          audio.playBeep('error');
          alert("ERROR: CORRUPTED DATABASE");
        }
      } catch (err) {
        audio.playBeep('error');
        alert("ERROR: INVALID ENCRYPTION FORMAT");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fade-in">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h2>SYSTEM OVERVIEW</h2>
        <div style={{display: 'flex', gap: '10px'}}>
          <button onClick={exportData} style={{backgroundColor: 'var(--bg-panel)', color: 'var(--accent-red)'}}>EXPORT BACKUP</button>
          <label style={{backgroundColor: 'var(--bg-panel)', color: 'var(--accent-red)', cursor: 'pointer', padding: '8px 16px', border: '1px solid var(--accent-red)', fontWeight: 'bold', display: 'flex', alignItems: 'center'}}>
            IMPORT BACKUP
            <input type="file" style={{display: 'none'}} accept=".json" onChange={importData} />
          </label>
        </div>
      </div>
      <div className="grid-layout">
        <div className="terminal-panel glow-panel">
          <div className="terminal-header">
            <h3>REGISTERED GOIs</h3>
            <Database size={20} color="var(--accent-red)" />
          </div>
          <div className="big-number">{(data.gois || []).length}</div>
        </div>
        <div className="terminal-panel glow-panel">
          <div className="terminal-header">
            <h3>ACTIVE INCIDENTS</h3>
            <ShieldAlert size={20} color="var(--accent-red)" />
          </div>
          <div className="big-number">{(data.incidents || []).length}</div>
        </div>
        <div className="terminal-panel glow-panel">
          <div className="terminal-header">
            <h3>TOTAL DEPLOYMENTS</h3>
            <Target size={20} color="var(--accent-red)" />
          </div>
          <div className="big-number">{(data.deployments || []).length}</div>
        </div>
      </div>
    </div>
  );
}

function Modal({ children, onClose, title }) {
  return (
    <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)'}}>
      <div className="glow-panel" style={{background: 'var(--bg-panel)', border: '1px solid var(--accent-red)', padding: '20px', width: '500px', maxWidth: '90%'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px'}}>
          <h3 style={{margin: 0, color: 'var(--text-highlight)', textShadow: '0 0 5px var(--accent-red)'}}>{title}</h3>
          <button onClick={() => { audio.playBeep('click'); onClose(); }} style={{background: 'none', border: 'none', color: 'var(--text-main)', padding: 0}}><X size={20}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function GoiView({ data, setData, logAction, currentUser }) {
  const [showModal, setShowModal] = useState(false);
  const [treatyGoi, setTreatyGoi] = useState(null);
  
  const handleAdd = (e) => {
    e.preventDefault();
    audio.playBeep('click');
    const fd = new FormData(e.target);
    const newGoi = {
      id: Date.now(),
      name: fd.get('name'),
      type: fd.get('type'),
      threat: fd.get('threat'),
      status: fd.get('status'),
      relation: fd.get('relation')
    };
    setData({...data, gois: [...(data.gois || []), newGoi]});
    logAction(`REGISTERED NEW GOI: ${newGoi.name}`);
    setShowModal(false);
  };

  return (
    <div className="fade-in">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h2>GROUP OF INTEREST DATABASE</h2>
        {currentUser.clearance >= 2 && <button className="primary" onClick={() => { audio.playBeep('click'); setShowModal(true); }}>+ NEW RECORD</button>}
      </div>
      
      <div className="terminal-panel glow-panel">
        <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
          <thead>
            <tr style={{borderBottom: '1px solid var(--border-color)'}}>
              <th style={{padding: '10px'}}>DESIGNATION</th>
              <th style={{padding: '10px'}}>TYPE</th>
              <th style={{padding: '10px'}}>THREAT LEVEL</th>
              <th style={{padding: '10px'}}>RELATION</th>
              <th style={{padding: '10px'}}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {(data.gois || []).map(goi => {
              const isHighThreat = goi.threat === 'High' || goi.threat === 'Critical';
              const reqClearance = isHighThreat ? 3 : 1;
              return (
              <tr key={goi.id} style={{borderBottom: '1px solid var(--border-color)'}} className="table-row">
                <td style={{padding: '10px', fontWeight: 'bold', color: 'var(--text-highlight)'}}>
                  <Redacted clearance={currentUser.clearance} required={reqClearance} text={goi.name} />
                </td>
                <td style={{padding: '10px'}}>{goi.type}</td>
                <td style={{padding: '10px'}}>
                  <span className={`status-badge status-${isHighThreat ? 'hostile' : 'neutral'}`}>{goi.threat}</span>
                </td>
                <td style={{padding: '10px'}}>
                  <span className={`status-badge status-${goi.relation === 'At War' || goi.relation === 'Hostile' ? 'hostile' : (goi.relation === 'Allied' ? 'allied' : 'unknown')}`}>{goi.relation}</span>
                </td>
                <td style={{padding: '10px'}}>
                  <div style={{display: 'flex', gap: '5px'}}>
                    <button onClick={() => { audio.playBeep('click'); setTreatyGoi(goi); }} style={{padding: '4px 8px', fontSize: '0.8rem'}} className="primary">PROPOSE TREATY</button>
                    {currentUser.clearance >= 4 && <button onClick={() => { audio.playBeep('click'); setData({...data, gois: data.gois.filter(g => g.id !== goi.id)}); logAction(`DELETED GOI RECORD: ${goi.name}`); }} style={{padding: '4px 8px', fontSize: '0.8rem'}}>DELETE</button>}
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {treatyGoi && (
        <Modal title={`DRAFT TREATY: ${treatyGoi.name}`} onClose={() => setTreatyGoi(null)}>
          <form onSubmit={(e) => {
            e.preventDefault();
            audio.playBeep('click');
            const fd = new FormData(e.target);
            const newDM = {
              dmId: Date.now().toString(),
              action: 'CONTRACT',
              goiId: treatyGoi.id.toString(),
              goiName: treatyGoi.name,
              terms: fd.get('terms'),
              discordId: fd.get('discordId')
            };
            setData(prev => prev, { pendingDMs: [newDM] });
            logAction(`DRAFTED TREATY PROPOSAL FOR ${treatyGoi.name}`);
            setTreatyGoi(null);
          }} style={{display: 'flex', flexDirection: 'column', gap: '15px'}} onChange={() => audio.playBeep('type')}>
            <p style={{color: 'var(--text-muted)'}}>This proposal will be sent to secure diplomatic channels for signature.</p>
            <div>
              <label>Representative Discord ID (Optional)</label>
              <input name="discordId" placeholder="e.g. 1234567890" style={{width: '100%'}} />
            </div>
            <div>
              <label>Treaty Terms & Conditions</label>
              <textarea name="terms" required rows="6" style={{width: '100%', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '10px', fontFamily: 'inherit', outline: 'none', resize: 'vertical'}} placeholder="State the conditions, non-aggression pact details, exchange rates, etc." />
            </div>
            <button type="submit" className="primary" style={{marginTop: '10px'}}>SEND TO DIPLOMATIC CHANNEL</button>
          </form>
        </Modal>
      )}

      {showModal && (
        <Modal title="REGISTER NEW GOI" onClose={() => setShowModal(false)}>
          <form onSubmit={handleAdd} style={{display: 'flex', flexDirection: 'column', gap: '15px'}} onChange={() => audio.playBeep('type')}>
            <div><label>Name</label><input name="name" required /></div>
            <div><label>Type</label><input name="type" required /></div>
            <div>
              <label>Threat Level</label>
              <select name="threat">
                <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
              </select>
            </div>
            <div>
              <label>Relation with Foundation</label>
              <select name="relation">
                <option>Allied</option><option>Neutral</option><option>Hostile</option><option>At War</option><option>Unknown</option>
              </select>
            </div>
            <div>
              <label>Status</label>
              <input name="status" defaultValue="Active" />
            </div>
            <button className="primary" type="submit" style={{marginTop: '10px'}}>SAVE RECORD</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function EvaluationsView({ data, setData, logAction, currentUser }) {
  const [activeTab, setActiveTab] = useState('low'); // 'low' or 'high'
  const personnel = data.personnel || [];

  const updateStat = (id, statName) => {
    if (currentUser.clearance < 3) {
      audio.playBeep('error');
      alert("INSUFFICIENT CLEARANCE TO MODIFY EVALUATIONS.");
      return;
    }
    const input = prompt(`Enter amount to add/subtract to ${statName.toUpperCase()} (e.g. 5 or -2):`, "1");
    if (input === null) return;
    const amount = parseFloat(input);
    if (isNaN(amount)) {
      audio.playBeep('error');
      alert("INVALID AMOUNT.");
      return;
    }
    
    audio.playBeep('click');
    const updated = personnel.map(p => {
      if (p.id === id) {
        return { ...p, [statName]: (p[statName] || 0) + amount };
      }
      return p;
    });
    setData({ ...data, personnel: updated });
    logAction(`MODIFIED ${statName.toUpperCase()} FOR AGENT ID ${id} BY ${amount}`);
  };

  const updateTimezone = (id) => {
    if (currentUser.clearance < 3) {
      audio.playBeep('error');
      alert("INSUFFICIENT CLEARANCE.");
      return;
    }
    const input = prompt("Enter Timezone (e.g. EST, UTC+1, GMT):", "UTC");
    if (input === null) return;
    
    audio.playBeep('click');
    const updated = personnel.map(p => p.id === id ? { ...p, timezone: input } : p);
    setData({ ...data, personnel: updated });
    logAction(`MODIFIED TIMEZONE FOR AGENT ID ${id}`);
  };

  const lowRanks = personnel.filter(p => p.clearance <= 2);
  const highRanks = personnel.filter(p => p.clearance >= 3);

  const renderTable = (list, title) => (
    <div className="terminal-panel glow-panel" style={{marginTop: '20px', overflowX: 'auto'}}>
      <h3 style={{color: 'var(--accent-red)', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px'}}>{title}</h3>
      <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: '10px', minWidth: '800px'}}>
        <thead>
          <tr style={{borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)'}}>
            <th style={{padding: '10px'}}>NAME</th>
            <th style={{padding: '10px'}}>ROLE</th>
            <th style={{padding: '10px'}}>DEPT</th>
            <th style={{padding: '10px', textAlign: 'center'}}>POINTS</th>
            <th style={{padding: '10px', textAlign: 'center'}}>HONOR</th>
            <th style={{padding: '10px', textAlign: 'center'}}>TIMEZONE</th>
            <th style={{padding: '10px', textAlign: 'center'}}>STRIKES</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 && (
            <tr><td colSpan="7" style={{padding: '20px', textAlign: 'center', color: 'var(--text-muted)'}}>NO PERSONNEL FOUND IN THIS CATEGORY.</td></tr>
          )}
          {list.map(p => (
            <tr key={p.id} style={{borderBottom: '1px solid var(--border-color)'}} className="table-row">
              <td style={{padding: '10px', color: 'var(--text-highlight)', fontWeight: 'bold'}}>{p.name}</td>
              <td style={{padding: '10px', color: 'var(--text-main)'}}>{p.role}</td>
              <td style={{padding: '10px', color: 'var(--text-muted)'}}>{p.department}</td>
              <td style={{padding: '10px', textAlign: 'center'}}>
                <span style={{display: 'inline-block', width: '30px'}}>{p.points || 0}</span>
                {currentUser.clearance >= 3 && <button onClick={() => updateStat(p.id, 'points')} style={{marginLeft: '5px', padding: '2px 5px', fontSize: '0.7rem'}}>+/-</button>}
              </td>
              <td style={{padding: '10px', textAlign: 'center'}}>
                <span style={{display: 'inline-block', width: '30px'}}>{p.honor || 0}</span>
                {currentUser.clearance >= 3 && <button onClick={() => updateStat(p.id, 'honor')} style={{marginLeft: '5px', padding: '2px 5px', fontSize: '0.7rem'}}>+/-</button>}
              </td>
              <td style={{padding: '10px', textAlign: 'center'}}>
                <span style={{display: 'inline-block', width: '80px'}}>{p.timezone || 'Unknown'}</span>
                {currentUser.clearance >= 3 && <button onClick={() => updateTimezone(p.id)} style={{marginLeft: '5px', padding: '2px 5px', fontSize: '0.7rem'}}>[EDIT]</button>}
              </td>
              <td style={{padding: '10px', textAlign: 'center', color: (p.strikes || 0) > 0 ? 'var(--accent-red)' : 'inherit'}}>
                <span style={{display: 'inline-block', width: '30px', fontWeight: (p.strikes || 0) > 0 ? 'bold' : 'normal'}}>{p.strikes || 0}</span>
                {currentUser.clearance >= 3 && <button onClick={() => updateStat(p.id, 'strikes')} style={{marginLeft: '5px', padding: '2px 5px', fontSize: '0.7rem'}}>+/-</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="fade-in" style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h2>EVALUATIONS & ROSTER</h2>
        <div style={{display: 'flex', gap: '10px'}}>
          <button className={activeTab === 'low' ? 'primary' : ''} onClick={() => { audio.playBeep('click'); setActiveTab('low'); }}>LOW RANKS</button>
          <button className={activeTab === 'high' ? 'primary' : ''} onClick={() => { audio.playBeep('click'); setActiveTab('high'); }}>MEDIUM/HIGH COMMAND</button>
        </div>
      </div>
      
      {activeTab === 'low' ? renderTable(lowRanks, 'LOW RANKS (CLEARANCE 1-2)') : renderTable(highRanks, 'MEDIUM & HIGH COMMAND (CLEARANCE 3-5)')}
    </div>
  );
}

function IncidentsView({ data, setData, logAction, currentUser, setPrint }) {
  const [showModal, setShowModal] = useState(false);

  const handleAdd = (e) => {
    e.preventDefault();
    audio.playBeep('click');
    const fd = new FormData(e.target);
    const newInc = {
      id: Date.now(),
      date: fd.get('date'),
      goiId: parseInt(fd.get('goiId')),
      location: fd.get('location'),
      severity: fd.get('severity'),
      description: fd.get('description')
    };
    setData({...data, incidents: [newInc, ...(data.incidents || [])]});
    logAction(`FILED NEW INCIDENT REPORT FOR SECTOR ${newInc.location}`);
    setShowModal(false);
  };

  const generateReport = (inc, goi) => {
    audio.playBeep('click');
    setPrint({
      title: `OFFICIAL INCIDENT REPORT #${inc.id}`,
      content: `SUBJECT: Incident involving Group of Interest "${goi ? goi.name : 'UNKNOWN'}"
DATE OF OCCURRENCE: ${inc.date}
LOCATION: ${inc.location}
SEVERITY: ${inc.severity}

DESCRIPTION OF EVENTS:
${inc.description}

--------------------------------------------------
AUTHORIZED BY: ${currentUser.name} (Clearance Level ${currentUser.clearance})
DoEA RECORDING SYSTEM - SECURE, CONTAIN, PROTECT.`
    });
    logAction(`PRINTED OFFICIAL DOCUMENT: INCIDENT #${inc.id}`);
  };

  return (
    <div className="fade-in">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h2>INCIDENT REPORTS</h2>
        {currentUser.clearance >= 2 && <button className="primary" onClick={() => { audio.playBeep('click'); setShowModal(true); }}>+ FILE REPORT</button>}
      </div>
      
      <div className="terminal-panel glow-panel">
        {(data.incidents || []).map(inc => {
          const goi = (data.gois || []).find(g => g.id === inc.goiId);
          const reqClearance = inc.severity === 'Critical' ? 4 : 2;
          return (
            <div key={inc.id} style={{marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '10px'}}>
                <span>DATE: {inc.date}</span>
                <span>LOC: <Redacted clearance={currentUser.clearance} required={reqClearance} text={inc.location} /></span>
                <div style={{display: 'flex', gap: '10px'}}>
                  <span className={`status-badge status-${inc.severity === 'Critical' ? 'hostile' : 'neutral'}`}>{inc.severity}</span>
                  <button onClick={() => generateReport(inc, goi)} style={{padding: '2px 6px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '5px'}}><Printer size={12}/> PRINT</button>
                </div>
              </div>
              <h3 style={{color: 'var(--accent-red)'}}>INVOLVING: <Redacted clearance={currentUser.clearance} required={reqClearance} text={goi ? goi.name : 'UNKNOWN'} /></h3>
              <p style={{color: 'var(--text-highlight)'}}><Redacted clearance={currentUser.clearance} required={reqClearance} text={inc.description} /></p>
            </div>
          );
        })}
      </div>

      {showModal && (
        <Modal title="FILE INCIDENT REPORT" onClose={() => setShowModal(false)}>
          <form onSubmit={handleAdd} style={{display: 'flex', flexDirection: 'column', gap: '15px'}} onChange={() => audio.playBeep('type')}>
            <div><label>Date</label><input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]}/></div>
            <div>
              <label>Involved GOI</label>
              <select name="goiId">
                {(data.gois || []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div><label>Location</label><input name="location" placeholder="e.g. Heavy Containment, Surface..." required /></div>
            <div>
              <label>Severity</label>
              <select name="severity">
                <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
              </select>
            </div>
            <div><label>Description</label><textarea name="description" rows="4" required></textarea></div>
            <button className="primary" type="submit" style={{marginTop: '10px'}}>SUBMIT REPORT</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function CommsView({ data, setData, logAction, currentUser, setPrint }) {
  const [showModal, setShowModal] = useState(false);

  const handleAdd = (e) => {
    e.preventDefault();
    audio.playBeep('click');
    const fd = new FormData(e.target);
    const newComm = {
      id: Date.now(),
      date: fd.get('date'),
      goiId: parseInt(fd.get('goiId')),
      agent: fd.get('agent'),
      transcript: fd.get('transcript')
    };
    setData({...data, comms: [newComm, ...(data.comms || [])]});
    logAction(`LOGGED NEW DIPLOMATIC COMMUNIQUE`);
    setShowModal(false);
  };

  const generateReport = (comm, goi) => {
    audio.playBeep('click');
    setPrint({
      title: `COMMS INTERCEPT / DIPLOMATIC LOG`,
      content: `INTERLOCUTOR: ${goi ? goi.name : 'UNKNOWN'}
FOUNDATION AGENT: ${comm.agent}
DATE: ${comm.date}

--- TRANSCRIPT BEGINS ---

${comm.transcript}

--- TRANSCRIPT ENDS ---
AUTHORIZED BY: ${currentUser.name}`
    });
    logAction(`PRINTED DIPLOMATIC LOG`);
  };

  return (
    <div className="fade-in">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h2>DIPLOMATIC COMMUNICATIONS LOG</h2>
        {currentUser.clearance >= 2 && <button className="primary" onClick={() => { audio.playBeep('click'); setShowModal(true); }}>+ NEW TRANSCRIPT</button>}
      </div>
      
      <div className="terminal-panel glow-panel">
        {(data.comms || []).map(comm => {
          const goi = (data.gois || []).find(g => g.id === comm.goiId);
          return (
            <div key={comm.id} style={{marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '10px'}}>
                <span>DATE: {comm.date}</span>
                <span>AGENT INVOLVED: {comm.agent}</span>
                <button onClick={() => generateReport(comm, goi)} style={{padding: '2px 6px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '5px'}}><Printer size={12}/> PRINT</button>
              </div>
              <h3 style={{color: 'var(--info)'}}>GOI: {goi ? goi.name : 'UNKNOWN'}</h3>
              <div style={{background: 'var(--bg-dark)', padding: '15px', borderLeft: '3px solid var(--info)', marginTop: '10px'}}>
                <Redacted clearance={currentUser.clearance} required={3} text={comm.transcript} />
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <Modal title="ADD COMMUNICATION TRANSCRIPT" onClose={() => setShowModal(false)}>
          <form onSubmit={handleAdd} style={{display: 'flex', flexDirection: 'column', gap: '15px'}} onChange={() => audio.playBeep('type')}>
            <div><label>Date</label><input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]}/></div>
            <div>
              <label>Interlocutor GOI</label>
              <select name="goiId">
                {(data.gois || []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div><label>Agent Involved</label><input name="agent" defaultValue={currentUser.name} required /></div>
            <div><label>Transcript / Notes</label><textarea name="transcript" rows="6" required></textarea></div>
            <button className="primary" type="submit" style={{marginTop: '10px'}}>SAVE TRANSCRIPT</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function SchemaView({ data, currentUser }) {
  const radius = 200;
  const centerX = 350;
  const centerY = 300;
  const nodes = data.gois || [];
  
  const getNodeColor = (relation) => {
    if(relation === 'Hostile' || relation === 'At War') return '#0277bd'; // Blue variant
    if(relation === 'Allied') return '#2e7d32'; // Green
    if(relation === 'Neutral') return '#f57f17'; // Yellow
    return '#888888'; // Grey
  };

  return (
    <div className="fade-in">
      <h2>INTER-FACTION RELATIONSHIP SCHEMA</h2>
      <p style={{color: 'var(--text-muted)', marginBottom: '30px'}}>Graphical representation of Foundation relations with registered Groups of Interest.</p>
      
      <div className="terminal-panel glow-panel" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 0'}}>
        <svg width="700" height="600" style={{background: 'transparent'}}>
          <circle cx={centerX} cy={centerY} r="60" fill="var(--bg-panel)" stroke="var(--accent-red)" strokeWidth="3" className="pulse-circle" />
          <image href={SCP_LOGO_URL} x={centerX - 40} y={centerY - 40} height="80" width="80" className="svg-logo-filter" />
          <text x={centerX} y={centerY + 75} fill="var(--text-highlight)" fontSize="14" fontWeight="bold" textAnchor="middle" style={{textShadow: '0 0 5px var(--accent-red)'}}>SCP FOUNDATION</text>
          
          {nodes.map((goi, index) => {
            const isHighThreat = goi.threat === 'High' || goi.threat === 'Critical';
            
            const nameToDisplay = goi.name; // Redacted disabled locally

            const angle = (index / nodes.length) * 2 * Math.PI - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            const color = getNodeColor(goi.relation);
            
            return (
              <g key={goi.id} style={{transition: 'all 0.5s'}}>
                <line x1={x} y1={y} x2={centerX} y2={centerY} stroke={color} strokeWidth="2" strokeDasharray={goi.relation === 'Unknown' ? '5,5' : '0'} opacity="0.6" />
                <circle cx={x} cy={y} r="50" fill={color} opacity="0.15" />
                <circle cx={x} cy={y} r="50" fill="transparent" stroke={color} strokeWidth="2" />
                <text x={x} y={y - 10} fill="var(--text-highlight)" fontSize="12" fontWeight="bold" textAnchor="middle" style={{textShadow: `0 0 5px ${color}`}}>{nameToDisplay.substring(0, 15)}{nameToDisplay.length > 15 ? '...' : ''}</text>
                <text x={x} y={y + 10} fill={color} fontSize="10" textAnchor="middle" textTransform="uppercase" fontWeight="bold">{goi.relation}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default App;
