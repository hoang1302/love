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
      await createRoom();
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
          
          <button className="btn-glass" style={{ width: '100%' }} onClick={handleCreate} disabled={loadingAction}>
            Tạo Mã Cặp Đôi Mới
          </button>
        </div>
      </div>
    </main>
  );
}
