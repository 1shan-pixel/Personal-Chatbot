import React from 'react';

const PaperList = ({ papers, onPaperSelect }) => {
    return (
        <div>
            <h2 className="text-xl font-semibold mb-2">Select a recent paper to discuss:</h2>
            <div className="scroll-area h-96 overflow-y-auto">
                {papers.map(paper => (
                    <button 
                        key={paper.id} 
                        onClick={() => onPaperSelect(paper)} 
                        className="w-full mb-2 text-left p-2 border rounded hover:bg-gray-200"
                    >
                        {paper.title}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default PaperList;