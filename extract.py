from PyPDF2 import PdfReader
import sys

reader = PdfReader(sys.argv[1])
for i in range(len(reader.pages)):
    print(f"--- Page {i+1} ---")
    print(reader.pages[i].extract_text())
