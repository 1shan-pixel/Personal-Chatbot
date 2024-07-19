import React from 'react';

const PaperDetails = ({ paper, onDownload }) => {
    return (
        <div>
            <h2 className="text-xl font-semibold mb-2">{paper.title}</h2>
            <button onClick={onDownload} className="bg-gray-500 text-white p-2 rounded mt-2">Download PDF</button>
        </div>
    );
};

export default PaperDetails;