"""
Mock OIDC Identity Provider for DeliverIt local development.

Implements OpenID Connect endpoints with pre-seeded users matching
the application's four system roles. NOT Java -- Python only.
"""

import hashlib
import html
import json
import os
import time
import urllib.parse
import uuid
from typing import Any

import jwt
import uvicorn
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PORT = int(os.environ.get("MOCK_OIDC_PORT", "10090"))
EXTERNAL_BASE = os.environ.get("MOCK_OIDC_EXTERNAL_BASE_URL", f"http://localhost:{PORT}")
INTERNAL_BASE = os.environ.get("MOCK_OIDC_INTERNAL_BASE_URL", f"http://localhost:{PORT}")
CLIENT_ID = os.environ.get("MOCK_OIDC_CLIENT_ID", "mock-oidc-client")
CLIENT_SECRET = os.environ.get("MOCK_OIDC_CLIENT_SECRET", "mock-oidc-secret")

# ---------------------------------------------------------------------------
# RSA key pair (generated once at startup)
# ---------------------------------------------------------------------------

_rsa_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_private_pem = _rsa_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption(),
)
_public_key = _rsa_key.public_key()
_public_numbers = _public_key.public_numbers()

KID = "mock-oidc-key-1"


def _int_to_base64url(n: int) -> str:
    """Convert a large integer to a Base64url-encoded string (no padding)."""
    byte_length = (n.bit_length() + 7) // 8
    raw = n.to_bytes(byte_length, byteorder="big")
    import base64

    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


# ---------------------------------------------------------------------------
# In-memory stores
# ---------------------------------------------------------------------------

USERS: dict[str, dict[str, Any]] = {}
CLIENTS: dict[str, dict[str, Any]] = {}
AUTH_CODES: dict[str, dict[str, Any]] = {}

# Pre-seeded users (4 matching Document AI app roles)
_SEED_USERS = [
    {"sub": "mock-admin", "email": "admin@example.com", "name": "Alex Admin"},
    {"sub": "mock-analyst", "email": "analyst@example.com", "name": "Sam Analyst"},
    {"sub": "mock-user", "email": "user@example.com", "name": "Val Viewer"},
    {"sub": "mock-vendor", "email": "vendor@example.com", "name": "Vic Vendor"},
]

for u in _SEED_USERS:
    USERS[u["sub"]] = {**u}

# Pre-seeded client
CLIENTS[CLIENT_ID] = {
    "client_id": CLIENT_ID,
    "client_secret": CLIENT_SECRET,
    "redirect_uris": ["http://localhost:3020/api/auth/callback"],
}

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="Mock OIDC Provider", docs_url=None, redoc_url=None)


def _validate_redirect_uri(client_id: str, redirect_uri: str) -> None:
    """Reject redirect_uri values not registered for the client."""
    client = CLIENTS.get(client_id)
    if not client or redirect_uri not in client.get("redirect_uris", []):
        raise HTTPException(
            status_code=400,
            detail=f"redirect_uri not registered for client: {redirect_uri}",
        )


# ---- Health ---------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok"}


# ---- OIDC Discovery -------------------------------------------------------

@app.get("/.well-known/openid-configuration")
async def openid_configuration():
    """
    OIDC Discovery document.
    - authorization_endpoint and end_session_endpoint use EXTERNAL base URL
      (browser-facing).
    - token_endpoint, userinfo_endpoint, jwks_uri use INTERNAL base URL
      (server-to-server inside Docker network).
    """
    return {
        "issuer": INTERNAL_BASE,
        "authorization_endpoint": f"{EXTERNAL_BASE}/authorize",
        "token_endpoint": f"{INTERNAL_BASE}/token",
        "userinfo_endpoint": f"{INTERNAL_BASE}/userinfo",
        "jwks_uri": f"{INTERNAL_BASE}/jwks",
        "end_session_endpoint": f"{EXTERNAL_BASE}/logout",
        "response_types_supported": ["code"],
        "subject_types_supported": ["public"],
        "id_token_signing_alg_values_supported": ["RS256"],
        "scopes_supported": ["openid", "profile", "email"],
        "token_endpoint_auth_methods_supported": ["client_secret_post", "client_secret_basic"],
        "grant_types_supported": ["authorization_code"],
    }


# ---- JWKS ------------------------------------------------------------------

@app.get("/jwks")
async def jwks():
    return {
        "keys": [
            {
                "kty": "RSA",
                "kid": KID,
                "use": "sig",
                "alg": "RS256",
                "n": _int_to_base64url(_public_numbers.n),
                "e": _int_to_base64url(_public_numbers.e),
            }
        ]
    }


# ---- Authorize (user picker) ----------------------------------------------

@app.get("/authorize")
async def authorize(
    client_id: str = Query(...),
    redirect_uri: str = Query(...),
    response_type: str = Query("code"),
    scope: str = Query("openid"),
    state: str = Query(""),
    nonce: str = Query(""),
    login_hint: str = Query(""),
):
    # Validate client
    client = CLIENTS.get(client_id)
    if not client:
        raise HTTPException(status_code=400, detail=f"Unknown client_id: {client_id}")

    # Validate redirect_uri against registered URIs to prevent open redirect
    _validate_redirect_uri(client_id, redirect_uri)

    # If login_hint provided and matches a user, auto-select
    if login_hint and login_hint in USERS:
        code = _issue_code(login_hint, client_id, redirect_uri, nonce)
        sep = "&" if "?" in redirect_uri else "?"
        location = f"{redirect_uri}{sep}code={code}"
        if state:
            location += f"&state={state}"
        return RedirectResponse(url=location, status_code=302)

    # Render user picker HTML — escape all interpolated values to prevent XSS
    user_buttons = ""
    for sub, u in USERS.items():
        safe_sub = html.escape(sub, quote=True)
        safe_name = html.escape(u['name'], quote=True)
        safe_email = html.escape(u['email'], quote=True)
        user_buttons += f"""
        <button type="button" data-sub="{safe_sub}"
                style="display:block;width:100%;padding:12px 16px;margin:8px 0;
                       border:1px solid #ddd;border-radius:8px;background:#fff;
                       cursor:pointer;text-align:left;font-size:14px;">
            <strong>{safe_name}</strong><br>
            <span style="color:#666;font-size:12px;">{safe_email} ({safe_sub})</span>
        </button>
        """

    # Pass dynamic values via a JSON blob to avoid inline JS injection
    js_config = json.dumps({
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "state": state,
        "nonce": nonce,
    })

    page_html = f"""<!DOCTYPE html>
<html>
<head><title>Mock OIDC Login</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;max-width:400px;margin:60px auto;padding:20px;">
    <h2 style="text-align:center;">Mock OIDC Login</h2>
    <p style="color:#666;text-align:center;">Select a user to sign in as:</p>
    {user_buttons}
    <script>
    (function() {{
        var config = {js_config};
        document.querySelectorAll('button[data-sub]').forEach(function(btn) {{
            btn.addEventListener('click', function() {{
                var params = new URLSearchParams({{
                    sub: btn.getAttribute('data-sub'),
                    client_id: config.client_id,
                    redirect_uri: config.redirect_uri,
                    state: config.state,
                    nonce: config.nonce
                }});
                window.location.href = '/authorize/callback?' + params.toString();
            }});
        }});
    }})();
    </script>
</body>
</html>"""
    return HTMLResponse(content=page_html)


@app.get("/authorize/callback")
async def authorize_callback(
    sub: str = Query(...),
    client_id: str = Query(...),
    redirect_uri: str = Query(...),
    state: str = Query(""),
    nonce: str = Query(""),
):
    """Internal redirect after user picker selection."""
    if sub not in USERS:
        raise HTTPException(status_code=400, detail=f"Unknown user: {sub}")

    # Validate redirect_uri against registered URIs to prevent open redirect
    _validate_redirect_uri(client_id, redirect_uri)

    code = _issue_code(sub, client_id, redirect_uri, nonce)
    sep = "&" if "?" in redirect_uri else "?"
    location = f"{redirect_uri}{sep}code={code}"
    if state:
        location += f"&state={state}"
    return RedirectResponse(url=location, status_code=302)


def _issue_code(sub: str, client_id: str, redirect_uri: str, nonce: str) -> str:
    code = uuid.uuid4().hex
    AUTH_CODES[code] = {
        "sub": sub,
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "nonce": nonce,
        "created_at": time.time(),
    }
    return code


# ---- Token -----------------------------------------------------------------

@app.post("/token")
async def token(request: Request):
    # Accept both form-encoded and JSON
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        body = await request.json()
    else:
        form = await request.form()
        body = dict(form)

    grant_type = body.get("grant_type", "")
    code = body.get("code", "")
    client_id = body.get("client_id", "")
    client_secret = body.get("client_secret", "")
    redirect_uri = body.get("redirect_uri", "")

    if grant_type != "authorization_code":
        raise HTTPException(status_code=400, detail="Unsupported grant_type")

    # Validate auth code
    code_data = AUTH_CODES.pop(code, None)
    if not code_data:
        raise HTTPException(status_code=400, detail="Invalid or expired authorization code")

    # Check code expiry (5 minutes)
    if time.time() - code_data["created_at"] > 300:
        raise HTTPException(status_code=400, detail="Authorization code expired")

    # Validate client
    client = CLIENTS.get(client_id or code_data["client_id"])
    if not client:
        raise HTTPException(status_code=400, detail="Unknown client")
    if client_secret and client_secret != client["client_secret"]:
        raise HTTPException(status_code=400, detail="Invalid client_secret")

    user = USERS.get(code_data["sub"])
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    now = int(time.time())

    # Build ID token
    id_token_claims = {
        "iss": INTERNAL_BASE,
        "sub": user["sub"],
        "aud": client["client_id"],
        "exp": now + 3600,
        "iat": now,
        "email": user["email"],
        "name": user["name"],
    }
    if code_data.get("nonce"):
        id_token_claims["nonce"] = code_data["nonce"]

    id_token = jwt.encode(id_token_claims, _private_pem, algorithm="RS256", headers={"kid": KID})

    # Build access token
    access_token_claims = {
        "iss": INTERNAL_BASE,
        "sub": user["sub"],
        "aud": client["client_id"],
        "exp": now + 3600,
        "iat": now,
        "scope": "openid profile email",
    }
    access_token = jwt.encode(access_token_claims, _private_pem, algorithm="RS256", headers={"kid": KID})

    return {
        "access_token": access_token,
        "token_type": "Bearer",
        "expires_in": 3600,
        "id_token": id_token,
        "scope": "openid profile email",
    }


# ---- Userinfo --------------------------------------------------------------

@app.get("/userinfo")
async def userinfo(request: Request):
    auth_header = request.headers.get("authorization", "")
    if not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token_str = auth_header[7:]
    try:
        payload = jwt.decode(
            token_str,
            _public_key,
            algorithms=["RS256"],
            audience=CLIENT_ID,
            options={"verify_exp": True},
        )
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    sub = payload.get("sub", "")
    user = USERS.get(sub)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "sub": user["sub"],
        "email": user["email"],
        "name": user["name"],
    }


# ---- Logout ----------------------------------------------------------------

@app.get("/logout")
async def logout(
    post_logout_redirect_uri: str = Query(""),
    state: str = Query(""),
):
    if post_logout_redirect_uri:
        # Validate against all registered redirect URIs to prevent open redirect
        allowed = {uri for c in CLIENTS.values() for uri in c.get("redirect_uris", [])}
        parsed = urllib.parse.urlparse(post_logout_redirect_uri)
        allowed_origins = {
            f"{urllib.parse.urlparse(u).scheme}://{urllib.parse.urlparse(u).netloc}"
            for u in allowed
        }
        request_origin = f"{parsed.scheme}://{parsed.netloc}"
        if request_origin not in allowed_origins:
            raise HTTPException(
                status_code=400,
                detail="post_logout_redirect_uri not allowed.",
            )
        location = post_logout_redirect_uri
        if state:
            sep = "&" if "?" in location else "?"
            location += f"{sep}state={state}"
        return RedirectResponse(url=location, status_code=302)
    return {"status": "logged_out"}


# ---- Management API --------------------------------------------------------

@app.get("/api/users")
async def list_users():
    return {"users": list(USERS.values())}


@app.post("/api/users")
async def register_user(request: Request):
    body = await request.json()
    sub = body.get("sub")
    if not sub:
        raise HTTPException(status_code=400, detail="'sub' is required")

    USERS[sub] = {
        "sub": sub,
        "email": body.get("email", f"{sub}@example.com"),
        "name": body.get("name", sub),
    }
    return {"status": "ok", "user": USERS[sub]}


@app.delete("/api/users/{sub}")
async def delete_user(sub: str):
    if sub not in USERS:
        raise HTTPException(status_code=404, detail="User not found")
    deleted = USERS.pop(sub)
    return {"status": "ok", "deleted": deleted}


@app.put("/api/clients/{client_id}/redirect_uris")
async def update_redirect_uris(client_id: str, request: Request):
    body = await request.json()
    redirect_uris = body.get("redirect_uris")
    if redirect_uris is None:
        raise HTTPException(status_code=400, detail="'redirect_uris' is required")

    client = CLIENTS.get(client_id)
    if not client:
        raise HTTPException(status_code=404, detail=f"Client not found: {client_id}")

    client["redirect_uris"] = redirect_uris
    return {"status": "ok", "client_id": client_id, "redirect_uris": redirect_uris}


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)
