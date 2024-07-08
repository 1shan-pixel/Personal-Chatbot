import subprocess
import os
from urllib.parse import urlparse
from flask import Flask, request, jsonify

app = Flask(__name__)

def download_arxiv_pdf(pdf_url, download_dir,paper_title):
    try:
        # Parse the PDF URL to extract the filename
        parsed_url = urlparse(pdf_url)
        filename = os.path.basename(parsed_url.path)

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
    pdf_url = data.get('pdf_url')
    download_dir = data.get('download_dir')
    paper_title = data.get('title')

    if not pdf_url or not download_dir:
        return jsonify({'error': 'Missing required parameters: pdf_url or download_dir'}), 400

    return download_arxiv_pdf(pdf_url, download_dir,paper_title)

if __name__ == '__main__':
    app.run(debug=True)
