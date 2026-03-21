"use client";

import { useState, useEffect } from 'react';
import { useLoveStory } from '@/context/LoveStoryContext';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

// Helper để parse Firestore Timestamp (tránh lỗi object trắng khi offline)
const parseFBDate = (val: any) => {
  if (!val) return null;
  if (val.toDate) return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  return new Date(val);
};

const isSameDay = (d1: Date, d2: Date) => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

export default function DiaryPage() {
  const { couple, user, loading } = useLoveStory();
  const [entries, setEntries] = useState<any[]>([]);
  const [newText, setNewText] = useState("");
  const [mood, setMood] = useState("🥰");
  const MOODS = ['🥰', '😆', '😊', '😢', '😡', '😮‍💨'];

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    if (!couple?.id) return;
    const q = query(collection(db, `Couples/${couple.id}/Diaries`), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => {
        const data = doc.data();
        let dateStr = '';
        const d = parseFBDate(data.date);
        if (d && !isNaN(d.getTime())) {
          dateStr = d.toLocaleString('vi-VN');
        }
        return {
          id: doc.id,
          ...data,
          dateStr
        };
      });
      setEntries(docs);
    });
    return () => unsub();
  }, [couple]);

  const handlePost = async () => {
    if(!newText.trim() || !couple?.id || !user) return;
    try {
      // 1. Gửi bài
      await addDoc(collection(db, `Couples/${couple.id}/Diaries`), {
        authorId: user.uid,
        author: user.uid === couple.partner1Id ? 'Bạn' : 'Người ấy',
        text: newText,
        mood: mood,
        date: serverTimestamp()
      });

      // 2. Cập nhật Streak
      const isPartner1 = user.uid === couple.partner1Id;
      const today = new Date();

      const updates: any = {};
      
      if (isPartner1) {
        updates.lastPostDate_partner1 = serverTimestamp();
      } else {
        updates.lastPostDate_partner2 = serverTimestamp();
      }

      // Kiểm tra xem người kia đã gửi hôm nay chưa
      const otherPartnerDate = isPartner1 ? couple.lastPostDate_partner2 : couple.lastPostDate_partner1;
      const otherPartnerDateParsed = parseFBDate(otherPartnerDate);
      
      let otherPostedToday = false;
      if (otherPartnerDateParsed && !isNaN(otherPartnerDateParsed.getTime())) {
        otherPostedToday = isSameDay(today, otherPartnerDateParsed);
      }

      let streakUpdatedToday = false;
      const lastUpdateParsed = parseFBDate(couple.lastStreakUpdateDate);
      if (lastUpdateParsed && !isNaN(lastUpdateParsed.getTime())) {
         streakUpdatedToday = isSameDay(today, lastUpdateParsed);
      }

      if (otherPostedToday && !streakUpdatedToday) {
        updates.streak = increment(1); // Auto increment an toàn
        updates.lastStreakUpdateDate = serverTimestamp();
      }

      // Gửi package cập nhật vào DB
      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, "Couples", couple.id), updates);
      }
      
      const partnerTokens = isPartner1 ? couple.fcmTokens_partner2 : couple.fcmTokens_partner1;
      if (partnerTokens && partnerTokens.length > 0) {
         fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               tokens: partnerTokens,
               title: 'Nhật ký mới 📖',
               body: 'Người ấy vừa viết một dòng nhật ký mới, vào xem ngay!'
            })
         }).catch(console.error);
      }

      setNewText("");
      setMood('🥰');
    } catch (error) {
      console.error("Lỗi khi gửi nhật ký", error);
    }
  };

  const handleExportCSV = () => {
    if (entries.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + "Date,Author,Mood,Content\n"
      + entries.map(e => `"${e.dateStr}","${e.author}","${e.mood || ''}","${e.text.replace(/"/g, '""')}"`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `LoveStory_Diary_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasEntry = (date: Date) => {
    return entries.some(e => {
       const ed = parseFBDate(e.date);
       return ed && !isNaN(ed.getTime()) && isSameDay(date, ed);
    });
  };

  const displayEntries = entries.filter(e => {
     if (!selectedDate) return false;
     const ed = parseFBDate(e.date);
     if (!ed || isNaN(ed.getTime())) return false;
     return isSameDay(selectedDate, ed);
  });

  if (loading || !couple) return <div style={{textAlign: 'center', marginTop: '50px'}}>Đang tải...</div>;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      
      {/* Header Info area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.2rem' }}>Thước phim kỷ niệm</h3>
        <button className="btn-glass" onClick={handleExportCSV} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
          ⬇️ Xuất CSV
        </button>
      </div>

      {/* Input Area */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <textarea 
          placeholder="Bạn đang nghĩ gì thế?..." 
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          style={{
            width: '100%',
            height: '80px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '12px',
            color: 'white',
            padding: '12px',
            fontFamily: 'inherit',
            resize: 'none',
            outline: 'none',
            marginBottom: '8px'
          }}
        />
        
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Cảm xúc: </span>
          {MOODS.map(m => (
            <button 
              key={m} 
              onClick={() => setMood(m)}
              style={{ 
                background: mood === m ? 'rgba(255,255,255,0.2)' : 'transparent',
                border: mood === m ? '1px solid rgba(255,255,255,0.4)' : '1px solid transparent',
                borderRadius: '50%',
                fontSize: '1.2rem',
                padding: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                lineHeight: '1'
              }}
            >
              {m}
            </button>
          ))}
        </div>

        <button className="btn-primary" style={{ width: '100%' }} onClick={handlePost}>
          Gửi lên chung
        </button>
      </div>

      {/* Calendar Section */}
      <div className="glass-panel" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}>◀</button>
          <span style={{ fontWeight: 'bold' }}>Tháng {currentMonth.getMonth() + 1}, {currentMonth.getFullYear()}</span>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}>▶</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center', marginBottom: '8px' }}>
          {['CN','T2','T3','T4','T5','T6','T7'].map(d => <div key={d} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{d}</div>)}
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
          {(() => {
             const year = currentMonth.getFullYear();
             const month = currentMonth.getMonth();
             const firstDay = new Date(year, month, 1).getDay();
             const daysInMonth = new Date(year, month + 1, 0).getDate();
             const cells = [];

             for (let i = 0; i < firstDay; i++) {
                cells.push(<div key={`empty-${i}`} />);
             }

             for (let i = 1; i <= daysInMonth; i++) {
                const d = new Date(year, month, i);
                const isSelected = selectedDate && isSameDay(d, selectedDate);
                const isToday = isSameDay(d, new Date());
                const highlighted = hasEntry(d);
                
                cells.push(
                  <div 
                    key={`day-${i}`} 
                    onClick={() => setSelectedDate(d)}
                    style={{
                      aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      background: isSelected ? 'var(--primary-color)' : (isToday ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)'),
                      borderRadius: '8px', cursor: 'pointer',
                      border: isToday ? '1px solid rgba(255,255,255,0.4)' : '1px solid transparent',
                      position: 'relative'
                    }}
                  >
                    <span style={{ fontSize: '0.9rem', fontWeight: isSelected || isToday ? 'bold' : 'normal' }}>{i}</span>
                    {highlighted && (
                      <div style={{ width: '5px', height: '5px', background: isSelected ? 'white' : 'var(--primary-color)', borderRadius: '50%', marginTop: '2px' }} />
                    )}
                  </div>
                );
             }
             return cells;
          })()}
        </div>
      </div>

      {/* Diary Timeline for Selected Date */}
      <div>
        <h4 style={{ marginBottom: '16px', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
           Nhật ký ngày {selectedDate.toLocaleDateString('vi-VN')}
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {displayEntries.map(entry => (
            <div key={entry.id} className="glass-panel" style={{ padding: '16px', borderLeft: entry.authorId === user?.uid ? '4px solid var(--primary-color)' : '4px solid var(--secondary-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: entry.authorId === user?.uid ? 'var(--primary-color)' : 'var(--secondary-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {(() => {
                    const isViewerPartner1 = user?.uid === couple?.partner1Id;
                    const myName = isViewerPartner1 ? couple?.partner1Name : couple?.partner2Name;
                    const theirName = isViewerPartner1 ? couple?.partner2Name : couple?.partner1Name;
                    
                    const myAvatar = isViewerPartner1 ? couple?.partner1Avatar : couple?.partner2Avatar;
                    const theirAvatar = isViewerPartner1 ? couple?.partner2Avatar : couple?.partner1Avatar;
                    
                    const avatar = entry.authorId === user?.uid ? myAvatar : theirAvatar;
                    const name = entry.authorId === user?.uid ? (myName || 'Bạn') : (theirName || 'Người ấy');
                    
                    return (
                      <>
                        {avatar ? (
                          <img src={avatar} alt="avatar" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'white' }}>{name.charAt(0)}</div>
                        )}
                        <span>{name}</span>
                      </>
                    )
                  })()}
                  {entry.mood && <span style={{ marginLeft: '4px' }}>{entry.mood}</span>}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {entry.dateStr}
                </span>
              </div>
              <p style={{ lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{entry.text}</p>
            </div>
          ))}
          {displayEntries.length === 0 && <p style={{textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: '20px'}}>Không có dòng nhật ký nào trong ngày này.</p>}
        </div>
      </div>
    </div>
  );
}
