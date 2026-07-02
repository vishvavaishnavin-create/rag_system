import os
from dotenv import load_dotenv

load_dotenv()

from config import CHROMA_DB_DIR


def main():
    if not os.path.exists(CHROMA_DB_DIR):
        print("ChromaDB index not found. Running indexer first...\n")
        from indexer import index_wikipedia_data
        index_wikipedia_data()

    print("Building RAG pipeline...")
    from rag_pipeline import build_rag_chain, answer_question
    chain = build_rag_chain()

    print("\nRAG system ready. Type 'exit' to quit.\n")
    print("-" * 50)

    while True:
        try:
            question = input("You: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nGoodbye!")
            break

        if not question:
            continue

        if question.lower() == "exit":
            print("Goodbye!")
            break

        print("\nThinking...\n")
        answer = answer_question(chain, question)
        print(f"Assistant: {answer}\n")
        print("-" * 50)


if __name__ == "__main__":
    main()
