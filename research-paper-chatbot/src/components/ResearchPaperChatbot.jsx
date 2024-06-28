import React, { useState, useEffect } from 'react';

const fetchArxivPapers = async (topic) => {
  try {
    const response = await fetch(`http://export.arxiv.org/api/query?search_query=all:${topic}&start=0&max_results=10&sortBy=submittedDate&sortOrder=descending`);
    const data = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(data, "text/xml");
    const entries = xmlDoc.getElementsByTagName("entry");

    return Array.from(entries).map((entry, index) => ({
      id: index + 1,
      title: entry.getElementsByTagName("title")[0].textContent,
      summary: entry.getElementsByTagName("summary")[0].textContent,
    }));
  } catch (error) {
    console.error("Error fetching arXiv papers:", error);
    return [];
  }
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

  const handleStartChat = () => {
    setShowPapers(true);
    setChatHistory([{ message: "Hey! Do you want to discuss recent research papers from arXiv?", isUser: false }]);
  };

  const handlePaperSelect = (paper) => {
    setSelectedPaper(paper);
    setChatHistory(prevHistory => [
      ...prevHistory,
      { message: `Great! Let's discuss "${paper.title}". What would you like to know about it?`, isUser: false }
    ]);
  };

  const handleSendMessage = () => {
    if (userInput.trim() === '') return;

    setChatHistory(prevHistory => [
      ...prevHistory,
      { message: userInput, isUser: true },
      { message: `That's an interesting point about "${selectedPaper.title}". Here's a brief summary of the paper: ${selectedPaper.summary}`, isUser: false }
    ]);
    setUserInput('');
  };

  const handleBack = () => {
    if (selectedPaper) {
      setSelectedPaper(null);
    } else {
      setShowPapers(false);
      setSearchTopic('');
      setResearchPapers([]);
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
            <div>
              <input
                type="text"
                value={searchTopic}
                onChange={(e) => setSearchTopic(e.target.value)}
                placeholder="Enter topic to search..."
                className="w-full p-2 border rounded mb-2"
              />
              <button onClick={handleSearchPapers} className="w-full bg-blue-500 text-white p-2 rounded">Search Papers</button>
            </div>
          ) : (
            <div>
              <button onClick={handleBack} className="bg-blue-500 text-white p-2 rounded mb-2">Back</button>
              {!selectedPaper ? (
                <div>
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
                <div className="scroll-area h-96 w-full pr-4 overflow-y-auto">
                  {chatHistory.map((msg, index) => (
                    <div key={index} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'} mb-2`}>
                      <div className={`p-2 rounded-lg ${msg.isUser ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}>
                        {msg.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {selectedPaper && (
          <div className="card-footer flex w-full mt-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-grow p-2 border rounded mr-2"
            />
            <button onClick={handleSendMessage} className="bg-blue-500 text-white p-2 rounded">Send</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResearchPaperChatbot;
