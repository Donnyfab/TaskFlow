import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

print("Connecting to DB...")

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

cur.execute("SELECT 1;")
print(cur.fetchone())

conn.close()

print("SUCCESS 🚀")
