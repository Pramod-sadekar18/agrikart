"""
AgriKart Backend - Configuration Module
Loads application and database settings securely from environment variables.
"""
import os
import sys
from dotenv import load_dotenv

# Ensure backend directory is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Explicitly load backend/.env based on the directory of config.py
DOTENV_PATH = os.path.abspath(os.path.join(BASE_DIR, ".env"))
load_dotenv(dotenv_path=DOTENV_PATH, override=True)

class Config:
    """Application configuration parameters."""
    # Flask settings
    SECRET_KEY = os.getenv("SECRET_KEY", "agrikart-secret-key-change-in-production")
    DEBUG = os.getenv("FLASK_DEBUG", "True").lower() in ("true", "1", "t")

    # MySQL Database connection parameters
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", 3306))
    DB_NAME = os.getenv("DB_NAME", "agrikart_db")
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")  # Supplied via environment variable

    # Connection pooling parameters
    DB_POOL_NAME = os.getenv("DB_POOL_NAME", "agrikart_pool")
    DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", 5))
