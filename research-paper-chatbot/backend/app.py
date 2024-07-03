from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from groq import Groq

load_dotenv()

app = Flask(__name__)
CORS(app)


groq_api_key = os.getenv("GROQ_API_KEY")
client = Groq(api_key= groq_api_key)


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