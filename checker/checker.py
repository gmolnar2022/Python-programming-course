"""
Simple solution checker for the Python Programming course.

Designed for Google Colab.
- Runs the student's code.
- Compares standard output with the expected result when possible.
- Uses Colab AI only when the deterministic check fails.
- Does not reveal a full reference solution in the feedback.
"""

import io
from contextlib import redirect_stdout

TASKS = {
    "week01_ex01a": {
        "description": 'Display the sentence "This is my second Python program".',
        "expected_output": "This is my second Python program",
        "allowed_concepts": "print()",
    },
    "week01_ex01b": {
        "description": 'Display the words of "This is my second Python program" with each word on a separate line.',
        "expected_output": "This\nis\nmy\nsecond\nPython\nprogram",
        "allowed_concepts": "print()",
    },
    "week01_ex01c": {
        "description": 'Display the words of "This is my second Python program" in separate columns.',
        "expected_output": None,
        "allowed_concepts": "print()",
    },
    "week01_ex01d": {
        "description": 'Display the words of "This is my second Python program" using "-" as the separator.',
        "expected_output": "This-is-my-second-Python-program",
        "allowed_concepts": "print() with the sep parameter",
    },
}

def _normalise(text):
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = [line.rstrip() for line in text.strip().split("\n")]
    return "\n".join(lines)

def _run_code(student_code):
    output = io.StringIO()
    try:
        namespace = {}
        with redirect_stdout(output):
            exec(student_code, namespace, namespace)
        return output.getvalue(), None
    except Exception as exc:
        return output.getvalue(), f"{type(exc).__name__}: {exc}"

def _ai_feedback(task, student_code, actual_output, error):
    try:
        from google.colab import ai
    except Exception:
        return (
            "AI feedback is available only in Google Colab. "
            "Please check your output and try again."
        )

    prompt = f"""
You are a programming tutor for first-year university students.

TASK:
{task['description']}

CONCEPTS COVERED SO FAR:
{task['allowed_concepts']}

STUDENT CODE:
```python
{student_code}
```

PROGRAM OUTPUT:
```text
{actual_output}
```

RUNTIME ERROR:
{error if error else "None"}

Rules:
- Do not provide a complete solution.
- Do not rewrite the student's whole program.
- Give only a short, useful hint.
- Do not introduce Python concepts that have not been covered yet.
- Keep the feedback to at most three short sentences.
- Use clear English.
"""
    try:
        response = ai.generate_text(prompt)
        if isinstance(response, str):
            return response.strip()
        text = getattr(response, "text", None)
        return str(text if text else response).strip()
    except Exception as exc:
        return (
            "The automatic check found a problem, but AI feedback "
            f"is temporarily unavailable ({type(exc).__name__})."
        )

def check_solution(task_id, student_code):
    if task_id not in TASKS:
        raise ValueError(f"Unknown task id: {task_id}")

    task = TASKS[task_id]
    actual_output, error = _run_code(student_code)

    if error:
        print("❌ Your program produced an error.")
        print("🤖 Hint:", _ai_feedback(task, student_code, actual_output, error))
        return False

    expected = task.get("expected_output")

    if expected is not None and _normalise(actual_output) == _normalise(expected):
        print("✅ Correct!")
        return True

    print("⚠️ Not quite yet.")
    print("🤖 Hint:", _ai_feedback(task, student_code, actual_output, None))
    return False

def _find_previous_student_cell():
    try:
        shell = get_ipython()
        history = shell.history_manager.input_hist_raw
    except Exception as exc:
        raise RuntimeError(
            "Could not access notebook history. "
            "Use check_solution(task_id, student_code) instead."
        ) from exc

    for cell in reversed(history[1:]):
        stripped = cell.strip()
        if not stripped:
            continue
        if "check_previous_cell(" in stripped:
            continue
        if "from checker" in stripped:
            continue
        if "import checker" in stripped:
            continue
        return cell

    raise RuntimeError("No previous student code cell was found.")

def check_previous_cell(task_id):
    student_code = _find_previous_student_cell()
    return check_solution(task_id, student_code)
