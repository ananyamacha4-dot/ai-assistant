from pypdf import PdfReader
from langchain_huggingface import HuggingFaceEmbeddings
import chromadb

# Load embedding model
model = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

# Persistent vector database
client = chromadb.PersistentClient(
    path="./chroma_db"
)

# Create collection
collection = client.get_or_create_collection(
    name="pdf_data"
)

# Read PDF
reader = PdfReader(
    "pdfs/Math_formulae.pdf"
)

text = ""

# Extract text
for page in reader.pages:

    extracted = page.extract_text()

    if extracted:
        text += extracted

# Split text into chunks
chunks = [
    text[i:i+500]
    for i in range(0, len(text), 500)
]

# Store chunks + embeddings
for i, chunk in enumerate(chunks):

    embedding = model.embed_query(chunk)

    collection.add(
        embeddings=[embedding],
        documents=[chunk],
        ids=[str(i)]
    )

print("PDF embedded successfully")