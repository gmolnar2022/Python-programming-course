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
   const result=await p.runPythonAsync("\nimport ast,json\ndef _st(src):\n t=ast.parse(src)\n calls=[n for n in ast.walk(t) if isinstance(n,ast.Call)]\n imports=[]\n for n in ast.walk(t):\n  if isinstance(n,ast.Import): imports += [a.name for a in n.names]\n  elif isinstance(n,ast.ImportFrom) and n.module: imports.append(n.module)\n fors=[n for n in ast.walk(t) if isinstance(n,ast.For)]\n whiles=[n for n in ast.walk(t) if isinstance(n,ast.While)]\n forbidden=[type(n).__name__.lower() for n in ast.walk(t) if isinstance(n,(ast.Break,ast.Continue,ast.Return))]\n comprehensions=any(isinstance(n,(ast.ListComp,ast.SetComp,ast.DictComp,ast.GeneratorExp)) for n in ast.walk(t))\n shortcut_names={\"sum\",\"min\",\"max\",\"any\",\"all\",\"sorted\",\"enumerate\",\"zip\",\"next\",\"eval\",\"exec\",\"getattr\",\"__import__\",\"map\",\"filter\",\"reversed\"}\n shortcuts=[n.func.id for n in calls if isinstance(n.func,ast.Name) and n.func.id in shortcut_names]\n methods=[n.func.attr for n in calls if isinstance(n.func,ast.Attribute) and not (isinstance(n.func.value,ast.Name) and n.func.value.id==\"random\")]\n while_has_and=any(isinstance(n.test,ast.BoolOp) and isinstance(n.test.op,ast.And) for n in whiles)\n return json.dumps({\n \"input\":any(isinstance(n,ast.Call) and isinstance(n.func,ast.Name) and n.func.id==\"input\" for n in ast.walk(t)),\n \"if\":any(isinstance(n,ast.If) for n in ast.walk(t)),\n \"comparison\":any(isinstance(n,ast.Compare) for n in ast.walk(t)),\n \"loop\":bool(fors or whiles),\n \"for\":bool(fors),\"while\":bool(whiles),\"while_has_and\":while_has_and,\n \"print\":any(isinstance(n,ast.Call) and isinstance(n.func,ast.Name) and n.func.id==\"print\" for n in ast.walk(t)),\n \"random\":any(name==\"random\" for name in imports),\n \"imports\":imports,\"forbidden\":forbidden,\"comprehensions\":comprehensions,\n \"shortcuts\":shortcuts,\"methods\":methods,\n \"membership\":any(isinstance(op,(ast.In,ast.NotIn)) for n in ast.walk(t) if isinstance(n,ast.Compare) for op in n.ops),\n \"collections\":{\n   \"list\":any(isinstance(n,ast.List) for n in ast.walk(t)),\n   \"tuple\":any(isinstance(n,ast.Tuple) for n in ast.walk(t)),\n   \"set\":any(isinstance(n,ast.Set) for n in ast.walk(t)),\n   \"dict\":any(isinstance(n,ast.Dict) for n in ast.walk(t)),\n   \"constructors\":[n.func.id for n in calls if isinstance(n.func,ast.Name) and n.func.id in {\"list\",\"tuple\",\"set\",\"dict\"}]\n }\n })\n_st(student_code)\n");
   self.postMessage({type:'done',id:m.id,result:JSON.parse(String(result))});return;
  }
  if(m.type==='match'){
   p.globals.set('check_id',m.exerciseId);p.globals.set('check_output',m.code);
   p.globals.set('check_inputs',JSON.stringify(m.inputs));
   const result=await p.runPythonAsync("\nimport ast,re,json,math\nvalues=[]\nlines=[line.strip() for line in check_output.splitlines() if line.strip()]\nfor line in lines:\n    for start in [m.start() for m in re.finditer(r\"[\\[\\{\\(]\",line)]:\n        try:\n            value=ast.literal_eval(line[start:].strip())\n            if isinstance(value,(list,tuple,dict,set)):\n                values.append(value)\n                break\n        except (ValueError,SyntaxError):\n            pass\ndef nums(line):\n    return [float(v) for v in re.findall(r\"[-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][-+]?\\d+)?\",line)]\ndef last_number():\n    v=nums(lines[-1]) if lines else []\n    return v[-1] if v else None\ninputs=json.loads(check_inputs)\nvalid=False\nif check_id==\"ex01\":\n    expected=any(float(v)>185 for v in inputs)\n    tail=lines[-1].lower() if lines else \"\"\n    words=re.findall(r\"\\b(true|false)\\b\",tail)\n    valid=bool(words) and (words[-1]==\"true\")==expected\nelif check_id==\"ex02\":\n    candidates=[v for v in values if isinstance(v,tuple) and len(v)==7]\n    if candidates:\n        v=candidates[-1]\n        valid=all(type(t) in (int,float) and math.isfinite(t) and 10<=t<25 for t in v) and last_number() is not None and abs(last_number()-sum(v)/7)<=0.011\nelif check_id==\"ex03\":\n    n=int(inputs[0]);count=sum(n%d==0 for d in range(1,n+1))\n    tail=lines[-1].lower() if lines else \"\"\n    is_prime=bool(re.search(r\"\\bprime\\b\",tail)) and not re.search(r\"\\bnot\\b|\\bnon[- ]?prime\\b|\\bcomposite\\b\",tail)\n    reported=nums(lines[-2]) if len(lines)>=2 else []\n    valid=bool(reported) and reported[-1]==count and bool(re.search(r\"\\bprime\\b|\\bcomposite\\b\",tail)) and is_prime==(count==2)\nelif check_id==\"ex04\":\n    candidates=[v for v in values if isinstance(v,list) and 10<=len(v)<=100]\n    if candidates:\n        v=candidates[-1]\n        valid=all(t in (\"heads\",\"tails\") for t in v) and \"heads\" in v and last_number()==v.index(\"heads\")+1\nelif check_id==\"ex05\":\n    names=inputs[1:];expected=names.index(\"Peter\") if \"Peter\" in names else -1\n    valid=last_number()==expected\nelif check_id==\"ex06\":\n    candidates=[v for v in values if isinstance(v,list) and len(v)==15]\n    if candidates:\n        v=candidates[-1]\n        valid=all(type(t) is int and 1000<=t<=2023 for t in v) and last_number()==max(v)\nelif check_id==\"ex07\":\n    bounds=None\n    for line in lines[:-1]:\n        v=nums(line)\n        if len(v)>=2:\n            lo,hi=v[-2:]\n            if lo.is_integer() and hi.is_integer() and 1<=lo<=50 and lo<=hi<=1000:\n                bounds=(int(lo),int(hi));break\n    if bounds:\n        lo,hi=bounds;expected=next((n for n in (6,28,496) if lo<=n<=hi),None)\n        tail=lines[-1].lower()\n        no_match=bool(re.search(r\"\\bno\\b|\\bnot found\\b|\\bnone\\b\",tail))\n        valid=(no_match and \"perfect\" in tail) if expected is None else (not no_match and last_number()==expected)\nvalid\n");
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
