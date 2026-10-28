import { buildDiagnosisReport } from '/diagnosis-model.js';

const state={company:{name:'美的集团',thscode:'000333.SZ',companyType:'manufacturing'},question:'增长放缓是否伴随经营质量下降？',bundle:null,report:null};
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const directionLabels={positive:'正面',negative:'负面',conflicting:'矛盾',missing:'缺失'};
const epistemicLabels={fact:'客观事实',inference:'分析推断',unverified:'暂时无法验证'};
let requestSequence=0;

async function api(path){const response=await fetch(path,{headers:{accept:'application/json'}});const body=await response.json().catch(()=>({error:{message:'响应无法读取'}}));if(!response.ok)throw new Error(body.error?.message||`HTTP ${response.status}`);return body}
function setStatus(text,tone=''){const node=$('task-status');node.textContent=text;node.className=`status ${tone}`}
function availabilityLabel(value){return({available:'数据可用',partial:'部分可用',unavailable:'暂不可用'})[value]||value}

function renderDiagnosisReport(report){
  state.report=report;
  $('scope-list').innerHTML=report.selectedDimensions.map(item=>`<li><b>${item.priority}</b><div><strong>${esc(item.label)}</strong><p>${esc(item.relevanceReason)}</p></div><span>${availabilityLabel(item.availability)}</span></li>`).join('');
  $('summary-text').textContent=report.summary;
  $('limitations').innerHTML=report.limitations.length?`<strong>限制条件</strong><ul>${report.limitations.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'';
  const grouped=report.selectedDimensions.map(dimension=>({dimension,items:report.propositions.filter(x=>x.dimension===dimension.dimension)}));
  const cards=items=>items.length?items.map(item=>`<article class="proposition ${item.evidenceDirection}"><div class="tag-row"><span class="direction ${item.evidenceDirection}">证据方向：${directionLabels[item.evidenceDirection]}</span><span class="epistemic">认知状态：${epistemicLabels[item.epistemicStatus]}</span></div><h4>${esc(item.title)}</h4><p>${esc(item.statement)}</p><button data-proposition="${item.id}" aria-expanded="false">查看结论依据</button></article>`).join(''):`<article class="proposition missing"><div class="tag-row"><span class="direction missing">证据方向：缺失</span><span class="epistemic">认知状态：暂时无法验证</span></div><p>该维度当前没有可验证命题。</p></article>`;
  $('proposition-groups').innerHTML=grouped.map(({dimension,items},index)=>index<3?`<section class="dimension-group"><header><span>优先级 ${dimension.priority}</span><h3>${esc(dimension.label)}</h3><p>${esc(dimension.relevanceReason)}</p></header><div>${cards(items)}</div></section>`:`<details class="dimension-group supplementary"><summary><span>优先级 ${dimension.priority}</span><strong>${esc(dimension.label)}</strong><small>${esc(dimension.relevanceReason)}</small></summary><div>${cards(items)}</div></details>`).join('');
  $('verification-list').innerHTML=report.verificationQuestions.map(x=>`<li>${esc(x)}</li>`).join('');
}

function periodText(period){if(!period)return'未取得';if(period.start)return`${period.start} 至 ${period.end}`;return`${period.end}（${({half_year_cumulative:'半年度累计',year_to_date:'年初至报告期末累计',fiscal_year:'年度'})[period.periodType]||period.periodType}）`}
function evidenceMarkup(ref){const evidence=state.report?.evidence.find(x=>x.id===ref);if(!evidence)return`<li>${esc(ref)}：未取得</li>`;return`<li><strong>${esc(evidence.label)}</strong><span>${esc(evidence.value??'—')} ${esc(evidence.unit)}</span><small>原始字段：${esc(evidence.fieldName)} · 期次/区间：${esc(periodText(evidence.period))} · 来源：${esc(evidence.source.provider)} · 请求编号：${esc(evidence.source.requestId||'无')} · 口径：${esc(evidence.scope)}${evidence.adjustment?` · 复权：${evidence.adjustment==='forward_adjusted'?'前复权':esc(evidence.adjustment)}`:''} · 新鲜度：${esc(evidence.freshness)}</small></li>`}
function calculationMarkup(item){const refs=new Set(item.evidenceRefs);return(state.report?.calculations||[]).filter(x=>x.inputEvidenceIds.some(ref=>refs.has(ref))).map(x=>`<li><strong>${esc(x.metricName)}</strong><span>${esc(x.formula)} = ${esc(x.result)} ${esc(x.unit)}</span><small>输入：${x.inputEvidenceIds.map(esc).join('、')} · 舍入：${esc(x.roundingRule)}</small></li>`).join('')||'<li>该命题未使用额外计算。</li>'}
function openProposition(id,button){const item=state.report?.propositions.find(x=>x.id===id);if(!item)return;document.querySelectorAll('[data-proposition]').forEach(x=>x.setAttribute('aria-expanded',String(x===button)));$('drawer-content').innerHTML=`<h2 id="drawer-title">${esc(item.title)}</h2><dl class="trace-list"><div><dt>诊断命题</dt><dd>${esc(item.statement)}</dd></div><div><dt>证据方向</dt><dd>${directionLabels[item.evidenceDirection]}</dd></div><div><dt>认知状态</dt><dd>${epistemicLabels[item.epistemicStatus]}</dd></div></dl><h3>原始字段</h3><ul class="evidence-list">${item.evidenceRefs.map(evidenceMarkup).join('')||'<li>当前没有可验证字段。</li>'}</ul><h3>计算过程</h3><ul class="evidence-list">${calculationMarkup(item)}</ul><h3>来源与口径</h3><p>每条证据分别列出来源、时点、单位、口径、字段与请求编号。</p><h3>限制条件</h3><p>${item.limitations.map(esc).join('；')||'无额外限制'}</p>`;drawer('evidence-drawer',true)}
function drawer(id,open){const node=$(id);const opener=document.querySelector('[data-proposition][aria-expanded="true"]');node.classList.toggle('open',open);node.setAttribute('aria-hidden',String(!open));if(open)node.querySelector('.drawer-close')?.focus();else{opener?.focus();document.querySelectorAll('[data-proposition]').forEach(x=>x.setAttribute('aria-expanded','false'))}}

async function loadResearch(){const requestId=++requestSequence;const company={...state.company};const question=state.question;setStatus('正在获取财务与行情数据。');try{const bundle=await api(`/api/research?thscode=${encodeURIComponent(company.thscode)}`);if(requestId!==requestSequence)return;state.bundle=bundle;const report=buildDiagnosisReport(bundle,company,question);renderDiagnosisReport(report);const partial=Object.values(bundle.modules||{}).some(x=>x.status!=='ok');setStatus(partial?'部分数据获取失败，相关命题已标记为缺失。':'数据已更新。',partial?'warning':'ok');$('freshness').textContent=`数据生成于 ${new Date(bundle.generatedAt).toLocaleString('zh-CN')}`}catch(error){if(requestId!==requestSequence)return;const empty={generatedAt:null,modules:{market:{status:'error'},financials:{status:'error'},indicators:{status:'error'}}};renderDiagnosisReport(buildDiagnosisReport(empty,company,question));setStatus('数据获取失败。页面仅显示缺失项，不生成推断。','error');$('freshness').textContent='数据获取失败'}}
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
