"use client";

import { useState, useEffect } from 'react';
import { useLoveStory } from '@/context/LoveStoryContext';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function DashboardOverview() {
  const { couple, loading } = useLoveStory();
  const [days, setDays] = useState(0);
  
  // States for Countdowns
  const [countdowns, setCountdowns] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");

  // Calculate Days Together
  useEffect(() => {
    if(!couple || !couple.startDate) return;
    try {
      const today = new Date();
      const startObj = couple.startDate?.toDate ? couple.startDate.toDate() : new Date(couple.startDate);
      startObj.setHours(0,0,0,0);
      today.setHours(0,0,0,0);
      const diffTime = Math.abs(today.getTime() - startObj.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      setDays(diffDays);
    } catch(e) {
      setDays(0);
    }
  }, [couple]);

  // Fetch Countdowns
  useEffect(() => {
    if (!couple?.id) return;
    const q = query(collection(db, `Couples/${couple.id}/Countdowns`), orderBy('targetDate', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const docs = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        let targetObj = new Date();
        if (data.targetDate) {
          targetObj = data.targetDate.toDate ? data.targetDate.toDate() : new Date(data.targetDate);
        }
        targetObj.setHours(0,0,0,0);
        
        // Calculate remaining days
        let diffTime = targetObj.getTime() - today.getTime();
        let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return {
          id: docSnap.id,
          ...data,
          targetObj,
          diffDays
        };
      }).filter(ev => ev.diffDays >= 0); // Only future or today
      
      setCountdowns(docs);
    });
    return () => unsub();
  }, [couple]);

  const handleAddEvent = async () => {
    if(!eventTitle.trim() || !eventDate || !couple?.id) return;
    try {
      await addDoc(collection(db, `Couples/${couple.id}/Countdowns`), {
        title: eventTitle,
        targetDate: new Date(eventDate),
        createdAt: serverTimestamp()
      });
      setShowAddForm(false);
      setEventTitle("");
      setEventDate("");
    } catch (err) {
      console.error("Lỗi thêm sự kiện", err);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!couple?.id) return;
    if (window.confirm("Bạn có chắc muốn xóa sự kiện đếm ngược này?")) {
      await deleteDoc(doc(db, `Couples/${couple.id}/Countdowns`, id));
    }
  };

  if (loading) return <div style={{textAlign: 'center', marginTop: '50px'}}>Đang tải dữ liệu...</div>;
  if (!couple) return <div style={{textAlign: 'center', marginTop: '50px'}}>Vui lòng đăng nhập trước.</div>;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '30px' }}>
      
      {/* Counter Card */}
      <div className="glass-panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <h3 style={{ color: 'var(--text-secondary)', fontWeight: 400, marginBottom: '16px' }}>
          Đã bên nhau được
        </h3>
        <div style={{ 
          fontSize: '4rem', 
          fontWeight: 800, 
          background: 'linear-gradient(90deg, #ff4b82, #ffb2c8)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: '1'
        }}>
          {days}
        </div>
        <p style={{ marginTop: '10px', fontSize: '1.2rem' }}>ngày</p>
      </div>

      {/* Countdown Events */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h4 style={{ color: 'white', fontSize: '1.1rem' }}>Sự kiện sắp tới</h4>
          <button className="btn-glass" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? "Đóng" : "+ Sự kiện mới"}
          </button>
        </div>

        {showAddForm && (
          <div className="glass-panel fade-in" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
            <input 
              placeholder="Tên sự kiện (VD: Sinh nhật, Du lịch...)" 
              value={eventTitle} onChange={(e)=>setEventTitle(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', outline: 'none'}}
            />
            <input 
              type="date"
              value={eventDate} onChange={(e)=>setEventDate(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'black', outline: 'none'}}
            />
            <button className="btn-primary" onClick={handleAddEvent}>Lưu sự kiện</button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {countdowns.length === 0 && !showAddForm && (
            <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Chưa có sự kiện đếm ngược nào.
              </p>
            </div>
          )}
          {countdowns.map((ev) => (
            <div key={ev.id} className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '1.05rem', marginBottom: '4px' }}>{ev.title}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {ev.targetObj.toLocaleDateString('vi-VN')}
                </p>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div>
                   {ev.diffDays === 0 ? (
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ffb2c8' }}>Hôm nay!</span>
                   ) : (
                    <>
                      <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ff4b82' }}>{ev.diffDays}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '4px' }}>ngày</span>
                    </>
                   )}
                </div>
                <button 
                  onClick={() => handleDeleteEvent(ev.id)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.2rem', cursor: 'pointer', padding: '4px' }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
}
