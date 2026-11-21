'use strict';
importScripts('https://cdn.jsdelivr.net/pyodide/v0.29.0/full/pyodide.js');
const runtime = String.raw`
import ast, builtins, contextlib, copy, io, json, os, tempfile

class Output(io.StringIO):
    def write(self, text):
        if self.tell() + len(text) > 10000:
            raise RuntimeError("Output limit exceeded.")
        return super().write(text)

def policy(tree):
    forbidden = (ast.Import, ast.ImportFrom, ast.Break, ast.Continue,
                 ast.ListComp, ast.DictComp, ast.SetComp, ast.GeneratorExp, ast.Lambda)
    shortcuts = {"sum", "min", "max", "sorted", "sort", "count", "index",
                 "any", "all", "map", "filter", "eval", "exec", "compile", "__import__"}
    for node in ast.walk(tree):
        if isinstance(node, forbidden):
            raise ValueError("Use explicit loops and conditions; forbidden syntax: " + type(node).__name__)
        if isinstance(node, ast.Call):
            name = getattr(node.func, "id", getattr(node.func, "attr", ""))
            if name in shortcuts:
                raise ValueError("Do not use " + name + "() in this test.")

def run_case(code, task, case):
    data = copy.deepcopy(case.get("data"))
    if task == 0:
        data = [tuple(row) for row in data]
    before = copy.deepcopy(data)
    namespace = {"__name__": "__main__"}
    if task == 0:
        namespace["stops"] = data
    expected = case["expected"]
    if task == 2:
        expected = tuple(expected)
    output = Output()
    with tempfile.TemporaryDirectory(prefix="week09-practice-") as directory:
        fixture = os.path.join(directory, "deliveries.txt")
        if task == 2:
            with open(fixture, "w", encoding="utf-8", newline="") as file:
                file.write(case["file"])
        def practice_open(name, mode="r", *args, **kwargs):
            if task != 2 or name != "deliveries.txt" or mode not in ("r", "rt"):
                raise ValueError("Only deliveries.txt may be opened, in text read mode.")
            return open(fixture, mode, *args, **kwargs)
        namespace["__builtins__"] = dict(vars(builtins), open=practice_open)
        try:
            with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
                exec(code, namespace, namespace)
                if task == 0:
                    actual = namespace["totals"]
                elif task == 1:
                    length_before_call = output.tell()
                    actual = namespace["count_changes"](data)
                    if output.tell() != length_before_call:
                        raise ValueError("Return the result without printing inside count_changes().")
                else:
                    actual = namespace["result"]
            same_type = type(actual) is type(expected)
            if task == 0 and same_type:
                same_type = all(type(v) is int for v in actual.values())
            if task == 2 and same_type:
                same_type = len(actual) == 2 and type(actual[0]) is int and type(actual[1]) is type(expected[1])
            passed = same_type and actual == expected and data == before
            return {"passed": passed, "actual": repr(actual)[:500], "output": output.getvalue()}
        except Exception as error:
            return {"passed": False, "error": (type(error).__name__ + ": " + str(error))[:500]}

def run_request(payload):
    request = json.loads(payload)
    try:
        tree = ast.parse(request["code"])
        policy(tree)
        code = compile(tree, "<practice>", "exec")
    except Exception as error:
        return json.dumps({"error": str(error)[:500]})
    return json.dumps({"cases": [run_case(code, request["task"], case) for case in request["cases"]]})
`;
self.onmessage = async ({data}) => {
  try {
    const python = await loadPyodide();
    python.runPython(runtime);
    python.globals.set('practice_payload', JSON.stringify(data));
    self.postMessage({ready:true});
    self.postMessage(JSON.parse(python.runPython('run_request(practice_payload)')));
  } catch (error) { self.postMessage({error:String(error.message || error), unavailable:true}); }
};
