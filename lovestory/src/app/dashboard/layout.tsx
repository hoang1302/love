"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './dashboard.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();

  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.header}>
        <h2>LoveStory</h2>
        <div className={styles.streakBadge}>
          🔥 15 Days
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
