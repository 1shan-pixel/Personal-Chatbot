import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

const fetchArxivPapers = async (topic) => {

    try {
        const response = await fetch(`http://export.arxiv.org/api/query?search_query=all:${topic}&start=0&max_results=10&sortBy=submittedDate&sortOrder=descending`);
        const data = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, "text/xml");
        const entries = xmlDoc.getElementsByTagName("entry");
        
        console.log(entries[0].getElementsByTagName("title"))
        return Array.from(entries).map((entry, index) => ({
            id: index + 1,
            title: entry.getElementsByTagName("title")[0].textContent,
            summary: entry.getElementsByTagName("summary")[0].textContent,
            paper_id: entry.getElementsByTagName("id")[0].textContent, // even though there's only one of these things , I can't figure out why [0] needs to be done..
        }));
        //look up arXiv's official response structure to understand why I did this. 

    } catch (error) {
        console.error("Error fetching arXiv papers:", error);
        return [];
    }
};
//basically takes out the arXivid from the given pdf url , done becuase its easy to download that way using arXiv-downloader
const extractArxivId = (url) => {
    if (!url) return null;  // Handle case where url is undefined or null
    const match = url.match(/abs\/([\w.-]+)/);
    return match ? match[1] : null;
};

//dont understand shit here, basically makes the chat interface preety , a usual response from the chatbot might be clustered with different symbols , this basically formats them in an understandable way. 
const ChatMessage = ({ message }) => {
    return (
        <div className={`flex ${message.role === "user" ? 'justify-end' : 'justify-start'} mb-4`}>
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

const ResearchPaperChatbot = () => {
    const [showPapers, setShowPapers] = useState(false);
    const [selectedPaper, setSelectedPaper] = useState(null);
    const [chatHistory, setChatHistory] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [searchTopic, setSearchTopic] = useState('');
    const [researchPapers, setResearchPapers] = useState([]);

    const handleSearchPapers = async () => {
        const papers = await fetchArxivPapers(searchTopic);
        setResearchPapers(papers);
        setShowPapers(true);
    };

    const handlePaperSelect = (paper) => {
        setSelectedPaper(paper);
        setChatHistory([
            { role: "assistant", content: `Great! Let's discuss the paper titled "${paper.title}". What would you like to know about it?` }
        ]);
    };

    const handleSendMessage = async () => {
        if (userInput.trim() === '' || !selectedPaper) return;

        const updatedHistory = [
            ...chatHistory,
            { role: "user", content: userInput }
        ];

        setChatHistory(updatedHistory);
        setUserInput('');

        try {
            const response = await fetch('http://localhost:5000/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chatHistory: updatedHistory,
                    paperInfo: {
                        title: selectedPaper.title,
                        summary: selectedPaper.summary
                    }
                }),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();

            setChatHistory(prevHistory => [...prevHistory, data]);
        } catch (error) {
            console.error("Error getting response from server:", error);
            setChatHistory(prevHistory => [
                ...prevHistory,
                { role: "assistant", content: "I'm sorry, I encountered an error while processing your request." }
            ]);
        }
    };

    const handleDownloadPDF = async () => {
        if (!selectedPaper) {
            console.error("No paper selected.");
            return;
        }

        const { title, paper_id } = selectedPaper;
        const arXivId = extractArxivId(paper_id);

        try {
            const response = await fetch('http://localhost:5000/download-arxiv-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    arXiv_id: arXivId,
                    paper_title: title
                }),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            console.log(data); // Handle success message from server
        } catch (error) {
            console.error("Error downloading PDF:", error);
            // Handle error message
        }
    };

    const handleBack = () => {
        if (selectedPaper) {
            setSelectedPaper(null);
            setChatHistory([]);
        } else {
            setShowPapers(false);
            setSearchTopic('');
            setResearchPapers([]);
        }
    };


    //finally all the functions have been defined damn 177 lines huh
    return (
        <div className="container mx-auto p-4">
            <div className="card w-full max-w-2xl mx-auto">
                <div className="card-header">
                    <h1 className="text-2xl font-bold text-center">arXiv Paper Chatbot</h1>
                </div>
                <div className="card-content">
                    {!showPapers ? (
                        <div>
                           
                            <textarea
                            value={searchTopic}
                            onChange={(e) => setSearchTopic(e.target.value)}
                            onKeyDown ={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSearchPapers();
                                }
                            }}
                                  placeholder="Enter topic to search..."
                                className="w-full p-2 border rounded mb-2"
                                rows={1}
                          
                        />
                            <button onClick={handleSearchPapers} className="w-full bg-blue-500 text-white p-2 rounded">Search Papers</button>
                        </div>
                    ) : (
                        <div>
                            <button onClick={handleBack} className="bg-blue-500 text-white p-2 rounded mb-2">Back</button>
                            {!selectedPaper ? (
                                <div>        setResearchPapers(papers);

                                    <h2 className="text-xl font-semibold mb-2">Select a recent paper to discuss:</h2>
                                    <div className="scroll-area h-96 overflow-y-auto">
                                        {researchPapers.map(paper => (
                                            <button key={paper.id} onClick={() => handlePaperSelect(paper)} className="w-full mb-2 text-left p-2 border rounded hover:bg-gray-200">
                                                {paper.title}
                                            </button>
                                        ))}
                                    </div>
                                    </div>
                            ) : (
                                <div>
                                    <h2 className="text-xl font-semibold mb-2">{selectedPaper.title}</h2>
                                    <div className="scroll-area h-96 w-full pr-4 overflow-y-auto">
                                        {chatHistory.map((msg, index) => (
                                            <ChatMessage key={index} message={msg} />
                                        ))}
                                    </div>
                                    <button onClick={handleDownloadPDF} className="bg-blue-500 text-white p-2 rounded mt-2">Download PDF</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {selectedPaper && (
                    <div className="card-footer flex w-full mt-2">
                        <textarea
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyDown ={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder="Type your message... (Press Enter to send)"
                            className="flex-grow p-2 border rounded mr-2 resize-none"
                            rows="2"
                        />
                        <button onClick={handleSendMessage} className="bg-blue-500 text-white p-2 rounded">Send</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResearchPaperChatbot;
