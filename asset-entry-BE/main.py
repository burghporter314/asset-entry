import os
import uuid
import psycopg2
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
import bcrypt
from jose import JWTError, jwt

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"]
)

DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY", "changeme-in-production-please")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_connection():
    return psycopg2.connect(DATABASE_URL)


@app.on_event("startup")
def startup():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            is_admin BOOLEAN DEFAULT FALSE,
            is_static BOOLEAN DEFAULT FALSE,
            can_read BOOLEAN DEFAULT TRUE,
            can_create BOOLEAN DEFAULT TRUE,
            can_delete BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW()
        );
    """)
    for col, definition in [
        ("is_admin",   "BOOLEAN DEFAULT FALSE"),
        ("is_static",  "BOOLEAN DEFAULT FALSE"),
        ("can_read",   "BOOLEAN DEFAULT TRUE"),
        ("can_create", "BOOLEAN DEFAULT TRUE"),
        ("can_delete", "BOOLEAN DEFAULT TRUE"),
    ]:
        cur.execute(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col} {definition};")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS entries (
            id SERIAL PRIMARY KEY,
            asset TEXT,
            expense_type TEXT,
            amount NUMERIC,
            date DATE,
            file_name TEXT,
            user_id INTEGER REFERENCES users(id)
        );
    """)
    cur.execute("ALTER TABLE entries ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);")

    # Upsert the static admin account
    pw_hash = hash_password(ADMIN_PASSWORD)
    cur.execute("""
        INSERT INTO users (username, password_hash, is_admin, is_static, can_read, can_create, can_delete)
        VALUES (%s, %s, TRUE, TRUE, TRUE, TRUE, TRUE)
        ON CONFLICT (username) DO UPDATE
            SET password_hash = EXCLUDED.password_hash,
                is_admin  = TRUE,
                is_static = TRUE,
                can_read   = TRUE,
                can_create = TRUE,
                can_delete = TRUE;
    """, (ADMIN_USERNAME, pw_hash))

    conn.commit()
    cur.close()
    conn.close()


# ── Models ───────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class AdminResetPasswordRequest(BaseModel):
    new_password: str

class PermissionsRequest(BaseModel):
    can_read: bool
    can_create: bool
    can_delete: bool


# ── Helpers ──────────────────────────────────────────────

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_token(user: dict) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    return jwt.encode(
        {
            "sub":        str(user["id"]),
            "username":   user["username"],
            "is_admin":   user["is_admin"],
            "is_static":  user["is_static"],
            "can_read":   user["can_read"],
            "can_create": user["can_create"],
            "can_delete": user["can_delete"],
            "exp":        expire,
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        p = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {
            "id":         int(p["sub"]),
            "username":   p["username"],
            "is_admin":   bool(p.get("is_admin", False)),
            "is_static":  bool(p.get("is_static", False)),
            "can_read":   bool(p.get("can_read", True)),
            "can_create": bool(p.get("can_create", True)),
            "can_delete": bool(p.get("can_delete", True)),
        }
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

def require_admin(current_user: dict = Depends(get_current_user)):
    if not current_user["is_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

def require_read(current_user: dict = Depends(get_current_user)):
    if not current_user["is_admin"] and not current_user["can_read"]:
        raise HTTPException(status_code=403, detail="Read access not granted")
    return current_user

def require_create(current_user: dict = Depends(get_current_user)):
    if not current_user["is_admin"] and not current_user["can_create"]:
        raise HTTPException(status_code=403, detail="Create access not granted")
    return current_user

def require_delete(current_user: dict = Depends(get_current_user)):
    if not current_user["is_admin"] and not current_user["can_delete"]:
        raise HTTPException(status_code=403, detail="Delete access not granted")
    return current_user


# ── Health ───────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "Backend running"}


# ── Auth endpoints ───────────────────────────────────────

@app.post("/auth/register")
def register(req: RegisterRequest):
    username = req.username.strip()
    if username.lower() == ADMIN_USERNAME.lower():
        raise HTTPException(status_code=409, detail="Username already taken")
    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT id FROM users WHERE username = %s;", (username,))
    if cur.fetchone():
        cur.close()
        conn.close()
        raise HTTPException(status_code=409, detail="Username already taken")

    cur.execute("SELECT COUNT(*) FROM users WHERE is_static = FALSE;")
    is_first = cur.fetchone()[0] == 0

    pw_hash = hash_password(req.password)
    cur.execute(
        "INSERT INTO users (username, password_hash, is_admin) VALUES (%s, %s, %s) RETURNING id;",
        (username, pw_hash, is_first)
    )
    user_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()

    user = {
        "id": user_id, "username": username, "is_admin": is_first, "is_static": False,
        "can_read": True, "can_create": True, "can_delete": True,
    }
    return {**user, "token": create_token(user)}


@app.post("/auth/login")
def login(req: LoginRequest):
    username = req.username.strip()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, password_hash, is_admin, is_static, can_read, can_create, can_delete FROM users WHERE username = %s;",
        (username,)
    )
    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row or not verify_password(req.password, row[1]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    user = {
        "id": row[0], "username": username, "is_admin": row[2], "is_static": row[3],
        "can_read": row[4], "can_create": row[5], "can_delete": row[6],
    }
    return {**user, "token": create_token(user)}


@app.post("/auth/change-password")
def change_password(req: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    if current_user["is_static"]:
        raise HTTPException(status_code=403, detail="Static admin password is managed via environment variables")
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT password_hash FROM users WHERE id = %s;", (current_user["id"],))
    row = cur.fetchone()

    if not row or not verify_password(req.current_password, row[0]):
        cur.close()
        conn.close()
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    cur.execute("UPDATE users SET password_hash = %s WHERE id = %s;", (hash_password(req.new_password), current_user["id"]))
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Password updated successfully"}


# ── Admin endpoints ──────────────────────────────────────

@app.get("/admin/users")
def admin_list_users(_: dict = Depends(require_admin)):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, username, is_admin, is_static, can_read, can_create, can_delete, created_at
        FROM users ORDER BY is_static DESC, created_at;
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [
        {
            "id": r[0], "username": r[1], "is_admin": r[2], "is_static": r[3],
            "can_read": r[4], "can_create": r[5], "can_delete": r[6], "created_at": str(r[7]),
        }
        for r in rows
    ]


@app.post("/admin/users/{user_id}/reset-password")
def admin_reset_password(user_id: int, req: AdminResetPasswordRequest, _: dict = Depends(require_admin)):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT is_static FROM users WHERE id = %s;", (user_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    if row[0]:
        cur.close()
        conn.close()
        raise HTTPException(status_code=403, detail="Static admin password is managed via environment variables")
    if len(req.new_password) < 6:
        cur.close()
        conn.close()
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    cur.execute("UPDATE users SET password_hash = %s WHERE id = %s;", (hash_password(req.new_password), user_id))
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Password reset successfully"}


@app.patch("/admin/users/{user_id}/permissions")
def admin_update_permissions(user_id: int, req: PermissionsRequest, _: dict = Depends(require_admin)):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT is_static FROM users WHERE id = %s;", (user_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    if row[0]:
        cur.close()
        conn.close()
        raise HTTPException(status_code=403, detail="Cannot modify static admin permissions")

    cur.execute(
        "UPDATE users SET can_read = %s, can_create = %s, can_delete = %s WHERE id = %s;",
        (req.can_read, req.can_create, req.can_delete, user_id)
    )
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Permissions updated"}


@app.delete("/admin/users/{user_id}")
def admin_delete_user(user_id: int, current_user: dict = Depends(require_admin)):
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT is_static FROM users WHERE id = %s;", (user_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    if row[0]:
        cur.close()
        conn.close()
        raise HTTPException(status_code=403, detail="Cannot delete the static admin account")

    cur.execute("DELETE FROM users WHERE id = %s;", (user_id,))
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "User deleted"}


# ── Entry endpoints ──────────────────────────────────────

@app.post("/entries")
async def create_entry(
    asset: str = Form(...),
    expense_type: str = Form(...),
    amount: float = Form(...),
    date: str = Form(...),
    file: UploadFile = File(None),
    current_user: dict = Depends(require_create)
):
    conn = get_connection()
    cur = conn.cursor()

    file_name_in_db = None
    if file:
        os.makedirs("/app/files", exist_ok=True)
        ext = os.path.splitext(file.filename)[1]
        uuid_name = f"{uuid.uuid4()}{ext}"
        file_path = os.path.join("/app/files", uuid_name)
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        file_name_in_db = uuid_name

    cur.execute(
        "INSERT INTO entries (asset, expense_type, amount, date, file_name, user_id) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id;",
        (asset, expense_type, amount, date, file_name_in_db, current_user["id"])
    )
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return {"id": new_id, "asset": asset, "file_saved": bool(file), "file_name": file_name_in_db}


@app.get("/entries")
def get_entries(current_user: dict = Depends(require_read)):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, asset, expense_type, amount, date, file_name FROM entries;")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [
        {
            "id": r[0], "asset": r[1], "expense_type": r[2],
            "amount": float(r[3]), "date": str(r[4]), "file_name": r[5],
        }
        for r in rows
    ]


@app.get("/entries/{entry_id}/file")
def get_entry_file(entry_id: int, current_user: dict = Depends(require_read)):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT file_name FROM entries WHERE id = %s;", (entry_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()

        if not row or not row[0]:
            raise HTTPException(status_code=404, detail="File not found")

        file_path = os.path.join("/app/files", row[0])
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found on disk")

        return FileResponse(path=file_path, media_type="application/octet-stream", filename=row[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/entries/{entry_id}")
def delete_entry(entry_id: int, current_user: dict = Depends(require_delete)):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT file_name FROM entries WHERE id = %s;", (entry_id,))
        row = cur.fetchone()

        if not row:
            cur.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Entry not found")

        if row[0]:
            file_path = os.path.join("/app/files", row[0])
            if os.path.exists(file_path):
                os.remove(file_path)

        cur.execute("DELETE FROM entries WHERE id = %s;", (entry_id,))
        conn.commit()
        cur.close()
        conn.close()
        return {"message": "Entry deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
