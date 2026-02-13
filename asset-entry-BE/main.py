import os
import uuid
import psycopg2
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Enable CORS if frontend is on a different port
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or your frontend URL
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL")

def get_connection():
    return psycopg2.connect(DATABASE_URL)

# Create table at startup
@app.on_event("startup")
def startup():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS entries (
            id SERIAL PRIMARY KEY,
            asset TEXT,
            expense_type TEXT,
            amount NUMERIC,
            date DATE,
            file_name TEXT
        );
    """)
    conn.commit()
    cur.close()
    conn.close()

@app.get("/")
def root():
    return {"status": "Backend running"}

@app.post("/entries")
async def create_entry(
    asset: str = Form(...),
    expense_type: str = Form(...),
    amount: float = Form(...),
    date: str = Form(...),
    file: UploadFile = File(None)
):
    conn = get_connection()
    cur = conn.cursor()

    file_name_in_db = None
    if file:
        os.makedirs("/app/files", exist_ok=True)
        ext = os.path.splitext(file.filename)[1]  # preserve file extension
        uuid_name = f"{uuid.uuid4()}{ext}"
        file_path = os.path.join("/app/files", uuid_name)

        # Save file
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        file_name_in_db = uuid_name  # store the UUID name in DB

    cur.execute(
        "INSERT INTO entries (asset, expense_type, amount, date, file_name) VALUES (%s, %s, %s, %s, %s) RETURNING id;",
        (asset, expense_type, amount, date, file_name_in_db)
    )
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()

    return {"id": new_id, "file_saved": bool(file), "file_name": file_name_in_db}

@app.get("/entries")
def get_entries():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, asset, expense_type, amount, date, file_name FROM entries;")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [
        {
            "id": r[0],
            "asset": r[1],
            "expense_type": r[2],
            "amount": float(r[3]),
            "date": str(r[4]),
            "file_name": r[5]
        }
        for r in rows
    ]
