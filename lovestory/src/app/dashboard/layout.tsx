"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './dashboard.module.css';
import { useLoveStory } from '@/context/LoveStoryContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { couple, logout } = useLoveStory();

  const handleLogout = async () => {
    if (window.confirm("Bạn có chắc muốn đăng xuất khỏi tài khoản này?")) {
      await logout();
      router.push('/');
    }
  };

  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.header}>
        <h2>LoveStory</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className={styles.streakBadge}>
            🔥 {couple?.streak || 0} Ngày
          </div>
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
