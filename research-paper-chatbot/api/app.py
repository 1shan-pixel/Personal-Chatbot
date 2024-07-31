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
from langchain_groq import ChatGroq
from langchain.memory import ConversationBufferWindowMemory
from langchain.schema import Document , AIMessage , HumanMessage , SystemMessage 
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_astradb import AstraDBVectorStore
from langchain.text_splitter import TokenTextSplitter
from langchain.schema.runnable import RunnablePassthrough, RunnableLambda
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from operator import itemgetter
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory


load_dotenv()

app = Flask(__name__)
CORS(app)

groq_api_key = os.getenv("GROQ_API_KEY")
OpenAi_api_key = os.getenv("OPENAI_API_KEY")
client = Groq(api_key=groq_api_key)

nlp = spacy.load("en_core_web_sm")

# Initialize memory
conversation_memory = ConversationBufferWindowMemory(k=10, return_messages=True)

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
    chat_history = data['chatHistory']
    paper_info = data['paperInfo']
    
    system_message = {
        "role": "system",
        "content": f"You are a helpful assistant discussing the research paper titled '{paper_info['title']}'. Here's a brief summary of the paper: {paper_info['summary']}"
    }
    
    try:
        chat = ChatGroq(
        temperature=0.2,
        model_name="llama3-70b-8192"
    )
        prompt = ChatPromptTemplate(
         messages=[
        {"role": "system", "content": system_message["content"]},
        MessagesPlaceholder("history"),
        {"role": "human", "content": "{input}"}
    ]
)
        runnable = prompt| chat
        formatted_chat_history = [
        {"role": msg['role'], "content": msg['content']}
            for msg in chat_history
            ]           
        temp_chat_history = ChatMessageHistory(messages=formatted_chat_history)
        withMessageHistory = RunnableWithMessageHistory(
            runnable=runnable,
            getMessageHistory=lambda _: temp_chat_history,
            inputMessagesKey="input",
            historyMessagesKey="history",
        )

        user_message = chat_history[-1]['content'] if chat_history else " "
        response = withMessageHistory.invoke(
            {

            "input" : user_message
            }
        )
        print(response)
        return jsonify({
            "content": response["content"],
            "role": "assistant"
        })

    except Exception as e:
        print(e)
        return jsonify({
            "content": "I'm sorry, I encountered an error while processing your request.",
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