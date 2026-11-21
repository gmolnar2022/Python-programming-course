'use strict';
(() => {
  const el = id => document.getElementById('w09-' + id);
  const KEY = 'midterm02-practice-azure-v1';
  const DURATION = 45 * 60 * 1000;
  const workerUrl = new URL('assets/week09-practice-worker.js', document.baseURI);
  const API = 'https://itarch-backend-fpdsf6brfpanf5d8.northeurope-01.azurewebsites.net/api/';
  const QUIZ = 'midterm02-practice';
  async function request(route, payload) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const r = await fetch(API + route, {method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({quizId:QUIZ,...payload}),signal:controller.signal,cache:'no-store'});
      const d = await r.json().catch(()=>null);
      if (!r.ok || !d?.success) throw Error(d?.error || 'The practice service is unavailable.');
      return d;
    } finally { clearTimeout(timer); }
  }
  let state = null, busy = false, away = false;
  const editors = [], outputs = [], runButtons = [], radios = [];
  const add = (parent, tag, text) => {
    const item = document.createElement(tag);
    if (text !== undefined) item.textContent = text;
    parent.append(item);
    return item;
  };
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch { el('message').textContent = 'Browser storage is unavailable; keep this page open to retain the attempt.'; }
  }
  function restore() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Number.isFinite(s.deadline) && s.answers.length === 10 && s.code.length === 3) return s;
    } catch {}
    return null;
  }
  W09_THEORY.forEach(([prompt, choices], i) => {
    const card = add(el('theory'), 'section'); card.className = 'w09-card';
    add(card, 'h3', 'Question ' + (i + 1) + ' (1 point)');
    add(card, 'p').innerHTML = prompt; // Static authored markup.
    radios.push(choices.map((choice, j) => {
      const label = add(card, 'label'), input = add(label, 'input');
      input.type = 'radio'; input.name = 'w09-question-' + i;
      label.append(document.createTextNode(' ' + choice));
      input.onchange = () => { if (locked()) return; state.answers[i] = j; save(); };
      return input;
    }));
  });
  const supplied = [
    'The runner provides stops. Do not define or replace it. Build the dictionary totals; no print() is required.',
    'Only define count_changes(values). The runner supplies values and calls the function for you. Do not add a call or print the result.',
    'The runner creates deliveries.txt. Open it for reading and store the result in result. Do not upload or create a file.'
  ];
  W09_TASKS.forEach((task, i) => {
    const card = add(el('tasks'), 'details'); card.className = 'w09-card';
    add(card, 'summary', 'Question ' + (i + 11) + ' — ' + task.title + ' (4 points)');
    add(card, 'p').innerHTML = task.desc; // Static authored markup.
    const runner = add(card, 'p');
    add(runner, 'strong', 'Provided by the runner: ');
    runner.append(document.createTextNode(supplied[i]));
    const examples = add(card, 'details'); add(examples, 'summary', 'Example'); add(examples, 'pre', task.example);
    if (task.hint) {
      const hints = add(card, 'details'); add(hints, 'summary', 'Optional hint'); add(hints, 'p', task.hint);
    }
    const label = add(card, 'label', 'Python code');
    const editor = add(label, 'textarea'); editor.spellcheck = false;
    editor.oninput = () => { if (locked()) return; state.code[i] = editor.value; save(); }; editors.push(editor);
    const button = add(card, 'button', 'Run example'); button.type = 'button'; runButtons.push(button);
    const output = add(card, 'pre'); output.setAttribute('role','status'); outputs.push(output);
    button.onclick = async () => {
      if (!state || busy || locked()) return;
      setBusy(true); output.textContent = 'Running example…';
      try {
        const result = await execute(i, state.code[i], [task.cases[0]]);
        const c = result.cases?.[0];
        output.textContent = result.error || c?.error ||
          (c.passed ? 'Example passed.' : 'Example did not match.') +
          '\nResult: ' + c.actual + (c.output ? '\nPrinted output:\n' + c.output : '');
      } finally { setBusy(false); }
    };
  });
  function execute(task, code, cases) {
    if (!code.trim()) return Promise.resolve({error:'No code entered.'});
    return new Promise(resolve => {
      let worker, timer;
      function finish(result) { clearTimeout(timer); worker?.terminate(); resolve(result); }
      try {
        worker = new Worker(workerUrl);
        timer = setTimeout(() => finish({error:'Python did not load in time.',unavailable:true}), 45000);
        worker.onerror = () => finish({error:'Could not load the Python worker.',unavailable:true});
        worker.onmessage = ({data}) => {
          if (!data.ready) return finish(data);
          clearTimeout(timer);
          timer = setTimeout(() => finish({error:'Execution timed out. Check your loops.',timeout:true}), 4000);
        };
        worker.postMessage({task, code, cases});
      } catch { finish({error:'Could not start the Python worker.',unavailable:true}); }
    });
  }
  function locked() { return state.finished || Date.now() >= state.deadline; }
  function setBusy(value) { busy = value; tick(); }
  function tick() {
    if (!state) return;
    const remaining = Math.max(0, Math.ceil((state.deadline-Date.now())/1000));
    el('timer').textContent = [Math.floor(remaining/60), remaining%60].map(n=>String(n).padStart(2,'0')).join(':');
    el('answers').disabled = locked();
    runButtons.forEach(b => b.disabled = busy || locked());
    el('evaluate').disabled = busy || Boolean(state.result && !state.result.unavailable);
    el('evaluate').textContent = state.result?.unavailable ? 'Retry evaluation' : 'Evaluate my work';
    el('restart').disabled = busy;
    el('retry-save').hidden = !state.finished || Boolean(state.cloud);
    el('retry-save').disabled = busy;
    if (!state.finished && !remaining && !busy) el('message').textContent = 'Time is up. Your answers are locked. Select Evaluate my work now to submit within the two-minute grace period.';
  }
  function show() {
    el('intro').hidden = true; el('work').hidden = false;
    radios.forEach((choices,i)=>choices.forEach((input,j)=>{ input.checked = state.answers[i] === j; }));
    editors.forEach((editor,i)=>{editor.value = state.code[i]; outputs[i].textContent = '';});
    el('warning').hidden = true; el('message').textContent = '';
    updateSwitches(); showResult(); tick();
  }
  async function start() {
    if (busy) return;
    const neptun = el('neptun').value.trim().toUpperCase();
    const message = el('start-message');
    if (!/^[A-Z0-9]{6}$/.test(neptun)) { message.textContent = 'Enter your six-character Neptun code.'; return; }
    busy = true; el('start').disabled = true; el('restart').disabled = true;
    message.textContent = 'Starting practice attempt…';
    try {
      const d = await request('startQuizPractice02',{neptun});
      state = {deadline:Date.parse(d.deadline), attemptId:d.attemptId, sessionToken:d.sessionToken, neptun,
        answers:Array(10).fill(null),code:W09_TASKS.map(t=>t.starter),switches:0,finished:false};
      away = false; save(); show();
    } catch (e) {
      message.textContent = e.message;
      if (state) el('message').textContent = e.message;
    } finally { el('start').disabled = false; setBusy(false); }
  }
  async function submitCloud() {
    if (state.cloud) return;
    const answers = {}, code = {};
    state.answers.forEach((v,i)=>{if(v!==null) answers[i+1]='abcd'[v];});
    state.code.forEach((v,i)=>{code[i+11]=v;});
    try {
      state.cloud = await request('submitQuizPractice02',{neptun:state.neptun,attemptId:state.attemptId,
        sessionToken:state.sessionToken,answers,code,switches:state.switches});
      delete state.cloudError;
    } catch (e) { state.cloudError = e.message; }
    save();
  }
  function updateSwitches() { el('switches').textContent = 'Detected tab/window departures: ' + state.switches; }
  function departure() {
    if (!state || locked() || away) return;
    away = true; state.switches++; save(); updateSwitches();
    el('warning').textContent = 'Tab/window departure detected. Your attempt continues and the timer is still running.';
    el('warning').hidden = false;
  }
  window.addEventListener('blur', departure);
  window.addEventListener('focus', ()=>{ if (!document.hidden) away = false; });
  document.addEventListener('visibilitychange', ()=>{
    if (document.hidden) departure();
    else if (document.hasFocus()) away = false;
  });
  function showResult() {
    const box = el('result'); box.replaceChildren();
    if (state.cloud) {
      add(box,'p','Submission saved in Azure. Server theory score: '+state.cloud.theory.score+'/10.');
      const ai = state.cloud.ai;
      if (ai?.status === 'ready') {
        const fold = add(box,'details');
        add(fold,'summary','AI feedback (estimate, separate from automated checks)');
        add(fold,'pre',ai.feedback);
      } else add(box,'p','AI feedback is currently unavailable. Your submission was saved.');
    } else if (state.cloudError) add(box,'p','Azure did not confirm the submission: '+state.cloudError);
    if (!state.result) return;
    const r = state.result;
    add(box,'h2','Practice results');
    add(box,'p','Theory: '+r.theory+'/10 · Python: '+(r.unavailable ? 'incomplete' : r.python+'/12')+
      (r.unavailable ? '' : ' · Total: '+(r.theory+r.python)+'/22'));
    if (r.unavailable) add(box,'p','The Python runner was unavailable for at least one exercise. Those exercises have no score. Select Retry evaluation to try again.');
    if (state.switches) add(box,'p',state.switches+' tab/window departure(s) detected. Browser focus events can include accidental departures; no points were deducted.');
    const theory = add(box,'details'); add(theory,'summary','Theory answer key');
    W09_THEORY.forEach(([, choices, correct, note],i)=>{
      const status = state.answers[i] === null ? 'Unanswered' : state.answers[i] === correct ? 'Correct' : 'Incorrect';
      add(theory,'p',(i+1)+'. '+status+' — '+choices[correct]+' '+note);
    });
    r.tasks.forEach((result,i)=>{
      const details = add(box,'details');
      add(details,'summary','Q'+(i+11)+' · '+(result.unavailable ? 'Not scored' : result.points+'/4'));
      if (result.error) add(details,'p',result.error);
      (result.cases||[]).forEach((c,j)=>add(details,'p','Check '+(j+1)+': '+(c.passed?'Passed':c.error||'Did not match (received '+c.actual+').')));
      if (!r.unavailable) {
        const solution = add(details,'details'); add(solution,'summary','Sample solution'); add(solution,'pre',W09_TASKS[i].solution);
      }
    });
  }
  el('evaluate').onclick = async () => {
    if (busy || (state.result && !state.result.unavailable)) return;
    if (!locked() && !confirm('Finish this attempt and show the results? Your answers will be locked.')) return;
    state.finished = true; save(); setBusy(true);
    const theory = W09_THEORY.filter((q,i)=>q[2]===state.answers[i]).length;
    const tasks = [];
    const cloud = submitCloud();
    try {
      for (const [i, task] of W09_TASKS.entries()) {
        el('message').textContent = 'Checking question '+(i+11)+'…';
        const r = await execute(i,state.code[i],task.cases);
        tasks.push({...r,points:r.cases?.filter(c=>c.passed).length||0});
      }
      state.result = {theory,tasks,python:tasks.reduce((sum,r)=>sum+r.points,0),unavailable:tasks.some(r=>r.unavailable)};
      save(); showResult();
      if (!state.cloud && !state.cloudError) el('message').textContent = 'Waiting for Azure and AI feedback…';
      await cloud; showResult(); el('message').textContent = '';
    } finally { setBusy(false); }
  };
  el('retry-save').onclick = async () => {
    if (busy || !state.finished || state.cloud) return;
    setBusy(true); el('message').textContent = 'Submitting to Azure…';
    try { await submitCloud(); showResult(); el('message').textContent = ''; }
    finally { setBusy(false); }
  };
  el('start').onclick = start;
  el('restart').onclick = ()=>{if(!busy && confirm('Discard this attempt and start again?')) start();};
  state = restore();
  if (state) { el('neptun').value = state.neptun; show(); }
  setInterval(tick, 250);
})();
