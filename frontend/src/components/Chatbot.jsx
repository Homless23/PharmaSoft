import React, { useEffect, useRef, useState } from 'react';
import { Button, Drawer, FloatButton, Input, Space, Typography } from 'antd';
import { MessageOutlined, CloseOutlined, SendOutlined } from '@ant-design/icons';

const Chatbot = () => {
  const { Text } = Typography;
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: 'Hello. I am your financial assistant. How can I help you today?', sender: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { text: input, sender: 'user' }]);
    setInput('');
    setTimeout(() => {
      setMessages((prev) => [...prev, { text: 'I can help you analyze that. Please check the Analytics tab for a detailed breakdown.', sender: 'bot' }]);
    }, 700);
  };

  return (
    <>
      <FloatButton icon={<MessageOutlined />} onClick={() => setIsOpen(true)} />
      <Drawer
        title="Support Agent"
        placement="right"
        open={isOpen}
        onClose={() => setIsOpen(false)}
        closeIcon={<CloseOutlined />}
      >
        <Space direction="vertical" style={{ width: '100%', height: '100%' }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.map((msg, idx) => (
              <div
                key={`${msg.sender}_${idx}`}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  background: msg.sender === 'user' ? '#1677ff' : '#f5f5f5',
                  color: msg.sender === 'user' ? '#fff' : '#111',
                  padding: '8px 12px',
                  borderRadius: 8,
                  maxWidth: '85%'
                }}
              >
                <Text style={{ color: msg.sender === 'user' ? '#fff' : '#111' }}>{msg.text}</Text>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPressEnter={handleSend}
              placeholder="Type your message..."
            />
            <Button type="primary" icon={<SendOutlined />} onClick={handleSend} />
          </Space.Compact>
        </Space>
      </Drawer>
    </>
  );
};

export default Chatbot;
