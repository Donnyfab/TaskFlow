# ============================================================
# TASKFLOW APP (Flask)
# - This file controls what pages exist (routes)
# - It connects to the database (MySQL)
# - It handles login/register + user sessions
# - It handles tasks/lists CRUD
# ============================================================

# ============================================================
# 1) IMPORTS (Libraries we use)
# ============================================================

from dotenv import load_dotenv
from flask import (
    Flask, render_template, request, redirect,
    url_for, session, g, abort, flash, jsonify
)
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from werkzeug.middleware.proxy_fix import ProxyFix
from authlib.integrations.flask_client import OAuth
from authlib.integrations.base_client.errors import OAuthError
from datetime import datetime, timedelta
from types import SimpleNamespace
import mysql.connector
import os
import json
import calendar
import re
import requests
from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from blog_content import BLOG_POSTS, BLOG_POSTS_BY_SLUG


# Load environment variables from .env FIRST (so os.environ works)
load_dotenv()
print("[STARTUP] ANTHROPIC_API_KEY loaded:", bool(os.environ.get("ANTHROPIC_API_KEY")))


# ============================================================
# 2) APP SETUP (Flask instance + session settings)
# ============================================================

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

# ============================================================
# EMAIL (Gmail SMTP)
# ============================================================

app.config.update(
    MAIL_SERVER="smtp.gmail.com",
    MAIL_PORT=587,
    MAIL_USE_TLS=True,
    MAIL_USERNAME=os.environ.get("MAIL_USERNAME"),
    MAIL_PASSWORD=os.environ.get("MAIL_PASSWORD"),
    MAIL_DEFAULT_SENDER=("TaskFlow", os.environ.get("MAIL_USERNAME")),
)


mail = Mail(app)


# Secret key is used to protect session cookies (login sessions).
# In production, ALWAYS store this in .env
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "DEV_ONLY_CHANGE_ME")
EMAIL_VERIFY_MAX_AGE = int(os.environ.get("EMAIL_VERIFY_MAX_AGE", "86400"))
EMAIL_VERIFY_SALT = os.environ.get("EMAIL_VERIFY_SALT", "taskflow-email-verify")

def get_email_serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(app.secret_key)

def format_note_timestamp(dt):
    if dt is None:
        return ""

    today = datetime.now().date()
    dt_date = dt.date()
    delta_days = (today - dt_date).days

    if delta_days == 0:
        hour = dt.hour % 12 or 12
        minute = dt.minute
        am_pm = "AM" if dt.hour < 12 else "PM"
        return f"{hour}:{minute:02d} {am_pm}"

    if 0 < delta_days < 7:
        return dt.strftime("%A")

    year_short = str(dt.year)[-2:]
    return f"{dt.month}/{dt.day}/{year_short}"

@app.template_filter("note_timestamp")
def note_timestamp(value):
    if not value:
        return ""
    return format_note_timestamp(value)


def group_notes_by_date(notes):
    if not notes:
        return []

    today = datetime.now().date()
    groups = {
        "Today": [],
        "Yesterday": [],
        "Previous 7 Days": [],
        "Previous 30 Days": [],
        "Older": []
    }

    for note in notes:
        timestamp = note.get("last_opened_at") or note.get("updated_at")
        if not timestamp:
            groups["Older"].append(note)
            continue

        delta_days = (today - timestamp.date()).days
        if delta_days == 0:
            groups["Today"].append(note)
        elif delta_days == 1:
            groups["Yesterday"].append(note)
        elif 1 < delta_days < 7:
            groups["Previous 7 Days"].append(note)
        elif 7 <= delta_days < 30:
            groups["Previous 30 Days"].append(note)
        else:
            groups["Older"].append(note)

    order = [
        "Today",
        "Yesterday",
        "Previous 7 Days",
        "Previous 30 Days",
        "Older"
    ]
    return [
        {"label": label, "notes": groups[label]}
        for label in order
        if groups[label]
    ]


# ============================================================
# 3) FILE UPLOAD SETTINGS (profile pictures)
# ============================================================

UPLOAD_FOLDER = "static/uploads"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER


# ============================================================
# 4) DATABASE SETTINGS (MySQL connection info)
# ============================================================
# NOTE: Hardcoding your password in code is risky.
# Move these into a .env later (DB_HOST, DB_USER, etc.)

DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "localhost"),
    "port": int(os.environ.get("DB_PORT", 3306)),
    "user": os.environ.get("DB_USER", "root"),
    "password": os.environ.get("DB_PASSWORD", ""),
    "database": os.environ.get("DB_NAME", "todo_list"),
    "autocommit": True
}

AUTH_DB_ERROR_MESSAGE = (
    "We can't reach the database right now. Make sure MySQL is running and your DB settings are correct."
)

AUTH_MAIL_ERROR_MESSAGE = (
    "Your account was created, but we couldn't send the verification email right now."
)

CONTACT_EMAIL = os.environ.get("CONTACT_EMAIL", "hello@taskflow.io")
CONTACT_INQUIRY_OPTIONS = [
    "Support",
    "Account help",
    "Plans & pricing",
    "Product feedback",
    "Partnership",
    "Other",
]

# ============================================================
# 5) GOOGLE OAUTH (Sign in with Google)
# ============================================================

oauth = OAuth(app)

def get_google_oauth_value(name):
    value = (os.environ.get(name) or "").strip()
    placeholder_values = {
        "your-google-client-id",
        "your-google-client-secret",
    }
    return value if value and value not in placeholder_values else None


GOOGLE_CLIENT_ID = get_google_oauth_value("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = get_google_oauth_value("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = (os.environ.get("GOOGLE_REDIRECT_URI") or "").strip() or None

google = None

# Only enable Google login if credentials are present
if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:
    google = oauth.register(
        name="google",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        # Google OpenID metadata (tells Authlib where JWKS + endpoints are)
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )
else:
    print("⚠️ Google OAuth disabled (missing env vars)")


@app.context_processor
def inject_auth_flags():
    return {"google_oauth_enabled": google is not None}


# ============================================================
# 6) DATABASE CONNECTION HELPERS
# ============================================================

def get_db():
    """
    Creates ONE database connection per request.
    Flask stores it in `g` so every function can reuse it safely.
    """
    if "db" not in g:
        g.db = mysql.connector.connect(**DB_CONFIG)
    return g.db


@app.teardown_appcontext
def close_db(error=None):
    """
    After each request finishes, Flask calls this function automatically.
    It closes the database connection to prevent leaks.
    """
    db = g.pop("db", None)
    if db is not None:
        db.close()


# ============================================================
# 7) SMALL UTILITY HELPERS (simple reusable functions)
# ============================================================

def logged_in() -> bool:
    """Returns True if the user is currently logged in."""
    return "user_id" in session


def get_user_initials(full_name: str | None, username: str | None = None) -> str:
    source = (full_name or "").strip()
    if source:
        parts = [part for part in source.replace("-", " ").split() if part]
        if len(parts) >= 2:
            return f"{parts[0][0]}{parts[-1][0]}".upper()
        if len(parts) == 1:
            return parts[0][:2].upper()

    fallback = (username or "").strip()
    if fallback:
        return fallback[:2].upper()

    return "TF"


def login_required(route_func):
    """
    A decorator: it protects pages that require login.
    If you're not logged in, it sends you to /login.
    """
    def wrapper(*args, **kwargs):
        if not logged_in():
            return redirect(url_for("login_page"))
        return route_func(*args, **kwargs)
    wrapper.__name__ = route_func.__name__
    return wrapper


def allowed_file(filename: str) -> bool:
    """Checks if a file extension is allowed (png/jpg/jpeg/gif)."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

# ============================================================
# GLOBAL TEMPLATE VARIABLES (available in ALL templates)
# ============================================================

@app.context_processor
def inject_user_globals():
    if "user_id" not in session:
        return {}

    user = fetch_user_by_id(session["user_id"])
    if not user:
        return {}

    return {
        "profile_image": user["profile_image"] or "default.png",
        "username": user["username"],
        "full_name": user["name"],
        "name": user["name"].split()[0],
        "user_initials": get_user_initials(user["name"], user["username"]),
    }


# ============================================================
# 8) USER DATA HELPERS (talking to users table)
# ============================================================

def fetch_user_by_email(email: str):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
    user = cursor.fetchone()
    cursor.close()
    return user


def fetch_user_by_username(username: str):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE username=%s", (username,))
    user = cursor.fetchone()
    cursor.close()
    return user


def fetch_user_by_id(user_id: int):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute(
        "SELECT id, name, username, email, profile_image, auth_provider, is_verified FROM users WHERE id=%s",
        (user_id,)
    )
    user = cursor.fetchone()
    cursor.close()
    return user


def create_user_local(full_name, username, email, password_hash):
    """
    Creates a normal account (email/password) and returns new user_id.
    """
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO users (name, username, email, password_hash, is_verified) VALUES (%s,%s,%s,%s,%s)",
        (full_name, username, email, password_hash, 0),
    )
    user_id = cursor.lastrowid
    cursor.close()
    return user_id


def create_user_oauth(name, email, provider, provider_id):
    """
    Creates a new user after logging in with Google.
    If username already exists, it adds a number (example: donny, donny1, donny2).
    """
    base_username = (email.split("@")[0] if email else "user").lower()
    username = base_username
    suffix = 0

    while fetch_user_by_username(username):
        suffix += 1
        username = f"{base_username}{suffix}"

    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        """
        INSERT INTO users (name, username, email, auth_provider, provider_id, is_verified, email_verified_at)
        VALUES (%s,%s,%s,%s,%s,%s,%s)
        """,
        (name, username, email, provider, provider_id, 1, datetime.utcnow()),
    )
    user_id = cursor.lastrowid
    cursor.close()

    return user_id, username


def set_email_verification_token(user_id: int, token: str):
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "UPDATE users SET email_verify_token=%s, email_verify_sent_at=%s WHERE id=%s",
        (token, datetime.utcnow(), user_id),
    )
    cursor.close()


def mark_user_verified(user_id: int):
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "UPDATE users SET is_verified=1, email_verified_at=%s, email_verify_token=NULL WHERE id=%s",
        (datetime.utcnow(), user_id),
    )
    cursor.close()


def generate_email_verification_token(user_id: int, email: str) -> str:
    serializer = get_email_serializer()
    return serializer.dumps({"user_id": user_id, "email": email}, salt=EMAIL_VERIFY_SALT)


def verify_email_token(token: str):
    serializer = get_email_serializer()
    return serializer.loads(token, salt=EMAIL_VERIFY_SALT, max_age=EMAIL_VERIFY_MAX_AGE)


def safe_send_message(message: Message, label: str) -> bool:
    try:
        mail.send(message)
        return True
    except Exception:
        app.logger.exception("Failed to send %s email.", label)
        return False


def send_verification_email(email: str, token: str):
    verify_url = url_for("verify_email", token=token, _external=True)
    msg = Message(
        subject="Verify your TaskFlow email",
        recipients=[email],
        body=f"Welcome to TaskFlow!\n\nVerify your email: {verify_url}\n\nThis link expires in 24 hours."
    )
    return safe_send_message(msg, "verification")


def send_welcome_email(email: str, first_name: str):
    login_url = url_for("login_page", _external=True)
    msg = Message(
        subject=f"Welcome to TaskFlow, {first_name}!",
        recipients=[email],
    )
    msg.body = f"""
Hi {first_name},

Welcome to TaskFlow!

Your account has been successfully created — we are glad to have you.

Here is what you can do next:
- Log in: {login_url}
- Create your first task
- Explore your dashboard and get productive

Need help? Reply to this email anytime — we are here for you.

Happy planning,
The TaskFlow Team
""".strip()
    return safe_send_message(msg, "welcome")


def send_contact_form_email(name: str, email: str, inquiry_type: str, message_text: str) -> bool:
    msg = Message(
        subject=f"[TaskFlow Contact] {inquiry_type} from {name}",
        recipients=[CONTACT_EMAIL],
        reply_to=email,
    )
    msg.body = f"""
New contact form submission

Name: {name}
Email: {email}
Inquiry type: {inquiry_type}

Message:
{message_text}
""".strip()
    return safe_send_message(msg, "contact form")


# ============================================================
# 9) LIST + TASK HELPERS
# ============================================================

def user_owns_list(user_id: int, list_id: int) -> bool:
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT 1 FROM task_lists WHERE id=%s AND user_id=%s", (list_id, user_id))
    ok = cursor.fetchone() is not None
    cursor.close()
    return ok


def get_inbox_list_id(user_id: int) -> int:
    """
    Every user should always have an Inbox list.
    If it doesn't exist, this creates it.
    """
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute(
        "SELECT id FROM task_lists WHERE user_id=%s AND name='Inbox' LIMIT 1",
        (user_id,)
    )
    row = cursor.fetchone()

    if row:
        cursor.close()
        return row["id"]

    cursor2 = db.cursor()
    cursor2.execute(
        "INSERT INTO task_lists (user_id, name) VALUES (%s, %s)",
        (user_id, "Inbox")
    )
    inbox_id = cursor2.lastrowid
    cursor2.close()
    cursor.close()
    return inbox_id


def fetch_task_for_user(task_id: int, user_id: int):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM tasks WHERE id=%s AND user_id=%s", (task_id, user_id))
    task = cursor.fetchone()
    cursor.close()
    return task


def habits_schema_available() -> bool:
    cached = getattr(g, "_habits_schema_available", None)
    if cached is not None:
        return cached

    cursor = None
    try:
        db = get_db()
        cursor = db.cursor()

        cursor.execute("SHOW TABLES LIKE 'habits'")
        has_habits = cursor.fetchone() is not None

        cursor.execute("SHOW TABLES LIKE 'habit_completions'")
        has_completions = cursor.fetchone() is not None

        g._habits_schema_available = bool(has_habits and has_completions)
    except mysql.connector.Error:
        app.logger.exception("Failed to verify habits schema availability.")
        g._habits_schema_available = False
    finally:
        if cursor is not None:
            cursor.close()

    return g._habits_schema_available


def notes_mood_column_available() -> bool:
    cached = getattr(g, "_notes_mood_column_available", None)
    if cached is not None:
        return cached

    cursor = None
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SHOW COLUMNS FROM notes LIKE 'mood'")
        g._notes_mood_column_available = cursor.fetchone() is not None
    except mysql.connector.Error:
        app.logger.exception("Failed to verify notes mood column availability.")
        g._notes_mood_column_available = False
    finally:
        if cursor is not None:
            cursor.close()

    return g._notes_mood_column_available


def calendar_schema_available() -> bool:
    cached = getattr(g, "_calendar_schema_available", None)
    if cached is not None:
        return cached

    cursor = None
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SHOW TABLES LIKE 'calendar_events'")
        g._calendar_schema_available = cursor.fetchone() is not None
    except mysql.connector.Error:
        app.logger.exception("Failed to verify calendar schema availability.")
        g._calendar_schema_available = False
    finally:
        if cursor is not None:
            cursor.close()

    return g._calendar_schema_available


def format_calendar_event_time(value):
    if value is None:
        return None

    if isinstance(value, timedelta):
        total_seconds = int(value.total_seconds())
        hours = (total_seconds // 3600) % 24
        minutes = (total_seconds % 3600) // 60
        return f"{hours:02d}:{minutes:02d}"

    if hasattr(value, "strftime"):
        return value.strftime("%H:%M")

    text = str(value)
    return text[:5] if len(text) >= 5 else text


def focus_sessions_schema_available() -> bool:
    cached = getattr(g, "_focus_sessions_schema_available", None)
    if cached is not None:
        return cached

    cursor = None
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SHOW TABLES LIKE 'focus_sessions'")
        g._focus_sessions_schema_available = cursor.fetchone() is not None
    except mysql.connector.Error:
        app.logger.exception("Failed to verify focus session schema availability.")
        g._focus_sessions_schema_available = False
    finally:
        if cursor is not None:
            cursor.close()

    return g._focus_sessions_schema_available


def parse_optional_int(value):
    if value in (None, "", False):
        return None

    try:
        return int(value)
    except (TypeError, ValueError):
        return None


DEFAULT_AI_ACTION_COLOR = "rgba(255,255,255,0.7)"
AI_ACTION_CONFIRM_WORDS = {
    "yes",
    "yeah",
    "yep",
    "sure",
    "do it",
    "add it",
    "add that",
    "create it",
    "create that",
    "schedule it",
    "sounds good",
    "ok",
    "okay",
    "please do",
    "go ahead",
}
AI_ACTION_CANCEL_WORDS = {
    "no",
    "nope",
    "nah",
    "cancel",
    "dont",
    "don't",
    "not now",
    "never mind",
    "nevermind",
    "skip it",
    "no thanks",
}
AI_MEMORY_TRIGGER_PATTERN = re.compile(
    r"\b("
    r"my birthday|remember|call me|my goal|i want to|i need to|"
    r"i (?:prefer|like|work best|am most productive)|"
    r"add|create|schedule|put .* calendar|task|habit|calendar"
    r")\b",
    re.IGNORECASE,
)
MONTH_LOOKUP = {
    "january": 1,
    "jan": 1,
    "february": 2,
    "feb": 2,
    "march": 3,
    "mar": 3,
    "april": 4,
    "apr": 4,
    "may": 5,
    "june": 6,
    "jun": 6,
    "july": 7,
    "jul": 7,
    "august": 8,
    "aug": 8,
    "september": 9,
    "sep": 9,
    "sept": 9,
    "october": 10,
    "oct": 10,
    "november": 11,
    "nov": 11,
    "december": 12,
    "dec": 12,
}


def ensure_ai_support_schema() -> bool:
    cached = getattr(g, "_ai_support_schema_ready", None)
    if cached is not None:
        return cached

    cursor = None
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS user_memories (
                id BIGINT NOT NULL AUTO_INCREMENT,
                user_id INT NOT NULL,
                memory_type VARCHAR(64) NOT NULL,
                memory_key VARCHAR(128) NOT NULL,
                label VARCHAR(255) NOT NULL,
                value_text TEXT NOT NULL,
                value_json LONGTEXT NULL,
                source VARCHAR(64) NOT NULL DEFAULT 'ai',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                last_used_at DATETIME NULL DEFAULT NULL,
                PRIMARY KEY (id),
                UNIQUE KEY uq_user_memory (user_id, memory_type, memory_key),
                KEY idx_user_memories_user_updated (user_id, updated_at)
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS ai_action_requests (
                id BIGINT NOT NULL AUTO_INCREMENT,
                user_id INT NOT NULL,
                action_type VARCHAR(64) NOT NULL,
                title VARCHAR(255) NOT NULL,
                confirmation_text TEXT NOT NULL,
                payload_json LONGTEXT NOT NULL,
                status VARCHAR(32) NOT NULL DEFAULT 'pending',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                confirmed_at DATETIME NULL DEFAULT NULL,
                executed_at DATETIME NULL DEFAULT NULL,
                cancelled_at DATETIME NULL DEFAULT NULL,
                error_text TEXT NULL,
                PRIMARY KEY (id),
                KEY idx_ai_action_requests_user_status_created (user_id, status, created_at)
            )
            """
        )
        g._ai_support_schema_ready = True
    except mysql.connector.Error:
        app.logger.exception("Failed to ensure AI support schema.")
        g._ai_support_schema_ready = False
    finally:
        if cursor is not None:
            cursor.close()

    return g._ai_support_schema_ready


def safe_json_dumps(value):
    return json.dumps(value, ensure_ascii=True)


def safe_json_loads(value, default=None):
    if value in (None, ""):
        return default

    try:
        return json.loads(value)
    except (TypeError, ValueError, json.JSONDecodeError):
        return default


def slugify_memory_key(value: str) -> str:
    key = re.sub(r"[^a-z0-9]+", "_", (value or "").strip().lower()).strip("_")
    return key[:128] or "memory"


def fetch_user_memories(user_id: int, limit: int = 6):
    if not ensure_ai_support_schema():
        return []

    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT id, memory_type, memory_key, label, value_text, value_json
        FROM user_memories
        WHERE user_id = %s
        ORDER BY updated_at DESC, id DESC
        LIMIT %s
        """,
        (user_id, limit),
    )
    memories = cursor.fetchall()
    cursor.close()
    return memories


def build_ai_memory_context(user_id: int, limit: int = 6) -> str:
    memories = fetch_user_memories(user_id, limit=limit)
    if not memories:
        return ""

    lines = []
    memory_ids = []
    for memory in memories:
        label = (memory.get("label") or memory.get("memory_type") or "Memory").strip()
        value_text = (memory.get("value_text") or "").strip()
        if not value_text:
            continue
        memory_ids.append(memory["id"])
        lines.append(f"- {label}: {value_text}")

    if memory_ids:
        db = get_db()
        cursor = db.cursor()
        cursor.executemany(
            "UPDATE user_memories SET last_used_at = NOW() WHERE id = %s",
            [(memory_id,) for memory_id in memory_ids],
        )
        cursor.close()

    return "\n".join(lines)


def normalize_ai_memory_items(raw_memories):
    if not isinstance(raw_memories, list):
        return []

    normalized = []
    seen_keys = set()

    for item in raw_memories[:3]:
        if not isinstance(item, dict):
            continue

        memory_type = slugify_memory_key(item.get("memory_type") or "memory")
        label = (item.get("label") or memory_type.replace("_", " ").title()).strip()[:255]
        value_text = str(item.get("value_text") or "").strip()
        if not value_text:
            continue

        memory_key = slugify_memory_key(item.get("memory_key") or label or memory_type)
        dedupe_key = (memory_type, memory_key)
        if dedupe_key in seen_keys:
            continue
        seen_keys.add(dedupe_key)

        value_json = item.get("value_json")
        normalized.append(
            {
                "memory_type": memory_type,
                "memory_key": memory_key,
                "label": label,
                "value_text": value_text,
                "value_json": value_json if isinstance(value_json, (dict, list, str, int, float, bool)) or value_json is None else str(value_json),
            }
        )

    return normalized


def save_user_memories(user_id: int, memories):
    if not memories or not ensure_ai_support_schema():
        return []

    normalized = normalize_ai_memory_items(memories)
    if not normalized:
        return []

    db = get_db()
    cursor = db.cursor()
    saved = []

    for memory in normalized:
        value_json = memory.get("value_json")
        cursor.execute(
            """
            INSERT INTO user_memories
                (user_id, memory_type, memory_key, label, value_text, value_json, source)
            VALUES (%s, %s, %s, %s, %s, %s, 'ai')
            ON DUPLICATE KEY UPDATE
                label = VALUES(label),
                value_text = VALUES(value_text),
                value_json = VALUES(value_json),
                source = VALUES(source),
                updated_at = NOW()
            """,
            (
                user_id,
                memory["memory_type"],
                memory["memory_key"],
                memory["label"],
                memory["value_text"],
                safe_json_dumps(value_json) if value_json is not None else None,
            ),
        )
        saved.append(f"{memory['label']}: {memory['value_text']}")

    cursor.close()
    return saved


def extract_json_object(text: str):
    if not text:
        return None

    candidate = text.strip()
    if candidate.startswith("```"):
        candidate = re.sub(r"^```(?:json)?\s*|\s*```$", "", candidate, flags=re.IGNORECASE | re.DOTALL).strip()

    try:
        return json.loads(candidate)
    except (TypeError, ValueError, json.JSONDecodeError):
        pass

    match = re.search(r"\{.*\}", candidate, re.DOTALL)
    if not match:
        return None

    try:
        return json.loads(match.group(0))
    except (TypeError, ValueError, json.JSONDecodeError):
        return None


def message_warrants_memory_analysis(message_text: str) -> bool:
    message = (message_text or "").strip()
    if not message:
        return False
    return AI_MEMORY_TRIGGER_PATTERN.search(message) is not None


def normalize_confirmation_choice(message_text: str):
    normalized = re.sub(r"[^a-z0-9'\s]+", " ", (message_text or "").lower()).strip()
    normalized = re.sub(r"\s+", " ", normalized)
    if not normalized:
        return None

    if normalized in AI_ACTION_CONFIRM_WORDS or any(normalized.startswith(f"{word} ") for word in AI_ACTION_CONFIRM_WORDS):
        return "confirm"

    if normalized in AI_ACTION_CANCEL_WORDS or any(normalized.startswith(f"{word} ") for word in AI_ACTION_CANCEL_WORDS):
        return "cancel"

    return None


def find_next_month_day(month_number: int, day_number: int):
    today = datetime.now().date()

    for year in (today.year, today.year + 1):
        try:
            candidate = datetime(year, month_number, day_number).date()
        except ValueError:
            return None
        if candidate >= today:
            return candidate

    return None


def extract_birthday_memory_and_action(user, message_text: str):
    match = re.search(
        r"\bmy birthday(?: is| is on|'s on| falls on)?\s+([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\b",
        message_text or "",
        re.IGNORECASE,
    )
    if not match:
        return {"memories": [], "action": None}

    month_name_raw = match.group(1).lower()
    day_number = int(match.group(2))
    month_number = MONTH_LOOKUP.get(month_name_raw)
    if not month_number:
        return {"memories": [], "action": None}

    next_occurrence = find_next_month_day(month_number, day_number)
    if not next_occurrence:
        return {"memories": [], "action": None}

    display_value = f"{calendar.month_name[month_number]} {day_number}"
    full_name = (user.get("name") or "").strip()
    event_title = f"{full_name}'s birthday" if full_name else "Birthday"

    action = None
    if calendar_schema_available():
        action = {
            "type": "create_calendar_event",
            "title": event_title,
            "confirmation_text": f"You told me your birthday is {display_value}. Want me to add your next birthday to your calendar?",
            "payload": {
                "title": event_title,
                "event_date": next_occurrence.isoformat(),
                "event_time": "09:00",
                "category": "personal",
                "color": DEFAULT_AI_ACTION_COLOR,
            },
        }

    return {
        "memories": [
            {
                "memory_type": "birthday",
                "memory_key": "birthday",
                "label": "Birthday",
                "value_text": display_value,
                "value_json": {
                    "month": month_number,
                    "day": day_number,
                    "next_occurrence": next_occurrence.isoformat(),
                },
            }
        ],
        "action": action,
    }


def normalize_ai_action(raw_action, user):
    if not isinstance(raw_action, dict):
        return None

    action_type = slugify_memory_key(raw_action.get("type") or "")
    payload = raw_action.get("payload")
    if not isinstance(payload, dict):
        payload = {}

    if action_type == "create_task":
        title = str(payload.get("title") or raw_action.get("title") or "").strip()
        if not title:
            return None

        list_id = parse_optional_int(payload.get("list_id"))
        return {
            "type": action_type,
            "title": title[:255],
            "confirmation_text": (raw_action.get("confirmation_text") or f'Want me to add "{title}" to your tasks?').strip(),
            "payload": {
                "title": title[:255],
                "list_id": list_id,
            },
        }

    if action_type == "create_habit":
        name = str(payload.get("name") or raw_action.get("title") or "").strip()
        if not name:
            return None

        frequency = str(payload.get("frequency") or "Daily").strip() or "Daily"
        icon = str(payload.get("icon") or "↺").strip() or "↺"
        return {
            "type": action_type,
            "title": name[:255],
            "confirmation_text": (raw_action.get("confirmation_text") or f'Want me to create the habit "{name}"?').strip(),
            "payload": {
                "name": name[:255],
                "frequency": frequency[:20],
                "icon": icon[:10],
            },
        }

    if action_type == "create_calendar_event":
        title = str(payload.get("title") or raw_action.get("title") or "").strip()
        event_date = str(payload.get("event_date") or "").strip()
        if not title or not event_date:
            return None

        event_time = str(payload.get("event_time") or "").strip() or "09:00"
        category = str(payload.get("category") or "personal").strip() or "personal"
        color = str(payload.get("color") or DEFAULT_AI_ACTION_COLOR).strip() or DEFAULT_AI_ACTION_COLOR

        return {
            "type": action_type,
            "title": title[:255],
            "confirmation_text": (raw_action.get("confirmation_text") or f'Want me to add "{title}" to your calendar?').strip(),
            "payload": {
                "title": title[:255],
                "event_date": event_date[:10],
                "event_time": event_time[:5],
                "category": category[:32],
                "color": color[:64],
            },
        }

    return None


def analyze_message_for_memories_and_actions(client, user, message_text: str, active_page: str):
    fallback = extract_birthday_memory_and_action(user, message_text)
    if not message_warrants_memory_analysis(message_text):
        return fallback

    prompt = (
        "Today is "
        f"{datetime.now().date().isoformat()}.\n"
        f"Current TaskFlow page: {active_page}.\n"
        f"User message: {message_text}\n\n"
        "Return strict JSON only with this shape:\n"
        "{\n"
        '  "memories": [{"memory_type":"","memory_key":"","label":"","value_text":"","value_json":{}}],\n'
        '  "action": {"type":"","title":"","confirmation_text":"","payload":{}}\n'
        "}\n\n"
        "Rules:\n"
        "- Save only durable facts or preferences worth remembering later.\n"
        "- Supported actions: create_task, create_habit, create_calendar_event.\n"
        "- Only propose an action if the user clearly asked to create/add/schedule something, or if they mention a birthday worth offering to add to the calendar.\n"
        "- For calendar events, payload.event_date must be YYYY-MM-DD and payload.event_time must be HH:MM or null.\n"
        "- If nothing should be saved, return an empty memories array.\n"
        '- If no action is needed, set "action" to null.\n'
        "- Never include extra commentary outside the JSON."
    )

    try:
        response = client.messages.create(
            model=ANTHROPIC_DEFAULT_MODEL,
            max_tokens=220,
            system="You extract durable user memory and safe confirmation-gated TaskFlow actions.",
            messages=[{"role": "user", "content": prompt}],
        )
        data = extract_json_object(extract_anthropic_text(response)) or {}
    except Exception:
        app.logger.exception("AI memory extraction failed.")
        return fallback

    memories = normalize_ai_memory_items(data.get("memories") or [])
    action = normalize_ai_action(data.get("action"), user)

    if not memories and not action:
        return fallback

    if fallback["memories"]:
        seen = {(memory["memory_type"], memory["memory_key"]) for memory in memories}
        for memory in fallback["memories"]:
            key = (memory["memory_type"], memory["memory_key"])
            if key not in seen:
                memories.append(memory)
                seen.add(key)

    if action is None and fallback["action"] is not None:
        action = fallback["action"]

    return {"memories": memories[:3], "action": action}


def create_ai_action_request(user_id: int, action):
    if not action or not ensure_ai_support_schema():
        return None

    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        """
        UPDATE ai_action_requests
        SET status = 'cancelled', cancelled_at = NOW(), error_text = NULL
        WHERE user_id = %s AND status = 'pending'
        """,
        (user_id,),
    )
    cursor.execute(
        """
        INSERT INTO ai_action_requests
            (user_id, action_type, title, confirmation_text, payload_json, status)
        VALUES (%s, %s, %s, %s, %s, 'pending')
        """,
        (
            user_id,
            action["type"],
            action["title"],
            action["confirmation_text"],
            safe_json_dumps(action["payload"]),
        ),
    )
    action_id = cursor.lastrowid
    cursor.close()

    return {
        "id": action_id,
        "type": action["type"],
        "title": action["title"],
        "confirmation_text": action["confirmation_text"],
    }


def fetch_ai_action_request(user_id: int, action_id: int | None = None, status: str | None = None):
    if not ensure_ai_support_schema():
        return None

    conditions = ["user_id = %s"]
    params = [user_id]

    if action_id is not None:
        conditions.append("id = %s")
        params.append(action_id)

    if status is not None:
        conditions.append("status = %s")
        params.append(status)

    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute(
        f"""
        SELECT id, user_id, action_type, title, confirmation_text, payload_json, status, created_at
        FROM ai_action_requests
        WHERE {' AND '.join(conditions)}
        ORDER BY created_at DESC, id DESC
        LIMIT 1
        """,
        tuple(params),
    )
    action = cursor.fetchone()
    cursor.close()
    return action


def execute_ai_action_request(action_row):
    payload = safe_json_loads(action_row.get("payload_json"), default={}) or {}
    action_type = action_row.get("action_type")
    user_id = action_row["user_id"]
    db = get_db()
    cursor = db.cursor()

    try:
        if action_type == "create_task":
            title = str(payload.get("title") or "").strip()
            if not title:
                raise ValueError("Task title is missing.")

            list_id = parse_optional_int(payload.get("list_id"))
            if not list_id or not user_owns_list(user_id, list_id):
                list_id = get_inbox_list_id(user_id)

            cursor.execute(
                """
                INSERT INTO tasks (user_id, list_id, title, description)
                VALUES (%s, %s, %s, %s)
                """,
                (user_id, list_id, title, ""),
            )
            return {"reply": f'Added "{title}" to your tasks.', "action_type": action_type}

        if action_type == "create_habit":
            if not habits_schema_available():
                raise ValueError("Habits are not configured in the database yet.")

            name = str(payload.get("name") or "").strip()
            if not name:
                raise ValueError("Habit name is missing.")

            icon = str(payload.get("icon") or "↺").strip() or "↺"
            frequency = str(payload.get("frequency") or "Daily").strip() or "Daily"
            cursor.execute(
                """
                INSERT INTO habits (user_id, name, icon, frequency, streak, created_at)
                VALUES (%s, %s, %s, %s, 0, NOW())
                """,
                (user_id, name, icon, frequency),
            )
            return {"reply": f'Created the habit "{name}".', "action_type": action_type}

        if action_type == "create_calendar_event":
            if not calendar_schema_available():
                raise ValueError("Calendar is not configured in the database yet.")

            title = str(payload.get("title") or "").strip()
            event_date = str(payload.get("event_date") or "").strip()
            if not title or not event_date:
                raise ValueError("Calendar event details are incomplete.")

            event_time = str(payload.get("event_time") or "09:00").strip() or "09:00"
            category = str(payload.get("category") or "personal").strip() or "personal"
            color = str(payload.get("color") or DEFAULT_AI_ACTION_COLOR).strip() or DEFAULT_AI_ACTION_COLOR
            cursor.execute(
                """
                INSERT INTO calendar_events (user_id, title, event_date, event_time, category, color, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
                """,
                (user_id, title, event_date, event_time, category, color),
            )
            return {"reply": f'Added "{title}" to your calendar.', "action_type": action_type}

        raise ValueError("That TaskFlow action is not supported yet.")
    finally:
        cursor.close()


def confirm_ai_action_request(action_row):
    db = get_db()
    cursor = db.cursor()

    try:
        result = execute_ai_action_request(action_row)
        cursor.execute(
            """
            UPDATE ai_action_requests
            SET status = 'executed', confirmed_at = NOW(), executed_at = NOW(), error_text = NULL
            WHERE id = %s AND user_id = %s
            """,
            (action_row["id"], action_row["user_id"]),
        )
        return {"ok": True, "reply": result["reply"], "status": "executed", "action_type": result["action_type"]}
    except Exception as exc:
        cursor.execute(
            """
            UPDATE ai_action_requests
            SET status = 'failed', confirmed_at = NOW(), error_text = %s
            WHERE id = %s AND user_id = %s
            """,
            (str(exc), action_row["id"], action_row["user_id"]),
        )
        app.logger.exception("AI action execution failed.")
        return {"ok": False, "reply": f"I couldn't make that change: {exc}", "status": "failed"}
    finally:
        cursor.close()


def cancel_ai_action_request(action_row):
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        """
        UPDATE ai_action_requests
        SET status = 'cancelled', cancelled_at = NOW(), error_text = NULL
        WHERE id = %s AND user_id = %s
        """,
        (action_row["id"], action_row["user_id"]),
    )
    cursor.close()
    return {"ok": True, "reply": "Okay — I won't make that change.", "status": "cancelled"}


def fetch_habit_for_user(habit_id: int, user_id: int):
    if not habits_schema_available():
        return None

    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT
            id,
            name,
            COALESCE(icon, '↺') AS icon,
            COALESCE(frequency, 'Daily') AS frequency,
            COALESCE(streak, 0) AS streak,
            created_at
        FROM habits
        WHERE id = %s
          AND user_id = %s
          AND deleted_at IS NULL
        """,
        (habit_id, user_id),
    )
    habit = cursor.fetchone()
    cursor.close()
    return habit


# ============================================================
# 10) PUBLIC PAGES (no login required)
# ============================================================

@app.route("/")
def landing_page():
    return render_template("landing_page.html")


@app.route("/blog")
def blog_page():
    featured_post = BLOG_POSTS[0]
    recent_posts = BLOG_POSTS[1:]
    return render_template(
        "navlinks/blog.html",
        featured_post=featured_post,
        recent_posts=recent_posts,
    )


@app.route("/blog/<slug>")
def blog_post_page(slug):
    post = BLOG_POSTS_BY_SLUG.get(slug)
    if not post:
        abort(404)

    related_posts = [item for item in BLOG_POSTS if item["slug"] != slug][:3]
    return render_template(
        "navlinks/blog_post.html",
        post=post,
        related_posts=related_posts,
    )


@app.route("/terms")
def terms_page():
    return render_template("policy/terms.html")

@app.route("/cookie")
def cookie_page():
    return render_template("policy/cookie.html")
@app.route("/contact", methods=["GET", "POST"])
def contact_page():
    form_data = {
        "name": "",
        "email": "",
        "inquiry_type": "Support",
        "message": "",
    }
    errors = {}
    success_message = None

    if request.args.get("sent") == "1":
        success_message = "Message sent. We usually reply within 24 to 48 hours."

    if request.method == "POST":
        form_data = {
            "name": (request.form.get("name") or "").strip(),
            "email": (request.form.get("email") or "").strip().lower(),
            "inquiry_type": (request.form.get("inquiry_type") or "Support").strip(),
            "message": (request.form.get("message") or "").strip(),
        }

        if not form_data["name"]:
            errors["name"] = "Please enter your name."

        if not form_data["email"] or "@" not in form_data["email"]:
            errors["email"] = "Please enter a valid email address."

        if form_data["inquiry_type"] not in CONTACT_INQUIRY_OPTIONS:
            errors["inquiry_type"] = "Please choose a valid inquiry type."

        if not form_data["message"]:
            errors["message"] = "Please enter a message."
        elif len(form_data["message"]) < 20:
            errors["message"] = "Add a bit more detail so we can help you faster."

        mail_ready = bool(app.config.get("MAIL_USERNAME") and app.config.get("MAIL_PASSWORD"))
        if not errors and not mail_ready:
            errors["general"] = (
                f"We couldn't send the form right now. Email us directly at {CONTACT_EMAIL}."
            )

        if not errors:
            if send_contact_form_email(
                form_data["name"],
                form_data["email"],
                form_data["inquiry_type"],
                form_data["message"],
            ):
                return redirect(url_for("contact_page", sent=1))

            errors["general"] = (
                f"We couldn't send your message right now. Email us directly at {CONTACT_EMAIL}."
            )

    return render_template(
        "navlinks/contact.html",
        form_data=form_data,
        errors=errors,
        success_message=success_message,
        contact_email=CONTACT_EMAIL,
        inquiry_options=CONTACT_INQUIRY_OPTIONS,
    )


@app.route("/privacy")
def privacy_page():
    return render_template("policy/privacy.html")

@app.route("/features")
def features_page():
    return render_template("navlinks/features.html")
@app.route("/premium")
def premium_page():
    return render_template("navlinks/premium.html")
@app.route("/pricing")
def pricing_page():
    return render_template("navlinks/pricing.html")
@app.route("/about")
def about_page():
    return render_template("navlinks/about.html")


# ============================================================
# 11) AUTH ROUTES (register/login/logout)
# ============================================================

@app.route("/register", methods=["GET", "POST"])
def register_page():
    if request.method == "POST":
        first = request.form.get("first_name", "").strip().capitalize()
        last = request.form.get("last_name", "").strip().capitalize()
        email = request.form.get("email", "").strip().lower()
        username = request.form.get("username", "").strip().lower()
        identifier = request.form.get("identifier", "").strip().lower()
        password = request.form.get("password", "").strip()

        # Support both the current template fields and the older identifier-only form.
        if identifier:
            if not email and "@" in identifier:
                email = identifier
            elif not username:
                username = identifier

        if not all([first, last, email, password]):
            return render_template("auth/register.html", error_identifier="Please fill out all required fields.")

        if "@" not in email:
            return render_template("auth/register.html", error_identifier="Please use a valid email address.")

        if username and "@" in username:
            return render_template("auth/register.html", error_identifier="Username cannot be an email address.")

        try:
            if username and fetch_user_by_username(username):
                return render_template("auth/register.html", error_identifier="Username already exists.")

            if email and fetch_user_by_email(email):
                return render_template("auth/register.html", error_identifier="Email already exists.")

            # If user registered with email only, auto-generate username from email prefix.
            if not username:
                base = email.split("@")[0]
                username = base
                i = 0
                while fetch_user_by_username(username):
                    i += 1
                    username = f"{base}{i}"

            password_hash = generate_password_hash(password)
            full_name = f"{first} {last}"

            user_id = create_user_local(full_name, username, email, password_hash)
            token = generate_email_verification_token(user_id, email)
            set_email_verification_token(user_id, token)
        except mysql.connector.Error:
            app.logger.exception("Registration failed because the database is unavailable.")
            return render_template("auth/register.html", error_identifier=AUTH_DB_ERROR_MESSAGE), 503

        send_welcome_email(email, first)
        verification_sent = send_verification_email(email, token)

        verify_status = "sent" if verification_sent else "mail_error"
        return redirect(url_for("login_page", verify=verify_status))

    return render_template("auth/register.html")


@app.route("/login", methods=["GET", "POST"])
def login_page():
    error_identifier = None
    error_password = None
    info_message = None

    verify_status = request.args.get("verify")
    if verify_status == "sent":
        info_message = "Account created. Check your email for the verification link."
    elif verify_status == "mail_error":
        info_message = AUTH_MAIL_ERROR_MESSAGE

    if request.method == "POST":
        identifier = (
            request.form.get("identifier")
            or request.form.get("username")
            or request.form.get("email")
            or ""
        ).strip().lower()
        password = request.form.get("password", "")

        if not identifier:
            error_identifier = "Enter your username or email."
        elif not password:
            error_password = "Enter your password."
        else:
            try:
                db = get_db()
                cursor = db.cursor()
                cursor.execute(
                    """
                    SELECT id, name, username, password_hash, auth_provider, email
                    FROM users
                    WHERE username=%s OR email=%s
                    """,
                    (identifier, identifier),
                )
                user = cursor.fetchone()
                cursor.close()
            except mysql.connector.Error:
                app.logger.exception("Login failed because the database is unavailable.")
                return render_template(
                    "auth/login.html",
                    error_identifier=AUTH_DB_ERROR_MESSAGE,
                    error_password=error_password,
                    info_message=info_message,
                ), 503

            if not user:
                error_identifier = "Invalid username/email or password."
            elif not user[3] or not check_password_hash(user[3], password):
                error_password = "Invalid username/email or password."
            else:
                session.update({
                    "user_id": user[0],
                    "user_name": user[1],
                    "username": user[2]
                })
                return redirect(url_for("home_page"))

    return render_template("auth/login.html",
                           error_identifier=error_identifier,
                           error_password=error_password,
                           info_message=info_message)


@app.route("/verify-email")
def verify_email():
    token = request.args.get("token", "")
    if not token:
        return render_template("auth/verify_email_result.html", status="invalid")

    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute(
        "SELECT id, email, is_verified, email_verify_token FROM users WHERE email_verify_token=%s",
        (token,),
    )
    user = cursor.fetchone()
    cursor.close()

    if not user:
        return render_template("auth/verify_email_result.html", status="invalid")

    try:
        data = verify_email_token(token)
    except SignatureExpired:
        return render_template("auth/verify_email_result.html", status="expired")
    except BadSignature:
        return render_template("auth/verify_email_result.html", status="invalid")

    if data.get("user_id") != user["id"] or data.get("email") != user["email"]:
        return render_template("auth/verify_email_result.html", status="invalid")

    if not user["is_verified"]:
        mark_user_verified(user["id"])

    return redirect(url_for("home_page"))

@app.route("/username_suggestions", methods=["POST"])
def username_suggestions():
    first = (request.form.get("first_name") or "").lower()
    last = (request.form.get("last_name") or "").lower()

    if not first or not last:
        return {"suggestions": []}

    try:
        patterns = [
            f"{first}{last}",
            f"{first}.{last}",
            f"{first}_{last}",
            f"{first}{last[:1]}",
            f"{first[:1]}{last}",
            f"{first}{last}{len(first)}",
            f"{first}{last}dev",
            f"{first}{last}ai",
            f"{first}_{last}_tf"
        ]

        suggestions = []
        for name in patterns:
            if not fetch_user_by_username(name):
                suggestions.append(name)
            if len(suggestions) >= 6:
                break
    except mysql.connector.Error:
        app.logger.exception("Username suggestions failed because the database is unavailable.")
        return {"suggestions": [], "error": "database_unavailable"}, 503

    return {"suggestions": suggestions}

@app.route("/check-identifier", methods=["POST"])
def check_identifier():
    identifier = (request.form.get("identifier") or "").lower()

    try:
        exists = False
        if "@" in identifier:
            exists = bool(fetch_user_by_email(identifier))
        else:
            exists = bool(fetch_user_by_username(identifier))
    except mysql.connector.Error:
        app.logger.exception("Identifier availability check failed because the database is unavailable.")
        return {"exists": False, "error": "database_unavailable"}, 503

    return {"exists": exists}

@app.route("/logout")
def logout():
    """
    Logs the user out by clearing their session cookie.
    """
    session.clear()
    return redirect(url_for("landing_page"))

# ============================================================
# 12) ACCOUNT / SETTINGS ROUTES (login required)
# ============================================================

@app.route("/account")
@login_required
def account_page():
    user = fetch_user_by_id(session["user_id"])
    is_modal = request.args.get("modal")
    verify_notice = request.args.get("verify")

    template = (
        "auth/account_modal.html"
        if is_modal
        else "auth/account_page.html"
    )

    return render_template(
        template,
        name=user["name"].split()[0],
        full_name=user["name"],
        username=user["username"],
        email=user["email"],
        profile_image=user["profile_image"] or "default.png",
        auth_provider=user["auth_provider"],
        is_verified=bool(user["is_verified"]),
        verify_notice=verify_notice,
    )


@app.route("/resend-verification")
@login_required
def resend_verification():
    user = fetch_user_by_id(session["user_id"])

    if user["auth_provider"] or not user["email"]:
        return redirect(url_for("account_page", modal=1, verify="not-applicable"))

    if user["is_verified"]:
        return redirect(url_for("account_page", modal=1, verify="already"))

    token = generate_email_verification_token(user["id"], user["email"])
    set_email_verification_token(user["id"], token)
    send_verification_email(user["email"], token)

    return redirect(url_for("verify_email_pending"))


@app.route("/verify-email/pending")
@login_required
def verify_email_pending():
    return render_template("auth/verify_email_result.html", status="pending")




@app.route("/upload_profile", methods=["POST"])
@login_required
def upload_profile():
    """
    Receives a profile image upload from your JS fetch() call.
    Saves image to /static/uploads and stores filename in DB.
    """
    if "profile_image" not in request.files:
        abort(400, "Missing file: profile_image")

    file = request.files["profile_image"]
    if not file or file.filename == "":
        abort(400, "No file selected")

    if not allowed_file(file.filename):
        abort(400, "Invalid file type")

    # Ensure folder exists
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    ext = file.filename.rsplit(".", 1)[1].lower()
    filename = f"user_{session['user_id']}_{int(datetime.now().timestamp())}.{ext}"
    filename = secure_filename(filename)

    file.save(os.path.join(app.config["UPLOAD_FOLDER"], filename))

    # Save filename in database
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "UPDATE users SET profile_image=%s WHERE id=%s",
        (filename, session["user_id"])
    )
    cursor.close()

    return ("", 204)


@app.route("/update_profile_name", methods=["POST"])
@login_required
def update_profile_name():
    full_name = (request.form.get("full_name") or "").strip()
    if not full_name:
        abort(400, "Name is required")

    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "UPDATE users SET name=%s WHERE id=%s",
        (full_name, session["user_id"])
    )
    db.commit()
    cursor.close()

    session["user_name"] = full_name
    return ("", 204)


# ============================================================
# 13) PASSWORD RESET (MVP)
# ============================================================

@app.route("/accountreset", methods=["GET", "POST"])
def account_reset():
    """
    Simple password reset page (MVP):
    - User types email
    - We DO NOT reveal if email exists (security best practice)
    - Later you can email a token link
    """
    if request.method == "POST":
        email = (request.form.get("email") or "").strip().lower()

        if not email:
            return render_template("auth/account_reset.html", error="Enter your email.")

        if "@" not in email or "." not in email:
            return render_template("auth/account_reset.html", error="Enter a valid email address.")

        _user = fetch_user_by_email(email)  # don't reveal result

        return render_template(
            "auth/account_reset.html",
            message="If that email exists, a reset link has been sent."
        )

    return render_template("auth/account_reset.html")


# ============================================================
# 14) DASHBOARD / HOME (login required)
# ============================================================

def fetch_dashboard_tasks(user_id: int, limit: int = 7):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT
            t.id,
            t.title,
            t.completed,
            t.created_at,
            t.list_id,
            tl.name AS list_name
        FROM tasks t
        LEFT JOIN task_lists tl ON tl.id = t.list_id
        WHERE t.user_id = %s
        ORDER BY t.completed ASC, t.created_at DESC
        LIMIT %s
        """,
        (user_id, limit),
    )
    tasks = cursor.fetchall()
    cursor.close()

    for index, task in enumerate(tasks):
        if task["completed"]:
            task["priority"] = "low"
        elif index == 0:
            task["priority"] = "high"
        else:
            task["priority"] = "medium"

        task["category"] = task.get("list_name") or "Task"

    return tasks


def fetch_dashboard_task_counts(user_id: int):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT
            COUNT(*) AS total,
            COALESCE(SUM(completed), 0) AS completed_count
        FROM tasks
        WHERE user_id = %s
        """,
        (user_id,),
    )
    row = cursor.fetchone()
    cursor.close()
    return {
        "total": row["total"] or 0,
        "completed": row["completed_count"] or 0,
    }


def fetch_today_journal_entry(user_id: int):
    journal_folder_id = get_journal_folder_id(user_id)

    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT id, title, content, created_at, updated_at
        FROM notes
        WHERE user_id = %s
          AND folder_id = %s
          AND deleted_at IS NULL
          AND DATE(created_at) = CURDATE()
        ORDER BY updated_at DESC, created_at DESC
        LIMIT 1
        """,
        (user_id, journal_folder_id),
    )
    note = cursor.fetchone()
    cursor.close()
    return note


def fetch_user_habits(user_id: int):
    if not habits_schema_available():
        return []

    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT
            h.id,
            h.name,
            COALESCE(h.icon, '↺') AS icon,
            COALESCE(h.frequency, 'Daily') AS frequency,
            COALESCE(h.streak, 0) AS streak,
            h.created_at,
            MAX(CASE WHEN DATE(hc.completed_date) = CURDATE() THEN 1 ELSE 0 END) AS completed_today
        FROM habits h
        LEFT JOIN habit_completions hc
          ON hc.habit_id = h.id
         AND hc.user_id = h.user_id
        WHERE h.user_id = %s
          AND h.deleted_at IS NULL
        GROUP BY h.id, h.name, h.icon, h.frequency, h.streak, h.created_at
        ORDER BY h.created_at ASC
        """,
        (user_id,),
    )
    habits = cursor.fetchall()
    cursor.close()

    for habit in habits:
        habit["completed_today"] = bool(habit.get("completed_today"))

    return habits


def calculate_habit_week_completion_pct(user_id: int, habits_total: int):
    if habits_total <= 0 or not habits_schema_available():
        return 0

    today = datetime.now().date()
    week_start = today - timedelta(days=today.weekday())

    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT COUNT(*) AS completion_count
        FROM habit_completions
        WHERE user_id = %s
          AND DATE(completed_date) BETWEEN %s AND %s
        """,
        (user_id, week_start, today),
    )
    row = cursor.fetchone() or {}
    cursor.close()

    completion_count = row.get("completion_count") or 0
    possible_completions = habits_total * ((today - week_start).days + 1)
    return min(100, int((completion_count / max(possible_completions, 1)) * 100))


def build_habit_activity_map(user_id: int, habits_total: int, days: int = 91):
    if habits_total <= 0 or not habits_schema_available():
        return [0] * days

    start_date = datetime.now().date() - timedelta(days=days - 1)

    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT DATE(completed_date) AS completed_day, COUNT(*) AS completion_count
        FROM habit_completions
        WHERE user_id = %s
          AND DATE(completed_date) >= %s
        GROUP BY DATE(completed_date)
        ORDER BY completed_day ASC
        """,
        (user_id, start_date),
    )
    counts_by_day = {
        row["completed_day"]: row["completion_count"]
        for row in cursor.fetchall()
        if row.get("completed_day") is not None
    }
    cursor.close()

    return [
        min((counts_by_day.get(start_date + timedelta(days=index), 0) / habits_total), 1)
        for index in range(days)
    ]


def build_habit_ai_insight(habits):
    if not habits:
        return "Start with one small daily habit. Consistency beats intensity over time."

    next_due = next((habit for habit in habits if not habit["completed_today"]), None)
    best = max(habits, key=lambda habit: habit["streak"], default=None)

    if next_due and next_due["streak"] >= 3:
        return f"{next_due['name']} is on a {next_due['streak']}-day streak. Mark it done today to keep momentum."

    if next_due:
        return f"You haven't completed {next_due['name']} yet today. A quick win now makes the rest of the day easier."

    if best:
        return f"All habits are complete today. {best['name']} leads with a {best['streak']}-day streak."

    return "You complete more habits on days you start early. Keep the streak alive."


def fetch_dashboard_active_days(user_id: int, now: datetime):
    journal_folder_id = get_journal_folder_id(user_id)
    include_habits = habits_schema_available()

    db = get_db()
    cursor = db.cursor(dictionary=True)
    query = """
        SELECT activity_date
        FROM (
            SELECT DATE(created_at) AS activity_date
            FROM tasks
            WHERE user_id = %s
              AND YEAR(created_at) = %s
              AND MONTH(created_at) = %s
            UNION
            SELECT DATE(COALESCE(updated_at, created_at)) AS activity_date
            FROM notes
            WHERE user_id = %s
              AND folder_id = %s
              AND deleted_at IS NULL
              AND YEAR(COALESCE(updated_at, created_at)) = %s
              AND MONTH(COALESCE(updated_at, created_at)) = %s
    """
    params = [
        user_id,
        now.year,
        now.month,
        user_id,
        journal_folder_id,
        now.year,
        now.month,
    ]

    if include_habits:
        query += """
            UNION
            SELECT DATE(completed_date) AS activity_date
            FROM habit_completions
            WHERE user_id = %s
              AND YEAR(completed_date) = %s
              AND MONTH(completed_date) = %s
        """
        params.extend([user_id, now.year, now.month])

    query += """
        ) dashboard_activity
        ORDER BY activity_date
    """
    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    cursor.close()
    return sorted({row["activity_date"].day for row in rows if row["activity_date"]})


def calculate_dashboard_streak(user_id: int, now: datetime):
    journal_folder_id = get_journal_folder_id(user_id)
    cutoff = (now.date() - timedelta(days=90)).isoformat()
    include_habits = habits_schema_available()

    db = get_db()
    cursor = db.cursor(dictionary=True)
    query = """
        SELECT activity_date
        FROM (
            SELECT DATE(created_at) AS activity_date
            FROM tasks
            WHERE user_id = %s
              AND DATE(created_at) >= %s
            UNION
            SELECT DATE(COALESCE(updated_at, created_at)) AS activity_date
            FROM notes
            WHERE user_id = %s
              AND folder_id = %s
              AND deleted_at IS NULL
              AND DATE(COALESCE(updated_at, created_at)) >= %s
    """
    params = [user_id, cutoff, user_id, journal_folder_id, cutoff]

    if include_habits:
        query += """
            UNION
            SELECT DATE(completed_date) AS activity_date
            FROM habit_completions
            WHERE user_id = %s
              AND DATE(completed_date) >= %s
        """
        params.extend([user_id, cutoff])

    query += """
        ) dashboard_activity
        ORDER BY activity_date DESC
    """
    cursor.execute(query, tuple(params))
    active_dates = {
        row["activity_date"]
        for row in cursor.fetchall()
        if row["activity_date"] is not None
    }
    cursor.close()

    streak = 0
    current_day = now.date()
    while current_day in active_dates:
        streak += 1
        current_day -= timedelta(days=1)
    return streak


def build_dashboard_ai_insight(tasks, tasks_done, tasks_total, journaled_today, streak):
    if tasks_total == 0:
        return "Add your first task so TaskFlow can start organizing your day."

    remaining = max(tasks_total - tasks_done, 0)
    next_task = next((task for task in tasks if not task["completed"]), None)

    if remaining and next_task:
        return f"You have {remaining} task{'s' if remaining != 1 else ''} left. Start with {next_task['title']} to build momentum."

    if not journaled_today:
        return "You cleared your tasks. Take two minutes to journal what worked so you can repeat it tomorrow."

    if streak >= 3:
        return f"You're on a {streak}-day streak. Protect it with one meaningful action before you log off."

    return "Focus on your most important task first. Small wins compound into big results."


def build_home_dashboard_context(user_id: int):
    now = datetime.now()
    hour = now.hour
    greeting = "morning" if hour < 12 else "afternoon" if hour < 17 else "evening"

    user = fetch_user_by_id(user_id) or {
        "username": "there",
        "name": "TaskFlow User",
        "profile_image": "default.png",
    }

    tasks = fetch_dashboard_tasks(user_id)
    task_counts = fetch_dashboard_task_counts(user_id)
    today_journal_entry = fetch_today_journal_entry(user_id)
    journaled_today = bool(today_journal_entry and (today_journal_entry.get("content") or "").strip())

    habits = fetch_user_habits(user_id)
    habits_done = sum(1 for habit in habits if habit["completed_today"])
    habits_total = len(habits)
    habits_due = max(habits_total - habits_done, 0)

    growth_slots_total = task_counts["total"] + habits_total + 1
    growth_slots_done = task_counts["completed"] + habits_done + (1 if journaled_today else 0)
    growth_score = min(100, int((growth_slots_done / max(growth_slots_total, 1)) * 100))

    first_weekday, days_in_month = calendar.monthrange(now.year, now.month)
    first_day_of_month = (first_weekday + 1) % 7
    active_days = fetch_dashboard_active_days(user_id, now)
    streak = calculate_dashboard_streak(user_id, now)

    return {
        "current_user": SimpleNamespace(
            is_authenticated=True,
            username=user.get("username") or "there",
            streak=streak,
        ),
        "user": user,
        "username": user.get("username") or "there",
        "name": (user.get("name") or "TaskFlow User").split()[0],
        "greeting": greeting,
        "today_date": now.strftime("%A, %B %d"),
        "current_month": now.strftime("%B %Y"),
        "today_day": now.day,
        "first_day_of_month": first_day_of_month,
        "days_in_month": days_in_month,
        "active_days": active_days,
        "streak": streak,
        "tasks": tasks,
        "habits": habits,
        "tasks_done": task_counts["completed"],
        "tasks_total": task_counts["total"],
        "habits_done": habits_done,
        "habits_total": habits_total,
        "habits_due": habits_due,
        "growth_score": growth_score,
        "journaled_today": journaled_today,
        "today_journal_entry": today_journal_entry,
        "journal_prompt": "What's one thing you want to accomplish today — and why does it matter?",
        "ai_insight": build_dashboard_ai_insight(
            tasks,
            task_counts["completed"],
            task_counts["total"],
            journaled_today,
            streak,
        ),
    }


def build_dashboard_day_plan(context):
    open_tasks = [task for task in context["tasks"] if not task["completed"]]
    lines = [f"Good {context['greeting']}. Here's your plan for today:"]

    if open_tasks:
        lines.append(f"1. Start with {open_tasks[0]['title']}. Finish that before switching contexts.")
        if len(open_tasks) > 1:
            lines.append(f"2. Then move to {open_tasks[1]['title']} while your momentum is still high.")
        else:
            lines.append("2. After that, review your list and capture the next most important task.")
    else:
        lines.append("1. Capture one meaningful task so your day has a clear target.")
        lines.append("2. Use the extra space today to review your week and clean up loose ends.")

    if not context["journaled_today"]:
        lines.append("3. Spend two minutes journaling what matters today and what could get in the way.")
    else:
        lines.append("3. Re-read your journal entry and use it as your checkpoint before the day ends.")

    if context["streak"] > 0:
        lines.append(f"4. Protect your {context['streak']}-day streak by closing out one intentional action before you log off.")
    else:
        lines.append("4. Build momentum with one small win you can finish today.")

    return "\n".join(lines)


def build_ai_coach_system_context(user_id: int, active_page: str) -> str:
    ctx = build_home_dashboard_context(user_id)
    habit_context = sorted(
        fetch_user_habits(user_id),
        key=lambda habit: habit.get("streak") or 0,
        reverse=True,
    )[:5]

    journal_preview = "None"
    today_entry = ctx.get("today_journal_entry")
    if today_entry and (today_entry.get("content") or "").strip():
        content = (today_entry.get("content") or "").strip()
        journal_preview = content[:140] + ("..." if len(content) > 140 else "")

    return "\n".join(
        [
            "Here is what you know about this user RIGHT NOW:",
            f"- Current page: {active_page}",
            f"- Name: {ctx['name'] if ctx.get('name') else ctx.get('username', 'there')}",
            f"- Tasks today: {', '.join(task['title'] for task in ctx['tasks']) if ctx.get('tasks') else 'None added yet'}",
            f"- Tasks completed: {ctx['tasks_done']}/{ctx['tasks_total']}",
            f"- Habits: {', '.join(habit['name'] for habit in habit_context) if habit_context else 'None added yet'}",
            f"- Habit streaks: {', '.join(str(habit['streak']) for habit in habit_context) if habit_context else 'N/A'}",
            f"- Growth score today: {ctx['growth_score']}/100",
            f"- Today's journal: {journal_preview}",
            f"- Greeting: {ctx['greeting']}",
            f"- Current streak: {ctx['streak']}",
        ]
    )


def create_anthropic_client(api_key: str):
    import anthropic

    return anthropic.Anthropic(api_key=api_key)


ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-4-20250514"
ANTHROPIC_CHAT_HISTORY_LIMIT = 10
ANTHROPIC_CHAT_MAX_TOKENS = 350
ANTHROPIC_PLAN_MAX_TOKENS = 250
ANTHROPIC_JOURNAL_MAX_TOKENS = 120


def extract_anthropic_text(response) -> str:
    parts = []
    for block in getattr(response, "content", []) or []:
        text = getattr(block, "text", "")
        if text:
            parts.append(text)
    return "\n".join(parts).strip()


def normalize_ai_chat_messages(messages):
    normalized = []

    for message in messages[-ANTHROPIC_CHAT_HISTORY_LIMIT:]:
        if not isinstance(message, dict):
            continue

        role = (message.get("role") or "").strip()
        if role not in {"user", "assistant"}:
            continue

        content = message.get("content", "")
        if isinstance(content, list):
            text_parts = []
            for item in content:
                if isinstance(item, dict) and item.get("type") == "text":
                    text_value = (item.get("text") or "").strip()
                    if text_value:
                        text_parts.append(text_value)
            content_text = "\n".join(text_parts).strip()
        else:
            content_text = str(content).strip()

        if not content_text:
            continue

        normalized.append({"role": role, "content": content_text})

    return normalized


@app.route("/home")
@login_required
def home_page():
    ctx = build_home_dashboard_context(session["user_id"])
    return render_template("sidebar/home.html", **ctx)


@app.route("/settings")
@login_required
def settings_page():
    user = fetch_user_by_id(session["user_id"])
    return render_template(
        "auth/settings.html",
        name=user["name"].split()[0],
        full_name=user["name"],
        username=user["username"],
        email=user["email"],
        profile_image=user["profile_image"] or "default.png",
        auth_provider=user["auth_provider"],
        is_verified=bool(user["is_verified"]),
    )


@app.route("/journal")
@app.route("/journal/<int:entry_id>")
@login_required
def journal_page(entry_id=None):
    user_id = session["user_id"]
    journal_folder_id = get_journal_folder_id(user_id)
    mood_enabled = notes_mood_column_available()
    mood_select = "mood" if mood_enabled else "'' AS mood"
    word_count_expr = """
        CASE
            WHEN TRIM(COALESCE(content, '')) = '' THEN 0
            ELSE LENGTH(TRIM(content)) - LENGTH(REPLACE(TRIM(content), ' ', '')) + 1
        END
    """

    db = get_db()
    cursor = db.cursor(dictionary=True)

    cursor.execute(
        f"""
        SELECT
            id,
            title,
            content,
            created_at,
            updated_at,
            {word_count_expr} AS word_count,
            {mood_select}
        FROM notes
        WHERE user_id = %s
          AND folder_id = %s
          AND deleted_at IS NULL
          AND NOT ((title IS NULL OR title = '') AND (content IS NULL OR content = ''))
        ORDER BY COALESCE(updated_at, created_at) DESC
        """,
        (user_id, journal_folder_id),
    )
    entries = cursor.fetchall()

    active_entry = None
    if entry_id:
        cursor.execute(
            f"""
            SELECT
                id,
                title,
                content,
                created_at,
                updated_at,
                {mood_select},
                {word_count_expr} AS word_count
            FROM notes
            WHERE id = %s
              AND user_id = %s
              AND folder_id = %s
              AND deleted_at IS NULL
            """,
            (entry_id, user_id, journal_folder_id),
        )
        active_entry = cursor.fetchone()

    if active_entry is None and entries:
        active_entry = entries[0]

    cursor.close()

    grouped_entries = [
        {"label": group["label"], "entries": group["notes"]}
        for group in group_notes_by_date(entries)
    ]

    return render_template(
        "sidebar/journal.html",
        active_page="journal",
        grouped_entries=grouped_entries,
        active_entry=active_entry,
        journal_prompt="What's one thing you want to accomplish today — and why does it matter?",
        today_date=datetime.now().strftime("%A, %B %d"),
    )


@app.route("/journal/new")
@login_required
def new_journal_entry():
    user_id = session["user_id"]
    journal_folder_id = get_journal_folder_id(user_id)
    title = datetime.now().strftime("%A, %B %d")

    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        """
        INSERT INTO notes (user_id, folder_id, title, content, created_at, updated_at)
        VALUES (%s, %s, %s, '', NOW(), NOW())
        """,
        (user_id, journal_folder_id, title),
    )
    entry_id = cursor.lastrowid
    cursor.close()
    return redirect(url_for("journal_page", entry_id=entry_id))


@app.route("/journal/<int:entry_id>/save", methods=["POST"])
@login_required
def save_journal_entry(entry_id):
    user_id = session["user_id"]
    journal_folder_id = get_journal_folder_id(user_id)
    content = (request.form.get("content") or "").strip()
    mood = (request.form.get("mood") or "").strip()
    autosave = request.form.get("autosave") == "1"
    title = datetime.now().strftime("%A, %B %d")

    db = get_db()
    cursor = db.cursor()

    if notes_mood_column_available():
        cursor.execute(
            """
            UPDATE notes
            SET content = %s, mood = %s, title = %s, updated_at = NOW()
            WHERE id = %s AND user_id = %s AND folder_id = %s AND deleted_at IS NULL
            """,
            (content, mood, title, entry_id, user_id, journal_folder_id),
        )
    else:
        cursor.execute(
            """
            UPDATE notes
            SET content = %s, title = %s, updated_at = NOW()
            WHERE id = %s AND user_id = %s AND folder_id = %s AND deleted_at IS NULL
            """,
            (content, title, entry_id, user_id, journal_folder_id),
        )

    cursor.close()

    if autosave:
        return jsonify({"ok": True})
    return redirect(url_for("journal_page", entry_id=entry_id))


@app.route("/ai")
@login_required
def ai_coach_page():
    user_id = session["user_id"]
    ctx = build_home_dashboard_context(user_id)

    habits = sorted(
        fetch_user_habits(user_id),
        key=lambda habit: habit.get("streak") or 0,
        reverse=True,
    )[:5]

    journal_snippet = None
    today_entry = ctx.get("today_journal_entry")
    if today_entry and (today_entry.get("content") or "").strip():
        content = (today_entry.get("content") or "").strip()
        created_at = today_entry.get("created_at")
        date_label = "Today"

        if created_at:
            hour = created_at.hour % 12 or 12
            am_pm = "AM" if created_at.hour < 12 else "PM"
            date_label = f"{created_at.strftime('%A, %B %d')} · {hour}:{created_at.minute:02d} {am_pm}"

        journal_snippet = {
            "date": date_label,
            "preview": content[:120] + ("..." if len(content) > 120 else ""),
        }

    template_context = dict(ctx)
    template_context.update(
        {
            "active_page": "ai",
            "context_tasks": ctx["tasks"],
            "context_habits": habits,
            "tasks_done": ctx["tasks_done"],
            "tasks_total": ctx["tasks_total"],
            "habits_done": ctx["habits_done"],
            "habits_total": ctx["habits_total"],
            "growth_score": ctx["growth_score"],
            "journal_snippet": journal_snippet,
        }
    )
    return render_template("sidebar/ai_coach.html", **template_context)


@app.route("/ai/journal-insight", methods=["POST"])
@login_required
def ai_journal_insight():
    data = request.get_json(silent=True) or {}
    content = (data.get("content") or "").strip()
    if not content:
        return jsonify({"insight": "Write a bit more and I'll find the pattern."})

    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    if not anthropic_key:
        return jsonify({"insight": "Keep writing — consistency compounds over time."})

    try:
        client = create_anthropic_client(anthropic_key)
        response = client.messages.create(
            model=ANTHROPIC_DEFAULT_MODEL,
            max_tokens=ANTHROPIC_JOURNAL_MAX_TOKENS,
            system="You are a journal coach. Read this entry and give one short, specific, warm insight in 1–2 sentences. Be direct. No fluff.",
            messages=[{"role": "user", "content": content}],
        )
        insight = extract_anthropic_text(response)
        return jsonify({"insight": insight or "Keep going — patterns reveal themselves over time."})
    except Exception as e:
        app.logger.exception("AI journal insight failed: %s", e)
        return jsonify({"insight": f"Error: {str(e)}"}), 200


@app.route("/ai/chat", methods=["POST"])
@login_required
def ai_chat():
    data = request.get_json(silent=True) or {}
    messages = data.get("messages", [])
    active_page = str(data.get("active_page") or request.path or "app").strip().lower()
    system = data.get("system", "You are Taskflow AI, a personal life coach.")
    normalized_messages = normalize_ai_chat_messages(messages)

    if not normalized_messages:
        return jsonify({"reply": "What do you need help with?"})

    latest_user_message = ""
    for message in reversed(normalized_messages):
        if message["role"] == "user":
            latest_user_message = message["content"]
            break

    if not latest_user_message:
        return jsonify({"reply": "What do you need help with?"})

    pending_action = fetch_ai_action_request(session["user_id"], status="pending")
    confirmation_choice = normalize_confirmation_choice(latest_user_message) if pending_action else None
    if pending_action and confirmation_choice == "confirm":
        result = confirm_ai_action_request(pending_action)
        return jsonify(result), (200 if result["ok"] else 400)
    if pending_action and confirmation_choice == "cancel":
        result = cancel_ai_action_request(pending_action)
        return jsonify(result)

    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    if not anthropic_key:
        return jsonify(
            {
                "reply": (
                    "AI coaching requires an Anthropic API key. "
                    "Add ANTHROPIC_API_KEY to your environment variables."
                )
            }
        )

    try:
        user = fetch_user_by_id(session["user_id"]) or {}
        client = create_anthropic_client(anthropic_key)
        saved_memories = []
        created_action = None

        analysis = analyze_message_for_memories_and_actions(client, user, latest_user_message, active_page)
        if analysis.get("memories"):
            saved_memories = save_user_memories(session["user_id"], analysis["memories"])
        if analysis.get("action"):
            created_action = create_ai_action_request(session["user_id"], analysis["action"])

        memory_context = build_ai_memory_context(session["user_id"])
        live_context = build_ai_coach_system_context(session["user_id"], active_page)
        system_parts = [
            "You are Taskflow AI - a personal life coach and accountability partner built into the Taskflow productivity app.",
            live_context,
            str(system).strip(),
            "You never directly modify TaskFlow data on your own.",
            "If the user wants to create, edit, complete, delete, or schedule something, keep the response brief and let TaskFlow ask for explicit confirmation before any change happens.",
        ]
        if memory_context:
            system_parts.append("Saved user memories you can rely on if relevant:\n" + memory_context)

        response = client.messages.create(
            model=ANTHROPIC_DEFAULT_MODEL,
            max_tokens=ANTHROPIC_CHAT_MAX_TOKENS,
            system="\n\n".join(part for part in system_parts if part),
            messages=normalized_messages,
        )
        reply = extract_anthropic_text(response)
        if saved_memories and "remember" not in reply.lower():
            reply = (reply or "Noted.") + "\n\nI'll remember that for future coaching."
        payload = {"reply": reply or "I'm here — what do you need?"}
        if created_action:
            payload["pending_action"] = created_action
        return jsonify(payload)
    except Exception as e:
        app.logger.exception("AI chat failed: %s", e)
        return jsonify({"reply": f"Error: {str(e)}"}), 200


@app.route("/ai/actions/<int:action_id>/confirm", methods=["POST"])
@login_required
def confirm_ai_action(action_id):
    action = fetch_ai_action_request(session["user_id"], action_id=action_id, status="pending")
    if not action:
        return jsonify({"ok": False, "reply": "That confirmation request has expired."}), 404

    result = confirm_ai_action_request(action)
    return jsonify(result), (200 if result["ok"] else 400)


@app.route("/ai/actions/<int:action_id>/cancel", methods=["POST"])
@login_required
def cancel_ai_action(action_id):
    action = fetch_ai_action_request(session["user_id"], action_id=action_id, status="pending")
    if not action:
        return jsonify({"ok": False, "reply": "That confirmation request has already been cleared."}), 404

    result = cancel_ai_action_request(action)
    return jsonify(result)


@app.route("/journal/quick", methods=["POST"])
@login_required
def save_quick_journal_entry():
    user_id = session["user_id"]
    content = (request.form.get("content") or "").strip()
    journal_folder_id = get_journal_folder_id(user_id)
    today_entry = fetch_today_journal_entry(user_id)
    title = datetime.now().strftime("%A, %B %d")

    db = get_db()
    cursor = db.cursor()

    if today_entry:
        cursor.execute(
            """
            UPDATE notes
            SET title=%s, content=%s, updated_at=%s
            WHERE id=%s AND user_id=%s
            """,
            (title, content, datetime.utcnow(), today_entry["id"], user_id),
        )
    else:
        cursor.execute(
            """
            INSERT INTO notes (user_id, folder_id, title, content, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (user_id, journal_folder_id, title, content, datetime.utcnow(), datetime.utcnow()),
        )

    cursor.close()
    return redirect(url_for("home_page"))


@app.route("/ai/plan", methods=["POST"])
@login_required
def ai_plan_for_day():
    context = build_home_dashboard_context(session["user_id"])
    fallback_plan = build_dashboard_day_plan(context)
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")

    if not anthropic_key:
        return jsonify({"plan": fallback_plan})

    prompt = "\n".join(
        [
            f"Name: {context['name']}",
            f"Greeting: {context['greeting']}",
            f"Open tasks: {', '.join(task['title'] for task in context['tasks'] if not task['completed']) or 'None'}",
            f"Completed tasks: {context['tasks_done']}/{context['tasks_total']}",
            f"Habits done: {context['habits_done']}/{context['habits_total']}",
            f"Current streak: {context['streak']}",
            f"Journaled today: {'yes' if context['journaled_today'] else 'no'}",
            "Build a focused plan for today in 4 short numbered lines.",
        ]
    )

    try:
        client = create_anthropic_client(anthropic_key)
        response = client.messages.create(
            model=ANTHROPIC_DEFAULT_MODEL,
            max_tokens=ANTHROPIC_PLAN_MAX_TOKENS,
            system="You are Taskflow AI, a personal life coach. Create a concise day plan using the user's real dashboard data.",
            messages=[{"role": "user", "content": prompt}],
        )
        plan = extract_anthropic_text(response)
        return jsonify({"plan": plan or fallback_plan})
    except Exception as e:
        app.logger.exception("AI day plan failed: %s", e)
        return jsonify({"plan": fallback_plan}), 200



# ============================================================
# 15) LIST ROUTES (create/rename/delete)
# ============================================================

@app.route("/lists/create", methods=["POST"])
@login_required
def create_list():
    name = (request.form.get("name") or "").strip()
    if not name:
        return redirect(url_for("home_page"))

    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO task_lists (user_id, name) VALUES (%s, %s)",
        (session["user_id"], name)
    )
    new_id = cursor.lastrowid
    cursor.close()

    return redirect(url_for("tasks_page", list_id=new_id))

@app.route("/lists/reorder", methods=["POST"])
@login_required
def reorder_lists():
    order = request.json["order"]

    db = get_db()
    cursor = db.cursor()

    for index, list_id in enumerate(order):
        cursor.execute(
            "UPDATE task_lists SET position=%s WHERE id=%s AND user_id=%s",
            (index, list_id, session["user_id"])
        )

    cursor.close()
    return "", 204




@app.route("/lists/rename/<int:list_id>", methods=["POST"])
@login_required
def rename_list(list_id):
    name = (request.form.get("name") or "").strip()
    if not name:
        return redirect(url_for("tasks_page", list_id=list_id))

    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "UPDATE task_lists SET name=%s WHERE id=%s AND user_id=%s",
        (name, list_id, session["user_id"])
    )
    cursor.close()

    return redirect(url_for("tasks_page", list_id=list_id))



@app.route("/lists/delete/<int:list_id>", methods=["POST"])
@login_required
def delete_list(list_id):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute(
        "SELECT name FROM task_lists WHERE id=%s AND user_id=%s",
        (list_id, session["user_id"])
    )
    row = cursor.fetchone()
    cursor.close()

    if not row or row["name"] == "Inbox":
        return redirect(url_for("tasks_page"))

    cursor = db.cursor()
    cursor.execute(
        "DELETE FROM task_lists WHERE id=%s AND user_id=%s",
        (list_id, session["user_id"])
    )
    cursor.close()

    inbox_id = get_inbox_list_id(session["user_id"])
    return redirect(url_for("tasks_page", list_id=inbox_id))



# ============================================================
# 16) TASK ROUTES (create/view/edit/toggle/delete)
# ============================================================

@app.route("/tasks/create", methods=["POST"])
@login_required
def create_task():
    list_id = request.form.get("list_id", type=int)
    title = (request.form.get("title") or "").strip()
    description = (request.form.get("description") or "").strip()

    # If no title, stay on tasks page
    if not title:
        return redirect(url_for("tasks_page", list_id=list_id))

    # Fallback to Inbox if list is invalid or not owned
    if not list_id or not user_owns_list(session["user_id"], list_id):
        list_id = get_inbox_list_id(session["user_id"])

    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        """
        INSERT INTO tasks (user_id, list_id, title, description)
        VALUES (%s, %s, %s, %s)
        """,
        (session["user_id"], list_id, title, description)
    )
    cursor.close()

    # 🔥 THIS IS THE KEY LINE
    return redirect(url_for("tasks_page", list_id=list_id))


@app.route("/tasks/quick", methods=["POST"])
@login_required
def create_quick_task():
    payload = request.get_json(silent=True) or {}
    title = (payload.get("title") or "").strip()

    if not title:
        return jsonify({"error": "Title is required."}), 400

    raw_list_id = payload.get("list_id")
    try:
        list_id = int(raw_list_id) if raw_list_id is not None else None
    except (TypeError, ValueError):
        list_id = None

    if not list_id or not user_owns_list(session["user_id"], list_id):
        list_id = get_inbox_list_id(session["user_id"])

    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        """
        INSERT INTO tasks (user_id, list_id, title, description)
        VALUES (%s, %s, %s, %s)
        """,
        (session["user_id"], list_id, title, ""),
    )
    task_id = cursor.lastrowid
    cursor.close()

    return jsonify({"id": task_id, "title": title, "completed": False, "list_id": list_id})



@app.route("/tasks/<int:task_id>")
@login_required
def view_task(task_id):
    task = fetch_task_for_user(task_id, session["user_id"])
    if not task:
        return redirect(url_for("home_page"))
    return render_template("task_view.html", task=task)


@app.route("/tasks/edit/<int:task_id>", methods=["GET", "POST"])
@login_required
def edit_task(task_id):
    task = fetch_task_for_user(task_id, session["user_id"])
    if not task:
        return redirect(url_for("home_page"))

    if request.method == "POST":
        title = (request.form.get("title") or "").strip()
        description = (request.form.get("description") or "").strip()

        if not title:
            return render_template("task_edit.html", task=task, error="Title is required.")

        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            "UPDATE tasks SET title=%s, description=%s WHERE id=%s AND user_id=%s",
            (title, description, task_id, session["user_id"])
        )
        cursor.close()

        return redirect(url_for("home_page", list_id=task["list_id"]))

    return render_template("task_edit.html", task=task)


@app.route("/tasks/toggle/<int:task_id>", methods=["POST"])
@app.route("/tasks/<int:task_id>/toggle", methods=["POST"])
@login_required
def toggle_task(task_id):
    wants_json = request.headers.get("X-Requested-With") == "XMLHttpRequest"
    task = fetch_task_for_user(task_id, session["user_id"])
    if not task:
        if wants_json:
            return jsonify({"error": "Task not found."}), 404
        return redirect(url_for("home_page"))

    new_completed = 0 if task["completed"] else 1

    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "UPDATE tasks SET completed=%s WHERE id=%s AND user_id=%s",
        (new_completed, task_id, session["user_id"])
    )
    cursor.close()

    if wants_json:
        return jsonify({"ok": True, "completed": bool(new_completed)})

    return redirect(url_for("home_page", list_id=task["list_id"]))


@app.route("/tasks/delete/<int:task_id>", methods=["POST"])
@login_required
def delete_task(task_id):
    task = fetch_task_for_user(task_id, session["user_id"])
    if not task:
        return redirect(url_for("home_page"))

    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "DELETE FROM tasks WHERE id=%s AND user_id=%s",
        (task_id, session["user_id"])
    )
    cursor.close()

    return redirect(url_for("home_page", list_id=task["list_id"]))

# ============================================================
# SIDEBAR PAGES (login required)
# ============================================================

@app.route("/search")
@login_required
def search_page():
    return render_template("sidebar/search.html", active_page="search")


@app.route("/habits")
@login_required
def habits_page():
    user_id = session["user_id"]
    habits = fetch_user_habits(user_id)
    habits_done = sum(1 for habit in habits if habit["completed_today"])
    habits_total = len(habits)
    best = max(habits, key=lambda habit: habit["streak"], default=None)

    return render_template(
        "sidebar/habits.html",
        active_page="habits",
        page_title="Habits",
        habits=habits,
        habits_done=habits_done,
        habits_total=habits_total,
        best_streak=best["streak"] if best else 0,
        best_streak_name=best["name"] if best else "No habits yet",
        week_completion_pct=calculate_habit_week_completion_pct(user_id, habits_total),
        today_date=datetime.now().strftime("%A, %B %d"),
        ai_insight=build_habit_ai_insight(habits),
        activity_map=build_habit_activity_map(user_id, habits_total),
    )


@app.route("/habits/create", methods=["POST"])
@login_required
def create_habit():
    if not habits_schema_available():
        flash("Habits are not configured in the database yet.")
        return redirect(url_for("habits_page"))

    name = (request.form.get("name") or "").strip()
    icon = (request.form.get("icon") or "↺").strip() or "↺"
    frequency = (request.form.get("frequency") or "Daily").strip() or "Daily"

    if not name:
        return redirect(url_for("habits_page"))

    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        """
        INSERT INTO habits (user_id, name, icon, frequency, streak, created_at)
        VALUES (%s, %s, %s, %s, 0, NOW())
        """,
        (session["user_id"], name, icon, frequency),
    )
    cursor.close()
    return redirect(url_for("habits_page"))


@app.route("/habits/<int:habit_id>/toggle", methods=["POST"])
@login_required
def toggle_habit(habit_id):
    user_id = session["user_id"]
    wants_json = request.headers.get("X-Requested-With") == "XMLHttpRequest"

    if not habits_schema_available():
        if wants_json:
            return jsonify({"error": "Habits are not configured in the database yet."}), 503
        return redirect(url_for("habits_page"))

    habit = fetch_habit_for_user(habit_id, user_id)

    if not habit:
        if wants_json:
            return jsonify({"error": "Habit not found."}), 404
        return redirect(url_for("habits_page"))

    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT id
        FROM habit_completions
        WHERE habit_id = %s
          AND user_id = %s
          AND DATE(completed_date) = CURDATE()
        """,
        (habit_id, user_id),
    )
    existing = cursor.fetchone()

    if existing:
        cursor2 = db.cursor()
        cursor2.execute("DELETE FROM habit_completions WHERE id = %s", (existing["id"],))
        cursor2.execute(
            "UPDATE habits SET streak = GREATEST(streak - 1, 0) WHERE id = %s AND user_id = %s",
            (habit_id, user_id),
        )
        cursor2.close()
        completed = False
    else:
        cursor2 = db.cursor()
        cursor2.execute(
            """
            INSERT INTO habit_completions (habit_id, user_id, completed_date)
            VALUES (%s, %s, CURDATE())
            """,
            (habit_id, user_id),
        )
        cursor2.execute(
            "UPDATE habits SET streak = streak + 1 WHERE id = %s AND user_id = %s",
            (habit_id, user_id),
        )
        cursor2.close()
        completed = True

    cursor.execute(
        "SELECT COALESCE(streak, 0) AS streak FROM habits WHERE id = %s AND user_id = %s",
        (habit_id, user_id),
    )
    row = cursor.fetchone()
    cursor.close()

    return jsonify({"ok": True, "completed": completed, "streak": row["streak"] if row else 0})


@app.route("/habits/<int:habit_id>/delete", methods=["POST"])
@login_required
def delete_habit(habit_id):
    user_id = session["user_id"]

    if not habits_schema_available():
        return jsonify({"error": "Habits are not configured in the database yet."}), 503

    habit = fetch_habit_for_user(habit_id, user_id)

    if not habit:
        return jsonify({"error": "Habit not found."}), 404

    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "UPDATE habits SET deleted_at = NOW() WHERE id = %s AND user_id = %s",
        (habit_id, user_id),
    )
    cursor.close()
    return jsonify({"ok": True})


# ---------------- NOTES ----------------

def fetch_note_folders_tree(user_id: int):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    cursor.execute("""
        SELECT id, name, parent_id
        FROM note_folders
        WHERE user_id = %s AND deleted_at IS NULL
        ORDER BY created_at ASC
    """, (user_id,))

    rows = cursor.fetchall()
    cursor.close()

    folders = {}
    tree = []

    for row in rows:
        row["children"] = []
        folders[row["id"]] = row

    for row in rows:
        pid = row.get("parent_id")
        if pid and pid in folders:
            folders[pid]["children"].append(row)
        else:
            tree.append(row)

    return tree

def is_mobile_request():
    user_agent = request.headers.get("User-Agent", "")
    return any(token in user_agent for token in ("Mobile", "Android", "iPhone", "iPad", "iPod"))


@app.route("/notes")
@login_required
def notes_page():
    user_id = session["user_id"]
    folder_id = request.args.get("folder_id", type=int)
    view = request.args.get("view")
    list_only = request.args.get("list") == "1" or request.args.get("folders") == "1"
    force_mobile_page = None

    if is_mobile_request() and not request.args:
        view = "root"
        list_only = True
        force_mobile_page = "folders"

    scope = "all"
    if view == "root":
        scope = "root"
    elif folder_id:
        scope = f"folder:{folder_id}"

    active_folders = fetch_active_folders(user_id)
    folder_counts = fetch_folder_counts(user_id)
    all_notes_count, root_notes_count = fetch_notes_counts(user_id)

    db = get_db()
    cursor = db.cursor(dictionary=True)

    last_opened_note_id = None
    raw_scope_cookie = request.cookies.get("last_opened_note_by_scope")
    if raw_scope_cookie:
        try:
            scope_map = json.loads(raw_scope_cookie)
            last_opened_note_id = scope_map.get(scope)
        except (json.JSONDecodeError, TypeError):
            last_opened_note_id = None

    if scope == "all" and not last_opened_note_id:
        last_opened_note_id = request.cookies.get("last_opened_note_id")

    if last_opened_note_id and not list_only:
        cursor.execute("""
            SELECT id, folder_id
            FROM notes
            WHERE id = %s
              AND user_id = %s
              AND deleted_at IS NULL
        """, (last_opened_note_id, user_id))
        note = cursor.fetchone()

        if note:
            if scope == "root" and note["folder_id"] is None:
                cursor.close()
                return redirect(url_for("view_note", note_id=note["id"], view="root"))
            if scope.startswith("folder:") and note["folder_id"] == folder_id:
                cursor.close()
                return redirect(url_for("view_note", note_id=note["id"], folder_id=folder_id))
            if scope == "all":
                cursor.close()
                return redirect(url_for("view_note", note_id=note["id"], view="all"))

    if scope == "root" and not list_only:
        cursor.execute("""
            SELECT id
            FROM notes
            WHERE user_id = %s
              AND folder_id IS NULL
              AND deleted_at IS NULL
              AND NOT ((title IS NULL OR title = '') AND (content IS NULL OR content = ''))
            ORDER BY COALESCE(last_opened_at, updated_at) DESC
            LIMIT 1
        """, (user_id,))
        fallback = cursor.fetchone()
        if fallback:
            cursor.close()
            return redirect(url_for("view_note", note_id=fallback["id"], view="root"))

    if scope.startswith("folder:") and folder_id and not list_only:
        cursor.execute("""
            SELECT id
            FROM notes
            WHERE user_id = %s
              AND folder_id = %s
              AND deleted_at IS NULL
              AND NOT ((title IS NULL OR title = '') AND (content IS NULL OR content = ''))
            ORDER BY COALESCE(last_opened_at, updated_at) DESC
            LIMIT 1
        """, (user_id, folder_id))
        fallback = cursor.fetchone()
        if fallback:
            cursor.close()
            return redirect(url_for("view_note", note_id=fallback["id"], folder_id=folder_id))

    if scope == "all" and not list_only:
        cursor.execute("""
            SELECT id, folder_id
            FROM notes
            WHERE user_id = %s
              AND deleted_at IS NULL
              AND NOT ((title IS NULL OR title = '') AND (content IS NULL OR content = ''))
            ORDER BY COALESCE(last_opened_at, updated_at) DESC
            LIMIT 1
        """, (user_id,))
        fallback = cursor.fetchone()
        if fallback:
            cursor.close()
            return redirect(url_for("view_note", note_id=fallback["id"], view="all"))

    active_folder = None
    notes = []
    notes_view = "all"

    if view == "root":
        cursor.execute("""
            SELECT *
            FROM notes
            WHERE user_id = %s
              AND folder_id IS NULL
              AND deleted_at IS NULL
              AND NOT ((title IS NULL OR title = '') AND (content IS NULL OR content = ''))
            ORDER BY COALESCE(last_opened_at, updated_at) DESC
        """, (user_id,))
        notes = cursor.fetchall()
        notes_view = "root"

    elif folder_id:
        cursor.execute("""
            SELECT *
            FROM notes
            WHERE user_id = %s
              AND folder_id = %s
              AND deleted_at IS NULL
              AND NOT ((title IS NULL OR title = '') AND (content IS NULL OR content = ''))
            ORDER BY COALESCE(last_opened_at, updated_at) DESC
        """, (user_id, folder_id))
        notes = cursor.fetchall()

        cursor.execute("""
            SELECT id, name
            FROM note_folders
            WHERE id = %s AND user_id = %s
        """, (folder_id, user_id))
        active_folder = cursor.fetchone()

        notes_view = "folder"

    else:
        cursor.execute("""
            SELECT *
            FROM notes
            WHERE user_id = %s
              AND deleted_at IS NULL
              AND NOT ((title IS NULL OR title = '') AND (content IS NULL OR content = ''))
            ORDER BY COALESCE(last_opened_at, updated_at) DESC
        """, (user_id,))
        notes = cursor.fetchall()
        notes_view = "all"

    cursor.close()
    deleted_notes_count = fetch_deleted_notes_count(user_id)

    return render_template(
        "sidebar/notes.html",
        active_page="notes",
        notes_view=notes_view,
        page_title="Notes",
        active_folders=active_folders,
        notes=notes,
        notes_grouped=group_notes_by_date(notes),
        active_folder_id=folder_id if notes_view == "folder" else None,
        active_folder=active_folder,
        folder_counts=folder_counts,
        all_notes_count=all_notes_count,
        root_notes_count=root_notes_count,
        deleted_notes_count=deleted_notes_count,
        force_mobile_page=force_mobile_page
    )




@app.route("/notes/new")
@login_required
def new_note_root():
    user_id = session["user_id"]

    notes_folder_id = get_notes_folder_id(user_id)

    db = get_db()
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO notes (user_id, folder_id, title, content)
        VALUES (%s, %s, NULL, '')
    """, (user_id, notes_folder_id))

    note_id = cursor.lastrowid
    cursor.close()

    return redirect(url_for("view_note", note_id=note_id)) 


def get_or_create_note_folder_id(user_id, folder_name):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    cursor.execute("""
        SELECT id
        FROM note_folders
        WHERE user_id = %s
          AND name = %s
          AND deleted_at IS NULL
        LIMIT 1
    """, (user_id, folder_name))

    row = cursor.fetchone()

    if row:
        cursor.close()
        return row["id"]

    cursor2 = db.cursor()
    cursor2.execute("""
        INSERT INTO note_folders (user_id, name)
        VALUES (%s, %s)
    """, (user_id, folder_name))
    folder_id = cursor2.lastrowid

    cursor2.close()
    cursor.close()
    return folder_id


def get_notes_folder_id(user_id):
    return get_or_create_note_folder_id(user_id, "Notes")


def get_journal_folder_id(user_id):
    return get_or_create_note_folder_id(user_id, "Journal")

@app.route("/notes/last-opened", methods=["POST"])
@login_required
def save_last_opened_note():
    note_id = request.json.get("note_id")
    scope = request.json.get("scope")

    if not note_id or not scope:
        return "", 400

    db = get_db()
    cursor = db.cursor()

    cursor.execute("""
        UPDATE notes
        SET last_opened_at = NOW()
        WHERE id = %s
          AND user_id = %s
          AND deleted_at IS NULL
    """, (note_id, session["user_id"]))

    cursor.close()

    scope_map = {}
    raw_scope_cookie = request.cookies.get("last_opened_note_by_scope")
    if raw_scope_cookie:
        try:
            scope_map = json.loads(raw_scope_cookie)
        except (json.JSONDecodeError, TypeError):
            scope_map = {}

    scope_map[scope] = str(note_id)

    resp = app.make_response("", 204)
    resp.set_cookie(
        "last_opened_note_id",
        str(note_id),
        max_age=60 * 60 * 24 * 30,  # 30 days
        httponly=True,
        samesite="Lax"
    )
    resp.set_cookie(
        "last_opened_note_by_scope",
        json.dumps(scope_map),
        max_age=60 * 60 * 24 * 30,
        httponly=True,
        samesite="Lax"
    )
    return resp






def fetch_folder_counts(user_id):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    cursor.execute("""
        SELECT folder_id, COUNT(*) AS count
        FROM notes
        WHERE user_id = %s
          AND deleted_at IS NULL
          AND folder_id IS NOT NULL
          AND NOT ((title IS NULL OR title = '') AND (content IS NULL OR content = ''))
        GROUP BY folder_id
    """, (user_id,))

    counts = {row["folder_id"]: row["count"] for row in cursor.fetchall()}
    cursor.close()

    return counts


def fetch_notes_counts(user_id):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    cursor.execute("""
        SELECT COUNT(*) AS count
        FROM notes
        WHERE user_id = %s
          AND deleted_at IS NULL
          AND NOT ((title IS NULL OR title = '') AND (content IS NULL OR content = ''))
    """, (user_id,))
    all_count = cursor.fetchone()["count"]

    cursor.execute("""
        SELECT COUNT(*) AS count
        FROM notes
        WHERE user_id = %s
          AND folder_id IS NULL
          AND deleted_at IS NULL
          AND NOT ((title IS NULL OR title = '') AND (content IS NULL OR content = ''))
    """, (user_id,))
    root_count = cursor.fetchone()["count"]

    cursor.close()

    return all_count, root_count


def fetch_deleted_notes_count(user_id):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    cursor.execute("""
        SELECT COUNT(*) AS count
        FROM notes
        WHERE user_id = %s
          AND deleted_at IS NOT NULL
    """, (user_id,))
    count = cursor.fetchone()["count"]
    cursor.close()

    return count


@app.route("/notes/delete/<int:note_id>", methods=["POST"])
@login_required
def delete_note(note_id):
    db = get_db()
    cursor = db.cursor()

    cursor.execute("""
        UPDATE notes
        SET deleted_at = NOW()
        WHERE id = %s AND user_id = %s
    """, (note_id, session["user_id"]))

    cursor.close()
    return "", 204


@app.route("/notes/restore/<int:note_id>", methods=["POST"])
@login_required
def restore_note(note_id):
    db = get_db()
    cursor = db.cursor()

    cursor.execute("""
        UPDATE notes
        SET deleted_at = NULL
        WHERE id = %s AND user_id = %s
    """, (note_id, session["user_id"]))

    cursor.close()
    return redirect(url_for("recently_deleted_page"))

@app.route("/notes/purge/<int:note_id>", methods=["POST"])
@login_required
def purge_note(note_id):
    db = get_db()
    cursor = db.cursor()

    cursor.execute("""
        DELETE FROM notes
        WHERE id = %s AND user_id = %s
    """, (note_id, session["user_id"]))

    cursor.close()
    return redirect(url_for("recently_deleted_page"))

@app.route("/notes/recently-deleted/purge-all", methods=["POST"])
@login_required
def purge_all_deleted_notes():
    db = get_db()
    cursor = db.cursor()

    cursor.execute("""
        DELETE FROM notes
        WHERE user_id = %s AND deleted_at IS NOT NULL
    """, (session["user_id"],))

    cursor.close()
    return "", 204





@app.route("/notes/folders/create", methods=["POST"])
@login_required
def create_folder():
    name = (request.form.get("name") or "").strip()
    parent_id = (request.form.get("parent_id") or "").strip()

    if not name:
        return redirect(url_for("notes_page"))

    # convert parent_id safely
    parent_id_val = int(parent_id) if parent_id.isdigit() else None

    db = get_db()
    cursor = db.cursor()

    cursor.execute("""
        INSERT INTO note_folders (user_id, name, parent_id)
        VALUES (%s, %s, %s)
    """, (session["user_id"], name, parent_id_val))

    # 🔑 THIS IS THE KEY LINE
    folder_id = cursor.lastrowid

    db.commit()
    cursor.close()

    # 👇 Redirect directly into the new folder
    return redirect(url_for("notes_page", folder_id=folder_id))



@app.route("/notes/folders/delete/<int:folder_id>", methods=["POST"])
@login_required
def delete_folder(folder_id):
    db = get_db()
    cursor = db.cursor()

    # Soft delete folder
    cursor.execute("""
        UPDATE note_folders
        SET deleted_at = NOW()
        WHERE id = %s AND user_id = %s
    """, (folder_id, session["user_id"]))

    cursor.close()
    return "", 204

@app.route("/notes/recently-deleted")
@login_required
def recently_deleted_page():
    user_id = session["user_id"]
    note_id = request.args.get("note_id", type=int)

    db = get_db()
    cursor = db.cursor(dictionary=True)

    # Deleted folders
    cursor.execute("""
        SELECT * FROM note_folders
        WHERE user_id = %s AND deleted_at IS NOT NULL
        ORDER BY deleted_at DESC
    """, (user_id,))
    deleted_folders = cursor.fetchall()

    # Deleted notes
    cursor.execute("""
        SELECT * FROM notes
        WHERE user_id = %s AND deleted_at IS NOT NULL
        ORDER BY deleted_at DESC
    """, (user_id,))
    deleted_notes = cursor.fetchall()

    # ✅ ACTIVE DELETED NOTE (NEW)
    active_note = None
    if note_id:
        cursor.execute("""
            SELECT *
            FROM notes
            WHERE id = %s
              AND user_id = %s
              AND deleted_at IS NOT NULL
        """, (note_id, user_id))
        active_note = cursor.fetchone()

    cursor.close()
    all_notes_count, root_notes_count = fetch_notes_counts(user_id)
    folder_counts = fetch_folder_counts(user_id)

    return render_template(
        "sidebar/notes_recently_deleted.html",
        active_page="notes",
        page_title="Recently Deleted",
        deleted_folders=deleted_folders,
        deleted_notes=deleted_notes,
        deleted_notes_count=len(deleted_notes),
        active_note=active_note,
        active_folders=fetch_active_folders(user_id),
        folder_counts=folder_counts,
        all_notes_count=all_notes_count,
        root_notes_count=root_notes_count
    )

@app.route("/notes/recently-deleted/<int:note_id>")
@login_required
def view_deleted_note(note_id):
    user_id = session["user_id"]
    db = get_db()
    cursor = db.cursor(dictionary=True)

    # Fetch the deleted note
    cursor.execute("""
        SELECT *
        FROM notes
        WHERE id = %s AND user_id = %s AND deleted_at IS NOT NULL
    """, (note_id, user_id))
    active_note = cursor.fetchone()

    if not active_note:
        cursor.close()
        return redirect(url_for("recently_deleted_page"))

    # Fetch all deleted notes for left pane
    cursor.execute("""
        SELECT *
        FROM notes
        WHERE user_id = %s AND deleted_at IS NOT NULL
        ORDER BY deleted_at DESC
    """, (user_id,))
    deleted_notes = cursor.fetchall()

    cursor.close()
    all_notes_count, root_notes_count = fetch_notes_counts(user_id)
    folder_counts = fetch_folder_counts(user_id)
    deleted_notes_count = len(deleted_notes)

    return render_template(
        "sidebar/notes_recently_deleted.html",
        active_page="notes",
        page_title="Recently Deleted",
        deleted_notes=deleted_notes,
        deleted_notes_count=deleted_notes_count,
        active_note=active_note,
        active_folders=fetch_active_folders(user_id),
        folder_counts=folder_counts,
        all_notes_count=all_notes_count,
        root_notes_count=root_notes_count
    )



@app.route("/notes/folders/restore/<int:folder_id>", methods=["POST"])
@login_required
def restore_folder(folder_id):
    db = get_db()
    cursor = db.cursor()

    cursor.execute("""
        UPDATE note_folders
        SET deleted_at = NULL
        WHERE id = %s AND user_id = %s
    """, (folder_id, session["user_id"]))

    cursor.close()
    return redirect(url_for("recently_deleted_page"))
@app.route("/notes/folders/purge/<int:folder_id>", methods=["POST"])
@login_required
def purge_folder(folder_id):
    user_id = session["user_id"]
    db = get_db()
    cursor = db.cursor()

    # 1️⃣ Delete notes inside folder
    cursor.execute("""
        DELETE FROM notes
        WHERE folder_id = %s AND user_id = %s
    """, (folder_id, user_id))

    # 2️⃣ Delete the folder itself
    cursor.execute("""
        DELETE FROM note_folders
        WHERE id = %s AND user_id = %s
    """, (folder_id, user_id))

    cursor.close()
    return redirect(url_for("recently_deleted_page"))

def fetch_active_folders(user_id):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    cursor.execute("""
        SELECT id, name, color
        FROM note_folders
        WHERE user_id = %s
          AND deleted_at IS NULL
        ORDER BY created_at ASC
    """, (user_id,))

    rows = cursor.fetchall()
    cursor.close()
    return rows


def fetch_deleted_folders(user_id):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    cursor.execute("""
        SELECT id, name, deleted_at
        FROM note_folders
        WHERE user_id = %s
          AND deleted_at IS NOT NULL
        ORDER BY deleted_at DESC
    """, (user_id,))

    rows = cursor.fetchall()
    cursor.close()
    return rows


@app.route("/notes/folders/rename/<int:folder_id>", methods=["POST"])
@login_required
def rename_folder(folder_id):
    name = (request.form.get("name") or "").strip()

    if not name:
        return redirect(url_for("notes_page"))

    db = get_db()
    cursor = db.cursor()

    cursor.execute("""
        UPDATE note_folders
        SET name = %s
        WHERE id = %s AND user_id = %s
    """, (name, folder_id, session["user_id"]))

    cursor.close()
    return redirect(url_for("notes_page"))

@app.route("/notes/<int:note_id>")
@login_required
def view_note(note_id):
    user_id = session["user_id"]
    view = request.args.get("view")

    db = get_db()
    cursor = db.cursor(dictionary=True)

    # 1️⃣ Fetch the active note
    cursor.execute("""
        SELECT *
        FROM notes
        WHERE id = %s AND user_id = %s AND deleted_at IS NULL
    """, (note_id, user_id))
    active_note = cursor.fetchone()

    if not active_note:
        cursor.close()
        return redirect(url_for("notes_page"))

    folder_id = active_note["folder_id"]

    cursor.execute("""
        UPDATE notes
        SET last_opened_at = NOW()
        WHERE id = %s
          AND user_id = %s
          AND deleted_at IS NULL
    """, (note_id, user_id))

    # 2️⃣ Decide context ONLY from the note itself
    if view == "all":
        cursor.execute("""
            SELECT *
            FROM notes
            WHERE user_id = %s
              AND deleted_at IS NULL
              AND NOT ((title IS NULL OR title = '') AND (content IS NULL OR content = ''))
            ORDER BY COALESCE(last_opened_at, updated_at) DESC
        """, (user_id,))
        notes = cursor.fetchall()

        active_folder = None
        notes_view = "all"

    elif folder_id is None:
        # NOTES (root)
        cursor.execute("""
            SELECT *
            FROM notes
            WHERE user_id = %s
              AND folder_id IS NULL
              AND deleted_at IS NULL
              AND NOT ((title IS NULL OR title = '') AND (content IS NULL OR content = ''))
            ORDER BY COALESCE(last_opened_at, updated_at) DESC
        """, (user_id,))
        notes = cursor.fetchall()

        active_folder = None
        notes_view = "root"

    else:
        # FOLDER VIEW
        cursor.execute("""
            SELECT *
            FROM notes
            WHERE user_id = %s
              AND folder_id = %s
              AND deleted_at IS NULL
              AND NOT ((title IS NULL OR title = '') AND (content IS NULL OR content = ''))
            ORDER BY COALESCE(last_opened_at, updated_at) DESC
        """, (user_id, folder_id))
        notes = cursor.fetchall()

        cursor.execute("""
            SELECT id, name
            FROM note_folders
            WHERE id = %s AND user_id = %s
        """, (folder_id, user_id))
        active_folder = cursor.fetchone()

        notes_view = "folder"

    cursor.close()
    all_notes_count, root_notes_count = fetch_notes_counts(user_id)
    deleted_notes_count = fetch_deleted_notes_count(user_id)

    return render_template(
        "sidebar/notes.html",
        active_page="notes",
        notes_view=notes_view,
        active_folders=fetch_active_folders(user_id),
        notes=notes,
        notes_grouped=group_notes_by_date(notes),
        active_note=active_note,
        active_folder=active_folder,
        active_folder_id=folder_id if notes_view == "folder" else None,
        folder_counts=fetch_folder_counts(user_id),
        all_notes_count=all_notes_count,
        root_notes_count=root_notes_count,
        deleted_notes_count=deleted_notes_count
    )


@app.route("/notes/create")
@login_required
def create_note():
    user_id = session["user_id"]
    folder_id = request.args.get("folder_id", type=int)
    view = request.args.get("view")  # 👈 root | None

    db = get_db()
    cursor = db.cursor()

    cursor.execute("""
        INSERT INTO notes (user_id, folder_id, title, content)
        VALUES (%s, %s, NULL, '')
    """, (user_id, folder_id))

    note_id = cursor.lastrowid
    cursor.close()

    # 🔑 PRESERVE CONTEXT
    if view == "root":
        return redirect(url_for("view_note", note_id=note_id, view="root")) 
    
    if folder_id:
        return redirect(url_for("view_note", note_id=note_id, folder_id=folder_id))
    
    return redirect(url_for("view_note", note_id=note_id))


@app.route("/notes/<int:note_id>/autosave", methods=["POST"])
@login_required
def autosave_note(note_id):
    title = request.form.get("title")
    content = request.form.get("content")

    # Never store "Untitled"
    if not title or title.strip() == "Untitled":
        title = None

    db = get_db()
    cursor = db.cursor()

    cursor.execute("""
        UPDATE notes
        SET title = %s,
            content = %s,
            updated_at = NOW()
        WHERE id = %s
          AND user_id = %s
    """, (title, content, note_id, session["user_id"]))

    if cursor.rowcount == 0:
        cursor.close()
        return "Not found", 404

    cursor.close()
    return "", 204



@app.route("/calendar")
@login_required
def calendar_page():
    user_id = session["user_id"]

    db = get_db()
    cursor = db.cursor(dictionary=True)

    events = []
    if calendar_schema_available():
        cursor.execute(
            """
            SELECT
                id,
                title,
                event_date AS date,
                event_time AS time,
                category,
                color
            FROM calendar_events
            WHERE user_id = %s
              AND deleted_at IS NULL
            ORDER BY event_date ASC, event_time ASC
            """,
            (user_id,),
        )
        events = cursor.fetchall()

        for event in events:
            if event.get("date"):
                event["date"] = event["date"].strftime("%Y-%m-%d")
            event["time"] = format_calendar_event_time(event.get("time"))

    cursor.execute(
        """
        SELECT id, title
        FROM tasks
        WHERE user_id = %s
          AND completed = 0
        ORDER BY created_at DESC
        LIMIT 5
        """,
        (user_id,),
    )
    upcoming_tasks = cursor.fetchall()
    cursor.close()

    return render_template(
        "sidebar/calendar.html",
        calendar_events=events,
        upcoming_tasks=upcoming_tasks,
        active_page="calendar",
        page_title="Calendar",
    )


@app.route("/calendar/events/create", methods=["POST"])
@login_required
def create_calendar_event():
    if not calendar_schema_available():
        flash("Calendar is not configured in the database yet.")
        return redirect(url_for("calendar_page"))

    title = (request.form.get("title") or "").strip()
    date = (request.form.get("date") or "").strip()
    time = (request.form.get("time") or "09:00").strip()
    category = (request.form.get("category") or "personal").strip() or "personal"
    color = (request.form.get("color") or "rgba(255,255,255,0.7)").strip() or "rgba(255,255,255,0.7)"

    if not title or not date:
        return redirect(url_for("calendar_page"))

    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        """
        INSERT INTO calendar_events (user_id, title, event_date, event_time, category, color, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, NOW())
        """,
        (session["user_id"], title, date, time, category, color),
    )
    cursor.close()
    return redirect(url_for("calendar_page"))


@app.route("/calendar/events/<int:event_id>/delete", methods=["POST"])
@login_required
def delete_calendar_event(event_id):
    if not calendar_schema_available():
        return jsonify({"error": "Calendar is not configured in the database yet."}), 503

    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        """
        UPDATE calendar_events
        SET deleted_at = NOW()
        WHERE id = %s
          AND user_id = %s
        """,
        (event_id, session["user_id"]),
    )
    cursor.close()
    return jsonify({"ok": True})


@app.route("/focus")
@app.route("/focus/<int:task_id>")
@login_required
def focus_page(task_id=None):
    user_id = session["user_id"]
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT id, title
        FROM tasks
        WHERE user_id = %s
          AND completed = 0
        ORDER BY created_at DESC
        """,
        (user_id,),
    )
    tasks = cursor.fetchall()
    cursor.close()

    return render_template(
        "sidebar/focus.html",
        tasks=tasks,
        preselect_task_id=task_id,
        ai_nudge='"Close everything except what you need. The work deserves your full attention."',
        active_page="focus",
    )


@app.route("/focus/sessions/save", methods=["POST"])
@login_required
def save_focus_session():
    if not focus_sessions_schema_available():
        return jsonify({"ok": False, "message": "Focus sessions are not configured in the database yet."}), 503

    data = request.get_json(silent=True) or {}
    task_id = parse_optional_int(data.get("task_id"))
    session_duration = parse_optional_int(data.get("session_duration")) or 0
    actual_time_spent = parse_optional_int(data.get("actual_time_spent")) or 0
    completed = bool(data.get("completed", False))

    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            """
            INSERT INTO focus_sessions
                (user_id, task_id, session_duration, actual_time_spent, completed, created_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
            """,
            (
                session["user_id"],
                task_id,
                session_duration,
                actual_time_spent,
                completed,
            ),
        )
        cursor.close()
        return jsonify({"ok": True})
    except mysql.connector.Error:
        app.logger.exception("Unable to save focus session.")
        return jsonify({"ok": False, "message": "Unable to save focus session right now."}), 500


@app.route("/focus/sessions/complete", methods=["POST"])
@login_required
def complete_focus_session():
    if not focus_sessions_schema_available():
        return jsonify({"ok": False, "message": "Focus sessions are not configured in the database yet."}), 503

    data = request.get_json(silent=True) or {}
    task_id = parse_optional_int(data.get("task_id"))
    completed = bool(data.get("completed", False))
    reflection = (data.get("reflection") or "").strip()

    try:
        db = get_db()
        cursor = db.cursor()

        if task_id is not None:
            cursor.execute(
                """
                UPDATE focus_sessions
                SET completed = %s, reflection = %s
                WHERE user_id = %s AND task_id = %s
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (completed, reflection, session["user_id"], task_id),
            )
        else:
            cursor.execute(
                """
                UPDATE focus_sessions
                SET completed = %s, reflection = %s
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (completed, reflection, session["user_id"]),
            )

        if completed and task_id is not None:
            cursor.execute(
                """
                UPDATE tasks
                SET completed = 1
                WHERE id = %s
                  AND user_id = %s
                """,
                (task_id, session["user_id"]),
            )

        cursor.close()
        return jsonify({"ok": True})
    except mysql.connector.Error:
        app.logger.exception("Unable to complete focus session.")
        return jsonify({"ok": False, "message": "Unable to complete focus session right now."}), 500


@app.route("/trash")
@login_required
def trash_page():
    return render_template("sidebar/trash.html", active_page="trash")


# ============================================================
# 17) GOOGLE LOGIN ROUTES
# ============================================================

@app.route("/login/google")
def login_google():
    if google is None:
        return (
            "Google OAuth is not configured. Set real GOOGLE_CLIENT_ID and "
            "GOOGLE_CLIENT_SECRET values in .env.",
            500,
        )
    try:
        redirect_uri = GOOGLE_REDIRECT_URI or url_for("google_callback", _external=True)
        return google.authorize_redirect(redirect_uri)
    except requests.RequestException:
        app.logger.exception("Google OAuth redirect failed because Google could not be reached.")
        flash("Google sign-in is unavailable right now. Check your internet connection and try again.")
        return redirect(url_for("login_page"))
    except OAuthError as exc:
        app.logger.exception("Google OAuth redirect failed.")
        description = (getattr(exc, "description", "") or "").strip()
        flash(
            "Google sign-in could not start."
            + (f" {description}" if description else "")
        )
        return redirect(url_for("login_page"))


@app.route("/auth/google/callback")
def google_callback():
    """
    Google sends the user back here after they approve login.
    We exchange the code for an access token, then read their profile.
    """
    if google is None:
        return (
            "Google OAuth is not configured. Set real GOOGLE_CLIENT_ID and "
            "GOOGLE_CLIENT_SECRET values in .env.",
            500,
        )

    if request.args.get("error"):
        description = (request.args.get("error_description") or "").strip()
        flash(
            "Google sign-in was canceled or denied."
            + (f" {description}" if description else "")
        )
        return redirect(url_for("login_page"))

    try:
        token = google.authorize_access_token()
        user_info = token.get("userinfo")
        if not user_info and token.get("id_token"):
            user_info = google.parse_id_token(token)
        user_info = user_info or {}

        email = user_info.get("email")
        name = user_info.get("name") or "TaskFlow User"
        google_id = user_info.get("sub")

        if not email or not google_id:
            flash("Google sign-in failed because Google did not return the required account details.")
            return redirect(url_for("login_page"))

        user = fetch_user_by_email(email)

        if user:
            user_id = user["id"]
            username = user["username"]
        else:
            user_id, username = create_user_oauth(name, email, "google", google_id)
    except OAuthError as exc:
        app.logger.exception("Google OAuth callback failed.")
        error_code = (getattr(exc, "error", "") or "").strip()
        description = (getattr(exc, "description", "") or "").strip()

        if error_code == "invalid_client":
            message = "Google sign-in failed because the client ID or client secret is invalid."
        elif error_code == "invalid_grant":
            message = "Google sign-in expired before it could finish. Please try again."
        elif error_code in {"access_denied", "mismatching_state"}:
            message = "Google sign-in was interrupted. Please try again."
        else:
            message = "Google sign-in failed."

        if description:
            message = f"{message} {description}"

        flash(message)
        return redirect(url_for("login_page"))
    except requests.RequestException:
        app.logger.exception("Google user info lookup failed.")
        flash("Google sign-in failed because the app could not reach Google. Please try again.")
        return redirect(url_for("login_page"))
    except mysql.connector.Error:
        app.logger.exception("Google sign-in failed because the database is unavailable.")
        flash(AUTH_DB_ERROR_MESSAGE)
        return redirect(url_for("login_page"))

    session.update({
        "user_id": user_id,
        "user_name": name,
        "username": username
    })

    return redirect(url_for("home_page"))

# Sidebar links pages
@app.route("/tasks")
@login_required
def tasks_page():
    user_id = session["user_id"]
    requested_list_id = request.args.get("list_id", type=int)

    db = get_db()
    cursor = db.cursor(dictionary=True)

    inbox_id = get_inbox_list_id(user_id)

    cursor.execute(
        """
        SELECT
            tl.id,
            tl.name,
            tl.created_at,
            COUNT(t.id) AS task_count
        FROM task_lists tl
        LEFT JOIN tasks t
          ON t.list_id = tl.id
         AND t.user_id = tl.user_id
        WHERE tl.user_id = %s
        GROUP BY tl.id, tl.name, tl.created_at
        ORDER BY CASE WHEN tl.id = %s THEN 0 ELSE 1 END, tl.created_at DESC
        """,
        (user_id, inbox_id),
    )
    lists = cursor.fetchall()
    valid_list_ids = {row["id"] for row in lists}
    active_list_id = requested_list_id if requested_list_id in valid_list_ids else None

    active_list = next((l for l in lists if l["id"] == active_list_id), None)

    if active_list_id is None:
        cursor.execute(
            """
            SELECT
                t.*,
                tl.name AS list_name
            FROM tasks t
            LEFT JOIN task_lists tl
              ON tl.id = t.list_id
            WHERE t.user_id = %s
            ORDER BY t.completed ASC, t.created_at DESC
            """,
            (user_id,),
        )
    else:
        cursor.execute(
            """
            SELECT
                t.*,
                tl.name AS list_name
            FROM tasks t
            LEFT JOIN task_lists tl
              ON tl.id = t.list_id
            WHERE t.user_id = %s
              AND t.list_id = %s
            ORDER BY t.completed ASC, t.created_at DESC
            """,
            (user_id, active_list_id),
        )
    tasks = cursor.fetchall()

    cursor.close()

    return render_template(
        "sidebar/tasks.html",
        active_page="tasks",
        page_title="Tasks",
        lists=lists,
        active_list=active_list,
        active_list_id=active_list_id,
        all_tasks_count=sum(int(lst.get("task_count") or 0) for lst in lists),
        tasks=tasks,
    )

@app.route("/notes/folders/color/<int:folder_id>", methods=["POST"])
@login_required
def save_folder_color(folder_id):
    color = request.json.get("color")

    db = get_db()
    cursor = db.cursor()

    cursor.execute("""
        UPDATE note_folders
        SET color = %s
        WHERE id = %s AND user_id = %s
    """, (color, folder_id, session["user_id"]))

    cursor.close()
    return "", 204




# ============================================================
# 18) RUN APP
# ============================================================

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8001)), debug=False)
