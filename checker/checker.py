
import io
import calendar
from contextlib import redirect_stdout

TASKS = {
    "week01_ex01a": {"description": 'Display: This is my second Python program',
                     "expected_output": "This is my second Python program",
                     "allowed_concepts": "print()"},
    "week01_ex01b": {"description": 'Display the words of "This is my second Python program" with each word on a separate line.',
                     "expected_output": "This\nis\nmy\nsecond\nPython\nprogram",
                     "allowed_concepts": "print()"},
    "week01_ex01c": {"description": 'Display the words of "This is my second Python program" in separate columns.',
                     "expected_output": None,
                     "allowed_concepts": "print(), sep, escape sequences"},
    "week01_ex01d": {"description": 'Display the words of "This is my second Python program" using "-" as the separator.',
                     "expected_output": "This-is-my-second-Python-program",
                     "allowed_concepts": "print() and sep"},
    "week01_ex02a": {"description": 'Introduce yourself on one line in the required format with Name, Neptun-code and Age.',
                     "expected_output": None,
                     "allowed_concepts": "print(), strings, quotation marks"},
    "week01_ex02b": {"description": 'Display the introduction on multiple lines with the heading "Introduction", then Name, Neptun-code and Age.',
                     "expected_output": None,
                     "allowed_concepts": "print(), strings, newline escape sequence"},
    "week01_ex03a": {"description": 'Display: 2*1000 + 2*10 + 1*3 = 2023',
                     "expected_output": "2*1000 + 2*10 + 1*3 = 2023",
                     "allowed_concepts": "print(), arithmetic expressions"},
    "week01_ex03b": {"description": 'Display the equation 4x + 2 = 14 and its solution x = 3.',
                     "expected_output": None,
                     "allowed_concepts": "print(), arithmetic expressions"},
    "week01_ex03c": {"description": 'Calculate and display the number of seconds in one week. The result must be 604800.',
                     "expected_output": "604800",
                     "allowed_concepts": "print(), arithmetic expressions"},
    "week01_ex04": {"description": 'Display the multiplication table of 7 from 1 to 10, using lines such as "1 * 7 = 7", arranged in 5 columns.',
                    "expected_output": None,
                    "allowed_concepts": "print(), arithmetic expressions, sep, end, escape sequences"},
    "week01_ex05": {"description": 'Display the calendar for November 2023 with Monday as the first day of the week.',
                    "expected_output": None,
                    "allowed_concepts": "print(), strings, spacing and line breaks"},
}

def _normalise(text):
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    return "\n".join(line.rstrip() for line in text.strip().split("\n"))

def _run_code(student_code):
    output = io.StringIO()
    try:
        ns = {}
        with redirect_stdout(output):
            exec(student_code, ns, ns)
        return output.getvalue(), None
    except Exception as exc:
        return output.getvalue(), f"{type(exc).__name__}: {exc}"

def _special_check(task_id, actual_output):
    norm = _normalise(actual_output)

    if task_id == "week01_ex03b":
        compact = norm.replace(" ", "").lower()
        return ("4x+2=14" in compact) and ("x=3" in compact)

    if task_id == "week01_ex04":
        compact = norm.replace(" ", "")
        required = [f"{i}*7={i*7}" for i in range(1, 11)]
        return all(item in compact for item in required)

    if task_id == "week01_ex05":
        expected = calendar.TextCalendar(firstweekday=0).formatmonth(2023, 11)
        return norm.split() == _normalise(expected).split()

    return None

def _ai_feedback(task, student_code, actual_output, error):
    try:
        from google.colab import ai
    except Exception:
        return "AI feedback is available only in Google Colab."

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

    expected = task.get("expected_output")
    if expected is not None:
        if _normalise(actual_output) == _normalise(expected):
            print("✅ Correct!")
            return True
        print("⚠️ Not quite yet.")
        print("🤖 Hint:", _ai_feedback(task, student_code, actual_output, None))
        return False

    special = _special_check(task_id, actual_output)
    if special is True:
        print("✅ Correct!")
        return True
    if special is False:
        print("⚠️ Not quite yet.")
        print("🤖 Hint:", _ai_feedback(task, student_code, actual_output, None))
        return False

    print("🤖 Feedback:")
    print(_ai_feedback(task, student_code, actual_output, None))
    return False

def _find_previous_student_cell():
    shell = get_ipython()
    history = shell.history_manager.input_hist_raw
    for cell in reversed(history[1:]):
        stripped = cell.strip()
        if not stripped:
            continue
        if "check_previous_cell(" in stripped or "check_button(" in stripped:
            continue
        if "from checker" in stripped or "import checker" in stripped:
            continue
        return cell
    raise RuntimeError("No previous student code cell was found.")

def check_previous_cell(task_id):
    return check_solution(task_id, _find_previous_student_cell())

def check_button(task_id, label="Check my solution"):
    import ipywidgets as widgets
    from IPython.display import display

    button = widgets.Button(description=label, button_style="primary", tooltip="Check your solution")
    output = widgets.Output()

    def on_click(_):
        with output:
            output.clear_output()
            check_previous_cell(task_id)

    button.on_click(on_click)
    display(button, output)
