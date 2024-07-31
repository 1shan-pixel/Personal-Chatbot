import React from 'react';

const PaperDetails = ({ paper, onDownload }) => {
    return (
        <div>
            <button onClick={onDownload} className="bg-gray-500 text-white p-2 rounded mt-2">Download PDF</button>
        </div>
    );
};

export default PaperDetails;