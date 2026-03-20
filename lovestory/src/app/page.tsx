"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { useLoveStory } from '@/context/LoveStoryContext';

export default function Home() {
  const router = useRouter();
  const { createRoom, joinRoom, couple, user, loginWithEmail, signupWithEmail, logout } = useLoveStory();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);
  
  // Auth state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError("");
    setLoadingAction(true);
    try {
      if (authMode === 'login') {
        await loginWithEmail(email, password);
      } else {
        await signupWithEmail(email, password);
      }
    } catch (err: any) {
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('Email này đã được sử dụng.');
          break;
        case 'auth/weak-password':
          setError('Mật khẩu quá yếu (tối thiểu 6 ký tự).');
          break;
        case 'auth/invalid-credential':
          setError('Tài khoản hoặc mật khẩu không chính xác.');
          break;
        default:
          setError(err.message || "Lỗi đăng nhập/đăng ký");
          break;
      }
    } finally {
      setLoadingAction(false);
    }
  };

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
        
        {!user ? (
          // Auth Screen
          <div className={`glass-panel ${styles.loginBox}`}>
            <h2>{authMode === 'login' ? 'Đăng Nhập' : 'Tạo Tài Khoản'}</h2>
            <p style={{ marginTop: '8px', opacity: 0.8, fontSize: '0.9rem' }}>Bạn cần có tài khoản trước khi ghép đôi nhé!</p>
            
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              <input 
                type="email" 
                placeholder="Email..." 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={styles.codeInput} // Reused styling
                required
              />
              <input 
                type="password" 
                placeholder="Mật khẩu..." 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={styles.codeInput}
                required
              />
              {error && <span style={{color: '#ff4b82', fontSize: '0.9rem', textAlign: 'center'}}>{error}</span>}
              <button type="submit" className="btn-primary" disabled={loadingAction} style={{ marginTop: '4px' }}>
                {loadingAction ? 'Đang tải...' : (authMode === 'login' ? 'Đăng Nhập' : 'Đăng Ký')}
              </button>
            </form>
            
            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.9rem' }}>
              {authMode === 'login' ? (
                <p>Chưa có tài khoản? <span style={{color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline'}} onClick={() => {setAuthMode('register'); setError('')}}>Đăng ký ngay</span></p>
              ) : (
                <p>Đã có tài khoản? <span style={{color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline'}} onClick={() => {setAuthMode('login'); setError('')}}>Đăng nhập</span></p>
              )}
            </div>
          </div>
        ) : (
          // Room/Pairing Screen
          <div className={`glass-panel ${styles.loginBox}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <h2>Tham gia phòng đôi</h2>
              <button 
                onClick={logout} 
                style={{
                  background: 'none', border: 'none', color: 'var(--text-secondary)', 
                  cursor: 'pointer', textDecoration: 'underline', fontSize: '0.85rem'
                }}>Đăng xuất</button>
            </div>
            
            <p>Nhập mã cặp đôi để bắt đầu hoặc tạo phòng mới.</p>
            
            <div className={styles.inputGroup} style={{ marginTop: '16px' }}>
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
        )}
      </div>
    </main>
  );
}
