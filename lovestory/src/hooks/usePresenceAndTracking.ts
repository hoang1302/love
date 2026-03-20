"use client";

import { useEffect, useRef } from 'react';
import { useLoveStory } from '@/context/LoveStoryContext';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc, collection, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';

export function usePresenceAndTracking() {
  const { couple, user } = useLoveStory();
  const setupRef = useRef(false);

  useEffect(() => {
    if (!couple?.id || !user || setupRef.current) return;
    setupRef.current = true;

    const isPartner1 = user.uid === couple.partner1Id;
    const myOnlineField = isPartner1 ? 'isOnline_partner1' : 'isOnline_partner2';
    const coupleRef = doc(db, "Couples", couple.id);

    // 1. Cập nhật trạng thái Online
    const updatePresence = (status: boolean) => {
      updateDoc(coupleRef, { [myOnlineField]: status }).catch(() => {});
    };

    updatePresence(true);

    const handleVisibility = () => {
      updatePresence(document.visibilityState === 'visible');
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', () => updatePresence(false));

    // 2. Lắng nghe Nhật ký mới
    let isFirstLoadDiaries = true;
    const unsubDiaries = onSnapshot(collection(db, `Couples/${couple.id}/Diaries`), (snapshot) => {
      if (isFirstLoadDiaries) {
        isFirstLoadDiaries = false;
        return;
      }
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          if (data.authorId !== user.uid) {
             toast("Người ấy vừa viết một Nhật ký mới! 📖", { icon: '❤️', duration: 4000 });
          }
        }
      });
    });

    // 3. Lắng nghe Bucket List
    let isFirstLoadBucket = true;
    const unsubBucket = onSnapshot(collection(db, `Couples/${couple.id}/BucketList`), (snapshot) => {
      if (isFirstLoadBucket) {
        isFirstLoadBucket = false;
        return;
      }
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          toast("Người ấy vừa thêm Mục tiêu mới vào Bucket List! 🎯", { duration: 4000 });
        } else if (change.type === "modified") {
          const data = change.doc.data();
          if (data.isCompleted) {
             toast("Một mục tiêu chung đã hoàn thành! 🎉", { icon: '✅', duration: 4000 });
          }
        }
      });
    });

    // 4. Lắng nghe Thư bí mật
    let isFirstLoadMails = true;
    const unsubMails = onSnapshot(collection(db, `Couples/${couple.id}/SecretMails`), (snapshot) => {
      if (isFirstLoadMails) {
        isFirstLoadMails = false;
        return;
      }
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          if (data.authorId !== user.uid) {
             toast("Bạn vừa nhận được 1 Thư bí mật mới! 💌", { duration: 4000 });
          }
        }
      });
    });

    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      updatePresence(false);
      unsubDiaries();
      unsubBucket();
      unsubMails();
    };
  }, [couple?.id, user]);
}
