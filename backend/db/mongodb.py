"""
backend/db/mongodb.py
---------------------
MongoDB connection lifecycle.
"""
from motor.motor_asyncio import AsyncIOMotorClient
import logging
from backend.config import get_settings

logger = logging.getLogger(__name__)

class DataBase:
    client: AsyncIOMotorClient = None

db = DataBase()

def get_database() -> AsyncIOMotorClient:
    return db.client

async def connect_to_mongo():
    settings = get_settings()
    logger.info("Connecting to MongoDB...")
    db.client = AsyncIOMotorClient(settings.mongodb_uri)
    logger.info("Connected to MongoDB!")

async def close_mongo_connection():
    logger.info("Closing MongoDB connection...")
    if db.client:
        db.client.close()
        logger.info("MongoDB connection closed.")
