'use client';

import { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import styles from './admin.module.css';

export default function AdminPage() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [adminView, setAdminView] = useState('orders'); // 'orders' or 'analytics'
  
  // Auth states
  const [authMode, setAuthMode] = useState('login');
  const [adminUser, setAdminUser] = useState(null);
  const [authForm, setAuthForm] = useState({ username: '', password: '', businessName: '', phone: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [voiceFeedback, setVoiceFeedback] = useState('');
  const recognitionRef = useRef(null);
  const processingRef = useRef(false);
  const ordersRef = useRef([]);
  const lastOrderId = useRef(-1);
  const pendingVoiceOrderRef = useRef(null);

  // Check for saved session on mount
  useEffect(() => {
    const saved = localStorage.getItem('momo_admin_session');
    if (saved) {
      try {
        setAdminUser(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const handleAuth = async () => {
    setAuthError('');
    setAuthLoading(true);

    if (!authForm.username || !authForm.password) {
      setAuthError('Please fill all required fields.');
      setAuthLoading(false);
      return;
    }

    if (authMode === 'register' && (!authForm.businessName || !authForm.phone)) {
      setAuthError('Business name and phone number are required.');
      setAuthLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: authMode,
          username: authForm.username,
          password: authForm.password,
          businessName: authForm.businessName,
          phone: authForm.phone
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setAuthError(data.error || 'Something went wrong.');
        setAuthLoading(false);
        return;
      }

      setAdminUser(data.admin);
      localStorage.setItem('momo_admin_session', JSON.stringify(data.admin));
    } catch (e) {
      setAuthError('Network error. Please try again.');
    }
    setAuthLoading(false);
  };

  const handleLogout = () => {
    setAdminUser(null);
    localStorage.removeItem('momo_admin_session');
    setAuthForm({ username: '', password: '', businessName: '', phone: '' });
  };

  const loadOrders = async () => {
    if (!adminUser) return;
    try {
      const response = await fetch(`/api/orders?admin_id=${adminUser.id}`);
      const savedOrders = await response.json();
      if (Array.isArray(savedOrders)) {
        if (savedOrders.length > 0) {
          const newestOrderId = Number(savedOrders[0].id);
          // Check for new orders to trigger Voice Copilot
          if (lastOrderId.current !== -1 && newestOrderId > lastOrderId.current && voiceEnabled) {
             if ('speechSynthesis' in window) {
               window.speechSynthesis.cancel(); // Clear browser voice queue bug
               const plates = savedOrders[0].plates;
               const name = savedOrders[0].name;
               const msg = new SpeechSynthesisUtterance(`New order alert! ${plates} plates of momo requested by ${name}.`);
               window.speechSynthesis.speak(msg);
             }
          }
          lastOrderId.current = Math.max(lastOrderId.current, newestOrderId);
        }
        setOrders(savedOrders);
      }
    } catch (e) {
      console.error("Failed to load orders");
    }
  };

  useEffect(() => {
    if (adminUser) {
      loadOrders();
      const interval = setInterval(loadOrders, 3000);
      return () => clearInterval(interval);
    }
  }, [adminUser, voiceEnabled]);

  useEffect(() => { ordersRef.current = orders; }, [orders]);

  // Use a ref to always have the latest processVoiceCommand without stale closures
  const processVoiceCommandRef = useRef(null);

  // This function is recreated each render with fresh closures over state setters
  processVoiceCommandRef.current = async (command) => {
    if (processingRef.current) return;
    
    const transcript = command.toLowerCase().trim();
    setLastTranscript(transcript);
    
    // Map spoken number words to digits
    const numberMap = { 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10 };
    let normalized = transcript;
    Object.keys(numberMap).forEach(word => {
      normalized = normalized.replace(new RegExp(`\\b${word}\\b`, 'g'), numberMap[word]);
    });
    
    // Match "order 1", "number 1", or just a plain number at the start
    let shortcutNum = null;
    const orderMatch = normalized.match(/(?:order|number|item)\s+([0-9]+)/) || normalized.match(/^([0-9]+)\s+/);
    if (orderMatch) {
      shortcutNum = parseInt(orderMatch[1], 10);
      pendingVoiceOrderRef.current = shortcutNum;
    } else if (pendingVoiceOrderRef.current) {
      shortcutNum = pendingVoiceOrderRef.current;
    }
    
    // Determine status
    let newStatus = null;
    if (normalized.match(/\bread|\bserv/)) newStatus = 'Ready';
    else if (normalized.match(/\bprepar|\bprogress|\bmaking|\bkitchen|\bcook/)) newStatus = 'In Progress';
    else if (normalized.match(/\btransit|\bdeliver|\bway|\bsent|\brider|\bship/)) newStatus = 'In Delivery';
    else if (normalized.match(/\bcomplet|\breceiv|\bdone|\bfinish|\bsuccess/)) newStatus = 'Received';
    
    if (!shortcutNum) {
      if (newStatus) {
        setVoiceFeedback('❌ Say: "Order 1 Ready" or "Number 2 Done"');
      }
      return;
    }
    
    const targetOrder = ordersRef.current[shortcutNum - 1];
    if (!targetOrder) {
      setVoiceFeedback(`❌ #${shortcutNum} not found. ${ordersRef.current.length} orders visible.`);
      return;
    }
    
    if (newStatus) {
      processingRef.current = true;
      setVoiceFeedback(`⏳ #${shortcutNum} ${targetOrder.name} → ${newStatus}...`);
      
      try {
        const resp = await fetch('/api/orders', {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'x-dashboard-secret': 'secure-momo-dashboard'
          },
          body: JSON.stringify({ id: targetOrder.id, status: newStatus })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Update failed');
        
        setVoiceFeedback(`✅ #${shortcutNum} ${targetOrder.name} → ${newStatus}`);
        loadOrders();
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(new SpeechSynthesisUtterance(`${targetOrder.name}, marked as ${newStatus}`));
        }
      } catch (e) {
        setVoiceFeedback(`❌ Error: ${e.message}`);
      }
      
      setTimeout(() => { processingRef.current = false; }, 2000);
      pendingVoiceOrderRef.current = null;
    } else {
      setVoiceFeedback(`🎯 #${shortcutNum} ${targetOrder.name}. Say: Ready, Preparing, Transit, or Done.`);
    }
  };

  // SpeechRecognition setup — runs once on mount only
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart if voice is still enabled
      setTimeout(() => {
        if (recognitionRef.current) {
          try { recognitionRef.current.start(); } catch(e){}
        }
      }, 300);
    };

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += t;
        } else {
          interimText += t;
        }
      }
      // Always show what's being heard
      setLastTranscript((finalText || interimText).toLowerCase());
      
      // Only process final results
      if (finalText) {
        // Use ref to call the LATEST version of the function
        processVoiceCommandRef.current?.(finalText.toLowerCase());
      }
    };

    recognitionRef.current = recognition;

    // Console testing helper
    window.simulateVoice = (cmd) => processVoiceCommandRef.current?.(cmd);

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []); // Mount once only

  // Start/stop recognition when voiceEnabled changes
  useEffect(() => {
    if (!recognitionRef.current) return;
    if (voiceEnabled) {
      try { recognitionRef.current.start(); } catch(e){}
    } else {
      try { recognitionRef.current.stop(); } catch(e){}
    }
  }, [voiceEnabled]);

  useEffect(() => {
    if (voiceFeedback) {
      const timer = setTimeout(() => setVoiceFeedback(''), 6000);
      return () => clearTimeout(timer);
    }
  }, [voiceFeedback]);

  const updateStatus = async (orderId, newStatus, isVoice = false) => {
    if (isVoice) setVoiceFeedback(`⏳ Sending update for Order ${orderId}...`);
    try {
      const response = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-dashboard-secret': 'secure-momo-dashboard'
        },
        body: JSON.stringify({ id: orderId, status: newStatus })
      });
      
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Update failed');
      
      loadOrders();

      if (isVoice) {
        setVoiceFeedback(`✅ Order ${orderId} is now ${newStatus}`);
        if ('speechSynthesis' in window) {
           window.speechSynthesis.cancel();
           const msg = new SpeechSynthesisUtterance(`Order ${orderId} moved to ${newStatus}`);
           window.speechSynthesis.speak(msg);
        }
      }
    } catch (e) {
      console.error("Update error:", e);
      if (isVoice) {
        setVoiceFeedback(`❌ API Error: ${e.message}`);
        if ('speechSynthesis' in window) {
           window.speechSynthesis.cancel();
           const msg = new SpeechSynthesisUtterance(`Failed to update. ${e.message}`);
           window.speechSynthesis.speak(msg);
        }
      } else {
        alert(`Error: ${e.message}`);
      }
    }
  };

  const deleteOrder = async (orderId) => {
    if (confirm('Are you sure you want to delete this order?')) {
      try {
        await fetch(`/api/orders?id=${orderId}`, { 
          method: 'DELETE',
          headers: {
            'x-dashboard-secret': 'secure-momo-dashboard'
          }
        });
        loadOrders();
      } catch (e) {
        alert("Error deleting order");
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.name?.toLowerCase().includes(search.toLowerCase()) || 
      order.phone?.includes(search);
    
    if (activeTab === 'All') return matchesSearch;
    if (activeTab === 'New') return matchesSearch && order.status === 'Placed';
    if (activeTab === 'Active') return matchesSearch && (order.status === 'In Progress' || order.status === 'Preparing');
    if (activeTab === 'Ready') return matchesSearch && order.status === 'Ready';
    if (activeTab === 'Completed') return matchesSearch && (order.status === 'In Delivery' || order.status === 'Received');
    return matchesSearch;
  });

  const stats = {
    total: orders.length,
    revenue: orders.reduce((acc, o) => acc + (o.plates * 200), 0),
    active: orders.filter(o => o.status !== 'Received').length,
    ready: orders.filter(o => o.status === 'Ready').length,
    completed: orders.filter(o => o.status === 'Received').length
  };

  // BI Calculations
  const pieData = [
    { name: 'Completed', value: stats.completed },
    { name: 'Ready', value: stats.ready },
    { name: 'Preparing', value: orders.filter(o => o.status === 'In Progress').length },
    { name: 'Placed (New)', value: orders.filter(o => o.status === 'Placed').length }
  ].filter(d => d.value > 0);

  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  const hourCounts = {};
  orders.forEach(o => {
     if(o.date) {
        try {
           const d = new Date(o.date);
           const hr = d.getHours();
           const hrStr = hr === 0 ? '12 AM' : hr < 12 ? `${hr} AM` : hr === 12 ? '12 PM' : `${hr-12} PM`;
           hourCounts[hrStr] = (hourCounts[hrStr] || 0) + 1;
        }catch(e){}
     }
  });
  const barData = Object.keys(hourCounts).map(hr => ({
     time: hr,
     orders: hourCounts[hr]
  }));

  // --- AUTH SCREEN ---
  if (!adminUser) {
    return (
      <div className={styles.vaultOverlay}>
        <div className={styles.vaultCard}>
          <span className={styles.vaultIcon}>{authMode === 'login' ? '🔐' : '🚀'}</span>
          <h2>{authMode === 'login' ? 'Admin Login' : 'Register Business'}</h2>
          <p>{authMode === 'login' ? 'Sign in to manage your orders.' : 'Create your admin account to get started.'}</p>

          {authError && <div className={styles.authError}>{authError}</div>}

          {authMode === 'register' && (
            <>
              <input 
                type="text" 
                className={styles.vaultInput}
                style={{ letterSpacing: 'normal', fontSize: '1rem', marginBottom: '1rem' }}
                value={authForm.businessName}
                onChange={(e) => setAuthForm({ ...authForm, businessName: e.target.value })}
                placeholder="Business Name *"
              />
              <input 
                type="tel" 
                className={styles.vaultInput}
                style={{ letterSpacing: 'normal', fontSize: '1rem', marginBottom: '1rem' }}
                value={authForm.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^\d+]/g, '').slice(0, 14);
                  setAuthForm({ ...authForm, phone: val });
                }}
                placeholder="Business Phone (e.g. +9779800000000) *"
              />
            </>
          )}

          <input 
            type="text" 
            className={styles.vaultInput}
            style={{ letterSpacing: 'normal', fontSize: '1rem', marginBottom: '1rem' }}
            value={authForm.username}
            onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
            placeholder="Username *"
          />

          <input 
            type="password" 
            className={styles.vaultInput}
            style={{ letterSpacing: '0.3rem', fontSize: '1rem' }}
            value={authForm.password}
            onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAuth(); }}
            placeholder="Password *"
          />

          <button 
            className={styles.vaultBtn}
            onClick={handleAuth}
            disabled={authLoading}
          >
            {authLoading ? 'Please wait...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
          </button>

          <p className={styles.authToggle}>
            {authMode === 'login' ? (
              <>Don&apos;t have an account? <button onClick={() => { setAuthMode('register'); setAuthError(''); }}>Register</button></>
            ) : (
              <>Already registered? <button onClick={() => { setAuthMode('login'); setAuthError(''); }}>Sign In</button></>
            )}
          </p>
        </div>
      </div>
    );
  }

  // --- DASHBOARD (with approval gate) ---
  const isApproved = adminUser.approved === true;

  return (
    <div className={styles.adminContainer}>
      {/* APPROVAL LOCK OVERLAY */}
      {!isApproved && (
        <div className={styles.approvalOverlay}>
          <div className={styles.approvalCard}>
            <span className={styles.vaultIcon}>⏳</span>
            <h2>Account Under Review</h2>
            <p>Your dashboard is pending activation. Once payment is confirmed and your account is approved by the platform admin, you will have full access.</p>
            <div className={styles.approvalDetails}>
              <div className={styles.approvalRow}>
                <span>Business</span>
                <strong>{adminUser.businessName}</strong>
              </div>
              <div className={styles.approvalRow}>
                <span>Username</span>
                <strong>{adminUser.username}</strong>
              </div>
              <div className={styles.approvalRow}>
                <span>Status</span>
                <strong className={styles.pendingBadge}>Pending Approval</strong>
              </div>
            </div>
            <a href="tel:+9779860196101" className={styles.approvalCallBtn}>📞 Contact Admin for Activation</a>
            <button onClick={handleLogout} className={styles.approvalLogout}>Logout</button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span>🥟</span> {adminUser.businessName || 'One Tap Admin'}
        </div>
        <nav className={styles.nav}>
          <div className={`${styles.navItem} ${adminView === 'orders' ? styles.navItemActive : ''}`} onClick={() => setAdminView('orders')}>
            <span>📋</span> Live Orders
          </div>
          <div className={`${styles.navItem} ${adminView === 'analytics' ? styles.navItemActive : ''}`} onClick={() => setAdminView('analytics')}>
            <span>📊</span> Analytics
          </div>
          <div className={styles.navItem} onClick={() => window.open(`/order/${adminUser.username}`, '_blank')}>
            <span>🌐</span> View Site
          </div>
          <div className={styles.navItem} onClick={() => loadOrders()}>
            <span>🔄</span> Refresh Data
          </div>
          <div className={styles.navItem} onClick={handleLogout} style={{ marginTop: 'auto' }}>
            <span>🚪</span> Logout
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className={`${styles.mainContent} ${!isApproved ? styles.blurredContent : ''}`}>
        <header className={styles.adminHeader}>
          <div className={styles.adminHeaderLeft}>
            <h1 className={styles.adminTitle}>{adminUser.businessName || 'Orders Management'}</h1>
            <p style={{ color: '#64748b', fontWeight: 500 }}>Welcome back, <strong>{adminUser.username}</strong>. Monitor and manage real-time orders.</p>
            <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', background: '#f8fafc', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Your Ordering Link:</span>
              <strong style={{ fontSize: '0.9rem', color: '#0f172a', wordBreak: 'break-all' }}>
                /order/{adminUser.username}
              </strong>
              <button 
                onClick={() => copyToClipboard(typeof window !== 'undefined' ? `${window.location.origin}/order/${adminUser.username}` : `/order/${adminUser.username}`)}
                style={{ background: '#e2e8f0', border: 'none', padding: '0.3rem 0.8rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
              >
                Copy Link
              </button>
            </div>
          </div>
          
          <div style={{ background: voiceEnabled ? '#fef2f2' : '#f8fafc', padding: '1rem', borderRadius: '16px', border: `2px solid ${voiceEnabled ? '#fecaca' : '#e2e8f0'}`, textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, marginBottom: '0.5rem' }}>AI Kitchen Copilot</div>
            <button 
              onClick={() => {
                if (!voiceEnabled && 'speechSynthesis' in window) {
                   const msg = new SpeechSynthesisUtterance("Voice copilot activated. Tap on an order then say the status.");
                   window.speechSynthesis.speak(msg);
                }
                setVoiceEnabled(!voiceEnabled);
              }}
              style={{
                background: voiceEnabled ? '#ef4444' : '#94a3b8',
                color: 'white',
                border: 'none',
                padding: '0.6rem 1.2rem',
                borderRadius: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>{voiceEnabled ? '🔊' : '🔇'}</span> {voiceEnabled ? 'Voice On' : 'Voice Off'}
            </button>
            {voiceEnabled && (
              <div style={{ marginTop: '0.6rem', padding: '0.6rem', background: '#f1f5f9', borderRadius: '10px', fontSize: '0.85rem' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.4rem' }}>Say: <strong>"Order 1 Ready"</strong> or <strong>"Number 2 Done"</strong></div>
                <div style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.2rem', fontWeight: 800 }}>{isListening ? '🎙️ Listening...' : '🔇 Mic paused'}</div>
                <div style={{ color: lastTranscript ? '#0f172a' : '#94a3b8', minHeight: '1.2rem', fontWeight: 600 }}>
                   {lastTranscript || 'Waiting for speech...'}
                </div>
                {voiceFeedback && (
                  <div style={{ marginTop: '0.5rem', color: voiceFeedback.includes('✅') ? '#10b981' : voiceFeedback.includes('⏳') ? '#f59e0b' : '#ef4444', borderTop: '1px dashed #cbd5e1', paddingTop: '0.4rem', fontWeight: 700 }}>
                    {voiceFeedback}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        <div className={styles.statsGrid} style={{ marginBottom: '4rem' }}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.total}</span>
            <span className={styles.statLabel}>Total Orders</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>Rs. {stats.revenue}</span>
            <span className={styles.statLabel}>Est. Revenue</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.active}</span>
            <span className={styles.statLabel}>Active Requests</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.ready}</span>
            <span className={styles.statLabel}>Ready to Serve</span>
          </div>
        </div>

        {adminView === 'analytics' ? (
          <div style={{ padding: '2rem', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
             <h2 style={{ marginBottom: '2rem', color: '#0f172a' }}>Business Intelligence Dashboard</h2>
             
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem' }}>
                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '1.1rem', color: '#475569', marginBottom: '1.5rem' }}>Order Status Distribution</h3>
                  <div style={{ width: '100%', height: '300px' }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={pieData} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

             </div>
          </div>
        ) : (
          <>
            <div className={styles.controlsRow}>
              <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}>🔍</span>
            <input 
              type="text" 
              placeholder="Search by name or phone..." 
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className={styles.filterTabs}>
            {['All', 'New', 'Active', 'Ready', 'Completed'].map(tab => (
              <button 
                key={tab}
                className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.orderGrid}>
          {filteredOrders.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>🥡</span>
              <h3 style={{ fontSize: '1.5rem', color: '#0f172a' }}>No matching orders</h3>
              <p style={{ color: '#64748b' }}>Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            filteredOrders.map((order, idx) => (
              <div key={order.id} className={`${styles.orderCard} ${styles['priority' + order.status.replace(' ', '')] || ''}`}>
                <div className={styles.orderHeader}>
                  <div className={styles.customerInfo}>
                    <h3>{order.name}</h3>
                    <span className={styles.orderId}>
                      {voiceEnabled && <span style={{ background: '#6366f1', color: 'white', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, marginRight: '0.4rem' }}>🎙️ #{idx + 1}</span>}
                      ID: #{order.id}
                    </span>
                  </div>
                  <div className={`${styles.statusBadge} ${styles['status-' + (order.status || 'Placed').replace(' ', '-')]}`}>
                    {order.status || 'Placed'}
                  </div>
                </div>

                <div className={styles.contentSection}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Momo Details</span>
                    <span className={styles.detailValue} style={{ color: '#ef4444', fontWeight: 800 }}>
                      {order.plates} Plates ({order.plates * 10} Pieces)
                      <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>Rs. {order.plates * 200}</span>
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Contact</span>
                    <span className={styles.detailValue}>
                      {order.phone}
                      <button className={styles.copyBtn} onClick={() => copyToClipboard(order.phone)}>Copy</button>
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Delivery Address</span>
                    <span className={styles.detailValue} style={{ fontSize: '0.9rem', lineHeight: 1.4 }}>
                      {order.location}
                      <button className={styles.copyBtn} onClick={() => copyToClipboard(order.location)}>Copy</button>
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Order Time</span>
                    <span className={styles.detailValue} style={{ fontSize: '0.85rem' }}>{order.date}</span>
                  </div>
                </div>

                <div className={styles.actionGrid}>
                  <button onClick={() => updateStatus(order.id, 'In Progress')} className={`${styles.actionBtn} ${styles.actionBtnGhost}`} disabled={order.status === 'In Progress' || order.status === 'Received'}>Preparing</button>
                  <button onClick={() => updateStatus(order.id, 'Ready')} className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} disabled={order.status === 'Ready' || order.status === 'Received'}>Mark Ready 🥟</button>
                  <button onClick={() => updateStatus(order.id, 'In Delivery')} className={`${styles.actionBtn} ${styles.actionBtnGhost}`} disabled={order.status === 'In Delivery' || order.status === 'Received'}>Transit 🛵</button>
                  <button onClick={() => updateStatus(order.id, 'Received')} className={`${styles.actionBtn} ${styles.actionBtnGhost}`} style={{ color: '#059669' }} disabled={order.status === 'Received'}>Completed ✅</button>
                  <button onClick={() => deleteOrder(order.id)} className={`${styles.actionBtn} ${styles.deleteBtn}`}>Archieve Order</button>
                </div>
              </div>
            ))
          )}
        </div>
        </>
        )}
      </main>
    </div>
  );
}
