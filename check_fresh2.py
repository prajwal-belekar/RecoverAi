import sqlite3
conn = sqlite3.connect('backend/test_fresh.db')
c = conn.cursor()
c.execute("PRAGMA table_info(users)")
print("users columns:", c.fetchall())
c.execute("PRAGMA table_info(workspaces)")
print("workspaces columns:", c.fetchall())
conn.close()