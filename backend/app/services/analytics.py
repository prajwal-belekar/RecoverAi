"""
ResolveAI Business Analytics Service
Uses actual database records - no hardcoded/fake statistics.
"""
import sqlite3
import json
from datetime import datetime, timedelta
from collections import Counter
from typing import Optional, List, Dict, Any


def get_db_connection():
    """Get a database connection for analytics queries."""
    db_path = sqlite3.connect('resolveai.db')
    db_path.row_factory = sqlite3.Row
    return db_path


def get_totals() -> Dict[str, int]:
    """Get total ticket counts."""
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) as total FROM tickets")
        total = cur.fetchone()['total']
        
        cur.execute("SELECT COUNT(*) as open FROM tickets WHERE status = 'Open'")
        open_tickets = cur.fetchone()['open']
        
        cur.execute("SELECT COUNT(*) as resolved FROM tickets WHERE status = 'Resolved'")
        resolved = cur.fetchone()['resolved']
        
        cur.execute("SELECT COUNT(*) as critical FROM tickets WHERE priority = 'Critical'")
        critical = cur.fetchone()['critical']
        
        return {
            "total": total,
            "open": open_tickets,
            "resolved": resolved,
            "critical": critical
        }
    finally:
        conn.close()


def get_category_distribution() -> List[Dict[str, Any]]:
    """Get ticket distribution by category."""
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT category, COUNT(*) as count 
            FROM tickets 
            WHERE category IS NOT NULL 
            GROUP BY category 
            ORDER BY count DESC
        """)
        rows = cur.fetchall()
        return [{"category": row['category'] or 'Uncategorized', "count": row['count']} for row in rows]
    finally:
        conn.close()


def get_sentiment_distribution() -> List[Dict[str, Any]]:
    """Get sentiment distribution from AI classifications."""
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT sentiment, COUNT(*) as count 
            FROM ai_classifications 
            GROUP BY sentiment
        """)
        rows = cur.fetchall()
        return [{"sentiment": row['sentiment'] or 'unknown', "count": row['count']} for row in rows]
    finally:
        conn.close()


def get_priority_distribution() -> List[Dict[str, Any]]:
    """Get priority distribution from AI priorities."""
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT priority_level, AVG(score) as avg_score, COUNT(*) as count 
            FROM ai_priorities 
            GROUP BY priority_level
        """)
        rows = cur.fetchall()
        return [
            {
                "priority": row['priority_level'],
                "avg_score": round(row['avg_score'], 1) if row['avg_score'] else 0,
                "count": row['count']
            } for row in rows
        ]
    finally:
        conn.close()


def get_recurring_issues(limit: int = 5) -> List[Dict[str, Any]]:
    """Identify recurring customer issues and patterns."""
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT category, urgency, sentiment, COUNT(*) as freq
            FROM ai_classifications
            GROUP BY category, urgency, sentiment
            ORDER BY freq DESC
            LIMIT ?
        """, (limit,))
        rows = cur.fetchall()
        
        issues = []
        for row in rows:
            issues.append({
                "issue": f"{row['category']} ({row['urgency']}, {row['sentiment']})",
                "frequency": row['freq'],
                "type": "observed_pattern"
            })
        return issues
    finally:
        conn.close()


def get_average_response_time() -> Optional[float]:
    """Calculate average response time in hours."""
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT AVG(julianday(updated_at) - julianday(created_at)) * 24 as avg_hours
            FROM tickets
            WHERE agent_id IS NOT NULL AND status = 'Resolved'
        """)
        row = cur.fetchone()
        if row and row['avg_hours'] is not None:
            return round(row['avg_hours'], 2)
        return None
    finally:
        conn.close()


def get_average_resolution_time() -> Optional[float]:
    """Calculate average resolution time in hours."""
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT AVG(julianday(updated_at) - julianday(created_at)) * 24 as avg_hours
            FROM tickets
            WHERE status = 'Resolved'
        """)
        row = cur.fetchone()
        if row and row['avg_hours'] is not None:
            return round(row['avg_hours'], 2)
        return None
    finally:
        conn.close()


def get_sentiment_trend(days: int = 30) -> List[Dict[str, Any]]:
    """Get sentiment trend over time (simplified - daily data)."""
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT DATE(created_at) as date, sentiment, COUNT(*) as cnt
            FROM ai_classifications
            WHERE created_at >= date('now', '-' || ? || ' days')
            GROUP BY date, sentiment
            ORDER BY date
        """, (days,))
        rows = cur.fetchall()
        
        # Transform into trend data
        trend = {}
        for row in rows:
            date = row['date']
            if date not in trend:
                trend[date] = {"positive": 0, "negative": 0, "neutral": 0}
            trend[date][row['sentiment']] = row['cnt']
        
        result = []
        for date in sorted(trend.keys()):
            result.append({
                "date": date,
                "positive": trend[date].get("positive", 0),
                "negative": trend[date].get("negative", 0),
                "neutral": trend[date].get("neutral", 0)
            })
        return result
    finally:
        conn.close()