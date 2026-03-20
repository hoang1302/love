"use client";

import { useState, useEffect } from 'react';
import { useLoveStory } from '@/context/LoveStoryContext';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function BucketListPage() {
  const { couple, user, loading } = useLoveStory();
  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    if (!couple?.id) return;
    const q = query(collection(db, `Couples/${couple.id}/BucketList`), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setItems(docs);
    });
    return () => unsub();
  }, [couple]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!newItem.trim() || !couple?.id) return;
    try {
      await addDoc(collection(db, `Couples/${couple.id}/BucketList`), {
        title: newItem,
        isCompleted: false,
        completedBy_partner1: false,
        completedBy_partner2: false,
        createdAt: serverTimestamp()
      });
      setNewItem("");
    } catch(err) {}
  };

  const toggleMyTick = async (item: any) => {
    if (!couple?.id || !user) return;
    const isPartner1 = user.uid === couple.partner1Id;

    // Lấy trạng thái tương thích dữ liệu cũ
    let currentP1 = item.completedBy_partner1 !== undefined ? item.completedBy_partner1 : item.isCompleted;
    let currentP2 = item.completedBy_partner2 !== undefined ? item.completedBy_partner2 : item.isCompleted;
    
    let newP1 = currentP1;
    let newP2 = currentP2;

    if (isPartner1) newP1 = !newP1;
    else newP2 = !newP2;

    const isCompleted = newP1 && newP2;

    await updateDoc(doc(db, `Couples/${couple.id}/BucketList`, item.id), {
      completedBy_partner1: newP1,
      completedBy_partner2: newP2,
      isCompleted: isCompleted,
      completedAt: isCompleted ? serverTimestamp() : null
    });
  };

  const deleteItem = async (id: string) => {
    if (!couple?.id) return;
    if (window.confirm("Xóa mục này?")) {
      await deleteDoc(doc(db, `Couples/${couple.id}/BucketList`, id));
    }
  };

  if (loading || !couple) return <div style={{textAlign: 'center', marginTop: '50px'}}>Đang tải...</div>;

  const completedCount = items.filter(i => i.isCompleted).length;
  const progress = items.length === 0 ? 0 : Math.round((completedCount / items.length) * 100);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '30px' }}>
      
      <div className="glass-panel" style={{ textAlign: 'center', padding: '30px 20px' }}>
        <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Bucket List</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
          Những điều chúng ta muốn làm cùng nhau
        </p>
        
        {/* Progress bar */}
        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #ff4b82, #ffb2c8)', transition: 'width 0.5s' }} />
        </div>
        <p style={{ fontSize: '0.8rem', color: '#ffb2c8' }}>Đã hoàn thành {completedCount}/{items.length} ({progress}%)</p>
      </div>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '8px' }}>
        <input 
          placeholder="Thêm mục tiêu mới..." 
          value={newItem} onChange={(e)=>setNewItem(e.target.value)}
          style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', outline: 'none'}}
        />
        <button type="submit" className="btn-primary" style={{ padding: '0 20px' }}>Thêm</button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {items.map(item => {
          const isPartner1 = user?.uid === couple?.partner1Id;
          const myName = isPartner1 ? (couple?.partner1Name || "Bạn") : (couple?.partner2Name || "Bạn");
          const theirName = isPartner1 ? (couple?.partner2Name || "Người ấy") : (couple?.partner1Name || "Người ấy");

          const currentP1 = item.completedBy_partner1 !== undefined ? item.completedBy_partner1 : item.isCompleted;
          const currentP2 = item.completedBy_partner2 !== undefined ? item.completedBy_partner2 : item.isCompleted;

          const myTick = isPartner1 ? currentP1 : currentP2;
          const theirTick = isPartner1 ? currentP2 : currentP1;

          return (
          <div key={item.id} className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', opacity: item.isCompleted ? 0.6 : 1, transition: 'opacity 0.3s' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
              <span style={{ fontSize: '1rem', textDecoration: item.isCompleted ? 'line-through' : 'none', fontWeight: item.isCompleted ? 'normal' : '500' }}>
                {item.title}
              </span>
              
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={myTick || false} 
                    onChange={() => toggleMyTick(item)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#ff4b82' }}
                  />
                  <span style={{ color: myTick ? 'var(--primary-color)' : 'var(--text-secondary)' }}>{myName} tick</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', opacity: 0.8 }}>
                  <input 
                    type="checkbox" 
                    checked={theirTick || false} 
                    readOnly
                    onClick={(e) => { e.preventDefault(); alert("Chỉ người ấy mới có quyền xác nhận mục này của họ!"); }}
                    style={{ width: '16px', height: '16px', cursor: 'not-allowed', accentColor: '#ff4b82' }}
                  />
                  <span style={{ color: theirTick ? 'var(--primary-color)' : 'var(--text-secondary)' }}>{theirName} tick</span>
                </label>
              </div>
            </div>

            <button 
              onClick={() => deleteItem(item.id)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.2rem', cursor: 'pointer', padding: '4px', marginLeft: '12px' }}
            >
              ✕
            </button>
          </div>
        )})}
        {items.length === 0 && (
          <p style={{textAlign: 'center', color: 'var(--text-secondary)', marginTop: '20px'}}>Chưa có mục tiêu nào. Hãy thảo luận và thêm vào nhé!</p>
        )}
      </div>
    </div>
  );
}
