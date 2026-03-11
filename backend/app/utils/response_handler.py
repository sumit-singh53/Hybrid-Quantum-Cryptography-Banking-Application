"""
Response Handler Utility
------------------------
Standard API response structure
"""

from flask import jsonify


def success_response(data=None, message="Success", status_code=200):
    response = {"success": True, "message": message, "data": data}
    return jsonify(response), status_code


def error_response(message="Error", status_code=400, errors=None):
    response = {"success": False, "message": message, "errors": errors}
    return jsonify(response), status_code
