const PYTHON = "import json\nimport ast, contextlib, io, re\ndef reject(call, label):\n    try:\n        call()\n    except ValueError:\n        return\n    raise AssertionError(\"Expected ValueError: \" + label)\n\ndef run_check(code, checks):\n    syntax = rules = False\n    out = io.StringIO()\n    try:\n        tree = ast.parse(code)\n        compiled = compile(tree, \"<solution>\", \"exec\")\n        syntax = True\n        banned = (ast.Import, ast.ImportFrom, ast.Break, ast.Continue, ast.ListComp, ast.DictComp, ast.SetComp, ast.GeneratorExp, ast.Lambda)\n        shortcuts = {\"sum\", \"min\", \"max\", \"sorted\", \"sort\", \"gcd\", \"map\", \"filter\", \"eval\", \"exec\", \"__import__\"}\n        for node in ast.walk(tree):\n            if isinstance(node, banned):\n                raise ValueError(\"Disallowed syntax: \" + type(node).__name__)\n            if isinstance(node, ast.Call) and getattr(node.func, \"id\", getattr(node.func, \"attr\", \"\")) in shortcuts:\n                raise ValueError(\"Use an explicit algorithm instead of a shortcut.\")\n        rules = True\n        ns = {\"__name__\": \"__main__\"}\n        with contextlib.redirect_stdout(out):\n            exec(compiled, ns)\n            if checks:\n                exec(checks, {\"ns\": ns, \"io\": io, \"contextlib\": contextlib, \"reject\": reject})\n            ns.clear()\n        return True, out.getvalue(), {\"syntax\": syntax, \"rules\": rules}\n    except Exception as error:\n        return False, type(error).__name__ + \": \" + (str(error) or \"A required behavior did not match.\") + \"\\n\" + out.getvalue(), {\"syntax\": syntax, \"rules\": rules}\n";
importScripts("https://cdn.jsdelivr.net/pyodide/v0.29.0/full/pyodide.js");
let runtime;
onmessage = async ({data}) => {
  try {
    if (!runtime) { runtime = await loadPyodide(); runtime.runPython(PYTHON); }
    postMessage({ready:true});
    runtime.globals.set("source", data.source);
    runtime.globals.set("checks", data.checks);
    const result = JSON.parse(runtime.runPython("json.dumps(run_check(source, checks))"));
    postMessage({result});
  } catch (e) { postMessage({error:String(e)}); }
};
