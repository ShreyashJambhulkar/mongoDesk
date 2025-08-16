from flask import Flask, request, jsonify, send_from_directory
import os
from groq import Groq
import smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv
from flask_cors import CORS
import PyPDF2
from docx import Document

load_dotenv()

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

# Groq client
groq_client = Groq(api_key=os.getenv('GROQ_API_KEY'))

@app.route('/generate_summary', methods=['POST'])
def generate_summary():
    if 'transcript' not in request.files or 'prompt' not in request.form:
        return jsonify({'error': 'Missing transcript or prompt'}), 400
    
    file = request.files['transcript']
    filename = file.filename.lower()
    if not filename.endswith(('.txt', '.pdf', '.docx')):
        return jsonify({'error': 'Only .txt, .pdf, .docx files allowed'}), 400
    
    try:
        if filename.endswith('.txt'):
            transcript = file.read().decode('utf-8')
        elif filename.endswith('.pdf'):
            pdf_reader = PyPDF2.PdfReader(file)
            transcript = '\n'.join(page.extract_text() for page in pdf_reader.pages if page.extract_text())
        elif filename.endswith('.docx'):
            doc = Document(file)
            transcript = '\n'.join(para.text for para in doc.paragraphs)
        
        user_prompt = request.form['prompt']
        full_prompt = f"Based on this meeting transcript: {transcript}\n\n{user_prompt}. Ensure that the response is relevant and structured. Strictly not include any Markup!"
        
        response = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": full_prompt}],
            model="llama3-8b-8192",
            temperature=0.7,
            max_tokens=1024
        )
        summary = response.choices[0].message.content.strip()
        return jsonify({'summary': summary})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/send_email', methods=['POST'])
def send_email():
    data = request.json
    summary = data.get('summary')
    recipients = data.get('recipients')
    
    if not summary or not recipients:
        return jsonify({'error': 'Missing summary or recipients'}), 400
    
    sender = os.getenv('EMAIL_SENDER')
    password = os.getenv('EMAIL_PASSWORD')
    
    try:
        msg = MIMEText(summary)
        msg['Subject'] = 'Meeting Summary'
        msg['From'] = sender
        msg['To'] = recipients
        
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(sender, password)
            server.sendmail(sender, recipients.split(','), msg.as_string())
        
        return jsonify({'success': 'Email sent'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Serve React app for all non-API routes
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path.startswith(('generate_summary', 'send_email')):
        return jsonify({'error': 'Not found'}), 404
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(debug=True)
    