import { buildDiagnosisReport } from '/diagnosis-model.js';

const state={company:{name:'美的集团',thscode:'000333.SZ',companyType:'manufacturing'},question:'增长放缓是否伴随经营质量下降？',bundle:null,report:null};
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const directionLabels={positive:'正面',negative:'负面',conflicting:'矛盾',missing:'缺失'};
const epistemicLabels={fact:'客观事实',inference:'分析推断',unverified:'暂时无法验证'};

async function api(path){const response=await fetch(path,{headers:{accept:'application/json'}});const body=await response.json().catch(()=>({error:{message:'响应无法读取'}}));if(!response.ok)throw new Error(body.error?.message||`HTTP ${response.status}`);return body}
function setStatus(text,tone=''){const node=$('task-status');node.textContent=text;node.className=`status ${tone}`}
function availabilityLabel(value){return({available:'数据可用',partial:'部分可用',unavailable:'暂不可用'})[value]||value}

function renderDiagnosisReport(report){
  state.report=report;
  $('scope-list').innerHTML=report.selectedDimensions.map(item=>`<li><b>${item.priority}</b><div><strong>${esc(item.label)}</strong><p>${esc(item.relevanceReason)}</p></div><span>${availabilityLabel(item.availability)}</span></li>`).join('');
  $('summary-text').textContent=report.summary;
  $('limitations').innerHTML=report.limitations.length?`<strong>限制条件</strong><ul>${report.limitations.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'';
  const topDimensions=new Set(report.selectedDimensions.slice(0,3).map(x=>x.dimension));
  const grouped=report.selectedDimensions.slice(0,3).map(dimension=>({dimension,items:report.propositions.filter(x=>x.dimension===dimension.dimension)}));
  $('proposition-groups').innerHTML=grouped.map(({dimension,items})=>`<section class="dimension-group"><header><span>优先级 ${dimension.priority}</span><h3>${esc(dimension.label)}</h3><p>${esc(dimension.relevanceReason)}</p></header><div>${items.length?items.map(item=>`<article class="proposition ${item.evidenceDirection}"><div class="tag-row"><span class="direction ${item.evidenceDirection}">证据方向：${directionLabels[item.evidenceDirection]}</span><span class="epistemic">认知状态：${epistemicLabels[item.epistemicStatus]}</span></div><h4>${esc(item.title)}</h4><p>${esc(item.statement)}</p><button data-proposition="${item.id}" aria-expanded="false">查看结论依据</button></article>`).join(''):`<article class="proposition missing"><div class="tag-row"><span class="direction missing">证据方向：缺失</span><span class="epistemic">认知状态：暂时无法验证</span></div><p>该维度当前没有可验证命题。</p></article>`}</div></section>`).join('');
  $('verification-list').innerHTML=report.verificationQuestions.map(x=>`<li>${esc(x)}</li>`).join('');
  void topDimensions;
}

function openProposition(id,button){const item=state.report?.propositions.find(x=>x.id===id);if(!item)return;document.querySelectorAll('[data-proposition]').forEach(x=>x.setAttribute('aria-expanded',String(x===button)));$('drawer-content').innerHTML=`<h2 id="drawer-title">${esc(item.title)}</h2><dl class="trace-list"><div><dt>诊断命题</dt><dd>${esc(item.statement)}</dd></div><div><dt>证据方向</dt><dd>${directionLabels[item.evidenceDirection]}</dd></div><div><dt>认知状态</dt><dd>${epistemicLabels[item.epistemicStatus]}</dd></div><div><dt>证据引用</dt><dd>${item.evidenceRefs.map(esc).join('、')||'未取得'}</dd></div><div><dt>限制条件</dt><dd>${item.limitations.map(esc).join('；')||'无额外限制'}</dd></div></dl>`;drawer('evidence-drawer',true)}
function drawer(id,open){const node=$(id);node.classList.toggle('open',open);node.setAttribute('aria-hidden',String(!open));if(open)node.querySelector('.drawer-close')?.focus();else document.querySelector('[data-proposition][aria-expanded="true"]')?.focus()}

async function loadResearch(){setStatus('正在获取财务与行情数据。');try{state.bundle=await api(`/api/research?thscode=${encodeURIComponent(state.company.thscode)}`);const report=buildDiagnosisReport(state.bundle,state.company,state.question);renderDiagnosisReport(report);const partial=Object.values(state.bundle.modules||{}).some(x=>x.status!=='ok');setStatus(partial?'部分数据获取失败，相关命题已标记为缺失。':'数据已更新。',partial?'warning':'ok');$('freshness').textContent=`数据生成于 ${new Date(state.bundle.generatedAt).toLocaleString('zh-CN')}`}catch(error){console.error('research request failed',error);const empty={generatedAt:null,modules:{market:{status:'error'},financials:{status:'error'},indicators:{status:'error'}}};renderDiagnosisReport(buildDiagnosisReport(empty,state.company,state.question));setStatus('数据获取失败。页面仅显示缺失项，不生成推断。','error');$('freshness').textContent='数据获取失败'}}
async function searchStocks(){const query=$('stock-search').value.trim();if(!query)return;const box=$('search-results');box.hidden=false;box.textContent='正在查找';try{const result=await api(`/api/search?q=${encodeURIComponent(query)}`);box.innerHTML=result.items.map(item=>`<button data-code="${item.thscode}" data-name="${esc(item.name||item.ticker)}">${esc(item.name||item.ticker)} <small>${item.thscode}</small></button>`).join('')||'未找到 A 股公司'}catch(error){box.textContent=`查找失败：${error.message}`}}

$('search-button').addEventListener('click',searchStocks);
$('stock-search').addEventListener('keydown',event=>{if(event.key==='Enter')searchStocks()});
$('search-results').addEventListener('click',event=>{const button=event.target.closest('[data-code]');if(!button)return;state.company={name:button.dataset.name,thscode:button.dataset.code};$('stock-search').value=button.dataset.name;$('search-results').hidden=true;loadResearch()});
$('run-diagnosis').addEventListener('click',()=>{state.question=$('research-question').value.trim()||'请说明研究问题';loadResearch()});
document.querySelectorAll('[data-question]').forEach(button=>button.addEventListener('click',()=>{$('research-question').value=button.dataset.question;state.question=button.dataset.question;loadResearch()}));
$('diagnosis-map').addEventListener('click',event=>{const button=event.target.closest('[data-proposition]');if(button)openProposition(button.dataset.proposition,button)});
$('method-button').addEventListener('click',()=>drawer('method-modal',true));
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>drawer(button.closest('.drawer').id,false)));
document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('.drawer.open').forEach(node=>drawer(node.id,false))});
loadResearch();
