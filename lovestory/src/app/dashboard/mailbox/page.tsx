"use client";

import { useState, useEffect } from 'react';
import { useLoveStory } from '@/context/LoveStoryContext';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function MailboxPage() {
  const { couple, user, loading } = useLoveStory();
  const [mails, setMails] = useState<any[]>([]);
  
  // States for new mail
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [lockDate, setLockDate] = useState("");

  useEffect(() => {
    if (!couple?.id) return;
    const q = query(collection(db, `Couples/${couple.id}/SecretMails`), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const currentTime = new Date().getTime();
      const docs = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        let lockTime = 0;
        let lockStr = '';
        if (data.lockUntil) {
          const dateObj = data.lockUntil.toDate ? data.lockUntil.toDate() : new Date(data.lockUntil);
          lockTime = dateObj.getTime();
          lockStr = dateObj.toLocaleDateString('vi-VN');
        }
        
        return {
          id: docSnap.id,
          ...data,
          isLocked: lockTime > currentTime && !data.isOpen,
          lockStr
        };
      });
      setMails(docs);
    });
    return () => unsub();
  }, [couple]);

  const handleSend = async () => {
    if(!title.trim() || !content.trim() || !lockDate || !couple?.id || !user) return;
    try {
      await addDoc(collection(db, `Couples/${couple.id}/SecretMails`), {
        authorId: user.uid,
        author: user.uid === couple.partner1Id ? 'Bạn' : 'Người ấy',
        title,
        content,
        lockUntil: new Date(lockDate),
        isOpen: false,
        createdAt: serverTimestamp()
      });

      const isPartner1 = user.uid === couple.partner1Id;
      const partnerTokens = isPartner1 ? couple.fcmTokens_partner2 : couple.fcmTokens_partner1;
      if (partnerTokens && partnerTokens.length > 0) {
         fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               tokens: partnerTokens,
               title: 'Thư bí mật mới 💌',
               body: 'Người ấy vừa gửi cho bạn một bức thư! Hãy xem khi nào bạn được mở nhé.'
            })
         }).catch(console.error);
      }

      setShowForm(false);
      setTitle("");
      setContent("");
      setLockDate("");
    } catch (error) {
      console.error("Lỗi khi gửi thư", error);
    }
  };

  const handleOpen = async (mailId: string) => {
    if (!couple?.id) return;
    try {
      await updateDoc(doc(db, `Couples/${couple.id}/SecretMails`, mailId), {
        isOpen: true
      });
    } catch(e) {}
  };

  if (loading || !couple) return <div style={{textAlign: 'center', marginTop: '50px'}}>Đang tải...</div>;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '30px' }}>
      
      {!showForm ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Gửi thư tương lai</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
            Viết một lá thư và chọn ngày người ấy được phép mở.
          </p>
          <button className="btn-primary" style={{ width: '100%' }} onClick={() => setShowForm(true)}>
            + Soạn thư mới
          </button>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{fontSize: '1.1rem', marginBottom: '8px'}}>Soạn thư bí mật</h3>
          <input 
            placeholder="Tiêu đề thư..." 
            value={title} onChange={(e)=>setTitle(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', outline: 'none'}}
          />
          <textarea 
            placeholder="Nội dung tâm thư..." 
            value={content} onChange={(e)=>setContent(e.target.value)}
            style={{ width: '100%', height:'100px', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', outline: 'none', resize: 'none'}}
          />
          <div>
            <label style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Ngày được phép mở:</label>
            <input 
              type="date"
              value={lockDate} onChange={(e)=>setLockDate(e.target.value)}
              style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'black', outline: 'none'}}
            />
          </div>
          <div style={{display: 'flex', gap: '10px', marginTop: '8px'}}>
            <button className="btn-glass" style={{flex: 1}} onClick={() => setShowForm(false)}>Hủy</button>
            <button className="btn-primary" style={{flex: 1}} onClick={handleSend}>Gửi khóa</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h4 style={{ color: 'var(--text-secondary)' }}>Hộp thư đến</h4>
        {mails.map(mail => (
          <div key={mail.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {mail.isLocked ? '🔒' : '🔓'} {mail.title}
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Từ: {mail.author}</p>
                {mail.isLocked && (
                  <p style={{ fontSize: '0.85rem', color: '#ffb2c8', marginTop: '4px' }}>
                    Mở được từ: {mail.lockStr}
                  </p>
                )}
              </div>
              
              {!mail.isLocked && !mail.isOpen && (
                <button className="btn-glass" style={{ padding: '8px 16px', fontSize: '0.9rem' }} onClick={() => handleOpen(mail.id)}>
                  Mở thư
                </button>
              )}
            </div>
            
            {/* Nội dung thư khi đã mở */}
            {!mail.isLocked && mail.isOpen && (
              <div style={{marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)'}}>
                <p style={{whiteSpace: 'pre-wrap', lineHeight: '1.5', fontStyle: 'italic'}}>{mail.content}</p>
              </div>
            )}
          </div>
        ))}
        {mails.length === 0 && <p style={{textAlign: 'center', color: 'var(--text-secondary)'}}>Chưa có bức thư hiện tại.</p>}
      </div>
    </div>
  );
}
