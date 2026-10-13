// Shared UI only: reuse existing commands, state, media element and history.
export function mountWorkbench({audio,getHistory,openAdvanced,groups,savePreset,undo,redo}) {
  const $=q=>document.querySelector(q);
  const tools=$('#globalToolsPopover');
  const dialog=document.createElement('dialog');
  dialog.id='workbenchDialog';
  dialog.setAttribute('aria-labelledby','workbenchTitle');
  dialog.innerHTML='<header class="workbench-head"><div><span>WORKSPACE</span><h2 id="workbenchTitle">Tools & controls</h2></div><button type="button" data-workbench-close aria-label="Close tools">CLOSE</button></header>';
  document.body.append(dialog);
  dialog.append(tools);
  const section=(title,description)=>{
    const s=document.createElement('section'),h=document.createElement('h3'),p=document.createElement('p'),row=document.createElement('div');
    h.textContent=title;p.textContent=description;row.className='workbench-actions';s.append(h,p,row);tools.append(s);return row;
  };
  const preset=section('PRESETS & FILES','Save a local preset or move your settings between sessions.');
  for(const action of ['save','import','export'])preset.append(tools.querySelector(`[data-global-action="${action}"]`));
  const history=section('EDIT & COMPARE','Undo changes, switch layouts and compare saved snapshots.');
  for(const action of ['undo','redo','bypass'])history.append(tools.querySelector(`[data-global-action="${action}"]`));
  history.append(tools.querySelector('.mini-pair'));
  const modules=section('DETAILED CONTROLS','Open a module to edit its existing parameters.');
  for(const [id,g] of Object.entries(groups)){
    const b=document.createElement('button');b.type='button';b.textContent=g.label;b.dataset.workbenchModule=id;
    b.onclick=()=>{dialog.close();openAdvanced(id);};modules.append(b);
  }
  const help=document.createElement('p');help.className='workbench-help';help.textContent='Ctrl / ⌘ Z · Undo     Shift Z · Redo     Ctrl / ⌘ S · Save preset     Esc · Close';dialog.append(help);
  const form=document.createElement('form');form.id='presetNameForm';form.hidden=true;
  form.innerHTML='<label for="presetNameInput">PRESET NAME</label><input id="presetNameInput" name="presetName" maxlength="120" required autocomplete="off" placeholder="Name this scene"><p>Saved in this browser. Export State for a portable backup.</p><div class="workbench-actions"><button type="button" data-preset-cancel>CANCEL</button><button type="submit">SAVE PRESET</button></div>';
  dialog.append(form);
  let resolveName=null,returnFocus=null;
  const show=()=>{if(!dialog.open){returnFocus=document.activeElement;dialog.showModal();} $('#settingsBtn').setAttribute('aria-expanded','true');sync();};
  const cancelName=()=>{if(resolveName){const done=resolveName;resolveName=null;done(null);}form.hidden=true;tools.hidden=false;};
  dialog.querySelector('[data-workbench-close]').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{cancelName();$('#settingsBtn').setAttribute('aria-expanded','false');if(returnFocus?.isConnected)returnFocus.focus();});
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  form.querySelector('[data-preset-cancel]').onclick=()=>{cancelName();tools.querySelector('[data-global-action="save"]').focus();};
  form.onsubmit=e=>{e.preventDefault();const input=form.elements.presetName,name=input.value.trim();if(!name){input.setCustomValidity('Enter a preset name.');input.reportValidity();return;}const done=resolveName;resolveName=null;dialog.close();done?.(name);};
  form.elements.presetName.oninput=e=>e.target.setCustomValidity('');
  const settings=$('#settingsBtn');settings.setAttribute('aria-haspopup','dialog');settings.setAttribute('aria-controls',dialog.id);settings.setAttribute('aria-expanded','false');settings.onclick=show;
  const dock=$('#webAudioTransport'),row=dock.querySelector('.audio-controls');
  const toolsButton=document.createElement('button');toolsButton.type='button';toolsButton.id='workbenchOpen';toolsButton.textContent='TOOLS';toolsButton.setAttribute('aria-haspopup','dialog');toolsButton.onclick=show;row.insertBefore(toolsButton,$('#stateStatus'));
  const timeline=document.createElement('div');timeline.className='audition-timeline';timeline.setAttribute('aria-label','Audio playback timeline');
  const file=document.createElement('span');file.id='auditionFileName';file.textContent='No audio loaded';
  const seek=$('#seekSlider');seek.setAttribute('aria-label','Audio playback position');seek.disabled=true;
  const duration=document.createElement('output');duration.id='auditionDuration';duration.textContent='--:--';
  timeline.append(file,$('#transportTime'),seek,duration);row.after(timeline);
  $('#stateStatus').setAttribute('role','status');$('#stateStatus').setAttribute('aria-live','polite');
  const format=t=>Number.isFinite(t)?`${Math.floor(t/60).toString().padStart(2,'0')}:${Math.floor(t%60).toString().padStart(2,'0')}`:'--:--';
  const mediaSync=()=>{
    const ready=Number.isFinite(audio.duration)&&audio.duration>0&&!audio.error;
    seek.disabled=!ready;$('#playBtn').disabled=!ready;$('#stopBtn').disabled=!ready;
    duration.textContent=format(audio.duration);seek.setAttribute('aria-valuetext',`${format(audio.currentTime)} of ${format(audio.duration)}`);
    const selected=$('#audioFile').files?.[0];file.textContent=selected?.name||'No audio loaded';file.title=file.textContent;
  };
  for(const event of ['loadedmetadata','durationchange','emptied','error','timeupdate'])audio.addEventListener(event,mediaSync);
  function sync(){const h=getHistory();for(const action of ['undo','redo']){const b=tools.querySelector(`[data-global-action="${action}"]`);b.disabled=!h[action];b.title=`${action==='undo'?'Undo':'Redo'} (${h[action]})`;}}
  document.addEventListener('keydown',e=>{
    if(e.defaultPrevented||e.altKey||!(e.ctrlKey||e.metaKey)||e.target.closest('input,textarea,select,[contenteditable="true"]')||dialog.open||document.body.classList.contains('advanced-open')||!$('#assetBrowser').classList.contains('hidden'))return;
    const key=e.key.toLowerCase();
    if(key==='z'){e.preventDefault();e.shiftKey?redo():undo();sync();}
    else if(key==='s'){e.preventDefault();savePreset();}
  });
  mediaSync();sync();
  return {sync,requestPresetName(){if(resolveName)return Promise.resolve(null);show();tools.hidden=true;form.hidden=false;form.reset();form.elements.presetName.setCustomValidity('');form.elements.presetName.focus();return new Promise(resolve=>{resolveName=resolve;});}};
}
