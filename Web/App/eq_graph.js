// Render-only transfer function of the *shared* RBJ HPF/LPF + exactly three bells.
// Frequency response recomputes on UI state changes, never in the audio callback.
export function eqGraph(state,sampleRate=48000){
  const p=state.params,sections=[];
  const design=(kind,f,g=0,q=Math.SQRT1_2)=>{
    const w=2*Math.PI*Math.max(20,Math.min(f,sampleRate*.45))/sampleRate;
    const cs=Math.cos(w),sn=Math.sin(w),alpha=sn/(2*q),A=Math.pow(10,g/40);
    let b0,b1,b2,a0,a1,a2;
    if(kind==="bell"){b0=1+alpha*A;b1=-2*cs;b2=1-alpha*A;a0=1+alpha/A;a1=-2*cs;a2=1-alpha/A;}
    else {const hp=kind==="hp";b0=(hp?1+cs:1-cs)*.5;b1=(hp?-2:2)*b0;b2=b0;a0=1+alpha;a1=-2*cs;a2=1-alpha;}
    sections.push([b0/a0,b1/a0,b2/a0,a1/a0,a2/a0]);
  };
  if(!state.bypass.EQ_TONE){
    if(p.hpf>20.5)design("hp",p.hpf);
    if(p.lpf<19995)design("lp",p.lpf);
    for(let b=1;b<=3;b++)if(Math.abs(p["b"+b+"Gain"])>.0001)
      design("bell",p["b"+b+"Freq"],p["b"+b+"Gain"],p["b"+b+"Q"]);
  }
  const freqX=f=>Math.log10(Math.max(20,Math.min(f,20000))/20)/3*100;
  const response=f=>{
    const w=2*Math.PI*f/sampleRate,c=Math.cos(w),s=Math.sin(w),c2=Math.cos(2*w),s2=Math.sin(2*w);
    let v=0;for(const [b0,b1,b2,a1,a2] of sections){
      const nr=b0+b1*c+b2*c2,ni=-b1*s-b2*s2,dr=1+a1*c+a2*c2,di=-a1*s-a2*s2;
      v+=10*Math.log10(Math.max(1e-12,(nr*nr+ni*ni)/(dr*dr+di*di)));
    }
    return Math.max(-36,Math.min(18,v));
  };
  // Display-only fixed +/-24 dB. Bell Gain remains +/-18 dB in shared DSP.
  const displayRange=24;
  const y=f=>Math.max(4,Math.min(96,50-response(f)/displayRange*34));
  const path=Array.from({length:101},(_,i)=>{
    const f=20*Math.pow(1000,i/100);
    return(i?"L":"M")+i+" "+y(f).toFixed(2);
  }).join(" ");
  const nodes=[["hpf",p.hpf],["b1",p.b1Freq],["b2",p.b2Freq],["b3",p.b3Freq],["lpf",p.lpf]]
    .map(([id,f])=>{
      // Band handles always represent their OWN Gain, not the summed EQ curve.
      const gain=id.startsWith("b")?p["b"+id.slice(1)+"Gain"]:null;
      return {id,x:Math.max(3,Math.min(97,freqX(f))),
        y:gain===null?y(f):Math.max(4,Math.min(96,50-gain/displayRange*34))};
    });
  const fillPath="M0 50 "+path.replace(/^M/,"L")+" L100 50 Z";
  return {path,fillPath,nodes,displayRange};
}
// SVG viewBox is 100x100 with preserveAspectRatio="none". Old circle
// r=3.5 stretched horizontally in the compact card. Radii now map to actual
// CSS pixel CIRCLES on both views, regardless of graph proportions.
export function sizeEqMarkers(svg){
  if(!svg?.isConnected)return;
  const rect=svg.getBoundingClientRect(),w=rect.width,h=rect.height;
  if(!(w>0&&h>0))return;
  const large=Boolean(svg.closest(".sr-eq-focus"));
  const visual=large?3.45:2.25,center=large?1.35:.95,hit=large?11:9;
  for(const item of svg.querySelectorAll("[data-eq-node],[data-eq-ring],[data-eq-center]")){
    const radius=item.hasAttribute("data-eq-node")?hit:
      item.hasAttribute("data-eq-center")?center:visual;
    item.setAttribute("rx",String(radius*100/w));
    item.setAttribute("ry",String(radius*100/h));
  }
}
export function updateEqPlot(svg,plot){
  for(const cls of ["macro-eq-line","macro-eq-halo"])
    svg.querySelector("."+cls)?.setAttribute("d",plot.path);
  svg.querySelector(".macro-eq-fill")?.setAttribute("d",plot.fillPath);
  for(const n of plot.nodes){
    for(const type of ["data-eq-node","data-eq-ring","data-eq-center"]){
      const el=svg.querySelector("["+type+'="'+n.id+'"]');
      if(el){el.setAttribute("cx",n.x);el.setAttribute("cy",n.y);}
    }
  }
  sizeEqMarkers(svg);
}
let svgNumber=0;
export function miniEqSvg(state,sampleRate=48000){
  const plot=eqGraph(state,sampleRate),suffix=++svgNumber;
  const grad="sr-eq-line-"+suffix,fill="sr-eq-fill-"+suffix;
  // Approved colorful five-handle palette; mirrors VVChain's distinct
  // red/yellow/blue/green band visual language, not its DSP.
  const colors=[["0%","#22c55e"],["20%","#ef4444"],["47%","#facc15"],
    ["77%","#3b82f6"],["100%","#f472b6"]];
  return '<svg class="macro-eq-svg" viewBox="0 0 100 100" preserveAspectRatio="none" role="group" aria-label="EQ response graph">'
    +'<defs><linearGradient id="'+grad+'" x1="0%" y1="0%" x2="100%" y2="0%">'
    +colors.map(c=>'<stop offset="'+c[0]+'" stop-color="'+c[1]+'"/>').join('')
    +'</linearGradient><linearGradient id="'+fill+'" x1="0%" y1="0%" x2="0%" y2="100%">'
    +'<stop offset="0%" stop-color="#65b7bf" stop-opacity=".105"/>'
    +'<stop offset="52%" stop-color="#2d6778" stop-opacity=".035"/>'
    +'<stop offset="100%" stop-color="#5e8390" stop-opacity=".075"/></linearGradient></defs>'
    +'<g class="macro-eq-grid">'
    +'<path class="macro-eq-grid-minor" d="M13.265 0V100M23.299 0V100M33.333 0V100M46.598 0V100M56.632 0V100M66.667 0V100M79.931 0V100M89.966 0V100"/>'
    +'<path class="macro-eq-grid-major" d="M0 16H100M0 33H100M0 67H100M0 84H100"/>'
    +'<path class="macro-eq-zero" d="M0 50H100"/></g>'
    +'<path class="macro-eq-analyzer-fill" d="" aria-hidden="true"/>'
    +'<path class="macro-eq-analyzer-line" d="" aria-hidden="true"/>'
    +'<path class="macro-eq-fill" d="'+plot.fillPath+'" fill="url(#'+fill+')"/>'
    +'<path class="macro-eq-halo" d="'+plot.path+'" stroke="url(#'+grad+')"/>'
    +'<path class="macro-eq-line" data-eq-hpf-path d="'+plot.path+'" stroke="url(#'+grad+')"/>'
    +plot.nodes.map(n=>{
      const x=n.x.toFixed(3),y=n.y.toFixed(3),id=n.id;
      return '<ellipse class="sr-eq-node-ring" data-eq-ring="'+id+'" cx="'+x+'" cy="'+y+'" rx=".6" ry="1.2"/>'
        +'<ellipse class="sr-eq-node-center" data-eq-center="'+id+'" cx="'+x+'" cy="'+y+'" rx=".2" ry=".4"/>'
        +'<ellipse class="sr-eq-node-hit" data-eq-node="'+id+'" '
        +(id==="hpf"?'data-eq-hpf-marker ':'')
        +'role="slider" tabindex="0" aria-label="'+(id==="hpf"?"HPF":id==="lpf"?"LPF":id.toUpperCase())
        +'" cx="'+x+'" cy="'+y+'" rx="1.5" ry="4"/>';
    }).join('')+'</svg>';
}
