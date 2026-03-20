"use client";

import { useState } from 'react';
import toast from 'react-hot-toast';

export default function PasscodeScreen({ 
  correctPasscode, 
  onSuccess 
}: { 
  correctPasscode: string, 
  onSuccess: () => void 
}) {
  const [pin, setPin] = useState("");

  const handleInput = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        if (newPin === correctPasscode) {
          onSuccess();
        } else {
          toast.error("Mã PIN không chính xác!");
          setTimeout(() => setPin(""), 500); // clear after short delay
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'var(--bg-gradient)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 99999,
      color: 'white',
      padding: '20px'
    }}>
      <div className="glass-panel fade-in" style={{ width: '100%', maxWidth: '360px', padding: '40px 20px', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '10px' }}>🔐 Không Gian Riêng Tư</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '30px' }}>
          Vui lòng nhập Mã PIN để mở khóa
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '40px' }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ 
              width: '20px', height: '20px', 
              borderRadius: '50%', 
              background: i < pin.length ? 'var(--primary-color)' : 'rgba(255,255,255,0.2)',
              transition: 'background 0.2s'
            }} />
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', maxWidth: '280px', margin: '0 auto' }}>
          {[1,2,3,4,5,6,7,8,9].map(num => (
            <button 
              key={num}
              onClick={() => handleInput(num.toString())}
              style={{
                aspectRatio: '1', borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontSize: '1.5rem', fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {num}
            </button>
          ))}
          <div />
          <button 
            onClick={() => handleInput('0')}
            style={{
              aspectRatio: '1', borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontSize: '1.5rem', fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            0
          </button>
          <button 
            onClick={handleDelete}
            style={{
              aspectRatio: '1', borderRadius: '50%', background: 'transparent',
              border: 'none', color: 'white', fontSize: '1.2rem', fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
}
