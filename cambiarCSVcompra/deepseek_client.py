import json
import os

from dotenv import load_dotenv
import httpx

_ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(_ENV_PATH)

OPENCODE_GO_BASE_URL = "https://opencode.ai/zen/go/v1"


def _get_opencode_key() -> str:
    key = os.getenv("OPENCODE_GO_API_KEY", "")
    if key:
        return key
    auth_path = os.path.expanduser("~/.local/share/opencode/auth.json")
    try:
        with open(auth_path, "r") as f:
            auth = json.load(f)
            return auth.get("opencode-go", {}).get("key", "")
    except (FileNotFoundError, json.JSONDecodeError, KeyError):
        pass
    return ""


class DeepSeekClient:
    def __init__(self, api_key: str | None = None, model: str = "deepseek-v4-flash") -> None:
        self.api_key = api_key or _get_opencode_key()
        if not self.api_key:
            raise ValueError(
                "No se encontro API key. Configura OPENCODE_GO_API_KEY en .env "
                "o ejecuta '/connect' en opencode para configurar el provider opencode-go."
            )
        self.model = model
        self.base_url = OPENCODE_GO_BASE_URL

    def chat(self, prompt: str, system: str | None = None) -> str:
        messages: list[dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        with httpx.Client(timeout=300) as client:
            resp = client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={"model": self.model, "messages": messages, "temperature": 0.0},
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
