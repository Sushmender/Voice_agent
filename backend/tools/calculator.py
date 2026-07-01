"""
backend/tools/calculator.py
----------------------------
Safe mathematical calculator tool.

Uses Python's ast module to parse expressions without using eval(),
preventing code injection attacks.

Example usage:
    result = calculate("13 * 19")   # Returns "247"
    result = calculate("sqrt(144)") # Returns "12.0"
"""
import ast
import math
import logging
import operator
from typing import Union

logger = logging.getLogger(__name__)

# Allowed operations and functions
SAFE_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}

SAFE_FUNCTIONS = {
    "sqrt": math.sqrt,
    "abs": abs,
    "round": round,
    "floor": math.floor,
    "ceil": math.ceil,
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "log": math.log,
    "log10": math.log10,
    "exp": math.exp,
    "pi": math.pi,
    "e": math.e,
}


def _safe_eval(node: ast.AST) -> Union[int, float]:
    """Recursively evaluate an AST node using only safe operations."""
    if isinstance(node, ast.Constant):
        if isinstance(node.value, (int, float)):
            return node.value
        raise ValueError(f"Unsupported constant type: {type(node.value)}")

    elif isinstance(node, ast.Name):
        if node.id in SAFE_FUNCTIONS:
            return SAFE_FUNCTIONS[node.id]
        raise ValueError(f"Unknown name: '{node.id}'")

    elif isinstance(node, ast.BinOp):
        op_type = type(node.op)
        if op_type not in SAFE_OPERATORS:
            raise ValueError(f"Unsupported operator: {op_type.__name__}")
        left = _safe_eval(node.left)
        right = _safe_eval(node.right)
        return SAFE_OPERATORS[op_type](left, right)

    elif isinstance(node, ast.UnaryOp):
        op_type = type(node.op)
        if op_type not in SAFE_OPERATORS:
            raise ValueError(f"Unsupported unary operator: {op_type.__name__}")
        operand = _safe_eval(node.operand)
        return SAFE_OPERATORS[op_type](operand)

    elif isinstance(node, ast.Call):
        func = _safe_eval(node.func)
        if not callable(func):
            raise ValueError("Only mathematical functions are allowed")
        args = [_safe_eval(arg) for arg in node.args]
        return func(*args)

    else:
        raise ValueError(f"Unsupported AST node: {type(node).__name__}")


def calculate(expression: str) -> str:
    """
    Safely evaluate a mathematical expression.

    Supports: +, -, *, /, //, %, **, sqrt, abs, round, floor, ceil,
              sin, cos, tan, log, log10, exp, pi, e

    Args:
        expression: Math expression as a string (e.g., "13 * 19", "sqrt(144)").

    Returns:
        Human-readable result string suitable for TTS.
        e.g., "13 times 19 equals 247."
    """
    expression = expression.strip()
    logger.info(f"[Calculator] Evaluating: '{expression}'")

    try:
        # Parse the expression into an AST
        tree = ast.parse(expression, mode="eval")
        result = _safe_eval(tree.body)

        # Format result (integer if whole number, float otherwise)
        if isinstance(result, float) and result.is_integer():
            formatted = str(int(result))
        elif isinstance(result, float):
            formatted = f"{result:.6g}"  # up to 6 significant digits
        else:
            formatted = str(result)

        response = f"The result of {expression} is {formatted}."
        logger.info(f"[Calculator] Result: {formatted}")
        return response

    except ZeroDivisionError:
        return "I can't divide by zero."
    except ValueError as e:
        return f"I couldn't calculate that. {str(e)}"
    except SyntaxError:
        return f"That doesn't look like a valid mathematical expression: '{expression}'"
    except Exception as e:
        logger.error(f"[Calculator] Unexpected error: {e}")
        return "I encountered an error while calculating that."
