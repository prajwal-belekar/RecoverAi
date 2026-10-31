import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__) or '.', 'resolveai.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# List all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cursor.fetchall()]
print("Tables:", tables)

# Show schema for each table
for table in tables:
    cursor.execute(f"SELECT sql FROM sqlite_master WHERE name='{table}' AND type='table'")
    row = cursor.fetchone()
    if row:
        print(f"Schema for {table}:")
        print(row[0])
        print()

conn.close()