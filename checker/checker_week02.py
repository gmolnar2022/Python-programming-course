"""Week 2 checker."""
import io, re
from contextlib import redirect_stdout
from unittest.mock import patch
from IPython import get_ipython

TASKS = {
 "week02_ex01": ("Calculate and display sum, difference, product, quotient, remainder, first integer + 1 and second integer - 1.", "ai", []),
 "week02_ex02": ("Solve a*x + b = 0 using coefficients entered by the user.", "numeric", [(["2","-8"],[4.0]),(["5","10"],[-2.0])]),
 "week02_ex03": ("Read three floating-point cuboid edges and display volume and surface area.", "numeric", [(["2","3","4"],[24.0,52.0]),(["1.5","2","3"],[9.0,21.0])]),
 "week02_ex04": ("Read net price and tax rate and display gross price.", "numeric", [(["100","27"],[127.0]),(["800","25"],[1000.0])]),
 "week02_ex05": ("Read five grades and display their average.", "numeric", [(["1","2","3","4","5"],[3.0]),(["5","5","4","4","3"],[4.2])]),
 "week02_ex06": ("Read initial amount and annual interest rate and calculate ending amount after 5 years.", "numeric", [(["1000","10"],[1610.51]),(["2000","5"],[2552.56])]),
 "week02_ex07": ("Convert USD to HUF and EUR using 354.15 HUF/USD and 0.93 EUR/USD.", "numeric", [(["100"],[35415.0,93.0]),(["50"],[17707.5,46.5])]),
}

def _run(code, inputs=()):
    out=io.StringIO(); vals=iter(inputs)
    def inp(prompt=""):
        try: return next(vals)
        except StopIteration: raise RuntimeError("Too many input() calls.")
    try:
        with patch("builtins.input", inp), redirect_stdout(out): exec(code,{},{})
        return out.getvalue(), None
    except Exception as e: return out.getvalue(), f"{type(e).__name__}: {e}"

def _nums(s):
    return [float(x) for x in re.findall(r"(?<![A-Za-z])[-+]?\\d+(?:\\.\\d+)?",s)]

def _has(out, expected):
    ns=_nums(out)
    return all(any(abs(n-e)<=0.02 for n in ns) for e in expected)

def _hint(desc, code, out, err=None):
    try: from google.colab import ai
    except Exception: return "AI feedback is available only in Google Colab."
    p=f"""You are a tutor for first-year Python students.
TASK: {desc}
STUDENT CODE:
{code}
OUTPUT:
{out}
ERROR: {err or 'None'}
Give only a short hint, not a complete solution. Use only variables, simple data types, input(), type conversion, arithmetic operators, print() and f-strings. Maximum three short sentences."""
    try:
        r=ai.generate_text(p)
        return r.strip() if isinstance(r,str) else str(getattr(r,"text",r)).strip()
    except Exception as e: return f"AI feedback is temporarily unavailable ({type(e).__name__})."

def check_solution(task_id, code):
    desc,mode,tests=TASKS[task_id]
    if mode=="ai":
        out,err=_run(code)
        if err: print("❌ Error."); print("🤖 Hint:",_hint(desc,code,out,err)); return False
        print("🤖 Feedback:"); print(_hint(desc,code,out)); return None
    for inputs,expected in tests:
        out,err=_run(code,inputs)
        if err or not _has(out,expected):
            print("⚠️ Not quite yet."); print("🤖 Hint:",_hint(desc,code,out,err)); return False
    print("✅ Correct! Your program passed the test cases."); return True

def _previous():
    h=get_ipython().history_manager.input_hist_raw
    for cell in reversed(h[1:]):
        s=cell.strip()
        if not s or "check_button(" in s or "check_previous_cell(" in s: continue
        if "from checker" in s or "import checker" in s: continue
        if "checker.py" in s and "wget" in s: continue
        return cell
    raise RuntimeError("No previous student code cell was found. Run your solution cell first.")

def check_previous_cell(task_id): return check_solution(task_id,_previous())

def check_button(task_id,label="Check my solution"):
    import ipywidgets as widgets
    from IPython.display import display
    b=widgets.Button(description=label,button_style="primary"); o=widgets.Output()
    def click(_):
        with o:
            o.clear_output()
            try: check_previous_cell(task_id)
            except Exception as e: print("❌",e)
    b.on_click(click); display(b,o)
