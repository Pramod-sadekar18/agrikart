"""
AgriKart Backend - Product Routes
Provides REST API endpoints for fetching products from MySQL database.

Endpoints:
  - GET /api/products: Fetch all products (optional filtering by category, search keyword)
  - GET /api/products/<id>: Fetch single product by ID
"""
import json
from decimal import Decimal
from datetime import date, datetime
from flask import Blueprint, jsonify, request
from db import get_db_connection
from mysql.connector import Error

product_bp = Blueprint("product_bp", __name__)

def format_product(row):
    """
    Transforms a MySQL dictionary row into a clean JSON-serializable product dictionary.
    Handles Decimal, Date/Datetime, and JSON strings (features, specifications).
    Maps both camelCase and snake_case keys to maintain complete compatibility.
    """
    if not row:
        return None

    # Parse features JSON array
    features = row.get("features")
    if isinstance(features, str):
        try:
            features = json.loads(features)
        except (json.JSONDecodeError, TypeError):
            features = []
    elif features is None:
        features = []

    # Parse specifications JSON dictionary
    specifications = row.get("specifications")
    if isinstance(specifications, str):
        try:
            specifications = json.loads(specifications)
        except (json.JSONDecodeError, TypeError):
            specifications = {}
    elif specifications is None:
        specifications = {}

    # Handle numeric Decimal types safely for JSON serialization
    price = float(row.get("price", 0)) if isinstance(row.get("price"), Decimal) else float(row.get("price", 0))
    original_price = float(row.get("original_price", 0)) if isinstance(row.get("original_price"), Decimal) else float(row.get("original_price", 0))
    rating = float(row.get("rating", 0)) if isinstance(row.get("rating"), Decimal) else float(row.get("rating", 0))

    # Format dates as ISO strings
    mfg_date = row.get("manufacturing_date")
    if isinstance(mfg_date, (date, datetime)):
        mfg_date = mfg_date.strftime("%Y-%m-%d")

    exp_date = row.get("expiry_date")
    if isinstance(exp_date, (date, datetime)):
        exp_date = exp_date.strftime("%Y-%m-%d")

    created_at = row.get("created_at")
    if isinstance(created_at, (date, datetime)):
        created_at = created_at.isoformat()

    return {
        "id": row.get("id"),
        "name": row.get("name"),
        "category": row.get("category_id"),
        "category_id": row.get("category_id"),
        "subcategory": row.get("subcategory"),
        "brand": row.get("brand"),
        "price": price,
        "originalPrice": original_price,
        "original_price": original_price,
        "discount": row.get("discount", 0),
        "rating": rating,
        "reviewCount": row.get("review_count", 0),
        "review_count": row.get("review_count", 0),
        "stock": row.get("stock", 0),
        "stockStatus": row.get("stock_status"),
        "stock_status": row.get("stock_status"),
        "image": row.get("image"),
        "description": row.get("description"),
        "features": features,
        "specifications": specifications,
        "manufacturingDate": mfg_date,
        "manufacturing_date": mfg_date,
        "expiryDate": exp_date,
        "expiry_date": exp_date,
        "seller": row.get("seller", "AgriKart Fulfilled"),
        "created_at": created_at
    }

@product_bp.route("/api/products", methods=["GET"])
def get_products():
    """
    GET /api/products
    Fetches products from MySQL agrikart_db.
    Supports optional query filters:
      - category: filter by category_id (e.g., 'seeds', 'fertilizers')
      - q or query: search text across product name, brand, description
      - limit: maximum number of products to return
    """
    category = request.args.get("category")
    query = request.args.get("q") or request.args.get("query")
    limit = request.args.get("limit", type=int)

    sql = "SELECT * FROM products WHERE 1=1"
    params = []

    if category:
        sql += " AND category_id = %s"
        params.append(category)

    if query:
        search_pattern = f"%{query}%"
        sql += " AND (name LIKE %s OR brand LIKE %s OR description LIKE %s OR category_id LIKE %s)"
        params.extend([search_pattern, search_pattern, search_pattern, search_pattern])

    sql += " ORDER BY id ASC"

    if limit and limit > 0:
        sql += " LIMIT %s"
        params.append(limit)

    try:
        with get_db_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(sql, tuple(params))
                rows = cursor.fetchall()
                products = [format_product(row) for row in rows]
                return jsonify({
                    "success": True,
                    "count": len(products),
                    "products": products
                }), 200
    except Error as err:
        return jsonify({
            "success": False,
            "error": "Failed to fetch products from database",
            "details": str(err)
        }), 500
    except Exception as ex:
        return jsonify({
            "success": False,
            "error": "Internal server error while fetching products",
            "details": str(ex)
        }), 500

@product_bp.route("/api/products/<int:product_id>", methods=["GET"])
def get_product(product_id):
    """
    GET /api/products/<id>
    Fetches a single product from MySQL by its primary key ID.
    Returns:
      - 200 OK with product JSON if found
      - 404 Not Found if no product exists with that ID
      - 500 Internal Server Error on database failure
    """
    sql = "SELECT * FROM products WHERE id = %s"
    try:
        with get_db_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(sql, (product_id,))
                row = cursor.fetchone()

                if not row:
                    return jsonify({
                        "success": False,
                        "error": f"Product with ID {product_id} not found"
                    }), 404

                return jsonify({
                    "success": True,
                    "product": format_product(row)
                }), 200
    except Error as err:
        return jsonify({
            "success": False,
            "error": f"Database error fetching product {product_id}",
            "details": str(err)
        }), 500
    except Exception as ex:
        return jsonify({
            "success": False,
            "error": "Internal server error",
            "details": str(ex)
        }), 500
