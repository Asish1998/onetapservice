'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import styles from '../../page.module.css';

export default function BusinessOrderPage() {
  const params = useParams();
  const slug = params.slug;

  const [formData, setFormData] = useState({ name: '', phone: '', location: '', plates: 1 });
  const [activeOrders, setActiveOrders] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasTapped, setHasTapped] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // MomoBot State
  const [isBotOpen, setIsBotOpen] = useState(false);
  const [botMessages, setBotMessages] = useState([
    { role: 'bot', text: 'Hi! I am your AI MomoBot 🤖. I can take your order directly! What is your full name?' }
  ]);
  const [botInput, setBotInput] = useState('');
  const [botStep, setBotStep] = useState('ask_name');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessName, setBusinessName] = useState('One Tap Momo');
  const [adminId, setAdminId] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const trackingRef = useRef(null);
  const successRef = useRef(null);

  // Fetch this business's config
  useEffect(() => {
    fetch(`/api/config?slug=${slug}`)
      .then(res => res.json())
      .then(data => {
        if (data.adminId) {
          setAdminId(data.adminId);
          setBusinessPhone(data.phone);
          setBusinessName(data.businessName);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true));
  }, [slug]);

  // Poll for status updates
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      if (!adminId) return;
      const myOrderIds = JSON.parse(localStorage.getItem('momo_my_order_ids') || '[]');
      if (myOrderIds.length === 0) return; // Halt polling unless customer has placed an order

      try {
        const response = await fetch(`/api/orders?admin_id=${adminId}&ids=${myOrderIds.join(',')}`);
        const orders = await response.json();
        if (Array.isArray(orders)) {
          const myActiveOrders = orders.filter(o => o.status !== 'Received');
          setActiveOrders(myActiveOrders);
        }
      } catch (e) {}
    }, 10000);
    return () => clearInterval(pollInterval);
  }, [adminId]);

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      setIsLoadingLocation(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setFormData(prev => ({ ...prev, location: `Pinned: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
            const data = await response.json();
            if (data.display_name) setFormData(prev => ({ ...prev, location: data.display_name }));
          } catch (e) {
          } finally {
            setIsLoadingLocation(false);
          }
        },
        () => { alert("Error getting location."); setIsLoadingLocation(false); }
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newOrder = { ...formData, status: 'Placed', date: new Date().toLocaleString(), id: Date.now(), admin_id: adminId };
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      });
      if (response.ok) {
        const myOrderIds = JSON.parse(localStorage.getItem('momo_my_order_ids') || '[]');
        localStorage.setItem('momo_my_order_ids', JSON.stringify([newOrder.id, ...myOrderIds]));
        setShowSuccess(true);
        setFormData({ ...formData, name: '', location: '', plates: 1 });
        setTimeout(() => { successRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
        setTimeout(() => { trackingRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 3000);
        setTimeout(() => setShowSuccess(false), 8000);
      }
    } catch (e) {
      alert("Error placing order. Please check your connection.");
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (confirm("Are you sure you want to cancel this order?")) {
      try {
        const response = await fetch(`/api/orders?id=${orderId}`, { method: 'DELETE' });
        if (response.ok) {
          const myOrderIds = JSON.parse(localStorage.getItem('momo_my_order_ids') || '[]');
          localStorage.setItem('momo_my_order_ids', JSON.stringify(myOrderIds.filter(id => id !== orderId)));
        }
      } catch (e) { alert("Error cancelling order."); }
    }
  };

  const handleTap = () => {
    setIsLaunching(true);
    setTimeout(() => { setHasTapped(true); setIsLaunching(false); }, 1000);
  };

  const handleBotSubmit = (e) => {
    e.preventDefault();
    if (!botInput.trim() || botStep === 'submitting' || botStep === 'done') return;

    const userText = botInput.trim();
    setBotMessages(prev => [...prev, { role: 'user', text: userText }]);
    setBotInput('');
    
    // Lock submit state immediately
    if (botStep === 'ask_location') {
      setBotStep('submitting');
    }

    setTimeout(async () => {
      let nextMsg = '';
      let nextStep = botStep;

      try {
        if (botStep === 'ask_name') {
           if (userText.length < 2) {
             nextMsg = "Could you please provide your full name so I can put it on the order?";
           } else {
             setFormData(prev => ({ ...prev, name: userText }));
             nextMsg = `Nice to meet you, ${userText.split(' ')[0]}! 🥟 How many plates of hot steamed momo would you like?`;
             nextStep = 'ask_plates';
           }
        } 
        else if (botStep === 'ask_plates') {
           const parsed = parseInt(userText.replace(/\D/g, ''));
           if (!parsed && !userText.toLowerCase().match(/one|two|single|couple/)) {
             nextMsg = "I didn't catch a number. How many plates? (e.g. '2' or '2 plates')";
           } else {
             const plates = parsed || (userText.toLowerCase().includes('two') ? 2 : 1);
             setFormData(prev => ({ ...prev, plates }));
             nextMsg = `Got it, ${plates} plates! 📱 What is your 10-digit phone number?`;
             nextStep = 'ask_phone';
           }
        }
        else if (botStep === 'ask_phone') {
           const phone = userText.replace(/\D/g, '').slice(0, 10);
           if (phone.length < 10) {
             nextMsg = "Please provide a valid 10-digit phone number so we can reach you!";
           } else {
             setFormData(prev => ({ ...prev, phone }));
             nextMsg = `Almost done! 📍 What is your exact delivery address or location?`;
             nextStep = 'ask_location';
           }
        }
        else if (botStep === 'ask_location') {
           setFormData(prev => ({ ...prev, location: userText }));
           setBotMessages(prev => [...prev, { role: 'bot', text: 'Perfect! Sending your order to the kitchen now...' }]);
           
           const newOrder = { 
             name: formData.name || 'Bot User', 
             phone: formData.phone || '(Bot Order)', 
             location: userText, 
             plates: formData.plates || 1, 
             status: 'Placed', 
             date: new Date().toLocaleString(), 
             id: Date.now(), 
             admin_id: adminId 
           };
           
           const response = await fetch('/api/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newOrder)
            });
            if (response.ok) {
              const myOrderIds = JSON.parse(localStorage.getItem('momo_my_order_ids') || '[]');
              localStorage.setItem('momo_my_order_ids', JSON.stringify([newOrder.id, ...myOrderIds]));
              setBotMessages(prev => [...prev, { role: 'system', text: '✅ Order Placed Successfully!' }]);
              setShowSuccess(true);
              setBotStep('done');
              setTimeout(() => { setIsBotOpen(false); }, 3000);
            } else {
              setBotMessages(prev => [...prev, { role: 'system', text: '❌ Failed. Try manual form.' }]);
              setBotStep('error');
            }
            return; // completely halt typical flow
        }
      } catch (e) {
        nextMsg = "Sorry, something went wrong. Let's try again using the manual form.";
        nextStep = 'error';
      }

      if (botStep !== 'ask_location') {
        setBotMessages(prev => [...prev, { role: 'bot', text: nextMsg }]);
        setBotStep(nextStep);
      }
    }, 600); // simulated typing delay
  };

  const getStatusStep = (status) => {
    const steps = ['Placed', 'In Progress', 'Ready', 'In Delivery'];
    return steps.indexOf(status);
  };

  if (notFound) {
    return (
      <div className={styles.momoContainer} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center' }}>
        <div>
          <h1 style={{ fontSize: '4rem', marginBottom: '1rem' }}>🥟</h1>
          <h2 style={{ color: '#b91c1c', marginBottom: '0.5rem' }}>Business Not Found</h2>
          <p style={{ color: '#64748b' }}>The business &quot;{slug}&quot; does not exist or is not yet approved.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.momoContainer}>
      {/* LANDING OVERLAY */}
      <div className={`${styles.landingOverlay} ${hasTapped ? styles.landingOverlayHidden : ''}`}>
        <div className={styles.momoOneTapWrapper}>
          <div className={styles.steamContainer}>
            <div className={styles.steam}></div>
            <div className={styles.steam}></div>
            <div className={styles.steam}></div>
          </div>
          <img src="/momo.png" alt="One Tap Momo" className={styles.momoOneTap} onClick={handleTap} />
        </div>
        <h1 className={styles.landingTitle}>{businessName}</h1>
        <div className={styles.tapInstruction} onClick={handleTap} style={{ cursor: 'pointer' }}>
          <div className={styles.pulsatingCircle}></div>
          TAP TO ORDER NOW
        </div>
      </div>

      {isLaunching && <img src="/momo.png" className={styles.flyingMomo} alt="Flying Momo" />}

      <section className={styles.heroSection}>
        <img src="/momo.png" alt="Momo" className={styles.heroImage} />
        <div className={styles.heroOverlay}></div>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>{businessName}</h1>
          <p className={styles.motto}>🚀 Hygienic | 🏠 Homely | ✨ Authentic</p>
        </div>
      </section>

      <section className={styles.formSection}>
        {showSuccess && (
          <div className={styles.premiumSuccessCard} ref={successRef}>
            <div className={styles.successIconOuter}>
              <div className={styles.successIconInner}>✔️</div>
            </div>
            <div className={styles.successContent}>
              <h4 className={styles.successTitle}>Order Placed Successfully! 🥟</h4>
              <p className={styles.successText}>We have received your request. Our chefs are already getting started!</p>
              <div className={styles.successActions}>
                <a href={`tel:${businessPhone}`} className={styles.callSupportBtn}>📞 Need Help? Call</a>
                <button onClick={() => setShowSuccess(false)} className={styles.dismissBtn}>Got it</button>
              </div>
            </div>
          </div>
        )}

        {activeOrders.length > 0 && (
          <div className={styles.executionSection} ref={trackingRef} style={{ marginBottom: '4rem', borderBottom: '2px dashed #fed7aa', paddingBottom: '4rem' }}>
            <h2 className={styles.executionTitle}>Track Active Orders</h2>
            {activeOrders.map(order => (
              <div key={order.id} className={styles.orderTrackerCard}>
                <div className={styles.trackerHeader}>
                  <div className={styles.trackerIdSection}>
                    <span className={styles.orderNumber}>Order #{order.id}</span>
                    <p className={styles.orderDateLabel}>{order.date}</p>
                  </div>
                  <div className={styles.trackerActions}>
                    {(order.status === 'Placed' || order.status === 'Preparing') && (
                      <button onClick={() => handleCancelOrder(order.id)} className={styles.cancelBtn}>Cancel</button>
                    )}
                    <span className={styles.statusBadge}>{order.status}</span>
                  </div>
                </div>
                <div className={styles.statusStepper}>
                  {['Placed', 'Preparing', 'Ready', 'Transit'].map((step, idx) => (
                    <div key={idx} className={`${styles.statusStep} ${getStatusStep(order.status) >= idx ? styles.activeStep : ''}`}>
                      <div className={styles.stepCircle} style={{ width: '2.5rem', height: '2.5rem' }}>{idx + 1}</div>
                      <div className={styles.stepLabel} style={{ fontSize: '0.75rem' }}>{step}</div>
                    </div>
                  ))}
                </div>
                <div className={styles.trackerFooter}>
                  <a href={`tel:${businessPhone}`} className={styles.trackerCallBtn}>📞 Call for Direct Support</a>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={styles.servingBadgeWrapper}>
          <span className={styles.servingBadge}>🎯 Currently Serving</span>
          <h2 className={styles.servingTitle}>Steamed Chicken Momo</h2>
          <p className={styles.servingPrice}>Special Price: Rs. 200 / Plate</p>
        </div>

        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>New Order</h2>
          <p className={styles.sectionSubtitle}>Place a new request below.</p>
        </div>

        <form className={styles.momoForm} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Full Name *</label>
            <input type="text" className={styles.input} required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>🥟 Phone Number (10 Digits) *</label>
            <input type="tel" className={styles.input} required maxLength="10" pattern="\d{10}" placeholder="e.g. 9800000000" value={formData.phone} onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0, 10); setFormData({ ...formData, phone: val }); }} />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>🍽️ Number of Plates *</label>
            <div className={styles.platesCounter}>
              <button type="button" className={styles.counterBtn} onClick={() => setFormData(prev => ({ ...prev, plates: Math.max(1, prev.plates - 1) }))}>-</button>
              <input type="number" className={styles.platesInput} required min="1" value={formData.plates} onChange={(e) => setFormData({ ...formData, plates: parseInt(e.target.value) || 1 })} />
              <button type="button" className={styles.counterBtn} onClick={() => setFormData(prev => ({ ...prev, plates: prev.plates + 1 }))}>+</button>
              <div className={styles.totalBadge}>Total: Rs. {formData.plates * 200}</div>
            </div>
          </div>
          <div className={styles.inputGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className={styles.label}>Delivery Address *</label>
              <button type="button" className={styles.locationBtn} onClick={handleGetLocation}>📍 Pin</button>
            </div>
            <textarea className={styles.textarea} required value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })}></textarea>
          </div>
          <button type="submit" className={styles.orderBtn} disabled={isLoadingLocation}>
            {isLoadingLocation ? 'Fetching Address... 📡' : 'Submit Order 🥟'}
          </button>
        </form>

        {activeOrders.length === 0 && (
          <div className={styles.actionGroup} style={{ marginTop: '3rem' }}>
            <a href={`tel:${businessPhone}`} className={styles.callBtn}>📞 Call for Quick Support</a>
          </div>
        )}
      </section>

      {/* MOMOBOT WIDGET OVERLAY - ONLY SHOWS ON SPLASH SCREEN */}
      {!hasTapped && (
        <>
          <div 
            className={styles.momoBotFab} 
            onClick={(e) => { e.stopPropagation(); setIsBotOpen(!isBotOpen); }}
          >
            {isBotOpen ? '✕' : '🤖'}
          </div>

          {isBotOpen && (
            <div className={styles.momoBotWindow} onClick={(e) => e.stopPropagation()}>
              <div className={styles.momoBotHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🤖</span> MomoBot Order Assistant
                </div>
                <button onClick={() => setIsBotOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
              </div>
              
              <div className={styles.momoBotBody}>
                {botMessages.map((msg, i) => (
                  <div key={i} className={`${msg.role === 'system' ? styles.momoBotSystemMsg : styles.momoBotMsg} ${msg.role === 'bot' ? styles.momoBotMsgBot : msg.role === 'user' ? styles.momoBotMsgUser : ''}`}>
                    {msg.text}
                  </div>
                ))}
              </div>

              {(botStep !== 'submitting' && botStep !== 'error' && botStep !== 'done') && (
                <form className={styles.momoBotFooter} onSubmit={handleBotSubmit}>
                  <input 
                    type="text" 
                    placeholder="Type your answer here..." 
                    className={styles.momoBotInput}
                    value={botInput}
                    onChange={(e) => setBotInput(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className={styles.momoBotSend} disabled={!botInput.trim()}>➤</button>
                </form>
              )}
            </div>
          )}
        </>
      )}

      <a href="/admin" className={styles.adminFloater} title="Run as admin for your business">A</a>

      <footer className={styles.footer}>
        <p>© 2026 {businessName}. Homely. Hygienic. Authentic.</p>
        <p style={{ marginTop: '0.5rem', fontWeight: '800', color: '#b91c1c' }}>Design and Created by Ashish Khanal</p>
      </footer>
    </div>
  );
}
