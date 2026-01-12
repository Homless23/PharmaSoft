import React, { useState, useRef, useEffect } from 'react';
import './Chatbot.css';

const QA_DB = [
    { keys: ["hi", "hello", "hey"], answer: "Hello! I am your ExpenseTracker assistant. Ask me how to use the app!" },
    { keys: ["add", "create", "new"], answer: "To add a transaction, fill out the form on the left side of the dashboard and click 'Add Expense'." },
    { keys: ["delete", "remove", "trash"], answer: "You can delete an expense by clicking the 🗑️ (Trash) icon next to any item in the history list." },
    { keys: ["edit", "change", "update"], answer: "Click the ✏️ (Pencil) icon next to a transaction to edit it. The form will pre-fill with the details." },
    { keys: ["pdf", "export", "download"], answer: "Click the '📄 Export PDF' button above the history list to download a report of your filtered expenses." },
    { keys: ["currency", "dollar", "rupee", "euro"], answer: "You can switch currencies (NPR, USD, EUR, INR) using the dropdown menu in the top navigation bar." },
    { keys: ["search", "find"], answer: "Use the search bar above the history list to find expenses by title or category (e.g., 'Food')." },
    { keys: ["budget", "limit"], answer: "In the 'Budgets' card, type a number in the input box next to a category to set a spending limit." },
    { keys: ["dark", "light", "mode", "theme"], answer: "Toggle Dark/Light mode by clicking the sun/moon icon ☀️/🌙 in the navbar." },
    { keys: ["who", "author", "made"], answer: "This app was built by Ashish using the MERN Stack (MongoDB, Express, React, Node)." }
];

function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { text: "Hi! 👋 I can help you use this app. Ask me anything!", sender: "bot" }
    ]);
    const [input, setInput] = useState("");
    const endRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        // 1. Add User Message
        const userMsg = { text: input, sender: "user" };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");

        // 2. Simulate Bot Thinking
        setTimeout(() => {
            const lowerInput = userMsg.text.toLowerCase();
            let botResponse = "I'm mostly trained on ExpenseTracker features. Try asking 'How to add expense?' or 'How to export PDF?'";
            
            // 3. Find Best Match
            const match = QA_DB.find(qa => qa.keys.some(k => lowerInput.includes(k)));
            if (match) botResponse = match.answer;

            setMessages((prev) => [...prev, { text: botResponse, sender: "bot" }]);
        }, 600);
    };

    return (
        <div className="chatbot-wrapper">
            {/* Toggle Button */}
            <button 
                className={`chat-toggle ${isOpen ? 'open' : ''}`} 
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? '✕' : '💬'}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="chat-window">
                    <div className="chat-header">
                        <span>🤖 ExpenseBot Support</span>
                    </div>
                    
                    <div className="chat-body">
                        {messages.map((msg, i) => (
                            <div key={i} className={`chat-msg ${msg.sender}`}>
                                {msg.text}
                            </div>
                        ))}
                        <div ref={endRef}></div>
                    </div>

                    <form className="chat-input-area" onSubmit={handleSend}>
                        <input 
                            placeholder="Type a question..." 
                            value={input} 
                            onChange={(e) => setInput(e.target.value)} 
                        />
                        <button type="submit">➤</button>
                    </form>
                </div>
            )}
        </div>
    );
}

export default Chatbot;