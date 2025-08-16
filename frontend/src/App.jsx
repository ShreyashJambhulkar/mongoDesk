import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Spinner, Alert, Dropdown } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import ReactMarkdown from 'react-markdown';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaUpload, FaCopy, FaEnvelope, FaEye, FaEyeSlash } from 'react-icons/fa'; // Icons

const promptSuggestions = [
  'Summarize in bullet points for executives',
  'Highlight only action items',
  'Extract key decisions and next steps',
  'Create a detailed report'
];

function App() {
  const [transcriptFile, setTranscriptFile] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [summary, setSummary] = useState('');
  const [recipients, setRecipients] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(true);

  // Auto-save summary
  useEffect(() => {
    const savedSummary = localStorage.getItem('summary');
    if (savedSummary) setSummary(savedSummary);
  }, []);

  useEffect(() => {
    if (summary) localStorage.setItem('summary', summary);
  }, [summary]);

  const handleGenerate = async () => {
    if (!transcriptFile || !prompt) {
      setError('Please upload a transcript and enter a prompt.');
      return;
    }
    const ext = transcriptFile.name.toLowerCase().split('.').pop();
    if (!['txt', 'pdf', 'docx'].includes(ext)) {
      setError('Only .txt, .pdf, .docx files allowed.');
      return;
    }

    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('transcript', transcriptFile);
    formData.append('prompt', prompt);

    try {
      const response = await fetch('/generate_summary', { method: 'POST', body: formData });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setSummary(data.summary);
      toast.success('Summary generated!');
    } catch (err) {
      setError(err.message);
      toast.error('Failed to generate summary.');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!summary || !recipients) {
      setError('Please provide a summary and recipient emails.');
      return;
    }
    const emails = recipients.split(',').map(e => e.trim());
    if (emails.some(e => !/\S+@\S+\.\S+/.test(e))) {
      setError('Invalid email format.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch('/send_email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary, recipients })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      toast.success('Email sent successfully!');
    } catch (err) {
      setError(err.message);
      toast.error('Failed to send email.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    toast.info('Summary copied to clipboard!');
  };

  return (
    <Container className="my-4">
      <ToastContainer position="top-right" autoClose={3000} />
      <Row className="justify-content-center">
        <Col md={8}>
          <Card className="shadow-lg" style={{ borderRadius: '15px' }}>
            <Card.Header className="bg-primary text-white"><h3><FaUpload className="me-2" /> AI Meeting Summarizer</h3></Card.Header>
            <Card.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Upload Transcript (.txt, .pdf, .docx)</Form.Label>
                  <Form.Control type="file" accept=".txt,.pdf,.docx" onChange={e => setTranscriptFile(e.target.files[0])} />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Custom Prompt</Form.Label>
                  <div className="d-flex">
                    <Form.Control
                      type="text"
                      value={prompt}
                      onChange={e => setPrompt(e.target.value)}
                      placeholder="e.g., Summarize in bullet points"
                    />
                    <Dropdown className="ms-2">
                      <Dropdown.Toggle variant="outline-primary">Suggestions</Dropdown.Toggle>
                      <Dropdown.Menu>
                        {promptSuggestions.map((sug, idx) => (
                          <Dropdown.Item key={idx} onClick={() => setPrompt(sug)}>{sug}</Dropdown.Item>
                        ))}
                      </Dropdown.Menu>
                    </Dropdown>
                  </div>
                </Form.Group>

                <Button variant="primary" onClick={handleGenerate} disabled={loading}>
                  {loading ? <Spinner animation="border" size="sm" /> : 'Generate Summary'}
                </Button>
              </Form>

              {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

              {summary && (
                <div className="fade-in mt-3"> {/* Animation class */}
                  <hr />
                  <Form.Group className="mb-3">
                    <Form.Label>Editable Summary</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={10}
                      value={summary}
                      onChange={e => setSummary(e.target.value)}
                    />
                  </Form.Group>

                  <Button variant="outline-info" onClick={() => setShowPreview(!showPreview)} className="mb-3">
                    {showPreview ? <><FaEyeSlash className="me-1" /> Hide Preview</> : <><FaEye className="me-1" /> Show Preview</>}
                  </Button>
                  {showPreview && (
                    <Card className="mb-3 bg-light">
                      <Card.Body>
                        <ReactMarkdown>{summary}</ReactMarkdown>
                      </Card.Body>
                    </Card>
                  )}

                  <Button variant="outline-secondary" onClick={handleCopy} className="me-2"><FaCopy className="me-1" /> Copy to Clipboard</Button>

                  <Form.Group className="mb-3 mt-3">
                    <Form.Label>Recipient Emails (comma-separated)</Form.Label>
                    <Form.Control
                      type="text"
                      value={recipients}
                      onChange={e => setRecipients(e.target.value)}
                      placeholder="email1@example.com, email2@example.com"
                    />
                  </Form.Group>

                  <Button variant="success" onClick={handleSend} disabled={loading}>
                    {loading ? <Spinner animation="border" size="sm" /> : <><FaEnvelope className="me-1" /> Share via Email</>}
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default App;