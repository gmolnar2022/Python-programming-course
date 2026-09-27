"""
Jupyter-only checker for Week 3 of the Python Programming course.

This file is intentionally separate from checker.py so the existing
Google Colab workflow remains unchanged.
"""

import ast
import builtins
import io
import math
import re
from contextlib import redirect_stdout
from IPython import get_ipython


TASKS = {
    "week03_ex01": {
        "tests": [
            (["8"], {"words": ["positive"]}),
            (["-3"], {"words": ["negative"]}),
        ],
        "hint": "Check the condition that separates positive and negative values."
    },
    "week03_ex02": {
        "tests": [
            (["23.4", "11.2"], {"numbers": [23.4]}),
            (["-2.5", "4.75"], {"numbers": [4.75]}),
        ],
        "hint": "Compare the two numbers and print the larger value."
    },
    "week03_ex03": {
        "tests": [
            (["1", "-5", "6"], {"roots": [2.0, 3.0]}),
            (["1", "0", "1"], {"words_any": ["no real", "no real solution"]}),
        ],
        "hint": "Calculate the discriminant first. If it is negative, there are no real roots."
    },
    "week03_ex04": {
        "tests": [
            (["14", "22", "11"], {"numbers": [22]}),
            (["9", "3", "5"], {"numbers": [9]}),
            (["2", "4", "8"], {"numbers": [8]}),
        ],
        "hint": "Make sure the program can identify the largest value regardless of its position."
    },
    "week03_ex05": {
        "tests": [
            (["Anna", "70", "60", "80"], {"words": ["anna", "passed"]}),
            (["Ben", "90", "35", "90"], {"words": ["ben", "failed"]}),
            (["Cara", "45", "45", "45"], {"words": ["cara", "failed"]}),
        ],
        "hint": "Passing requires both an overall percentage of at least 50 and every mark to be at least 40."
    },
    "week03_ex06": {
        "tests": [
            (["31"], {"words": ["hot"]}),
            (["30"], {"words": ["normal"]}),
            (["10"], {"words": ["normal"]}),
            (["5"], {"words": ["cold"]}),
            (["0"], {"words": ["cold"]}),
            (["-1"], {"words": ["freezing"]}),
        ],
        "hint": "Check the boundary values carefully: 30, 10 and 0 belong to specific categories."
    },
}


def _run_code(student_code, inputs):
    values = iter(inputs)
    output = io.StringIO()
    original_input = builtins.input

    def fake_input(prompt=""):
        try:
            return next(values)
        except StopIteration:
            raise RuntimeError("The program requested more input values than expected.")

    try:
        builtins.input = fake_input
        namespace = {}
        with redirect_stdout(output):
            exec(student_code, namespace, namespace)
        return output.getvalue(), None
    except Exception as exc:
        return output.getvalue(), f"{type(exc).__name__}: {exc}"
    finally:
        builtins.input = original_input


def _numbers(text):
    return [float(x) for x in re.findall(r"[-+]?(?:\d+(?:\.\d*)?|\.\d+)", text)]


def _contains_number(output, expected, tol=1e-7):
    return any(math.isclose(n, float(expected), rel_tol=tol, abs_tol=tol)
               for n in _numbers(output))


def _check_expected(output, expected):
    low = output.lower()

    if "words" in expected:
        if not all(word.lower() in low for word in expected["words"]):
            return False

    if "words_any" in expected:
        if not any(word.lower() in low for word in expected["words_any"]):
            return False

    if "numbers" in expected:
        if not all(_contains_number(output, n) for n in expected["numbers"]):
            return False

    if "roots" in expected:
        if not all(_contains_number(output, n) for n in expected["roots"]):
            return False

    return True


def _structure_ok(task_id, student_code):
    """Very light structural checks; no stylistic restrictions."""
    try:
        tree = ast.parse(student_code)
    except SyntaxError:
        return False

    has_input = any(
        isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == "input"
        for n in ast.walk(tree)
    )
    has_if = any(isinstance(n, ast.If) for n in ast.walk(tree))
    has_print = any(
        isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == "print"
        for n in ast.walk(tree)
    )
    return has_input and has_if and has_print


def check_solution(task_id, student_code):
    if task_id not in TASKS:
        raise ValueError(f"Unknown task id: {task_id}")

    task = TASKS[task_id]

    try:
        compile(student_code, "<student-code>", "exec")
    except SyntaxError as exc:
        print(f"❌ Syntax error: {exc.msg} (line {exc.lineno})")
        return False

    if not _structure_ok(task_id, student_code):
        print("⚠️ Not quite yet.")
        print("Hint: Use input(), a conditional statement, and print() as required by this exercise.")
        return False

    passed = 0
    total = len(task["tests"])

    for inputs, expected in task["tests"]:
        output, error = _run_code(student_code, inputs)

        if error:
            print("❌ Your program produced an error during testing.")
            print("Hint:", error)
            return False

        if _check_expected(output, expected):
            passed += 1

    if passed == total:
        print(f"✅ Correct! ({passed}/{total} tests passed)")
        return True

    print(f"⚠️ Not quite yet. ({passed}/{total} tests passed)")
    print("Hint:", task["hint"])
    return False


def _find_previous_student_cell():
    """
    Find the most recent executed student code cell.
    Checker/setup cells are skipped.
    """
    shell = get_ipython()
    if shell is None:
        raise RuntimeError("This checker must be run inside Jupyter.")

    history = shell.history_manager.input_hist_raw

    for cell in reversed(history[1:]):
        stripped = cell.strip()
        if not stripped:
            continue
        if "check_previous_cell(" in stripped or re.search(r"\bcheck\(", stripped):
            continue
        if "checker_jupyter" in stripped:
            continue
        if "urlretrieve" in stripped and "checker" in stripped:
            continue
        return cell

    raise RuntimeError("No previous student code cell was found.")


def check_previous_cell(task_id):
    return check_solution(task_id, _find_previous_student_cell())
