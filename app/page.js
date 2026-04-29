'use client';

import styles from './page.module.css';
import { useRouter } from 'next/navigation';

export default function SaaSLandingPage() {
  const router = useRouter();

  return (
    <div className={styles.momoContainer}>
      <header className={styles.saasHeader}>
        <div className={styles.saasLogo}>🥟 OneTapMomo Platform</div>
        <button onClick={() => router.push('/admin')} className={styles.loginBtn}>Login / Register</button>
      </header>

      <section className={styles.saasHero}>
        <div className={styles.heroText}>
          <h1 className={styles.saasTitle}>Take Your Momo Business Online in 1-Tap!</h1>
          <p className={styles.saasSubtitle}>Get a dedicated ordering page for your business, track live orders on a professional dashboard, and serve your hungry customers better.</p>
          <div className={styles.saasHeroActions}>
            <button onClick={() => router.push('/admin')} className={styles.registerBtn}>Register Your Business</button>
            <a href="#how-it-works" className={styles.learnMoreBtn}>See How It Works</a>
          </div>
        </div>
        <div className={styles.heroGraphic}>
           <img src="/momo.png" alt="Momo Dashboard" className={styles.heroMomoFloat} />
        </div>
      </section>

      <section id="how-it-works" className={styles.saasFeatures}>
        <h2 className={styles.featuresHeading}>Everything You Need to Succeed</h2>
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <h3>🌐 Unique Ordering Link</h3>
            <p>Customers order directly from your personal site (e.g., onetapmomo.com/order/your-business).</p>
          </div>
          <div className={styles.featureCard}>
            <h3>📊 Live Order Dashboard</h3>
            <p>Track new orders, update live statuses, and complete deliveries with a single tap.</p>
          </div>
          <div className={styles.featureCard}>
            <h3>💰 Instant Setup</h3>
            <p>Once you register and make payment, get your dashboard unlocked immediately to start accepting orders.</p>
          </div>
        </div>
      </section>

      <footer className={styles.saasFooter}>
        <p>© 2026 One Tap Momo Platform. All rights reserved.</p>
        <p style={{ marginTop: '0.5rem', fontWeight: '800' }}>Built for Momo Entrepreneurs by Ashish Khanal.</p>
      </footer>
    </div>
  );
}
