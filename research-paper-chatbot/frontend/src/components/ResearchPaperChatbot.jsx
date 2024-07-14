import React, { useState } from 'react';
import SearchBar from './SearchBar';
import PaperList from './PaperList';
import ChatInterface from './ChatInterface';
import PaperDetails from './PaperDetails';
import RecommendedPapers from './RecommendedPapers';
import { fetchArxivPapers, extractArxivId } from '../utils';

const ResearchPaperChatbot = () => {
    const [showPapers, setShowPapers] = useState(false);
    const [selectedPaper, setSelectedPaper] = useState(null);
    const [chatHistory, setChatHistory] = useState([]);
    const [researchPapers, setResearchPapers] = useState([]);

    const handleSearchPapers = async (topic) => {
        const papers = await fetchArxivPapers(topic);
        setResearchPapers(papers);
        setShowPapers(true);
    };

    const handlePaperSelect = (paper) => {
        setSelectedPaper(paper);
        setChatHistory([
            { role: "assistant", content: `Great! Let's discuss the paper titled "${paper.title}". What would you like to know about it?` }
        ]);
    };

    const handleBack = () => {
        if (selectedPaper) {
            setSelectedPaper(null);
            setChatHistory([]);
        } else {
            setShowPapers(false);
            setResearchPapers([]);
        }
    };

    const handleSendMessage = async (userInput) => {
        const updatedHistory = [
            ...chatHistory,
            { role: "user", content: userInput }
        ];

        setChatHistory(updatedHistory);

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
        if (!selectedPaper) return;

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

    return (
        <div className="container mx-auto p-4">
            <div className="card w-full max-w-2xl mx-auto">
                <div className="card-header">
                    <h1 className="text-2xl font-bold text-center">arXiv Paper Chatbot</h1>
                </div>
                <div className="card-content">
                    {!showPapers ? (
                        <SearchBar onSearch={handleSearchPapers} />
                    ) : (
                        <div>
                            <button onClick={handleBack} className="bg-blue-500 text-white p-2 rounded mb-2">Back</button>
                            {!selectedPaper ? (
                                <PaperList papers={researchPapers} onPaperSelect={handlePaperSelect} />
                            ) : (
                                <div>
                                    <ChatInterface
                                        chatHistory={chatHistory}
                                        onSendMessage={handleSendMessage}
                                    />
                                    <PaperDetails paper={selectedPaper} onDownload={handleDownloadPDF} />
                                </div>
                            )}
                            {!selectedPaper?(
                                <h1> No papers</h1>
                                
                            ):(
                                <RecommendedPapers selectedPaper={selectedPaper} researchPaperList={researchPapers} />
                                
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResearchPaperChatbot;
