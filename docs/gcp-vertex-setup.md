# Vertex AI Setup for OpenCode

## Cambios realizados

Se migró OpenCode de Google AI Studio (API key) a **Vertex AI** (service account) para consumir los $300 USD de free credits de GCP.

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `~/.config/opencode/oh-my-openagent.json` | Prefijo de modelos `google/` → `google-vertex/` |
| `.env.gcloud` | Se agregaron `GOOGLE_CLOUD_PROJECT`, `VERTEX_LOCATION`, `GENAI_USE_VERTEXAI=true`, y se corrigió `CLOUDSDK_CORE_PROJECT` al ID numérico |
| `~/.bashrc` | Se agregó `source .env.gcloud` automático al inicio de sesión |

### Modelos Vertex AI disponibles

Los siguientes modelos de Gemini 2.5 funcionan correctamente en Vertex AI a través del service account:

| Modelo `google-vertex/` | Uso recomendado |
|-------------------------|-----------------|
| `gemini-2.5-flash` | Agentes rápidos (librarian, explore, document-writer, multimodal-looker) |
| `gemini-2.5-pro` | Agentes profundos (oracle, frontend-ui-ux-engineer) |
| `gemini-2.5-flash-lite` | Tareas triviales (no usado actualmente) |

**Nota:** Claude models y Gemini 3/3.1 models NO están disponibles en este proyecto de Vertex AI. Claude requiere activación adicional a través de Model Garden.

### Ejemplo de cambio en modelos (`oh-my-openagent.json`)

```diff
- "model": "google/claude-sonnet-4-5-thinking-low"
+ "model": "google-vertex/gemini-2.5-flash"
```

---

## Cómo volver a AI Studio (revertir)

### 1. Revertir modelos en `oh-my-openagent.json`

Cambiar `google-vertex/` → `google/`:

```bash
sed -i 's/google-vertex/google/g' ~/.config/opencode/oh-my-openagent.json
```

### 2. Quitar source de `.bashrc`

```bash
sed -i '/# ─── Vertex AI \/ GCP env (CIG project) ───/,/fi/d' ~/.bashrc
```

Luego cerrar y reabrir terminal, o ejecutar:

```bash
exec bash
```

### 3. (Opcional) Eliminar `.env.gcloud` si ya no se necesita

```bash
rm /home/ed/Documents/MAESTRIA/SISTEMAS_INTELIGENTES/CIG-2/.env.gcloud
```

---

## Cómo cambiar las credenciales (service account)

Si necesitas usar otro service account o proyecto GCP:

### 1. Reemplazar el archivo de credenciales

```bash
# Reemplazar el contenido del JSON de credenciales
nano /home/ed/Documents/MAESTRIA/SISTEMAS_INTELIGENTES/CIG-2/config/env/private.gcloud.json
```

### 2. Actualizar `.env.gcloud` con los nuevos valores

Editar las siguientes variables en `/home/ed/Documents/MAESTRIA/SISTEMAS_INTELIGENTES/CIG-2/.env.gcloud`:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/home/ed/.../nuevo-service-account.json
export CLOUDSDK_CORE_PROJECT=nuevo-project-id
export GOOGLE_CLOUD_PROJECT=nuevo-project-id
export CLOUDSDK_CORE_ACCOUNT=tu-sa@nuevo-project.iam.gserviceaccount.com
```

### 3. Recargar las variables

```bash
source /home/ed/Documents/MAESTRIA/SISTEMAS_INTELIGENTES/CIG-2/.env.gcloud
```

---

## Verificar que Vertex AI funciona

```bash
source /home/ed/Documents/MAESTRIA/SISTEMAS_INTELIGENTES/CIG-2/.env.gcloud

# Probar autenticación
gcloud auth activate-service-account --key-file="$GOOGLE_APPLICATION_CREDENTIALS"
gcloud config get-value project

# Probar API de Vertex AI
ACCESS_TOKEN=$(gcloud auth application-default print-access-token)
curl -s -X POST \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  "https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${GOOGLE_CLOUD_PROJECT}/locations/${VERTEX_LOCATION}/publishers/google/models/gemini-2.5-flash:generateContent" \
  -d '{"contents":[{"role":"user","parts":[{"text":"Say hello in one word"}]}]}'

Si ves una respuesta JSON con `candidates`, está funcionando correctamente.

Los modelos disponibles en este proyecto via Vertex AI son gemini-2.5-flash, gemini-2.5-pro, y gemini-2.5-flash-lite. Modelos más antiguos (1.5, 2.0) y más recientes (3.0) no están disponibles en el proyecto actual.

---

## Estructura del service account actual

| Campo | Valor |
|-------|-------|
| Project ID | `cig-technology-495016` |
| Service Account | `cig-technology@cig-technology-495016.iam.gserviceaccount.com` |
| Rol | `Owner`, `AI Platform User` |
| Región Vertex | `us-central1` |
| Archivo credenciales | `config/env/private.gcloud.json` |
