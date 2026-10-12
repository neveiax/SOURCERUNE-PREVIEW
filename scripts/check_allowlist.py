"""Fail-closed published path and SHA allowlist for SOURCERUNE-PREVIEW."""
from pathlib import Path
import subprocess, json, re, struct
from hashlib import sha1

ALLOWED = {
    "README.md", "index.html", "viewer.css", "viewer.js",
    "interaction-state.mjs", "interaction-lab.mjs", "card-layout.mjs", "stage-controls.mjs",
    "macro-layout.mjs", "macro-controls.mjs",
    "ui02-extended-layout.mjs", "ui02-extended.mjs", ".nojekyll",
    ".github/workflows/snapshot-ui.yml",
    "scripts/bootstrap_assets.py", "scripts/check_allowlist.py",
    "scripts/port_original_ui.py", "scripts/check_original_port.py",
    ".github/workflows/original-web-port.yml", "original_web_port_manifest.json",
    "scripts/interaction-smoke.mjs", "scripts/card-layout-smoke.mjs",
    "scripts/native-card-smoke.mjs", "scripts/macro-smoke.mjs",
    "scripts/ui02-extended-smoke.mjs",
    "assets/UI_01.png", "assets/UI_02.png", "assets/approved_ui_manifest.json",
}

# Reviewed original cosmetic CSS additions, byte-exact to SOURCE; never JS, WASM, DSP.
REVIEWED_CSS_SHA={
    "Web/App/ui01_condition_ref_finish_v1.css": "ff67250259919eefb9c8dcaa68f7573ff874937b",
    "Web/App/ui01_eq_frame_ref_finish_v1.css": "2accfcb63632c701f213903f452246b9f1458707",
    "Web/App/ui01_knob_optics_ref_finish_v1.css": "e5d44bade9410cc92fa369301ca58b90224b66cb",
    "Web/App/ui01_ref_batch_a_v1.css": "de50b1405467dbbd98342b88866340f11581c8c4",
    "Web/App/ui01_ref_batch_b_v1.css": "3daec9e856db121a8080fb4400d79baf730ea634",
    "Web/App/ui01_ref_batch_c_v1.css": "5137187d84a5a818bba688a3833d7cf5dac23989",
    "Web/App/ui02_ref_batch_a_v1.css": "aecc3b4ff455389fb08d832c1920441d1085d726",
    "Web/App/ui02_ref_batch_b_v1.css": "2c9c9ca980abddcc9518a260fea913eae365ab5e",
    "Web/App/ui02_ref_batch_c_v1.css": "ff0135b6bb7509010f31c2e07b044f3a3c6a7718",
    "Web/App/ui_ref_text_guard_a_v1.css": "ef0ff03ffed8beb5425e0006f7c842330d70153e",
    "Web/App/ui_ref_text_guard_b_v1.css": "b6d9b75b5f341f9306389a2f5dcffe42199cf033",
    "Web/App/ui_ref_text_guard_c_v1.css": "2b2f9d9f4cf9c0f708b445a565779b0d29500303",
    "Web/App/ui_asset_browser_frame_ref_v1.css": "375051baddf2d44951345984c8f56dd402c3c625",
    "Web/App/ui_original_render_clarity_v1.css": "c6c7655f4dc6dba942e6c89071ddc3f91c64e4a2"
}
ALLOWED.update(REVIEWED_CSS_SHA)
ALLOWED.add('.github/workflows/ui-safe-styles-pr.yml')
ALLOWED.add('public_ui_style_sync_manifest.json')
# Existing public repository collaboration policy files, not Source-private material.
ALLOWED.update({'.github/PULL_REQUEST_TEMPLATE.md','.github/copilot-instructions.md','AGENTS.md'})
PINNED={"UI_01":"d2fc997e788361954726e712097373da75a4cec6",
        "UI_02":"df0623a87b3c2405ee5adfcba2b44f387d50887b"}
def blobsha(content):
    return sha1(b"blob "+str(len(content)).encode()+b"\0"+content).hexdigest()
def main():
    root=Path(__file__).resolve().parent.parent
    manifest_style=json.loads((root/"public_ui_style_sync_manifest.json").read_text(encoding="utf-8"))
    if manifest_style.get("styles")!=REVIEWED_CSS_SHA or manifest_style.get("audio_enabled") is not False:
        raise SystemExit("BLOCKED: approved CSS provenance differs")
    for rel,expected in REVIEWED_CSS_SHA.items():
        path=root/rel
        if not path.is_file() or blobsha(path.read_bytes())!=expected:
            raise SystemExit("BLOCKED: unapproved source SHA for "+rel)
        content=path.read_text(encoding="utf-8")
        if re.search(r'@import|https?://|data:text|(?:password|secret|private[_-]?key)',content,re.I):
            raise SystemExit("BLOCKED: unapproved external CSS content "+rel)
    manifest=json.loads((root/"assets/approved_ui_manifest.json").read_text(encoding="utf-8"))
    if manifest.get("source_commit")!="c035db4d6d5f409cdbedc4f9c874089ea1750fda" or len(manifest.get("entries",[]))!=50:
        raise SystemExit("BLOCKED: unexpected image manifest")
    for entry in manifest["entries"]:
        dest=entry["output_path"]
        if not re.fullmatch(r"assets/library/UI_0[12]/(SOURCE|TRANSMISSION|WALL_COVER|SPACE_ENVIRONMENT)/[A-Za-z0-9_]+\.png",dest):
            raise SystemExit("BLOCKED: manifest path not approved: "+dest)
        if not entry["source_path"].startswith("Assets/UI/"+entry["ui"]+"/"+entry["group"]+"/"):
            raise SystemExit("BLOCKED: manifest origin inconsistent")
        if not re.fullmatch(r"[a-f0-9]{40}",entry["git_blob_sha"]):
            raise SystemExit("BLOCKED: invalid expected SHA")
        ALLOWED.add(dest)
        image=root/dest
        if not image.is_file() or image.stat().st_size!=entry["bytes"] or blobsha(image.read_bytes())!=entry["git_blob_sha"]:
            raise SystemExit("BLOCKED: PNG missing or inconsistent with manifest: "+dest)
    for name,sha in PINNED.items():
        image=root/"assets"/(name+".png")
        if not image.is_file() or blobsha(image.read_bytes())!=sha:
            raise SystemExit("BLOCKED: pinned UI screenshot missing or tampered")
        raw=image.read_bytes()
        expected={"UI_01":(1499,807),"UI_02":(1672,941)}[name]
        actual=struct.unpack(">II",raw[16:24]) if raw.startswith(b"\x89PNG\r\n\x1a\n") else None
        if actual!=expected:
            raise SystemExit(f"BLOCKED: {name} screenshot {actual} does not match approved shell {expected}")
    # Permit exactly the pinned original Web UI files/PNG blobs once mirrored;
    # not a wildcard exception for arbitrary program or DSP files.
    provenance=root/"original_web_port_manifest.json"
    if provenance.is_file():
        port=json.loads(provenance.read_text(encoding="utf-8"))
        if port.get("source_commit")!="c035db4d6d5f409cdbedc4f9c874089ea1750fda":
            raise SystemExit("BLOCKED: original port source SHA differs")
        approved=port.get("approved_png",{})
        originals=port.get("original_web_app_files",{})
        if len(approved)<780 or len(originals)<35:
            raise SystemExit("BLOCKED: original UI port incomplete")
        for name,meta in approved.items():
            if not name.startswith("Assets/UI/") or not name.endswith(".png") or ".." in Path(name).parts:
                raise SystemExit("BLOCKED: invalid port PNG path")
            data=(root/name).read_bytes()
            if blobsha(data)!=meta["sha"] or len(data)!=meta["bytes"]:
                raise SystemExit("BLOCKED: original UI PNG checksum differs "+name)
            ALLOWED.add(name)
        for name,meta in originals.items():
            if not name.startswith("Web/App/") or ".." in Path(name).parts:
                raise SystemExit("BLOCKED: unexpected original Web path")
            relative=Path(name).relative_to("Web/App")
            valid=(len(relative.parts)==1 and relative.suffix in (".css",".js",".html")) or (
                relative.parts[0] in ("UI_01","UI_02") and relative.suffix==".css") or (
                relative.parts[0]=="data" and relative.suffix==".json") or (
                relative.as_posix()=="audio/transport.css")
            if not valid:raise SystemExit("BLOCKED: unapproved Web UI source "+name)
            data=(root/name).read_bytes()
            if name=="Web/App/geometry_audit.js":
                if blobsha(data)!="c97655194f0249edf05d84416f33daedbd0006ff":
                    raise SystemExit("BLOCKED: unapproved original geometry audit SHA")
            elif name not in {"Web/App/index.html","Web/App/app.js","Web/App/data/scene_presets_v1.json"}:
                if blobsha(data)!=meta["sha"]:raise SystemExit("BLOCKED: original Web UI blob changed "+name)
            ALLOWED.add(name)
        engine=root/"Web/App/audio/engine.js"
        if not engine.is_file() or "export async function createSceneNode()" not in engine.read_text():
            raise SystemExit("BLOCKED: missing public no-audio engine stub")
        ALLOWED.add("Web/App/audio/engine.js")
        if list((root/"Web/App").rglob("*.wasm")) or (root/"Web/App/audio/processor.js").exists():
            raise SystemExit("BLOCKED: audio DSP/Worklet unexpectedly included")
    tracked=set(subprocess.check_output(["git","ls-files"],text=True,cwd=root).splitlines())
    untracked=set(subprocess.check_output(["git","ls-files","--others","--exclude-standard"],text=True,cwd=root).splitlines())
    unexpected=sorted((tracked|untracked)-ALLOWED)
    if unexpected:
        raise SystemExit("BLOCKED: unapproved public files: "+", ".join(unexpected))
    for name in ("index.html","viewer.css","viewer.js","interaction-lab.mjs","interaction-state.mjs","stage-controls.mjs","card-layout.mjs","macro-layout.mjs","macro-controls.mjs","ui02-extended-layout.mjs","ui02-extended.mjs"):
        content=(root/name).read_text(encoding="utf-8")
        for forbidden in ("raw.githubusercontent.com","github.com/ureia-dev/SOURCERUNE/blob",
                          '<script src="https://',"https://api.github.com","AudioWorklet","WebAssembly","createSceneNode"):
            if forbidden in content: raise SystemExit(f"BLOCKED: {name} contains {forbidden}")
    print(f"PASS: strict public allowlist / {len(manifest['entries'])} approved UI module images")
if __name__ == "__main__":
    main()
