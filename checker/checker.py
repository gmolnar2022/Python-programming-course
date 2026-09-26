"""
Week 1 solution checker for the Python Programming course.

Designed for Google Colab.
One task ID corresponds to one whole exercise.
"""

import io
import calendar
import re
from contextlib import redirect_stdout
from unittest.mock import patch
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

    # Week 2
    "week02_ex01": {"description": "Read two integers and display their sum, difference, product, quotient, remainder, the first number increased by 1, and the second number decreased by 1.", "allowed_concepts": "variables, int(), input(), arithmetic operators, print(), f-strings", "mode": "numeric", "tests": [(["10","3"], [13,7,30,10/3,1,11,2]), (["20","4"], [24,16,80,5,0,21,3])]},
    "week02_ex02": {"description": "Solve a linear equation a*x + b = 0 using coefficients entered by the user.", "allowed_concepts": "variables, input(), type conversion, arithmetic operators, print(), f-strings", "mode": "numeric", "tests": [(["2","-8"], [4]), (["5","10"], [-2])]},
    "week02_ex03": {"description": "Read three floating-point cuboid edges and display its volume and surface area.", "allowed_concepts": "variables, float(), input(), arithmetic operators, print(), f-strings", "mode": "numeric", "tests": [(["2","3","4"], [24,52]), (["1.5","2","3"], [9,21])]},
    "week02_ex04": {"description": "Read a laptop's net price and tax rate and display its gross price. The tax rate is entered as a percentage.", "allowed_concepts": "variables, input(), type conversion, arithmetic operators, print(), f-strings", "mode": "numeric", "tests": [(["100","27"], [127]), (["800","25"], [1000])]},
    "week02_ex05": {"description": "Read five grades one by one and display their average.", "allowed_concepts": "variables, input(), type conversion, arithmetic operators, print(), f-strings", "mode": "numeric", "tests": [(["1","2","3","4","5"], [3]), (["5","5","4","4","3"], [4.2])]},
    "week02_ex06": {"description": "Read an initial amount and an annual interest rate and calculate the ending amount after 5 years using compound interest.", "allowed_concepts": "variables, input(), type conversion, arithmetic operators including **, print(), f-strings", "mode": "numeric", "tests": [(["1000","10"], [1610.51]), (["2000","5"], [2552.56])]},
    "week02_ex07": {"description": "Convert an amount in US dollars to euros and Hungarian forints using 1 USD = 0.93 EUR and 1 USD = 354.15 HUF.", "allowed_concepts": "variables, constants, input(), type conversion, arithmetic operators, print(), f-strings", "mode": "numeric", "tests": [(["100"], [93,35415]), (["50"], [46.5,17707.5])]},

    # Week 3
    "week03_ex01": {"description":"Read a non-zero integer and display whether it is positive or negative.","allowed_concepts":"variables, input(), type conversion, comparison operators, if, else, print(), f-strings","mode":"io","tests":[{"inputs":["8"],"words":["positive"]},{"inputs":["-3"],"words":["negative"]}]},
    "week03_ex02": {"description":"Read two different floating-point numbers and display the larger one.","allowed_concepts":"variables, float(), input(), comparison operators, if, else, print(), f-strings","mode":"io","tests":[{"inputs":["23.4","11.2"],"numbers":[23.4]},{"inputs":["-2.5","4.75"],"numbers":[4.75]}]},
    "week03_ex03": {"description":"Solve ax**2 + bx + c = 0. If the discriminant is negative, report no real solution; otherwise display both real roots.","allowed_concepts":"variables, float(), input(), arithmetic, comparison operators, if, else, **, print(), f-strings","mode":"quadratic","tests":[{"inputs":["1","-5","6"],"roots":[2.0,3.0]},{"inputs":["1","0","1"],"no_real":True}]},
    "week03_ex04": {"description":"Read three integers and display the largest one.","allowed_concepts":"variables, int(), input(), comparison and logical operators, if, elif, else, print(), f-strings","mode":"io","tests":[{"inputs":["14","22","11"],"numbers":[22]},{"inputs":["9","3","5"],"numbers":[9]},{"inputs":["2","4","8"],"numbers":[8]}]},
    "week03_ex05": {"description":"Read a student's name and marks in Physics, Mathematics and Chemistry. Calculate total and percentage. Pass requires at least 50 percent overall and no mark below 40. Display the name and Passed or Failed.","allowed_concepts":"variables, input(), type conversion, arithmetic, comparison and logical operators, if, else, print(), f-strings","mode":"io","tests":[{"inputs":["Anna","70","60","80"],"words":["anna","passed"]},{"inputs":["Ben","90","35","90"],"words":["ben","failed"]},{"inputs":["Cara","45","45","45"],"words":["cara","failed"]}]},
    "week03_ex06": {"description":"Read a Celsius temperature and display Hot (>30), Normal (10 to 30), Cold (0 to below 10), or Freezing (below 0).","allowed_concepts":"variables, input(), type conversion, comparison operators, if, elif, else, print(), f-strings","mode":"io","tests":[{"inputs":["31"],"words":["hot"]},{"inputs":["30"],"words":["normal"]},{"inputs":["10"],"words":["normal"]},{"inputs":["5"],"words":["cold"]},{"inputs":["0"],"words":["cold"]},{"inputs":["-1"],"words":["freezing"]}]},

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



def _run_code_with_inputs(student_code, inputs):
    output = io.StringIO()
    values = iter(inputs)
    def fake_input(prompt=""):
        try:
            return next(values)
        except StopIteration:
            raise RuntimeError("The program requested more input values than expected.")
    try:
        namespace = {}
        with patch("builtins.input", fake_input), redirect_stdout(output):
            exec(student_code, namespace, namespace)
        return output.getvalue(), None
    except Exception as exc:
        return output.getvalue(), f"{type(exc).__name__}: {exc}"

def _numbers(text):
    return [float(v) for v in re.findall(r"(?<![A-Za-z])[-+]?\d+(?:\.\d+)?", text)]

def _contains_expected_numbers(output, expected, tolerance=0.02):
    numbers = _numbers(output)
    return all(any(abs(n-v) <= tolerance for n in numbers) for v in expected)



def _contains_words(output, words):
    low = output.lower()
    return all(word.lower() in low for word in words)

def _io_test_passes(output, test):
    if "words" in test and not _contains_words(output, test["words"]):
        return False
    if "numbers" in test and not _contains_expected_numbers(output, test["numbers"]):
        return False
    return True

def _quadratic_test_passes(output, test):
    if test.get("no_real"):
        low = output.lower()
        return "no real" in low or ("real" in low and ("not" in low or "none" in low))
    return _contains_expected_numbers(output, test["roots"])


def check_solution(task_id, student_code):
    if task_id not in TASKS:
        raise ValueError(f"Unknown task id: {task_id}")

    task = TASKS[task_id]

    if task["mode"] in ("io", "quadratic"):
        for test in task["tests"]:
            actual_output, error = _run_code_with_inputs(student_code, test["inputs"])
            if task["mode"] == "io":
                passed = (not error) and _io_test_passes(actual_output, test)
            else:
                passed = (not error) and _quadratic_test_passes(actual_output, test)
            if not passed:
                print("⚠️ Not quite yet.")
                print("🤖 Hint:", _ai_feedback(task, student_code, actual_output, error))
                return False
        print("✅ Correct! Your program passed the test cases.")
        return True

    if task["mode"] == "numeric":
        for inputs, expected in task["tests"]:
            actual_output, error = _run_code_with_inputs(student_code, inputs)
            if error or not _contains_expected_numbers(actual_output, expected):
                print("⚠️ Not quite yet.")
                print("🤖 Hint:", _ai_feedback(task, student_code, actual_output, error))
                return False
        print("✅ Correct! Your program passed the test cases.")
        return True

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
