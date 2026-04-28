'use client';

import { useState, useEffect } from 'react';
import styles from './admin.module.css';

export default function AdminPage() {
  const [orders, setOrders] = useState([]);

  // Load orders from API
  const loadOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      const savedOrders = await response.json();
      setOrders(savedOrders);
    } catch (e) {
      console.error("Failed to load orders");
    }
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 2000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (orderId, newStatus) => {
    try {
      await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus })
      });
      loadOrders(); // Refresh
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
        loadOrders(); // Refresh
      } catch (e) {
        alert("Error deleting order");
      }
    }
  };

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status !== 'Received').length,
    received: orders.filter(o => o.status === 'Received').length
  };

  return (
    <div className={styles.adminContainer}>
      <header className={styles.adminHeader}>
        <h1 className={styles.adminTitle}>Momo Dashboard</h1>
        
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.total}</span>
            <span className={styles.statLabel}>Total</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.pending}</span>
            <span className={styles.statLabel}>Active</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.received}</span>
            <span className={styles.statLabel}>Received</span>
          </div>
        </div>
      </header>

      <div className={styles.orderGrid}>
        {orders.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📭</span>
            <h3>No orders yet</h3>
            <p>Requests will appear here in real-time.</p>
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className={styles.orderCard}>
              <div className={styles.orderHeader}>
                <div className={styles.orderInfo}>
                  <h3>{order.name}</h3>
                  <span className={styles.orderDate}>{order.date}</span>
                </div>
                <div className={`${styles.statusBadge} ${styles['status-' + (order.status || 'Placed').replace(' ', '-')]}`}>
                  {order.status || 'Placed'}
                </div>
              </div>

              <div className={styles.customerSection}>
                <div className={styles.detailRow}>
                  <strong>Phone</strong>
                  <span>{order.phone}</span>
                </div>
                <div className={styles.detailRow}>
                  <strong>Location</strong>
                  <span>{order.location}</span>
                </div>
              </div>

              <div className={styles.actionGrid}>
                <button onClick={() => updateStatus(order.id, 'In Progress')} className={`${styles.statusBtn} ${styles['btn-progress']}`} disabled={order.status === 'In Progress'}>In Progress</button>
                <button onClick={() => updateStatus(order.id, 'Ready')} className={`${styles.statusBtn} ${styles['btn-ready']}`} disabled={order.status === 'Ready'}>Mark Ready</button>
                <button onClick={() => updateStatus(order.id, 'In Delivery')} className={`${styles.statusBtn} ${styles['btn-delivery']}`} disabled={order.status === 'In Delivery'}>In Delivery</button>
                <button onClick={() => updateStatus(order.id, 'Received')} className={`${styles.statusBtn}`} style={{ background: '#0284c7', color: 'white' }} disabled={order.status === 'Received'}>Mark Received ✅</button>
                <button onClick={() => deleteOrder(order.id)} className={`${styles.statusBtn} ${styles['btn-delete']}`}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
