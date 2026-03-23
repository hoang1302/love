"use client";

import { useState, useEffect } from 'react';
import { useLoveStory } from '@/context/LoveStoryContext';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function MailboxPage() {
  const { couple, user, loading } = useLoveStory();
  const [mails, setMails] = useState<any[]>([]);
  
  // States for new mail
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [lockDate, setLockDate] = useState("");
  const [isSending, setIsSending] = useState(false);

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

  const setQuickDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setLockDate(d.toISOString().split('T')[0]);
  };

  const handleSend = async () => {
    if(!title.trim() || !content.trim() || !lockDate || !couple?.id || !user) {
      toast.error("Vui lòng điền đủ thông tin và chọn ngày mở thư!");
      return;
    }
    
    // Kiểm tra ngày khoá phải ở tương lai
    const selectedDateObj = new Date(lockDate);
    const today = new Date();
    today.setHours(0,0,0,0);
    if(selectedDateObj <= today) {
       toast.error("Ngày mở thư phải là một ngày trong tương lai!");
       return;
    }

    setIsSending(true);
    const toastId = toast.loading("Đang niêm phong thư...");

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
      const targetEmail = isPartner1 ? couple.partner2Email : couple.partner1Email;
      if (targetEmail) {
        const myName = isPartner1 ? (couple.partner1Name || "Bạn") : (couple.partner2Name || "Bạn");
        fetch('/api/email/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
             recipientEmail: targetEmail,
             title: "Thư bí mật mới",
             body: `${myName} đã gửi cho bạn một bức thư bí mật nee`,
             url: window.location.origin + "/dashboard/mailbox"
          })
        }).catch(e => console.error("Gửi mail thất bại", e));
      }

      toast.success("Đã gửi thư xuyên không thời gian!", { id: toastId });
      setShowForm(false);
      setTitle("");
      setContent("");
      setLockDate("");
    } catch (error) {
      console.error("Lỗi khi gửi thư", error);
      toast.error("Gửi thất bại, vui lòng thử lại.", { id: toastId });
    } finally {
      setIsSending(false);
    }
  };

  const handleOpen = async (mailId: string) => {
    if (!couple?.id) return;
    try {
      await updateDoc(doc(db, `Couples/${couple.id}/SecretMails`, mailId), {
        isOpen: true
      });
      // Optionally trigger confetti or toast
      toast.success("Đã mở thư thành công!");
    } catch(e) {
      toast.error("Không thể mở thư lúc này.");
    }
  };

  if (loading || !couple) return <div style={{textAlign: 'center', marginTop: '50px'}}>Đang tải...</div>;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '30px' }}>
      
      <AnimatePresence mode="wait">
        {!showForm ? (
          <motion.div 
            key="btn-compose"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className="glass-panel" style={{ textAlign: 'center', padding: '30px 24px' }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>💌</div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>Gửi lá thư tới tương lai</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '20px' }}>
              Niêm phong một lá thư, và người ấy chỉ có thể đọc được nó khi thời gian cho phép.
            </p>
            <button className="btn-primary" style={{ width: '100%', maxWidth: '300px', fontSize: '1.05rem', padding: '12px' }} onClick={() => setShowForm(true)}>
              Soạn tâm thư
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="form-compose"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              <h3 style={{fontSize: '1.2rem'}}>✍️ Soạn thư bí mật</h3>
              <button style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => setShowForm(false)}>✕</button>
            </div>
            
            <div>
              <input 
                placeholder="Chủ đề lá thư..." 
                value={title} onChange={(e)=>setTitle(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', outline: 'none', fontSize: '1rem'}}
              />
            </div>
            
            <div>
              <textarea 
                placeholder="Trút bầu tâm sự vào đây nhé..." 
                value={content} onChange={(e)=>setContent(e.target.value)}
                style={{ width: '100%', height:'150px', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', outline: 'none', resize: 'vertical', fontSize: '1rem', lineHeight: '1.5'}}
              />
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px' }}>
              <label style={{fontSize: '0.9rem', color: '#ffb2c8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px'}}>
                🔒 Ngày tháo niêm phong:
              </label>
              <input 
                type="date"
                min={new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0]} // Min là ngày mai
                value={lockDate} onChange={(e)=>setLockDate(e.target.value)}
                style={{ width: '100%', padding: '12px', marginTop: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.9)', border: 'none', color: '#333', outline: 'none', fontSize: '1rem', fontWeight: 'bold'}}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', alignSelf: 'center', marginRight: '4px' }}>Chọn nhanh:</span>
                <button className="btn-glass" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setQuickDate(1)}>+1 Ngày</button>
                <button className="btn-glass" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setQuickDate(7)}>+1 Tuần</button>
                <button className="btn-glass" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setQuickDate(30)}>+1 Tháng</button>
              </div>
            </div>

            <button className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1.05rem', marginTop: '8px' }} onClick={handleSend} disabled={isSending}>
              {isSending ? "Đang khóa kỹ..." : "Gửi thư và Niêm phong"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h4 style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', paddingBottom: '8px', borderBottom: '1px dashed rgba(255,255,255,0.2)' }}>Hòm thư của hai ta</h4>
        
        {mails.length === 0 ? (
           <p style={{textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: '20px', fontStyle: 'italic'}}>Chưa có bức thư nào được gửi xuyên không gian...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            <AnimatePresence>
              {mails.map(mail => (
                <motion.div 
                  key={mail.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="glass-panel" 
                  style={{ 
                    padding: '0', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    overflow: 'hidden',
                    position: 'relative',
                    background: mail.isOpen ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                    border: mail.isLocked ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,178,200,0.5)',
                    boxShadow: mail.isOpen ? '0 10px 30px rgba(0,0,0,0.2)' : 'none'
                  }}
                >
                  {/* Decorative Envelope Flap */}
                  <div style={{ 
                    height: mail.isOpen ? '10px' : '60px', 
                    background: mail.isOpen ? 'var(--primary-color)' : 'rgba(255,178,200,0.15)', 
                    borderBottom: mail.isOpen ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.5s ease',
                  }}>
                    {!mail.isOpen && (
                       mail.isLocked ? (
                         <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', border: '1px solid rgba(255,255,255,0.2)' }}>🔒</div>
                       ) : (
                         <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 0 15px var(--primary-color)' }}>💌</div>
                       )
                    )}
                  </div>

                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h4 style={{ marginBottom: '6px', color: mail.isLocked ? 'rgba(255,255,255,0.6)' : 'white', fontSize: '1.1rem' }}>
                      {mail.title}
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ký tên: <span style={{ color: '#ffb2c8', fontWeight: 'bold' }}>{mail.author}</span></p>
                    
                    {mail.isLocked && (
                      <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.2)' }}>
                          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Chiếc khóa sẽ rụng vào</p>
                          <p style={{ fontWeight: 'bold', fontSize: '1rem', color: '#ffb2c8', marginTop: '4px', letterSpacing: '1px' }}>{mail.lockStr}</p>
                        </div>
                      </div>
                    )}
                    
                    {!mail.isLocked && !mail.isOpen && (
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        className="btn-primary" 
                        style={{ marginTop: 'auto', width: '100%', padding: '12px', fontWeight: 'bold', letterSpacing: '1px' }} 
                        onClick={() => handleOpen(mail.id)}
                      >
                        Bóc Thư Ngay
                      </motion.button>
                    )}
                    
                    {/* Nội dung thư hiện ra khi đã mở */}
                    <AnimatePresence>
                      {(!mail.isLocked && mail.isOpen) && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          style={{marginTop: '20px', overflow: 'hidden'}}
                        >
                          <div style={{
                            background: '#fff9fa', 
                            color: '#4a4a4a', 
                            padding: '20px', 
                            borderRadius: '4px',
                            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05), 0 5px 15px rgba(0,0,0,0.1)',
                            fontFamily: "'Courier New', Courier, monospace",
                            position: 'relative'
                          }}>
                            {/* Paper texture lines */}
                            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '20px', width: '2px', background: 'rgba(233, 30, 99, 0.2)' }} />
                            
                            <p style={{
                              whiteSpace: 'pre-wrap', 
                              lineHeight: '1.8', 
                              fontSize: '0.95rem',
                              position: 'relative',
                              zIndex: 1,
                              paddingLeft: '10px'
                            }}>
                              {mail.content}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
