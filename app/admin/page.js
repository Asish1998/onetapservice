'use client';

import { useState, useEffect } from 'react';
import styles from './admin.module.css';

export default function AdminPage() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  const loadOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      const savedOrders = await response.json();
      // Ensure we have an array
      if (Array.isArray(savedOrders)) {
        setOrders(savedOrders);
      }
    } catch (e) {
      console.error("Failed to load orders");
    }
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 3000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (orderId, newStatus) => {
    try {
      await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus })
      });
      loadOrders();
    } catch (e) {
      alert("Error updating status");
    }
  };

  const deleteOrder = async (orderId) => {
    if (confirm('Are you sure you want to delete this order?')) {
      try {
        await fetch(`/api/orders?id=${orderId}`, {
          method: 'DELETE'
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

  // Filter & Search Logic
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
    revenue: orders.reduce((acc, o) => acc + (o.plates * 150), 0),
    active: orders.filter(o => o.status !== 'Received').length,
    ready: orders.filter(o => o.status === 'Ready').length
  };

  return (
    <div className={styles.adminContainer}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span>🥟</span> One Tap Admin
        </div>
        <nav className={styles.nav}>
          <div className={`${styles.navItem} ${styles.navItemActive}`}>
            <span>📊</span> Dashboard
          </div>
          <div className={styles.navItem} onClick={() => window.open('/', '_blank')}>
            <span>🌐</span> View Site
          </div>
          <div className={styles.navItem} onClick={() => loadOrders()}>
            <span>🔄</span> Refresh Data
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
        <header className={styles.adminHeader}>
          <div>
            <h1 className={styles.adminTitle}>Orders Management</h1>
            <p style={{ color: '#64748b', fontWeight: 500 }}>Monitor and manage real-time momo requests.</p>
          </div>
        </header>

        {/* Stats Grid */}
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

        {/* Controls */}
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

        {/* Orders Grid */}
        <div className={styles.orderGrid}>
          {filteredOrders.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>🥡</span>
              <h3 style={{ fontSize: '1.5rem', color: '#0f172a' }}>No matching orders</h3>
              <p style={{ color: '#64748b' }}>Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            filteredOrders.map(order => (
              <div key={order.id} className={`${styles.orderCard} ${styles['priority' + order.status.replace(' ', '')] || ''}`}>
                <div className={styles.orderHeader}>
                  <div className={styles.customerInfo}>
                    <h3>{order.name}</h3>
                    <span className={styles.orderId}>ID: #{order.id}</span>
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
                      <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>Rs. {order.plates * 150}</span>
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
                  <button onClick={() => updateStatus(order.id, 'In Progress')} className={`${styles.actionBtn} ${styles.actionBtnGhost}`} disabled={order.status === 'In Progress'}>Preparing</button>
                  <button onClick={() => updateStatus(order.id, 'Ready')} className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} disabled={order.status === 'Ready'}>Mark Ready 🥟</button>
                  <button onClick={() => updateStatus(order.id, 'In Delivery')} className={`${styles.actionBtn} ${styles.actionBtnGhost}`} disabled={order.status === 'In Delivery'}>Transit 🛵</button>
                  <button onClick={() => updateStatus(order.id, 'Received')} className={`${styles.actionBtn} ${styles.actionBtnGhost}`} style={{ color: '#059669' }} disabled={order.status === 'Received'}>Completed ✅</button>
                  <button onClick={() => deleteOrder(order.id)} className={`${styles.actionBtn} ${styles.deleteBtn}`}>Archieve Order</button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
