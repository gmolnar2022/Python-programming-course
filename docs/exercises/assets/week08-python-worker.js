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
   const result=await p.runPythonAsync("\nimport ast,json\ndef _st(src):\n t=ast.parse(src)\n calls=[n for n in ast.walk(t) if isinstance(n,ast.Call)]\n imports=[]\n for n in ast.walk(t):\n  if isinstance(n,ast.Import): imports += [a.name for a in n.names]\n  elif isinstance(n,ast.ImportFrom) and n.module: imports.append(n.module)\n fors=[n for n in ast.walk(t) if isinstance(n,ast.For)]\n whiles=[n for n in ast.walk(t) if isinstance(n,ast.While)]\n forbidden=[type(n).__name__.lower() for n in ast.walk(t) if isinstance(n,(ast.Break,ast.Continue))]\n for loop in fors+whiles:\n  if any(isinstance(n,ast.Return) for n in ast.walk(loop)): forbidden.append(\"return_in_loop\")\n comprehensions=any(isinstance(n,(ast.ListComp,ast.SetComp,ast.DictComp,ast.GeneratorExp)) for n in ast.walk(t))\n shortcut_names={\"sum\",\"min\",\"max\",\"any\",\"all\",\"sorted\",\"enumerate\",\"zip\",\"next\",\"eval\",\"exec\",\"getattr\",\"__import__\",\"map\",\"filter\",\"reversed\"}\n shortcuts=[\"reverse_slice\"] if any(isinstance(n,ast.Slice) and isinstance(n.step,ast.UnaryOp) and isinstance(n.step.op,ast.USub) for n in ast.walk(t)) else []\n shortcuts += [n.func.id for n in calls if isinstance(n.func,ast.Name) and n.func.id in shortcut_names]\n methods=[n.func.attr for n in calls if isinstance(n.func,ast.Attribute) and not (isinstance(n.func.value,ast.Name) and n.func.value.id==\"random\")]\n while_has_and=any(isinstance(n.test,ast.BoolOp) and isinstance(n.test.op,ast.And) for n in whiles)\n return json.dumps({\n \"function\":any(isinstance(n,ast.FunctionDef) for n in ast.walk(t)),\n \"lambda\":any(isinstance(n,ast.Lambda) for n in ast.walk(t)),\n \"map\":any(isinstance(n.func,ast.Name) and n.func.id==\"map\" for n in calls),\n \"filter\":any(isinstance(n.func,ast.Name) and n.func.id==\"filter\" for n in calls),\n \"vectors\":any(name==\"vectors\" for name in imports),\n \"input\":any(isinstance(n,ast.Call) and isinstance(n.func,ast.Name) and n.func.id==\"input\" for n in ast.walk(t)),\n \"if\":any(isinstance(n,ast.If) for n in ast.walk(t)),\n \"comparison\":any(isinstance(n,ast.Compare) for n in ast.walk(t)),\n \"loop\":bool(fors or whiles),\n \"nested_loop\":any(any(isinstance(c,(ast.For,ast.While)) for c in ast.walk(n) if c is not n) for n in fors+whiles),\n \"for\":bool(fors),\"while\":bool(whiles),\"while_has_and\":while_has_and,\n \"print\":any(isinstance(n,ast.Call) and isinstance(n.func,ast.Name) and n.func.id==\"print\" for n in ast.walk(t)),\n \"random\":any(name==\"random\" for name in imports),\n \"imports\":imports,\"forbidden\":forbidden,\"comprehensions\":comprehensions,\n \"shortcuts\":shortcuts,\"methods\":methods,\n \"membership\":any(isinstance(op,(ast.In,ast.NotIn)) for n in ast.walk(t) if isinstance(n,ast.Compare) for op in n.ops),\n \"collections\":{\n   \"list\":any(isinstance(n,ast.List) for n in ast.walk(t)),\n   \"tuple\":any(isinstance(n,ast.Tuple) for n in ast.walk(t)),\n   \"set\":any(isinstance(n,ast.Set) for n in ast.walk(t)),\n   \"dict\":any(isinstance(n,ast.Dict) for n in ast.walk(t)),\n   \"constructors\":[n.func.id for n in calls if isinstance(n.func,ast.Name) and n.func.id in {\"list\",\"tuple\",\"set\",\"dict\"}]\n }\n })\n_st(student_code)\n");
   self.postMessage({type:'done',id:m.id,result:JSON.parse(String(result))});return;
  }
  if(m.type==='match'){
   p.globals.set('check_id',m.exerciseId);p.globals.set('check_output',m.code);
   p.globals.set('check_inputs',JSON.stringify(m.inputs));
   const result=await p.runPythonAsync("valid = \"__WEEK08_CHECK_OK__\" in check_output.splitlines()\nvalid\n");
   self.postMessage({type:'done',id:m.id,result:Boolean(result)});return;
  }
  if(!m.interactive) p.runPython('import random; random.seed(517)');
  p.globals.set('student_code',String(m.code));
  p.globals.set('student_inputs_json',JSON.stringify((m.inputs||[]).map(String)));
  p.globals.set('student_interactive',!!m.interactive);
  p.globals.set('student_output',(chunk)=>self.postMessage({type:'output',id:m.id,chunk:String(chunk)}));
  p.globals.set('student_prompt_async',(prompt)=>new Promise(resolve=>{pendingInput.set(m.id,resolve);self.postMessage({type:'prompt',id:m.id,prompt:String(prompt)});}));
  const result=await p.runPythonAsync(`
import json,builtins,io,contextlib,ast,inspect,sys,types,re
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
    def _collections(text, kind):
        found=[]
        opening="[" if kind is list else "{"
        for line in text.splitlines():
            for start in [i for i,c in enumerate(line) if c==opening]:
                try:
                    value=ast.literal_eval(line[start:].strip())
                    if isinstance(value,kind): found.append(value); break
                except (ValueError,SyntaxError): pass
        return found
    def _capture(fn,*args):
        capture=io.StringIO()
        with contextlib.redirect_stdout(capture): result=fn(*args)
        return result,capture.getvalue()
    def _last_number(text):
        lines=[line for line in text.splitlines() if line.strip()]
        values=re.findall(r"[-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)",lines[-1]) if lines else []
        return float(values[-1]) if values else None
    old=builtins.input
    old_vectors=sys.modules.get("vectors")
    try:
        builtins.input=inp
        ns={"__name__":"__main__","async_inp":async_inp,
            "__student_output__":lambda:out.getvalue(),
            "_lists":lambda text:_collections(text,list),
            "_dicts":lambda text:_collections(text,dict),
            "_has_list":lambda text,expected:expected in _collections(text,list),
            "_capture":_capture,"_last_number":_last_number}
        if "# === vectors.py ===" in src:
            if src.count("# === vectors.py ===")!=1 or src.count("# === main.py ===")!=1:
                raise ValueError("Keep exactly one vectors.py marker and one main.py marker.")
            module_source,src=src.split("# === vectors.py ===",1)[1].split("# === main.py ===",1)
            module=types.ModuleType("vectors")
            sys.modules["vectors"]=module
            with contextlib.redirect_stdout(live if student_interactive else out):
                exec(compile(module_source,"vectors.py","exec"),module.__dict__,module.__dict__)
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
    finally:
        builtins.input=old
        if old_vectors is None: sys.modules.pop("vectors",None)
        else: sys.modules["vectors"]=old_vectors
await _run(student_code,student_inputs_json)
`);
  self.postMessage({type:'done',id:m.id,result:JSON.parse(String(result))});
 }catch(e){self.postMessage({type:'error',id:m.id,error:String(e?.message||e)});}
};
