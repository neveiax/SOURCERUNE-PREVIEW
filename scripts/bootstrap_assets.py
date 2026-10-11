"""Bootstrap ONLY two approved UI screenshot PNGs. No cloning or publishing of application source."""
from pathlib import Path
from urllib.request import urlopen
from hashlib import sha1

SRC_SHA = "c035db4d6d5f409cdbedc4f9c874089ea1750fda"
SOURCES = {
    "UI_01": ("Web/App/preview/rendered/UI_01.png", "d2fc997e788361954726e712097373da75a4cec6"),
    "UI_02": ("Web/App/preview/rendered/UI_02.png", "df0623a87b3c2405ee5adfcba2b44f387d50887b"),
}

def git_blob_sha(data: bytes) -> str:
    return sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()

def main() -> None:
    dst = Path("assets")
    dst.mkdir(exist_ok=True)
    for name, (source, expected_sha) in SOURCES.items():
        target = dst / (name + ".png")
        if target.exists():
            data = target.read_bytes()
        else:
            url = f"https://raw.githubusercontent.com/ureia-dev/SOURCERUNE/{SRC_SHA}/{source}"
            with urlopen(url, timeout=35) as response:
                data = response.read()
        if not data.startswith(b"\x89PNG\r\n\x1a\n"):
            raise ValueError(f"{name}: invalid PNG signature")
        actual_sha = git_blob_sha(data)
        if actual_sha != expected_sha:
            raise ValueError(f"{name}: unexpected source image hash {actual_sha}")
        target.write_bytes(data)
        print(f"VERIFIED {name}: {len(data)} bytes Git blob SHA {actual_sha}")
if __name__ == "__main__":
    main()
