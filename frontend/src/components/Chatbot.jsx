import React, { useState, useRef, useEffect } from 'react';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Hello. I am your financial assistant. How can I help you today?", sender: "bot" }
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { text: input, sender: "user" }];
    setMessages(newMessages);
    setInput("");

    setTimeout(() => {
      setMessages(prev => [...prev, { 
        text: "I can help you analyze that. Please check the Analytics tab for a detailed breakdown.", 
        sender: "bot" 
      }]);
    }, 1000);
  };

  return (
    <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000, fontFamily: 'Inter, sans-serif' }}>
      
      {/* 1. TOGGLE BUTTON (Professional & Subtle) */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          style={{
            width: '56px', height: '56px',
            borderRadius: '50%',
            background: '#2563eb', // Solid Blue
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            fontSize: '1.5rem',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)', // Subtle shadow
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
        >
          💬
        </button>
      )}

      {/* 2. CHAT WINDOW */}
      {isOpen && (
        <div className="glass-card" style={{
            width: '340px',
            height: '480px',
            display: 'flex', flexDirection: 'column',
            padding: '0', 
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px', // Sharper corners = more professional
            background: '#09090b'
        }}>
            
            {/* HEADER */}
            <div style={{
                padding: '1rem',
                background: '#1e293b', // Slate Dark Grey
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                color: '#fff'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></div> {/* Online Status Dot */}
                    <span style={{ fontWeight: '500', fontSize: '0.95rem' }}>Support Agent</span>
                </div>
                <button 
                    onClick={() => setIsOpen(false)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.1rem', cursor: 'pointer' }}
                >
                    ✕
                </button>
            </div>

            {/* MESSAGES */}
            <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {messages.map((msg, idx) => (
                    <div key={idx} style={{
                        alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                        background: msg.sender === 'user' ? '#2563eb' : '#1e293b', // Blue for User, Grey for Bot
                        color: msg.sender === 'user' ? '#fff' : '#e2e8f0',
                        padding: '0.6rem 0.9rem',
                        borderRadius: '6px', // Square corners usually feel more "business"
                        maxWidth: '85%',
                        lineHeight: '1.4',
                        fontSize: '0.9rem',
                    }}>
                        {msg.text}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* INPUT */}
            <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: '#09090b' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your message..."
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        style={{
                            flex: 1,
                            padding: '10px 12px',
                            borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.03)',
                            color: '#fff',
                            fontSize: '0.9rem',
                            outline: 'none'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                    <button 
                        onClick={handleSend}
                        style={{
                            background: '#2563eb',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0 1rem',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        ➤
                    </button>
                </div>
            </div>

        </div>
      )}
    </div>
  );
};

export default Chatbot;