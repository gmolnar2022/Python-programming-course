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
   const result=await p.runPythonAsync(`
import ast,json
def _st(src):
 t=ast.parse(src)
 calls=[n for n in ast.walk(t) if isinstance(n,ast.Call)]
 imports=[]
 for n in ast.walk(t):
  if isinstance(n,ast.Import): imports += [a.name for a in n.names]
  elif isinstance(n,ast.ImportFrom) and n.module: imports.append(n.module)
 fors=[n for n in ast.walk(t) if isinstance(n,ast.For)]
 whiles=[n for n in ast.walk(t) if isinstance(n,ast.While)]
 forbidden=[type(n).__name__.lower() for n in ast.walk(t) if isinstance(n,(ast.Break,ast.Continue,ast.Return))]
 comprehensions=any(isinstance(n,(ast.ListComp,ast.SetComp,ast.DictComp,ast.GeneratorExp)) for n in ast.walk(t))
 shortcut_names={"sum","min","max","any","all","sorted","enumerate","zip"}
 shortcuts=[n.func.id for n in calls if isinstance(n.func,ast.Name) and n.func.id in shortcut_names]
 methods=[n.func.attr for n in calls if isinstance(n.func,ast.Attribute) and not (isinstance(n.func.value,ast.Name) and n.func.value.id=="random")]
 while_has_and=any(isinstance(n.test,ast.BoolOp) and isinstance(n.test.op,ast.And) for n in whiles)
 return json.dumps({
 "input":any(isinstance(n,ast.Call) and isinstance(n.func,ast.Name) and n.func.id=="input" for n in ast.walk(t)),
 "if":any(isinstance(n,ast.If) for n in ast.walk(t)),
 "comparison":any(isinstance(n,ast.Compare) for n in ast.walk(t)),
 "loop":bool(fors or whiles),
 "for":bool(fors),"while":bool(whiles),"while_has_and":while_has_and,
 "print":any(isinstance(n,ast.Call) and isinstance(n.func,ast.Name) and n.func.id=="print" for n in ast.walk(t)),
 "random":any(name=="random" for name in imports),
 "imports":imports,"forbidden":forbidden,"comprehensions":comprehensions,
 "shortcuts":shortcuts,"methods":methods,
 "collections":{
   "list":any(isinstance(n,ast.List) for n in ast.walk(t)),
   "tuple":any(isinstance(n,ast.Tuple) for n in ast.walk(t)),
   "set":any(isinstance(n,ast.Set) for n in ast.walk(t)),
   "dict":any(isinstance(n,ast.Dict) for n in ast.walk(t)),
   "constructors":[n.func.id for n in calls if isinstance(n.func,ast.Name) and n.func.id in {"list","tuple","set","dict"}]
 }
 })
_st(student_code)
`);
   self.postMessage({type:'done',id:m.id,result:JSON.parse(String(result))});return;
  }
  if(m.type==='match'){
   p.globals.set('check_id',m.exerciseId);p.globals.set('check_output',m.code);
   p.globals.set('check_inputs',JSON.stringify(m.inputs));
   const result=await p.runPythonAsync(`
import ast,re,json,random
values=[]
for line in check_output.splitlines():
    # Accept labels before a printed collection, and rows printed separately.
    starts=[m.start() for m in re.finditer(r"[\[\{\(]",line)]
    for pos in starts:
        try:
            value=ast.literal_eval(line[pos:].strip())
            values.append(value);break
        except (ValueError,SyntaxError): pass
random.seed(517)
if check_id=="ex01":
    original=[random.randint(1,90) for _ in range(5)]
    swapped=original.copy();swapped[0],swapped[-1]=swapped[-1],swapped[0]
    valid=len(values)==2 and values==[original,swapped]
elif check_id=="ex02":
    n,m=map(int,json.loads(check_inputs));seats=[[random.randint(0,1) for _ in range(m)] for _ in range(n)]
    rows=values[0] if len(values)==1 and values[0]==seats else values
    empty=sum(row.count(0) for row in seats)
    tail=check_output.splitlines()[-1] if check_output.splitlines() else ""
    valid=rows==seats and bool(re.search(r"(?<![0-9])"+str(empty)+r"(?![0-9])",tail))
elif check_id=="ex03":
    a=[[1,2,3],[4,5,6],[7,8,9]];b=[[9,8,7],[6,5,4],[3,2,1]]
    result=[[sum(a[i][k]*b[k][j] for k in range(3)) for j in range(3)] for i in range(3)]
    valid=values==[a,b,result] or values==a+b+result
elif check_id=="ex04":
    valid=values==[{2:3,4:1,3:2}]
elif check_id=="ex05":
    expected=[{"Ben"},{"Anna","Ben","Cara","David","Ella"},{"Anna","Cara"}]*2
    valid=len(values)==6 and all(isinstance(v,(list,tuple,set)) and len(v)==len(e) and set(v)==e for v,e in zip(values,expected))
elif check_id=="ex06":
    n=int(json.loads(check_inputs)[0]);expected={x:[d for d in range(1,x+1) if x%d==0] for x in range(1,n+1)}
    valid=bool(values) and values[0]==expected
else: valid=False
valid
`);
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
