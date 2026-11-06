import sqlite3
conn = sqlite3.connect('resolveai.db')
cursor = conn.cursor()
cursor.execute("SELECT * FROM knowledge_chunks")
print("Knowledge chunks:", cursor.fetchall())
cursor.execute("SELECT * FROM ai_responses")
print("AI responses:", cursor.fetchall())
conn.close()