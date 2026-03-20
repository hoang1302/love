"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase/config';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

interface CoupleData {
  id: string; // Vừa là Pair Code vừa là Doc ID
  startDate: any;
  anniversaryDate: any;
  partner1Id: string;
  partner2Id: string | null;
  streak: number;
}

interface LoveStoryContextType {
  user: User | null;
  couple: CoupleData | null;
  loading: boolean;
  createRoom: () => Promise<string>;
  joinRoom: (code: string) => Promise<boolean>;
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
      if (currentUser) {
        setUser(currentUser);
      } else {
        // Tự động đăng nhập ẩn danh nếu chưa có account
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Auth error", error);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Listen for Room Updates if joined
  useEffect(() => {
    if (!user) return;
    const coupleId = localStorage.getItem('lovestory_paircode');
    if (coupleId) {
      const unsub = onSnapshot(doc(db, "Couples", coupleId), (docSnap) => {
        if (docSnap.exists()) {
          setCouple({ id: docSnap.id, ...docSnap.data() } as CoupleData);
        }
      });
      return () => unsub();
    }
  }, [user]);

  // Create Room
  const createRoom = async () => {
    if (!user) throw new Error("Not authenticated");
    const newCode = generatePairCode();
    const coupleRef = doc(db, "Couples", newCode);
    
    await setDoc(coupleRef, {
      startDate: serverTimestamp(),
      anniversaryDate: serverTimestamp(), // Default to today
      partner1Id: user.uid,
      partner2Id: null,
      streak: 0,
      createdAt: serverTimestamp()
    });

    localStorage.setItem('lovestory_paircode', newCode);
    // Listen to changes manually will trigger by setting ID in localstorage but requires reload or manual set
    setCouple({
      id: newCode,
      startDate: new Date(),
      anniversaryDate: new Date(),
      partner1Id: user.uid,
      partner2Id: null,
      streak: 0
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
        await setDoc(coupleRef, { partner2Id: user.uid }, { merge: true });
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
    <LoveStoryContext.Provider value={{ user, couple, loading, createRoom, joinRoom }}>
      {children}
    </LoveStoryContext.Provider>
  );
}

export const useLoveStory = () => useContext(LoveStoryContext);
