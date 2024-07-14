export const fetchArxivPapers = async (topic) => {
    try {
        const response = await fetch(`http://localhost:5000/arxiv-results?q=${encodeURIComponent(topic)}`);
        const data = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, "text/xml");
        const entries = xmlDoc.getElementsByTagName("entry");
        
        return Array.from(entries).map((entry, index) => ({
            id: index + 1,
            title: entry.getElementsByTagName("title")[0].textContent,
            summary: entry.getElementsByTagName("summary")[0].textContent,
            paper_id: entry.getElementsByTagName("id")[0].textContent,
        }));
    } catch (error) {
        console.error("Error fetching arXiv papers:", error);
        return [];
    }
};

export const extractArxivId = (url) => {
    if (!url) return null;
    const match = url.match(/abs\/([\w.-]+)/);
    return match ? match[1] : null;
};