"""
Cryptography Management Service
--------------------------------
Admin-only service for viewing and managing cryptographic configuration.
NEVER exposes private keys or sensitive cryptographic material.
"""

from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List
import os

from app.services.certificate_service import CertificateService
from app.services.pq_crypto_service import PQCryptoService
from app.security.kyber_crystal import KyberCrystal


class CryptoManagementService:
    """Secure cryptography management for system administrators."""

    @staticmethod
    def get_crypto_status() -> Dict[str, Any]:
        """
        Get read-only cryptography configuration status.
        NEVER returns private keys or secrets.
        """
        
        # Classical (RSA) CA Status
        classical_status = CryptoManagementService._get_classical_ca_status()
        
        # Post-Quantum (Dilithium) CA Status
        pq_status = CryptoManagementService._get_pq_ca_status()
        
        # ML-KEM (Kyber) Status
        kem_status = CryptoManagementService._get_kem_status()
        
        # Certificate Statistics
        cert_stats = CryptoManagementService._get_certificate_stats()
        
        # CRL Status
        crl_status = CryptoManagementService._get_crl_status()
        
        return {
            "classical": classical_status,
            "post_quantum": pq_status,
            "kem": kem_status,
            "certificates": cert_stats,
            "crl": crl_status,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

    @staticmethod
    def _get_classical_ca_status() -> Dict[str, Any]:
        """Get classical (RSA) CA status without exposing private keys."""
        ca_private = CertificateService.CA_PRIVATE_KEY
        ca_public = CertificateService.CA_PUBLIC_KEY
        
        status = {
            "algorithm": "RSA-4096",
            "hash_algorithm": "SHA3-256",
            "enabled": ca_private.exists() and ca_public.exists(),
            "private_key_exists": ca_private.exists(),
            "public_key_exists": ca_public.exists(),
        }
        
        if ca_private.exists():
            stat = os.stat(ca_private)
            status["last_modified"] = datetime.fromtimestamp(stat.st_mtime).isoformat() + "Z"
            status["key_size_bytes"] = stat.st_size
        
        return status

    @staticmethod
    def _get_pq_ca_status() -> Dict[str, Any]:
        """Get post-quantum (Dilithium) CA status without exposing private keys."""
        pq_private = CertificateService.PQ_CA_PRIVATE_KEY
        pq_public = CertificateService.PQ_CA_PUBLIC_KEY
        
        status = {
            "algorithm": PQCryptoService.SIGN_ALGO,
            "enabled": pq_private.exists() and pq_public.exists(),
            "private_key_exists": pq_private.exists(),
            "public_key_exists": pq_public.exists(),
        }
        
        if pq_private.exists():
            stat = os.stat(pq_private)
            status["last_modified"] = datetime.fromtimestamp(stat.st_mtime).isoformat() + "Z"
            status["key_size_bytes"] = stat.st_size
        
        return status

    @staticmethod
    def _get_kem_status() -> Dict[str, Any]:
        """Get ML-KEM (Kyber) configuration status."""
        return {
            "algorithm": KyberCrystal.ALG_NAME,
            "enabled": True,
            "shared_secret_bytes": KyberCrystal.SHARED_SECRET_BYTES,
            "use_case": "Certificate delivery and session key establishment",
        }

    @staticmethod
    def _get_certificate_stats() -> Dict[str, Any]:
        """Get certificate statistics without exposing certificate content."""
        base = CertificateService.CERT_BASE
        
        if not base.exists():
            return {
                "total": 0,
                "by_role": {},
                "storage_path": str(base),
            }
        
        counts: Dict[str, int] = {}
        total = 0
        
        for role_dir in base.iterdir():
            if not role_dir.is_dir():
                continue
            count = len(list(role_dir.glob("*.pem")))
            counts[role_dir.name] = count
            total += count
        
        return {
            "total": total,
            "by_role": counts,
            "storage_path": str(base),
            "encryption": "AES-256-GCM (via CertificateVault)",
        }

    @staticmethod
    def _get_crl_status() -> Dict[str, Any]:
        """Get CRL status without exposing revoked certificate details."""
        try:
            crl_data = CertificateService._load_crl()
            revoked_count = len(crl_data.get("revoked", []))
            
            return {
                "enabled": True,
                "revoked_count": revoked_count,
                "crl_path": str(CertificateService.CRL_PATH),
                "cache_ttl_seconds": CertificateService.CRL_CACHE_TTL_SECONDS,
            }
        except Exception:
            return {
                "enabled": False,
                "revoked_count": 0,
                "error": "CRL not accessible",
            }

    @staticmethod
    def get_encryption_health() -> Dict[str, Any]:
        """
        Get encryption health indicators.
        Returns status checks without exposing sensitive data.
        """
        checks = []
        
        # Check 1: Classical CA Keys
        classical_ok = (
            CertificateService.CA_PRIVATE_KEY.exists() and
            CertificateService.CA_PUBLIC_KEY.exists()
        )
        checks.append({
            "name": "Classical CA Keys",
            "status": "healthy" if classical_ok else "missing",
            "critical": True,
        })
        
        # Check 2: Post-Quantum CA Keys
        pq_ok = (
            CertificateService.PQ_CA_PRIVATE_KEY.exists() and
            CertificateService.PQ_CA_PUBLIC_KEY.exists()
        )
        checks.append({
            "name": "Post-Quantum CA Keys",
            "status": "healthy" if pq_ok else "missing",
            "critical": True,
        })
        
        # Check 3: Certificate Storage
        cert_base_ok = CertificateService.CERT_BASE.exists()
        checks.append({
            "name": "Certificate Storage",
            "status": "healthy" if cert_base_ok else "missing",
            "critical": True,
        })
        
        # Check 4: CRL Availability
        crl_ok = CertificateService.CRL_PATH.exists()
        checks.append({
            "name": "Certificate Revocation List",
            "status": "healthy" if crl_ok else "missing",
            "critical": False,
        })
        
        # Overall health
        critical_checks = [c for c in checks if c["critical"]]
        all_critical_healthy = all(c["status"] == "healthy" for c in critical_checks)
        
        return {
            "overall_status": "healthy" if all_critical_healthy else "degraded",
            "checks": checks,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

    @staticmethod
    def get_crypto_algorithms() -> List[Dict[str, Any]]:
        """
        Get list of cryptographic algorithms in use.
        Educational/audit information only.
        """
        return [
            {
                "category": "Asymmetric Encryption",
                "algorithm": "RSA-4096",
                "purpose": "CA certificate signing",
                "standard": "PKCS#1 v1.5",
            },
            {
                "category": "Post-Quantum Signature",
                "algorithm": "ML-DSA-65 (Dilithium-3)",
                "purpose": "Quantum-resistant certificate signing",
                "standard": "NIST FIPS 204",
            },
            {
                "category": "Key Encapsulation",
                "algorithm": "ML-KEM-512 (Kyber-512)",
                "purpose": "Quantum-resistant key exchange",
                "standard": "NIST FIPS 203",
            },
            {
                "category": "Hash Function",
                "algorithm": "SHA3-256",
                "purpose": "Certificate hashing and integrity",
                "standard": "NIST FIPS 202",
            },
            {
                "category": "Symmetric Encryption",
                "algorithm": "AES-256-GCM",
                "purpose": "Certificate vault encryption",
                "standard": "NIST FIPS 197",
            },
            {
                "category": "Client Signature",
                "algorithm": "RSA-3072/SHA-256",
                "purpose": "Client authentication",
                "standard": "PKCS#1 v1.5",
            },
        ]
