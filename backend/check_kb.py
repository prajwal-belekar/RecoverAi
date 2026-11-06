import sqlite3
conn = sqlite3.connect('resolveai.db')
cursor = conn.cursor()
cursor.execute("SELECT * FROM knowledge_base")
print("Knowledge base:", cursor.fetchall())
conn.close()