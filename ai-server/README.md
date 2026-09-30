# Yamini Flex Local AI Image Service

This separate FastAPI service generates artwork and image-to-image variations for the existing Yamini Flex editor/customization workflow. Critical copy such as names, offers, phone numbers, and addresses remains editable text in the editor.

## Requirements

- Python 3.11 or 3.12 is recommended for broad PyTorch wheel compatibility. The inspected workstation has Python 3.14.3; confirm a matching Windows PyTorch wheel is available before using that interpreter.
- Use an NVIDIA GPU with CUDA and at least 8 GB VRAM for interactive work; 12 GB or more is preferable.
- The inspected HP ENVY x360 has 15.7 GB RAM and Intel Iris Xe integrated graphics, with no NVIDIA GPU, CUDA, or installed PyTorch. It cannot run a practical interactive CUDA workload.
- CPU generation is disabled by default. It can be opted into for low-resolution tests but will be slow; use a supported CUDA GPU for design iteration.

## Model and license

The default model is `stabilityai/sd-turbo`, a distilled Stable Diffusion model intended for 512-pixel artwork and 1–4 steps. It supports text-to-image and image-to-image and is smaller/faster than SDXL or FLUX. It is not a print-resolution model and cannot reliably render legible text.

The model card directs commercial users to Stability AI's license/membership terms. Stability AI's current public licensing page describes a Community tier for organizations under $1M annual revenue, but the listed model set names SDXL-Turbo and does not explicitly name SD-Turbo. Do not assume that the Community tier covers this checkpoint: confirm SD-Turbo's applicable terms directly with Stability AI before commercial printing use. This is not an unrestricted Apache/MIT-licensed model. `MODEL_ID` is configurable, but changing it does not change the model's license obligations or hardware requirements.

## Install

```powershell
cd ai-server
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
```

Install PyTorch first using the official selector at <https://pytorch.org/get-started/locally/>. Select Windows, Pip, Python, and the CUDA version supported by the NVIDIA driver. For a CPU-only environment, select CPU; do not install a CUDA wheel on the inspected Intel-only machine.

```powershell
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Set `MODEL_ID`, `DEVICE`, `ALLOW_CPU_FALLBACK`, `OUTPUT_DIR`, and `CORS_ORIGINS` as needed. Hugging Face downloads model weights at first startup and caches them for subsequent runs.

## Run and check

```powershell
uvicorn app:app --host 127.0.0.1 --port 8000
Invoke-RestMethod http://127.0.0.1:8000/health
```

The model loads once at startup. `GET /health` returns `status`, `device`, and `model`; it responds HTTP 503 if the model or hardware is unavailable.

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/generate `
  -ContentType 'application/json' `
  -Body '{"prompt":"Premium bakery banner artwork with pastries, warm cream and berry-red colors, no text","width":512,"height":512,"steps":2}'
```

`POST /generate` accepts a 1–1500 character prompt, dimensions from 256–768 divisible by 8, and 1–4 steps. `POST /edit` accepts multipart `image`, `prompt`, and optional bounded steps; it generates a variation at a model-friendly size and returns it at the source dimensions. Outputs are unique PNGs under `generated/` and only those files are served at `/generated/<filename>`.

## Node and React integration

Node calls the service through `AI_SERVER_URL`; React uses the existing Node API client and never receives model credentials. The editor remains responsible for text, layout, saving, and PNG/JPG/PDF export. Generated artwork is low resolution and is not automatically print-ready at large physical sizes.

The project already uses MongoDB/GridFS for application-managed uploads. Do not store image binaries in MongoDB documents; production storage can move to S3-compatible object storage behind the existing storage boundary.

Run the existing services in separate terminals from the project root:

```powershell
# Terminal 1
cd ai-server
.venv\Scripts\Activate.ps1
uvicorn app:app --host 127.0.0.1 --port 8000

# Terminal 2
cd backend
npm run dev

# Terminal 3
cd frontend
npm run dev
```

Set `AI_SERVER_URL=http://127.0.0.1:8000`, `AI_SERVER_TIMEOUT=180` (seconds), and `AI_IMAGE_PROVIDER=selfhosted` in `backend/.env`. **Flattened bitmap designs still need the existing backend vision/OCR provider** (for example `AI_VISION_PROVIDER=gemini` and `GEMINI_API_KEY` in `backend/.env`) to locate their text and image regions. The exact changed text is rendered locally; the self-hosted model handles image regions only. Fully local vision requires an additional local OCR/vision model, which is not installed or claimed here.

## Troubleshooting

- **Health unavailable:** inspect the AI-server terminal for model download, license/access, Python, or device errors.
- **CUDA unavailable:** install a PyTorch wheel compatible with the installed driver, or explicitly opt into CPU for a low-resolution test.
- **CUDA out of memory:** use 512 × 512 or smaller, reduce steps, and close other GPU workloads. Use a GPU with more VRAM for larger canvases.
- **CPU generation is slow:** this is expected on laptop CPUs; use a supported NVIDIA GPU for interactive work.
- **Not print-ready:** image resizing cannot add real detail. Prepare and inspect final artwork at the actual print dimensions and DPI.
- **Commercial use:** confirm current Stability AI terms and usage policies before deployment.

## Production

Run the service on a GPU host on a private network, inaccessible to the public internet. Only the Node backend should call it. Configure strict CORS, backend timeouts and concurrency limits, output retention, and object storage for multi-instance deployments. Never expose filesystem paths or model credentials to the browser.