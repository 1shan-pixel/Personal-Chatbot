from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from groq import Groq
import requests
import subprocess 

load_dotenv()

app = Flask(__name__)
CORS(app)

groq_api_key = os.getenv("GROQ_API_KEY")
client = Groq(api_key= groq_api_key)

def download_arxiv_pdf(arxiv_id, download_dir,paper_title):
    try:
        # Construct the PDF URL using the arXiv ID
        print(arxiv_id)
        pdf_url = f'https://arxiv.org/pdf/{arxiv_id}'
        filename = f'{paper_title}.pdf'

        # Construct the command to run arxiv-downloader
        command = ['arxiv-downloader', pdf_url, '-d', download_dir]

        # Run the command
        result = subprocess.run(command, capture_output=True, text=True)

        # Check if the command was successful
        if result.returncode == 0:
            message = f"PDF downloaded successfully to {os.path.join(download_dir, filename)}"
            print(message)
            return jsonify({'message': message}), 200
        else:
            error_message = "Error occurred while downloading the PDF."
            print(error_message)
            return jsonify({'error': error_message}), 500

    except Exception as e:
        error_message = f"Exception occurred: {str(e)}"
        print(error_message)
        return jsonify({'error': error_message}), 500

@app.route('/download-arxiv-pdf', methods=['POST'])
def download_arxiv_pdf_endpoint():
    data = request.get_json()
    arXiv_id = data.get('arXiv_id')
    home_dir = os.path.expanduser('~')
    download_dir = os.path.join(home_dir, 'Downloads')
    paper_title = data.get('paper_title')

    if not arXiv_id or not download_dir:
        return jsonify({'error': 'Missing required parameters: arXiv_id or download_dir'}), 400

    return download_arxiv_pdf(arXiv_id, download_dir,paper_title)



@app.route('/info',methods= ['GET'])
def response_arXiv():
    topic = request.args.get('topic')
    arxiv_url = f'http://export.arxiv.org/api/query?search_query=all:{topic}&start=0&max_results=10&sortBy=submittedDate&sortOrder=descending'
    response = requests.get(arxiv_url)
    return response.text


@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    chat_history = data['chatHistory']
    paper_info = data['paperInfo']
    
    system_message = f"You are a helpful assistant discussing the research paper titled '{paper_info['title']}'. Here's a brief summary of the paper: {paper_info['summary']}"
    
    try:
        response = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {"role": "system", "content": system_message},
                *chat_history
            ],
            max_tokens=500,
            temperature=0.2
        )
        
        return jsonify({
            "content": response.choices[0].message.content,
            "role": "assistant"
        })
    except Exception as e:
        return jsonify({
            "content": "I'm sorry, I encountered an error while processing your request.",
            "role": "assistant"
        }), 500

if __name__ == '__main__':
    app.run(debug=True)