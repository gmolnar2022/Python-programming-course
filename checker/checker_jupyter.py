"""Jupyter-only deterministic checker for Weeks 1–3."""
import ast,builtins,calendar,io,math,re
from contextlib import redirect_stdout
from IPython import get_ipython

TASKS={
"week01_ex01":{"kind":"w1e1","hint":"Check all three requested output formats."},
"week01_ex02":{"kind":"w1e2","hint":"Include both the one-line and multi-line introduction with Name, Neptun-code and Age."},
"week01_ex03":{"kind":"w1e3","hint":"Check all three calculations and calculate the seconds in a week in the program."},
"week01_ex04":{"kind":"w1e4","hint":"Check all ten multiplication facts from 1 × 7 to 10 × 7."},
"week01_ex05":{"kind":"w1e5","hint":"Check the November 2023 calendar layout and Monday-first weekday order."},
"week02_ex01":{"tests":[(["10","3"],[13,7,30,10/3,1,11,2]),(["20","4"],[24,16,80,5,0,21,3])],"hint":"Check every requested arithmetic result."},
"week02_ex02":{"tests":[(["2","-8"],[4]),(["5","10"],[-2])],"hint":"For a*x + b = 0, isolate x correctly."},
"week02_ex03":{"tests":[(["2","3","4"],[24,52]),(["1.5","2","3"],[9,27])],"hint":"Check both the volume and surface-area formulas."},
"week02_ex04":{"tests":[(["100","27"],[127]),(["800","25"],[1000])],"hint":"Treat the tax rate as a percentage."},
"week02_ex05":{"tests":[(["1","2","3","4","5"],[3]),(["5","5","4","4","3"],[4.2])],"hint":"Add all five grades and divide by five."},
"week02_ex06":{"tests":[(["1000","10"],[1610.51]),(["2000","5"],[2552.56])],"hint":"Use compound interest for five years."},
"week02_ex07":{"tests":[(["100"],[93,35415]),(["50"],[46.5,17707.5])],"hint":"Use the given USD→EUR and USD→HUF rates."},
"week03_ex01":{"tests":[(["8"],{"words":["positive"]}),(["-3"],{"words":["negative"]})],"hint":"Check the condition that separates positive and negative values."},
"week03_ex02":{"tests":[(["23.4","11.2"],{"numbers":[23.4]}),(["-2.5","4.75"],{"numbers":[4.75]})],"hint":"Compare the two numbers and print the larger value."},
"week03_ex03":{"tests":[(["1","-5","6"],{"numbers":[2,3]}),(["1","0","1"],{"words_any":["no real","no solution"]})],"hint":"Calculate the discriminant first."},
"week03_ex04":{"tests":[(["14","22","11"],{"numbers":[22]}),(["9","3","5"],{"numbers":[9]}),(["2","4","8"],{"numbers":[8]})],"hint":"Make sure every position can contain the largest value."},
"week03_ex05":{"tests":[(["Anna","70","60","80"],{"words":["anna","passed"]}),(["Ben","90","35","90"],{"words":["ben","failed"]}),(["Cara","45","45","45"],{"words":["cara","failed"]})],"hint":"Passing requires overall ≥50 and every mark ≥40."},
"week03_ex06":{"tests":[(["31"],{"words":["hot"]}),(["30"],{"words":["normal"]}),(["10"],{"words":["normal"]}),(["5"],{"words":["cold"]}),(["0"],{"words":["cold"]}),(["-1"],{"words":["freezing"]})],"hint":"Check the boundary values 30, 10 and 0."}
}
def _run(code,inputs=()):
 vals=iter(inputs); out=io.StringIO(); old=builtins.input
 def inp(prompt=""):
  try:return next(vals)
  except StopIteration: raise RuntimeError("The program requested more input values than expected.")
 try:
  builtins.input=inp
  with redirect_stdout(out): exec(code,{},{})
  return out.getvalue(),None
 except Exception as e:return out.getvalue(),f"{type(e).__name__}: {e}"
 finally:builtins.input=old
def _nums(s):return [float(x) for x in re.findall(r'(?<![A-Za-z])[-+]?(?:\d+(?:\.\d*)?|\.\d+)',s)]
def _hasnums(s,exp,tol=.02):
 ns=_nums(s); return all(any(abs(n-float(v))<=tol for n in ns) for v in exp)
def _expected(out,exp):
 if isinstance(exp,list): return _hasnums(out,exp)
 low=out.lower()
 if 'words' in exp and not all(x.lower() in low for x in exp['words']):return False
 if 'words_any' in exp and not any(x.lower() in low for x in exp['words_any']):return False
 if 'numbers' in exp and not _hasnums(out,exp['numbers']):return False
 return True
def _special(kind,code):
 out,err=_run(code,[])
 if err:return False,err
 low=out.lower(); compact=re.sub(r'\s+','',low)
 if kind=='w1e1':
  words=['this','is','my','second','python','program']; return (all(w in low for w in words) and 'this-is-my-second-python-program' in compact),None
 if kind=='w1e2':return (all(x in low for x in ['name','neptun','age','introduction']) and '&' in out),None
 if kind=='w1e3':return ('2023' in out and 'x=3' in compact and '604800' in out and any(x in code.replace(' ','') for x in ['7*24*60*60','24*60*60*7','60*60*24*7'])),None
 if kind=='w1e4':return all(f'{i}*7={i*7}' in compact for i in range(1,11)),None
 if kind=='w1e5':
  expected=calendar.TextCalendar(firstweekday=0).formatmonth(2023,11)
  return out.split()==expected.split(),None
 return False,None
def check_solution(task_id,code):
 if task_id not in TASKS: raise ValueError(f'Unknown task id: {task_id}')
 try:compile(code,'<student-code>','exec')
 except SyntaxError as e:print(f'❌ Syntax error: {e.msg} (line {e.lineno})');return False
 t=TASKS[task_id]
 if 'kind' in t:
  ok,err=_special(t['kind'],code)
  if err:print('❌ Runtime error:',err);return False
  if ok:print('✅ Correct!');return True
  print('⚠️ Not quite yet.');print('Hint:',t['hint']);return False
 passed=0
 for inputs,exp in t['tests']:
  out,err=_run(code,inputs)
  if err:print('❌ Runtime error:',err);return False
  if _expected(out,exp):passed+=1
 if passed==len(t['tests']):print(f'✅ Correct! ({passed}/{len(t["tests"])} tests passed)');return True
 print(f'⚠️ Not quite yet. ({passed}/{len(t["tests"])} tests passed)');print('Hint:',t['hint']);return False
def _find_previous_student_cell():
 shell=get_ipython()
 if shell is None:raise RuntimeError('This checker must be run inside Jupyter.')
 for cell in reversed(shell.history_manager.input_hist_raw[1:]):
  s=cell.strip()
  if not s:continue
  if re.search(r'\bcheck\(',s) or 'check_previous_cell(' in s or 'checker_jupyter' in s or ('urlretrieve' in s and 'checker' in s):continue
  return cell
 raise RuntimeError('No previous student code cell was found.')
def check_previous_cell(task_id):return check_solution(task_id,_find_previous_student_cell())
