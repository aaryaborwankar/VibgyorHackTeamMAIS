
import pymupdf
def extract_pdf_pages(pdf_bytes: bytes) -> list[dict]:
    pages = []

    with pymupdf.open(
        stream=pdf_bytes,
        filetype="pdf"
    ) as pdf:
        for index, page in enumerate(pdf):
            text = page.get_text("text", sort=True)

            pages.append({
                "page_number": index + 1,
                "extracted_text": text.strip()
            })

    return pages
