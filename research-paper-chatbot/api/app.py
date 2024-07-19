from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from groq import Groq
import requests
import subprocess
import spacy
from serpapi import GoogleSearch
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_groq import ChatGroq
from langchain.memory import ConversationBufferMemory
from langchain.schema import Document
#from langchain_openai import OpenAIEmbeddings
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_astradb import AstraDBVectorStore


load_dotenv()

app = Flask(__name__)
CORS(app)

groq_api_key = os.getenv("GROQ_API_KEY")
OpenAi_api_key = os.getenv("OPENAI_API_KEY")
client = Groq(api_key=groq_api_key)

nlp = spacy.load("en_core_web_sm")

# Initialize memory
conversation_memory = ConversationBufferMemory(return_messages=True)

# Initialize Astra DB for paper memory
astra_db_id = os.getenv("ASTRA_DB_ID")
astra_db_application_token = os.getenv("ASTRA_DB_APPLICATION_TOKEN")
astra_db_api_endpoint = os.getenv("ASTRA_DB_API_ENDPOINT")


embeddings = HuggingFaceEmbeddings()

paper_vector_store = AstraDBVectorStore(
    embedding=embeddings,
    collection_name="research_papers",
    api_endpoint=astra_db_api_endpoint,
    token=astra_db_application_token,
)


def preprocess_text(text):
    doc = nlp(text.lower())
    return " ".join([token.lemma_ for token in doc if not token.is_stop and not token.is_punct and token.pos_ in ['NOUN', 'PROPN', 'ADJ', 'VERB']])

def extract_keywords(text, n=10):
    processed_text = preprocess_text(text)
    doc = nlp(processed_text)
    return [token.text for token in doc][:n]

def calculate_similarity(text1, text2):
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform([text1, text2])
    return cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]

def recommend_papers(target_paper, all_papers, n_recommendations=5):
    target_text = preprocess_text(target_paper['title'] + " " + target_paper['summary'])
    similarities = []
    
    for paper in all_papers:
        if paper['id'] != target_paper['id']:
            paper_text = preprocess_text(paper['title'] + " " + paper['summary'])
            similarity = calculate_similarity(target_text, paper_text)
            similarities.append((paper, similarity))
    
    similarities.sort(key=lambda x: x[1], reverse=True)
    return [paper for paper, _ in similarities[:n_recommendations]]

def download_arxiv_pdf(arxiv_id, download_dir, paper_title):
    try:
        pdf_url = f'https://arxiv.org/pdf/{arxiv_id}.pdf'
        filename = f'{paper_title}.pdf'
        command = ['arxiv-downloader', pdf_url, '-d', download_dir]
        result = subprocess.run(command, capture_output=True, text=True)
        
        if result.returncode == 0:
            message = f"PDF downloaded successfully to {os.path.join(download_dir, filename)}"
            return jsonify({'message': message}), 200
        else:
            return jsonify({'error': "Error occurred while downloading the PDF."}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/scholar-results', methods=['GET'])
def get_scholar_results():
    query = request.args.get('q')
    if not query:
        return jsonify({'error': 'Missing search query'}), 400

    params = {
        "engine": "google_scholar",
        "q": query,
        "api_key": os.getenv("SERPAPI_API_KEY")
    }

    search = GoogleSearch(params)
    results = search.get_dict()

    papers = [
        {
            'id': index + 1,
            'title': result.get('title', ''),
            'summary': result.get('snippet', ''),
            'paper_id': result.get('result_id', ''),
            'link': result.get('link', '')
        }
        for index, result in enumerate(results.get('organic_results', []))
    ]

    return jsonify(papers)

@app.route('/arxiv-results', methods=['GET'])
def get_arxiv_results():
    query = request.args.get('q')
    if not query:
        return jsonify({'error': 'Missing search query'}), 400

    url = f'http://export.arxiv.org/api/query?search_query=all:{query}&start=0&max_results=10&sortBy=submittedDate&sortOrder=descending'
    response = requests.get(url)
    if response.status_code != 200:
        return jsonify({'error': 'Failed to fetch arXiv results'}), 500

    return response.text

@app.route('/download-arxiv-pdf', methods=['POST'])
def download_arxiv_pdf_endpoint():
    data = request.get_json()
    arxiv_id = data.get('arXiv_id')
    home_dir = os.path.expanduser('~')
    download_dir = os.path.join(home_dir, 'Downloads')
    paper_title = data.get('paper_title')

    if not arxiv_id or not paper_title:
        return jsonify({'error': 'Missing required parameters: arXiv_id or paper_title'}), 400

    return download_arxiv_pdf(arxiv_id, download_dir, paper_title)

@app.route('/chat', methods=['POST'])
def chat_endpoint():
    data = request.json
    chat_history = data.get('chatHistory')
    paper_info = data.get('paperInfo')

    if not chat_history or not paper_info:
        return jsonify({'error': 'Missing required fields: chat_history or paperInfo'}), 400

    system_template = "You are a helpful assistant discussing the research paper titled '{title}'. Here's a brief summary of the paper: {summary}"
    
    chat = ChatGroq(
        temperature=0.2,
        model_name="llama3-70b-8192"
    )

    system_message = SystemMessage(content=system_template.format(title=paper_info['title'], summary=paper_info['summary']))
    
    # Check if the paper has been discussed before
    previous_discussion_docs = paper_vector_store.similarity_search(
        query=f"title: {paper_info['title']}",
        top_k=1
    )

    if previous_discussion_docs:
        previous_discussion = previous_discussion_docs[0].metadata.get('chat_history', [])
    else:
        previous_discussion = []

    # Combine all messages
    messages = [system_message]
    
    # If the paper was discussed before, add the previous conversation to the messages
    for msg in previous_discussion:
        if msg['role'] == 'human':
            messages.append(HumanMessage(content=msg['content']))
        elif msg['role'] == 'assistant':
            messages.append(SystemMessage(content=msg['content']))
    
    # Add the latest user message to the messages
    messages.append(HumanMessage(content=chat_history[-1]['content']))

    # Add conversation history
    messages.extend(conversation_memory.chat_memory.messages)

    try:
        response = chat.invoke(messages)
        
        # Save the conversation in memory and associate it with the paper
        conversation_memory.chat_memory.add_user_message(chat_history[-1]['content'])
        conversation_memory.chat_memory.add_ai_message(response.content)
        
        # Update paper document with the new chat history
        paper_doc = Document(
            page_content=f"Title: {paper_info['title']}\nSummary: {paper_info['summary']}",
            metadata={
                "title": paper_info['title'],
                "chat_history": conversation_memory.chat_memory.messages
            }
        )
        paper_vector_store.add_documents([paper_doc])

        return jsonify({
            "content": response.content,
            "role": "assistant"
        })
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            "content": f"I'm sorry, I encountered an error while processing your request: {str(e)}",
            "role": "assistant"
        }), 500

@app.route('/recommend-papers', methods=['POST'])
def api_recommend_papers():
    data = request.json
    target_paper = data.get('targetPaper')
    all_papers = data.get('allPapers')

    recommendations = recommend_papers(target_paper, all_papers)
    return jsonify(recommendations)


if __name__ == '__main__':
    app.run(debug=True)