import React from 'react';

const RecommendPapers = ({ selectedPaper, researchPaperList, onPaperSelect }) => {
    return (
        <div className="bg-white shadow-md rounded-lg mt-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Recommended Papers</h3>
            <ul className="space-y-">
                {researchPaperList.map((paper) => (
                    <li 
                        key={paper.id} 
                        className="py-2 hover:bg-gray-100 rounded transition duration-150 ease-in-out cursor-pointer"
                        onClick={() => onPaperSelect(paper)}
                    >
                        <h4 className="font-medium text-gray-700">{paper.title}</h4>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default RecommendPapers;