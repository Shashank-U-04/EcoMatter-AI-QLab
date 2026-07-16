"""Firebase ID-token verification against Google's published JWKS.

No service-account secret is needed: Firebase ID tokens are RS256-signed by
Google, so they can be verified with Google's public keys plus the (public)
Firebase project ID. Keys are cached by PyJWKClient between requests.
"""
import jwt
from fastapi import HTTPException, status

from . import config

_JWKS_URL = (
    "https://www.googleapis.com/service_accounts/v1/jwk/"
    "securetoken@system.gserviceaccount.com"
)
_jwk_client = jwt.PyJWKClient(_JWKS_URL, cache_keys=True, lifespan=3600)


def verify_firebase_token(id_token: str) -> dict:
    """Validate a Firebase ID token; return its claims (email, name, sub)."""
    if not config.FIREBASE_PROJECT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase login is not configured on this server",
        )
    try:
        key = _jwk_client.get_signing_key_from_jwt(id_token).key
        claims = jwt.decode(
            id_token,
            key,
            algorithms=["RS256"],
            audience=config.FIREBASE_PROJECT_ID,
            issuer=f"https://securetoken.google.com/{config.FIREBASE_PROJECT_ID}",
            options={"require": ["exp", "iat", "sub"]},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Firebase token",
        )
    if not claims.get("email"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Firebase account has no email address",
        )
    return claims
