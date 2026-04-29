'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './page.module.css';

export default function MomoPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    location: '',
    plates: 1
  });
  const [activeOrders, setActiveOrders] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasTapped, setHasTapped] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [businessPhone, setBusinessPhone] = useState('+9779860196101');
  const [adminId, setAdminId] = useState(null);
  const trackingRef = useRef(null);
  const successRef = useRef(null);

  // Fetch business config (phone + admin_id)
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => { 
        if (data.phone) setBusinessPhone(data.phone);
        if (data.adminId) setAdminId(data.adminId);
      })
      .catch(() => {});
  }, []);

  // Poll for status updates from the server
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/orders');
        const orders = await response.json();
        
        // Safety check: only filter if we actually got an array of orders
        if (Array.isArray(orders)) {
          const myOrderIds = JSON.parse(localStorage.getItem('momo_my_order_ids') || '[]');
          
          // Filter for orders that match the user's recent IDs and are NOT Received
          const myActiveOrders = orders.filter(o => 
            myOrderIds.includes(o.id) && o.status !== 'Received'
          );
          setActiveOrders(myActiveOrders);
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [formData.phone]);

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
        () => {
          alert("Error getting location.");
          setIsLoadingLocation(false);
        }
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
        localStorage.setItem('momo_customer_phone', formData.phone); 
        setShowSuccess(true);
        setFormData({ ...formData, name: '', location: '', plates: 1 });
        
        // Scroll to success message immediately
        setTimeout(() => {
          successRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);

        // Scroll to tracking section after a short delay
        setTimeout(() => {
          trackingRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 3000);

        setTimeout(() => setShowSuccess(false), 8000);
      }
    } catch (e) {
      alert("Error placing order. Please check your connection.");
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (confirm("Are you sure you want to cancel this order?")) {
      try {
        const response = await fetch(`/api/orders?id=${orderId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          // Remove from local tracking too
          const myOrderIds = JSON.parse(localStorage.getItem('momo_my_order_ids') || '[]');
          const updatedIds = myOrderIds.filter(id => id !== orderId);
          localStorage.setItem('momo_my_order_ids', JSON.stringify(updatedIds));
        }
      } catch (e) {
        alert("Error cancelling order.");
      }
    }
  };

  const handleTap = () => {
    setIsLaunching(true);
    // Play sound if possible, but for now just animate
    setTimeout(() => {
      setHasTapped(true);
      setIsLaunching(false);
      // Smooth scroll check if needed, but it's an overlay so it just disappears
    }, 1000);
  };

  const getStatusStep = (status) => {
    const steps = ['Placed', 'In Progress', 'Ready', 'In Delivery'];
    return steps.indexOf(status);
  };

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
          <img
            src="/momo.png"
            alt="One Tap Momo"
            className={styles.momoOneTap}
            onClick={handleTap}
          />
        </div>
        <h1 className={styles.landingTitle}>One Tap Momo</h1>
        <div className={styles.tapInstruction} onClick={handleTap} style={{ cursor: 'pointer' }}>
          <div className={styles.pulsatingCircle}></div>
          TAP TO ORDER NOW
        </div>
      </div>

      {/* FLYING MOMO ANIMATION */}
      {isLaunching && (
        <img src="/momo.png" className={styles.flyingMomo} alt="Flying Momo" />
      )}

      <section className={styles.heroSection}>
        <img src="/momo.png" alt="Momo" className={styles.heroImage} />
        <div className={styles.heroOverlay}></div>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>One Tap Momo</h1>
          <p className={styles.motto}>🚀 Hygienic | 🏠 Homely | ✨ Authentic</p>
        </div>
      </section>

      <section className={styles.formSection}>
        {/* SUCCESS NOTIFICATION */}
        {showSuccess && (
          <div className={styles.premiumSuccessCard} ref={successRef}>
            <div className={styles.successIconOuter}>
              <div className={styles.successIconInner}>✔️</div>
            </div>
            <div className={styles.successContent}>
              <h4 className={styles.successTitle}>Order Placed Successfully! 🥟</h4>
              <p className={styles.successText}>We have received your request. Our chefs are already getting started! You can track your real-time delivery status here.</p>
              <div className={styles.successActions}>
                <a href={`tel:${businessPhone}`} className={styles.callSupportBtn}>📞 Need Help? Call Admin</a>
                <button onClick={() => setShowSuccess(false)} className={styles.dismissBtn}>Got it</button>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE TRACKERS / HISTORY */}
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
                      <button 
                        onClick={() => handleCancelOrder(order.id)}
                        className={styles.cancelBtn}
                      >
                        Cancel
                      </button>
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
                  <a href={`tel:${businessPhone}`} className={styles.trackerCallBtn}>
                    📞 Call for Direct Support
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CURRENTLY SERVING HIGHLIGHT */}
        <div className={styles.servingBadgeWrapper}>
          <span className={styles.servingBadge}>🎯 Currently Serving</span>
          <h2 className={styles.servingTitle}>Steamed Chicken Momo</h2>
          <p className={styles.servingPrice}>Special Price: Rs. 200 / Plate</p>
        </div>

        {/* ORDER FORM */}
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
            <input
              type="tel"
              className={styles.input}
              required
              maxLength="10"
              pattern="\d{10}"
              placeholder="e.g. 9800000000"
              value={formData.phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                setFormData({ ...formData, phone: val });
              }}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>🍽️ Number of Plates *</label>
            <div className={styles.platesCounter}>
              <button
                type="button"
                className={styles.counterBtn}
                onClick={() => setFormData(prev => ({ ...prev, plates: Math.max(1, prev.plates - 1) }))}
              >
                -
              </button>
              <input
                type="number"
                className={styles.platesInput}
                required
                min="1"
                value={formData.plates}
                onChange={(e) => setFormData({ ...formData, plates: parseInt(e.target.value) || 1 })}
              />
              <button
                type="button"
                className={styles.counterBtn}
                onClick={() => setFormData(prev => ({ ...prev, plates: prev.plates + 1 }))}
              >
                +
              </button>
              <div className={styles.totalBadge}>
                Total: Rs. {formData.plates * 200}
              </div>
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

      {/* ADMIN SHORTCUT */}
      <a href="/admin" className={styles.adminFloater} title="Run as admin for your business">
        A
      </a>

      <footer className={styles.footer}>
        <p>© 2026 One Tap Momo. Homely. Hygienic. Authentic.</p>
        <p style={{ marginTop: '0.5rem', fontWeight: '800', color: '#b91c1c' }}>Design and Created by Ashish Khanal</p>
      </footer>
    </div>
  );
}
