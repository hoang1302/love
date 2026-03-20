"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { useLoveStory } from '@/context/LoveStoryContext';

export default function Home() {
  const router = useRouter();
  const { createRoom, joinRoom, couple } = useLoveStory();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);
  
  // Mặc định là ngày hôm nay dạng YYYY-MM-DD
  const [startDateStr, setStartDateStr] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Nếu đã đăng nhập / có phòng lưu trữ rồi thì chuyển hướng Dashboard
  useEffect(() => {
    if (couple) {
      router.push('/dashboard');
    }
  }, [couple, router]);

  const handleJoin = async () => {
    if (!code) {
      setError("Vui lòng nhập mã");
      return;
    }
    setLoadingAction(true);
    try {
      await joinRoom(code);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || "Không thể tham gia phòng");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCreate = async () => {
    setLoadingAction(true);
    try {
      await createRoom(startDateStr);
      router.push('/dashboard');
    } catch (err: any) {
      console.error("DEBUG CREATE ROOM ERROR:", err);
      setError("Lỗi: " + (err.message || "Không xác định"));
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <main className="container fade-in">
      <div className={styles.hero}>
        <h1 className="title">LoveStory</h1>
        <p className={styles.subtitle}>Gắn kết những kỷ niệm vô giá</p>
        
        <div className={`glass-panel ${styles.loginBox}`}>
          <h2>Tham gia phòng đôi</h2>
          <p>Nhập mã cặp đôi để bắt đầu hoặc tạo phòng mới.</p>
          
          <div className={styles.inputGroup}>
            <input 
              type="text" 
              placeholder="Nhập mã 6 ký tự..." 
              className={styles.codeInput} 
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            {error && <span style={{color: '#ff4b82', fontSize: '0.9rem', textAlign: 'center'}}>{error}</span>}
            <button className="btn-primary" onClick={handleJoin} disabled={loadingAction}>
              {loadingAction ? "Đang kết nối..." : "Kết Nối"}
            </button>
          </div>
          
          <div className={styles.divider}>
            <span>hoặc</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <label style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>Ngày bắt đầu yêu:</label>
            <input 
              type="date"
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: 'white',
                padding: '12px',
                fontFamily: 'inherit',
                outline: 'none',
                width: '100%',
                colorScheme: 'dark'
              }}
            />
          </div>

          <button className="btn-glass" style={{ width: '100%' }} onClick={handleCreate} disabled={loadingAction}>
            Tạo Mã Cặp Đôi Mới
          </button>
        </div>
      </div>
    </main>
  );
}
