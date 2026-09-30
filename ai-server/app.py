import io
import logging
import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

import torch
from diffusers import AutoPipelineForImage2Image, AutoPipelineForText2Image
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field, field_validator


logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("yamini-ai")
ROOT_DIR = Path(__file__).resolve().parent
load_dotenv(ROOT_DIR / ".env")
OUTPUT_DIR_NAME = os.getenv("OUTPUT_DIR", "generated")
if OUTPUT_DIR_NAME != "generated":
    raise RuntimeError("OUTPUT_DIR must be the service's generated directory.")
OUTPUT_DIR = ROOT_DIR / "generated"
if OUTPUT_DIR.is_symlink():
    raise RuntimeError("The generated output directory cannot be a symbolic link.")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
MODEL_ID = os.getenv("MODEL_ID", "stabilityai/sd-turbo").strip()
DEVICE_SETTING = os.getenv("DEVICE", "auto").strip().lower()
ALLOW_CPU_FALLBACK = os.getenv("ALLOW_CPU_FALLBACK", "false").lower() == "true"
MAX_UPLOAD_BYTES = 15 * 1024 * 1024
MAX_INPUT_PIXELS = 50_000_000
ARTWORK_GUIDANCE = (
    "Create polished commercial print artwork. Artwork and decorative visuals only; "
    "do not render letters, words, numbers, logos, or contact details. Leave clear "
    "space for editable text to be added in the design editor. "
)


class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=1500)
    width: int = Field(default=512, ge=256, le=768)
    height: int = Field(default=512, ge=256, le=768)
    steps: int = Field(default=4, ge=1, le=4)

    @field_validator("prompt")
    @classmethod
    def validate_prompt(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Prompt must not be empty")
        return value

    @field_validator("width", "height")
    @classmethod
    def validate_multiple_of_eight(cls, value: int) -> int:
        if value % 8:
            raise ValueError("Dimensions must be divisible by 8")
        return value


service_state = {
    "device": "unavailable",
    "pipeline": None,
    "edit_pipeline": None,
    "error": None,
}


def choose_device() -> str:
    if DEVICE_SETTING == "cpu":
        if not ALLOW_CPU_FALLBACK:
            raise RuntimeError("CPU generation is disabled. Set ALLOW_CPU_FALLBACK=true to opt in.")
        return "cpu"
    if DEVICE_SETTING == "cuda":
        if not torch.cuda.is_available():
            raise RuntimeError("CUDA was requested, but no compatible CUDA GPU is available.")
        return "cuda"
    if DEVICE_SETTING != "auto":
        raise RuntimeError("DEVICE must be auto, cuda, or cpu.")
    if torch.cuda.is_available():
        return "cuda"
    if ALLOW_CPU_FALLBACK:
        return "cpu"
    raise RuntimeError("No CUDA GPU is available. Configure a compatible GPU or explicitly enable CPU fallback.")


def configure_pipeline(pipeline, device: str):
    pipeline.enable_attention_slicing()
    if hasattr(pipeline, "enable_vae_slicing"):
        pipeline.enable_vae_slicing()
    pipeline.to(device)
    return pipeline


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        device = choose_device()
        dtype = torch.float16 if device == "cuda" else torch.float32
        pipeline = AutoPipelineForText2Image.from_pretrained(MODEL_ID, torch_dtype=dtype)
        edit_pipeline = AutoPipelineForImage2Image.from_pipe(pipeline)
        service_state["pipeline"] = configure_pipeline(pipeline, device)
        service_state["edit_pipeline"] = configure_pipeline(edit_pipeline, device)
        service_state["device"] = device
        logger.info("Loaded model %s on %s", MODEL_ID, device)
    except Exception as error:
        service_state["error"] = error
        logger.exception("AI model could not be loaded")
    yield
    service_state["pipeline"] = None
    service_state["edit_pipeline"] = None
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


app = FastAPI(title="Yamini Flex Local Image Service", lifespan=lifespan)
allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
app.mount("/generated", StaticFiles(directory=str(OUTPUT_DIR)), name="generated")


def require_pipeline(name: str):
    pipeline = service_state.get(name)
    if pipeline is None:
        raise HTTPException(status_code=503, detail="The local image model is unavailable. Check the AI server configuration and logs.")
    return pipeline


def save_png(image: Image.Image) -> str:
    filename = f"design_{uuid.uuid4().hex}.png"
    output_path = (OUTPUT_DIR / filename).resolve()
    if output_path.parent != OUTPUT_DIR:
        raise HTTPException(status_code=500, detail="Unable to save generated image")
    image.save(output_path, format="PNG", optimize=True)
    return f"/generated/{filename}"


def run_pipeline(pipeline, prompt: str, steps: int, width: int, height: int, image=None):
    if service_state["device"] == "cpu" and (width > 512 or height > 512):
        raise HTTPException(status_code=400, detail="CPU mode is limited to 512 × 512 images")
    try:
        arguments = {
            "prompt": ARTWORK_GUIDANCE + prompt,
            "num_inference_steps": steps,
            "guidance_scale": 0.0,
            "width": width,
            "height": height,
        }
        if image is not None:
            arguments.pop("width")
            arguments.pop("height")
            arguments.update({"image": image, "strength": max(1 / steps, 0.65)})
        generator = torch.Generator(device=service_state["device"]).manual_seed(
            int.from_bytes(os.urandom(4), "big")
        )
        arguments["generator"] = generator
        with torch.inference_mode():
            return pipeline(**arguments).images[0]
    except torch.cuda.OutOfMemoryError as error:
        torch.cuda.empty_cache()
        logger.warning("CUDA ran out of memory while generating an image")
        raise HTTPException(status_code=503, detail="The graphics card ran out of memory. Try a smaller image or fewer steps.") from error
    except RuntimeError as error:
        if "out of memory" in str(error).lower():
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            logger.warning("Image generation ran out of memory")
            raise HTTPException(status_code=503, detail="Image generation ran out of memory. Try a smaller image.") from error
        logger.exception("Image generation failed")
        raise HTTPException(status_code=502, detail="Image generation failed. Check the server logs and try again.") from error
    except Exception as error:
        logger.exception("Image generation failed")
        raise HTTPException(status_code=502, detail="Image generation failed. Check the server logs and try again.") from error


@app.get("/health")
def health():
    ready = service_state["pipeline"] is not None and service_state["edit_pipeline"] is not None
    response = {"status": "ok" if ready else "unavailable", "device": service_state["device"], "model": MODEL_ID}
    if ready:
        return response
    raise HTTPException(status_code=503, detail=response)


@app.post("/generate")
def generate(request: GenerateRequest):
    image = run_pipeline(
        require_pipeline("pipeline"),
        request.prompt,
        request.steps,
        request.width,
        request.height,
    )
    return {"success": True, "image_url": save_png(image), "model": MODEL_ID}


@app.post("/edit")
def edit(
    prompt: str = Form(..., min_length=1, max_length=1500),
    steps: int = Form(default=4, ge=1, le=4),
    image: UploadFile = File(...),
    reference_image: UploadFile | None = File(default=None),
    mask: UploadFile | None = File(default=None),
):
    prompt = prompt.strip()
    if not prompt:
        raise HTTPException(status_code=422, detail="Prompt must not be empty")
    if image.content_type not in {"image/png", "image/jpeg", "image/webp"}:
        raise HTTPException(status_code=400, detail="Source image must be PNG, JPG, or WebP")
    contents = image.file.read(MAX_UPLOAD_BYTES + 1)
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Source image must be 15 MB or smaller")
    try:
        source = Image.open(io.BytesIO(contents))
        source.load()
        if source.width * source.height > MAX_INPUT_PIXELS:
            raise HTTPException(status_code=400, detail="Source image dimensions are too large")
        original_size = source.size
        source = source.convert("RGB")
    except (UnidentifiedImageError, OSError) as error:
        raise HTTPException(status_code=400, detail="Source image is invalid") from error
    except Image.DecompressionBombError as error:
        raise HTTPException(status_code=400, detail="Source image dimensions are too large") from error

    width = max(256, min(512, round(source.width / max(source.size) * 512 / 8) * 8))
    height = max(256, min(512, round(source.height / max(source.size) * 512 / 8) * 8))
    working_source = source
    if reference_image is not None:
        if reference_image.content_type not in {"image/png", "image/jpeg", "image/webp"}:
            raise HTTPException(status_code=400, detail="Reference image must be PNG, JPG, or WebP")
        reference_contents = reference_image.file.read(MAX_UPLOAD_BYTES + 1)
        if len(reference_contents) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="Reference image must be 15 MB or smaller")
        try:
            reference = Image.open(io.BytesIO(reference_contents))
            reference.load()
            if reference.width * reference.height > MAX_INPUT_PIXELS:
                raise HTTPException(status_code=400, detail="Reference image dimensions are too large")
            working_source = reference.convert("RGB")
        except (UnidentifiedImageError, OSError) as error:
            raise HTTPException(status_code=400, detail="Reference image is invalid") from error
        except Image.DecompressionBombError as error:
            raise HTTPException(status_code=400, detail="Reference image dimensions are too large") from error
    edit_mask = None
    if mask is not None:
        if mask.content_type != "image/png":
            raise HTTPException(status_code=400, detail="Edit mask must be a PNG image")
        mask_contents = mask.file.read(MAX_UPLOAD_BYTES + 1)
        if len(mask_contents) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="Edit mask must be 15 MB or smaller")
        try:
            edit_mask = Image.open(io.BytesIO(mask_contents)).convert("L")
            if edit_mask.size != original_size:
                edit_mask = edit_mask.resize(original_size, Image.Resampling.NEAREST)
        except (UnidentifiedImageError, OSError) as error:
            raise HTTPException(status_code=400, detail="Edit mask is invalid") from error
        edit_bounds = edit_mask.getbbox()
        if edit_bounds is None:
            raise HTTPException(status_code=400, detail="Edit mask contains no selected area")
    else:
        edit_bounds = (0, 0, *original_size)

    source_crop = source.crop(edit_bounds)
    if reference_image is None:
        working_source = source_crop
    longest_side = max(working_source.size)
    width = max(64, round(working_source.width / longest_side * 512 / 8) * 8)
    height = max(64, round(working_source.height / longest_side * 512 / 8) * 8)
    working_image = working_source.resize((width, height), Image.Resampling.LANCZOS)
    edited = run_pipeline(
        require_pipeline("edit_pipeline"), prompt, steps, width, height, image=working_image
    )
    edited_crop = edited.resize(source_crop.size, Image.Resampling.LANCZOS)
    if edit_mask is not None:
        mask_crop = edit_mask.crop(edit_bounds)
        edited_crop = Image.composite(edited_crop, source_crop, mask_crop)
    output = source.copy()
    output.paste(edited_crop, edit_bounds[:2])
    return {"success": True, "image_url": save_png(output), "model": MODEL_ID}