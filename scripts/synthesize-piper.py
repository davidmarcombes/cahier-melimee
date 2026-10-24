#!/usr/bin/env python3
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.request
import wave
from pathlib import Path

MODEL_REVISION = "5041a7a49ae5b3a0f30e6837769eb03fdbb231bd"
MODEL_URL = (
    f"https://huggingface.co/rhasspy/piper-voices/resolve/{MODEL_REVISION}/"
    "fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx"
)
CONFIG_URL = MODEL_URL + ".json"
MODEL_SHA256 = "641d1ab097da2b81128c076810edb052b385decc8be3381814802a64a73baf99"
CONFIG_SHA256 = "39479916c2db192b5ac9764daddd0c744d83e023ad890c6976c0633ae4df8959"
OUTPUT_ROOT = Path(__file__).resolve().parent.parent / "src/assets/audio/voice-pilot"


def download_verified(url: str, destination: Path, expected_hash: str) -> None:
    if destination.exists() and hashlib.sha256(destination.read_bytes()).hexdigest() == expected_hash:
        return

    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(destination.suffix + ".download")
    try:
        urllib.request.urlretrieve(url, temporary)
        actual_hash = hashlib.sha256(temporary.read_bytes()).hexdigest()
        if actual_hash != expected_hash:
            raise RuntimeError(f"SHA-256 inattendu pour {destination.name} : {actual_hash}")
        temporary.replace(destination)
    finally:
        temporary.unlink(missing_ok=True)


def main() -> None:
    try:
        from piper import PiperVoice
        from piper.config import SynthesisConfig
    except ImportError as error:
        raise RuntimeError(
            "Piper absent. Lance « uv run --with piper-tts --with imageio-ffmpeg "
            "npm run generate:voice-pilot »."
        ) from error

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        try:
            import imageio_ffmpeg
        except ImportError as error:
            raise RuntimeError(
                "ffmpeg absent. Lance avec « uv run --with piper-tts --with imageio-ffmpeg »."
            ) from error
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

    model_dir = Path(
        os.environ.get("PIPER_MODEL_DIR", Path.home() / ".cache/melimee/piper/fr_FR-siwis-medium")
    )
    model_path = model_dir / "fr_FR-siwis-medium.onnx"
    config_path = model_dir / "fr_FR-siwis-medium.onnx.json"
    download_verified(MODEL_URL, model_path, MODEL_SHA256)
    download_verified(CONFIG_URL, config_path, CONFIG_SHA256)
    voice = PiperVoice.load(model_path, config_path)
    utterances = json.load(sys.stdin)

    for item in utterances:
        relative_path = Path(item["file"])
        if relative_path.is_absolute() or ".." in relative_path.parts:
            raise ValueError(f"Chemin audio interdit : {relative_path}")

        output_path = OUTPUT_ROOT / relative_path
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix="melimee-piper-") as temp_dir:
            wav_path = Path(temp_dir) / "speech.wav"
            with wave.open(str(wav_path), "wb") as wav_file:
                voice.synthesize_wav(
                    item["text"],
                    wav_file,
                    syn_config=SynthesisConfig(length_scale=item["lengthScale"]),
                )

            subprocess.run(
                [
                    ffmpeg,
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-y",
                    "-i",
                    str(wav_path),
                    "-map_metadata",
                    "-1",
                    "-ac",
                    "1",
                    "-ar",
                    "24000",
                    "-c:a",
                    "libopus",
                    "-b:a",
                    "20k",
                    "-application",
                    "voip",
                    str(output_path),
                ],
                check=True,
            )

    print(f"Voix téléchargée et clips produits : {OUTPUT_ROOT}")


if __name__ == "__main__":
    try:
        main()
    except (OSError, RuntimeError, ValueError, subprocess.CalledProcessError) as error:
        print(f"Erreur génération Piper : {error}", file=sys.stderr)
        sys.exit(1)
