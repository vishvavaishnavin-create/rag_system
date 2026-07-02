import sys
import os

sys.path.insert(0, '/Users/vishva/rag_system/backend')
sys.path.insert(1, '/Users/vishva/rag_system')
os.chdir('/Users/vishva/rag_system')

import uvicorn

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
