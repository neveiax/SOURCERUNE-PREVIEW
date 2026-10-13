export const supportedSource = new Set([1,2,3,11,40]); // Existing approved public legacy release
export const supportedTransmission = new Set([1,2,3,5,11]);
const modelNumber = id => Number(String(id).split('_')[1]) || 0;
export function parametersFromState(state) {
  const p=state.params, b=state.bypass;
  return [p.sourceCharacter,p.badSignal,p.bandwidthLoss,p.inputGain,p.mix,p.outputGain,
    modelNumber(state.selection.SOURCE),modelNumber(state.selection.TRANSMISSION),
    Number(!!b.SOURCE),Number(!!b.TRANSMISSION),Number(!!state.globalBypass)];
}
export function hpfFromState(state) {
  const hz=Number(state.params?.hpf??20);
  const bypass=!!(state.globalBypass||state.bypass?.EQ_TONE);
  return [Math.max(20,Math.min(1000,Number.isFinite(hz)?hz:20)),Number(!bypass&&hz>20)];
}
export function eq3FromState(state){
  const p=state.params;
  return [p.lpf??20000,p.b1Freq??120,p.b1Gain??0,p.b1Q??0.7,
    p.b2Freq??600,p.b2Gain??0,p.b2Q??1,
    p.b3Freq??2400,p.b3Gain??0,p.b3Q??1,
    Number(!!(state.globalBypass||state.bypass?.EQ_TONE))];
}
export function audioSupportNote(state, published=false, release=null) {
  if(!published)return 'PUBLIC WebAudio EQ 模式：HPF／LPF／3-band EQ／Gain／Mix 可聽；私人 SOURCE 物理模型未啟動';
  const src=modelNumber(state.selection.SOURCE),trn=modelNumber(state.selection.TRANSMISSION);
  const approvedIds=new Set(Array.isArray(release?.models)?release.models.map(x=>modelNumber(x)):[]);
  const latest=release?.sourceCandidateSha==='6cf8bc3c82aaea52a7affcb6d5e2d4d9be716923';
  const sourceLabel=latest?(approvedIds.has(src)?'可聽的獨立電聲研究候選':'未接入這版 DSP'):(src===2?'SRC_002 舊版物理候選':supportedSource.has(src)?'僅有限頻響':'未實裝');
  return `PUBLIC C++／WASM ${latest?'研究版 SRC001–017':'舊版 SRC002'} · SOURCE ${sourceLabel} · TRANSMISSION ${supportedTransmission.has(trn)?'僅有限頻寬':'未實裝'} · HPF/LPF/3-band EQ 可聽；尚非設備聲學／Factory 最終驗收`;
}
export async function createSceneNode(context, state, release=null) {
  if(!context.audioWorklet)throw new Error('需要支援 AudioWorklet 的瀏覽器與 HTTPS／localhost');
  const compressed=release?.compression==="gzip";
  const sceneFile=compressed?'./sourcerune.wasm.gz':'./sourcerune.wasm';
  const [response,toneResponse,eqResponse]=await Promise.all([
    fetch(new URL(sceneFile,import.meta.url)),
    fetch(new URL('./hpf.wasm',import.meta.url)),
    fetch(new URL('./eq3.wasm',import.meta.url))
  ]);
  if(!response.ok||!toneResponse.ok||!eqResponse.ok)throw new Error(`DSP 載入失敗 (scene ${response.status}, HPF ${toneResponse.status}, EQ3 ${eqResponse.status})`);
  let [bytes,toneBytes,eqBytes]=await Promise.all([response.arrayBuffer(),toneResponse.arrayBuffer(),eqResponse.arrayBuffer()]);
  if(compressed){
    if(typeof DecompressionStream!=="function")throw new Error('目前瀏覽器不支援已核准的 gzip WASM，請使用新版 Chrome／Edge');
    bytes=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  }
  await context.audioWorklet.addModule(new URL('./processor.js',import.meta.url));
  const node=new AudioWorkletNode(context,'sourcerune-scene',{
    numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],channelCount:2,
    channelCountMode:'explicit',processorOptions:{bytes,toneBytes,eqBytes,parameters:parametersFromState(state),hpf:hpfFromState(state),eq3:eq3FromState(state)}
  });
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('DSP 啟動逾時')),10000);
    node.onprocessorerror=()=>{clearTimeout(timer);reject(new Error('DSP 啟動失敗'));};
    node.port.onmessage=({data})=>{
      if(data.type==='ready'){clearTimeout(timer);resolve();}
      if(data.type==='error'){clearTimeout(timer);reject(new Error(data.message));}
    };
  });
  return node;
}
