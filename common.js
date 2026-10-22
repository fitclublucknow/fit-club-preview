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
  // Historical labels sometimes omit the closing parenthesis in "(Step N".
  // Presentation-only correction: source archive and exported workout values remain unchanged.
  function formatStep(label){
    const original=String(label??'').trim();
    if(!original)return 'Workout block';
    const open=(original.match(/\(/g)||[]).length,close=(original.match(/\)/g)||[]).length;
    return /\(\s*Step\s*\d+\b/i.test(original)&&open>close ? original+')'.repeat(open-close) : original;
  }
  function compactStep(label,i){
    const formatted=formatStep(label);
    const match=formatted.match(/\(\s*Step\s*(\d+)\s*\)/i);
    const number=match?.[1]||(formatted.match(/^Step\s*(\d+)$/i)||[])[1]||String(i+1);
    const named=formatted.replace(/\s*\(\s*Step\s*\d+\s*\)/ig,'').replace(/^\s*[-–:]\s*/,'').replace(/\s*[-–:]\s*$/,'').trim();
    const duration=named.match(/(?:^|[\s–-])(\d+)\s*(mins?|minutes?|seconds?|secs?)\b/i);
    const durationText=duration?`${duration[1]} ${/^sec/i.test(duration[2])?'sec':'min'}`:'';
    const title=/^Step\s*\d+$/i.test(named)?'':named.replace(/\s*[-–:]?\s*\d+\s*(?:mins?|minutes?|seconds?|secs?)\b/ig,'').replace(/\s*[-–:]\s*$/,'').trim();
    return {title:title||`Block ${number}`,meta:[`Step ${number}`,durationText].filter(Boolean).join(' · ')};
  }
  function memberSummary(c,w){
    const name=String(c.name||'Class');
    if(!w)return '<p class="muted">No workout overview was provided for this class.</p>';
    const parts=Array.isArray(w.parts)?w.parts:[];
    const notes=Array.isArray(w.trainer_notes)?w.trainer_notes.filter(x=>typeof x==='string'&&x.trim()):[];
    let intro='A guided class based on the published workout plan.';
    const panels=[];
    if(parts.length){
      const titles=parts.map((p,i)=>compactStep(p.step,i).title).filter(t=>!/^Block \d+$/i.test(t));
      if(/Dance Fitness/i.test(name))intro='A music-led session moving through warm-up, dance fitness and cool-down.';
      else if(/Yoga/i.test(name))intro='A guided yoga session moving through the sequences and poses listed below.';
      else if(titles.length>1)intro=`Today's workout moves through ${titles.slice(0,3).join(', ')}${titles.length>3?' and more':''}.`;
      else intro=`Explore the key exercises across ${parts.length} training ${parts.length===1?'block':'blocks'}.`;
      for(const [i,p] of parts.entries()){
        const phase=compactStep(p.step,i),movements=(p.movements||[]).map(m=>String(m.name||'').trim()).filter(Boolean);
        // Avoid repeating a phase's name as its only movement (e.g., Dance Fitness).
        const distinct=movements.filter(n=>n.toLowerCase()!==name.toLowerCase());
        const shown=distinct.slice(0,3);
        const extra=distinct.length-shown.length;
        const fallback=/Dance Fitness/i.test(name)?(/warm up/i.test(phase.title)?'Music-led warm-up':/cool down/i.test(phase.title)?'Guided cool-down':'Music-led dance workout'):/Savasana/i.test(phase.title)?'Guided rest and relaxation':/Rituals/i.test(phase.title)?'Guided opening or closing':'Trainer-guided segment';
        const preview=shown.length?`${shown.map(escapeHtml).join(' · ')}${extra?` <span class="extra-count">+${extra} more</span>`:''}`:escapeHtml(fallback);
        const rounds=p.rounds?` · ${escapeHtml(p.rounds)} rounds`:'';
        panels.push(`<div class="summary-phase"><div class="summary-phase-header"><strong>${escapeHtml(phase.title)}</strong><span>${escapeHtml(phase.meta)}${rounds}</span></div><p>${preview}</p></div>`);
      }
    }else if(/Boxing/i.test(name)&&notes.length){
      intro='Boxing technique and conditioning with warm-up, bag or floor combinations, and a finisher.';
      const full=notes.join(' ').toLowerCase();
      const blocks=[
        ['Mobility & warm-up',/\bmobility\b|\bwarm\s*up\b/, 'Movement preparation and boxing footwork'],
        ['Boxing combinations',/bag\s*work|bagwork|floor\s*work|floorwork|pad\s*work|padwork|punch/i, 'Bag, floor or partner combinations'],
        ['Finisher',/finisher/i, 'A final conditioning block'],
        ['Cool-down',/cool\s*down/i, 'Closing recovery segment']
      ];
      for(const [title,pattern,detail] of blocks){if(pattern.test(full))panels.push(`<div class="summary-phase"><div class="summary-phase-header"><strong>${escapeHtml(title)}</strong></div><p>${escapeHtml(detail)}</p></div>`);}
    }else if(notes.length){
      // When the source contains only prose, take a few genuine short facts rather
      // than exposing multi-page trainer instructions in the member view.
      if(/Fusion Dance/i.test(name))intro=notes.slice(0,2).map(t=>t.replace(/^\s*["'\s]+|["'\s]+$/g,'')).join(' ');
      else if(/Yoga/i.test(name)){
        const focus=notes.find(t=>/Padmasana|Lotus Pose|asana/i.test(t))||notes[0];
        intro=`Today's guided practice focuses on ${focus.trim().length<60?focus.trim().replace(/[.!]$/,''):'yoga poses and mobility'}.`;
        const hasPadmasana=notes.some(t=>/Padmasana/i.test(t));
        if(hasPadmasana)panels.push('<div class="summary-phase"><div class="summary-phase-header"><strong>Practice focus</strong></div><p>Padmasana (Lotus Pose), mobility and mindful breathing</p></div>');
      }else intro=notes[0].slice(0,180);
    }
    const focus=panels.length?`<div class="summary-panel"><h3>What to expect</h3>${panels.join('')}</div>`:'';
    return `<p class="member-intro">${escapeHtml(intro)}</p>${focus}<p class="member-disclaimer">Your trainer will guide the session and offer appropriate movement options.</p>`;
  }
  function workout(c){return d.workouts[c.workout_key]||null;}
  window.Nexus={d,escapeHtml,dateObj,datestr,formatMonth,time12,classes,days,makeState,getWeek,renderControls,sessionCard,val,workout,formatStep,memberSummary,currentDate,currentMonth,isPreview,isActive};
})();
