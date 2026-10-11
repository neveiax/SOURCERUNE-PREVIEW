"""Publish ONLY SHA-pinned, previously public UI artwork. No full source checkout."""
from pathlib import Path
from urllib.request import urlopen
from hashlib import sha1
from concurrent.futures import ThreadPoolExecutor
from json import loads

SRC_SHA = "c035db4d6d5f409cdbedc4f9c874089ea1750fda"
SOURCES = {
    "UI_01": ("Web/App/preview/rendered/UI_01.png", "d2fc997e788361954726e712097373da75a4cec6"),
    "UI_02": ("Web/App/preview/rendered/UI_02.png", "df0623a87b3c2405ee5adfcba2b44f387d50887b"),
}
ROOT = Path(__file__).resolve().parent.parent

def git_blob_sha(data: bytes) -> str:
    return sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()

def get_verified(source: str, destination: Path, expected_sha: str, expected_bytes=None):
    if destination.exists():
        data = destination.read_bytes()
    else:
        # The source is public only during initial bootstrap. Published files
        # are saved into this standalone Preview repository permanently.
        url = f"https://raw.githubusercontent.com/ureia-dev/SOURCERUNE/{SRC_SHA}/{source}"
        with urlopen(url, timeout=45) as response:
            data = response.read()
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError(f"{destination}: invalid PNG")
    actual = git_blob_sha(data)
    if actual != expected_sha:
        raise ValueError(f"{destination}: SHA mismatch {actual}")
    if expected_bytes is not None and len(data) != expected_bytes:
        raise ValueError(f"{destination}: unexpected length {len(data)}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)
    return destination.as_posix(), len(data)

def main():
    manifest=loads((ROOT/"assets/approved_ui_manifest.json").read_text(encoding="utf-8"))
    if manifest.get("source_commit") != SRC_SHA or len(manifest.get("entries",[])) != 50:
        raise ValueError("Approved UI manifest does not match pinned 50-image contract")
    specs=[]
    for name,(source,sha) in SOURCES.items():
        specs.append((source,ROOT/"assets"/(name+".png"),sha,None))
    for entry in manifest["entries"]:
        path=entry["output_path"]
        if not path.startswith("assets/library/") or ".." in Path(path).parts or not path.endswith(".png"):
            raise ValueError(f"Unsafe output path: {path}")
        if not entry["source_path"].startswith("Assets/UI/") or ".." in Path(entry["source_path"]).parts:
            raise ValueError(f"Unsafe source path: {entry['source_path']}")
        specs.append((entry["source_path"],ROOT/path,entry["git_blob_sha"],entry["bytes"]))
    if len({str(s[1]) for s in specs})!=len(specs):
        raise ValueError("Duplicate destination path")
    # Only six parallel requests; not a stress test or repeated download loop.
    with ThreadPoolExecutor(max_workers=6) as pool:
        reports=list(pool.map(lambda s:get_verified(*s),specs))
    print(f"VERIFIED {len(reports)} approved PNG files / {sum(x[1] for x in reports)} bytes")
if __name__ == "__main__":
    main()
