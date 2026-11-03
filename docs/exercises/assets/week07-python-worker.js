'use strict';
// Isolated Python execution: the parent terminates this worker on timeout.
importScripts('https://cdn.jsdelivr.net/pyodide/v0.29.0/full/pyodide.js');
let py=null, pendingInput=new Map();
async function ready(){if(!py)py=await loadPyodide();return py;}
self.onmessage=async ({data:m})=>{
 if(m.type==='input'){const fn=pendingInput.get(m.id);if(fn){pendingInput.delete(m.id);fn(String(m.value));}return;}
 if(m.type!=='execute'&&m.type!=='structure'&&m.type!=='match')return;
 try{
  const p=await ready();self.postMessage({type:'ready',id:m.id});
  if(m.type==='structure'){
   p.globals.set('student_code',String(m.code));
   const result=await p.runPythonAsync("\nimport ast,json\ndef _st(src):\n t=ast.parse(src)\n calls=[n for n in ast.walk(t) if isinstance(n,ast.Call)]\n imports=[]\n for n in ast.walk(t):\n  if isinstance(n,ast.Import): imports += [a.name for a in n.names]\n  elif isinstance(n,ast.ImportFrom) and n.module: imports.append(n.module)\n fors=[n for n in ast.walk(t) if isinstance(n,ast.For)]\n whiles=[n for n in ast.walk(t) if isinstance(n,ast.While)]\n forbidden=[type(n).__name__.lower() for n in ast.walk(t) if isinstance(n,(ast.Break,ast.Continue,ast.Return,ast.FunctionDef,ast.AsyncFunctionDef,ast.Lambda))]\n comprehensions=any(isinstance(n,(ast.ListComp,ast.SetComp,ast.DictComp,ast.GeneratorExp)) for n in ast.walk(t))\n shortcut_names={\"sum\",\"min\",\"max\",\"any\",\"all\",\"sorted\",\"enumerate\",\"zip\",\"next\",\"eval\",\"exec\",\"getattr\",\"__import__\",\"map\",\"filter\",\"reversed\"}\n shortcuts=[n.func.id for n in calls if isinstance(n.func,ast.Name) and n.func.id in shortcut_names]\n methods=[n.func.attr for n in calls if isinstance(n.func,ast.Attribute) and not (isinstance(n.func.value,ast.Name) and n.func.value.id==\"random\")]\n while_has_and=any(isinstance(n.test,ast.BoolOp) and isinstance(n.test.op,ast.And) for n in whiles)\n return json.dumps({\n \"input\":any(isinstance(n,ast.Call) and isinstance(n.func,ast.Name) and n.func.id==\"input\" for n in ast.walk(t)),\n \"if\":any(isinstance(n,ast.If) for n in ast.walk(t)),\n \"comparison\":any(isinstance(n,ast.Compare) for n in ast.walk(t)),\n \"loop\":bool(fors or whiles),\n \"nested_loop\":any(any(isinstance(c,(ast.For,ast.While)) for c in ast.walk(n) if c is not n) for n in fors+whiles),\n \"for\":bool(fors),\"while\":bool(whiles),\"while_has_and\":while_has_and,\n \"print\":any(isinstance(n,ast.Call) and isinstance(n.func,ast.Name) and n.func.id==\"print\" for n in ast.walk(t)),\n \"random\":any(name==\"random\" for name in imports),\n \"imports\":imports,\"forbidden\":forbidden,\"comprehensions\":comprehensions,\n \"shortcuts\":shortcuts,\"methods\":methods,\n \"membership\":any(isinstance(op,(ast.In,ast.NotIn)) for n in ast.walk(t) if isinstance(n,ast.Compare) for op in n.ops),\n \"collections\":{\n   \"list\":any(isinstance(n,ast.List) for n in ast.walk(t)),\n   \"tuple\":any(isinstance(n,ast.Tuple) for n in ast.walk(t)),\n   \"set\":any(isinstance(n,ast.Set) for n in ast.walk(t)),\n   \"dict\":any(isinstance(n,ast.Dict) for n in ast.walk(t)),\n   \"constructors\":[n.func.id for n in calls if isinstance(n.func,ast.Name) and n.func.id in {\"list\",\"tuple\",\"set\",\"dict\"}]\n }\n })\n_st(student_code)\n");
   self.postMessage({type:'done',id:m.id,result:JSON.parse(String(result))});return;
  }
  if(m.type==='match'){
   p.globals.set('check_id',m.exerciseId);p.globals.set('check_output',m.code);
   p.globals.set('check_inputs',JSON.stringify(m.inputs));
   const result=await p.runPythonAsync("import ast,re,json,math\ninputs=json.loads(check_inputs)\nlines=[line.strip() for line in check_output.splitlines() if line.strip()]\nvalues=[]\nfor line in lines:\n    for match in re.finditer(r'\\[',line):\n        try:\n            value=ast.literal_eval(line[match.start():].strip())\n            if isinstance(value,list):\n                values.append(value)\n                break\n        except (ValueError,SyntaxError):\n            pass\ndef equal(a,b,tol=1e-8):\n    if isinstance(a,list) and isinstance(b,list):\n        return len(a)==len(b) and all(equal(x,y,tol) for x,y in zip(a,b))\n    if type(a) in (int,float) and type(b) in (int,float):\n        return math.isfinite(a) and math.isfinite(b) and abs(a-b)<=tol\n    return type(a)==type(b) and a==b\ndef numbers(line):\n    return [float(v) for v in re.findall(r'[-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][-+]?\\d+)?',line)]\ndef trace_matches(actual,initial,states):\n    expected=[initial]+states\n    if equal(actual,expected):return True\n    return equal(actual,expected+[expected[-1]])\nvalid=False\nif check_id=='ex01':\n    original=[float(v) for v in inputs[1:]]\n    expected=[v*9/5+32 for v in original]\n    valid=len(values)==2 and equal(values[0],original) and equal(values[1],expected,0.011)\nelif check_id=='ex02':\n    m=int(inputs[1]);scores=[int(v) for v in inputs[2:]]\n    expected=[v for v in scores if v>=m/2]\n    valid=len(values)==2 and equal(values[0],scores) and equal(values[1],expected)\nelif check_id=='ex03':\n    n=int(inputs[0])\n    if len(values)==3:\n        rolls,even,odd=values\n        valid=len(rolls)==n and all(type(v) is int and 1<=v<=6 for v in rolls) and equal(even,[v for v in rolls if v%2==0]) and equal(odd,[v for v in rolls if v%2!=0])\nelif check_id=='ex04':\n    n=int(inputs[0])\n    if values and len(values[0])==5 and all(type(v) is int and 0<=v<=n for v in values[0]):\n        x=values[0].copy();states=[]\n        for i in range(len(x)-1):\n            for j in range(i+1,len(x)):\n                if x[j]<x[i]:\n                    x[i],x[j]=x[j],x[i];states.append(x.copy())\n        valid=trace_matches(values,values[0],states) and equal(values[-1],sorted(values[0]))\nelif check_id=='ex05':\n    initial=[float(v) for v in inputs[3:]];x=initial.copy();states=[]\n    for i in range(len(x)-1):\n        max_index=i\n        for j in range(i+1,len(x)):\n            if x[j]>x[max_index]:max_index=j\n        if max_index!=i:\n            x[i],x[max_index]=x[max_index],x[i];states.append(x.copy())\n    valid=bool(values) and trace_matches(values,initial,states) and equal(values[-1],sorted(initial,reverse=True))\nelif check_id=='ex06':\n    expected=sorted(c for c in inputs[0] if c!=' ')\n    if values:\n        valid=equal(values[-1],expected)\n    else:\n        tail=lines[-1] if lines else ''\n        if ':' in tail:tail=tail.rsplit(':',1)[1].strip()\n        # When the result is an empty string, a prompt/label-only output is acceptable.\n        valid=tail==''.join(expected)\n        if not expected and not valid:valid=bool(lines) and lines[-1].endswith(':')\nelif check_id=='ex07':\n    names=inputs[1:];average=sum(len(v) for v in names)/len(names)\n    selected=[v for v in names if len(v)<average]\n    reported=[]\n    for line in lines:\n        if '[' not in line:reported.extend(numbers(line))\n    valid=len(values)==2 and equal(values[0],names) and equal(values[1],selected) and bool(reported) and abs(reported[-1]-average)<=0.011\nvalid\n");
   self.postMessage({type:'done',id:m.id,result:Boolean(result)});return;
  }
  if(!m.interactive) p.runPython('import random; random.seed(517)');
  p.globals.set('student_code',String(m.code));
  p.globals.set('student_inputs_json',JSON.stringify((m.inputs||[]).map(String)));
  p.globals.set('student_interactive',!!m.interactive);
  p.globals.set('student_output',(chunk)=>self.postMessage({type:'output',id:m.id,chunk:String(chunk)}));
  p.globals.set('student_prompt_async',(prompt)=>new Promise(resolve=>{pendingInput.set(m.id,resolve);self.postMessage({type:'prompt',id:m.id,prompt:String(prompt)});}));
  const result=await p.runPythonAsync(`
import json,builtins,io,contextlib,ast,inspect
async def _run(src, vals):
    it=iter(json.loads(vals)); out=io.StringIO()
    class LimitedOutput(io.StringIO):
        def write(self,text):
            if self.tell()+len(text)>50000: raise RuntimeError("Output limit exceeded (50000 characters).")
            return super().write(text)
    out=LimitedOutput()
    class LiveOutput(io.TextIOBase):
        def write(self,text):
            out.write(text)
            student_output(text)
            return len(text)
        def flush(self): pass
    live=LiveOutput()
    def inp(prompt=""):
        try: value=next(it)
        except StopIteration: raise EOFError("No more input values.")
        if prompt: print(prompt,end="")
        print(value)
        return value
    async def async_inp(prompt=""):
        if prompt: print(prompt,end="",flush=True)
        value=await student_prompt_async(str(prompt))
        print(value,flush=True)
        return value
    class AsyncInput(ast.NodeTransformer):
        def visit_Call(self,node):
            self.generic_visit(node)
            if isinstance(node.func,ast.Name) and node.func.id=="input":
                node.func.id="async_inp"
                return ast.copy_location(ast.Await(value=node),node)
            return node
    old=builtins.input
    try:
        builtins.input=inp
        ns={"__name__":"__main__","async_inp":async_inp}
        with contextlib.redirect_stdout(live if student_interactive else out),contextlib.redirect_stderr(live if student_interactive else out):
            if student_interactive:
                tree=AsyncInput().visit(ast.parse(src,"<student_code>","exec"))
                ast.fix_missing_locations(tree)
                compiled=compile(tree,"<student_code>","exec",flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
                result=eval(compiled,ns,ns)
                if inspect.isawaitable(result): await result
            else:
                exec(compile(src,"<student_code>","exec"),ns,ns)
        return json.dumps({"ok":True,"output":out.getvalue().strip()})
    except Exception as e:
        return json.dumps({"ok":False,"output":out.getvalue().strip(),"error":type(e).__name__+": "+str(e)})
    finally: builtins.input=old
await _run(student_code,student_inputs_json)
`);
  self.postMessage({type:'done',id:m.id,result:JSON.parse(String(result))});
 }catch(e){self.postMessage({type:'error',id:m.id,error:String(e?.message||e)});}
};
