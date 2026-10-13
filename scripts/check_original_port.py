"""One narrow smoke/gate for faithful original UI file copy, no audio tests."""
from pathlib import Path
from hashlib import sha1
import sys
sys.dont_write_bytecode=True  # Prevent untracked __pycache__ from failing the strict public allowlist.
from check_public_dsp_release import check_public_dsp_release
import json,re

ROOT=Path(__file__).resolve().parent.parent
APP=ROOT/"Web/App"
PIN="c035db4d6d5f409cdbedc4f9c874089ea1750fda"
def blob(data):
    return sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()
def main():
    manifest=json.loads((ROOT/"original_web_port_manifest.json").read_text())
    assert manifest["source_commit"]==PIN
    originals=manifest["original_web_app_files"]
    assert len(originals)>=35
    altered={"Web/App/app.js","Web/App/index.html","Web/App/data/scene_presets_v1.json","Web/App/geometry_audit.js"}
    for source,details in originals.items():
        path=ROOT/source
        assert path.is_file(),source
        if source not in altered:
            assert blob(path.read_bytes())==details["sha"],source
    assert blob((APP/"geometry_audit.js").read_bytes())=="c97655194f0249edf05d84416f33daedbd0006ff","reviewed geometry source mismatch"
    imgs=manifest["approved_png"]
    assert len(imgs)>=780
    for source,details in imgs.items():
        assert source.startswith("Assets/UI/") and source.endswith(".png")
        path=ROOT/source
        assert path.is_file() and len(path.read_bytes())==details["bytes"],source
        assert blob(path.read_bytes())==details["sha"],source
    catalog=json.loads((APP/"data/catalog.json").read_text())["items"]
    referenced=set()
    existing_required=set()
    allowed_absent=set()
    for item in catalog:
        for key in ("ui01","ui02"):
            x=item.get(key)
            if not x:continue
            path="Assets/UI/"+x
            referenced.add(path)
            if item.get("status")=="art-required-research-v3" and item.get("type")=="SCENE_PRESET_HERO":
                allowed_absent.add(path)
            else:
                existing_required.add(path)
    missing=sorted(p for p in existing_required if not (ROOT/p).is_file())
    assert not missing,f"missing APPROVED UI art: {missing[:8]}"
    absent=sorted(p for p in allowed_absent if not (ROOT/p).is_file())
    assert len(absent)<=52,"unexpected number of documented unmade reference assets"
    html=(APP/"index.html").read_text()
    for href in re.findall(r'href="(\./[^"]+\.css)"',html):
        assert (APP/href).is_file(),href
    for script in re.findall(r'src="(\./[^"]+\.js)"',html):
        assert (APP/script).is_file(),script
    assert (APP/"audio/transport.css").exists()
    assert (APP/"audio/engine.js").exists()
    assert (APP/"audio/processor.js").exists()
    check_public_dsp_release()
    js=(APP/"app.js").read_text()
    # SR UI parity control: compare a SOURCE-approved UI function verbatim.
    # Separate public sound engine and DSP differences remain intentionally isolated.
    approved_mode_buttons = "function modeButtons(id,vals,labels={}){return`<div class=\"macro-mode-row\" role=\"group\" aria-label=\"${pretty(id)} modes\">${vals.map(v=>`<button type=\"button\" data-macro-select=\"${id}\" data-value=\"${v}\" aria-pressed=\"${state.params[id]===v?\"true\":\"false\"}\" aria-label=\"${pretty(id)}: ${labels[v]||pretty(v)}\" title=\"${labels[v]||pretty(v)}\" class=\"${state.params[id]===v?\"active\":\"\"}\">${labels[v]||pretty(v)}</button>`).join(\"\")}</div>`}"
    assert approved_mode_buttons in js, "public macro-mode UI diverges from reviewed SOURCE"
    # True dry browser playback is allowed. The real proprietary DSP remains excluded.
    assert 'async function play(){' in js and 'await audio.play()' in js
    assert 'async function setupAudio(){' in js
    assert 'sceneNode=audioCtx.createGain();' in js
    assert 'sceneNode.gain.value=1;' in js
    assert 'sceneNode=await createSceneNode(audioCtx,state,published);' in js
    assert 'new AudioWorkletNode(' not in js and 'WebAssembly.' not in js
    assert 'PUBLIC WEB EQ LIVE' in js
    assert 'audioCtx.createBiquadFilter()' in js
    assert 'updatePublicTone()' in js
    assert 'set(eq.dry.gain,1-wet);set(eq.wet.gain,wet)' in js
    engine=(APP/"audio/engine.js").read_text()
    assert 'PUBLIC C++／WASM 測試' in engine
    assert 'export async function createSceneNode(context, state, release=null)' in engine
    assert not list(ROOT.glob("Source/**/*.cpp"))
    factory=json.loads((APP/"data/scene_presets_v1.json").read_text())
    for collection in ("presets","reservePresets"):
        if isinstance(factory.get(collection),dict):
            assert all("params" not in x and "bypass" not in x
                       for x in factory[collection].values() if isinstance(x,dict))
    assert 'url=./Web/App/index.html' in (ROOT/"index.html").read_text()
    print(f"PASS: original UI files {len(originals)}, {len(imgs)} approved PNGs, catalog {len(catalog)}; only reviewed public binary candidate may activate compiled DSP")
if __name__=="__main__":main()
