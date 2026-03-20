"use client";

import { useState, useEffect } from 'react';
import { useLoveStory } from '@/context/LoveStoryContext';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function DiaryPage() {
  const { couple, user, loading } = useLoveStory();
  const [entries, setEntries] = useState<any[]>([]);
  const [newText, setNewText] = useState("");
  const [mood, setMood] = useState("🥰");
  const MOODS = ['🥰', '😆', '😊', '😢', '😡', '😮‍💨'];

  useEffect(() => {
    if (!couple?.id) return;
    const q = query(collection(db, `Couples/${couple.id}/Diaries`), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => {
        const data = doc.data();
        let dateStr = '';
        if (data.date) {
          const dateObj = data.date.toDate ? data.date.toDate() : new Date(data.date);
          dateStr = dateObj.toLocaleString('vi-VN');
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
      
      const isSameDay = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
      };

      const updates: any = {};
      
      if (isPartner1) {
        updates.lastPostDate_partner1 = serverTimestamp();
      } else {
        updates.lastPostDate_partner2 = serverTimestamp();
      }

      // Kiểm tra xem người kia đã gửi hôm nay chưa
      const otherPartnerDate = isPartner1 ? couple.lastPostDate_partner2 : couple.lastPostDate_partner1;
      let otherPostedToday = false;
      if (otherPartnerDate) {
        const d = otherPartnerDate.toDate ? otherPartnerDate.toDate() : new Date(otherPartnerDate);
        otherPostedToday = isSameDay(today, d);
      }

      let streakUpdatedToday = false;
      if (couple.lastStreakUpdateDate) {
         const sd = couple.lastStreakUpdateDate.toDate ? couple.lastStreakUpdateDate.toDate() : new Date(couple.lastStreakUpdateDate);
         streakUpdatedToday = isSameDay(today, sd);
      }

      if (otherPostedToday && !streakUpdatedToday) {
        updates.streak = (couple.streak || 0) + 1;
        updates.lastStreakUpdateDate = serverTimestamp();
      }

      // Gửi package cập nhật vào DB
      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, "Couples", couple.id), updates);
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

      {/* Diary Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
        {entries.map(entry => (
          <div key={entry.id} className="glass-panel" style={{ padding: '16px', borderLeft: entry.authorId === user?.uid ? '4px solid var(--primary-color)' : '4px solid var(--secondary-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600, color: entry.authorId === user?.uid ? 'var(--primary-color)' : 'var(--secondary-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {entry.authorId === user?.uid ? 'Bạn' : 'Người ấy'}
                {entry.mood && <span>{entry.mood}</span>}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {entry.dateStr}
              </span>
            </div>
            <p style={{ lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{entry.text}</p>
          </div>
        ))}
        {entries.length === 0 && <p style={{textAlign: 'center', color: 'var(--text-secondary)'}}>Chưa có dòng nhật ký nào. Hãy viết bài đầu tiên nhé!</p>}
      </div>
    </div>
  );
}
