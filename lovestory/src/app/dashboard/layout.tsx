"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from './dashboard.module.css';
import { useLoveStory } from '@/context/LoveStoryContext';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import PasscodeScreen from '@/components/PasscodeScreen';
import { usePresenceAndTracking, requestPushPermission } from '@/hooks/usePresenceAndTracking';

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
  const [bgSize, setBgSize] = useState("cover");
  const [bgPosition, setBgPosition] = useState("center");
  const [uploadingBg, setUploadingBg] = useState(false);
  const [newPasscode, setNewPasscode] = useState("");
  
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [notifState, setNotifState] = useState('granted');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifState(Notification.permission);
    }
  }, []);

  const isPartner1 = user?.uid === couple?.partner1Id;
  const isTargetOnline = isPartner1 ? couple?.isOnline_partner2 : couple?.isOnline_partner1;

  usePresenceAndTracking();

  useEffect(() => {
    if (couple?.id) {
      if (!couple.passcode) {
        setIsUnlocked(true);
      } else {
        const saved = sessionStorage.getItem('unlocked_' + couple.id);
        setIsUnlocked(!!saved);
      }
    }
  }, [couple]);

  const handleUpdatePasscode = async () => {
    if (!couple?.id) return;
    if (newPasscode && newPasscode.length !== 4) {
      toast.error("Mã PIN phải gồm đúng 4 chữ số!");
      return;
    }
    await updateDoc(doc(db, "Couples", couple.id), {
      passcode: newPasscode || null
    });
    if (newPasscode) {
      sessionStorage.setItem('unlocked_' + couple.id, 'true');
    }
    toast.success(newPasscode ? "Đã đặt mã PIN thành công!" : "Đã gỡ mã PIN!");
    setNewPasscode("");
  };

  const handleTestPushDelay = () => {
    toast.success("Đã ghi nhận! Hãy thoát ra màn hình Home của điện thoại NGAY BÂY GIỜ và chờ 5 giây...", { duration: 5000 });
    setTimeout(() => {
       const mySubs = isPartner1 ? couple?.nativePushSubs_partner1 : couple?.nativePushSubs_partner2;
       if (mySubs && mySubs.length > 0) {
          fetch('/api/notify', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
                subscriptions: mySubs,
                title: 'Test Push Thành Công 🚀',
                body: 'Hệ thống thông báo đẩy của LoveStory đang chạy ngầm siêu mượt!'
             })
          }).catch(console.error);
       } else {
          toast.error("Bạn chưa Cấp quyền Thông báo trên thiết bị này!");
       }
    }, 5000);
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !couple?.id) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh quá lớn! Vui lòng chọn ảnh < 5MB.");
      return;
    }
    setUploadingBg(true);
    const toastId = toast.loading("Đang tải hình nền lên ImgBB...");
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY || "3bd0a48e757205c93a96b418e45a694f";
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (data.success) {
        const downloadURL = data.data.url;
        await updateDoc(doc(db, "Couples", couple.id), { backgroundUrl: downloadURL });
        toast.success("Đổi hình nền thành công!", { id: toastId });
      } else {
        toast.error("Lỗi ImgBB: " + data.error?.message, { id: toastId });
      }
    } catch (err: any) {
       toast.error("Đã xảy ra lỗi kết nối: " + err.message, { id: toastId });
    } finally {
       setUploadingBg(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !couple?.id || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ảnh quá lớn! Vui lòng chọn ảnh < 2MB.");
      return;
    }
    const toastId = toast.loading("Đang tải Ảnh Đại Diện lên ImgBB...");
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY || "3bd0a48e757205c93a96b418e45a694f";
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (data.success) {
        const downloadURL = data.data.url;
        const updateField = isPartner1 ? "partner1Avatar" : "partner2Avatar";
        await updateDoc(doc(db, "Couples", couple.id), { [updateField]: downloadURL });
        toast.success("Đổi Ảnh đại diện thành công!", { id: toastId });
      } else {
        toast.error("Lỗi ImgBB: " + data.error?.message, { id: toastId });
      }
    } catch (err: any) {
       toast.error("Đã xảy ra lỗi kết nối: " + err.message, { id: toastId });
    }
  };

  const currentMyName = isPartner1 ? (couple?.partner1Name || "Bạn") : (couple?.partner2Name || "Bạn");
  const currentPartnerName = isPartner1 ? (couple?.partner2Name || "Người ấy") : (couple?.partner1Name || "Người ấy");
  
  const currentMyAvatar = isPartner1 ? couple?.partner1Avatar : couple?.partner2Avatar;
  const currentPartnerAvatar = isPartner1 ? couple?.partner2Avatar : couple?.partner1Avatar;

  useEffect(() => {
    if (showSettings) {
      setMyName(currentMyName);
      setPartnerName(currentPartnerName);
      setBgSize(couple?.bgSize || "cover");
      setBgPosition(couple?.bgPosition || "center");
    }
  }, [showSettings, currentMyName, currentPartnerName, couple?.bgSize, couple?.bgPosition]);

  const handleLogout = async () => {
    if (window.confirm("Bạn có chắc muốn đăng xuất khỏi tài khoản này?")) {
      await logout();
      router.push('/');
    }
  };

  const handleSaveNames = async () => {
    await updateNames(myName, partnerName);
    if (couple?.id) {
       await updateDoc(doc(db, "Couples", couple.id), {
          bgSize: bgSize,
          bgPosition: bgPosition
       });
    }
    setShowSettings(false);
  };

  const bgStyle = couple?.backgroundUrl ? { 
    backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${couple.backgroundUrl})`,
    backgroundSize: couple?.bgSize || 'cover',
    backgroundPosition: couple?.bgPosition || 'center',
    backgroundAttachment: 'fixed',
    backgroundRepeat: 'no-repeat'
  } : {};

  if (couple?.passcode && !isUnlocked) {
    return (
      <PasscodeScreen 
        correctPasscode={couple.passcode} 
        onSuccess={() => {
          sessionStorage.setItem('unlocked_' + couple.id, 'true');
          setIsUnlocked(true);
        }} 
      />
    );
  }

  return (
    <div className={styles.dashboardContainer} style={bgStyle}>
      <header className={styles.header}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h2>LoveStory</h2>
          {couple && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ position: 'relative' }}>
                  {currentMyAvatar ? (
                    <img src={currentMyAvatar} alt="My Avatar" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>{currentMyName.charAt(0)}</div>
                  )}
                  <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '10px', height: '10px', backgroundColor: '#2ecc71', borderRadius: '50%', border: '2px solid var(--primary-color)' }} title="Bạn" />
                </div>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)' }}>{currentMyName}</span>
              </div>
              <span style={{ fontSize: '0.75rem' }}>❤️</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)' }}>{currentPartnerName}</span>
                <div style={{ position: 'relative' }}>
                  {currentPartnerAvatar ? (
                    <img src={currentPartnerAvatar} alt="Partner Avatar" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>{currentPartnerName.charAt(0)}</div>
                  )}
                  {isTargetOnline && (
                    <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '10px', height: '10px', backgroundColor: '#2ecc71', borderRadius: '50%', border: '2px solid #ff4b82', transition: 'all 0.3s ease' }} title="Đang online" />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {notifState === 'default' && (
            <button 
              onClick={async () => {
                if (couple?.id) {
                  const perm = await requestPushPermission(couple.id, isPartner1);
                  setNotifState(perm || 'default');
                  if (perm === 'granted') {
                    toast.success("Đã bật Thông báo thành công!");
                  }
                }
              }}
              className="fade-in"
              style={{ 
                background: 'rgba(255, 75, 130, 0.9)', 
                border: 'none', 
                borderRadius: '8px', 
                color: 'white', 
                padding: '6px 10px',
                cursor: 'pointer', 
                fontSize: '0.85rem',
                fontWeight: 'bold',
                boxShadow: '0 2px 8px rgba(255, 75, 130, 0.4)'
              }} 
            >
              🔔 Bật Thông báo
            </button>
          )}

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
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', outline: 'none', marginBottom: '8px'}}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {currentMyAvatar && <img src={currentMyAvatar} style={{width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover'}} />}
                <label style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.2)' }}>
                  Thay đổi Ảnh đại diện của bạn
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '6px' }}>Biệt danh của người ấy:</label>
              <input 
                value={partnerName} onChange={e => setPartnerName(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', outline: 'none'}}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '6px' }}>Đổi hình nền chung:</label>
              <input 
                type="file" accept="image/*"
                onChange={handleBackgroundUpload}
                disabled={uploadingBg}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px dashed rgba(255,255,255,0.3)', cursor: 'pointer', opacity: uploadingBg ? 0.5 : 1}}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
               <div style={{ flex: 1 }}>
                 <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Kích thước nền:</label>
                 <select value={bgSize} onChange={e => setBgSize(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', outline: 'none' }}>
                   <option value="cover" style={{color: 'black'}}>Lấp đầy (Cover)</option>
                   <option value="contain" style={{color: 'black'}}>Vừa vặn (Contain)</option>
                   <option value="100% 100%" style={{color: 'black'}}>Kéo giãn 100%</option>
                 </select>
               </div>
               <div style={{ flex: 1 }}>
                 <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Vị trí nền:</label>
                 <select value={bgPosition} onChange={e => setBgPosition(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', outline: 'none' }}>
                   <option value="center" style={{color: 'black'}}>Giữa (Center)</option>
                   <option value="top" style={{color: 'black'}}>Cạnh trên (Top)</option>
                   <option value="bottom" style={{color: 'black'}}>Cạnh dưới (Bottom)</option>
                   <option value="left" style={{color: 'black'}}>Cạnh trái (Left)</option>
                   <option value="right" style={{color: 'black'}}>Cạnh phải (Right)</option>
                 </select>
               </div>
             </div>

            <div style={{ marginBottom: '24px', padding: '12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', border: '1px solid rgba(255,100,150, 0.2)' }}>
              <label style={{ fontSize: '0.85rem', color: '#ffb2c8', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>🔐 Mã PIN khóa ứng dụng (4 số):</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="number"
                  placeholder={couple?.passcode ? "Đã bật - Nhập mã mới để đổi/gỡ rỗng" : "Nhập 4 số để đặt PIN..."}
                  value={newPasscode} onChange={(e) => setNewPasscode(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: 'none', color: 'white', outline: 'none', letterSpacing: '2px' }}
                />
                <button 
                  onClick={handleUpdatePasscode}
                  style={{ padding: '0 12px', borderRadius: '6px', background: 'rgba(255,75,130,0.8)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                >
                  Lưu PIN
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
               <button 
                  onClick={handleTestPushDelay}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'linear-gradient(45deg, #ff4b82, #ffb2c8)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(255, 75, 130, 0.4)' }}
               >
                  🚀 Bắn Test Thông báo (Độ trễ 5 giây)
               </button>
               <p style={{ fontSize: '0.75rem', color: 'gray', marginTop: '8px', textAlign: 'center' }}>Bấm nút này rồi ẩn app xuống Home screen để test</p>
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
