import sqlite3
conn = sqlite3.connect('resolveai.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
print("Tables:", cursor.fetchall())

cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'knowledge%' OR name LIKE 'ai_%'")
print("Knowledge/AI tables:", cursor.fetchall())
conn.close()