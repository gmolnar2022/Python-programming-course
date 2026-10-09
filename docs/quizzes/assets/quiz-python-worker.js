'use strict';
// Isolated Python execution: the parent terminates this worker on timeout.
importScripts('https://cdn.jsdelivr.net/pyodide/v0.29.0/full/pyodide.js');
let py=null, pendingInput=new Map();
async function ready(){if(!py)py=await loadPyodide();return py;}
self.onmessage=async ({data:m})=>{
 if(m.type==='input'){const fn=pendingInput.get(m.id);if(fn){pendingInput.delete(m.id);fn(String(m.value));}return;}
 if(m.type!=='execute'&&m.type!=='structure')return;
 try{
  const p=await ready();self.postMessage({type:'ready',id:m.id});
  if(m.type==='structure'){
   p.globals.set('_quiz_structure_src',m.code);
   const x=p.runPython(`import ast\ntry:\n t=ast.parse(_quiz_structure_src)\n has_loop=any(isinstance(n,ast.While) for n in ast.walk(t))\n has_mod=any(isinstance(n,ast.BinOp) and isinstance(n.op,ast.Mod) for n in ast.walk(t))\n has_builtin=any(isinstance(n,ast.Call) and ((isinstance(n.func,ast.Attribute) and n.func.attr=='gcd') or (isinstance(n.func,ast.Name) and n.func.id=='gcd')) for n in ast.walk(t))\n has_update=sum(isinstance(n,ast.Assign) for n in ast.walk(t))>=3\n has_loop and has_mod and has_update and not has_builtin\nexcept SyntaxError:\n False`);
   self.postMessage({type:'done',id:m.id,result:Boolean(x)});return;
  }
  p.globals.set('student_code',String(m.code));
  p.globals.set('student_inputs_json',JSON.stringify((m.inputs||[]).map(String)));
  p.globals.set('student_interactive',!!m.interactive);
  p.globals.set('student_output',(chunk)=>self.postMessage({type:'output',id:m.id,chunk:String(chunk)}));
  p.globals.set('student_prompt_async',(prompt)=>new Promise(resolve=>{pendingInput.set(m.id,resolve);self.postMessage({type:'prompt',id:m.id,prompt:String(prompt)});}));
  const result=await p.runPythonAsync(`
import json,builtins,io,contextlib,ast,inspect
async def _run(src, vals):
    it=iter(json.loads(vals)); out=io.StringIO()
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
