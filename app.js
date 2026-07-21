
var RATE = {"nonbiz": {"승용(국산)": {"내용연수": "20년", "rates": [0.826, 0.725, 0.614, 0.518, 0.437, 0.368, 0.311, 0.262, 0.221, 0.186, 0.157, 0.132, 0.112, 0.094, 0.079, 0.067, 0.063, 0.06, 0.057, 0.053, 0.05]}, "승용(외산)": {"내용연수": "20년", "rates": [0.842, 0.729, 0.605, 0.5, 0.412, 0.34, 0.281, 0.232, 0.172, 0.142, 0.117, 0.097, 0.08, 0.066, 0.054, 0.05, 0.048, 0.046, 0.044, 0.042, 0.04]}, "승합": {"내용연수": "20년", "rates": [0.81, 0.726, 0.609, 0.51, 0.426, 0.357, 0.298, 0.25, 0.215, 0.184, 0.157, 0.134, 0.113, 0.096, 0.081, 0.067, 0.058, 0.056, 0.054, 0.052, 0.05]}, "화물": {"내용연수": "20년", "rates": [0.761, 0.671, 0.597, 0.51, 0.426, 0.357, 0.298, 0.259, 0.229, 0.2, 0.172, 0.149, 0.128, 0.11, 0.098, 0.086, 0.065, 0.063, 0.062, 0.06, 0.058]}}, "etc": {"승용자동차": {"용도": "영업용", "내용연수": "4년", "rates": [0.779, 0.618, 0.348, 0.196, 0.1]}, "승합자동차": {"용도": "영업용", "내용연수": "7년", "rates": [0.82, 0.644, 0.514, 0.367, 0.288, 0.215, 0.17, 0.1]}, "화물자동차": {"용도": "영업용", "내용연수": "7년", "rates": [0.702, 0.561, 0.5, 0.377, 0.28, 0.242, 0.172, 0.1]}, "이륜자동차": {"용도": "영업 및 비영업용", "내용연수": "6년", "rates": [0.717, 0.562, 0.455, 0.316, 0.215, 0.147, 0.1]}}};
var VEH = null, vehLoading = false;

function koParse(s){
  s=(s||'').replace(/[,\s원]/g,'');
  if(!/[억만천]/.test(s)) return null;
  var total=0,m;
  if((m=s.match(/(\d+(?:\.\d+)?)억/))){ total+=parseFloat(m[1])*1e8; s=s.replace(m[0],''); }
  if((m=s.match(/(\d+(?:\.\d+)?)천만/))){ total+=parseFloat(m[1])*1e7; s=s.replace(m[0],''); }
  if((m=s.match(/(\d+(?:\.\d+)?)만/))){ total+=parseFloat(m[1])*1e4; s=s.replace(m[0],''); }
  if((m=s.match(/(\d+(?:\.\d+)?)천/))){ total+=parseFloat(m[1])*1e3; s=s.replace(m[0],''); }
  if((m=s.match(/^\d+/))) total+=parseInt(m[0],10);
  return total>0?Math.round(total):null;
}
function koRead(n){
  if(!n||n<10000) return '';
  var eok=Math.floor(n/1e8), man=Math.floor((n%1e8)/1e4), rest=n%1e4;
  var s='';
  if(eok) s+=eok.toLocaleString('ko-KR')+'억 ';
  if(man) s+=man.toLocaleString('ko-KR')+'만 ';
  if(rest) s+=rest.toLocaleString('ko-KR');
  return s.trim()+'원';
}
function fmt(el){
  var kv=koParse(el.value);
  if(kv!==null){ el.value=kv.toLocaleString('ko-KR'); }
  else { var v=el.value.replace(/[^0-9]/g,''); el.value=v?Number(v).toLocaleString('ko-KR'):''; }
  // 금액 입력(money-wrap)에만 한글 단위 병기
  var wrap=el.parentNode;
  if(wrap && wrap.classList && wrap.classList.contains('money-wrap')){
    var echo=wrap.nextElementSibling;
    if(!echo || !echo.classList || !echo.classList.contains('ko-echo')){
      echo=document.createElement('div'); echo.className='ko-echo';
      wrap.parentNode.insertBefore(echo, wrap.nextSibling);
    }
    var num=Number(el.value.replace(/[^0-9]/g,''))||0;
    echo.textContent=koRead(num);
    echo.style.display=echo.textContent?'':'none';
  }
}
function numv(id){return Number((document.getElementById(id).value||'').replace(/[^0-9]/g,''))||0;}
function won(n){return Math.floor(n).toLocaleString('ko-KR');}
function pick(group,v,cb){document.querySelectorAll('#'+group+' button').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.v===v);});if(cb)cb();}
/* 실무 체크리스트 + 다음 추천 계산 */
var WORKLIST={
  deung:['등기 원인·과세표준(등록 당시 가액) 확인','대도시 중과 해당 여부 및 제외 업종 확인(령 §26①)','법인 설립·증자 최저세액 112,500원 적용 여부','등기 접수 전 신고·납부 완료(§30)'],
  car:['취득일·신고기한(60일) 확인','과세표준(신고가액 vs 시가표준액) 확인','차종·영업용 여부 확인','감면 대상·요건 충족 여부 확인','공동명의·지분율 확인'],
  machine:['취득일·신고기한(60일) 확인','기종·등록대상 여부 확인','과세표준(취득가액 vs 시가표준액) 확인','지방교육세·농특세 해당 여부 확인'],
  moto:['취득일·신고기한(60일) 확인','배기량(50cc 이상) 과세대상 확인','과세표준·면세점(50만원) 확인'],
  auto:['영업용·비영업용 구분 확인','연납 신청 여부 확인','말소·이전등록 여부(일할 대상) 확인','차령(연식) 기산일 확인','비과세·감면 대상 여부 확인']
};
var NEXTCALC={
  jae:[['취득세 계산','chwi'],['등록면허세','deung']],
  deung:[['취득세 계산','chwi'],['신고납부분 가산세','shingo']],
  car:[['자동차세 계산','보유 중 매년 내는 세금',"enter('auto')"],['신고납부분 가산세','기한 넘겼을 때',"enter('shingo')"],['다른 차량 계산','입력 초기화',"resetInputs()"]],
  machine:[['고지분 체납 가산세','고지서 미납 시',"enter('gozi')"],['자동차 취득세','승용·승합·화물',"enter('chwi','car')"]],
  moto:[['자동차세 계산','125cc 초과 과세',"enter('auto')"],['자동차 취득세','승용·승합·화물',"enter('chwi','car')"]],
  auto:[['자동차 취득세','취득 시 1회 납부',"enter('chwi','car')"],['고지분 체납 가산세','자동차세 미납 시',"enter('gozi')"]]
};
function worklistHtml(k){
  var items=WORKLIST[k]||[];
  if(!items.length) return '';
  return '<div class="worklist"><div class="wl-h">실무 확인사항</div>'+
    items.map(function(t,i){return '<label><input type="checkbox"><span>'+t+'</span></label>';}).join('')+'</div>';
}
function nextCalcHtml(k){
  var items=NEXTCALC[k]||[];
  if(!items.length) return '';
  return '<div class="nextcalc"><div class="nc-h">다음으로 많이 하는 계산</div>'+
    items.map(function(x){return '<a onclick="'+x[2]+'"><span><b style="font-weight:600">'+x[0]+'</b> <span style="color:var(--muted);font-size:12px;margin-left:6px">'+x[1]+'</span></span><span class="nc-ar">→</span></a>';}).join('')+'</div>';
}

function pressed(group){var b=document.querySelector('#'+group+' button[aria-pressed="true"]');return b?b.dataset.v:null;}
function sw(m){
  ['chwi','auto','deung','jae','gozi','shingo','faq'].forEach(function(x){
    var el=document.getElementById('m-'+x);
    el.classList.toggle('hidden',x!==m);
    document.getElementById('t-'+x).setAttribute('aria-selected',x===m);
    if(x===m){ el.classList.remove('anim'); void el.offsetWidth; el.classList.add('anim'); }
  });
  if(m!=='chwi') updateSticky('',null);
}

/* ═══════════════════════════════════════════════════════
   세율·기준 데이터 (연 1회 개정 시 이 블록만 수정)
   ═══════════════════════════════════════════════════════ */
var TAX_RULES = {
  effectiveFrom: '2026-01-01',
  version: '2026.01',
  reviewedAt: '2026-07-19',

  // 취득세 (지방세법 §12)
  acqVehicle: {         // 자동차
    passengerNonBiz: 0.07,   // 비영업 승용
    etcNonBiz:       0.05,   // 비영업 승합·화물
    compact:         0.04,   // 경형(경차)
    commercial:      0.04    // 영업용
  },
  acqMachine:  { registered: 0.03, unregistered: 0.02 },  // 기계장비 §12①3
  acqMoto:     { rate: 0.02, exemptUnder: 500000 },        // 이륜 (면세점 50만)
  acqExemptUnder: 500000,   // 취득세 면세점 (과표 50만 이하)

  // 부가세 (§10)
  eduTax: 0.20,             // 지방교육세 (등록면허세·취득세 등 20%)
  ruralTax: 0.10,           // 농어촌특별세 (2% 적용세액의 10%)
  machineEduBase: 0.02,     // 기계장비 교육세 기준(표준세율-2%)

  // 차령 감면 (자동차세, 비영업 승용)
  ageRelief: { startYear: 3, perYear: 0.05, max: 0.50 },

  // 가산세 (§20, 신고납부분)
  penalty: { noReport: 0.20, lateDaily: 0.00022, reportDeadlineDays: 60 }
};

/* ---------- 재산세 (주택) · 지방세법 §110~§113 ---------- */
var HOUSING=null, HOUSING_LOADING=false;
function loadHousing(cb){
  if(HOUSING){ cb&&cb(); return; }
  if(HOUSING_LOADING) return;
  HOUSING_LOADING=true;
  fetch('housing.json?v=2026.01').then(function(r){return r.json();}).then(function(d){
    HOUSING=d; HOUSING_LOADING=false; cb&&cb();
  }).catch(function(){ HOUSING_LOADING=false;
    var el=document.getElementById('j-addr-list'); if(el) el.innerHTML='<div class="addr-empty">주소 데이터를 불러오지 못했습니다. 공시가격을 직접 입력하세요.</div>';
  });
}
function jaeAddrSearch(){
  var q=(document.getElementById('j-addr').value||'').trim();
  var list=document.getElementById('j-addr-list');
  if(q.length<1){ list.innerHTML=''; list.classList.remove('on'); return; }
  loadHousing(function(){
    var qn=q.replace(/\s+/g,'');
    var hits=[];
    for(var i=0;i<HOUSING.length && hits.length<30;i++){
      var r=HOUSING[i];
      var full=(r.d+r.j).replace(/\s+/g,'');
      if(full.indexOf(qn)>=0) hits.push(r);
    }
    if(!hits.length){ list.innerHTML='<div class="addr-empty">일치하는 주소가 없습니다. 공시가격을 직접 입력하세요.</div>'; list.classList.add('on'); return; }
    list.innerHTML=hits.map(function(r){
      var multi=r.n?' <span class="addr-multi">'+r.n+'세대</span>':'';
      return '<button class="addr-item" onclick="jaePick(\''+r.d+'\',\''+r.j+'\','+r.p+')">'
        +'<span class="addr-name">'+r.d+' '+r.j+multi+'</span>'
        +'<span class="addr-price">'+won(r.p)+'원</span></button>';
    }).join('');
    list.classList.add('on');
  });
}
function jaePick(dong, jibun, price){
  document.getElementById('j-addr').value=dong+' '+jibun;
  var g=document.getElementById('j-gongsi'); g.value=won(price); 
  document.getElementById('j-addr-list').classList.remove('on');
  document.getElementById('j-gongsi-hint').innerHTML='<b>'+dong+' '+jibun+'</b> · 2026년 개별주택가격 적용가격입니다.';
  jaeCalc();
}
/* 주택 재산세 누진세율 (지방세법 §111①3 / 특례 §111의2) */
function jaeRate(base, one){
  if(!one){
    if(base<=60000000) return {tax:base*0.001, desc:'0.1%'};
    if(base<=150000000) return {tax:60000+(base-60000000)*0.0015, desc:'6만원 + 6천만 초과분 0.15%'};
    if(base<=300000000) return {tax:195000+(base-150000000)*0.0025, desc:'19.5만원 + 1.5억 초과분 0.25%'};
    return {tax:570000+(base-300000000)*0.004, desc:'57만원 + 3억 초과분 0.4%'};
  } else {
    if(base<=60000000) return {tax:base*0.0005, desc:'특례 0.05%'};
    if(base<=150000000) return {tax:30000+(base-60000000)*0.001, desc:'특례 3만원 + 6천만 초과분 0.1%'};
    if(base<=300000000) return {tax:120000+(base-150000000)*0.002, desc:'특례 12만원 + 1.5억 초과분 0.2%'};
    return {tax:420000+(base-300000000)*0.0035, desc:'특례 42만원 + 3억 초과분 0.35%'};
  }
}
function jaeCalc(){
  var box=document.getElementById('j-result');
  var gongsi=numv('j-gongsi');
  if(!gongsi){ box.innerHTML=EMPTY.jae; window._RESULTTEXT=''; return; }
  var one=pressed('j-one')==='yes';
  var urban=document.getElementById('j-urban').checked;
  var shareRaw=Number(document.getElementById('j-share').value)||100;
  var shareOver=shareRaw>100;
  var share=Math.max(0,Math.min(100,shareRaw));

  // 1세대 1주택 9억 초과면 특례 배제
  var oneApplied=one && gongsi<=900000000;
  var ratio=0.60;  // 2026 주택 공정시장가액비율
  var base=Math.floor(gongsi*ratio);
  var rr=jaeRate(base, oneApplied);
  var tax=Math.floor(rr.tax/10)*10;
  var urbanTax=urban?Math.floor(base*0.0014/10)*10:0;
  var edu=Math.floor(tax*0.20/10)*10;
  var sum=tax+urbanTax+edu;
  // 지분 안분
  var sh=share/100;
  var taxS=Math.floor(tax*sh/10)*10, urbanS=Math.floor(urbanTax*sh/10)*10, eduS=Math.floor(edu*sh/10)*10;
  var sumS=taxS+urbanS+eduS;

  var h=appliedHtml([
    ['공시가격', won(gongsi)+'원'],
    ['공정시장가액비율', '60% (2026 주택)'],
    ['1세대 1주택 특례', one?(oneApplied?'적용':'배제 (9억 초과)'):'미적용'],
    ['도시지역분', urban?'적용 (0.14%)':'미적용'],
    ['지분율', share+'%'],
    ['근거', '지방세법 §110~§113']
  ]);
  if(shareOver) h='<div class="warn" style="margin-bottom:14px"><b>지분율 100% 초과</b> — 입력값('+shareRaw+'%)을 100%로 조정해 계산했습니다.</div>'+h;

  h+='<div class="receipt-head">지방세 산정 결과 (참고용)</div>';
  // 과세표준 결정 과정
  h+='<div class="derive"><div class="dv-h">과세표준 결정</div>'
    +'<div class="drow"><span>공시가격</span><span>'+won(gongsi)+'원</span></div>'
    +'<div class="drow"><span>× 공정시장가액비율 60%</span><span>'+won(base)+'원</span></div>'
    +'<div class="dv-note">주택 과세표준 = 공시가격 × 60% (2026년 공정시장가액비율, 지방세법 시행령 §109).</div></div>';

  h+='<div class="row"><div class="rk">과세표준<small>공시가격 × 60%</small></div><div class="rv">'+won(base)+' 원</div></div>';
  h+='<div class="row"><div class="rk">재산세 본세<small>'+rr.desc+' · §111'+(oneApplied?'의2':'')+'</small></div><div class="rv">'+won(taxS)+' 원</div></div>';
  if(urban) h+='<div class="row"><div class="rk">도시지역분<small>과세표준 × 0.14% · §112</small></div><div class="rv">'+won(urbanS)+' 원</div></div>';
  h+='<div class="row"><div class="rk">지방교육세<small>재산세 본세 × 20% · §151</small></div><div class="rv">'+won(eduS)+' 원</div></div>';
  h+='<div class="total"><span class="tk">연간 재산세 합계</span><span class="tv">'+won(sumS)+'<small>원</small></span></div>';
  h+='<div class="docs" style="margin-top:24px"><h4>참고</h4><ul style="margin:6px 0 0;padding-left:16px;font-size:12px;color:var(--muted);line-height:1.85;">'
    +'<li>과세기준일은 <b>6월 1일</b>이며, 그날 소유자에게 그해 재산세가 부과됩니다.</li>'
    +'<li>주택분은 <b>7월(1/2)·9월(1/2)</b>에 나눠 부과되며, 본세 20만원 이하면 7월에 전액 부과됩니다.</li>'
    +'<li>세부담상한(공시가격 3억 이하 105% 등)·지역자원시설세는 별도이며, 최종 고지액은 위택스에서 확정됩니다.</li>'
    +'</ul></div>';
  // 분납 시뮬레이션
  h+=jaeInstallmentHtml(sumS);
  h+=nextCalcHtml('jae');
  box.innerHTML=h; addLeaders(box); animateTotals(box);
  window._RESULTTEXT=box.innerText;
}
/* 재산세 납부유예 (§118의2) — 요건 체크 + 이자상당가산액 */
function toggleDefer(){
  var p=document.getElementById('defer-panel'), btn=document.getElementById('defer-btn');
  var open=p.style.display==='none';
  p.style.display=open?'':'none';
  btn.classList.toggle('on',open);
  btn.childNodes[0].nodeValue=open?'－ 납부유예 알아보기 ':'＋ 납부유예 알아보기 ';
  if(open){ 
    document.querySelectorAll('.dq').forEach(function(c){c.onchange=deferVerdict;});
    deferVerdict();
  }
}
function deferVerdict(){
  var boxes=document.querySelectorAll('.dq');
  var checked=0; boxes.forEach(function(c){if(c.checked)checked++;});
  var v=document.getElementById('defer-verdict');
  if(checked===6){
    v.innerHTML='<b class="ok">6개 요건 모두 충족</b> — 납부기한 만료 3일 전까지 신청할 수 있습니다.';
    v.className='defer-verdict pass';
  } else {
    v.innerHTML='충족 <b>'+checked+' / 6</b> — 모든 요건을 충족해야 신청 가능합니다.';
    v.className='defer-verdict';
  }
}
function deferCalc(){
  var amt=numv('df-amt'), days=Number((document.getElementById('df-days').value||'').replace(/[^0-9]/g,''))||0;
  var box=document.getElementById('df-result');
  if(!amt || !days){ box.innerHTML=''; return; }
  var rate=0.031;  // 연 3.1‰ (국기법시행령 §43의3② · 2026.3.20 현재)
  var interest=Math.floor(amt*days*rate/365);
  box.innerHTML='<div class="dfr-row"><span>계산식</span><span class="mono">'+won(amt)+' × '+days+'일 × 3.1‰ ÷ 365</span></div>'
    +'<div class="dfr-row"><span>이자상당가산액</span><span class="mono">'+won(interest)+'원</span></div>'
    +'<div class="dfr-total"><span>총 징수액</span><span class="mono">'+won(amt+interest)+'원</span></div>'
    +'<div class="dfr-note">유예 취소 시(양도·사망·요건 상실 등) 당초 납부기한 다음 날부터 취소일까지 이자율 <b>연 3.1‰</b>로 가산 징수됩니다(§⑤).</div>';
}

/* 재산세 분납 안내 — 7·9월 정기분할(§115) + 250만원 초과 분납(§118) */
function jaeInstallmentHtml(total){
  var h='<div class="installment"><div class="inst-h">분납 안내</div>';
  // 7·9월 정기 분할 (주택분 20만원 초과)
  if(total<=200000){
    h+='<div class="inst-row"><span>정기 분할</span><span>세액 20만원 이하 → <b>7월 전액</b></span></div>';
  } else {
    var half1=Math.floor(total/2/10)*10, half2=total-half1;
    h+='<div class="inst-row"><span>7월 (1기분)</span><span class="mono">'+won(half1)+'원</span></div>';
    h+='<div class="inst-row"><span>9월 (2기분)</span><span class="mono">'+won(half2)+'원</span></div>';
  }
  // 250만원 초과 신청분납 (§118)
  if(total>2500000){
    var deferrable = total<=5000000 ? total-2500000 : Math.floor(total*0.5/10)*10;
    h+='<div class="inst-div"></div>';
    h+='<div class="inst-row"><span>신청 분납 가능액<small>250만원 초과 · §118</small></span><span class="mono">'+won(deferrable)+'원</span></div>';
    h+='<div class="inst-note">납부기한 내 신청 시 <b>납부기한 다음 날부터 3개월 이내</b> 분납. '
      +(total<=5000000?'500만원 이하는 250만원 초과분':'500만원 초과는 세액의 50% 이하')+'을 나눕니다.</div>';
  }
  h+='</div>';
  return h;
}

/* ---------- 등록면허세 (등록분) · 지방세법 §28 ---------- */
var DEUNG={
  realty:[
    {v:'bojon',  t:'소유권 보존',            rate:.008, base:'부동산 가액',     law:'§28①1가'},
    {v:'trans',  t:'소유권 이전 — 유상',      rate:.02,  base:'부동산 가액',     law:'§28①1나1)'},
    {v:'free',   t:'소유권 이전 — 무상(증여)', rate:.015, base:'부동산 가액',     law:'§28①1나2)'},
    {v:'inherit',t:'소유권 이전 — 상속',      rate:.008, base:'부동산 가액',     law:'§28①1나2) 단서'},
    {v:'mortg',  t:'저당권 설정·이전',        rate:.002, base:'채권금액',       law:'§28①1다2)'},
    {v:'jeonse', t:'전세권 설정·이전',        rate:.002, base:'전세금액',       law:'§28①1다4)'},
    {v:'ground', t:'지상권 설정·이전',        rate:.002, base:'부동산 가액',     law:'§28①1다1)'},
    {v:'lease',  t:'임차권 설정·이전',        rate:.002, base:'월 임대차금액',   law:'§28①1다5)'},
    {v:'provis', t:'가압류·가처분·가등기',     rate:.002, base:'채권금액 또는 부동산 가액', law:'§28①1마'},
    {v:'etc',    t:'그 밖의 등기',            flat:6000,                        law:'§28①1바'}
  ],
  corp:[
    {v:'estab',  t:'영리법인 설립·합병·자본증가', rate:.004, base:'납입 자본금·출자가액', min:112500, heavy:true, law:'§28①6가'},
    {v:'nprof',  t:'비영리법인 설립·출자증가',    rate:.002, base:'납입 출자총액·재산가액', min:112500, heavy:true, law:'§28①6나'},
    {v:'hqmove', t:'본점·주사무소 이전 (일반)',    flat:112500,                     law:'§28①6라'},
    {v:'hqin',   t:'본점·주사무소 대도시 전입 (설립 의제)', rate:.004, base:'납입 자본금·출자가액', min:112500, forceHeavy:true, law:'§28②2'},
    {v:'branch', t:'지점·분사무소 설치',          flat:40200,  heavy:true,         law:'§28①6마'},
    {v:'chg',    t:'그 밖의 변경등기 (자본 증가 없음)', flat:40200,                law:'§28①6바'}
  ],
  car:[
    {v:'mortg', t:'저당권 설정·이전',        rate:.002, base:'채권금액',   law:'§28①9나'},
    {v:'etc',   t:'그 밖의 등록 (명의변경 등)', flat:15000,               law:'§28①9다'}
  ],
  machine:[
    {v:'mortg',  t:'저당권 설정·이전',        rate:.002, base:'채권금액', law:'§28①8나'},
    {v:'etc',    t:'그 밖의 등록',            flat:15000,               law:'§28①8다'}
  ]
};
function onDeungKind(){
  var k=pressed('d-kind'), sel=document.getElementById('d-type');
  var carNote=document.getElementById('d-car-note');
  if(carNote) carNote.style.display = (k==='car')?'':'none';
  var cbox=document.getElementById('d-constr-box');
  if(cbox) cbox.classList.toggle('hidden', k!=='machine');
  sel.innerHTML=DEUNG[k].map(function(o){return '<option value="'+o.v+'">'+o.t+'</option>';}).join('');
  deungCalc();
}
function deungItem(){
  var k=pressed('d-kind'), v=document.getElementById('d-type').value;
  var list=DEUNG[k]; for(var i=0;i<list.length;i++){ if(list[i].v===v) return list[i]; }
  return list[0];
}
function deungCalc(){
  var box=document.getElementById('d-result'), o=deungItem();
  var isFlat=!!o.flat;
  document.getElementById('d-base-box').classList.toggle('hidden', isFlat);
  document.getElementById('d-heavy-box').classList.toggle('hidden', !o.heavy);
  if(o.forceHeavy) document.getElementById('d-type-hint').innerHTML='';
  document.getElementById('d-base-lbl').textContent = o.base||'과세표준';
  document.getElementById('d-type-hint').innerHTML = isFlat
    ? '건당 <b>'+won(o.flat)+'원</b> 정액입니다.'
    : (o.forceHeavy
        ? '대도시 밖 → 대도시로 본점을 옮기면 <b>법인 설립으로 보아</b> 정률세율에 3배가 적용됩니다(§28②2). 영리 0.4%×3=<b>1.2%</b> · 비영리는 0.2%×3=0.6%. 건당 112,500원이 아닙니다.'
        : '세율 <b>'+(o.rate*100).toFixed(1)+'%</b> · 과세표준: '+o.base);

  var heavy = o.forceHeavy ? true : (o.heavy && document.getElementById('d-heavy').checked);
  var tax=0, base=0, rate=o.rate||0, note='';
  if(isFlat){
    tax=o.flat; if(heavy){ tax=o.flat*3; note='대도시 중과 3배'; }
  }else{
    base=numv('d-base');
    if(!base){ box.innerHTML=EMPTY.deung; return; }
    if(heavy) rate=o.rate*3;
    tax=Math.floor(base*rate/10)*10;
    if(o.min && tax<o.min){ tax=o.min; note='최저세액 '+won(o.min)+'원 적용'; }
    if(!o.min && tax<6000){ tax=6000; note='그 밖의 등기 세율(6,000원) 적용 (§28① 단서)'; }
  }
  var dk=pressed('d-kind');
  var isDumpMixer = (dk==='machine') && document.getElementById('d-constr') && document.getElementById('d-constr').checked;
  var isCar = (dk==='car') || isDumpMixer;
  var edu=isCar ? 0 : Math.floor(tax*0.2/10)*10;   // 자동차 등록면허세는 지방교육세 제외 (§150 2호 · §124 자동차), 그 외 20% (§151①2)
  var tot=tax+edu;

  var h=appliedHtml([
    ['등기 구분', {realty:'부동산',corp:'법인',machine:'기계장비',car:'자동차'}[pressed('d-kind')]],
    ['등기 종류', o.t],
    ['과세표준', isFlat? '정액' : won(base)+'원'],
    ['적용 세율', isFlat? won(o.flat)+'원(건당)' : (rate*100).toFixed(1)+'%'],
    ['대도시 중과', o.heavy? (heavy?'적용 (3배)':'미적용') : null],
    ['근거', '지방세법 '+o.law]
  ]);
  h+='<div class="receipt-head">지방세 산정 결과 (참고용)</div>';
  if(!isFlat) h+='<div class="row"><div class="rk">과세표준<small>'+o.base+'</small></div><div class="rv">'+won(base)+' 원</div></div>';
  h+='<div class="row"><div class="rk">등록면허세<small>'+(isFlat?'건당 정액':(rate*100).toFixed(1)+'%')+(note?' · '+note:'')+'</small></div><div class="rv">'+won(tax)+' 원</div></div>';
  if(isCar){
    h+='<div class="row sub"><div class="rk">지방교육세<small>'+(dk==='car'?'자동차':'덤프·믹서(자동차세 과세대상 건설기계)')+' 등록면허세는 부과 대상 아님 (§150 2호 · §124)</small></div><div class="rv">해당 없음</div></div>';
  } else {
    h+='<div class="row"><div class="rk">지방교육세<small>등록면허세의 20% (§151①2)</small></div><div class="rv">'+won(edu)+' 원</div></div>';
  }
  h+='<div class="total"><span class="tk">신고·납부할 세액</span><span class="tv">'+won(tot)+'<small>원</small></span></div>';
  h+='<div class="docs" style="margin-top:24px"><h4>참고</h4><ul style="margin:6px 0 0;padding-left:16px;font-size:12px;color:var(--muted);line-height:1.85;">'
   +'<li>등기·등록을 하기 전까지 신고·납부합니다(§30).</li>'
   +'<li>대도시(과밀억제권역) 법인 설립·전입·지점 설치는 <b>3배 중과</b>(§28②). 시행령 §26① 중과 제외 업종은 제외됩니다.</li>'
   +'<li>정률로 산출한 세액이 <b>6,000원</b>보다 적으면 6,000원을 적용합니다(§28① 단서).</li>'
   +(isCar?'<li><b>자동차 등록면허세에는 지방교육세가 부과되지 않습니다</b>(§150 2호 · §124). 부동산·법인·기계장비 등은 20%가 부과됩니다.</li>':'')
   +'</ul></div>';
  h+=worklistHtml('deung')+nextCalcHtml('deung');
  box.innerHTML=h; addLeaders(box); animateTotals(box);
  window._RESULTTEXT=box.innerText;
}

/* ---------- 자동차 취득세 ---------- */
function taxRate(chong,use,light){
  if(use==='영업') return TAX_RULES.acqVehicle.commercial;
  if(light==='1') return TAX_RULES.acqVehicle.compact;
  if(chong==='승용') return TAX_RULES.acqVehicle.passengerNonBiz;
  return TAX_RULES.acqVehicle.etcNonBiz; // 승합·화물 비영업
}
function onTypeUI(){
  var t=pressed('c-type');
  document.getElementById('c-new-box').classList.toggle('hidden',t!=='new');
  document.getElementById('c-report-box').classList.toggle('hidden',t!=='trans');
  document.getElementById('c-siga-box').classList.toggle('hidden',t==='new');
  if(t==='new'){document.getElementById('c-search-box').classList.add('hidden');}
}
function cCalc(){
  onTypeUI(); onRegion();
  var t=pressed('c-type'), chong=pressed('c-chong'), use=pressed('c-use'), light=pressed('c-light');
  var base=0, baseLabel='';
  if(t==='new'){ base=numv('c-supply'); if(pressed('c-vat')==='in') base=Math.floor(base/1.1); baseLabel = pressed('c-vat')==='in'?'부가세 포함가 ÷ 1.1':'공급가액'; }
  else if(t==='trans'){
    var rep=numv('c-report'), sig=numv('c-siga');
    base=Math.max(rep,sig); baseLabel = (rep>=sig&&rep>0)?'신고가액':'시가표준액';
  } else { base=numv('c-siga'); baseLabel='시가표준액'; }

  var box=document.getElementById('c-result');
  if(!base){ box.innerHTML=EMPTY.car+docsHtml(); updateSticky('',null); return; }
  var baseFull=base;
  var shareRaw=Number(document.getElementById('c-share').value);
  var shareOver = shareRaw>100;
  var share=Math.max(0, Math.min(100, shareRaw||0)); if(isNaN(share)||share<=0)share=0; if(share>100)share=100;
  base=Math.floor(baseFull*share/100);
  var rate=taxRate(chong,use,light);
  var exempt50 = base>0 && base<=500000; // 취득세 면세점(취득가액 50만원 이하)
  var acq = exempt50 ? 0 : Math.floor(base*rate/10)*10;
  var g=gamyeon(acq, base, rate); // {reduce, pay, label, note}
  var tot=g.pay;
  var h=stepsHtml([
    {id:'c-acqdate', label:'취득일',   done:!!document.getElementById('c-acqdate').value},
    {id:'c-supply',  label:'취득가액', done:base>0},
    {id:'c-share',   label:'지분율',   done:share>0},
    {id:'gamyeon',   label:'감면',     done:true}
  ]);
  h+='<div class="receipt-head">지방세 산정 결과 (참고용)</div>';
  if(shareOver){ h+='<div class="warn" style="margin-bottom:14px"><b>지분율 100% 초과</b> — 입력값('+shareRaw+'%)을 <b>100%로 조정</b>해 계산했습니다. 공동취득이면 본인 지분만 입력하세요.</div>'; }
  h+=baseDerivationHtml(t);
  if(share<100){
    h+='<div class="row"><div class="rk">전체 과세표준<small>'+baseLabel+'</small></div><div class="rv">'+won(baseFull)+' 원</div></div>';
    h+='<div class="row"><div class="rk">지분 과세표준<small>취득 지분 '+share+'%</small></div><div class="rv">'+won(base)+' 원</div></div>';
  } else {
    h+='<div class="row"><div class="rk">과세표준<small>'+baseLabel+'</small></div><div class="rv">'+won(base)+' 원</div></div>';
  }
  h+='<div class="row"><div class="rk">취득세<small>'+(exempt50?'취득가액 50만원 이하 → 면세점(과세 제외)':'세율 '+(rate*100).toFixed(0)+'%'+(light==='1'?' · 경차':'')+(use==='영업'?' · 영업용':''))+'</small></div><div class="rv">'+won(acq)+' 원</div></div>';
  if(!exempt50) h+='<div class="hint" style="text-align:right;margin-top:2px;">계산식: '+won(base)+'원 × '+(rate*100).toFixed(0)+'% = '+won(acq)+'원</div>';
  h+='<div class="row sub"><div class="rk">지방교육세 · 농어촌특별세<small>자동차 취득분은 비과세(0원)</small></div><div class="rv">0 원</div></div>';
  if(g.reduce>0||g.label){
    h+='<div class="row"><div class="rk" style="color:var(--teal)">감면 ('+g.label+')<small>'+(g.note||'')+'</small></div><div class="rv" style="color:var(--teal)">− '+won(g.reduce)+' 원</div></div>';
    if(g.reduce>0) h+='<div class="hint" style="text-align:right;margin-top:2px;">감면 전 '+won(acq)+'원 → 감면 후 <b>'+won(tot)+'원</b> ('+won(g.reduce)+'원 절감)</div>';
  }
  h+='<div class="total"><span class="tk">신고·납부할 세액</span><span class="tv">'+won(tot)+'<span class="u">원</span></span></div>';
  h+='<div class="info">취득일부터 <b>60일 이내</b> 신고·납부. 기한 초과 시 무신고 20% + 납부지연가산세는 "신고납부분" 탭에서 계산됩니다.</div>';
  if(exempt50){
    var gsel=document.getElementById('c-gamyeon').value;
    var acqPre=Math.floor(base*rate/10)*10;   // 면세점 적용 전 취득세
    var gPre=gamyeon(acqPre, base, rate);      // 그에 감면 적용
    var zeroByGamyeon = gsel!=='none' && gPre.pay===0;  // 감면으로 취득세가 0이 되는가
    if(zeroByGamyeon){
      h+='<div class="warn">취득가액 50만원 이하지만 <b>감면 대상('+(gPre.label||'감면')+')이라 취득세가 0원</b>이므로, 등록면허세도 부과되지 않습니다. <b>따로 납부할 세액이 없습니다.</b></div>';
    } else {
      var lrate = (use==='영업')?0.02 : light==='1'?0.02 : (chong==='승용'?0.05:0.03);
      var lcalc = Math.floor(base*lrate);
      var lreg = Math.max(lcalc, 15000);          // 최저한세 15,000원
      var minApplied = lcalc < 15000;
      var ledu = Math.floor(lreg*0.20/10)*10;     // 지방교육세 20%
      h+='<div class="docs" style="border-color:var(--seal)"><h4>등록면허세(등록) — 취득세 면세점 대체</h4>';
      h+='<div class="sub">취득가액 50만원 이하는 취득세가 비과세(면세점)이나, 차량 등록을 위해 등록면허세가 부과됩니다.</div>';
      h+='<div class="row" style="padding-top:8px"><div class="rk">등록면허세<small>과표 × '+(lrate*100)+'%'+(minApplied?' → 최저한세 15,000원 적용':'')+'</small></div><div class="rv">'+won(lreg)+' 원</div></div>';
      h+='<div class="row"><div class="rk">지방교육세<small>등록면허세 × 20% · 지방세법 §151</small></div><div class="rv">'+won(ledu)+' 원</div></div>';
      h+='<div class="total" style="margin-top:10px"><span class="tk">등록면허세 합계</span><span class="tv" style="font-size:20px">'+won(lreg+ledu)+'<span class="u">원</span></span></div>';
      h+='<div class="sub" style="margin-top:6px">※ 취득세가 감면 등으로 0원인 경우(면세점이 아닌 경우)에는 등록면허세가 부과되지 않습니다. 최종 세액은 위택스에서 확정됩니다.</div></div>';
    }
  }
  if(g.label) h+='<div class="warn">감면액은 참고용입니다. 요건·한도·추징 조건이 있으니 최종 금액은 위택스에서 확정됩니다.</div>';
  var b = share<100 ? null : gongchae(base);
  if(share<100 && document.getElementById('c-region').value!=='none'){
    h+='<div class="docs"><div class="sub">지분 이전(취득 지분 '+share+'%)에서는 채권 매입 계산을 제외했습니다.</div></div>';
  }
  if(b){
    var R=b.R, warnBadge = R.verified ? '<span class="badge">✓ 조례 검증</span>' : '<span class="badge" style="background:var(--seal-soft);color:var(--seal)">⚠ 잠정</span>';
    h+='<div class="docs" style="border-color:'+(R.verified?'var(--line)':'var(--seal)')+'"><h4>'+R.label+' 채권 매입 '+warnBadge+'</h4>';
    h+='<div class="row" style="padding-top:0"><div class="rk">채권 매입액<small>'+(b.rate>0?'과표 × '+(b.rate*100)+'% (5천원 단수 버림)':(b.note||'매입 대상 아님'))+'</small></div><div class="rv" style="color:var(--teal)">'+won(b.amt)+' 원</div></div>';
    if(b.note && b.rate>0) h+='<div class="sub" style="margin-top:6px">'+b.note+'</div>';
    if(!R.verified){
      h+='<div class="sub" style="color:var(--seal)">⚠ 조례 원문 미확인 잠정 요율입니다'+(R.type==='광역시'?' (광역시 도시철도채권은 요율 체계가 달라 특히 확인 필요)':'')+'. 위택스/채권 창구 값과 대조하고, 다르면 해당 조례를 올려주시면 검증값으로 반영합니다.</div>';
    }
    if(b.amt>0) h+='<div class="sub" style="margin-top:6px">이 금액은 <b>세금이 아니라 채권 매입액</b>입니다. 대부분 바로 되팔며(즉시매도), 그때 실제 부담은 은행 할인율만큼이라 매입액보다 훨씬 적습니다.</div>';
    h+='<div class="sub">※ 공채는 취득세와 별개입니다.</div></div>';
    if(b.amt>0){
      h+='<div class="total" style="background:#F4F6F9;border-color:var(--line-strong)"><span class="tk" style="color:var(--ink)">오늘 창구에서 필요한 금액</span><span class="tv" style="color:var(--ink);font-size:20px">'+won(tot)+'<span class="u">＋채권 '+won(b.amt)+'원</span></span></div>';
      h+='<div class="sub" style="text-align:right">취득세 '+won(tot)+'원(납부) + 채권매입 '+won(b.amt)+'원(즉시매도 시 실부담 감소)</div>';
    }
  }
  h+=docsHtml();
  // 신고기한 D-day + 기한 초과 시 가산세 인라인 계산
  var ad=document.getElementById('c-acqdate').value;
  if(ad){
    var due=new Date(ad+'T00:00:00'); due.setDate(due.getDate()+60);
    var adj=adjustDue(due); due=adj.date;
    var today=new Date(); today.setHours(0,0,0,0);
    var dleft=Math.round((due-today)/86400000);
    var dstr=(due.getMonth()+1)+'월 '+due.getDate()+'일'+(adj.moved?' (주말·공휴일 → 다음 평일 보정)':'');
    var payD=new Date(); payD.setHours(0,0,0,0); // 신고·납부일 = 오늘
    if(payD>due && tot>0){
      var days=Math.round((payD-due)/86400000);
      var rp=Math.floor(tot*0.20/10)*10;                       // 무신고 20%
      var interest=tot*0.00022*days, cap=tot*0.75, capped=interest>cap;
      var lp=Math.floor(Math.min(interest,cap)/10)*10;         // 납부지연
      var grand=tot+rp+lp;
      h+='<div class="dday" style="background:var(--seal-soft);color:var(--seal)">⚠ 신고기한('+dstr+')을 <b>'+days+'일</b> 지나 납부 예정 → 가산세가 붙습니다.</div>';
      h+='<div class="docs" style="border-color:var(--seal)"><h4 style="color:var(--seal)">⏱ 가산세 (무신고 기준 자동 계산)</h4>';
      h+='<div class="row" style="padding-top:6px"><div class="rk">본세(감면 후)</div><div class="rv">'+won(tot)+' 원</div></div>';
      h+='<div class="row"><div class="rk">무신고가산세<small>본세 × 20%</small></div><div class="rv">'+won(rp)+' 원</div></div>';
      h+='<div class="row"><div class="rk">납부지연가산세<small>'+days+'일 × 0.022%</small></div><div class="rv">'+won(lp)+' 원</div></div>';
      h+='<div class="total" style="margin-top:8px"><span class="tk">가산세 포함 총 납부액</span><span class="tv" style="color:var(--seal)">'+won(grand)+'<span class="u">원</span></span></div>';
      if(capped)h+='<div class="sub">납부지연가산세가 본세 75% 한도로 조정되었습니다.</div>';
      h+='<div class="sub">※ 무신고(20%) 기준입니다. 과소·부정신고 등 다른 유형은 "신고납부분 가산세" 탭에서 계산합니다.</div></div>';
      window._GRANDTOT=grand;
    } else {
      var msg = '신고·납부 기한: <b>'+dstr+'</b>까지 (D-'+dleft+'). 오늘 신고·납부하면 가산세가 없습니다.';
      h+='<div class="dday">'+msg+'</div>';
      window._GRANDTOT=null;
    }
  } else { window._GRANDTOT=null; }
  h+='<a class="wetax-btn" href="https://www.wetax.go.kr" target="_blank" rel="noopener">위택스에서 신고·조회</a>';
  h+='<div class="result-actions"><button type="button" onclick="saveRecent()">저장</button><button type="button" onclick="copyResult()">복사</button><button type="button" onclick="shareResult()">공유</button><button type="button" onclick="window.print()">인쇄</button></div>';
  h+=appliedHtml([
    ['취득 유형', {new:'신차(신규등록)',trans:'중고차(이전등록)',free:'증여·상속(무상)'}[pressed('c-type')]],
    ['차종', pressed('c-chong')],
    ['용도', pressed('c-use')==='영업'?'영업용':'비영업용'],
    ['차량 규격', pressed('c-light')==='1'?'경형':'일반'],
    ['과세표준', won(base)+'원'],
    ['적용 세율', (rate*100).toFixed(0)+'%'],
    ['지분율', share+'%'],
    ['감면', g.label?g.label:'없음']
  ], document.getElementById('c-acqdate').value||null);
  if(!document.getElementById('c-acqdate').value){
    h+='<div class="info" style="margin-top:12px"><b>취득일 미입력</b> — 세액은 정확합니다. 취득일을 입력하면 <b>신고기한(60일)</b>과 기한 초과 시 <b>가산세</b>가 함께 계산됩니다.</div>';
  } else {
    h+=ddayPenaltyHtml('c-acqdate', tot);
  }
  h+=appliedHtml([
    ['취득 유형', {new:'신차(신규등록)',trans:'중고차(이전등록)',free:'증여·상속(무상)'}[t]],
    ['차종', chong],
    ['용도', use==='영업'?'영업용':'비영업용'],
    ['차량 규격', light==='1'?'경형':'일반'],
    ['과세표준', base? (won(base)+'원 ('+baseLabel+')') : ''],
    ['적용 세율', (rate*100).toFixed(0)+'%'],
    ['지분율', share<100? share+'%':'100% (단독)'],
    ['감면', g.label? g.label : '없음'],
    ['취득일', document.getElementById('c-acqdate').value || '미입력']
  ]);
  h+=worklistHtml(pressed('c-target'))+nextCalcHtml(pressed('c-target'));
  box.innerHTML=h;
  window._RESULTTEXT = box.innerText;
  animateTotals(box);
  if(window._GRANDTOT){ updateSticky('가산세 포함 총 납부액', window._GRANDTOT); } else { updateSticky('취득세 납부세액', tot); }
}
function copyResult(){
  var t=(window._RESULTTEXT||'').replace(/\n{3,}/g,'\n\n');
  if(navigator.clipboard) navigator.clipboard.writeText(t).then(function(){alert('결과를 복사했습니다.');},function(){alert('복사에 실패했습니다.');});
  else alert('이 브라우저에서는 복사가 지원되지 않습니다.');
}
function shareResult(){
  var t=(window._RESULTTEXT||'').replace(/\n{3,}/g,'\n\n');
  if(navigator.share) navigator.share({title:'지방세 산정 결과(참고용)',text:t}).catch(function(){});
  else copyResult();
}

/* 감면 요건 안내문 */
var GAMYEON_REQ={
  none:'',
  disabled:'중증(1~3급)·시각 4급 등 장애인이 보철·생업용으로 취득하는 1대. 대상 차량: 2,000cc 이하 승용 / 7~10인승 승용 / 15인승 이하 승합 / 1톤 이하 화물 / 이륜. 본인 또는 세대 공동명의. 요건 충족 시 취득세 전액면제(최소납부 배제)이며 공채 매입도 면제됩니다. 대상 장애등급은 지역 조례마다 다를 수 있습니다. 등록 후 1년 내 부득이한 사유 없이 이전 시 추징. (2027.12.31.까지)',
  veteran:'국가유공자(상이 1~7급) 등이 취득하는 1대. 대상 차량 범위는 장애인용과 동일. 요건 충족 시 취득세 전액면제이며 공채 매입도 면제됩니다. 대상 등급 기준은 지역 조례 확인. (2027.12.31.까지)',
  multi3:'18세 미만 자녀 3명 이상 양육자가 양육 목적으로 취득하는 1대. 6인 이하 승용은 140만원 한도, 7인승 이상·승합·화물은 200만원 이하 면제·초과 시 15% 납부. 공동명의로 취득하는 경우 세대를 같이하는 가족(배우자·자녀 등)과의 공동명의여야 감면됩니다(가족이 아닌 제3자 공동명의는 감면 불가). 지분 이전이어도 한도(140/200만원)는 전액 적용. (2027.12.31.까지)',
  multi2:'18세 미만 자녀 2명 양육자가 취득하는 1대. 취득세 50% 경감(6인 이하 승용은 70만원 한도). 공동명의는 세대를 같이하는 가족과의 공동명의여야 감면됩니다. (2027.12.31.까지)',
  light:'경형자동차(배기량 1,000cc 미만 등). 취득세 75만원까지 면제, 초과분만 과세. (2027.12.31.까지)',
  ev:'환경친화적 자동차법상 전기자동차. 취득세 140만원 이하 면제, 초과 시 140만원 공제. (2026.12.31.까지)',
  fcev:'수소전기자동차. 취득세 140만원 이하 면제, 초과 시 140만원 공제. (2027.12.31.까지)',
  exchange:'제작결함으로 소비자분쟁해결기준·자동차안전하자심의위원회 중재에 따라 반납한 차와 같은 종류로 교환받는 자동차. 취득세 100% 면제(최소납부 배제·추징 없음). 단 교환 취득 세액이 종전 자동차 취득 시 납부한 세액을 초과하면 그 초과분은 과세(금전 환급받아 취득한 차는 제외). 2024.1.1. 이후 다른 감면과 중복 가능.',
  disaster:'천재지변, 그 밖의 불가항력으로 멸실·파손된 자동차를 멸실·파손일부터 2년 이내에 대체취득하는 경우 취득세 면제(최소납부 배제·추징 없음). 종전 자동차 가액을 초과하는 부분은 과세. (지특법 §92①)'
};
function onGamyeon(){
  var v=document.getElementById('c-gamyeon').value;
  document.getElementById('c-gamyeon-req').textContent=GAMYEON_REQ[v]||'';
  document.getElementById('c-elig-box').classList.toggle('hidden', !(v==='disabled'||v==='veteran'));
  document.getElementById('c-seat-box').classList.toggle('hidden', !(v==='multi3'||v==='multi2'));
  document.getElementById('c-prevtax-box').classList.toggle('hidden', v!=='exchange');
  document.getElementById('c-prevval-box').classList.toggle('hidden', v!=='disaster');
  var chk=GAMYEON_CHECK[v], el=document.getElementById('c-gamyeon-check');
  var html = chk ? '<div class="checklist"><div class="ct">신고 전 확인사항</div><ul>'+chk.map(function(x){return '<li>'+x+'</li>';}).join('')+'</ul></div>' : '';
  var warn=GAMYEON_WARN[v];
  if(warn) html += '<div class="gwarn"><div class="ct">⚠ 주의사항</div><ul>'+warn.map(function(x){return '<li>'+x+'</li>';}).join('')+'</ul></div>';
  el.innerHTML=html;
}
var GAMYEON_WARN={
  disabled:['<b>1세대 1대</b>만 감면됩니다. 세대원이 이미 감면받은 차가 있으면 중복 불가.','장애인 본인이 <b>직접 사용</b>해야 하며, 공동명의자는 주민등록상 <b>같은 세대의 가족</b>이어야 합니다.','감면 후 <b>1년 이내</b>에 사망·혼인·해외이주 등 정당한 사유 없이 소유권을 이전하거나 세대를 분가하면 <b>감면세액이 추징</b>됩니다.','장애 정도(등급) 기준은 지자체 조례마다 다를 수 있습니다.'],
  veteran:['1세대 1대 한정, 공동명의는 같은 세대 가족만.','감면 후 1년 내 정당한 사유 없는 소유권 이전·세대분가 시 추징.','대상 등급(상이등급) 기준은 관할 지자체에서 확인할 수 있습니다.'],
  multi3:['공동명의 시 <b>가족이 아닌 제3자</b>와 공동명의면 감면 불가.','이미 다자녀 감면으로 등록한 차가 있으면 <b>추가 감면 불가</b>(양육 목적 1대 한정).','자녀가 <b>18세 이상</b>이 되어 요건을 벗어난 뒤 취득하면 대상 아님.','감면 후 1년 내 정당한 사유 없이 소유권 이전 시 추징될 수 있습니다.'],
  multi2:['가족이 아닌 제3자와 공동명의면 감면 불가.','양육 목적 1대 한정, 자녀 연령(18세 미만) 요건 확인.','감면 후 1년 내 소유권 이전 시 추징 주의.'],
  light:['경형 요건(배기량·규격)을 벗어나면 감면 대상 아닙니다.','감면 한도(75만원)를 넘는 고가 경차는 초과분이 과세됩니다.'],
  ev:['감면 <b>일몰기한(2026.12.31.)</b>이 적용됩니다. 취득 시점 기준입니다.','감면 한도(140만원)를 초과하면 초과분은 과세됩니다.','환경친화적 자동차 요건(자동차등록증·인증) 확인.'],
  fcev:['감면 일몰기한(2027.12.31.)에 유의.','한도(140만원) 초과분은 과세.'],
  exchange:['교환 취득 세액이 <b>종전 납부세액을 초과</b>하면 초과분은 과세됩니다(종전 가액이 더 커도 환급 없음).','제작결함이 아닌 단순 변심·중고 교환은 대상이 아닙니다.','추징규정은 없으나 취득 당시 요건 충족 여부는 확인이 필요합니다.'],
  disaster:['<b>전기합선 화재·운행 중 교통사고·정비불량 화재</b> 등 과실 사고는 불가항력이 아니어서 대상이 아닙니다.','멸실·파손일부터 <b>2년</b>이 지나면 대상이 아닙니다.','종전 자동차 가액 초과분은 과세됩니다.']
};
var GAMYEON_CHECK={
  disabled:['<b>본인 또는 세대 공동명의</b>인가요? (공동명의는 주민등록상 <b>같은 세대</b>의 가족 1인)','대상 차량인가요? (2,000cc 이하 승용 / 7~10인승 승용 / 15인승 이하 승합 / 1톤 이하 화물 / 이륜)','<b>1대</b>만 감면됩니다','등록 후 1년 내 부득이한 사유 없이 처분·이전하면 <b>추징</b>됩니다'],
  veteran:['본인 또는 세대 공동명의인가요?','대상 차량 범위는 장애인용과 동일','1대만 감면, 등록 후 처분 시 추징 주의'],
  multi3:['자녀가 모두 <b>만 18세 미만</b>인가요?','자녀 <b>3명 이상</b> 양육 중인가요?','공동명의라면 <b>같은 세대의 가족</b>과의 공동명의인가요? (제3자면 감면 불가)','양육 목적 <b>1대</b>만 감면'],
  multi2:['자녀가 모두 <b>만 18세 미만</b>인가요?','자녀 <b>2명</b> 양육 중인가요?','공동명의라면 같은 세대의 가족과의 공동명의인가요?'],
  light:['배기량 1,000cc 미만 등 <b>경형자동차</b> 요건을 충족하나요?'],
  ev:['<b>전기자동차</b>가 맞나요? (자동차등록증·제작증 확인)'],
  fcev:['<b>수소전기자동차</b>가 맞나요?'],
  exchange:['제작결함으로 <b>말소·반납</b>된 종전 차량이 있나요? (말소사유가 "제작결함/반품")','반납 차량과 <b>같은 종류</b>(승용→승용)인가요?','반납 차량과 교환 차량의 <b>당사자가 동일</b>한가요?','금전으로 환급받아 산 차는 대상이 아닙니다.'],
  disaster:['천재지변·불가항력으로 <b>멸실·파손</b>된 자동차인가요? (사고사실·피해사실 증명)','멸실·파손일부터 <b>2년 이내</b> 대체취득인가요?','종전 자동차 가액을 넘는 부분은 과세됩니다.']
};
function toggleSelfcheck(){
  var el=document.getElementById('c-selfcheck');
  el.classList.toggle('hidden');
  if(!el.classList.contains('hidden')) selfcheck();
}
function selfcheck(){
  var child=pressed('sc-child'), dv=pressed('sc-disabled'), car=pressed('sc-car');
  var rec='', label='';
  if(dv==='disabled'){rec='disabled';label='장애인 감면';}
  else if(dv==='veteran'){rec='veteran';label='국가유공자 감면';}
  else if(child==='3'){rec='multi3';label='다자녀 3자녀 감면';}
  else if(child==='2'){rec='multi2';label='다자녀 2자녀 감면';}
  else if(car==='ev'){rec='ev';label='전기차 감면';}
  else if(car==='fcev'){rec='fcev';label='수소차 감면';}
  else if(car==='light'){rec='light';label='경차 감면';}
  var el=document.getElementById('sc-result');
  if(!rec){ el.innerHTML='<span style="color:var(--muted)">해당하는 감면이 없어 보입니다(일반 취득세).</span>'; return; }
  el.innerHTML='<div style="color:var(--teal);font-weight:700">→ '+label+' 대상일 수 있습니다.</div>'
    +'<button class="btn sm primary" type="button" style="margin-top:6px" onclick="applyRec(\''+rec+'\')">이 감면 적용</button>'
    +'<div class="hint">가능성 안내일 뿐이며, 실제 감면 여부·요건은 창구에서 확인할 수 있습니다.</div>';
}
function applyRec(v){ document.getElementById('c-gamyeon').value=v; onGamyeon(); cCalc(); }
function gamyeon(acq, base, rate){
  var v=document.getElementById('c-gamyeon').value;
  var label={disabled:'장애인용',veteran:'국가유공자',multi3:'다자녀 3자녀',multi2:'다자녀 2자녀',light:'경차',ev:'전기차',fcev:'수소차',exchange:'교환자동차',disaster:'천재지변 대체취득'}[v]||'';
  if(v==='none') return {reduce:0,pay:acq,label:'',note:''};
  var r10=function(n){return Math.floor(n/10)*10;};
  if(v==='exchange'){
    var prev=numv('c-prevtax');
    var pay=Math.max(0, acq-prev);
    return {reduce:acq-pay, pay:pay, label:label, note: pay>0?'종전 납부세액 초과분 과세':'전액 면제(최소납부 배제)'};
  }
  if(v==='disaster'){
    var pv=numv('c-prevval');
    var over=Math.max(0, (base||0)-pv);
    var pay2=r10(over*(rate||0));
    return {reduce:acq-pay2, pay:pay2, label:label, note: pay2>0?'종전 가액 초과분 과세':'전액 면제(최소납부 배제)'};
  }
  if(v==='disabled'||v==='veteran'){
    if(pressed('c-elig')==='1') return {reduce:acq,pay:0,label:label,note:'요건 충족 → 전액면제'};
    return {reduce:0,pay:acq,label:label,note:'요건 미충족 → 감면 없음'};
  }
  if(v==='multi3'){
    if(pressed('c-seat')==='small'){ var rd=Math.min(acq,1400000); return {reduce:rd,pay:acq-rd,label:label,note:'6인 이하 승용 140만원 한도'}; }
    if(acq<=2000000) return {reduce:acq,pay:0,label:label,note:'200만원 이하 전액면제'};
    var pay=r10(acq*0.15); return {reduce:acq-pay,pay:pay,label:label,note:'200만원 초과 → 산출세액 15% 납부'};
  }
  if(v==='multi2'){
    var half=r10(acq*0.5);
    if(pressed('c-seat')==='small'){ var rd2=Math.min(half,700000); return {reduce:rd2,pay:acq-rd2,label:label,note:'50% 경감·6인 이하 승용 70만원 한도'}; }
    return {reduce:half,pay:acq-half,label:label,note:'취득세 50% 경감'};
  }
  if(v==='light'){ var rl=Math.min(acq,750000); return {reduce:rl,pay:acq-rl,label:label,note:'75만원 한도 면제'}; }
  if(v==='ev'||v==='fcev'){ var re=Math.min(acq,1400000); return {reduce:re,pay:acq-re,label:label,note:'140만원 한도 면제'}; }
  return {reduce:0,pay:acq,label:'',note:''};
}

/* 감면별 필요서류 (일반 기준 · 지자체별 상이) */
var GAMYEON_DOCS={
  disabled:{title:'장애인용 자동차 감면 필요서류',items:[
    '지방세 감면신청서',
    '장애인 증명서류(<b>장애인복지카드</b> 또는 장애인증명서)',
    '<b>주민등록등본</b> 1부(세대 전부 표시)',
    '자동차 제작증[신차] 또는 자동차양도증명서·매매계약서[중고]',
    '공동명의 등록 시: <b>가족관계증명서</b>, 세대 동일 확인(주민등록등본)'
  ],minor:['(미성년 장애인) 기본증명서(상세)·가족관계증명서(상세)','법정대리인 인감증명서 또는 본인서명사실확인서, 법정대리인 동의서']},
  veteran:{title:'국가유공자 등 자동차 감면 필요서류',items:[
    '지방세 감면신청서',
    '<b>국가유공자증</b>(국가보훈등록증) 등 신분 증명서류',
    '<b>주민등록등본</b> 1부(세대 전부 표시)',
    '자동차 제작증[신차] 또는 자동차양도증명서·매매계약서[중고]',
    '공동명의 등록 시: 가족관계증명서, 세대 동일 확인'
  ]},
  multi3:{title:'다자녀(3자녀 이상) 감면 필요서류',items:[
    '지방세 감면신청서',
    '<b>가족관계증명서(상세)</b> — 18세 미만 자녀 3명 이상 확인',
    '<b>주민등록등본</b> 1부(세대 전부 표시)',
    '자동차 제작증[신차] 또는 자동차양도증명서·매매계약서[중고]'
  ]},
  multi2:{title:'다자녀(2자녀) 감면 필요서류',items:[
    '지방세 감면신청서',
    '<b>가족관계증명서(상세)</b> — 18세 미만 자녀 2명 확인',
    '<b>주민등록등본</b> 1부(세대 전부 표시)',
    '자동차 제작증[신차] 또는 자동차양도증명서·매매계약서[중고]'
  ]},
  light:{title:'경차 감면 관련 서류',items:[
    '지방세 감면신청서(취득 신고 시 자동 감면되는 경우 많음)',
    '자동차 제작증[신차] 또는 매매계약서[중고]'
  ]},
  ev:{title:'전기자동차 감면 관련 서류',items:[
    '지방세 감면신청서',
    '자동차 제작증(전기자동차 여부 확인)'
  ]},
  fcev:{title:'수소전기자동차 감면 관련 서류',items:[
    '지방세 감면신청서',
    '자동차 제작증(수소전기자동차 여부 확인)'
  ]}
};
function docsHtml(){
  var v=document.getElementById('c-gamyeon').value;
  var d=GAMYEON_DOCS[v];
  if(!d) return '';
  var h='<div class="docs"><h4>'+d.title+'</h4><div class="sub">일반 기준입니다. 세부 서류는 관할 시·군·구청/차량등록 기준으로 확인할 수 있습니다.</div><ul>';
  h+=d.items.map(function(x){return '<li>'+x+'</li>';}).join('');
  if(d.minor){ h+='</ul><div class="grp">미성년자인 경우 추가</div><ul>'+d.minor.map(function(x){return '<li>'+x+'</li>';}).join(''); }
  h+='</ul></div>';
  return h;
}

/* 지역개발채권·도시철도채권 매입 — 지역별 요율표
   rates: 승용{nMid,nHi,tMid,tHi} 1600~2000/2000+, 승합 hap{n,t}, 화물 hwa(flat 또는 ton구간)
   cmp: 배기량 경계(ge=이상 / gt=초과) · eco: 전기수소(full/won150) · hybrid: 처리방식 */
var STD={seung:{nMid:.08,nHi:.12,tMid:.04,tHi:.06},hap:{n:.03,t:.015},hwa:{flat:false,ton:1.0,nLow:.015,nHi:.03,tLow:.0075,tHi:.015}};
function clone(o){return JSON.parse(JSON.stringify(o));}
var REGIONS={
  '강원':{label:'강원특별자치도',type:'도',verified:true,cmp:'ge',eco:'won150',hybrid:'won150',
    rates:{seung:{nMid:.08,nHi:.12,tMid:.04,tHi:.06},hap:{n:.03,t:.015},hwa:{flat:false,ton:0.6,nLow:.015,nHi:.03,tLow:.0075,tHi:.015}}},
  '경기':{label:'경기도',type:'도',verified:true,cmp:'gt',eco:'full',hybrid:'over1600',rates:clone(STD)},
  '경북':{label:'경상북도',type:'도',verified:true,cmp:'ge',eco:'full',hybrid:'won150',
    rates:{seung:{nMid:.04,nHi:.08,tMid:.02,tHi:.04},hap:{n:.015,t:.008},hwa:{flat:true,n:.015,t:.008}}},
  '대전':{label:'대전광역시',type:'광역시',verified:true,cmp:'ge',eco:'full',hybrid:'won150',
    rates:{seung:{nMid:.04,nHi:.05,tMid:.04,tHi:.05},hap:{n:.015,t:.0075},hwa:{flat:true,n:.015,t:.0075}}},
  '충북':{label:'충청북도',type:'도',verified:false,cmp:'gt',eco:'full',hybrid:'ask',rates:clone(STD)},
  '충남':{label:'충청남도',type:'도',verified:false,cmp:'gt',eco:'full',hybrid:'ask',rates:clone(STD)},
  '전북':{label:'전북특별자치도',type:'도',verified:false,cmp:'gt',eco:'full',hybrid:'ask',rates:clone(STD)},
  '전남':{label:'전라남도',type:'도',verified:false,cmp:'gt',eco:'full',hybrid:'ask',rates:clone(STD)},
  '경남':{label:'경상남도',type:'도',verified:false,cmp:'gt',eco:'full',hybrid:'ask',rates:clone(STD)},
  '제주':{label:'제주특별자치도',type:'도',verified:false,cmp:'gt',eco:'full',hybrid:'ask',rates:clone(STD)},
  '세종':{label:'세종특별자치시',type:'도',verified:false,cmp:'gt',eco:'full',hybrid:'ask',rates:clone(STD)},
  '서울':{label:'서울특별시',type:'광역시',verified:false,cmp:'gt',eco:'full',hybrid:'ask',rates:clone(STD)},
  '부산':{label:'부산광역시',type:'광역시',verified:false,cmp:'gt',eco:'full',hybrid:'ask',rates:clone(STD)},
  '대구':{label:'대구광역시',type:'광역시',verified:false,cmp:'gt',eco:'full',hybrid:'ask',rates:clone(STD)},
  '인천':{label:'인천광역시',type:'광역시',verified:false,cmp:'gt',eco:'full',hybrid:'ask',rates:clone(STD)},
  '광주':{label:'광주광역시',type:'광역시',verified:false,cmp:'gt',eco:'full',hybrid:'ask',rates:clone(STD)},
  '울산':{label:'울산광역시',type:'광역시',verified:false,cmp:'gt',eco:'full',hybrid:'ask',rates:clone(STD)}
};
function onRegion(){
  var r=document.getElementById('c-region').value, chong=pressed('c-chong');
  document.getElementById('c-bond-inputs').classList.toggle('hidden', r==='none');
  document.getElementById('c-cc-box').classList.toggle('hidden', chong==='화물');
  document.getElementById('c-ton-box').classList.toggle('hidden', chong!=='화물');
}
function gongchae(base){
  var key=document.getElementById('c-region').value;
  if(key==='none') return null;
  var R=REGIONS[key];
  var use=pressed('c-use');
  if(use==='영업') return {amt:0,rate:0,note:'영업용(사업용)은 매입의무 없음',R:R};
  var be=document.getElementById('c-bondexempt');
  if(be && be.value!=='none'){
    return {amt:0,rate:0,note:(be.value==='dealer'?'중고자동차 매매업자 판매목적 이전':'법인 합병 이전')+' → 채권 매입 면제',R:R};
  }
  // 장애인·국가유공자 요건 충족 시 공채도 면제(최우선)
  var gv=document.getElementById('c-gamyeon').value;
  if((gv==='disabled'||gv==='veteran') && pressed('c-elig')==='1'){
    return {amt:0,rate:0,note:(gv==='disabled'?'장애인':'국가유공자')+' 요건 충족 → 공채 매입 면제(보철용 1대)',R:R};
  }
  var chong=pressed('c-chong'), isNew=pressed('c-type')==='new';
  var cc=numv('c-cc'), ton=Math.max(0,Number(document.getElementById('c-ton').value)||0), fuel=pressed('c-eco');
  var warn='', hybCap=false;
  if(fuel==='hybrid'){
    if(R.hybrid==='over1600'){ if(cc<=1600) return {amt:0,rate:0,note:'하이브리드 1,600cc 이하 → 면제',R:R}; }
    else if(R.hybrid==='won150'){ hybCap=true; }
    else { warn='하이브리드 면제 여부·종료일은 시·도마다 다릅니다. 일반 요율로 계산 — 해당 조례 확인 필요.'; }
    fuel='0'; // 배기량 기준으로 일반 요율 산정 후 위 규칙 적용
  }
  function cmp(v,b){ return R.cmp==='ge'? v>=b : v>b; }
  var RT=R.rates, rate=0;
  if(chong==='승용'){
    if(cmp(cc,2000)) rate=isNew?RT.seung.nHi:RT.seung.tHi;
    else if(cmp(cc,1600)) rate=isNew?RT.seung.nMid:RT.seung.tMid;
  } else if(chong==='승합'){
    if(cmp(cc,1000)) rate=isNew?RT.hap.n:RT.hap.t;
  } else { // 화물·특수
    if(cmp(cc,1000)){
      if(RT.hwa.flat) rate=isNew?RT.hwa.n:RT.hwa.t;
      else { var low = R.cmp==='ge'? ton<RT.hwa.ton : ton<=RT.hwa.ton; rate = low?(isNew?RT.hwa.nLow:RT.hwa.tLow):(isNew?RT.hwa.nHi:RT.hwa.tHi); }
    }
  }
  var amt=Math.floor(base*rate/5000)*5000;
  var note='';
  if(fuel==='1'){ // 전기·수소
    if(R.eco==='full'){ amt=0; note='전기·수소차 전액 면제'; }
    else { if(amt<=1500000){ amt=0; note='전기·수소 150만원 이하 면제(배기량 기준 확인 필요)'; } else { amt-=1500000; note='전기·수소 150만원 감면'; } }
  }
  if(hybCap){ if(amt<=1500000){ amt=0; note='하이브리드 150만원 이하 면제'; } else { amt-=1500000; note='하이브리드 150만원 감면'; } }
  if(warn) note=(note?note+' · ':'')+warn;
  return {amt:amt,rate:rate,note:note,R:R};
}

/* ---------- 차명 검색 ---------- */
function openSearch(){
  var el=document.getElementById('c-search-box');
  el.classList.toggle('hidden');
  if(!el.classList.contains('hidden')) loadVeh();
}
function loadVeh(){
  if(VEH||vehLoading) return;
  vehLoading=true;
  document.getElementById('search-status').textContent='시가표준액 데이터 불러오는 중…';
  fetch('./vehicle_base.json').then(function(r){return r.json();}).then(function(d){
    VEH=d; vehLoading=false; document.getElementById('search-status').textContent='총 '+d.length.toLocaleString()+'건 · 차명 검색';
  }).catch(function(){vehLoading=false;document.getElementById('search-status').textContent='차명 데이터를 불러오지 못했습니다. 새로고침하면 복구됩니다. 취득가액은 직접 입력할 수 있습니다.';});
}
var searchTimer=null, selected=null;
function doSearch(){
  clearTimeout(searchTimer);
  searchTimer=setTimeout(runSearch,220);
}
function runSearch(){
  if(!VEH){ loadVeh(); return; }
  var chong=pressed('c-chong');
  var q=document.getElementById('c-q').value.replace(/\s/g,'').toLowerCase();
  var res=document.getElementById('search-results');
  if(q.length<1){ res.innerHTML=''; return; }
  var out=[], n=0;
  for(var i=0;i<VEH.length && n<40;i++){
    var v=VEH[i];
    if(v.t!==chong) continue;
    if((v.n+v.f+v.m).replace(/\s/g,'').toLowerCase().indexOf(q)>=0){ out.push(v); n++; }
  }
  document.getElementById('search-status').textContent = out.length? (n>=40?'상위 40건 표시':'검색 결과 '+out.length+'건') : '결과 없음 (차종 선택을 확인해 보세요)';
  res.innerHTML = out.map(function(v,i){
    return '<div class="sr-item" onclick="selectVeh('+i+')">'+
      '<span class="sr-price">'+(v.p*1000).toLocaleString()+'원</span>'+
      '<div class="nm">'+v.n+'<span class="badge">'+v.o+'</span>'+(v.e?'<span class="badge">'+v.e+'</span>':'')+'</div>'+
      '<div class="mt">'+v.m+' · '+(v.f||'-')+'</div></div>';
  }).join('');
  window._SR=out;
}
function selectVeh(i){
  selected=window._SR[i];
  document.getElementById('search-results').innerHTML='<div class="sr-item" style="cursor:default"><span class="sr-price">'+(selected.p*1000).toLocaleString()+'원</span><div class="nm">✓ '+selected.n+'</div><div class="mt">'+selected.m+' · 기준가격</div></div>';
  var ysel=document.getElementById('c-year'), now=2026, opt='';
  for(var y=now;y>=now-20;y--) opt+='<option value="'+y+'">'+y+'년식'+(y===now?' (신차)':'')+'</option>';
  ysel.innerHTML=opt;
  document.getElementById('c-year-box').classList.remove('hidden');
  applySiga();
}
function applySiga(){
  if(!selected) return;
  var chong=pressed('c-chong'), use=pressed('c-use');
  var elapsed=2026-Number(document.getElementById('c-year').value);
  if(elapsed<0) elapsed=0;
  var rates;
  if(use==='영업'){
    var key={'승용':'승용자동차','승합':'승합자동차','화물':'화물자동차'}[chong];
    rates=RATE.etc[key].rates;
  } else {
    if(chong==='승용') rates=RATE.nonbiz[selected.o==='외산'?'승용(외산)':'승용(국산)'].rates;
    else rates=RATE.nonbiz[chong].rates;
  }
  var idx=Math.min(elapsed, rates.length-1);
  var rate=rates[idx];
  var siga=Math.floor(selected.p*1000*rate/10)*10;
  var el=document.getElementById('c-siga'); el.value=siga.toLocaleString('ko-KR');
  document.getElementById('c-siga-note').innerHTML='기준가격 '+(selected.p*1000).toLocaleString()+'원 × 잔가율 '+rate+' (경과 '+elapsed+'년) = <b>'+siga.toLocaleString()+'원</b>';
  cCalc();
}

/* ---------- 고지분 체납 (기존) ---------- */
var SEMOK=[{v:'jaesan',t:'재산세'},{v:'jadongcha',t:'자동차세(정기분)'},{v:'jumin',t:'주민세'},{v:'deungrok',t:'등록면허세(면허분)'},{v:'jawon',t:'지역자원시설세'},{v:'etc',t:'기타(직접 지정)'}];
var YEARS=(function(){var a=[];for(var y=2026;y>=2016;y--)a.push(y);return a;})();
var rid=0;
function addMonths(d,m){var y=d.getFullYear(),mo=d.getMonth()+m,day=d.getDate();var r=new Date(y,mo,1);var last=new Date(r.getFullYear(),r.getMonth()+1,0).getDate();r.setDate(Math.min(day,last));return r;}
function monthsElapsed(due,pay,cap){if(pay<=due)return 0;var c=0;while(c<cap){if(addMonths(due,c+1)<=pay)c++;else break;}return c;}
function dval(id){var v=document.getElementById(id).value;return v?new Date(v+'T00:00:00'):null;}
function addRow(){
  rid++;var id=rid;
  var so=SEMOK.map(function(s){return '<option value="'+s.v+'">'+s.t+'</option>';}).join('');
  var yo=YEARS.map(function(y){return '<option value="'+y+'"'+(y===2025?' selected':'')+'>'+y+'년분</option>';}).join('');
  var d=document.createElement('div');d.className='card';d.style.padding='15px 16px';d.dataset.id=id;
  d.innerHTML='<div style="display:flex;justify-content:space-between;margin-bottom:10px"><b style="color:var(--teal);font-size:12.5px">체납 '+id+'</b><button class="btn sm" onclick="rmRow('+id+')">✕</button></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    +'<div><label class="lbl">세목</label><select id="r'+id+'-semok" onchange="onSemok('+id+');recalcGozi()">'+so+'</select></div>'
    +'<div id="r'+id+'-yw"><label class="lbl">과세연도</label><select id="r'+id+'-year" onchange="recalcGozi()">'+yo+'</select></div>'
    +'<div id="r'+id+'-gw" class="hidden"><label class="lbl">적용 체계</label><select id="r'+id+'-gu" onchange="recalcGozi()"><option value="0">신 납부지연가산세</option><option value="1">구 가산금</option></select></div>'
    +'<div><label class="lbl">체납 세액</label><div class="money-wrap"><input type="text" id="r'+id+'-tax" inputmode="numeric" placeholder="0" oninput="fmt(this);recalcGozi()"><span class="won">원</span></div></div>'
    +'<div><label class="lbl">고지서 납부기한</label><input type="date" id="r'+id+'-due" oninput="recalcGozi()"></div>'
    +'</div><div id="r'+id+'-res" style="margin-top:10px"></div>';
  document.getElementById('rows').appendChild(d);recalcGozi();
}
function rmRow(id){var e=document.querySelector('.card[data-id="'+id+'"]');if(e)e.remove();recalcGozi();}
function onSemok(id){var etc=document.getElementById('r'+id+'-semok').value==='etc';document.getElementById('r'+id+'-yw').classList.toggle('hidden',etc);document.getElementById('r'+id+'-gw').classList.toggle('hidden',!etc);}
function recalcGozi(){
  var pay=dval('g-pay');var rows=document.querySelectorAll('#rows .card');var sT=0,sP=0,vc=0;
  rows.forEach(function(r){
    var id=r.dataset.id;var semok=document.getElementById('r'+id+'-semok').value;
    var tax=Number((document.getElementById('r'+id+'-tax').value||'').replace(/[^0-9]/g,''))||0;var due=dval('r'+id+'-due');
    var isOld = semok==='etc' ? document.getElementById('r'+id+'-gu').value==='1' : Number(document.getElementById('r'+id+'-year').value)<2024;
    var badge='<span class="badge" style="background:'+(isOld?'var(--seal-soft)':'var(--teal-soft)')+';color:'+(isOld?'var(--seal)':'var(--teal)')+'">'+(isOld?'구 가산금':'납부지연가산세')+'</span>';
    var res=document.getElementById('r'+id+'-res');
    if(!pay){res.innerHTML=badge;return;}
    if(!tax||!due||pay<=due){res.innerHTML=badge+'<div class="hint">세액·납부기한 입력(납기 이내면 가산세 없음)</div>';return;}
    var first=Math.floor(tax*0.03/10)*10,months=monthsElapsed(due,pay,60);
    var mr=isOld?0.0075:0.0066,th=isOld?300000:450000,applyM=tax>=th;
    var monthly=applyM?Math.floor(tax*mr*months/10)*10:0;var pen=first+monthly;
    sT+=tax;sP+=pen;vc++;
    res.innerHTML=badge+'<div class="row" style="border:0;padding:6px 0 0"><div class="rk" style="font-size:12px;color:var(--muted)">최초 3% '+won(first)+' + '+(applyM?(isOld?'중가산금':'월가산')+' '+(mr*100).toFixed(2)+'%×'+months+'개월 '+won(monthly):'월가산 미적용(45만/30만 미만)')+'</div><div class="rv">'+won(tax+pen)+' 원</div></div>';
  });
  var b=document.getElementById('grand-body');
  if(!pay||vc===0){b.innerHTML='<div class="empty"><b>가산세 산출 대기</b>납부 예정일과 체납 건을 입력하면<br>가산세가 표시됩니다.</div>';return;}
  b.innerHTML='<div class="row"><div class="rk">본세 합계 ('+vc+'건)</div><div class="rv">'+won(sT)+' 원</div></div>'
    +'<div class="row"><div class="rk">가산세 합계</div><div class="rv">'+won(sP)+' 원</div></div>'
    +'<div class="total"><span class="tk">총 납부할 금액</span><span class="tv">'+won(sT+sP)+'<span class="u">원</span></span></div>';
}

/* ---------- 신고납부분 (기존) ---------- */
var sType='no';
function pickType(v){sType=v;document.querySelectorAll('#s-type button').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.v===v);});calcShingo();}
function calcShingo(){
  var tax=numv('s-tax'),due=dval('s-due'),pay=dval('s-pay'),box=document.getElementById('s-result');
  if(!tax||!due||!pay){box.innerHTML='<div class="empty"><b>가산세 산출 대기</b>본세·납부기한·납부일을 입력하면<br>가산세가 표시됩니다.</div>';return;}
  if(pay<=due){box.innerHTML='<div class="empty">납부일이 납기 이내입니다.</div>';return;}
  var rr=0,rl='';
  if(sType==='no'){rr=.20;rl='무신고가산세 (20%)';}else if(sType==='under'){rr=.10;rl='과소신고가산세 (10%)';}
  else if(sType==='fraud_no'){rr=.40;rl='부정무신고가산세 (40%)';}else if(sType==='fraud_under'){rr=.40;rl='부정과소신고가산세 (40%)';}
  var rp=Math.floor(tax*rr/10)*10;
  var DAY=86400000,CH=new Date(2022,5,7),pStart=new Date(due.getTime()+DAY),total=Math.floor((pay-due)/DAY);
  var dO=0,dN=0;
  if(pay<CH)dO=total;else if(pStart>=CH)dN=total;else{dO=Math.floor((new Date(CH.getTime()-DAY)-due)/DAY);dN=total-dO;}
  var interest=tax*0.00025*dO+tax*0.00022*dN,cap=tax*0.75,capped=interest>cap;
  var lp=Math.floor(Math.min(interest,cap)/10)*10,tt=tax+rp+lp;
  var h='<div class="row"><div class="rk">본세</div><div class="rv">'+won(tax)+' 원</div></div>';
  if(rr>0)h+='<div class="row"><div class="rk">'+rl+'</div><div class="rv">'+won(rp)+' 원</div></div>';
  h+='<div class="row"><div class="rk">납부지연가산세<small>'+(dO>0?'0.025% '+dO+'일 + 0.022% '+dN+'일':total+'일 × 0.022%')+'</small></div><div class="rv">'+won(lp)+' 원</div></div>';
  h+='<div class="total"><span class="tk">총 납부할 금액</span><span class="tv">'+won(tt)+'<span class="u">원</span></span></div>';
  if(capped)h+='<div class="warn">납부지연가산세가 본세 75% 한도로 조정됨.</div>';
  box.innerHTML=h;
}

/* 취득세 대상별 챕터 */
function onTarget(){
  var t=pressed('c-target');
  document.getElementById('target-car').classList.toggle('hidden', t!=='car');
  document.getElementById('target-machine').classList.toggle('hidden', t!=='machine');
  document.getElementById('target-moto').classList.toggle('hidden', t!=='moto');
  document.getElementById('target-soon').classList.add('hidden');
  var bc=document.getElementById('basis-chwi');
  if(bc){
    var txt={
      car:'<b>자동차 취득세</b> — 과세표준(신규: 공급가액 / 이전: 신고가액과 시가표준액 중 큰 값 / 무상: 시가표준액) × 세율. 비영업 승용 <b>7%</b>·경차 4%, 승합·화물 비영업 <b>5%</b>·경차 4%, 영업 4%(지방세법 §12). 지방교육세·농특세 0원. 시가표준액 = 기준가격 × 경과연수별 잔가율(2026년).',
      machine:'<b>기계장비 취득세</b> — 과세표준(신규: 취득가액 / 이전·무상: 시가표준액) × 세율 <b>3%</b>(지방세법 §12①3, 등록대상이 아닌 기계장비는 2%). 덤프·믹서트럭은 지방교육세·농특세 없음, 그 외 등록대상 건설기계는 <b>지방교육세(취득세액×1/3의 20%)·농특세(취득세액×2/3의 10%)</b> 부과. 시가표준액 = 기준가격 × 경과연수별 잔가율(기종 내용연수 10·13·15·17년 기준).',
      moto:'<b>이륜자동차 취득세</b> — 과세표준(신규: 취득가액 / 이전·무상: 시가표준액) × 세율 <b>2%</b>(지방세법 §12). 지방교육세·농특세 0원. 취득가액 50만원 이하는 면세점(비과세). 시가표준액 = 기준가격 × 잔가율(내용연수 6년).'
    }[t];
    bc.innerHTML=txt;
  }
  if(t==='machine') mCalc();
  if(t==='moto') mtCalc();
}

/* ===== 기계장비 취득세 ===== */
var MACH=null, machLoading=false, mSelected=null, mTimer=null;
function mOpenSearch(){
  var el=document.getElementById('mc-search-box'); el.classList.toggle('hidden');
  if(!el.classList.contains('hidden')) mLoad();
}
function mLoad(){
  if(MACH||machLoading) return; machLoading=true;
  document.getElementById('mc-status').textContent='기계장비 데이터 불러오는 중…';
  fetch('./machine_base.json').then(function(r){return r.json();}).then(function(d){
    MACH=d; machLoading=false; document.getElementById('mc-status').textContent='총 '+d.length.toLocaleString()+'건 · 기종명 검색';
  }).catch(function(){machLoading=false;document.getElementById('mc-status').textContent='기종 데이터를 불러오지 못했습니다. 새로고침하면 복구됩니다. 취득가액은 직접 입력할 수 있습니다.';});
}
function mSearch(){ clearTimeout(mTimer); mTimer=setTimeout(mRun,220); }
function mRun(){
  if(!MACH){ mLoad(); return; }
  var q=document.getElementById('mc-q').value.replace(/\s/g,'').toLowerCase();
  var res=document.getElementById('mc-results');
  if(q.length<1){ res.innerHTML=''; return; }
  var out=[],n=0;
  for(var i=0;i<MACH.length&&n<40;i++){
    var v=MACH[i];
    if((v.n+v.m+v.k).replace(/\s/g,'').toLowerCase().indexOf(q)>=0){ out.push(v); n++; }
  }
  document.getElementById('mc-status').textContent = out.length?(n>=40?'상위 40건 표시':'검색 결과 '+out.length+'건'):'결과 없음';
  res.innerHTML=out.map(function(v,i){
    return '<div class="sr-item" onclick="mSelect('+i+')"><span class="sr-price">'+(v.p*1000).toLocaleString()+'원</span>'
      +'<div class="nm">'+v.n+'<span class="badge">'+v.k+'</span><span class="badge">'+v.o+'</span></div>'
      +'<div class="mt">'+v.m+'</div></div>';
  }).join('');
  window._MSR=out;
}
/* 기계장비 잔가율 (2026 기타물건 시가표준액 산정기준, 표9) */
var MACH_RATE={
  10:[0.832,0.708,0.637,0.545,0.439,0.349,0.290,0.231,0.184,0.146,0.100],
  13:[0.871,0.768,0.709,0.603,0.543,0.455,0.381,0.318,0.279,0.234,0.196,0.165,0.138,0.100],
  15:[0.885,0.793,0.736,0.644,0.603,0.511,0.439,0.376,0.323,0.290,0.249,0.214,0.183,0.158,0.135,0.100],
  17:[0.904,0.831,0.763,0.680,0.627,0.551,0.488,0.431,0.382,0.346,0.307,0.272,0.242,0.215,0.191,0.162,0.131,0.100]
};
var MACH_K2Y={'굴삭기':10,'로더':10,'지게차':10,'덤프트럭':10,'콘크리트피니셔':10,'콘크리트펌프':10,'도로보수트럭':10,'노면파쇄기':10,
  '콘크리트살포기':13,'콘크리트믹서트럭':13,'아스팔트피니셔':13,'아스팔트살포기':13,'골재살포기':13,'천공기':13,'선별기':13,
  '불도저':15,'기중기':15,'롤러':15,'노상안정기':15,'콘크리트뱃칭플랜트':15,'아스팔트믹싱플랜트':15,'쇄석기':15,'공기압축기':15,'자갈채취기':15,'준설선':15,'스크레이퍼':15,'항타및항발기':15,
  '모터그레이더':17,'타워크레인':17};
function machYears(k){ return MACH_K2Y[(k||'').replace(/\s/g,'')]||10; }
/* 덤프트럭·콘크리트믹서트럭 자동 판정 (지방세법 §124 자동차로 보아 교육세·농특세 없음) */
function isDumpMixer(k){
  var s=(k||'').replace(/\s/g,'');
  return s==='덤프트럭' || s==='콘크리트믹서트럭';
}
function mSelect(i){
  mSelected=window._MSR[i];
  document.getElementById('mc-results').innerHTML='<div class="sr-item" style="cursor:default"><span class="sr-price">'+(mSelected.p*1000).toLocaleString()+'원</span><div class="nm">✓ '+mSelected.n+'<span class="badge">'+mSelected.k+'</span></div><div class="mt">'+mSelected.m+' · 기준가격</div></div>';
  if(pressed('mc-type')==='new'){
    document.getElementById('mc-base').value=(mSelected.p*1000).toLocaleString('ko-KR');
    document.getElementById('mc-year-box').classList.add('hidden');
    mCalc();
  } else {
    var ysel=document.getElementById('mc-year'), now=2026, opt='';
    for(var y=now;y>=now-20;y--) opt+='<option value="'+y+'">'+y+'년식'+(y===now?' (신차)':'')+'</option>';
    ysel.innerHTML=opt;
    document.getElementById('mc-year-box').classList.remove('hidden');
    mApplySiga();
  }
}
function mApplySiga(){
  if(!mSelected) return;
  var yrs=machYears(mSelected.k), rates=MACH_RATE[yrs];
  var elapsed=2026-Number(document.getElementById('mc-year').value); if(elapsed<0)elapsed=0;
  var rate=rates[Math.min(elapsed, rates.length-1)];
  var siga=Math.floor(mSelected.p*1000*rate/10)*10;
  document.getElementById('mc-base').value=siga.toLocaleString('ko-KR');
  document.getElementById('mc-status').innerHTML='기준가격 '+(mSelected.p*1000).toLocaleString()+'원 × 잔가율 '+rate+' (내용연수 '+yrs+'년·경과 '+elapsed+'년) = <b>'+siga.toLocaleString()+'원</b>';
  mCalc();
}
/* ===== 공통 감면 (기계장비·이륜) ===== */
function gamyeonG(prefix, acq, base, rate){
  var el=document.getElementById(prefix+'-gamyeon'); if(!el) return {reduce:0,pay:acq,label:'',note:''};
  var v=el.value;
  var label={disabled:'장애인용',veteran:'국가유공자',multi3:'다자녀 3자녀',multi2:'다자녀 2자녀',exchange:'교환',disaster:'천재지변 대체취득'}[v]||'';
  if(v==='none'||!v) return {reduce:0,pay:acq,label:'',note:''};
  var r10=function(n){return Math.floor(n/10)*10;};
  if(v==='multi3'){
    if(acq<=2000000) return {reduce:acq,pay:0,label:label,note:'200만원 이하 전액면제'};
    var p15=r10(acq*0.15); return {reduce:acq-p15,pay:p15,label:label,note:'200만원 초과 → 산출세액 15% 납부(최소납부세제)'};
  }
  if(v==='multi2'){ var half=r10(acq*0.5); return {reduce:half,pay:acq-half,label:label,note:'취득세 50% 경감'}; }
  if(v==='disabled'||v==='veteran'){
    return pressed(prefix+'-elig')==='1' ? {reduce:acq,pay:0,label:label,note:'요건 충족 → 전액면제'} : {reduce:0,pay:acq,label:label,note:'요건 미충족 → 감면 없음'};
  }
  if(v==='exchange'){ var prev=numv(prefix+'-prevtax'); var pay=Math.max(0,acq-prev); return {reduce:acq-pay,pay:pay,label:label,note:pay>0?'종전 납부세액 초과분 과세':'전액 면제(최소납부 배제)'}; }
  if(v==='disaster'){ var pv=numv(prefix+'-prevval'); var over=Math.max(0,(base||0)-pv); var p2=r10(over*(rate||0)); return {reduce:acq-p2,pay:p2,label:label,note:p2>0?'종전 가액 초과분 과세':'전액 면제(최소납부 배제)'}; }
  return {reduce:0,pay:acq,label:'',note:''};
}
function onGamyeonG(prefix, recalc){
  var v=document.getElementById(prefix+'-gamyeon').value;
  var eb=document.getElementById(prefix+'-elig-box'); if(eb) eb.classList.toggle('hidden', !(v==='disabled'||v==='veteran'));
  document.getElementById(prefix+'-prevtax-box').classList.toggle('hidden', v!=='exchange');
  document.getElementById(prefix+'-prevval-box').classList.toggle('hidden', v!=='disaster');
  var info=document.getElementById(prefix+'-gamyeon-info');
  var html = GAMYEON_REQ[v]?'<div class="hint">'+GAMYEON_REQ[v]+'</div>':'';
  var chk=GAMYEON_CHECK[v]; if(chk) html+='<div class="checklist"><div class="ct">신고 전 확인사항</div><ul>'+chk.map(function(x){return '<li>'+x+'</li>';}).join('')+'</ul></div>';
  var w=GAMYEON_WARN[v]; if(w) html+='<div class="gwarn"><div class="ct">⚠ 주의사항</div><ul>'+w.map(function(x){return '<li>'+x+'</li>';}).join('')+'</ul></div>';
  info.innerHTML=html;
  if(recalc) recalc();
}
function gamyeonRow(g){
  if(!(g.reduce>0||g.label)) return '';
  var h='<div class="row"><div class="rk" style="color:var(--teal)">감면 ('+g.label+')<small>'+(g.note||'')+'</small></div><div class="rv" style="color:var(--teal)">− '+won(g.reduce)+' 원</div></div>';
  if(g.reduce>0 && typeof g.acq==='number') h+='<div class="hint" style="text-align:right;margin-top:2px;">감면 전 '+won(g.acq)+'원 → 감면 후 <b>'+won(g.pay)+'원</b> ('+won(g.reduce)+'원 절감)</div>';
  return h;
}

function mCalc(){
  var t=pressed('mc-type');
  document.getElementById('mc-report-row').classList.toggle('hidden', t==='new');
  document.getElementById('mc-base-label').innerHTML=(t==='new'?'취득가액 (과세표준)':'시가표준액')+' <span class="tip" tabindex="0" data-tip="신규는 사실상 취득가격, 이전·무상은 시가표준액(기준가격×잔가율). 기종 검색으로 채울 수 있습니다.">?</span>';
  var sig=Number((document.getElementById('mc-base').value||'').replace(/[^0-9]/g,''))||0;
  var rep=Number((document.getElementById('mc-report').value||'').replace(/[^0-9]/g,''))||0;
  var base, baseLabel;
  if(t==='new'){ base=sig; baseLabel='취득가액'; }
  else { base=Math.max(rep,sig); baseLabel=(rep>=sig&&rep>0)?'신고가액(매매금액)':'시가표준액'; }
  var box=document.getElementById('mc-result');
  if(!base){ box.innerHTML=EMPTY.machine; updateSticky('',null); return; }
  var kind = document.getElementById('mc-unreg').checked ? 'unreg'
           : (isDumpMixer(mSelected && mSelected.k) ? 'dump' : 'other');
  var kn=document.getElementById('mc-kind-auto');
  if(kn){
    var nm = mSelected && mSelected.k ? mSelected.k : null;
    kn.innerHTML = kind==='unreg' ? '<b>등록대상이 아닌 기계장비</b> · 세율 2% (교육세 없음)'
      : nm ? ('<b>'+nm+'</b> → '+(kind==='dump'?'덤프·믹서트럭 · 세율 3% (교육세·농특세 없음)':'등록대상 건설기계 · 세율 3% (교육세·농특세 부과)'))
           : '기종을 선택하면 자동 판정됩니다. <span style="color:var(--muted)">(기본: 등록대상 건설기계 3%)</span>';
  }
  var rate = (kind==='unreg') ? TAX_RULES.acqMachine.unregistered : TAX_RULES.acqMachine.registered;
  var exempt50=base<=500000;
  var acq=exempt50?0:Math.floor(base*rate/10)*10;
  var g=gamyeonG('mc',acq,base,rate); g.acq=acq;
  // 지방교육세·농특세: 덤프·믹서트럭은 없음, 그 외 등록대상 건설기계는 부과
  var edu=0, nong=0;
  if(!exempt50 && kind==='other'){
    edu  = Math.floor(base*(rate-TAX_RULES.machineEduBase)*TAX_RULES.eduTax/10)*10;  // (표준세율-2%) 적용세액 × 20%
    nong = Math.floor(base*TAX_RULES.machineEduBase*TAX_RULES.ruralTax/10)*10;         // 2% 적용세액 × 10%
  } else if(!exempt50 && kind==='unreg'){
    nong = Math.floor(base*TAX_RULES.machineEduBase*TAX_RULES.ruralTax/10)*10;         // 2%분 농특세만
  }
  var tot=g.pay+edu+nong;
  var h='<div class="receipt-head">기계장비 취득세 (참고용)</div>';
  h+='<div class="row"><div class="rk">과세표준<small>'+baseLabel+'</small></div><div class="rv">'+won(base)+' 원</div></div>';
  h+='<div class="row"><div class="rk">취득세<small>'+(exempt50?'취득가액 50만원 이하 → 면세점(과세 제외)':'세율 '+(rate*100)+'% (기계장비) · 지방세법 §12')+'</small></div><div class="rv">'+won(acq)+' 원</div></div>';
  if(!exempt50) h+='<div class="hint" style="text-align:right;margin-top:2px;">계산식: '+won(base)+' × '+(rate*100)+'% = '+won(acq)+'원</div>';
  if(kind==='other'){
    h+='<div class="row"><div class="rk">지방교육세<small>취득세액 × 1/3 의 20% ((세율−2%)분 × 20%) · §151</small></div><div class="rv">'+won(edu)+' 원</div></div>';
    h+='<div class="row"><div class="rk">농어촌특별세<small>취득세액 × 2/3 의 10% (2%분 × 10%) · 농특법 §5</small></div><div class="rv">'+won(nong)+' 원</div></div>';
  } else if(kind==='dump'){
    h+='<div class="row sub"><div class="rk">지방교육세·농어촌특별세<small>덤프·믹서트럭 → 해당 없음</small></div><div class="rv">0 원</div></div>';
  } else {
    h+='<div class="row sub"><div class="rk">지방교육세<small>세율 2% → (세율−2%)분 없음</small></div><div class="rv">0 원</div></div>';
    h+='<div class="row"><div class="rk">농어촌특별세<small>2%분 × 10%</small></div><div class="rv">'+won(nong)+' 원</div></div>';
  }
  h+=gamyeonRow(g);
  h+='<div class="total"><span class="tk">신고·납부할 세액</span><span class="tv">'+won(tot)+'<span class="u">원</span></span></div>';
  if(t!=='new') h+='<div class="info">이전등록(중고)은 <b>신고가액(매매금액)과 시가표준액 중 큰 값</b>이 과세표준입니다. 무상(증여·상속)은 시가표준액이 과세표준입니다.</div>';
  h+=ddayPenaltyHtml('mc-acqdate', tot);
  if(exempt50) h+='<div class="warn">취득가액 50만원 이하는 취득세 면세점(비과세)입니다. 등록면허세가 별도 부과될 수 있으니 위택스에서 확정됩니다.</div>';
  if(g.label) h+='<div class="warn">감면액은 참고용입니다. 요건·한도는 위택스에서 확정됩니다.</div>';
  h+='<div class="result-actions"><button type="button" onclick="saveRecent()">저장</button><button type="button" onclick="copyResult()">복사</button><button type="button" onclick="shareResult()">공유</button><button type="button" onclick="window.print()">인쇄</button></div>';
  h+=worklistHtml('machine')+nextCalcHtml('machine');
  box.innerHTML=h;
  window._RESULTTEXT=box.innerText;
  animateTotals(box);
  updateSticky('취득세 납부세액', tot);
}

/* ===== 이륜자동차 취득세 ===== */
var MOTO=null, motoLoading=false, mtSelected=null, mtTimer=null;
function mtOpenSearch(){ var el=document.getElementById('mt-search-box'); el.classList.toggle('hidden'); if(!el.classList.contains('hidden')) mtLoad(); }
function mtLoad(){
  if(MOTO||motoLoading) return; motoLoading=true;
  document.getElementById('mt-status').textContent='이륜 데이터 불러오는 중…';
  fetch('./moto_base.json').then(function(r){return r.json();}).then(function(d){
    MOTO=d; motoLoading=false; document.getElementById('mt-status').textContent='총 '+d.length.toLocaleString()+'건 · 차명 검색';
  }).catch(function(){motoLoading=false;document.getElementById('mt-status').textContent='이륜 데이터를 불러오지 못했습니다. 새로고침하면 복구됩니다. 취득가액은 직접 입력할 수 있습니다.';});
}
function mtSearch(){ clearTimeout(mtTimer); mtTimer=setTimeout(mtRun,220); }
function mtRun(){
  if(!MOTO){ mtLoad(); return; }
  var q=document.getElementById('mt-q').value.replace(/\s/g,'').toLowerCase();
  var res=document.getElementById('mt-results');
  if(q.length<1){ res.innerHTML=''; return; }
  var out=[],n=0;
  for(var i=0;i<MOTO.length&&n<40;i++){ var v=MOTO[i]; if((v.n+v.f+v.m).replace(/\s/g,'').toLowerCase().indexOf(q)>=0){ out.push(v); n++; } }
  document.getElementById('mt-status').textContent = out.length?(n>=40?'상위 40건 표시':'검색 결과 '+out.length+'건'):'결과 없음';
  res.innerHTML=out.map(function(v,i){
    return '<div class="sr-item" onclick="mtSelect('+i+')"><span class="sr-price">'+(v.p*1000).toLocaleString()+'원</span>'
      +'<div class="nm">'+v.n+'<span class="badge">'+v.o+'</span>'+(v.e?'<span class="badge">'+v.e+'</span>':'')+'</div><div class="mt">'+v.m+' · '+(v.f||'-')+'</div></div>';
  }).join('');
  window._MTSR=out;
}
function mtSelect(i){
  mtSelected=window._MTSR[i];
  document.getElementById('mt-results').innerHTML='<div class="sr-item" style="cursor:default"><span class="sr-price">'+(mtSelected.p*1000).toLocaleString()+'원</span><div class="nm">✓ '+mtSelected.n+'</div><div class="mt">'+mtSelected.m+' · 기준가격</div></div>';
  var ysel=document.getElementById('mt-year'), now=2026, opt='';
  for(var y=now;y>=now-15;y--) opt+='<option value="'+y+'">'+y+'년식'+(y===now?' (신차)':'')+'</option>';
  ysel.innerHTML=opt;
  document.getElementById('mt-year-box').classList.remove('hidden');
  mtApplySiga();
}
function mtApplySiga(){
  if(!mtSelected) return;
  var rates=RATE.etc['이륜자동차'].rates;
  var elapsed=2026-Number(document.getElementById('mt-year').value); if(elapsed<0)elapsed=0;
  var rate=rates[Math.min(elapsed, rates.length-1)];
  var siga=Math.floor(mtSelected.p*1000*rate/10)*10;
  document.getElementById('mt-siga').value=siga.toLocaleString('ko-KR');
  document.getElementById('mt-siga-note').innerHTML='기준가격 '+(mtSelected.p*1000).toLocaleString()+'원 × 잔가율 '+rate+' (경과 '+elapsed+'년) = <b>'+siga.toLocaleString()+'원</b>';
  mtCalc();
}
function mtCalc(){
  var t=pressed('mt-type');
  document.getElementById('mt-new-box').classList.toggle('hidden', t!=='new');
  document.getElementById('mt-siga-box').classList.toggle('hidden', t==='new');
  if(t==='new') document.getElementById('mt-search-box').classList.add('hidden');
  var mtRR=document.getElementById('mt-report-row'); if(mtRR) mtRR.style.display=(t==='trans')?'':'none';
  var base=0, baseLabel='';
  if(t==='new'){ base=numv('mt-supply'); baseLabel='취득가액'; }
  else if(t==='trans'){ var rep=numv('mt-report'), sig=numv('mt-siga'); base=Math.max(rep,sig); baseLabel=(rep>=sig&&rep>0)?'신고가액(매매금액)':'시가표준액'; }
  else { base=numv('mt-siga'); baseLabel='시가표준액'; }
  var box=document.getElementById('mt-result');
  if(!base){ box.innerHTML=EMPTY.moto; updateSticky('',null); return; }
  var exempt50 = base<=TAX_RULES.acqMoto.exemptUnder, rate=TAX_RULES.acqMoto.rate;
  var acq = exempt50 ? 0 : Math.floor(base*rate/10)*10;
  var g=gamyeonG('mt',acq,base,rate); g.acq=acq; var tot=g.pay;
  var h='<div class="receipt-head">이륜자동차 취득세 (참고용)</div>';
  h+='<div class="row"><div class="rk">과세표준<small>'+baseLabel+'</small></div><div class="rv">'+won(base)+' 원</div></div>';
  h+='<div class="row"><div class="rk">취득세<small>'+(exempt50?'취득가액 50만원 이하 → 면세점(과세 제외)':'세율 2% (이륜자동차) · 지방세법 §12')+'</small></div><div class="rv">'+won(acq)+' 원</div></div>';
  if(!exempt50) h+='<div class="hint" style="text-align:right;margin-top:2px;">계산식: '+won(base)+'원 × 2% = '+won(acq)+'원</div>';
  h+='<div class="row sub"><div class="rk">지방교육세·농어촌특별세<small>세율 2%로 해당 없음</small></div><div class="rv">0 원</div></div>';
  h+=gamyeonRow(g);
  h+='<div class="total"><span class="tk">신고·납부할 세액</span><span class="tv">'+won(tot)+'<span class="u">원</span></span></div>';
  h+=ddayPenaltyHtml('mt-acqdate', tot);
  if(pressed('mt-type')==='trans') h+='<div class="info">중고 이전은 <b>신고가액(매매금액)과 시가표준액 중 큰 값</b>이 과세표준입니다.</div>';
  if(exempt50) h+='<div class="warn">취득가액 50만원 이하는 취득세 면세점(비과세)입니다. 이 경우 등록면허세가 있을 수 있으니(이륜 기준 별도 확인) 위택스에서 확정됩니다.</div>';
  if(g.label) h+='<div class="warn">감면액은 참고용입니다. 요건·한도는 위택스에서 확정됩니다.</div>';
  h+='<div class="result-actions"><button type="button" onclick="saveRecent()">저장</button><button type="button" onclick="copyResult()">복사</button><button type="button" onclick="shareResult()">공유</button><button type="button" onclick="window.print()">인쇄</button></div>';
  h+=worklistHtml('moto')+nextCalcHtml('moto');
  box.innerHTML=h;
  window._RESULTTEXT=box.innerText;
  animateTotals(box);
  updateSticky('취득세 납부세액', tot);
}

/* ===== 통합검색 (Ctrl+K) ===== */
var PAL_CMDS=[
  {t:'취득세 · 자동차',s:'승용·승합·화물 취득세',tag:'기능',go:function(){sw('chwi');pick('c-target','car',onTarget);}},
  {t:'취득세 · 기계장비',s:'건설기계 취득세',tag:'기능',go:function(){sw('chwi');pick('c-target','machine',onTarget);}},
  {t:'취득세 · 이륜차',s:'이륜자동차 취득세',tag:'기능',go:function(){sw('chwi');pick('c-target','moto',onTarget);}},
  {t:'고지분 체납 가산세',s:'재산세·자동차세 등 체납 가산세',tag:'기능',go:function(){sw('gozi');}},
  {t:'신고납부분 가산세',s:'취득세 등 무신고·납부지연',tag:'기능',go:function(){sw('shingo');}},
  {t:'지방세 안내(FAQ)',s:'납기·감면·납부방법 등',tag:'기능',go:function(){sw('faq');}},
  {t:'감면 · 장애인',s:'자동차 취득세 장애인 감면',tag:'감면',go:function(){sw('chwi');pick('c-target','car',onTarget);setGamyeon('disabled');}},
  {t:'감면 · 국가유공자',s:'자동차 취득세 국가유공자 감면',tag:'감면',go:function(){sw('chwi');pick('c-target','car',onTarget);setGamyeon('veteran');}},
  {t:'감면 · 다자녀(3자녀)',s:'다자녀 3자녀 이상 감면',tag:'감면',go:function(){sw('chwi');pick('c-target','car',onTarget);setGamyeon('multi3');}},
  {t:'감면 · 다자녀(2자녀)',s:'다자녀 2자녀 감면',tag:'감면',go:function(){sw('chwi');pick('c-target','car',onTarget);setGamyeon('multi2');}},
  {t:'감면 · 경차',s:'경형자동차 감면',tag:'감면',go:function(){sw('chwi');pick('c-target','car',onTarget);setGamyeon('light');}},
  {t:'감면 · 전기차',s:'전기자동차 감면',tag:'감면',go:function(){sw('chwi');pick('c-target','car',onTarget);setGamyeon('ev');}},
  {t:'감면 · 수소차',s:'수소전기자동차 감면',tag:'감면',go:function(){sw('chwi');pick('c-target','car',onTarget);setGamyeon('fcev');}}
];
function setGamyeon(v){ var el=document.getElementById('c-gamyeon'); if(el){el.value=v; onGamyeon(); cCalc();} }
function tossToShingo(amount){
  sw('shingo');
  var el=document.getElementById('s-tax'); el.value=Number(amount).toLocaleString('ko-KR');
  sType='no'; document.querySelectorAll('#s-type button').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.v==='no');});
  calcShingo();
  el.scrollIntoView({behavior:'smooth',block:'center'});
}
var palSel=0, palResults=[];
function openPalette(){
  document.getElementById('palette').classList.add('open');
  var inp=document.getElementById('pal-input'); inp.value=''; inp.focus();
  palRender();
  // 통합검색용 데이터 미리 로드
  mLoad(); if(typeof mtLoad==='function') mtLoad(); if(typeof loadVeh==='function') loadVeh();
}
function closePalette(){ document.getElementById('palette').classList.remove('open'); }
function palRender(){
  var q=(document.getElementById('pal-input').value||'').replace(/\s/g,'').toLowerCase();
  var list=document.getElementById('pal-list');
  palResults=[]; palSel=0;
  var html='';
  // 1) 기능·감면
  var cmds=PAL_CMDS.filter(function(c){ return !q || (c.t+c.s+c.tag).replace(/\s/g,'').toLowerCase().indexOf(q)>=0; });
  if(cmds.length){
    html+='<div class="pal-sec">기능 · 감면</div>';
    cmds.forEach(function(c){ var i=palResults.length; palResults.push({go:c.go});
      html+='<div class="pal-item" data-i="'+i+'" onclick="palGo('+i+')"><div><div>'+c.t+'</div><div class="pi-sub">'+c.s+'</div></div><div class="pi-tag">'+c.tag+'</div></div>'; });
  }
  // 2) 차명·기종 (2글자 이상일 때)
  if(q.length>=2){
    var veh=searchData(VEH,q,'car',10), mac=searchData(MACH,q,'machine',8), mto=searchData(MOTO,q,'moto',8);
    function block(title,arr,target){
      if(!arr.length) return;
      html+='<div class="pal-sec">'+title+'</div>';
      arr.forEach(function(v){ var i=palResults.length;
        palResults.push({go:(function(vv,tg){return function(){palGoVehicle(vv,tg);};})(v,target)});
        html+='<div class="pal-item" data-i="'+i+'" onclick="palGo('+i+')"><div><div>'+v.n+'</div><div class="pi-sub">'+(v.m||'')+(v.k?' · '+v.k:'')+(v.f?' · '+v.f:'')+'</div></div><div class="pi-tag">'+(v.p*1000).toLocaleString()+'원</div></div>'; });
    }
    block('자동차', veh,'car'); block('기계장비', mac,'machine'); block('이륜', mto,'moto');
    if(!VEH||!MACH||!MOTO) html+='<div class="pal-empty">차명·기종 데이터 불러오는 중… 잠시 후 다시 입력해 보세요.</div>';
  }
  list.innerHTML = html || '<div class="pal-empty">검색 결과가 없습니다.</div>';
  updateSel();
}
function searchData(arr,q,type,limit){
  if(!arr) return [];
  var out=[],n=0;
  for(var i=0;i<arr.length&&n<limit;i++){ var v=arr[i];
    var hay=((v.n||'')+(v.m||'')+(v.f||'')+(v.k||'')).replace(/\s/g,'').toLowerCase();
    if(hay.indexOf(q)>=0){ out.push(v); n++; } }
  return out;
}
function palGo(i){ if(palResults[i]){ palResults[i].go(); closePalette(); } }
function palGoVehicle(v,target){
  sw('chwi'); pick('c-target',target,onTarget);
  if(target==='car'){
    // 차종 세팅 후 검색창 열고 채우기
    if(v.t) pick('c-chong', v.t, function(){}); 
    pick('c-type','trans',cCalc);
    var sb=document.getElementById('c-search-box'); sb.classList.remove('hidden'); loadVeh();
    document.getElementById('c-q').value=v.n; setTimeout(doSearch,50);
  } else if(target==='machine'){
    document.getElementById('mc-base').value=(v.p*1000).toLocaleString('ko-KR'); mCalc();
    var sb=document.getElementById('mc-search-box'); sb.classList.remove('hidden'); mLoad();
    document.getElementById('mc-q').value=v.n; setTimeout(mSearch,50);
  } else {
    pick('mt-type','trans',mtCalc);
    var sb=document.getElementById('mt-search-box'); sb.classList.remove('hidden'); mtLoad();
    document.getElementById('mt-q').value=v.n; setTimeout(mtSearch,50);
  }
}
function updateSel(){
  var items=document.querySelectorAll('#pal-list .pal-item');
  items.forEach(function(el,i){ el.classList.toggle('sel', i===palSel); });
  var cur=items[palSel]; if(cur) cur.scrollIntoView({block:'nearest'});
}
document.addEventListener('keydown', function(e){
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); openPalette(); return; }
  if(e.key==='/' && document.activeElement && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){ e.preventDefault(); openPalette(); return; }
  if(!document.getElementById('palette').classList.contains('open')) return;
  if(e.key==='Escape'){ closePalette(); }
  else if(e.key==='ArrowDown'){ e.preventDefault(); palSel=Math.min(palSel+1,palResults.length-1); updateSel(); }
  else if(e.key==='ArrowUp'){ e.preventDefault(); palSel=Math.max(palSel-1,0); updateSel(); }
  else if(e.key==='Enter'){ e.preventDefault(); palGo(palSel); }
});

/* ===== 최근 계산 기록 (localStorage) ===== */
function saveRecent(){
  var t=(window._RESULTTEXT||'').trim();
  if(!t){ alert('저장할 결과가 없습니다.'); return; }
  var list=[]; try{ list=JSON.parse(localStorage.getItem('jbs_recent')||'[]'); }catch(e){}
  var d=new Date(); var ds=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  list.unshift({d:ds, t:t.slice(0,600)});
  list=list.slice(0,10);
  try{ localStorage.setItem('jbs_recent',JSON.stringify(list)); }catch(e){}
  renderRecent();
  alert('저장했습니다. (최근 10건 보관)');
}
function renderRecent(){
  var card=document.getElementById('recent-card'), box=document.getElementById('recent-list');
  if(!card||!box) return;
  var list=[]; try{ list=JSON.parse(localStorage.getItem('jbs_recent')||'[]'); }catch(e){}
  if(!list.length){ card.classList.add('hidden'); return; }
  card.classList.remove('hidden');
  box.innerHTML=list.map(function(r,i){
    var head=(r.t.split('\n').find(function(l){return l.indexOf('신고·납부할')>=0;})||r.t.split('\n')[0]||'').trim();
    return '<details style="border:1px solid var(--line);border-radius:9px;margin-bottom:6px;"><summary style="padding:9px 12px;cursor:pointer;font-size:12.5px;"><b>'+r.d+'</b> · '+head.slice(0,60)+'</summary><pre style="margin:0;padding:10px 12px;font-size:11.5px;white-space:pre-wrap;font-family:inherit;color:var(--muted);border-top:1px solid var(--line);">'+r.t+'</pre></details>';
  }).join('');
}
function clearRecent(){
  if(!confirm('최근 계산 기록을 모두 삭제할까요?')) return;
  try{ localStorage.removeItem('jbs_recent'); }catch(e){}
  renderRecent();
}

/* ===== 결과 총액 카운트업 ===== */
/* 적용 기준 요약: 이 금액이 왜 나왔는지 즉시 검증 */

/* 적용 기준 요약: 왜 이 금액이 나왔는지 즉시 검증 */
function appliedHtml(items){
  var li=items.filter(function(x){return x && x[1];}).map(function(x){
    return '<li><span class="ck">✓</span><span>'+x[0]+' <b>'+x[1]+'</b></span></li>';
  }).join('');
  var d=new Date();
  var asof=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  return '<div class="applied"><div class="ap-h">이번 계산에 적용된 기준</div><ul>'+li+'</ul>'
    +'<div class="asof">'
    +'<span>계산일 '+asof+'</span>'
    +'<span>적용 기준일 '+TAX_RULES.effectiveFrom+'</span>'
    +'<span>데이터 '+TAX_RULES.version+'</span>'
    +'<span>검토 '+TAX_RULES.reviewedAt+'</span>'
    +'</div></div>';
}

/* 입력 순서 안내: 순서대로 짚어주되 막지 않음 */
function stepsHtml(items){
  var li=items.map(function(s,i){
    var cls=s.done?'done':'todo';
    var mk=s.done?'✓':(i+1);
    return '<li class="'+cls+'" onclick="focusField(\''+s.id+'\')"><span class="mk">'+mk+'</span>'+s.label+'</li>';
  }).join('');
  var left=items.filter(function(s){return !s.done;}).length;
  return '<div class="steps"><div class="st-h">입력 순서'+(left?' · 미입력 '+left+'개':' · 모두 입력됨')+'</div><ol>'+li+'</ol></div>';
}
function focusField(id){
  var el=document.getElementById(id); if(!el) return;
  el.scrollIntoView({block:'center',behavior:'smooth'});
  setTimeout(function(){ try{ el.focus({preventScroll:true}); }catch(e){} }, 260);
}

function initEmpty(){
  var map={'c-result':'car','mc-result':'machine','mt-result':'moto','au-result':'auto','d-result':'deung','j-result':'jae'};
  for(var id in map){ var el=document.getElementById(id); if(el && el.querySelector('.empty')) el.innerHTML=EMPTY[map[id]]; }
}
/* 빈 상태 — 계산 기록지 (앞으로 나올 항목을 목차처럼 예고) */
function emptySheet(kicker, lead, sub, items){
  var li=items.map(function(t){return '<li>'+t+'</li>';}).join('');
  return '<div class="empty">'
    +'<div class="em-kicker">'+kicker+'</div>'
    +'<div class="em-lead">'+lead+'</div>'
    +'<div class="em-sub">'+sub+'</div>'
    +'<ol>'+li+'</ol>'
    +'<div class="em-foot">2026 지방세법 기준</div>'
    +'</div>';
}
var EMPTY={
  jae: emptySheet('Property Tax','산출 준비','주소를 검색하거나 공시가격을 입력하면 아래 순서로 기록됩니다.',
        ['공시가격','과세표준 (공시가격 × 60%)','재산세 본세 (누진세율)','도시지역분 · 지방교육세','연간 재산세 합계']),
  car:  emptySheet('Acquisition Tax','산출 준비','취득 정보를 입력하면 아래 순서로 기록됩니다.',
        ['과세표준 (취득가액)','적용 세율','산출 취득세','지방교육세 · 농어촌특별세','신고·납부할 세액']),
  machine: emptySheet('Machinery Acquisition','산출 준비','취득가액을 입력하면 아래 순서로 기록됩니다.',
        ['과세표준 (취득가액)','적용 세율 3%','산출 취득세','지방교육세 · 농어촌특별세','신고·납부할 세액']),
  moto: emptySheet('Motorcycle Acquisition','산출 준비','취득가액을 입력하면 아래 순서로 기록됩니다.',
        ['과세표준 (취득가액)','적용 세율 2%','신고·납부할 세액']),
  auto: emptySheet('Automobile Tax','산출 준비','차종과 과세 정보를 입력하면 아래 순서로 기록됩니다.',
        ['과세 기준 (배기량·정액)','연세액','차령 반영 (연식)','지방교육세','연 납부세액']),
  deung: emptySheet('Registration Licence','산출 준비','등기 종류와 과세표준을 입력하면 아래 순서로 기록됩니다.',
        ['과세표준 (등록 당시 가액)','적용 세율','등록면허세','지방교육세','신고·납부할 세액'])
};

/* 과세표준이 어떻게 정해졌는지 — 결정 과정을 보여줌 (지방세법 §10의2~10의7) */
function baseDerivationHtml(kind){
  var rows='', note='';
  if(kind==='new'){
    var sup=numv('c-supply'), vat=pressed('c-vat')==='in';
    if(!sup) return '';
    rows+='<div class="drow"><span>계약상 취득가격'+(vat?' (부가세 포함)':'')+'</span><span>'+won(sup)+'원</span></div>';
    if(vat) rows+='<div class="drow"><span>부가가치세 제외 (÷1.1)</span><span>'+won(Math.floor(sup/1.1))+'원</span></div>';
    note='신차는 <b>사실상 취득가격</b>이 과세표준입니다 (지방세법 §10의3①).';
  } else if(kind==='trans'){
    var rep=numv('c-report'), sig=numv('c-siga');
    if(!rep && !sig) return '';
    var pick = (rep>=sig&&rep>0)?'rep':'sig';
    rows+='<div class="drow'+(pick==='rep'?' win':'')+'"><span>신고가액'+(pick==='rep'?' · 채택':'')+'</span><span>'+(rep?won(rep)+'원':'미입력')+'</span></div>';
    rows+='<div class="drow'+(pick==='sig'?' win':'')+'"><span>시가표준액'+(pick==='sig'?' · 채택':'')+'</span><span>'+(sig?won(sig)+'원':'미입력')+'</span></div>';
    note='유상 이전은 <b>신고가액과 시가표준액 중 큰 값</b>을 과세표준으로 합니다 (지방세법 §10의2, §4).';
  } else {
    var sig2=numv('c-siga');
    if(!sig2) return '';
    rows+='<div class="drow win"><span>시가표준액 · 채택</span><span>'+won(sig2)+'원</span></div>';
    note='무상 취득(증여·상속)은 <b>시가표준액</b>이 과세표준입니다 (지방세법 §10의2②).';
  }
  return '<div class="derive"><div class="dv-h">과세표준 결정</div>'+rows+'<div class="dv-note">'+note+'</div></div>';
}

/* 영수증 점선 리더: 항목명과 금액 사이를 점선으로 채움 */
function addLeaders(box){
  box.querySelectorAll('.row').forEach(function(r){
    if(r.querySelector('.lead')) return;
    var k=r.querySelector('.rk'), v=r.querySelector('.rv');
    if(!k||!v) return;
    var lead=document.createElement('span'); lead.className='lead';
    r.insertBefore(lead, v);
  });
}
/* 종이 인쇄 방식: 카운트업 없이, 값이 바뀌면 조용히 배어나오게 */
function animateTotals(box){
  addLeaders(box);
  box.querySelectorAll('.total').forEach(function(el){
    el.classList.remove('ink-set');
    void el.offsetWidth;
    el.classList.add('ink-set');
  });
}

/* 납기말일 주말·공휴일 보정 (지방세기본법 §24) — 공휴일은 2026년 달력 내장(매년 갱신 필요) */
var HOLIDAYS=['2026-01-01','2026-02-16','2026-02-17','2026-02-18','2026-03-01','2026-03-02','2026-05-05','2026-05-24','2026-05-25','2026-06-06','2026-08-15','2026-08-17','2026-09-24','2026-09-25','2026-09-26','2026-10-03','2026-10-05','2026-10-09','2026-12-25'];
function isHoliday(d){
  var wd=d.getDay(); if(wd===0||wd===6) return true;
  var s=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  return HOLIDAYS.indexOf(s)>=0;
}
function adjustDue(d){
  var moved=false;
  while(isHoliday(d)){ d.setDate(d.getDate()+1); moved=true; }
  return {date:d, moved:moved};
}
/* 취득일 기준 신고기한 D-day + 기한초과 가산세(무신고 20% + 납부지연) HTML */
function ddayPenaltyHtml(acqDateId, tot){
  var ad=document.getElementById(acqDateId); if(!ad||!ad.value) return '';
  var due=new Date(ad.value+'T00:00:00'); due.setDate(due.getDate()+60);
  var adj=adjustDue(due); due=adj.date;
  var today=new Date(); today.setHours(0,0,0,0);
  var dstr=(due.getMonth()+1)+'월 '+due.getDate()+'일'+(adj.moved?' (주말·공휴일 보정)':'');
  var payD=new Date(); payD.setHours(0,0,0,0);
  if(payD>due && tot>0){
    var days=Math.round((payD-due)/86400000);
    var rp=Math.floor(tot*0.20/10)*10;
    var interest=tot*0.00022*days, cap=tot*0.75, capped=interest>cap;
    var lp=Math.floor(Math.min(interest,cap)/10)*10;
    var grand=tot+rp+lp;
    var h='<div class="dday" style="border-left:2px solid var(--seal)">⚠ 신고기한('+dstr+')을 <b>'+days+'일</b> 지나 납부 예정 → 가산세가 부과됩니다.</div>';
    h+='<div class="docs" style="border-color:var(--seal)"><h4>가산세 (무신고 기준)</h4>';
    h+='<div class="row" style="padding-top:6px"><div class="rk">본세(감면 후)</div><div class="rv">'+won(tot)+' 원</div></div>';
    h+='<div class="row"><div class="rk">무신고가산세<small>본세 × 20%</small></div><div class="rv">'+won(rp)+' 원</div></div>';
    h+='<div class="row"><div class="rk">납부지연가산세<small>'+days+'일 × 0.022%</small></div><div class="rv">'+won(lp)+' 원</div></div>';
    h+='<div class="total" style="margin-top:10px"><span class="tk">가산세 포함 총 납부액</span><span class="tv">'+won(grand)+'<span class="u">원</span></span></div>';
    if(capped)h+='<div class="sub">납부지연가산세가 본세 75% 한도로 조정되었습니다.</div>';
    h+='<div class="sub">※ 무신고(20%) 기준입니다. 과소·부정신고는 "신고납부분 가산세" 탭에서 계산합니다.</div></div>';
    return h;
  }
  var dleft=Math.round((due-today)/86400000);
  return '<div class="dday">신고·납부 기한: <b>'+dstr+'</b>까지 (D-'+dleft+'). 오늘 신고·납부하면 가산세가 없습니다.</div>';
}

function updateSticky(label, amount){
  var bar=document.getElementById('sticky-total');
  if(!bar) return;
  var onChwi = !document.getElementById('m-chwi').classList.contains('hidden');
  if(!onChwi || !(amount>=0) || amount===null){ bar.style.display='none'; return; }
  document.getElementById('st-label').textContent=label;
  document.getElementById('st-value').textContent=Number(amount).toLocaleString('ko-KR')+'원';
  bar.style.display='';
}

/* 날짜 입력: 연도 4자리 제한 (브라우저 기본은 6자리까지 허용됨) */
function clampDateInputs(){
  document.querySelectorAll('input[type=date]').forEach(function(el){
    el.setAttribute('min','1950-01-01');
    el.setAttribute('max','2099-12-31');
    if(el._clamped) return; el._clamped=true;
    var fix=function(){
      var v=el.value; if(!v) return;
      var p=v.split('-'); if(p.length!==3) return;
      var y=p[0];
      if(y.length>4 || Number(y)>2099){ el.value='2099-'+p[1]+'-'+p[2]; }
      else if(Number(y)<1950 && y.length>=4){ el.value='1950-'+p[1]+'-'+p[2]; }
      else return;
      el.dispatchEvent(new Event('input',{bubbles:true}));
    };
    el.addEventListener('change',fix);
    el.addEventListener('blur',fix);
    el.addEventListener('input',function(){
      var v=el.value; if(!v) return;
      var p=v.split('-');
      if(p.length===3 && p[0].length>4){ fix(); }
    });
  });
}

/* init */
function resetInputs(){
  // 값 입력 비우기 (지분율은 100 유지)
  document.querySelectorAll('#m-chwi input, #m-shingo input, #g-pay').forEach(function(i){
    if(i.id==='c-share'){ i.value='100'; } else { i.value=''; }
  });
  // 세그먼트/선택 기본값 복원
  var defs={'c-target':'car','c-type':'new','c-chong':'승용','c-use':'비영업','c-light':'0','c-vat':'ex','c-eco':'0','c-elig':'0','c-seat':'small','sc-child':'0','sc-disabled':'0','sc-car':'0'};
  for(var g in defs){ if(document.getElementById(g)) pick(g,defs[g]); }
  onTarget();
  onDeungKind();
  var gm=document.getElementById('c-gamyeon'); if(gm){gm.value='none'; onGamyeon();}
  var rg=document.getElementById('c-region'); if(rg) rg.value='none';
  var bx=document.getElementById('c-bondexempt'); if(bx) bx.value='none';
  document.getElementById('c-selfcheck').classList.add('hidden');
  document.getElementById('c-search-box').classList.add('hidden');
  selected=null;
  // 신고유형 기본값
  sType='no'; document.querySelectorAll('#s-type button').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.v==='no');});
  // 고지분 체납 건 초기화
  document.getElementById('rows').innerHTML=''; rid=0; addRow();
  // 재계산
  cCalc(); recalcGozi(); calcShingo();
}
function onAutoMode(){
  var m=pressed('au-mode'), daily=(m==='new'||m==='buy'||m==='sell'||m==='scrap');
  document.getElementById('au-daily-box').classList.toggle('hidden', !daily);
  document.getElementById('au-prepay-wrap').style.display = (m==='prepay')?'':'none';
  document.getElementById('au-refund-box').style.display = (m==='sell'||m==='scrap')?'':'none';
  var hints={
    full:'1년 내내 보유하는 경우의 연세액입니다. 6월·12월에 절반씩 부과됩니다.',
    prepay:'연세액을 미리 납부하고 공제받는 경우입니다. 신청 시기에 따라 공제율이 다릅니다.',
    new:'신규 등록일부터 12월 31일까지 <b>보유한 날수만큼</b> 부과됩니다.',
    buy:'차량을 <b>산 사람(매수인)</b>이 부담합니다. 이전등록일부터 12월 31일까지 부과됩니다.',
    sell:'차량을 <b>판 사람(매도인)</b>이 부담합니다. 이전등록일 <b>전날까지</b> 부과됩니다.',
    scrap:'1월 1일부터 <b>말소일까지</b> 부과됩니다. 말소일 이후는 부과되지 않습니다.'
  };
  var hint=document.getElementById('au-mode-hint'); if(hint) hint.innerHTML=hints[m]||'';
  autoCalc();
}
/* 취득일 기준으로 신청 가능한 연납 차수 판정 (신청기간: 1/16~31, 3/16~31, 6/16~30, 9/16~30) */
function prepayAvailable(dateStr){
  if(!dateStr) return [1,3,6,9];
  var d=new Date(dateStr+'T00:00:00'), m=d.getMonth()+1, day=d.getDate();
  var out=[];
  [[1,31],[3,31],[6,30],[9,30]].forEach(function(p){
    if(m<p[0] || (m===p[0] && day<=p[1])) out.push(p[0]);
  });
  return out;
}
function autoDailyDays(){
  var ev=pressed('au-mode'), rd=document.getElementById('au-eventdate').value;
  var lab=document.getElementById('au-event-datelabel'), hint=document.getElementById('au-event-hint');
  var labels={new:'신규 등록일',sell:'이전등록일 (매도)',buy:'이전등록일 (매수)',scrap:'말소·폐차일'};
  if(lab) lab.textContent=labels[ev]||'사유 발생일';
  if(!rd) return null;
  var ed=new Date(rd+'T00:00:00'), Y=ed.getFullYear();
  var y0=new Date(Y,0,1), y1=new Date(Y,11,31);
  var total=Math.round((y1-y0)/86400000)+1;
  var start,end;
  if(ev==='new'||ev==='buy'){ start=ed; end=y1; }
  else if(ev==='sell'){ start=y0; end=new Date(ed.getTime()-86400000); }
  else { start=y0; end=ed; } // scrap
  var days=Math.round((end-start)/86400000)+1; if(days<0)days=0; if(days>total)days=total;
  var f=function(d){return (d.getMonth()+1)+'.'+d.getDate();};
  return {days:days,total:total,Y:Y,period:f(start)+' ~ '+f(end)};
}

/* ===== 랜딩 ↔ 계산기 ===== */
function enter(tab, target){
  document.getElementById('landing').classList.add('hidden');
  var app=document.getElementById('app');
  app.classList.remove('hidden');
  sw(tab);
  if(target){ pick('c-target', target, onTarget); }
  window.scrollTo(0,0);
  app.classList.remove('anim'); void app.offsetWidth; app.classList.add('anim');
}
function goHome(){
  document.getElementById('app').classList.add('hidden');
  document.getElementById('landing').classList.remove('hidden');
  updateSticky('',null);
  window.scrollTo(0,0);
}

/* ===== 자동차세 (소유분 정기분) ===== */
var AUTO_PREPAY={ '0':0, '1':0.0458, '3':0.0376, '6':0.0251, '9':0.0125 };
var AUTO_VAN={ // 승합 [영업, 비영업]
  soilban:[25000,65000], daeilban:[42000,115000], sojeonse:[50000,null], daejeonse:[70000,null], gosok:[100000,null]
};
var AUTO_VAN_NM={soilban:'소형일반버스',daeilban:'대형일반버스',sojeonse:'소형전세버스',daejeonse:'대형전세버스',gosok:'고속버스'};
var AUTO_TRUCK=[ // [상한kg, 영업, 비영업]
  [1000,6600,28500],[2000,9600,34500],[3000,13500,48000],[4000,18000,63000],
  [5000,22500,79500],[8000,36000,130500],[10000,45000,157500]
];
var AUTO_SPECIAL={ so:[13500,58500], dae:[36000,157500] };
/* 이륜자동차 자동차세: 과세대상 125cc 초과 (지방세법 §127①4) */
function autoMotoTax(cc, biz){
  if(cc<=125) return {tax:0, label:'125cc 이하 → 자동차세 비과세'};
  if(biz) return {tax:3300, label:'영업용 이륜 정액'};
  if(cc<=260) return {tax:18000, label:'125cc 초과~260cc 이하'};
  if(cc<=1000) return {tax:36000, label:'260cc 초과~1,000cc 이하'};
  return {tax:54000, label:'1,000cc 초과 대형이륜'};
}
var AUTO_SPECIAL_NM={so:'소형특수',dae:'대형특수'};

function onAutoKind(){
  var k=pressed('au-kind');
  ['passenger','van','truck','special','moto'].forEach(function(x){
    document.getElementById('au-'+x).classList.toggle('hidden', x!==k);
  });
  // 차령경감은 승용만 노출
  document.getElementById('au-age-wrap').style.display = (k==='passenger')?'':'none';
  autoCalc();
}

function autoCalc(){
  var box=document.getElementById('au-result'); if(!box) return;
  var use=pressed('au-use'), kind=pressed('au-kind'), biz=(use==='biz');
  // 비과세 (지방세법 §126) — 세율 계산보다 우선
  var ntx=document.getElementById('au-nontax').value;
  if(ntx!=='none'){
    var ntxNm={gov:'국가·지자체의 국방·경호·경비·교통순찰·소방용 자동차',gov2:'국가·지자체의 환자수송·청소·오물제거·도로공사용 자동차',diplo:'주한외교기관·국제연합기관·주한외국원조기관 사용 자동차',post:'정부 우편·전파관리 전용 특수구조 자동차',export:'「관세법」에 따라 수출신고 후 수출된 자동차',disaster:'천재지변·화재·교통사고로 멸실·파손되어 사용할 수 없는 자동차',scrap:'자동차해체재활용업자에게 폐차되었음이 증명된 자동차',auction:'공매 등 강제집행 진행 중인 자동차'}[ntx];
    var needApply=(ntx==='export'||ntx==='disaster'||ntx==='scrap');
    var hh='<div class="receipt-head">자동차세 산정</div>';
    hh+='<div class="row"><div class="rk">비과세 사유<small>'+ntxNm+'</small></div><div class="rv">§126</div></div>';
    hh+='<div class="total"><span class="tk">납부할 자동차세</span><span class="tv" style="color:var(--teal)">0<span class="u">원</span></span></div>';
    hh+='<div class="info"><b>비과세 대상</b>입니다 — 자동차세를 부과하지 않습니다(지방세법 §126, 시행령 §121).'+(needApply?' 다만 이 사유는 <b>증빙서류를 갖춰 시장·군수·구청장에게 신청</b>해야 적용됩니다(령 §121③).':'')+'</div>';
    hh+='<div class="result-actions"><button type="button" onclick="copyResult()">복사</button><button type="button" onclick="window.print()">인쇄</button></div>';
    box.innerHTML=hh; window._RESULTTEXT=box.innerText; updateSticky('자동차세 (비과세)', 0);
    return;
  }
  var base=0, info='', eduApplies=false, ageEligible=false, note='';

  if(kind==='passenger'){
    var fuel=pressed('au-fuel'), isEV=(fuel==='ev');
    document.getElementById('au-cc-box').classList.toggle('hidden', isEV);
    eduApplies = !biz;                 // 지방교육세: 비영업 승용만
    if(isEV){
      base = biz? 20000 : 100000; info='전기·수소 정액';
    } else {
      var cc=numv('au-cc');
      if(!cc){ box.innerHTML=EMPTY.auto; updateSticky('',null); return; }
      var rate = biz ? (cc<=1600?18:cc<=2500?19:24) : (cc<=1000?80:cc<=1600?140:200);
      base = cc*rate; info=cc.toLocaleString('ko-KR')+'cc × '+rate+'원';
      ageEligible = !biz;              // 차령경감: 비영업 승용 내연만
    }
  } else if(kind==='van'){
    var vt=document.getElementById('au-van-type').value, row=AUTO_VAN[vt], v=biz?row[0]:row[1];
    if(v==null){ box.innerHTML='<div class="empty">'+AUTO_VAN_NM[vt]+'는 영업용 기준입니다. 용도를 영업용으로 두어야 합니다.</div>'; updateSticky('',null); return; }
    base=v; info=AUTO_VAN_NM[vt]+' 정액';
  } else if(kind==='truck'){
    var kg=numv('au-ton'), tt=document.getElementById('au-truck-type').value;
    if(!kg){ box.innerHTML='<div class="empty"><b>세액 산출 대기</b>적재정량(kg)을 입력하면<br>연세액이 표시됩니다.</div>'; updateSticky('',null); return; }
    var deemed=false;
    if(tt==='mixer' && kg<=10000){ kg=10001; deemed=true; }  // 령 §123④: 1만kg 초과로 봄
    var br=null; for(var i=0;i<AUTO_TRUCK.length;i++){ if(kg<=AUTO_TRUCK[i][0]){ br=AUTO_TRUCK[i]; break; } }
    var ttNm={normal:'',dump:'덤프트럭 · ',mixer:'콘크리트믹서트럭 · '}[tt];
    if(br){ base = biz?br[1]:br[2]; info=ttNm+(br[0]/1000)+'톤 이하 정액'; }
    else { // 1만kg 초과
      var top=AUTO_TRUCK[AUTO_TRUCK.length-1]; base = biz?top[1]:top[2];
      var over=Math.ceil((kg-10000)/1000/10)*10; // 편의상 정확: 매 1만kg
      var extraUnits=Math.ceil((kg-10000)/10000);
      base += extraUnits*(biz?10000:30000);
      info=ttNm+'10톤 초과('+extraUnits+'만kg 가산)'+(deemed?' · 믹서트럭 1만kg 초과 간주':'');
    }
  } else if(kind==='special'){
    var st=document.getElementById('au-special-type').value, r=AUTO_SPECIAL[st];
    base = biz?r[0]:r[1]; info=AUTO_SPECIAL_NM[st]+' 정액';
  } else if(kind==='moto'){
    var mcc=numv('au-moto-cc');
    if(!mcc){ box.innerHTML=EMPTY.auto; updateSticky('',null); return; }
    var mt=autoMotoTax(mcc,biz); base=mt.tax; info=mt.label;
    if(base===0){
      box.innerHTML='<div class="receipt-head">자동차세 산정</div><div class="info">배기량 <b>'+mcc.toLocaleString('ko-KR')+'cc</b> 이륜자동차는 <b>자동차세 과세대상이 아닙니다</b>(125cc 초과분만 과세). 취득세는 별도로 과세되니 [취득세] 탭에서 계산합니다.</div>';
      window._RESULTTEXT=box.innerText; updateSticky('',null); return;
    }
  }

  // 차령 반영: 연식별 세액 자동 차감 (비영업 승용 내연만)
  var reduceRate=0, ageYears=0, giSan='', ageMissing=false, futureReg=false;
  if(ageEligible){
    var rd=document.getElementById('au-regdate').value;
    if(!rd) ageMissing=true;
    if(rd){
      var d=new Date(rd+'T00:00:00'), ry=d.getFullYear(), rm=d.getMonth()+1;
      giSan = (rm<=6)?'1월 1일':'7월 1일';
      ageYears = 2026 - ry + 1; if(ageYears>12) ageYears=12;
      if(ageYears<1){ ageYears=0; futureReg=true; reduceRate=0; }
      if(ageYears>=TAX_RULES.ageRelief.startYear){ reduceRate = Math.min(TAX_RULES.ageRelief.max, TAX_RULES.ageRelief.perYear*(ageYears-2)); }
    }
  }
  var reduced = Math.floor(base*(1-reduceRate)/10)*10;
  var edu = eduApplies ? Math.floor(reduced*0.30/10)*10 : 0;
  var annual = reduced + edu;

  var pv=document.getElementById('au-prepay').value, prate=AUTO_PREPAY[pv]||0;
  var discount = prate? Math.floor(annual*prate/10)*10 : 0;
  var payable = annual - discount;

  var h='<div class="receipt-head">자동차세 산정 (연세액)</div>';
  h+='<div class="row"><div class="rk">자동차세 본세<small>'+info+' · 지방세법 §127</small></div><div class="rv">'+won(base)+' 원</div></div>';
  if(reduceRate>0) h+='<div class="row sub"><div class="rk">차령 반영 (연식)<small>차령 '+ageYears+'년 · 세액 '+Math.round(reduceRate*100)+'% 차감 · 기산일 '+giSan+' · 자동 적용</small></div><div class="rv">−'+won(base-reduced)+' 원</div></div>';
  if(ageMissing){
    h+='<div class="warn" style="margin-top:12px"><b>최초 등록일 미입력</b> — 현재는 <b>차령 미반영</b> 금액입니다. 비영업 승용은 차령 3년째부터 세액이 매년 5%씩(최대 50%) 줄어드니, 등록일을 입력하면 실제 세액이 더 낮아질 수 있습니다.</div>';
  }
  if(futureReg){ h+='<div class="warn" style="margin-top:12px"><b>등록일이 미래 날짜</b> — 최초 등록일이 기준연도(2026) 이후입니다. 차령 반영 없이 <b>신차 기준</b>으로 계산했습니다. 등록일을 확인하세요.</div>'; }
  if(reduceRate>0){
    var half=Math.floor(reduced/2/10)*10;
    h+='<div class="row sub"><div class="rk">제1기분 (1~6월)<small>A/2 − (A/2 × 5%)(n−2), 차령 '+ageYears+'년</small></div><div class="rv">'+won(half)+' 원</div></div>';
    h+='<div class="row sub"><div class="rk">제2기분 (7~12월)</div><div class="rv">'+won(reduced-half)+' 원</div></div>';
  }
  if(eduApplies) h+='<div class="row"><div class="rk">지방교육세<small>자동차세 × 30% · §150,§151</small></div><div class="rv">'+won(edu)+' 원</div></div>';
  else h+='<div class="row sub"><div class="rk">지방교육세<small>비영업 승용만 부과 → 해당 없음</small></div><div class="rv">0 원</div></div>';
  h+='<div class="total"><span class="tk">연세액</span><span class="tv">'+won(annual)+'<span class="u">원</span></span></div>';
  var _m=pressed('au-mode');
  if(_m==='new'||_m==='buy'||_m==='sell'||_m==='scrap'){
    var dd=autoDailyDays();
    if(!dd){ h+='<div class="info">사유 발생일을 입력하면 일할세액이 표시됩니다.</div>'; }
    else {
      var prorated=Math.floor(annual*dd.days/dd.total/10)*10, buseng=(prorated<2000);
      if(buseng) prorated=0;
      var evNm={new:'신규등록',sell:'매도(이전등록)',buy:'매수(이전등록)',scrap:'말소·폐차'}[pressed('au-mode')];
      var payerNm={new:'신규등록 · 소유기간 일할',sell:'매도인 납부분 · 소유기간 일할',buy:'매수인 납부분 · 소유기간 일할',scrap:'말소·폐차 · 소유기간 일할'}[pressed('au-mode')]||'소유기간 일할';
      h+='<div class="docs" style="margin-top:20px"><h4>'+payerNm+'</h4>';
      h+='<div class="row" style="padding-top:6px"><div class="rk">연세액</div><div class="rv">'+won(annual)+' 원</div></div>';
      h+='<div class="row"><div class="rk">과세기간<small>'+evNm+'</small></div><div class="rv" style="font-size:12.5px">'+dd.period+'</div></div>';
      h+='<div class="row"><div class="rk">보유일수<small>'+dd.Y+'년 '+dd.total+'일 기준</small></div><div class="rv">'+dd.days+'일</div></div>';
      h+='<div class="total" style="margin-top:10px"><span class="tk">'+({buy:'매수인 납부세액',sell:'매도인 납부세액',new:'신규등록분 납부세액',scrap:'말소분 납부세액'}[pressed('au-mode')]||'일할 납부세액')+'</span><span class="tv" style="color:var(--teal)">'+won(prorated)+'<span class="u">원</span></span></div>';
      if(buseng) h+='<div class="sub">일할세액 2,000원 미만 → 소액부징수(0원).</div>';
      // 매도/매수: 양 당사자 안분 내역 동시 표시
      if(pressed('au-mode')==='sell'||pressed('au-mode')==='buy'){
        var sellDays=dd.total-dd.days, buyDays=dd.days;
        if(pressed('au-mode')==='sell'){ sellDays=dd.days; buyDays=dd.total-dd.days; }
        var sellTax=Math.floor(annual*sellDays/dd.total/10)*10, buyTax=Math.floor(annual*buyDays/dd.total/10)*10;
        if(sellTax<2000) sellTax=0; if(buyTax<2000) buyTax=0;
        h+='</div><div class="docs" style="margin-top:20px"><h4>양 당사자 안분 내역</h4>';
        h+='<div class="row" style="padding-top:6px"><div class="rk">매도인 (양도인)<small>1.1 ~ 이전등록일 전날 · '+sellDays+'일</small></div><div class="rv">'+won(sellTax)+' 원</div></div>';
        h+='<div class="row"><div class="rk">매수인 (양수인)<small>이전등록일 ~ 12.31 · '+buyDays+'일</small></div><div class="rv">'+won(buyTax)+' 원</div></div>';
        h+='<div class="row sub"><div class="rk">합계<small>연세액 '+won(annual)+'원 · '+dd.total+'일</small></div><div class="rv">'+won(sellTax+buyTax)+' 원</div></div>';
        h+='<div class="sub">이전등록일 <b>당일은 매수인</b> 부담입니다(§129·령§126). 각자에게 별도 고지됩니다.</div>';
      }
      if(pressed('au-mode')==='new'||pressed('au-mode')==='buy'){
        var av=prepayAvailable(document.getElementById('au-eventdate').value);
        h+= av.length
          ? '<div class="sub">이 취득일 기준 <b>신청 가능한 연납</b>: '+av.join('월 · ')+'월. (신청기간: 1/16~31, 3/16~31, 6/16~30, 9/16~30)</div>'
          : '<div class="sub">이 취득일 기준 <b>올해 신청 가능한 연납이 없습니다.</b> 다음 연도 1월 연납을 이용할 수 있습니다.</div>';
      }
      // 연납 환급
      var pre=document.getElementById('au-prepaid');
      document.getElementById('au-prepaid-when').classList.toggle('hidden', !(pre&&pre.checked));
      if(pre && pre.checked && (pressed('au-mode')==='sell'||pressed('au-mode')==='scrap')){
        var pm=document.getElementById('au-prepaid-month').value, pr=AUTO_PREPAY[pm]||0;
        var paid=annual-Math.floor(annual*pr/10)*10;
        var refund=paid-prorated; if(refund<0) refund=0;
        h+='</div><div class="docs" style="margin-top:20px;border-color:var(--teal)"><h4>연납 환급액</h4>';
        h+='<div class="row" style="padding-top:6px"><div class="rk">이미 낸 연납액<small>'+pm+'월 연납 · 공제 '+(pr*100).toFixed(2)+'% 적용</small></div><div class="rv">'+won(paid)+' 원</div></div>';
        h+='<div class="row"><div class="rk">보유기간 해당분<small>'+dd.days+'일분</small></div><div class="rv">−'+won(prorated)+' 원</div></div>';
        h+='<div class="total" style="margin-top:10px"><span class="tk">환급 예상액</span><span class="tv" style="color:var(--teal)">'+won(refund)+'<span class="u">원</span></span></div>';
        h+='<div class="sub">말소·이전등록일 기준으로 관할 지자체가 환부결정 후 지급합니다(위택스 환급신청 가능).</div>';
      }
      h+='<div class="sub">양도일 당일은 양수인 부담. 차령 3년↑ 비영업 승용은 기분별 정밀계산과 소액 차이가 날 수 있어 위택스에서 확정됩니다.</div></div>';
    }
  } else if(_m==='prepay' && prate>0){
    h+='<div class="docs" style="margin-top:20px"><h4>연납 적용</h4>';
    h+='<div class="row" style="padding-top:6px"><div class="rk">연세액</div><div class="rv">'+won(annual)+' 원</div></div>';
    h+='<div class="row"><div class="rk">연납 공제<small>'+pv+'월 · '+(prate*100).toFixed(2)+'%</small></div><div class="rv">−'+won(discount)+' 원</div></div>';
    h+='<div class="total" style="margin-top:10px"><span class="tk">연납 납부액</span><span class="tv" style="color:var(--teal)">'+won(payable)+'<span class="u">원</span></span></div></div>';
  } else {
    var h1=Math.floor(annual/2/10)*10, h2=annual-h1;
    h+='<div class="docs" style="margin-top:20px"><h4>기분별 납부 안내</h4>';
    h+='<div class="row" style="padding-top:6px"><div class="rk">제1기분 (1~6월분)<small>납기 6월 16일 ~ 6월 30일</small></div><div class="rv">'+won(h1)+' 원</div></div>';
    h+='<div class="row"><div class="rk">제2기분 (7~12월분)<small>납기 12월 16일 ~ 12월 31일</small></div><div class="rv">'+won(h2)+' 원</div></div>';
    if(annual<=100000) h+='<div class="sub">연세액 10만원 이하는 제1기분에 <b>전액 부과</b>할 수 있습니다(§128④).</div>';
    else h+='<div class="sub">분할납부 신청 시 각 기분의 1/2을 3월 16~31일, 9월 16~30일에 나눠 낼 수 있습니다(§128①).</div>';
    h+='</div>';
  }
  // ===== 감면 (지특법 §17 장애인 / §29④ 국가유공자·보훈보상대상자) =====
  var relief=document.getElementById('au-relief').value;
  var rdet=document.getElementById('au-relief-detail'), rseat=document.getElementById('au-seat-box');
  rdet.classList.toggle('hidden', relief==='none');
  rseat.classList.toggle('hidden', !(relief!=='none' && (kind==='passenger'||kind==='van')));
  if(relief!=='none'){
    var seat=numv('au-seat'), eligible=false, reason='', why='';
    if(kind==='passenger'){
      var isEVp=(pressed('au-fuel')==='ev'), ccv=numv('au-cc');
      if(isEVp){ eligible = !seat || seat<=10; reason='전기·수소 승용'+(seat?(' '+seat+'인승'):''); }
      else if(ccv>0 && ccv<=2000){ eligible=true; reason='배기량 '+ccv.toLocaleString('ko-KR')+'cc (2,000cc 이하)'; }
      else if(seat>=7 && seat<=10){ eligible=true; reason=seat+'인승 (7~10인승 승용)'; }
      else { eligible=false; reason='2,000cc 초과이고 7~10인승도 아님'; why='배기량 2,000cc 이하 또는 승차정원 7~10인승이어야 합니다.'; }
    } else if(kind==='van'){
      if(seat && seat<=15){ eligible=true; reason=seat+'인승 승합 (15인승 이하)'; }
      else if(seat>15){ eligible=false; reason=seat+'인승 (15인승 초과)'; why='승합은 승차정원 15인승 이하만 대상입니다.'; }
      else { eligible=false; reason='승차정원 미입력'; why='승차정원을 입력하면 대상 여부가 판정됩니다.'; }
    } else if(kind==='truck'){
      var kgv=numv('au-ton');
      eligible = kgv>0 && kgv<=1000;
      reason = eligible ? '적재정량 '+kgv.toLocaleString('ko-KR')+'kg (1톤 이하)' : '적재정량 1톤 초과';
      if(!eligible) why='화물은 적재정량 1톤(1,000kg) 이하만 대상입니다.';
    } else if(kind==='moto'){
      eligible=true; reason='이륜자동차';
    } else { eligible=false; reason='특수자동차'; why='특수자동차는 감면 대상 차종이 아닙니다.'; }

    var rNm={disabled:'장애인용 자동차 (§17)',veteran:'국가유공자 (§29④)',bohun:'보훈보상대상자 (§29④)'}[relief];
    var rate50=(relief==='bohun');
    // 요건 체크리스트
    var reqs={
      disabled:['장애의 정도가 <b>심한 장애인</b>(구 1~3급) 또는 시각장애 4급 중 일부','<b>보철용·생업활동용</b>으로 사용','본인 명의 또는 <b>세대별 주민등록표상 세대원</b>(배우자·직계혈족·형제자매 등)과 공동명의','취득세·자동차세 중 먼저 신청하는 <b>1대</b>에 한정'],
      veteran:['국가유공자로서 <b>상이등급 1~7급</b> 판정 (5·18부상자 1~14급, 고엽제 경도 이상 포함)','<b>보철용·생업활동용</b>으로 사용','본인 명의 또는 세대를 함께하는 배우자·직계존비속·형제자매 등과 공동명의','<b>§17 장애인 감면을 받은 경우 중복 불가</b>'],
      bohun:['보훈보상대상자로서 <b>상이등급 1~7급</b> 판정','전액면제가 아닌 <b>100분의 50 경감</b>','본인 명의 또는 세대를 함께하는 가족과 공동명의','§17 장애인 감면과 중복 불가']
    }[relief];
    var reqBox=document.getElementById('au-relief-req');
    if(reqBox) reqBox.innerHTML='<div class="ct">감면 요건</div><ul><li>'+reqs.join('</li><li>')+'</li></ul>';

    var eligOK = pressed('au-elig')==='1';
    if(!eligible){
      h+='<div class="warn"><b>'+rNm+'</b> 대상 차량이 아닙니다 — '+reason+'. '+(why||'')+'</div>';
    } else if(!eligOK){
      h+='<div class="warn"><b>'+rNm+'</b> 대상 차량입니다('+reason+'). 위에서 <b>요건 충족</b>을 선택하면 감면 세액이 계산됩니다.</div>';
    } else {
      var cut = rate50 ? Math.floor(annual*0.5/10)*10 : annual;
      var after = annual-cut;
      h+='<div class="docs" style="margin-top:20px;border-color:var(--teal)"><h4>'+rNm+' 적용</h4>';
      h+='<div class="row" style="padding-top:6px"><div class="rk">감면 전 연세액<small>'+reason+'</small></div><div class="rv">'+won(annual)+' 원</div></div>';
      h+='<div class="row"><div class="rk">'+(rate50?'50% 경감':'전액면제')+'</div><div class="rv">−'+won(cut)+' 원</div></div>';
      h+='<div class="total" style="margin-top:10px"><span class="tk">감면 후 납부세액</span><span class="tv" style="color:var(--teal)">'+won(after)+'<span class="u">원</span></span></div>';
      h+='<div class="sub">⚠ 등록일부터 <b>1년 이내</b>에 사망·혼인·해외이민·운전면허취소 등 부득이한 사유 없이 소유권을 이전하거나 세대를 분가하면 <b>면제세액이 추징</b>됩니다. 감면은 시·군·구청 신청이 필요합니다.</div></div>';
      updateSticky('감면 후 자동차세', after);
    }
  }
  h+='<div class="result-actions"><button type="button" onclick="saveRecent()">저장</button><button type="button" onclick="copyResult()">복사</button><button type="button" onclick="shareResult()">공유</button><button type="button" onclick="window.print()">인쇄</button></div>';
  h+='<a class="wetax-btn" href="https://www.wetax.go.kr" target="_blank" rel="noopener">위택스에서 차량번호로 조회</a>';
  h+=appliedHtml([
    ['산정 구분', {full:'연세액',prepay:'연납',new:'신규등록',buy:'매수',sell:'매도',scrap:'말소·폐차'}[pressed('au-mode')]],
    ['용도', biz?'영업용':'비영업용'],
    ['차종', {passenger:'승용',van:'승합',truck:'화물',special:'특수',moto:'이륜'}[kind]],
    ['과세 근거', info],
    ['차령', (ageYears? ageYears+'년 (세액 '+Math.round(reduceRate*100)+'% 차감)' : (ageEligible?'미입력':'해당 없음'))],
    ['지방교육세', eduApplies?'30% 부과':'해당 없음'],
    ['연납 공제', (pressed('au-mode')==='prepay'&&prate>0)?((prate*100).toFixed(2)+'%'):'미적용'],
    ['비과세·감면', (relief&&relief!=='none')?'신청 대상':'없음']
  ], document.getElementById('au-eventdate').value||null);
  h+='<div class="docs" style="margin-top:24px"><h4>참고</h4><ul style="margin:6px 0 0;padding-left:16px;font-size:12px;color:var(--muted);line-height:1.85;">'
   +'<li>본 계산은 <b>개산(참고용)</b>이며, 실제 부과액은 차량 등록정보·과세기준일에 따라 달라질 수 있습니다.</li>'
   +'<li>비과세·감면 대상 여부는 <b>별도 확인·신청</b>이 필요합니다(관할 시·군·구청).</li>'
   +'<li>연납 공제율·차령 반영률은 매년 개정될 수 있으며, 지자체 조례로 표준세율의 50%까지 가감될 수 있습니다(§127③).</li>'
   +'</ul></div>';
  h+=appliedHtml([
    ['산정 구분', {full:'연세액',prepay:'연납',new:'신규등록',buy:'매수',sell:'매도',scrap:'말소·폐차'}[pressed('au-mode')]],
    ['용도', biz?'영업용':'비영업용'],
    ['차종', {passenger:'승용',van:'승합',truck:'화물',special:'특수',moto:'이륜'}[kind]],
    ['과세 기준', info],
    ['지방교육세', eduApplies?'자동차세 × 30%':'해당 없음'],
    ['차령 반영', reduceRate>0? ('차령 '+ageYears+'년 · '+Math.round(reduceRate*100)+'% 차감') : (ageMissing?'미입력(미반영)':'해당 없음')],
    ['연납', prate>0? (document.getElementById('au-prepay').value+'월 · '+(prate*100).toFixed(2)+'% 공제') : '미적용'],
    ['비과세·감면', (ntx!=='none'?'비과세':'') || (relief!=='none'?'감면 검토':'해당 없음')]
  ]);
  h+=worklistHtml('auto')+nextCalcHtml('auto');
  box.innerHTML=h; window._RESULTTEXT=box.innerText; animateTotals(box);
}

addRow(); initEmpty(); cCalc(); renderRecent(); autoCalc(); onDeungKind(); clampDateInputs();
