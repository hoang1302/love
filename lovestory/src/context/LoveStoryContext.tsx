"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase/config';
import { signInAnonymously, onAuthStateChanged, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, updateDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';

interface CoupleData {
  id: string; // Vừa là Pair Code vừa là Doc ID
  startDate: any;
  anniversaryDate: any;
  partner1Id: string;
  partner2Id: string | null;
  partner1Name?: string;
  partner2Name?: string;
  streak: number;
  lastPostDate_partner1?: any;
  lastPostDate_partner2?: any;
  lastStreakUpdateDate?: any;
}

interface LoveStoryContextType {
  user: User | null;
  couple: CoupleData | null;
  loading: boolean;
  createRoom: (startDateStr: string) => Promise<string>;
  joinRoom: (code: string) => Promise<boolean>;
  logout: () => Promise<void>;
  signupWithEmail: (email: string, pass: string) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  updateNames: (myName: string, partnerName: string) => Promise<void>;
}

const LoveStoryContext = createContext<LoveStoryContextType>({} as LoveStoryContextType);

// Ham tao chuoi ngau nhien
const generatePairCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

export function LoveStoryProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [couple, setCouple] = useState<CoupleData | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Listen for Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signupWithEmail = async (email: string, pass: string) => {
    await createUserWithEmailAndPassword(auth, email, pass);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem('lovestory_paircode');
    setCouple(null);
  };

  const updateNames = async (myName: string, partnerName: string) => {
    if (!couple || !user) return;
    const isPartner1 = user.uid === couple.partner1Id;
    const updates = isPartner1 
      ? { partner1Name: myName, partner2Name: partnerName }
      : { partner2Name: myName, partner1Name: partnerName };
    await updateDoc(doc(db, "Couples", couple.id), updates);
  };

  // 2. Listen for Room Updates if joined
  useEffect(() => {
    if (!user) return;
    
    let unsub: (() => void) | null = null;

    const initRoom = async () => {
      let coupleId = localStorage.getItem('lovestory_paircode');

      if (!coupleId) {
        // Tìm xem user đã tạo phòng chưa (partner1Id)
        let q = query(collection(db, "Couples"), where("partner1Id", "==", user.uid), limit(1));
        let snap = await getDocs(q);

        if (snap.empty) {
          // Nếu không phải là chủ phòng thì có thể là thành viên thứ 2
          q = query(collection(db, "Couples"), where("partner2Id", "==", user.uid), limit(1));
          snap = await getDocs(q);
        }

        if (!snap.empty) {
          coupleId = snap.docs[0].id;
          localStorage.setItem('lovestory_paircode', coupleId);
        }
      }

      if (coupleId) {
        unsub = onSnapshot(doc(db, "Couples", coupleId), (docSnap) => {
          if (docSnap.exists()) {
            setCouple({ id: docSnap.id, ...docSnap.data() } as CoupleData);
          }
        });
      }
    };

    initRoom();

    return () => {
      if (unsub) unsub();
    };
  }, [user]);

  // Create Room
  const createRoom = async (startDateStr: string) => {
    if (!user) throw new Error("Not authenticated");
    const newCode = generatePairCode();
    const coupleRef = doc(db, "Couples", newCode);
    
    const startObj = new Date(startDateStr);
    const today = new Date();
    // Tính số ngày yêu để cấu hình streak ban đầu
    const diffTime = today.getTime() - startObj.getTime();
    const initialStreak = diffTime > 0 ? Math.floor(diffTime / (1000 * 60 * 60 * 24)) : 0;

    await setDoc(coupleRef, {
      startDate: startObj,
      anniversaryDate: startObj,
      partner1Id: user.uid,
      partner2Id: null,
      partner1Name: "Bạn 1",
      partner2Name: "Bạn 2",
      streak: initialStreak,
      lastStreakUpdateDate: null,
      createdAt: serverTimestamp()
    });

    localStorage.setItem('lovestory_paircode', newCode);
    
    setCouple({
      id: newCode,
      startDate: startObj,
      anniversaryDate: startObj,
      partner1Id: user.uid,
      partner2Id: null,
      partner1Name: "Bạn 1",
      partner2Name: "Bạn 2",
      streak: initialStreak
    });
    
    return newCode;
  };

  // Join Room
  const joinRoom = async (code: string) => {
    if (!user) throw new Error("Not authenticated");
    const cleanCode = code.toUpperCase().trim();
    const coupleRef = doc(db, "Couples", cleanCode);
    const docSnap = await getDoc(coupleRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (!data.partner2Id && data.partner1Id !== user.uid) {
        // Phòng còn trống ngai thứ 2
        await updateDoc(coupleRef, { partner2Id: user.uid });
        localStorage.setItem('lovestory_paircode', cleanCode);
        window.location.reload(); // Refresh to catch snapshot
        return true;
      } else if (data.partner1Id === user.uid || data.partner2Id === user.uid) {
        // Đã ở trong phòng này rồi
        localStorage.setItem('lovestory_paircode', cleanCode);
        window.location.reload();
        return true;
      } else {
        throw new Error("Phòng đã đủ 2 người!");
      }
    } else {
      throw new Error("Mã phòng không tồn tại!");
    }
  };

  return (
    <LoveStoryContext.Provider value={{ user, couple, loading, createRoom, joinRoom, logout, signupWithEmail, loginWithEmail, updateNames }}>
      {children}
    </LoveStoryContext.Provider>
  );
}

export const useLoveStory = () => useContext(LoveStoryContext);
