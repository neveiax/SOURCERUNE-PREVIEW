"""One narrow smoke/gate for faithful original UI file copy, no audio tests."""
from pathlib import Path
from hashlib import sha1
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
    altered={"Web/App/app.js","Web/App/index.html","Web/App/data/scene_presets_v1.json"}
    for source,details in originals.items():
        path=ROOT/source
        assert path.is_file(),source
        if source not in altered:
            assert blob(path.read_bytes())==details["sha"],source
    imgs=manifest["approved_png"]
    assert len(imgs)>=780
    for source,details in imgs.items():
        assert source.startswith("Assets/UI/") and source.endswith(".png")
        path=ROOT/source
        assert path.is_file() and len(path.read_bytes())==details["bytes"],source
        assert blob(path.read_bytes())==details["sha"],source
    catalog=json.loads((APP/"data/catalog.json").read_text())["items"]
    referenced=set()
    for item in catalog:
        for key in ("ui01","ui02"):
            x=item.get(key)
            if x:referenced.add("Assets/UI/"+x)
    missing=sorted(p for p in referenced if not (ROOT/p).is_file())
    assert not missing,f"missing referenced UI art: {missing[:8]}"
    html=(APP/"index.html").read_text()
    for href in re.findall(r'href="(\./[^"]+\.css)"',html):
        assert (APP/href).is_file(),href
    for script in re.findall(r'src="(\./[^"]+\.js)"',html):
        assert (APP/script).is_file(),script
    assert (APP/"audio/transport.css").exists()
    assert (APP/"audio/engine.js").exists()
    assert not (APP/"audio/processor.js").exists()
    assert not list(APP.rglob("*.wasm"))
    js=(APP/"app.js").read_text()
    assert 'async function play(){mark("PUBLIC UI PREVIEW' in js
    assert 'async function setupAudio(){throw new Error(' in js
    assert not list(ROOT.glob("Source/**/*.cpp"))
    factory=json.loads((APP/"data/scene_presets_v1.json").read_text())
    for collection in ("presets","reservePresets"):
        if isinstance(factory.get(collection),dict):
            assert all("params" not in x and "bypass" not in x
                       for x in factory[collection].values() if isinstance(x,dict))
    assert 'url=./Web/App/index.html' in (ROOT/"index.html").read_text()
    print(f"PASS: original UI files {len(originals)}, {len(imgs)} SHA-matched PNGs, catalog {len(catalog)} entries, {len(referenced)} referenced art; audio DSP excluded")
if __name__=="__main__":main()
