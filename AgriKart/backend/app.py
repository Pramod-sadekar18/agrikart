"""
AgriKart Backend - Flask Application Entry Point
"""

import os
import sys

# Ensure backend directory is in Python search path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from flask import Flask, jsonify, request
from flask_cors import CORS

from config import Config
from db import test_connection, get_db_connection


def create_app():
    """Create and configure Flask application."""

    app = Flask(__name__)
    app.config.from_object(Config)

    # Allow frontend to communicate with Flask
    CORS(app)

    # =========================================================
    # HEALTH CHECK API
    # =========================================================

    @app.route("/api/health", methods=["GET"])
    def health_check():

        db_diagnostic = test_connection()

        if db_diagnostic.get("success"):

            return jsonify({
                "status": "healthy",
                "message": "Flask backend is running and successfully connected to MySQL database.",
                "database": "connected",
                "details": db_diagnostic
            }), 200

        return jsonify({
            "status": "degraded",
            "message": "Flask backend is running, but failed to connect to MySQL database.",
            "database": "disconnected",
            "details": db_diagnostic
        }), 500

    # =========================================================
    # PRODUCTS API
    # =========================================================

    @app.route("/api/products", methods=["GET"])
    def get_products():

        try:

            with get_db_connection() as connection:

                cursor = connection.cursor(dictionary=True)

                cursor.execute("""
                    SELECT *
                    FROM products
                    ORDER BY id
                """)

                products = cursor.fetchall()

                cursor.close()

            return jsonify({
                "success": True,
                "count": len(products),
                "products": products
            }), 200

        except Exception as e:

            return jsonify({
                "success": False,
                "message": "Failed to fetch products.",
                "error": str(e)
            }), 500

    # =========================================================
    # SINGLE PRODUCT API
    # =========================================================

    @app.route("/api/products/<int:product_id>", methods=["GET"])
    def get_product(product_id):

        try:

            with get_db_connection() as connection:

                cursor = connection.cursor(dictionary=True)

                cursor.execute("""
                    SELECT *
                    FROM products
                    WHERE id = %s
                """, (product_id,))

                product = cursor.fetchone()

                cursor.close()

            if product is None:

                return jsonify({
                    "success": False,
                    "message": "Product not found."
                }), 404

            return jsonify({
                "success": True,
                "product": product
            }), 200

        except Exception as e:

            return jsonify({
                "success": False,
                "message": "Failed to fetch product.",
                "error": str(e)
            }), 500

    # =========================================================
    # CART API - GET CART
    # =========================================================

    @app.route("/api/cart/<int:user_id>", methods=["GET"])
    def get_cart(user_id):

        try:

            with get_db_connection() as connection:

                cursor = connection.cursor(dictionary=True)

                cursor.execute("""
                    SELECT
                        c.id,
                        c.user_id,
                        c.product_id,
                        c.quantity,
                        p.name,
                        p.brand,
                        p.price,
                        p.original_price,
                        p.discount,
                        p.image,
                        p.stock,
                        p.stock_status
                    FROM cart_items c
                    INNER JOIN products p
                        ON c.product_id = p.id
                    WHERE c.user_id = %s
                    ORDER BY c.id
                """, (user_id,))

                cart_items = cursor.fetchall()

                cursor.close()

            return jsonify({
                "success": True,
                "user_id": user_id,
                "count": len(cart_items),
                "items": cart_items
            }), 200

        except Exception as e:

            return jsonify({
                "success": False,
                "message": "Failed to fetch cart.",
                "error": str(e)
            }), 500

    # =========================================================
    # CART API - ADD PRODUCT
    # =========================================================

    @app.route("/api/cart", methods=["POST"])
    def add_to_cart():

        try:

            data = request.get_json(silent=True) or {}

            user_id = data.get("user_id")
            product_id = data.get("product_id")
            quantity = data.get("quantity", 1)

            if user_id is None or product_id is None:

                return jsonify({
                    "success": False,
                    "message": "user_id and product_id are required."
                }), 400

            try:
                user_id = int(user_id)
                product_id = int(product_id)
                quantity = int(quantity)
            except (TypeError, ValueError):

                return jsonify({
                    "success": False,
                    "message": "user_id, product_id and quantity must be numbers."
                }), 400

            if quantity < 1:

                return jsonify({
                    "success": False,
                    "message": "Quantity must be at least 1."
                }), 400

            with get_db_connection() as connection:

                cursor = connection.cursor(dictionary=True)

                # Check product
                cursor.execute("""
                    SELECT id, name, stock
                    FROM products
                    WHERE id = %s
                """, (product_id,))

                product = cursor.fetchone()

                if product is None:

                    cursor.close()

                    return jsonify({
                        "success": False,
                        "message": "Product not found."
                    }), 404

                if product["stock"] < quantity:

                    cursor.close()

                    return jsonify({
                        "success": False,
                        "message": "Requested quantity is not available in stock.",
                        "available_stock": product["stock"]
                    }), 400

                # Check existing cart item
                cursor.execute("""
                    SELECT id, quantity
                    FROM cart_items
                    WHERE user_id = %s
                    AND product_id = %s
                """, (user_id, product_id))

                existing_item = cursor.fetchone()

                if existing_item:

                    new_quantity = existing_item["quantity"] + quantity

                    if new_quantity > product["stock"]:

                        cursor.close()

                        return jsonify({
                            "success": False,
                            "message": "Total cart quantity exceeds available stock.",
                            "available_stock": product["stock"]
                        }), 400

                    cursor.execute("""
                        UPDATE cart_items
                        SET quantity = %s
                        WHERE id = %s
                    """, (new_quantity, existing_item["id"]))

                else:

                    cursor.execute("""
                        INSERT INTO cart_items
                            (user_id, product_id, quantity)
                        VALUES
                            (%s, %s, %s)
                    """, (user_id, product_id, quantity))

                connection.commit()

                cursor.close()

            return jsonify({
                "success": True,
                "message": "Product added to cart successfully.",
                "user_id": user_id,
                "product_id": product_id
            }), 201

        except Exception as e:

            return jsonify({
                "success": False,
                "message": "Failed to add product to cart.",
                "error": str(e)
            }), 500

    # =========================================================
    # CART API - UPDATE QUANTITY
    # =========================================================

    @app.route(
        "/api/cart/<int:user_id>/<int:product_id>",
        methods=["PUT"]
    )
    def update_cart_quantity(user_id, product_id):

        try:

            data = request.get_json(silent=True) or {}

            quantity = data.get("quantity")

            if quantity is None:

                return jsonify({
                    "success": False,
                    "message": "quantity is required."
                }), 400

            try:
                quantity = int(quantity)
            except (TypeError, ValueError):

                return jsonify({
                    "success": False,
                    "message": "quantity must be a number."
                }), 400

            with get_db_connection() as connection:

                cursor = connection.cursor(dictionary=True)

                # If quantity is 0 or less, remove item
                if quantity <= 0:

                    cursor.execute("""
                        DELETE FROM cart_items
                        WHERE user_id = %s
                        AND product_id = %s
                    """, (user_id, product_id))

                    connection.commit()

                    cursor.close()

                    return jsonify({
                        "success": True,
                        "message": "Cart item removed."
                    }), 200

                # Check stock
                cursor.execute("""
                    SELECT stock
                    FROM products
                    WHERE id = %s
                """, (product_id,))

                product = cursor.fetchone()

                if product is None:

                    cursor.close()

                    return jsonify({
                        "success": False,
                        "message": "Product not found."
                    }), 404

                if quantity > product["stock"]:

                    cursor.close()

                    return jsonify({
                        "success": False,
                        "message": "Requested quantity exceeds available stock.",
                        "available_stock": product["stock"]
                    }), 400

                # Update cart
                cursor.execute("""
                    UPDATE cart_items
                    SET quantity = %s
                    WHERE user_id = %s
                    AND product_id = %s
                """, (quantity, user_id, product_id))

                if cursor.rowcount == 0:

                    cursor.close()

                    return jsonify({
                        "success": False,
                        "message": "Cart item not found."
                    }), 404

                connection.commit()

                cursor.close()

            return jsonify({
                "success": True,
                "message": "Cart quantity updated successfully.",
                "user_id": user_id,
                "product_id": product_id,
                "quantity": quantity
            }), 200

        except Exception as e:

            return jsonify({
                "success": False,
                "message": "Failed to update cart quantity.",
                "error": str(e)
            }), 500

    # =========================================================
    # CART API - REMOVE PRODUCT
    # =========================================================

    @app.route(
        "/api/cart/<int:user_id>/<int:product_id>",
        methods=["DELETE"]
    )
    def remove_from_cart(user_id, product_id):

        try:

            with get_db_connection() as connection:

                cursor = connection.cursor()

                cursor.execute("""
                    DELETE FROM cart_items
                    WHERE user_id = %s
                    AND product_id = %s
                """, (user_id, product_id))

                deleted_rows = cursor.rowcount

                connection.commit()

                cursor.close()

            if deleted_rows == 0:

                return jsonify({
                    "success": False,
                    "message": "Cart item not found."
                }), 404

            return jsonify({
                "success": True,
                "message": "Product removed from cart successfully."
            }), 200

        except Exception as e:

            return jsonify({
                "success": False,
                "message": "Failed to remove product from cart.",
                "error": str(e)
            }), 500

            # =========================================================
    # WISHLIST API - GET WISHLIST
    # =========================================================

    @app.route("/api/wishlist/<int:user_id>", methods=["GET"])
    def get_wishlist(user_id):

        try:
            with get_db_connection() as connection:

                cursor = connection.cursor(dictionary=True)

                cursor.execute("""
                    SELECT
                        w.id,
                        w.user_id,
                        w.product_id,
                        p.name,
                        p.brand,
                        p.price,
                        p.original_price,
                        p.discount,
                        p.rating,
                        p.review_count,
                        p.image,
                        p.stock,
                        p.stock_status
                    FROM wishlist_items w
                    INNER JOIN products p
                        ON w.product_id = p.id
                    WHERE w.user_id = %s
                    ORDER BY w.id DESC
                """, (user_id,))

                wishlist_items = cursor.fetchall()

                cursor.close()

            return jsonify({
                "success": True,
                "user_id": user_id,
                "count": len(wishlist_items),
                "items": wishlist_items
            }), 200

        except Exception as e:

            return jsonify({
                "success": False,
                "message": "Failed to fetch wishlist.",
                "error": str(e)
            }), 500


    # =========================================================
    # WISHLIST API - ADD PRODUCT
    # =========================================================

    @app.route("/api/wishlist", methods=["POST"])
    def add_to_wishlist():

        try:
            data = request.get_json(silent=True) or {}

            user_id = data.get("user_id")
            product_id = data.get("product_id")

            if user_id is None or product_id is None:

                return jsonify({
                    "success": False,
                    "message": "user_id and product_id are required."
                }), 400

            user_id = int(user_id)
            product_id = int(product_id)

            with get_db_connection() as connection:

                cursor = connection.cursor()

                # Check product exists
                cursor.execute("""
                    SELECT id
                    FROM products
                    WHERE id = %s
                """, (product_id,))

                product = cursor.fetchone()

                if product is None:

                    cursor.close()

                    return jsonify({
                        "success": False,
                        "message": "Product not found."
                    }), 404

                # Check already in wishlist
                cursor.execute("""
                    SELECT id
                    FROM wishlist_items
                    WHERE user_id = %s
                    AND product_id = %s
                """, (user_id, product_id))

                existing_item = cursor.fetchone()

                if existing_item:

                    cursor.close()

                    return jsonify({
                        "success": True,
                        "message": "Product already in wishlist."
                    }), 200

                # Add to wishlist
                cursor.execute("""
                    INSERT INTO wishlist_items
                        (user_id, product_id)
                    VALUES
                        (%s, %s)
                """, (user_id, product_id))

                connection.commit()

                cursor.close()

            return jsonify({
                "success": True,
                "message": "Product added to wishlist successfully.",
                "user_id": user_id,
                "product_id": product_id
            }), 201

        except Exception as e:

            return jsonify({
                "success": False,
                "message": "Failed to add product to wishlist.",
                "error": str(e)
            }), 500


    # =========================================================
    # WISHLIST API - REMOVE PRODUCT
    # =========================================================

    @app.route(
        "/api/wishlist/<int:user_id>/<int:product_id>",
        methods=["DELETE"]
    )
    def remove_from_wishlist(user_id, product_id):

        try:
            with get_db_connection() as connection:

                cursor = connection.cursor()

                cursor.execute("""
                    DELETE FROM wishlist_items
                    WHERE user_id = %s
                    AND product_id = %s
                """, (user_id, product_id))

                deleted_rows = cursor.rowcount

                connection.commit()

                cursor.close()

            if deleted_rows == 0:

                return jsonify({
                    "success": False,
                    "message": "Wishlist item not found."
                }), 404

            return jsonify({
                "success": True,
                "message": "Product removed from wishlist successfully."
            }), 200

        except Exception as e:

            return jsonify({
                "success": False,
                "message": "Failed to remove product from wishlist.",
                "error": str(e)
            }), 500

                # =========================================================
    # AUTH API - REGISTER
    # =========================================================

    @app.route("/api/register", methods=["POST"])
    def register_user():

        try:
            data = request.get_json(silent=True) or {}

            name = data.get("name", "").strip()
            email = data.get("email", "").strip().lower()
            mobile = data.get("mobile", "").strip()
            password = data.get("password", "")

            # Validate required fields
            if not name or not email or not mobile or not password:
                return jsonify({
                    "success": False,
                    "message": "All fields are required."
                }), 400

            if len(password) < 6:
                return jsonify({
                    "success": False,
                    "message": "Password must be at least 6 characters."
                }), 400

            with get_db_connection() as connection:

                cursor = connection.cursor(dictionary=True)

                # Check existing email or mobile
                cursor.execute("""
                    SELECT id, email, mobile
                    FROM users
                    WHERE email = %s OR mobile = %s
                """, (email, mobile))

                existing_user = cursor.fetchone()

                if existing_user:

                    cursor.close()

                    if existing_user["email"] == email:
                        message = "Email already registered."
                    else:
                        message = "Mobile number already registered."

                    return jsonify({
                        "success": False,
                        "message": message
                    }), 409

                # Password hashing
                from werkzeug.security import generate_password_hash

                password_hash = generate_password_hash(password)

                # Create user
                cursor.execute("""
                    INSERT INTO users
                        (name, email, mobile, password_hash)
                    VALUES
                        (%s, %s, %s, %s)
                """, (
                    name,
                    email,
                    mobile,
                    password_hash
                ))

                connection.commit()

                user_id = cursor.lastrowid

                cursor.close()

            return jsonify({
                "success": True,
                "message": "Account created successfully.",
                "user": {
                    "id": user_id,
                    "name": name,
                    "email": email,
                    "mobile": mobile
                }
            }), 201

        except Exception as e:

            return jsonify({
                "success": False,
                "message": "Failed to create account.",
                "error": str(e)
            }), 500


    # =========================================================
    # AUTH API - LOGIN
    # =========================================================

    @app.route("/api/login", methods=["POST"])
    def login_user():

        try:
            data = request.get_json(silent=True) or {}

            identifier = data.get("identifier", "").strip()
            password = data.get("password", "")

            if not identifier or not password:
                return jsonify({
                    "success": False,
                    "message": "Email/mobile and password are required."
                }), 400

            with get_db_connection() as connection:

                cursor = connection.cursor(dictionary=True)

                # Login using email OR mobile
                cursor.execute("""
                    SELECT
                        id,
                        name,
                        email,
                        mobile,
                        password_hash
                    FROM users
                    WHERE email = %s OR mobile = %s
                    LIMIT 1
                """, (identifier.lower(), identifier))

                user = cursor.fetchone()

                cursor.close()

            if user is None:

                return jsonify({
                    "success": False,
                    "message": "Invalid email/mobile or password."
                }), 401

            from werkzeug.security import check_password_hash

            if not check_password_hash(
                user["password_hash"],
                password
            ):

                return jsonify({
                    "success": False,
                    "message": "Invalid email/mobile or password."
                }), 401

            return jsonify({
                "success": True,
                "message": "Login successful.",
                "user": {
                    "id": user["id"],
                    "name": user["name"],
                    "email": user["email"],
                    "mobile": user["mobile"]
                }
            }), 200

        except Exception as e:

            return jsonify({
                "success": False,
                "message": "Login failed.",
                "error": str(e)
            }), 500


            # =========================================================
    # AUTH API - CHANGE PASSWORD
    # =========================================================

    @app.route("/api/change-password", methods=["PUT"])
    def change_password():

        try:
            data = request.get_json(silent=True) or {}

            user_id = data.get("user_id")
            current_password = data.get("current_password", "")
            new_password = data.get("new_password", "")

            # Validate required fields
            if not user_id or not current_password or not new_password:
                return jsonify({
                    "success": False,
                    "message": "All password fields are required."
                }), 400

            # Password length validation
            if len(new_password) < 6:
                return jsonify({
                    "success": False,
                    "message": "New password must be at least 6 characters."
                }), 400

            # Import password functions
            from werkzeug.security import (
                check_password_hash,
                generate_password_hash
            )

            with get_db_connection() as connection:

                cursor = connection.cursor(dictionary=True)

                # Get current password hash
                cursor.execute("""
                    SELECT id, password_hash
                    FROM users
                    WHERE id = %s
                    LIMIT 1
                """, (user_id,))

                user = cursor.fetchone()

                if user is None:

                    cursor.close()

                    return jsonify({
                        "success": False,
                        "message": "User not found."
                    }), 404

                # Check current password
                if not check_password_hash(
                    user["password_hash"],
                    current_password
                ):

                    cursor.close()

                    return jsonify({
                        "success": False,
                        "message": "Current password is incorrect."
                    }), 401

                # Prevent using the same password
                if check_password_hash(
                    user["password_hash"],
                    new_password
                ):

                    cursor.close()

                    return jsonify({
                        "success": False,
                        "message": "New password must be different from current password."
                    }), 400

                # Generate new password hash
                new_password_hash = generate_password_hash(
                    new_password
                )

                # Update password in MySQL
                cursor.execute("""
                    UPDATE users
                    SET password_hash = %s
                    WHERE id = %s
                """, (
                    new_password_hash,
                    user_id
                ))

                connection.commit()

                cursor.close()

            return jsonify({
                "success": True,
                "message": "Password changed successfully."
            }), 200

        except Exception as e:

            print("Change Password Error:", e)

            return jsonify({
                "success": False,
                "message": "Failed to change password.",
                "error": str(e)
            }), 500



    # ==========================================
    # PROFILE API - GET PROFILE
    # ==========================================

    @app.route("/api/profile/<int:user_id>", methods=["GET"])
    def get_profile(user_id):
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor(dictionary=True)

                cursor.execute("""
                    SELECT id, name, email, mobile, created_at
                    FROM users
                    WHERE id = %s
                """, (user_id,))

                user = cursor.fetchone()
                cursor.close()

                if not user:
                    return jsonify({
                        "success": False,
                        "message": "User not found"
                    }), 404

                return jsonify({
                    "success": True,
                    "user": user
                }), 200

        except Exception as e:
            return jsonify({
                "success": False,
                "message": str(e)
            }), 500


    # ==========================================
    # PROFILE API - UPDATE PROFILE
    # ==========================================

    @app.route("/api/profile/<int:user_id>", methods=["PUT"])
    def update_profile(user_id):
        try:
            data = request.get_json()

            name = data.get("name")
            email = data.get("email")
            mobile = data.get("mobile")

            if not name or not email or not mobile:
                return jsonify({
                    "success": False,
                    "message": "All fields are required"
                }), 400

            with get_db_connection() as conn:
                cursor = conn.cursor(dictionary=True)

                cursor.execute("""
                    SELECT id
                    FROM users
                    WHERE email = %s AND id != %s
                """, (email, user_id))

                existing_user = cursor.fetchone()

                if existing_user:
                    cursor.close()
                    return jsonify({
                        "success": False,
                        "message": "Email already exists"
                    }), 409

                cursor.execute("""
                    UPDATE users
                    SET name = %s,
                        email = %s,
                        mobile = %s
                    WHERE id = %s
                """, (name, email, mobile, user_id))

                conn.commit()

                cursor.execute("""
                    SELECT id, name, email, mobile, created_at
                    FROM users
                    WHERE id = %s
                """, (user_id,))

                updated_user = cursor.fetchone()
                cursor.close()

                return jsonify({
                    "success": True,
                    "message": "Profile updated successfully",
                    "user": updated_user
                }), 200

        except Exception as e:
            return jsonify({
                "success": False,
                "message": str(e)
            }), 500

            # ==========================================
    # ADDRESS API - GET ADDRESSES
    # ==========================================

    @app.route("/api/addresses/<int:user_id>", methods=["GET"])
    def get_addresses(user_id):
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor(dictionary=True)

                cursor.execute("""
                    SELECT
                        id,
                        user_id,
                        type,
                        name,
                        mobile,
                        address,
                        city,
                        state,
                        pincode,
                        is_default,
                        created_at
                    FROM user_addresses
                    WHERE user_id = %s
                    ORDER BY is_default DESC, id DESC
                """, (user_id,))

                addresses = cursor.fetchall()
                cursor.close()

                return jsonify({
                    "success": True,
                    "user_id": user_id,
                    "count": len(addresses),
                    "addresses": addresses
                }), 200

        except Exception as e:
            return jsonify({
                "success": False,
                "message": str(e)
            }), 500


    # ==========================================
    # ADDRESS API - ADD ADDRESS
    # ==========================================

    @app.route("/api/addresses", methods=["POST"])
    def add_address():
        try:
            data = request.get_json(silent=True) or {}

            user_id = data.get("user_id")
            address_type = data.get("type", "Home")
            name = data.get("name", "").strip()
            mobile = data.get("mobile", "").strip()
            address = data.get("address", "").strip()
            city = data.get("city", "").strip()
            state = data.get("state", "").strip()
            pincode = data.get("pincode", "").strip()
            is_default = bool(data.get("is_default", False))

            if not user_id or not name or not mobile or not address or not city or not state or not pincode:
                return jsonify({
                    "success": False,
                    "message": "All address fields are required."
                }), 400

            with get_db_connection() as conn:
                cursor = conn.cursor(dictionary=True)

                # If this address is default, remove default from old addresses
                if is_default:
                    cursor.execute("""
                        UPDATE user_addresses
                        SET is_default = 0
                        WHERE user_id = %s
                    """, (user_id,))

                cursor.execute("""
                    INSERT INTO user_addresses
                    (
                        user_id,
                        type,
                        name,
                        mobile,
                        address,
                        city,
                        state,
                        pincode,
                        is_default
                    )
                    VALUES
                    (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    user_id,
                    address_type,
                    name,
                    mobile,
                    address,
                    city,
                    state,
                    pincode,
                    1 if is_default else 0
                ))

                conn.commit()

                address_id = cursor.lastrowid

                cursor.execute("""
                    SELECT *
                    FROM user_addresses
                    WHERE id = %s
                """, (address_id,))

                new_address = cursor.fetchone()
                cursor.close()

                return jsonify({
                    "success": True,
                    "message": "Address added successfully.",
                    "address": new_address
                }), 201

        except Exception as e:
            return jsonify({
                "success": False,
                "message": str(e)
            }), 500


    # ==========================================
    # ADDRESS API - UPDATE ADDRESS
    # ==========================================

    @app.route("/api/addresses/<int:address_id>", methods=["PUT"])
    def update_address(address_id):
        try:
            data = request.get_json(silent=True) or {}

            user_id = data.get("user_id")
            address_type = data.get("type", "Home")
            name = data.get("name", "").strip()
            mobile = data.get("mobile", "").strip()
            address = data.get("address", "").strip()
            city = data.get("city", "").strip()
            state = data.get("state", "").strip()
            pincode = data.get("pincode", "").strip()
            is_default = bool(data.get("is_default", False))

            if not user_id or not name or not mobile or not address or not city or not state or not pincode:
                return jsonify({
                    "success": False,
                    "message": "All address fields are required."
                }), 400

            with get_db_connection() as conn:
                cursor = conn.cursor(dictionary=True)

                # Check address belongs to this user
                cursor.execute("""
                    SELECT id
                    FROM user_addresses
                    WHERE id = %s AND user_id = %s
                """, (address_id, user_id))

                existing = cursor.fetchone()

                if not existing:
                    cursor.close()
                    return jsonify({
                        "success": False,
                        "message": "Address not found."
                    }), 404

                # Remove default from other addresses
                if is_default:
                    cursor.execute("""
                        UPDATE user_addresses
                        SET is_default = 0
                        WHERE user_id = %s
                    """, (user_id,))

                cursor.execute("""
                    UPDATE user_addresses
                    SET type = %s,
                        name = %s,
                        mobile = %s,
                        address = %s,
                        city = %s,
                        state = %s,
                        pincode = %s,
                        is_default = %s
                    WHERE id = %s
                    AND user_id = %s
                """, (
                    address_type,
                    name,
                    mobile,
                    address,
                    city,
                    state,
                    pincode,
                    1 if is_default else 0,
                    address_id,
                    user_id
                ))

                conn.commit()

                cursor.execute("""
                    SELECT *
                    FROM user_addresses
                    WHERE id = %s
                """, (address_id,))

                updated_address = cursor.fetchone()
                cursor.close()

                return jsonify({
                    "success": True,
                    "message": "Address updated successfully.",
                    "address": updated_address
                }), 200

        except Exception as e:
            return jsonify({
                "success": False,
                "message": str(e)
            }), 500


    # ==========================================
    # ADDRESS API - DELETE ADDRESS
    # ==========================================

    @app.route("/api/addresses/<int:address_id>", methods=["DELETE"])
    def delete_address(address_id):
        try:
            user_id = request.args.get("user_id")

            if not user_id:
                return jsonify({
                    "success": False,
                    "message": "user_id is required."
                }), 400

            with get_db_connection() as conn:
                cursor = conn.cursor()

                cursor.execute("""
                    DELETE FROM user_addresses
                    WHERE id = %s AND user_id = %s
                """, (address_id, user_id))

                deleted_rows = cursor.rowcount

                conn.commit()
                cursor.close()

                if deleted_rows == 0:
                    return jsonify({
                        "success": False,
                        "message": "Address not found."
                    }), 404

                return jsonify({
                    "success": True,
                    "message": "Address deleted successfully."
                }), 200

        except Exception as e:
            return jsonify({
                "success": False,
                "message": str(e)
            }), 500


    # ==========================================
    # ADDRESS API - SET DEFAULT
    # ==========================================

    @app.route("/api/addresses/<int:address_id>/default", methods=["PUT"])
    def set_default_address(address_id):
        try:
            data = request.get_json(silent=True) or {}
            user_id = data.get("user_id")

            if not user_id:
                return jsonify({
                    "success": False,
                    "message": "user_id is required."
                }), 400

            with get_db_connection() as conn:
                cursor = conn.cursor(dictionary=True)

                # Check address belongs to user
                cursor.execute("""
                    SELECT id
                    FROM user_addresses
                    WHERE id = %s AND user_id = %s
                """, (address_id, user_id))

                existing = cursor.fetchone()

                if not existing:
                    cursor.close()
                    return jsonify({
                        "success": False,
                        "message": "Address not found."
                    }), 404

                # Remove default from all user's addresses
                cursor.execute("""
                    UPDATE user_addresses
                    SET is_default = 0
                    WHERE user_id = %s
                """, (user_id,))

                # Set selected address as default
                cursor.execute("""
                    UPDATE user_addresses
                    SET is_default = 1
                    WHERE id = %s AND user_id = %s
                """, (address_id, user_id))

                conn.commit()

                cursor.execute("""
                    SELECT *
                    FROM user_addresses
                    WHERE id = %s
                """, (address_id,))

                updated_address = cursor.fetchone()
                cursor.close()

                return jsonify({
                    "success": True,
                    "message": "Default address updated successfully.",
                    "address": updated_address
                }), 200

        except Exception as e:
            return jsonify({
                "success": False,
                "message": str(e)
            }), 500

# ============================================================
# ORDERS API
# ============================================================

    @app.route("/api/orders", methods=["POST"])
    def create_order():
        data = request.get_json() or {}

        user_id = data.get("user_id")
        items = data.get("items", [])
        address = data.get("address", {})
        payment_method = data.get("payment_method", "cod")

        if not user_id:
            return jsonify({
                "success": False,
                "message": "User ID is required."
            }), 400

        if not items:
            return jsonify({
                "success": False,
                "message": "Order items are required."
            }), 400

        required_address = [
            "name",
            "mobile",
            "address",
            "city",
            "state",
            "pincode"
        ]

        for field in required_address:
            if not address.get(field):
                return jsonify({
                    "success": False,
                    "message": f"{field} is required."
                }), 400

        allowed_payment_methods = ["cod", "upi", "card", "netbanking"]

        if payment_method not in allowed_payment_methods:
            return jsonify({
                "success": False,
                "message": "Invalid payment method."
            }), 400

        try:
            with get_db_connection() as connection:
                with connection.cursor(dictionary=True) as cursor:

                    # Check user
                    cursor.execute(
                        "SELECT id FROM users WHERE id = %s",
                        (user_id,)
                    )

                    user = cursor.fetchone()

                    if not user:
                        return jsonify({
                            "success": False,
                            "message": "User not found."
                        }), 404

                    # ----------------------------------------------------
                    # Get products from MySQL and calculate item totals
                    # ----------------------------------------------------

                    order_items = []

                    item_total = 0
                    mrp_total = 0

                    for item in items:

                        product_id = item.get("productId") or item.get("product_id")
                        quantity = int(
                            item.get("qty") or item.get("quantity") or 1
                        )

                        if not product_id or quantity <= 0:
                            return jsonify({
                                "success": False,
                                "message": "Invalid product or quantity."
                            }), 400

                        cursor.execute("""
                            SELECT id, name, price,original_price AS mrp
                            FROM products
                            WHERE id = %s
                        """, (product_id,))

                        product = cursor.fetchone()

                        if not product:
                            return jsonify({
                                "success": False,
                                "message": f"Product {product_id} not found."
                            }), 404

                        unit_price = float(product["price"])
                        mrp_price = float(
                            product["mrp"] or product["price"]
                        )

                        total_price = unit_price * quantity
                        mrp_item_total = mrp_price * quantity

                        item_total += total_price
                        mrp_total += mrp_item_total

                        order_items.append({
                            "product_id": product["id"],
                            "product_name": product["name"],
                            "unit_price": unit_price,
                            "quantity": quantity,
                            "total_price": total_price
                        })

                    # ----------------------------------------------------
                    # Calculate order totals
                    # ----------------------------------------------------

                    discount = max(mrp_total - item_total, 0)

                    delivery_charges = 0 if item_total >= 999 else 50

                    tax = round(item_total * 0.05, 2)

                    total_amount = round(
                        item_total + delivery_charges + tax,
                        2
                    )

                    # ----------------------------------------------------
                    # Generate Order ID
                    # ----------------------------------------------------

                    import uuid

                    order_id = "AK" + uuid.uuid4().hex[:16].upper()

                    # Expected delivery = 5 days
                    from datetime import datetime, timedelta

                    expected_delivery = (
                        datetime.now() + timedelta(days=5)
                    ).date()

                    # ----------------------------------------------------
                    # Create Order
                    # ----------------------------------------------------

                    cursor.execute("""
                        INSERT INTO orders (
                            id,
                            user_id,
                            status,
                            payment_method,
                            payment_status,
                            item_total,
                            mrp_total,
                            discount,
                            delivery_charges,
                            tax,
                            total_amount,
                            expected_delivery,
                            shipping_name,
                            shipping_mobile,
                            shipping_address,
                            shipping_city,
                            shipping_state,
                            shipping_pincode,
                            shipping_type
                        )
                        VALUES (
                            %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s,
                            %s, %s, %s, %s
                        )
                    """, (
                        order_id,
                        user_id,
                        "Order Placed",
                        payment_method,
                        "Pending (COD)"
                        if payment_method == "cod"
                        else "Pending",
                        item_total,
                        mrp_total,
                        discount,
                        delivery_charges,
                        tax,
                        total_amount,
                        expected_delivery,
                        address["name"],
                        address["mobile"],
                        address["address"],
                        address["city"],
                        address["state"],
                        address["pincode"],
                        address.get("type", "Home")
                    ))

                    # ----------------------------------------------------
                    # Insert Order Items
                    # ----------------------------------------------------

                    for item in order_items:

                        cursor.execute("""
                            INSERT INTO order_items (
                                order_id,
                                product_id,
                                product_name,
                                unit_price,
                                quantity,
                                total_price
                            )
                            VALUES (%s, %s, %s, %s, %s, %s)
                        """, (
                            order_id,
                            item["product_id"],
                            item["product_name"],
                            item["unit_price"],
                            item["quantity"],
                            item["total_price"]
                        ))

                    connection.commit()

                    return jsonify({
                        "success": True,
                        "message": "Order placed successfully.",
                        "order_id": order_id,
                        "order": {
                            "id": order_id,
                            "status": "Order Placed",
                            "payment_method": payment_method,
                            "payment_status":
                                "Pending (COD)"
                                if payment_method == "cod"
                                else "Pending",
                            "item_total": item_total,
                            "mrp_total": mrp_total,
                            "discount": discount,
                            "delivery_charges": delivery_charges,
                            "tax": tax,
                            "total_amount": total_amount,
                            "expected_delivery":
                                expected_delivery.isoformat()
                        }
                    }), 201

        except Exception as e:

            print("Create Order Error:", e)

            return jsonify({
                "success": False,
                "message": "Failed to create order.",
                "error": str(e)
            }), 500


        # =============================================================
# GET USER ORDERS
# =============================================================

    @app.route("/api/orders/<int:user_id>", methods=["GET"])
    def get_user_orders(user_id):

        try:
            with get_db_connection() as connection:
                with connection.cursor(dictionary=True) as cursor:

                    cursor.execute("""
                        SELECT
                            id,
                            user_id,
                            order_date,
                            status,
                            payment_method,
                            payment_status,
                            item_total,
                            mrp_total,
                            discount,
                            delivery_charges,
                            tax,
                            total_amount,
                            expected_delivery,
                            shipping_name,
                            shipping_mobile,
                            shipping_address,
                            shipping_city,
                            shipping_state,
                            shipping_pincode,
                            shipping_type
                        FROM orders
                        WHERE user_id = %s
                        ORDER BY order_date DESC
                    """, (user_id,))

                    orders = cursor.fetchall()

                    return jsonify({
                        "success": True,
                        "count": len(orders),
                        "orders": orders
                    }), 200

        except Exception as e:

            print("Get Orders Error:", e)

            return jsonify({
                "success": False,
                "message": "Failed to fetch orders.",
                "error": str(e)
            }), 500
    @app.route("/api/orders/<order_id>/<int:user_id>", methods=["GET"])
    def get_order_details(order_id, user_id):
        try:
            with get_db_connection() as connection:
                with connection.cursor(dictionary=True) as cursor:

                    # Get order
                    cursor.execute("""
                        SELECT *
                        FROM orders
                        WHERE id = %s AND user_id = %s
                    """, (order_id, user_id))

                    order = cursor.fetchone()

                    if not order:
                        return jsonify({
                            "success": False,
                            "message": "Order not found."
                        }), 404

                    # Get order items
                    cursor.execute("""
                        SELECT
                            id,
                            product_id,
                            product_name,
                            unit_price,
                            quantity,
                            total_price
                        FROM order_items
                        WHERE order_id = %s
                    """, (order_id,))

                    items = cursor.fetchall()

                    order["items"] = items

                    return jsonify({
                        "success": True,
                        "order": order
                    }), 200

        except Exception as e:
            print("Get Order Details Error:", e)

            return jsonify({
                "success": False,
                "message": "Failed to fetch order details.",
                "error": str(e)
            }), 500

            # =========================================================
    # ORDERS API - CANCEL ORDER
    # =========================================================

    @app.route("/api/orders/<order_id>/cancel", methods=["PUT"])
    def cancel_order(order_id):

        try:
            data = request.get_json(silent=True) or {}

            user_id = data.get("user_id")

            if not user_id:
                return jsonify({
                    "success": False,
                    "message": "user_id is required."
                }), 400

            with get_db_connection() as connection:
                with connection.cursor(dictionary=True) as cursor:

                    # Check order belongs to this user
                    cursor.execute("""
                        SELECT id, status
                        FROM orders
                        WHERE id = %s
                        AND user_id = %s
                    """, (order_id, user_id))

                    order = cursor.fetchone()

                    if not order:
                        return jsonify({
                            "success": False,
                            "message": "Order not found."
                        }), 404

                    # Allow cancellation only before shipping
                    if order["status"] not in [
                        "Order Placed",
                        "Confirmed"
                    ]:
                        return jsonify({
                            "success": False,
                            "message": "This order cannot be cancelled now."
                        }), 400

                    # Cancel order
                    cursor.execute("""
                        UPDATE orders
                        SET status = 'Cancelled'
                        WHERE id = %s
                        AND user_id = %s
                    """, (order_id, user_id))

                    connection.commit()

            return jsonify({
                "success": True,
                "message": "Order cancelled successfully.",
                "order_id": order_id,
                "status": "Cancelled"
            }), 200

        except Exception as e:

            print("Cancel Order Error:", e)

            return jsonify({
                "success": False,
                "message": "Failed to cancel order.",
                "error": str(e)
            }), 500

    return app

# =============================================================
# APPLICATION INSTANCE
# =============================================================

app = create_app()


# =============================================================
# RUN FLASK SERVER
# =============================================================

if __name__ == "__main__":

    print("=" * 65)
    print("Starting AgriKart Flask Backend on http://127.0.0.1:5000")
    print("Health Check: http://127.0.0.1:5000/api/health")
    print("Products API: http://127.0.0.1:5000/api/products")
    print("Cart API: http://127.0.0.1:5000/api/cart/<user_id>")
    print("=" * 65)

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=Config.DEBUG
    )