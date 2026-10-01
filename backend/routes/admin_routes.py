"""Protected admin API for catalog management and operations monitoring."""

import hmac
import json
import os
import uuid
from decimal import Decimal, InvalidOperation
from functools import wraps

from flask import Blueprint, jsonify, request
from mysql.connector import Error

from db import get_db_connection

admin_bp = Blueprint("admin_bp", __name__)
UPLOAD_DIRECTORY = os.getenv(
    "PRODUCT_UPLOAD_DIR",
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads"),
)
MAX_IMAGE_SIZE = 5 * 1024 * 1024
IMAGE_SIGNATURES = {
    ".jpg": lambda header: header.startswith(b"\xff\xd8\xff"),
    ".jpeg": lambda header: header.startswith(b"\xff\xd8\xff"),
    ".png": lambda header: header.startswith(b"\x89PNG\r\n\x1a\n"),
    ".webp": lambda header: header.startswith(b"RIFF") and header[8:12] == b"WEBP",
    ".gif": lambda header: header[:6] in (b"GIF87a", b"GIF89a"),
}


def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        username = os.getenv("ADMIN_USERNAME", "")
        password = os.getenv("ADMIN_PASSWORD", "")
        credentials = request.authorization

        if not username or not password:
            return jsonify({"success": False, "message": "Admin access is not configured."}), 503

        if (
            credentials is None
            or not hmac.compare_digest(credentials.username or "", username)
            or not hmac.compare_digest(credentials.password or "", password)
        ):
            return jsonify({"success": False, "message": "Invalid admin credentials."}), 401

        return view(*args, **kwargs)

    return wrapped


def stock_label(stock):
    if stock == 0:
        return "Out of Stock"
    if stock <= 5:
        return f"Only {stock} left"
    return "In Stock"


def serialize_product(row):
    row["price"] = float(row["price"])
    row["original_price"] = float(row["original_price"])
    row["features"] = json.loads(row["features"]) if isinstance(row["features"], str) else (row["features"] or [])
    row["specifications"] = json.loads(row["specifications"]) if isinstance(row["specifications"], str) else (row["specifications"] or {})
    return row


def validate_product(data):
    required_text = ("name", "category_id", "brand", "image")
    values = {key: str(data.get(key, "")).strip() for key in required_text}
    if any(not value for value in values.values()):
        raise ValueError("Name, category, brand, and image path are required.")
    if len(values["name"]) > 255 or len(values["brand"]) > 100 or len(values["image"]) > 255:
        raise ValueError("A product field exceeds its maximum length.")
    if len(values["category_id"]) > 50:
        raise ValueError("Choose a valid category.")

    try:
        price = Decimal(str(data.get("price", "")))
        original_price = Decimal(str(data.get("original_price", "")))
        discount = int(data.get("discount", 0))
        stock = int(data.get("stock", 0))
    except (InvalidOperation, TypeError, ValueError):
        raise ValueError("Price, original price, discount, and stock must be valid numbers.")

    if not price.is_finite() or not original_price.is_finite() or price <= 0 or original_price < price:
        raise ValueError("Price must be positive and original price must be at least the selling price.")
    if discount < 0 or discount > 100 or stock < 0:
        raise ValueError("Discount must be 0-100 and stock cannot be negative.")

    features = data.get("features", [])
    specifications = data.get("specifications", {})
    if not isinstance(features, list) or not all(isinstance(item, str) for item in features):
        raise ValueError("Features must be a list of text values.")
    if not isinstance(specifications, dict):
        raise ValueError("Specifications must be an object.")

    values.update({
        "subcategory": str(data.get("subcategory", "")).strip() or None,
        "price": price,
        "original_price": original_price,
        "discount": discount,
        "stock": stock,
        "stock_status": stock_label(stock),
        "image": values["image"],
        "description": str(data.get("description", "")).strip(),
        "features": json.dumps(features),
        "specifications": json.dumps(specifications),
        "seller": str(data.get("seller", "AgriKart Fulfilled")).strip() or "AgriKart Fulfilled",
    })
    return values


@admin_bp.get("/api/admin/session")
@admin_required
def admin_session():
    return jsonify({"success": True, "username": os.getenv("ADMIN_USERNAME")})


@admin_bp.post("/api/admin/uploads")
@admin_required
def upload_product_image():
    image = request.files.get("image")
    if image is None or not image.filename:
        return jsonify({"success": False, "message": "Choose an image to upload."}), 400

    extension = os.path.splitext(image.filename)[1].lower()
    signature_check = IMAGE_SIGNATURES.get(extension)
    if signature_check is None:
        return jsonify({"success": False, "message": "Use a JPG, PNG, WebP, or GIF image."}), 400

    image.stream.seek(0, os.SEEK_END)
    image_size = image.stream.tell()
    image.stream.seek(0)
    if image_size > MAX_IMAGE_SIZE:
        return jsonify({"success": False, "message": "Image uploads must be 5 MB or smaller."}), 413

    header = image.stream.read(12)
    image.stream.seek(0)
    if not signature_check(header):
        return jsonify({"success": False, "message": "The selected file does not match its image type."}), 400

    filename = f"{uuid.uuid4().hex}{extension}"
    try:
        os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)
        image.save(os.path.join(UPLOAD_DIRECTORY, filename))
    except OSError:
        return jsonify({"success": False, "message": "Could not store the uploaded image."}), 500

    return jsonify({"success": True, "image": f"/uploads/{filename}"}), 201


@admin_bp.get("/api/admin/overview")
@admin_required
def admin_overview():
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("""
                SELECT
                    (SELECT COUNT(*) FROM products) AS product_count,
                    (SELECT COUNT(*) FROM users) AS customer_count,
                    (SELECT COUNT(*) FROM orders) AS order_count,
                    (SELECT COUNT(*) FROM orders WHERE status NOT IN ('Delivered', 'Cancelled')) AS open_order_count,
                    (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status <> 'Cancelled') AS gross_sales,
                    (SELECT COUNT(*) FROM products WHERE stock = 0) AS out_of_stock_count,
                    (SELECT COUNT(*) FROM products WHERE stock BETWEEN 1 AND 5) AS low_stock_count
            """)
            metrics = cursor.fetchone()
            metrics["gross_sales"] = float(metrics["gross_sales"])

            cursor.execute("""
                SELECT id, status, total_amount, order_date, shipping_name
                FROM orders ORDER BY order_date DESC LIMIT 8
            """)
            recent_orders = cursor.fetchall()
            for order in recent_orders:
                order["total_amount"] = float(order["total_amount"])
                order["order_date"] = order["order_date"].isoformat() if order["order_date"] else None

            cursor.execute("""
                SELECT id, name, stock, stock_status
                FROM products WHERE stock <= 5
                ORDER BY stock ASC, name ASC LIMIT 8
            """)
            stock_alerts = cursor.fetchall()
            cursor.close()

        return jsonify({
            "success": True,
            "metrics": metrics,
            "recent_orders": recent_orders,
            "stock_alerts": stock_alerts,
        })
    except Error:
        return jsonify({"success": False, "message": "Could not load admin overview."}), 500


@admin_bp.get("/api/admin/categories")
@admin_required
def admin_categories():
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT id, name FROM categories ORDER BY name")
            categories = cursor.fetchall()
            cursor.close()
        return jsonify({"success": True, "categories": categories})
    except Error:
        return jsonify({"success": False, "message": "Could not load categories."}), 500


@admin_bp.get("/api/admin/products")
@admin_required
def admin_products():
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("""
                SELECT id, name, category_id, subcategory, brand, price, original_price,
                       discount, stock, stock_status, image, description, features,
                       specifications, seller
                FROM products ORDER BY id DESC
            """)
            products = [serialize_product(row) for row in cursor.fetchall()]
            cursor.close()
        return jsonify({"success": True, "products": products})
    except (Error, ValueError, TypeError):
        return jsonify({"success": False, "message": "Could not load products."}), 500

def write_product(product, product_id=None):
    with get_db_connection() as connection:
        cursor = connection.cursor()

        cursor.execute(
            "SELECT id FROM categories WHERE id = %s",
            (product["category_id"],)
        )

        if cursor.fetchone() is None:
            cursor.close()
            return None

        values = (
            product["name"],
            product["category_id"],
            product["subcategory"],
            product["brand"],
            product["price"],
            product["original_price"],
            product["discount"],
            product["stock"],
            product["stock_status"],
            product["image"],
            product["description"],
            product["features"],
            product["specifications"],
            product["seller"],
        )

        if product_id is None:

            cursor.execute(
                """
                INSERT INTO products (
                    name,
                    category_id,
                    subcategory,
                    brand,
                    price,
                    original_price,
                    discount,
                    stock,
                    stock_status,
                    image,
                    description,
                    features,
                    specifications,
                    seller
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s
                )
                """,
                values,
            )

            product_id = cursor.lastrowid

        else:

            cursor.execute(
                "SELECT id FROM products WHERE id = %s",
                (product_id,)
            )

            if cursor.fetchone() is None:
                cursor.close()
                return False

            cursor.execute(
                """
                UPDATE products
                SET
                    name = %s,
                    category_id = %s,
                    subcategory = %s,
                    brand = %s,
                    price = %s,
                    original_price = %s,
                    discount = %s,
                    stock = %s,
                    stock_status = %s,
                    image = %s,
                    description = %s,
                    features = %s,
                    specifications = %s,
                    seller = %s
                WHERE id = %s
                """,
                values + (product_id,),
            )

        connection.commit()
        cursor.close()

    return product_id

@admin_bp.post("/api/admin/products")
@admin_required
def create_product():
    try:
        product = validate_product(request.get_json(silent=True) or {})
        product_id = write_product(product)
        if product_id is None:
            return jsonify({"success": False, "message": "Choose an existing category."}), 400
        return jsonify({"success": True, "id": product_id}), 201
    except ValueError as error:
        return jsonify({"success": False, "message": str(error)}), 400
    except Error:
        return jsonify({"success": False, "message": "Could not create product."}), 500


@admin_bp.put("/api/admin/products/<int:product_id>")
@admin_required
def update_product(product_id):
    try:
        product = validate_product(request.get_json(silent=True) or {})
        updated_id = write_product(product, product_id)
        if updated_id is None:
            return jsonify({"success": False, "message": "Choose an existing category."}), 400
        if updated_id is False:
            return jsonify({"success": False, "message": "Product not found."}), 404
        return jsonify({"success": True, "id": product_id})
    except ValueError as error:
        return jsonify({"success": False, "message": str(error)}), 400
    except Error:
        return jsonify({"success": False, "message": "Could not update product."}), 500