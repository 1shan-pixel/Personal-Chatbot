from http.server import BaseHTTPRequestHandler
import json
import os
from groq import Groq
from urllib import parse
from dotenv import load_dotenv
from flask import Flask, request
from flask_cors import CORS
import requests

load_dotenv()

app = Flask(__name__)
CORS(app)

# Load environment variables (Vercel will use its own environment variable system)
groq_api_key = os.getenv("GROQ_API_KEY")
client = Groq(api_key=groq_api_key)

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
        
        return {
            "content": response.choices[0].message.content,
            "role": "assistant"
        }
    except Exception as e:
        return {
            "content": "I'm sorry, I encountered an error while processing your request.",
            "role": "assistant"
        }

@app.route('/arxiv', methods=['GET'])
def arxiv():
    topic = request.args.get('topic')
    arxiv_url = f'http://export.arxiv.org/api/query?search_query=all:{topic}&start=0&max_results=10&sortBy=submittedDate&sortOrder=descending'
    response = requests.get(arxiv_url)
    return response.text

def handle_request(event, context):
    if event['httpMethod'] == 'POST':
        try:
            body = json.loads(event['body'])
            chat_history = body['chatHistory']
            paper_info = body['paperInfo']
            
            result = chat(chat_history, paper_info)
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps(result)
            }
        except Exception as e:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    "content": "Error processing request: " + str(e),
                    "role": "assistant"
                })
            }
    elif event['httpMethod'] == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': ''
        }
    else:
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({"error": "Method not allowed"})
        }
