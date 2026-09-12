"""
Week 1 solution checker for the Python Programming course.

Designed for Google Colab.
One task ID corresponds to one whole exercise.
"""

import io
import calendar
from contextlib import redirect_stdout
from IPython import get_ipython

TASKS = {
    "week01_ex01": {
        "description": """
Display "This is my second Python program" in three different ways:
1. each word on a new line,
2. each word in a separate column,
3. using "-" as the separator between words.
""",
        "allowed_concepts": "print(), sep, end, escape sequences",
        "mode": "ai",
    },

    "week01_ex02": {
        "description": """
Introduce yourself in two formats:
1. one line containing Name, Neptun-code and Age,
2. a multi-line introduction headed by "Introduction", followed by
   Name, Neptun-code and Age.
The student's own personal values may differ from the example.
""",
        "allowed_concepts": "print(), strings, quotation marks, escape sequences",
        "mode": "ai",
    },

    "week01_ex03": {
        "description": """
Display these three results:
1. 2*1000 + 2*10 + 1*3 = 2023
2. The solution of 4x + 2 = 14 is x = 3
3. The number of seconds in a week is 604800.
The number of seconds must be calculated in the program.
""",
        "allowed_concepts": "print(), arithmetic expressions",
        "mode": "special",
    },

    "week01_ex04": {
        "description": """
Print the multiplication table of 7 from 1 to 10.
Use entries such as "1 * 7 = 7" and arrange all values in 5 columns.
""",
        "allowed_concepts": "print(), arithmetic expressions, sep, end, escape sequences",
        "mode": "special",
    },

    "week01_ex05": {
        "description": """
Display the calendar for November 2023 with Monday as the first day
of the week, matching the layout shown in the exercise.
""",
        "allowed_concepts": "print(), strings, spacing and line breaks",
        "mode": "special",
    },
}


def _normalise(text):
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    return "\n".join(line.rstrip() for line in text.strip().split("\n"))


def _run_code(student_code):
    output = io.StringIO()
    try:
        namespace = {}
        with redirect_stdout(output):
            exec(student_code, namespace, namespace)
        return output.getvalue(), None
    except Exception as exc:
        return output.getvalue(), f"{type(exc).__name__}: {exc}"


def _special_check(task_id, student_code, actual_output):
    norm = _normalise(actual_output)
    compact = norm.replace(" ", "").lower()

    if task_id == "week01_ex03":
        has_first = "2*1000+2*10+1*3=2023" in compact
        has_equation = "4x+2=14" in compact and "x=3" in compact
        has_seconds = "604800" in compact
        # Require evidence of a calculation rather than only printing the literal result.
        code_compact = student_code.replace(" ", "")
        calculated_seconds = any(
            expr in code_compact
            for expr in ("7*24*60*60", "60*60*24*7", "24*60*60*7")
        )
        return has_first and has_equation and has_seconds and calculated_seconds

    if task_id == "week01_ex04":
        # Verify all ten multiplication facts. Layout is intentionally flexible.
        required = [f"{i}*7={i*7}" for i in range(1, 11)]
        return all(item in compact for item in required)

    if task_id == "week01_ex05":
        expected = calendar.TextCalendar(firstweekday=0).formatmonth(2023, 11)
        # Ignore spacing differences but preserve meaningful token order.
        return norm.split() == _normalise(expected).split()

    return None


def _ai_feedback(task, student_code, actual_output, error=None):
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

Evaluate the complete exercise.

Rules:
- Start with exactly one of these:
  CORRECT
  PARTIALLY CORRECT
  INCORRECT
- Do not provide a complete solution.
- Do not rewrite the student's program.
- If there is a problem, give only a short and useful hint.
- Do not introduce Python concepts that have not been covered yet.
- Keep the whole response to at most four short sentences.
- Use clear English.
"""

    try:
        response = ai.generate_text(prompt)
        if isinstance(response, str):
            return response.strip()
        text = getattr(response, "text", None)
        return str(text if text else response).strip()
    except Exception as exc:
        return f"AI feedback is temporarily unavailable ({type(exc).__name__})."


def check_solution(task_id, student_code):
    if task_id not in TASKS:
        raise ValueError(f"Unknown task id: {task_id}")

    task = TASKS[task_id]
    actual_output, error = _run_code(student_code)

    if error:
        print("❌ Your program produced an error.")
        print("🤖 Hint:", _ai_feedback(task, student_code, actual_output, error))
        return False

    if task["mode"] == "special":
        result = _special_check(task_id, student_code, actual_output)

        if result is True:
            print("✅ Correct!")
            return True

        print("⚠️ Not quite yet.")
        print("🤖 Hint:", _ai_feedback(task, student_code, actual_output))
        return False

    # Flexible exercises are judged by Colab AI.
    feedback = _ai_feedback(task, student_code, actual_output)
    print("🤖 Feedback:")
    print(feedback)
    return feedback.lstrip().upper().startswith("CORRECT")


def _find_previous_student_cell():
    """
    Find the most recent executed student code cell.
    The checker/button/setup cells are skipped.
    """
    try:
        shell = get_ipython()
        history = shell.history_manager.input_hist_raw
    except Exception as exc:
        raise RuntimeError(
            "Could not access notebook history."
        ) from exc

    for cell in reversed(history[1:]):
        stripped = cell.strip()

        if not stripped:
            continue
        if "check_previous_cell(" in stripped or "check_button(" in stripped:
            continue
        if "from checker" in stripped or "import checker" in stripped:
            continue
        if "wget" in stripped and "checker.py" in stripped:
            continue

        return cell

    raise RuntimeError("No previous student code cell was found.")


def check_previous_cell(task_id):
    return check_solution(task_id, _find_previous_student_cell())


def check_button(task_id, label="Check my solution"):
    import ipywidgets as widgets
    from IPython.display import display

    button = widgets.Button(
        description=label,
        button_style="primary",
        tooltip="Check your solution",
    )
    output = widgets.Output()

    def on_click(_):
        with output:
            output.clear_output()
            check_previous_cell(task_id)

    button.on_click(on_click)
    display(button, output)
