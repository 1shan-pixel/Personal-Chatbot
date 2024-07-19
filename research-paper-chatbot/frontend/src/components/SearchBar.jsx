import React, { useState } from 'react';

const SearchBar = ({ onSearch }) => {
    const [searchTopic, setSearchTopic] = useState('');

    const handleSearch = () => {
        onSearch(searchTopic);
    };

    return (
        <div>
            <textarea
                value={searchTopic}
                onChange={(e) => setSearchTopic(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSearch();
                    }
                }}
                placeholder="Enter topic to search..."
                className="w-full p-2 border rounded mb-2"
                rows={1}
            />
            <button onClick={handleSearch} className="w-full bg-gray-500 text-white p-2 rounded">Search Papers</button>
        </div>
    );
};

export default SearchBar;