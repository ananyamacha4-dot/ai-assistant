
import smtplib

from email.mime.text import MIMEText

from email.mime.multipart import MIMEMultipart
import io
import sys
from fastapi import (
     FastAPI,
    UploadFile,
    File
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
import google.generativeai as genai
from docx import Document
from docx.shared import Pt

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.tools import tool

from database import SessionLocal, engine
from models import User, Base
from auth import (
    hash_password,
    verify_password,
    create_token
)

import os
import shutil

from pypdf import PdfReader

# =========================
# LOAD ENV
# =========================

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
PDF_CONTEXT_FILE = "pdf_context.txt"

# =========================
# CREATE DATABASE TABLES
# =========================

Base.metadata.create_all(bind=engine)

# =========================
# FASTAPI
# =========================

app = FastAPI()

# =========================
# CORS
# =========================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://ai-assistant-gwco.vercel.app",
        "https://ai-assistant-gwco-cxdzrjncv-ananyamacha4-dots-projects.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# LIGHTWEIGHT AI HELPERS
# =========================

def get_gemini_model():
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set in environment variables.")
    
    genai.configure(api_key=GEMINI_API_KEY)
    return genai.GenerativeModel('gemini-2.5-flash')

def generate_ai_text(prompt):

    if not GEMINI_API_KEY:

        return (
            "Backend Error: GEMINI_API_KEY is not set "
            "in environment variables."
        )

    try:
        model = get_gemini_model()
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Gemini API Error: {str(e)}"

def load_pdf_context():

    if not os.path.exists(PDF_CONTEXT_FILE):

        return ""

    with open(
        PDF_CONTEXT_FILE,
        "r",
        encoding="utf-8",
        errors="ignore"
    ) as file:

        return file.read()[-5000:]

# =========================
# REQUEST MODELS
# =========================

class ChatRequest(BaseModel):
    message: str
    history: list = []

class AuthRequest(BaseModel):
    email: str
    password: str
class CodeRequest(BaseModel):
    code: str  
    user_input: str = ""  
class EmailRequest(BaseModel):

    senderEmail: str

    senderPassword: str

    recipientEmail: str

    description: str = ""

    length: str = "medium"

class DocumentRequest(BaseModel):

    topic: str

    doc_type: str = "document"

    length: str = "medium"

# =========================
# ROOT
# =========================

@app.get("/")
def root():

    return {
        "message": "Backend Running"
    }

# =========================
# HEALTH
# =========================

@app.get("/health")
def health():

    return {
        "status": "ok",
        "provider": "gemini"
    }

# =========================
# SIGNUP
# =========================

@app.post("/signup")
def signup(req: AuthRequest):

    db = SessionLocal()

    existing_user = db.query(User).filter(
        User.email == req.email
    ).first()

    if existing_user:

        return {
            "message": "User already exists"
        }

    hashed_password = hash_password(
        req.password
    )

    user = User(
        email=req.email,
        password=hashed_password
    )

    db.add(user)

    db.commit()

    return {
        "message": "Signup successful"
    }

# =========================
# LOGIN
# =========================

@app.post("/login")
def login(req: AuthRequest):

    db = SessionLocal()

    user = db.query(User).filter(
        User.email == req.email
    ).first()

    if not user:

        return {
            "message": "Invalid email"
        }

    valid = verify_password(
        req.password,
        user.password
    )

    if not valid:

        return {
            "message": "Invalid password"
        }

    token = create_token(user.email)

    return {
        "token": token
    }

# =========================
# CHAT
# =========================

@app.post("/chat")
async def chat(req: ChatRequest):

    try:

        question = req.message

        history = req.history or []

        # =========================
        # CONVERSATION MEMORY
        # =========================

        conversation_text = ""

        for msg in history[-6:]:

            sender = msg.get("sender", "")
            text = msg.get("text", "")

            if sender == "user":

                conversation_text += (
                    f"User: {text}\n"
                )

            else:

                conversation_text += (
                    f"Assistant: {text}\n"
                )

        # =========================
        # LIGHTWEIGHT PDF CONTEXT
        # =========================

        context = load_pdf_context()

        # =========================
        # FINAL PROMPT
        # =========================

        final_prompt = f"""
You are a helpful AI assistant.

IMPORTANT RULES:

1. If the user asks for code:
- ALWAYS give proper code
- ALWAYS use markdown code blocks
- ALWAYS specify language

Example:

```python
print("hello")
``` 
2. Use conversation history to remember user context.
3. Use PDF context ONLY if relevant.

Conversation History:
{conversation_text}

PDF Context:
{context}

Current User Question:
{question}

Answer naturally.
"""

        # =========================
        # GROQ RESPONSE
        # =========================

        reply = generate_ai_text(
            final_prompt
        )

        return {
            "reply": reply
        }

    except Exception as e:

        return {
            "reply": f"Backend Error: {str(e)}"
        }
    
# =========================
# RUN PYTHON
# =========================

@app.post("/run-python")
async def run_python(req: CodeRequest):

    try:

        # STORE ORIGINAL STDIN/STDOUT

        old_stdout = sys.stdout
        old_stdin = sys.stdin

        # CAPTURE OUTPUT

        redirected_output = io.StringIO()

        sys.stdout = redirected_output

        # PASS USER INPUT

        sys.stdin = io.StringIO(
            req.user_input
        )

        # EXECUTE CODE

        exec(req.code)

        # GET OUTPUT

        output = redirected_output.getvalue()

        # RESTORE

        sys.stdout = old_stdout
        sys.stdin = old_stdin

        return {
            "output": output
        }

    except Exception as e:

        sys.stdout = old_stdout
        sys.stdin = old_stdin

        return {
            "output": str(e)
        }
    # =========================
# SEND EMAIL
# =========================

@app.post("/send-email")
async def send_email(
    req: EmailRequest
):

    try:

        # DEFAULT DESCRIPTION

        description = (
            req.description
            if req.description
            else
            "Professional email"
        )

        # DEFAULT LENGTH

        length = (
            req.length
            if req.length
            else
            "medium"
        )

        # =========================
        # AI EMAIL GENERATION
        # =========================

        email_prompt = f"""
Write a professional email.

Email topic:
{description}

Email length:
{length}

Generate:
1. Subject
2. Email body

Format:

Subject: ...

Body: ...
"""

        content = generate_ai_text(
            email_prompt
        )

        # =========================
        # SPLIT SUBJECT/BODY
        # =========================

        subject = "AI Generated Email"

        body = content

        if "Subject:" in content:

            parts = content.split(
                "Body:"
            )

            subject_part = (
                parts[0]
                .replace(
                    "Subject:",
                    ""
                )
                .strip()
            )

            body_part = (
                parts[1].strip()
                if len(parts) > 1
                else content
            )

            subject = subject_part

            body = body_part

        # =========================
        # EMAIL MESSAGE
        # =========================

        msg = MIMEMultipart()

        msg["From"] = (
            req.senderEmail
        )

        msg["To"] = (
            req.recipientEmail
        )

        msg["Subject"] = subject

        msg.attach(

            MIMEText(
                body,
                "plain"
            )
        )

        # =========================
        # SMTP GMAIL
        # =========================

        server = smtplib.SMTP(
            "smtp.gmail.com",
            587
        )

        server.starttls()

        server.login(
            req.senderEmail,
            req.senderPassword
        )

        server.send_message(msg)

        server.quit()

        return {

            "message":
            "Email sent successfully"
        }

    except Exception as e:

        return {

            "message":
            str(e)
        }
# =========================
# DOCUMENT GENERATION (LangChain tool wrapping Gemini)
# =========================

@tool
def generate_document_content(
    topic: str,
    doc_type: str,
    length: str,
) -> str:
    """Generate a professional document body via a Gemini-backed LangChain chain.

    Returns plain text: first line is the title, then a blank line,
    then the body paragraphs.
    """

    length_guide = {
        "short":  "Approximately 200 words.",
        "medium": "Approximately 500 words.",
        "long":   "Approximately 1000 words.",
    }.get(length, "Approximately 500 words.")

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=GEMINI_API_KEY,
        temperature=0.5,
    )

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            "You are a professional writer producing clean, "
            "well-structured documents in a confident tone."
        ),
        (
            "human",
            "Write a {doc_type} about:\n\n{topic}\n\n"
            "Length: {length_guide}\n\n"
            "Format requirements:\n"
            "- The FIRST LINE must be a clear, descriptive title only.\n"
            "- Then a single blank line.\n"
            "- Then the body in proper paragraphs separated by blank lines.\n"
            "- Professional tone, no markdown, no asterisks, no headings."
        ),
    ])

    chain = prompt | llm | StrOutputParser()

    return chain.invoke({
        "topic": topic,
        "doc_type": doc_type,
        "length_guide": length_guide,
    })


def _safe_filename(name: str) -> str:

    cleaned = "".join(
        c if (c.isalnum() or c in (" ", "-", "_")) else ""
        for c in name
    ).strip()

    return (cleaned[:60] or "document")


@app.post("/generate-document")
async def generate_document(
    req: DocumentRequest
):

    try:

        if not GEMINI_API_KEY:

            return {
                "error":
                    "GEMINI_API_KEY is not set "
                    "in environment variables."
            }

        content = generate_document_content.invoke({
            "topic":    req.topic,
            "doc_type": req.doc_type or "document",
            "length":   req.length or "medium",
        })

        lines = [
            line.rstrip()
            for line in content.strip().split("\n")
            if line.strip()
        ]

        title = lines[0] if lines else "Document"
        body_lines = lines[1:] if len(lines) > 1 else []

        doc = Document()

        heading = doc.add_heading(title, level=1)

        for run in heading.runs:
            run.font.size = Pt(20)

        for line in body_lines:

            paragraph = doc.add_paragraph(line)

            for run in paragraph.runs:
                run.font.size = Pt(11)

        buffer = io.BytesIO()

        doc.save(buffer)

        buffer.seek(0)

        filename = f"{_safe_filename(title)}.docx"

        return StreamingResponse(
            buffer,
            media_type=(
                "application/vnd.openxmlformats-"
                "officedocument.wordprocessingml.document"
            ),
            headers={
                "Content-Disposition":
                    f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers":
                    "Content-Disposition",
            },
        )

    except Exception as e:

        return {
            "error": str(e)
        }

# =========================
# TRANSCRIBE AUDIO (Whisper-style, powered by Gemini)
# =========================

@app.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...)
):

    try:

        if not GEMINI_API_KEY:

            return {
                "transcript": "",
                "error":
                    "GEMINI_API_KEY is not set "
                    "in environment variables."
            }

        audio_bytes = await file.read()

        mime_type = (
            file.content_type
            or "audio/webm"
        )

        genai.configure(
            api_key=GEMINI_API_KEY
        )

        model = genai.GenerativeModel(
            'gemini-2.5-flash'
        )

        response = model.generate_content(
            [
                (
                    "Transcribe this audio to plain text. "
                    "Return ONLY the spoken words, "
                    "no commentary, no quotes, no extra punctuation."
                ),
                {
                    "mime_type": mime_type,
                    "data": audio_bytes,
                },
            ]
        )

        transcript = (
            response.text or ""
        ).strip()

        return {
            "transcript": transcript
        }

    except Exception as e:

        return {
            "transcript": "",
            "error": str(e)
        }

# =========================
# UPLOAD PDF
# =========================

@app.post("/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...)
):

    try:

        # CREATE PDF FOLDER

        os.makedirs(
            "pdfs",
            exist_ok=True
        )

        # SAVE FILE

        file_path = (
            f"pdfs/{file.filename}"
        )

        with open(
            file_path,
            "wb"
        ) as buffer:

            shutil.copyfileobj(
                file.file,
                buffer
            )

        # READ PDF

        reader = PdfReader(
            file_path
        )

        text = ""

        for page in reader.pages:

            extracted = page.extract_text()

            if extracted:

                text += extracted

        # CHUNK TEXT

        chunks = [

            text[i:i+500]

            for i in range(
                0,
                len(text),
                500
            )
        ]

        # STORE LIGHTWEIGHT CONTEXT

        with open(
            PDF_CONTEXT_FILE,
            "a",
            encoding="utf-8"
        ) as context_file:

            context_file.write(
                "\n\n".join(chunks[:20])
            )

            context_file.write("\n\n")

        return {

            "message":
            "PDF uploaded successfully"
        }

    except Exception as e:

        return {

            "message":
            str(e)
        }
