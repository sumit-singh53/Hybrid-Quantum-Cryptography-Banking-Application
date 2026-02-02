"""
Validators Utility
------------------
Common input validation helpers
"""


def validate_required_fields(data: dict, required_fields: list):
    """
    Check if required fields are present and non-empty
    """
    missing = []

    for field in required_fields:
        if field not in data or data[field] in ("", None):
            missing.append(field)

    if missing:
        return False, f"Missing required fields: {', '.join(missing)}"

    return True, None


def validate_amount(amount):
    """
    Validate transaction amount
    """
    try:
        amount = float(amount)
    except (TypeError, ValueError):
        return False, "Amount must be a number"

    if amount <= 0:
        return False, "Amount must be greater than zero"

    return True, None


def validate_file_extension(filename, allowed_extensions):
    """
    Validate uploaded file extension
    """
    if "." not in filename:
        return False

    ext = filename.rsplit(".", 1)[1].lower()
    return ext in allowed_extensions
