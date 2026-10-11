"""One-time, fail-closed ORIGINAL Web/App UI copy (not a redesign).
Runs only in an authorized GitHub Actions checkout. The pinned upstream is
currently public. Never copy source DSP/Worklet/WASM into the public site.
"""
from pathlib import Path
import hashlib, json, os, shutil, subprocess

ROOT=Path(__file__).resolve().parent.parent
UPSTREAM=Path(os.environ["ORIGINAL_UI_UPSTREAM"]).resolve()
PIN="c035db4d6d5f409cdbedc4f9c874089ea1750fda"
OUT=ROOT/"Web/App"
ASSETS=ROOT/"Assets/UI"
def blob_sha(b):
    return hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()
def git(*args):
    return subprocess.check_output(["git","-C",str(UPSTREAM),*args],text=True).strip()
def main():
    if git("rev-parse","HEAD")!=PIN: raise SystemExit("BLOCKED: source HEAD changed")
    tracked={}
    for line in git("ls-files","-s").splitlines():
        left,path=line.split("\t",1)
        tracked[path]=left.split()[1]
    # Exact original UI source, styles and data. No audio/engine.js or WASM.
    source_files=[]
    source_app=UPSTREAM/"Web/App"
    for file in source_app.rglob("*"):
        if not file.is_file():continue
        rel=file.relative_to(source_app)
        if len(rel.parts)==1 and (file.suffix in (".css",".js",".html")):
            source_files.append(file)
        elif rel.parts[0] in ("UI_01","UI_02") and file.suffix==".css":
            source_files.append(file)
        elif rel.parts[0]=="data" and file.suffix==".json":
            source_files.append(file)
        elif rel.as_posix()=="audio/transport.css":
            source_files.append(file)
    if len(source_files)<35:raise SystemExit("BLOCKED: original Web/App incomplete")
    # Verify original source blobs before transformation.
    original={}
    for file in source_files:
        src=file.relative_to(UPSTREAM).as_posix()
        data=file.read_bytes()
        if blob_sha(data)!=tracked.get(src):raise SystemExit("BLOCKED: source Git blob mismatch "+src)
        original[src]={"sha":tracked[src],"size":len(data)}
        out=OUT/file.relative_to(source_app)
        out.parent.mkdir(parents=True,exist_ok=True)
        out.write_bytes(data)
    # Keep UI/app.js original except explicitly disable audio PLAY and re-label
    # the public build. Actual audio DSP is never copied or instantiated.
    app=OUT/"app.js"
    text=app.read_text()
    original_play='async function play(){'
    original_audio='async function setupAudio(){'
    if text.count(original_play)!=1 or text.count(original_audio)!=1:
        raise SystemExit("BLOCKED: original app audio entry signatures changed")
    text=text.replace(original_play,'async function play(){mark("PUBLIC UI PREVIEW — AUDIO DISABLED");return;',1)
    text=text.replace(original_audio,'async function setupAudio(){throw new Error("Public Preview has no audio processor");',1)
    app.write_text(text)
    # Stub imports used by original app.js; do not expose audio parameter mapping.
    shim="""// PUBLIC UI-ONLY shim: no AudioWorklet, wasm, DSP, or audio parameter recipes.
export async function createSceneNode(){throw Error("Audio DSP is private in this preview")}
export function parametersFromState(){return []}
export function hpfFromState(){return []}
export function eq3FromState(){return []}
export function audioSupportNote(){return "UI ONLY · AUDIO DISABLED"}
"""
    (OUT/"audio").mkdir(parents=True,exist_ok=True)
    (OUT/"audio/engine.js").write_text(shim)
    html=OUT/"index.html"
    markup=html.read_text()
    if markup.count("WEB TEST · SHARED C++ DSP · SOURCE / TRANSMISSION MVP")!=1:
        raise SystemExit("BLOCKED: HTML build banner changed")
    markup=markup.replace("WEB TEST · SHARED C++ DSP · SOURCE / TRANSMISSION MVP",
                          "ORIGINAL WEB UI PREVIEW · AUDIO DSP DISABLED")
    markup=markup.replace("TEST HARNESS · Shared state · Local transport · Real IN/OUT Peak/RMS · Shared C++ / WASM / AudioWorklet · Other modules pending",
                          "PUBLIC UI-ONLY PREVIEW · ORIGINAL CONTROLS · NO AUDIO")
    markup=markup.replace("<strong>WEB PASS-THROUGH</strong>","<strong>UI ONLY / NO DSP</strong>")
    html.write_text(markup)
    # 74 factory scene preset SOUND parameter recipes are confidential; the
    # original IDs/names/art mapping remain, but only display-safe metadata.
    preset_path=OUT/"data/scene_presets_v1.json"
    presets=json.loads(preset_path.read_text())
    for collection in ("presets","reservePresets"):
        if isinstance(presets.get(collection),dict):
            for item in presets[collection].values():
                if isinstance(item,dict):
                    item.pop("params",None)
                    item.pop("bypass",None)
                    item.pop("notes",None)
                    item.pop("portfolioRole",None)
                    item.pop("status",None)
    preset_path.write_text(json.dumps(presets,ensure_ascii=False,separators=(",",":"))+"\n")
    # Exact original UI image relative path ../../Assets/UI/ must still work.
    image_records={}
    for file in (UPSTREAM/"Assets/UI").rglob("*.png"):
        rel=file.relative_to(UPSTREAM).as_posix()
        data=file.read_bytes()
        expected=tracked.get(rel)
        if not expected or blob_sha(data)!=expected:
            raise SystemExit("BLOCKED: unexpected UI image "+rel)
        out=ROOT/rel
        out.parent.mkdir(parents=True,exist_ok=True)
        out.write_bytes(data)
        image_records[rel]={"sha":expected,"bytes":len(data)}
    if len(image_records)<780:raise SystemExit("BLOCKED: incomplete pinned UI PNG collection")
    # For security: prohibit actual Worklet, processor, C++ or WASM.
    for bad in ROOT.rglob("*.wasm"):raise SystemExit("BLOCKED: WASM in public repo "+str(bad))
    for bad in (OUT/"audio").iterdir():
        if bad.name not in ("engine.js","transport.css"):
            raise SystemExit("BLOCKED: unapproved audio file "+str(bad))
    report={"status":"original-html-css-ui-js-pinned","source_repository":"ureia-dev/SOURCERUNE",
        "source_commit":PIN,"original_web_app_files":original,"approved_png":image_records,
        "image_count":len(image_records),
        "exclusions":["DSP C++","AudioWorklet","WASM","factory preset parameter recipes"],
        "nonparity":["no playback","no post-DSP meters/spectrum","no private audio processor"]}
    (ROOT/"original_web_port_manifest.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
    # Original Web/App rendered layout becomes the site homepage, NOT a remake.
    (ROOT/"index.html").write_text('''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SOURCERUNE Web UI</title><meta http-equiv="refresh" content="0;url=./Web/App/index.html"></head><body><a href="./Web/App/index.html">Open original SOURCERUNE Web interface</a></body></html>
''')
    (ROOT/"README.md").write_text("""# SOURCERUNE — Public Original Web UI (no audio processor)

The live site now serves the **original SOURCERUNE Web/App index, CSS and UI controls** from pinned SOURCE main `c035db4d`, instead of an independently recreated UI.

- Live path: `Web/App/index.html` (root redirects automatically).
- UI artwork: all pinned public PNGs copied byte-exact into `Assets/UI/`.
- GUI JavaScript/CSS: source-exact except narrowly scoped public-audio disabling and public labels.
- DSP C++/AudioWorklet/WASM: **not copied**.
- Factory sound recipes: removed from public preset JSON; preset names, artwork and selection remain.
- Play/audio meters/spectrum driven by audio are **disabled**, not secretly implemented or simulated. Display-only EQ curve and other original visual frontend source remain browser-visible.
- Source SHA and per-file Git hashes: `original_web_port_manifest.json`.
- Secure verification: `scripts/check_original_port.py`, `scripts/check_allowlist.py`.

The prior exploratory HTML preview remains available in legacy root files for rollback but is **not** the primary UI. Full actual audio testing must use the private source environment. Do not change the original repository to Private until current anonymous browser layout tests and private audio test path are verified.
""")
    print(f"VERIFIED original Web/App {len(source_files)} files; {len(image_records)} PNG, source {PIN}")
if __name__=="__main__":main()
