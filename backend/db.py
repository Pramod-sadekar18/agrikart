"""
AgriKart Backend - Database Helper Module
Provides managed connection pooling and queries via mysql-connector-python.
"""
import os
import sys
from contextlib import contextmanager
import mysql.connector
from mysql.connector import Error, pooling
from config import Config

# Connection pool instance (lazily initialized)
_connection_pool = None

def get_connection_pool():
    """
    Initializes or returns the existing MySQL connection pool.
    Uses credentials from environment variables via Config.
    """
    global _connection_pool
    if _connection_pool is None:
        _connection_pool = pooling.MySQLConnectionPool(
            pool_name=Config.DB_POOL_NAME,
            pool_size=Config.DB_POOL_SIZE,
            pool_reset_session=True,
            host=Config.DB_HOST,
            port=Config.DB_PORT,
            database=Config.DB_NAME,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            charset="utf8mb4",
            collation="utf8mb4_unicode_ci"
        )
    return _connection_pool

@contextmanager
def get_db_connection():
    """
    Context manager to acquire a database connection from the pool and ensure
    it is safely returned to the pool after execution.

    Usage:
        with get_db_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute("SELECT * FROM categories")
                categories = cursor.fetchall()
    """
    conn = None
    try:
        pool = get_connection_pool()
        conn = pool.get_connection()
        yield conn
    except Error as err:
        if conn and conn.is_connected():
            conn.rollback()
        raise err
    finally:
        if conn and conn.is_connected():
            conn.close()  # Returns the connection back to the pool

def test_connection():
    """
    Verifies that Flask can communicate with the MySQL database.
    Checks database connection, MySQL server version, and table count.

    Returns:
        dict: Diagnostics information including connection status and table names.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                # Query MySQL server metadata
                cursor.execute("SELECT DATABASE() AS current_db, VERSION() AS mysql_version")
                meta = cursor.fetchone()

                # Query existing tables in agrikart_db
                cursor.execute("SHOW TABLES")
                raw_tables = cursor.fetchall()
                table_names = [list(row.values())[0] for row in raw_tables]

                # Count categories and products
                cursor.execute("SELECT COUNT(*) AS count FROM categories")
                cat_count = cursor.fetchone()["count"]

                cursor.execute("SELECT COUNT(*) AS count FROM products")
                prod_count = cursor.fetchone()["count"]

                return {
                    "success": True,
                    "database": meta["current_db"],
                    "mysql_version": meta["mysql_version"],
                    "tables_count": len(table_names),
                    "tables": table_names,
                    "categories_count": cat_count,
                    "products_count": prod_count
                }
    except Error as err:
        return {
            "success": False,
            "error_code": err.errno,
            "error_message": str(err),
            "hint": "Check DB_USER, DB_PASSWORD, and ensure MySQL service is running."
        }
