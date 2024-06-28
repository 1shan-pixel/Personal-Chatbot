
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const { topic } = req.query;
  
  try {
    const response = await fetch(`http://export.arxiv.org/api/query?search_query=all:${topic}&start=0&max_results=10&sortBy=submittedDate&sortOrder=descending`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.text();
    
    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(data);
  } catch (error) {
    console.error('Error fetching from arXiv:', error);
    res.status(500).json({ error: 'Error fetching data from arXiv API' });
  }
};
