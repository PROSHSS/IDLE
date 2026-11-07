/* Testes de integração: node tests.cjs (requer Playwright e Chromium). */
const {chromium}=require('playwright');
const path=require('node:path');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
new (require('node:vm').Script)(source.match(/<script>([\s\S]*?)<\/script>/)[1]);
const url='file://'+path.join(__dirname,'index.html');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:360,height:800},isMobile:true,hasTouch:true,offline:true});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const test=async(name,run)=>{await run();console.log('✓ '+name);};
 const reset=()=>page.evaluate(()=>{closeModal();state=fresh();state.tutorial=6;tab='shop';ingredients=[];render();});
 await page.goto(url);
 await test('Arquivo único funciona sem rede e possui as quantidades de conteúdo',async()=>{
  assert.equal(await page.evaluate(()=>UPGRADES.length),40);assert.ok(await page.evaluate(()=>EVENTS.length>=40));assert.equal(await page.evaluate(()=>RECIPES.length),14);assert.equal(await page.evaluate(()=>ACHIEVEMENTS.length),25);assert.ok(await page.evaluate(()=>PERMANENTS.length>=10));
  assert.equal((source.match(/<(?:script|link|img)[^>]+(?:src|href)=["']https?:/g)||[]).length,0);
 });
 await test('Tutorial de seis passos, primeira reposição e primeira melhoria',async()=>{
  await page.locator('[data-action="tutorial"]').click();await page.locator('[data-action="tutorial"]').click();await page.locator('[data-action="restock"][data-id="bread"]').click();
  await page.evaluate(()=>{gain(50,true);});await page.locator('[data-tab="upgrades"]').click();await page.locator('[data-action="upgrade"][data-id="shelf"]').click();await page.locator('[data-tab="team"]').click();await page.locator('[data-tab="story"]').click();assert.equal(await page.evaluate(()=>state.tutorial),6);
 });
 await reset();
 await test('Todas as abas abrem e layout cabe em 360 px',async()=>{
  for(const t of ['shop','team','upgrades','recipes','story','more']){await page.locator('[data-tab="'+t+'"]').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,t);}
  await page.locator('[data-tab="shop"]').click();await page.screenshot({path:path.join(__dirname,'mobile.png'),fullPage:true});
 });
 await test('Vendas passivas, energia, reservinha e estoque sem valores negativos',async()=>{
  const result=await page.evaluate(()=>{for(let i=0;i<60;i++)tick(.5,true);const sales=state.stats.sales;state.money=0;state.energy=10;state.queue=[];for(const p of PRODUCTS)state.stock[p.id]=0;tick(1,true);document.querySelector('[data-action="reserve"]').click();return{sales,money:state.money,energy:state.energy,negative:Object.values(state.stock).some(v=>v<0)};});assert.ok(result.sales>0);assert.ok(result.money>=80);assert.equal(result.energy,9);assert.equal(result.negative,false);
 });
 await test('Salvar, validar, exportar e importar sem perder a partida',async()=>{
  const money=await page.evaluate(()=>{state.money=1234;state.queue=[];save();return state.money;});await page.reload();assert.ok(Math.abs(await page.evaluate(()=>state.money)-money)<2);
  await page.locator('[data-tab="more"]').click();await page.locator('[data-action="export"]').click();const code=await page.locator('#save-text').inputValue();assert.ok(code.length>100);await page.locator('[data-action="close"]').click();await page.locator('[data-action="import"]').click();await page.locator('#save-text').fill('partida inválida');await page.locator('[data-action="import-confirm"]').click();assert.ok(await page.locator('#import-error').innerText());await page.locator('#save-text').fill(code);await page.locator('[data-action="import-confirm"]').click();assert.ok(Math.abs(await page.evaluate(()=>state.money)-money)<3);
 });
 await test('Validação recusa NaN, IDs estranhos e valores fora de intervalo',async()=>{
  const rejected=await page.evaluate(()=>{const mutations=[s=>s.money=NaN,s=>s.energy=-1,s=>s.queue=[{type:'intruso',product:'bread',wait:0}],s=>s.upgrades.falso=1,s=>s.recipes=[999],s=>s.staff.rita.level=4,s=>s.schedule[0]=['rita'],s=>s.pending={kind:'closing',decisions:[0,1,2]},s=>s.stock.bread=-5,s=>s.day=1.5];return mutations.map(change=>{const s=fresh();change(s);try{validate(s);return false;}catch{return true;}});});assert.ok(rejected.every(Boolean));
 });
 await test('Save corrompido não trava e não é sobrescrito automaticamente',async()=>{
  await page.evaluate(()=>localStorage.setItem(KEY,'{quebrado'));await page.reload();assert.equal(await page.locator('[data-action="corrupt-new"]').count(),1);assert.equal(await page.evaluate(()=>localStorage.getItem(KEY)),'{quebrado');await page.locator('[data-action="corrupt-new"]').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(KEY)).version),1);
 });
 await reset();
 await test('Progresso offline tem limite de 8 horas e eficiência de 50%',async()=>{
  const r=await page.evaluate(()=>{const result=applyOffline(3600*12);return{result,time:state.totalTime,valid:!!validate(state)};});assert.equal(r.result.seconds,28800);assert.equal(r.time,14400);assert.equal(r.valid,true);assert.ok(r.result.days>=120);
 });
 await test('Eventos e fechamento pausam o relógio, inclusive offline',async()=>{
  const r=await page.evaluate(()=>{state.pending={kind:'event',id:'dog'};const t=state.totalTime;tick(10);const offline=applyOffline(10000);showPending();return{paused:state.totalTime===t,offline};});assert.equal(r.paused,true);assert.equal(r.offline,null);await page.locator('[data-action="event-skip"]').click();
  await page.evaluate(()=>{state.elapsed=state.dayLength;endDay();});assert.equal(await page.locator('[data-action="decision"]').count(),3);const before=await page.evaluate(()=>state.day);await page.locator('[data-action="decision"]').first().click();assert.equal(await page.evaluate(()=>state.day),before+1);
 });
 await test('Eventos respeitam capítulo e intervalo de dez dias',async()=>{
  const r=await page.evaluate(()=>{state=fresh();state.tutorial=6;state.totalTime=400;state.day=20;state.chapter=1;const ids=[];for(let i=0;i<80;i++){nextEvent();if(state.pending){ids.push(state.pending.id);state.pending=null;closeModal();}}return{unique:new Set(ids).size===ids.length,right:ids.every(id=>!EVENTS.find(e=>e.id===id).chapter)};});assert.ok(r.unique);assert.ok(r.right);
 });
 await reset();
 await test('Equipe tem escala, afinidades, três níveis e oito sinergias reais',async()=>{
  const r=await page.evaluate(()=>{state.money=1e6;state.totalTime=2000;for(const s of STAFF){state.staff[s.id]={hired:true,level:3,mood:90,unhappy:0,warned:false};}for(const u of RULES)state.upgrades[u.id]=1;const active=[];for(const s of SYNERGIES){state.schedule[0]=[s.staff];if(synergy(s.id))active.push(s.id);}state.schedule[0]=['rita','neuza'];const conflict=serviceInterval();state.schedule[0]=['rita'];const solo=serviceInterval();return{n:active.length,conflict,solo,skills:STAFF.every(s=>s.abilities.length===3)};});assert.equal(r.n,8);assert.ok(r.conflict>r.solo);assert.ok(r.skills);
 });
 await test('Melhorias exclusivas mostram motivo e não podem ser compradas juntas',async()=>{
  const r=await page.evaluate(()=>{state.upgrades={solar:1};return upgradeReason(RULES.find(u=>u.id==='diesel'));});assert.match(r,/Exclusivo/);
 });
 await reset();
 await test('Todas as receitas são descobertas pelas combinações corretas',async()=>{
  const r=await page.evaluate(()=>{state.money=10000;state.totalTime=2000;state.letters=[10];tab='recipes';for(const r of RECIPES){ingredients=[...r.ingredients];render();document.querySelector('[data-action="cook"]').click();}return{count:state.recipes.length,money:state.money};});assert.equal(r.count,14);assert.ok(r.money>=0);
 });
 await test('Puzzle sempre tem quatro peças de cada tipo e pode ser resolvido por trocas',async()=>{
  await reset();const r=await page.evaluate(()=>{state.energy=20;let generated=true;for(let round=0;round<30;round++){state.puzzleCooldown=0;startPuzzle();generated=generated&&[0,1,2,3].every(v=>puzzle.filter(x=>x===v).length===4);puzzle=null;closeModal();state.energy=20;}state.puzzleCooldown=0;startPuzzle();for(let i=0;i<16&&puzzle;i++){const wanted=Math.floor(i/4);if(puzzle[i]!==wanted){const j=puzzle.findIndex((v,k)=>k>i&&v===wanted);selectedCell=i;document.querySelector('[data-action="puzzle-cell"][data-id="'+j+'"]').click();}}return{generated,won:state.stats.puzzles,bonus:state.bonusTime,organized:state.flags.organized};});assert.ok(r.generated);assert.equal(r.won,1);assert.equal(r.bonus,60);assert.ok(r.organized);
 });
 await test('Encomendas e treinamentos alteram regras de entrega',async()=>{
  const r=await page.evaluate(()=>{state.pending=null;state.order={product:'bread',amount:5,reward:100,accepted:true,due:state.day+1};state.stock.bread=20;state.staff.tiao={hired:true,level:3,mood:90,unhappy:0,warned:false};state.schedule[shift()]=['tiao'];state.upgrades.orders=1;const before=state.money;tick(.1,true);return{orders:state.stats.orders,paid:state.money-before};});assert.ok(r.orders>=1);assert.ok(r.paid>=200);
 });
 await reset();
 await test('Anúncio de energia é opcional, dura 3 segundos e recompensa uma vez',async()=>{
  await page.evaluate(()=>{state.energy=0;render();});await page.locator('[data-action="ad-energy"]').click();assert.equal(await page.evaluate(()=>state.energy),0);await page.waitForFunction(()=>modal!=='ad');assert.equal(await page.evaluate(()=>state.energy),10);assert.ok(await page.locator('[data-action="ad-energy"]').isDisabled());
 });
 await test('Os dois finais funcionam e o prestígio preserva apenas o legado',async()=>{
  for(const ending of ['community','business']){
   const result=await page.evaluate(ending=>{closeModal();state=fresh();state.tutorial=6;state.money=10000;state.rep=250;state.totalTime=20000;state.chapter=5;state.letters=LETTERS.map(v=>v.id);state.recipes=RECIPES.map(v=>v.id);state.permanent=['hire','recipe','heritage'];state.pending={kind:'final'};finishStory(ending);const achieved=state.ending;showPrestige();const before=state.seals;restart('ghost');return{achieved,seals:state.seals>before,staff:state.staff.rita.hired,recipes:state.recipes.sort(),letters:state.letters.length,money:state.money,mod:state.modifier,prestiges:state.prestiges};},ending);
   assert.equal(result.achieved,ending);assert.ok(result.seals);assert.ok(result.staff);assert.deepEqual(result.recipes,[0,3,5]);assert.equal(result.letters,0);assert.equal(result.money,60);assert.equal(result.mod,'ghost');assert.equal(result.prestiges,1);
  }
 });
 await test('Formatação brasileira e nenhum identificador HTML duplicado',async()=>{
  const r=await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return{numbers:[num(1234),num(12300),num(1.2e6),num(1.2e9),num(1.2e12),num(1e16)],unique:new Set(ids).size===ids.length};});assert.deepEqual(r.numbers,['1.234','12,3 mil','1,2 mi','1,2 bi','1,2 tri','1,00e+16']);assert.ok(r.unique);
 });
 await test('Exclusão exige duas confirmações antes de apagar',async()=>{
  await reset();await page.evaluate(()=>{state.money=12345;render();});await page.locator('[data-tab="more"]').click();await page.locator('[data-action="delete-1"]').click();assert.equal(await page.evaluate(()=>state.money),12345);await page.locator('[data-action="delete-2"]').click();assert.equal(await page.evaluate(()=>state.money),12345);await page.locator('[data-action="delete-final"]').click();assert.equal(await page.evaluate(()=>state.money),60);
 });
 await test('Layout desktop e botão de fonte grande',async()=>{
  await page.setViewportSize({width:1280,height:900});await page.locator('[data-tab="more"]').click();await page.locator('[data-action="option"][data-id="large"]').click();assert.ok(await page.locator('body').evaluate(e=>e.classList.contains('large')));await page.locator('[data-tab="shop"]').click();await page.screenshot({path:path.join(__dirname,'desktop.png'),fullPage:true});
 });
 const blocked=await browser.newContext({offline:true});await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Bloqueado','SecurityError');}}));const p2=await blocked.newPage();p2.on('pageerror',e=>errors.push(e.message));await p2.goto(url);
 await test('Bloqueio de localStorage mantém o jogo funcionando',async()=>{assert.match(await p2.locator('#storage-warning').innerText(),/bloqueou/);await p2.locator('[data-action="tutorial"]').click();await p2.evaluate(()=>save());assert.equal(await p2.evaluate(()=>state.tutorial),1);});
 const debug=await context.newPage();debug.on('pageerror',e=>errors.push(e.message));await debug.goto(url+'?debug=1');await test('Modo debug oferece aceleração, caixa e salto de dia',async()=>{assert.equal(await debug.locator('#debug [data-action]').count(),3);await debug.locator('[data-action="debug-speed"]').click();assert.equal(await debug.evaluate(()=>debugSpeed),10);});
 assert.deepEqual(errors,[]);console.log('Todos os testes passaram; sem erros JavaScript no navegador.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
