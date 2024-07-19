import React, { useState } from 'react';
import ChatMessage from './ChatMessage';

const ChatInterface = ({ chatHistory, onSendMessage }) => {
    const [userInput, setUserInput] = useState('');

    const handleSend = () => {
        if (userInput.trim() === '') return;
        onSendMessage(userInput);
        setUserInput('');
    };

    return (
        <div>
            <div className="scroll-area h-96 w-full pr-4 overflow-y-auto">
                {chatHistory.map((msg, index) => (
                    <ChatMessage key={index} message={msg} />
                ))}
            </div>
            <div className="flex w-full mt-2">
                <textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    placeholder="Type your message... (Press Enter to send)"
                    className="flex-grow p-2 border rounded mr-2 resize-none"
                    rows="1"
                />
                <button onClick={handleSend} className="bg-gray-500 text-white p-2 rounded">Send</button>
            </div>
        </div>
    );
};

export default ChatInterface;