import sys
import os

# Set correct paths before anything imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(1, os.path.expanduser("~/rag_system"))
os.chdir(os.path.expanduser("~/rag_system"))

import uvicorn

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
