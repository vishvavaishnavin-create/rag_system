from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from config import CHROMA_DB_DIR, COLLECTION_NAME, EMBEDDING_MODEL, TOP_K, GEMINI_MODEL

PROMPT_TEMPLATE = (
    "You are WikiRAG, an AI assistant built with LangChain, ChromaDB, and Google Gemini. "
    "You were created by Vishva. "
    "You specialize in answering questions about Artificial Intelligence, "
    "Machine Learning, Deep Learning, Natural Language Processing, and Neural Networks "
    "using Wikipedia as your knowledge base. "
    "If someone asks what you can do, who you are, or who made you — answer from the above description. "
    "For all other questions, use only the context below. "
    "If the context does not contain enough information say: "
    "I can only answer questions about AI, ML, Deep Learning, NLP and Neural Networks.\n\n"
    "Context:\n{context}\n\nQuestion: {question}\n\nAnswer:"
)

def _format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

def _parse_output(output):
    if isinstance(output, str):
        return output
    if isinstance(output, list):
        for item in output:
            if isinstance(item, dict) and item.get("type") == "text":
                return item.get("text", "")
    if hasattr(output, "content"):
        c = output.content
        if isinstance(c, list):
            for item in c:
                if isinstance(item, dict) and item.get("type") == "text":
                    return item.get("text", "")
        return str(c)
    return str(output)

def build_rag_chain():
    print("Loading embedding model...")
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    print("Connecting to ChromaDB vectorstore...")
    vectorstore = Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=CHROMA_DB_DIR,
    )
    retriever = vectorstore.as_retriever(search_kwargs={"k": TOP_K})
    prompt = PromptTemplate.from_template(PROMPT_TEMPLATE)
    llm = ChatGoogleGenerativeAI(model=GEMINI_MODEL, temperature=0)
    chain = (
        {"context": retriever | _format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
    )
    return chain

def answer_question(chain, question: str) -> str:
    output = chain.invoke(question)
    return _parse_output(output)