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

from langchain_chroma import Chroma
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings

from dotenv import load_dotenv
from langchain_experimental.tools import PythonREPLTool

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

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# EMBEDDINGS
# =========================

embedding_model()= None

def get_embedding_model():
    global embedding_model

    if embedding_model is None:
        embedding_model = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )

    return embedding_model
# =========================
# CHROMADB
# =========================

vectorstore = Chroma(
    persist_directory="./chroma_db",
    embedding_function=get_embedding_model()
)

# =========================
# RETRIEVER
# =========================

retriever = vectorstore.as_retriever(
    search_kwargs={"k": 2}
)
# =========================
# PYTHON REPL
# =========================

python_repl = PythonREPLTool()

# =========================
# GROQ MODEL
# =========================

llm = ChatGroq(
    groq_api_key=GROQ_API_KEY,
    model_name="llama-3.1-8b-instant",
    temperature=0.7
)

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
        "provider": "groq"
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
        # VECTOR SEARCH
        # =========================

        docs = retriever.invoke(question)

        # =========================
        # CONTEXT EXTRACTION
        # =========================

        context = "\n".join(
            [doc.page_content for doc in docs]
        )

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

        response = llm.invoke(
            final_prompt
        )

        return {
            "reply": response.content
        }

    except Exception as e:

        return {
            "reply": f"Backend Error: {str(e)}"
        }
    
@app.post("/chat")
async def chat(req: ChatRequest):

    ...
    
    return {
        "reply": response.content
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

        response = llm.invoke(
            email_prompt
        )

        content = response.content

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

        # STORE IN CHROMADB

        vectorstore.add_texts(
            chunks
        )

        return {

            "message":
            "PDF uploaded successfully"
        }

    except Exception as e:

        return {

            "message":
            str(e)
        }