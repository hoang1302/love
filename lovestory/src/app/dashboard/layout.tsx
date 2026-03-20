"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from './dashboard.module.css';
import { useLoveStory } from '@/context/LoveStoryContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { couple, user, logout, updateNames } = useLoveStory();

  const [showSettings, setShowSettings] = useState(false);
  const [myName, setMyName] = useState("");
  const [partnerName, setPartnerName] = useState("");

  const isPartner1 = user?.uid === couple?.partner1Id;
  const currentMyName = isPartner1 ? (couple?.partner1Name || "Bạn") : (couple?.partner2Name || "Bạn");
  const currentPartnerName = isPartner1 ? (couple?.partner2Name || "Người ấy") : (couple?.partner1Name || "Người ấy");

  useEffect(() => {
    if (showSettings) {
      setMyName(currentMyName);
      setPartnerName(currentPartnerName);
    }
  }, [showSettings, currentMyName, currentPartnerName]);

  const handleLogout = async () => {
    if (window.confirm("Bạn có chắc muốn đăng xuất khỏi tài khoản này?")) {
      await logout();
      router.push('/');
    }
  };

  const handleSaveNames = async () => {
    await updateNames(myName, partnerName);
    setShowSettings(false);
  };

  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.header}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h2>LoveStory</h2>
          {couple && (
            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginTop: '2px' }}>
              {currentMyName} ❤️ {currentPartnerName}
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className={styles.streakBadge}>
            🔥 {couple?.streak || 0} Ngày
          </div>
          <button 
            onClick={() => setShowSettings(true)}
            style={{ 
              background: 'transparent',
              border: 'none', 
              color: 'var(--text-secondary)', 
              cursor: 'pointer', 
              fontSize: '1.2rem'
            }} 
            title="Cài đặt tên"
          >
            ⚙️
          </button>
          <button 
            onClick={handleLogout} 
            style={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              border: '1px solid rgba(255, 255, 255, 0.2)', 
              borderRadius: '8px', 
              color: 'var(--text-secondary)', 
              padding: '6px 10px',
              cursor: 'pointer', 
              fontSize: '0.85rem'
            }} 
            title="Đăng xuất"
          >
            Thoát
          </button>
        </div>
      </header>

      {showSettings && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="glass-panel fade-in" style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Cài đặt</h3>
            
            <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Mã phòng cặp đôi:</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  value={couple?.id || ""} 
                  readOnly
                  style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: 'none', color: '#ffb2c8', outline: 'none', fontWeight: 'bold', letterSpacing: '2px', textAlign: 'center' }}
                />
                <button 
                  onClick={() => { navigator.clipboard.writeText(couple?.id || ""); alert("Đã copy mã phòng!"); }}
                  style={{ padding: '0 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer' }}
                >
                  Copy
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '6px' }}>Biệt danh của bạn:</label>
              <input 
                value={myName} onChange={e => setMyName(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', outline: 'none'}}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '6px' }}>Biệt danh của người ấy:</label>
              <input 
                value={partnerName} onChange={e => setPartnerName(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', outline: 'none'}}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-glass" style={{ flex: 1 }} onClick={() => setShowSettings(false)}>Hủy</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleSaveNames}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      <main className={styles.mainContent}>
        {children}
      </main>

      <nav className={styles.bottomNav}>
        <Link 
          href="/dashboard" 
          className={`${styles.navItem} ${pathname === '/dashboard' ? styles.active : ''}`}
        >
          <span>Kỷ Niệm</span>
        </Link>
        <Link 
          href="/dashboard/diary" 
          className={`${styles.navItem} ${pathname === '/dashboard/diary' ? styles.active : ''}`}
        >
          <span>Nhật Ký</span>
        </Link>
        <Link 
          href="/dashboard/bucketlist" 
          className={`${styles.navItem} ${pathname === '/dashboard/bucketlist' ? styles.active : ''}`}
        >
          <span>Mục Tiêu</span>
        </Link>
        <Link 
          href="/dashboard/mailbox" 
          className={`${styles.navItem} ${pathname === '/dashboard/mailbox' ? styles.active : ''}`}
        >
          <span>Thư Bí Mật</span>
        </Link>
      </nav>
    </div>
  );
}
