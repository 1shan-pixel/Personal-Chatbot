import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

const ChatMessage = ({ message }) => {
    return (
        <div className={`flex ${message.role === "human" ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`max-w-3/4 p-3 rounded-lg ${message.role === "user" ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}>
                <ReactMarkdown
                    components={{
                        code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                                <SyntaxHighlighter
                                    style={tomorrow}
                                    language={match[1]}
                                    PreTag="div"
                                    {...props}
                                >
                                    {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                            ) : (
                                <code className={className} {...props}>
                                    {children}
                                </code>
                            )
                        }
                    }}
                >
                    {message.content}
                </ReactMarkdown>
            </div>
        </div>
    );
};

export default ChatMessage;