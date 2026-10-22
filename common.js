/* Shared display utilities. The two views both read the same immutable data.js */
(function(){
  'use strict';
  const d=window.NEXUS_DATA;
  if(!d){document.body.innerHTML='<main style="padding:30px">Preview data could not load. Keep data.js alongside the HTML files.</main>';return;}
  const escapeHtml = (text) => String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateObj = iso => new Date(`${iso}T12:00:00`);
  const datestr=(date,opts={weekday:'long',month:'long',day:'numeric'})=>dateObj(date).toLocaleDateString('en-IN',opts);
  const formatMonth=iso=>dateObj(`${iso}-01`).toLocaleDateString('en-IN',{month:'long',year:'numeric'});
  const time12=(t)=>{let[h,m]=t.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;};
  const classes=(branch,date)=>d.classes.filter(c=>c.branch===branch&&c.date===date).sort((a,b)=>a.start.localeCompare(b.start)||a.name.localeCompare(b.name));
  const days=d.days.map(v=>v.date);
  const today=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const part=k=>today.find(x=>x.type===k)?.value;
  const currentDate=`${part('year')}-${part('month')}-${part('day')}`;
  const currentMonth=currentDate.slice(0,7);
  const isPreview=d.mode!=='PUBLISHED';
  const isActive=isPreview||d.target_month===currentMonth;
  const firstActive=(days.includes(currentDate)&&d.classes.some(c=>c.date===currentDate))?currentDate:(days.find(day=>d.classes.some(c=>c.date===day))||days[0]);
  const weekStarts=days.flatMap((date,i)=>i===0||dateObj(date).getDay()===1?[i]:[]);
  function currentWeekStart(date){const n=days.indexOf(date);return [...weekStarts].reverse().find(start=>start<=n)??0;}
  function makeState(){return {branch:'Gomtinagar',date:firstActive,weekStart:currentWeekStart(firstActive),chosen:null};}
  function getWeek(state){const ix=weekStarts.indexOf(state.weekStart);return days.slice(state.weekStart,weekStarts[ix+1]??days.length);}
  function renderControls(state,change){
    document.querySelectorAll('[data-branch]').forEach(btn=>{btn.classList.toggle('active',btn.dataset.branch===state.branch);btn.setAttribute('aria-pressed',String(btn.dataset.branch===state.branch));btn.onclick=()=>{state.branch=btn.dataset.branch;state.chosen=null;change();};});
    const week=getWeek(state);
    const label=week.length?`${datestr(week[0],{month:'short',day:'numeric'})} – ${datestr(week[week.length-1],{month:'short',day:'numeric'})}`:'';
    document.querySelector('#week-label').textContent=label;
    document.querySelector('#week-days').innerHTML=week.map(date=>{
      const list=classes(state.branch,date),selected=state.date===date;
      return `<button type="button" class="day-btn ${selected?'selected':''}" data-date="${date}" aria-pressed="${selected}"><span class="weekday">${escapeHtml(datestr(date,{weekday:'short'}))}</span><span class="number">${Number(date.slice(-2))}</span><span class="count">${list.length?`${list.length} classes`:'Closed'}</span></button>`;
    }).join('');
    document.querySelectorAll('[data-date]').forEach(btn=>btn.onclick=()=>{state.date=btn.dataset.date;state.chosen=null;change();});
    const weekIx=weekStarts.indexOf(state.weekStart);
    document.querySelector('#week-prev').disabled=weekIx===0;
    document.querySelector('#week-next').disabled=weekIx===weekStarts.length-1;
    document.querySelector('#week-prev').onclick=()=>{state.weekStart=weekStarts[Math.max(0,weekIx-1)];state.date=days[state.weekStart];state.chosen=null;change();};
    document.querySelector('#week-next').onclick=()=>{state.weekStart=weekStarts[Math.min(weekStarts.length-1,weekIx+1)];state.date=days[state.weekStart];state.chosen=null;change();};
  }
  function sessionCard(c,small=false,active=false){return `<button class="session ${active?'active':''}" type="button" data-session="${escapeHtml(c.id)}" aria-label="Open ${escapeHtml(c.name)}, ${escapeHtml(time12(c.start))}">
    <span class="session-time">${escapeHtml(time12(c.start))} – ${escapeHtml(time12(c.end))}</span>
    <span class="session-name">${escapeHtml(c.name)}</span>
    <span class="session-bottom"><span>${escapeHtml(c.intensity||'Standard')} intensity · ${small?'Instructions':'Overview'}</span><span class="session-arrow" aria-hidden="true">↗</span></span>
    </button>`;}
  function val(o){if(!o||o.reps===null||o.reps===undefined)return '—';return `${escapeHtml(o.reps)} ${escapeHtml(o.unit||'')}`.trim();}
  function workout(c){return d.workouts[c.workout_key]||null;}
  window.Nexus={d,escapeHtml,dateObj,datestr,formatMonth,time12,classes,days,makeState,getWeek,renderControls,sessionCard,val,workout,currentDate,currentMonth,isPreview,isActive};
})();
