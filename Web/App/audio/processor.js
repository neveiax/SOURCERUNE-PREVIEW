// Public compiled DSP transport only. All source-acoustics mathematics remain in distributed WASM.
// Browser clients can inspect and reverse-engineer WASM; publication is NOT secrecy.
// Thin transport adapter only: every audio calculation is in shared C++.
class SceneWorklet extends AudioWorkletProcessor {
  constructor(options) {
    super();
    try {
      const module=new WebAssembly.Module(options.processorOptions.bytes);
      const instance=new WebAssembly.Instance(module,{env:{
        sinf:Math.sin,cosf:Math.cos,powf:Math.pow
      }});
      this.dsp=instance.exports;
      // Same C++ HighPass core as Native, tiny independent WASM binary.
      const tone=new WebAssembly.Instance(new WebAssembly.Module(options.processorOptions.toneBytes),{
        env:{sinf:Math.sin,cosf:Math.cos}
      });
      this.tone=tone.exports;
      // Additional exact same shared C++ Parametric3 implementation as Native.
      const eqModule=new WebAssembly.Instance(
        new WebAssembly.Module(options.processorOptions.eqBytes),
        {env:{sinf:Math.sin,cosf:Math.cos,powf:Math.pow}});
      this.eq3=eqModule.exports;
      if(this.eq3.sr_eq3_version()!==1)throw new Error('EQ3 ABI 不相容');
      this.eq3.sr_eq3_prepare(sampleRate);
      this.eq3.sr_eq3_set(...options.processorOptions.eq3);
      this.eq3.sr_eq3_reset();
      this.eqBuf=[0,1].map(c=>new Float32Array(
        this.eq3.memory.buffer,this.eq3.sr_eq3_buffer(c),128));
      if(this.tone.sr_hpf_version()!==1)throw new Error('HPF ABI 不相容');
      this.tone.sr_hpf_prepare(sampleRate);
      this.tone.sr_hpf_set(...options.processorOptions.hpf);
      this.tone.sr_hpf_reset();
      this.toneBuf=[0,1].map(c=>new Float32Array(
        this.tone.memory.buffer,this.tone.sr_hpf_buffer(c),128));
      if(this.dsp.sr_version()!==1)throw new Error('DSP ABI 不相容');
      this.dsp.sr_prepare(sampleRate);
      this.dsp.sr_parameters(...options.processorOptions.parameters);
      this.dsp.sr_reset();
      this.input=[0,1].map(c=>new Float32Array(this.dsp.memory.buffer,this.dsp.sr_input(c),128));
      this.output=[0,1].map(c=>new Float32Array(this.dsp.memory.buffer,this.dsp.sr_output(c),128));
      this.port.onmessage=({data})=>{
        if(data.type==='parameters'){
          this.dsp.sr_parameters(...data.values);
          if(data.hpf)this.tone.sr_hpf_set(...data.hpf);
          if(data.eq3)this.eq3.sr_eq3_set(...data.eq3);
        }
        if(data.type==='reset'){
          this.dsp.sr_reset();
          this.tone.sr_hpf_reset();
          this.eq3.sr_eq3_reset();
        }
      };
      this.port.postMessage({type:'ready'});
    } catch(error) { this.dsp=null;this.port.postMessage({type:'error',message:String(error)}); }
  }
  process(inputs,outputs) {
    const output=outputs[0],input=inputs[0];
    if(!this.dsp)return false;
    // Bounded chunks also support browsers with a non-128 render quantum.
    for(let offset=0;offset<output[0].length;offset+=128){
      const n=Math.min(128,output[0].length-offset);
      for(let c=0;c<2;c++){
        const src=input[c]||input[0];
        for(let i=0;i<n;i++)this.input[c][i]=src?src[offset+i]:0;
      }
      this.dsp.sr_process(n);
      // OFF path avoids both the HPF work and the extra buffer copies.
      const useHpf=!!this.tone.sr_hpf_active();
      if(useHpf){
        for(let c=0;c<2;c++)this.toneBuf[c].set(this.output[c].subarray(0,n));
        this.tone.sr_hpf_process(n);
      }
      let rendered=useHpf?this.toneBuf:this.output;
      const useEq=!!this.eq3.sr_eq3_active();
      if(useEq){
        for(let c=0;c<2;c++)this.eqBuf[c].set(rendered[c].subarray(0,n));
        this.eq3.sr_eq3_process(n);rendered=this.eqBuf;
      }
      for(let c=0;c<output.length;c++)for(let i=0;i<n;i++)output[c][offset+i]=rendered[c][i];
    }
    return true;
  }
}
registerProcessor('sourcerune-scene',SceneWorklet);
