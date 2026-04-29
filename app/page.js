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
           <div className={styles.orbitContainer}>
             <img src="/momo.png" alt="Momo Dashboard" className={styles.heroMomoFloat} />
             
             {/* Orbiting Momos (Antigravity feature) */}
             <div className={`${styles.orbitTrack} ${styles.orbitTrack1}`}>
               <img src="/momo.png" className={styles.orbitMomo} alt="Orbit" />
             </div>
             <div className={`${styles.orbitTrack} ${styles.orbitTrack2}`}>
               <img src="/momo.png" className={styles.orbitMomo} alt="Orbit" />
             </div>
             <div className={`${styles.orbitTrack} ${styles.orbitTrack3}`}>
               <img src="/momo.png" className={styles.orbitMomo} alt="Orbit" />
             </div>
           </div>
        </div>
      </section>

      <section id="how-it-works" className={styles.saasFeatures}>
        <h2 className={styles.featuresHeading}>Everything You Need to Succeed</h2>
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <h3>🌐 Unique Ordering Link</h3>
            <p>Customers order directly from your personal, branded ordering page.</p>
          </div>
          <div className={styles.featureCard}>
            <h3>🤖 MomoBot AI Assistant</h3>
            <p>A smart, conversational chat widget that captures customer details and autonomously places orders.</p>
          </div>
          <div className={styles.featureCard}>
            <h3>📊 BI & Analytics Dashboard</h3>
            <p>Visualize peak ordering hours, revenue generation, and workflow statuses with dynamic interactive charts.</p>
          </div>
          <div className={styles.featureCard}>
            <h3>🔊 AI Kitchen Voice Copilot</h3>
            <p>Get instant voice announcements in the kitchen the second a new order arrives—hands-free tracking.</p>
          </div>
          <div className={styles.featureCard}>
            <h3>🚀 Optimized & Scalable</h3>
            <p>Secured API routing and smart polling logic ensures the platform gracefully handles 1,000+ concurrent customers.</p>
          </div>
          <div className={styles.featureCard}>
            <h3>💰 Complete Vendor Control</h3>
            <p>Register online, get an instant secure dashboard, and manage statuses from &apos;Preparing&apos; to &apos;Completed&apos;.</p>
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
