import React from 'react';

const RecommendPapers = ({ selectedPaper, researchPaperList }) => {
    return (
        <div>
            <h3>Recommended Papers</h3>
            <ul>
                {researchPaperList.map((paper) => (
                    <li key={paper.id}>
                     
                            {paper.title}
                     
                     
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default RecommendPapers;
