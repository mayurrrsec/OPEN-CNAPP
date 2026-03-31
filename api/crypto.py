import base64
import hashlib
import os
from cryptography.fernet import Fernet


def _key() -> bytes:
    secret = os.getenv("SECRET_KEY", "opencnapp-dev-secret")
    digest = hashlib.sha256(secret.encode()).digest()
    return base64.urlsafe_b64encode(digest)


def encrypt(plaintext: str) -> str:
    return Fernet(_key()).encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    return Fernet(_key()).decrypt(ciphertext.encode()).decode()
