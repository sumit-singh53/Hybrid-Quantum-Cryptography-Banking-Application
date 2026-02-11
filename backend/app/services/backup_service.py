"""
Backup & Recovery Service
--------------------------
Admin-only service for system backup and recovery operations.
All operations are logged and validated.
"""

import os
import shutil
import hashlib
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from pathlib import Path

from app.config.database import db
from app.config.config import INSTANCE_DIR, DEFAULT_DB_PATH
from app.models.backup_model import Backup
from app.security.security_event_store import SecurityEventStore


class BackupService:
    """Service for managing system backups and recovery."""
    
    BACKUP_DIR = INSTANCE_DIR / "backups"
    
    @staticmethod
    def _ensure_backup_directory():
        """Ensure backup directory exists."""
        BackupService.BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    
    @staticmethod
    def _generate_backup_id() -> str:
        """Generate unique backup ID."""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        return f"backup_{timestamp}"
    
    @staticmethod
    def _calculate_file_hash(file_path: Path) -> str:
        """Calculate SHA-256 hash of a file."""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    
    @staticmethod
    def _get_file_size(file_path: Path) -> int:
        """Get file size in bytes."""
        return file_path.stat().st_size if file_path.exists() else 0
    
    @staticmethod
    def create_backup(
        backup_type: str,
        admin_username: str,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a system backup.
        Backs up database and critical configuration files.
        """
        BackupService._ensure_backup_directory()
        
        backup_id = BackupService._generate_backup_id()
        backup_folder = BackupService.BACKUP_DIR / backup_id
        backup_folder.mkdir(parents=True, exist_ok=True)
        
        try:
            # Create backup record
            backup = Backup(
                backup_id=backup_id,
                backup_type=backup_type,
                status="in_progress",
                description=description or f"{backup_type.capitalize()} backup",
                backup_location=f"backups/{backup_id}",
                created_by=admin_username,
            )
            db.session.add(backup)
            db.session.commit()
            
            # Backup database
            db_backup_path = backup_folder / "database.db"
            if DEFAULT_DB_PATH.exists():
                shutil.copy2(DEFAULT_DB_PATH, db_backup_path)
            
            # Backup critical files
            critical_files = [
                INSTANCE_DIR / "cert_vault.key",
                INSTANCE_DIR / "device_bindings.json",
                INSTANCE_DIR / "security_events.json",
                INSTANCE_DIR / "request_audit_log.json",
                INSTANCE_DIR / "accountability_log.json",
            ]
            
            backed_up_files = []
            for file_path in critical_files:
                if file_path.exists():
                    dest_path = backup_folder / file_path.name
                    shutil.copy2(file_path, dest_path)
                    backed_up_files.append(file_path.name)
            
            # Create backup manifest
            manifest = {
                "backup_id": backup_id,
                "backup_type": backup_type,
                "created_at": datetime.utcnow().isoformat() + "Z",
                "created_by": admin_username,
                "files": backed_up_files,
                "database": "database.db",
            }
            
            manifest_path = backup_folder / "manifest.json"
            with open(manifest_path, "w") as f:
                json.dump(manifest, f, indent=2)
            
            # Calculate integrity hash
            integrity_hash = BackupService._calculate_file_hash(db_backup_path)
            
            # Calculate total backup size
            total_size = sum(
                BackupService._get_file_size(backup_folder / f)
                for f in os.listdir(backup_folder)
            )
            
            # Update backup record
            backup.status = "success"
            backup.integrity_hash = integrity_hash
            backup.backup_size = total_size
            backup.integrity_verified = True
            db.session.commit()
            
            # Log the backup
            SecurityEventStore.record(
                event_type="SYSTEM_BACKUP_CREATED",
                user_id=admin_username,
                metadata={
                    "backup_id": backup_id,
                    "backup_type": backup_type,
                    "backup_size": total_size,
                    "files_backed_up": len(backed_up_files),
                },
            )
            
            return backup.to_dict()
            
        except Exception as e:
            # Mark backup as failed
            if backup:
                backup.status = "failed"
                backup.description = f"{backup.description} - Error: {str(e)}"
                db.session.commit()
            
            # Log the failure
            SecurityEventStore.record(
                event_type="SYSTEM_BACKUP_FAILED",
                user_id=admin_username,
                metadata={
                    "backup_id": backup_id,
                    "error": str(e),
                },
            )
            
            raise Exception(f"Backup failed: {str(e)}")
    
    @staticmethod
    def get_all_backups() -> List[Dict[str, Any]]:
        """Get all backups ordered by creation date (newest first)."""
        backups = Backup.query.order_by(Backup.created_at.desc()).all()
        return [b.to_dict() for b in backups]
    
    @staticmethod
    def get_backup_by_id(backup_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific backup by ID."""
        backup = Backup.query.filter_by(backup_id=backup_id).first()
        return backup.to_dict() if backup else None
    
    @staticmethod
    def verify_backup_integrity(backup_id: str) -> Dict[str, Any]:
        """Verify backup integrity by checking hash."""
        backup = Backup.query.filter_by(backup_id=backup_id).first()
        
        if not backup:
            raise ValueError(f"Backup '{backup_id}' not found")
        
        backup_folder = BackupService.BACKUP_DIR / backup_id
        db_backup_path = backup_folder / "database.db"
        
        if not db_backup_path.exists():
            return {
                "backup_id": backup_id,
                "verified": False,
                "message": "Backup file not found",
            }
        
        # Calculate current hash
        current_hash = BackupService._calculate_file_hash(db_backup_path)
        
        # Compare with stored hash
        is_valid = current_hash == backup.integrity_hash
        
        return {
            "backup_id": backup_id,
            "verified": is_valid,
            "message": "Backup integrity verified" if is_valid else "Backup integrity check failed",
            "stored_hash": backup.integrity_hash[:16] + "..." if backup.integrity_hash else None,
            "current_hash": current_hash[:16] + "...",
        }
    
    @staticmethod
    def restore_backup(
        backup_id: str,
        admin_username: str,
        confirmed: bool = False
    ) -> Dict[str, Any]:
        """
        Restore system from a backup.
        Requires explicit confirmation.
        """
        if not confirmed:
            raise ValueError("Restore operation requires explicit confirmation")
        
        backup = Backup.query.filter_by(backup_id=backup_id).first()
        
        if not backup:
            raise ValueError(f"Backup '{backup_id}' not found")
        
        if backup.status != "success":
            raise ValueError(f"Cannot restore from failed backup")
        
        backup_folder = BackupService.BACKUP_DIR / backup_id
        
        if not backup_folder.exists():
            raise ValueError(f"Backup files not found for '{backup_id}'")
        
        try:
            # Verify integrity before restore
            verification = BackupService.verify_backup_integrity(backup_id)
            if not verification["verified"]:
                raise ValueError("Backup integrity verification failed")
            
            # Create a safety backup before restore
            safety_backup_id = BackupService._generate_backup_id() + "_pre_restore"
            safety_folder = BackupService.BACKUP_DIR / safety_backup_id
            safety_folder.mkdir(parents=True, exist_ok=True)
            
            # Backup current state
            if DEFAULT_DB_PATH.exists():
                shutil.copy2(DEFAULT_DB_PATH, safety_folder / "database.db")
            
            # Restore database
            db_backup_path = backup_folder / "database.db"
            if db_backup_path.exists():
                shutil.copy2(db_backup_path, DEFAULT_DB_PATH)
            
            # Restore critical files
            manifest_path = backup_folder / "manifest.json"
            if manifest_path.exists():
                with open(manifest_path, "r") as f:
                    manifest = json.load(f)
                
                for file_name in manifest.get("files", []):
                    source_path = backup_folder / file_name
                    dest_path = INSTANCE_DIR / file_name
                    if source_path.exists():
                        shutil.copy2(source_path, dest_path)
            
            # Update backup record
            backup.last_restored_at = datetime.utcnow()
            backup.last_restored_by = admin_username
            backup.restore_count = (backup.restore_count or 0) + 1
            db.session.commit()
            
            # Log the restore
            SecurityEventStore.record(
                event_type="SYSTEM_BACKUP_RESTORED",
                user_id=admin_username,
                metadata={
                    "backup_id": backup_id,
                    "safety_backup_id": safety_backup_id,
                    "restore_count": backup.restore_count,
                },
            )
            
            return {
                "success": True,
                "backup_id": backup_id,
                "safety_backup_id": safety_backup_id,
                "message": "System restored successfully from backup",
                "restored_at": datetime.utcnow().isoformat() + "Z",
            }
            
        except Exception as e:
            # Log the failure
            SecurityEventStore.record(
                event_type="SYSTEM_BACKUP_RESTORE_FAILED",
                user_id=admin_username,
                metadata={
                    "backup_id": backup_id,
                    "error": str(e),
                },
            )
            
            raise Exception(f"Restore failed: {str(e)}")
    
    @staticmethod
    def delete_backup(backup_id: str, admin_username: str) -> Dict[str, Any]:
        """Delete a backup (soft delete - mark as deleted)."""
        backup = Backup.query.filter_by(backup_id=backup_id).first()
        
        if not backup:
            raise ValueError(f"Backup '{backup_id}' not found")
        
        # Delete backup files
        backup_folder = BackupService.BACKUP_DIR / backup_id
        if backup_folder.exists():
            shutil.rmtree(backup_folder)
        
        # Delete backup record
        db.session.delete(backup)
        db.session.commit()
        
        # Log the deletion
        SecurityEventStore.record(
            event_type="SYSTEM_BACKUP_DELETED",
            user_id=admin_username,
            metadata={
                "backup_id": backup_id,
            },
        )
        
        return {
            "success": True,
            "backup_id": backup_id,
            "message": "Backup deleted successfully",
        }
    
    @staticmethod
    def get_backup_statistics() -> Dict[str, Any]:
        """Get backup statistics."""
        total_backups = Backup.query.count()
        successful_backups = Backup.query.filter_by(status="success").count()
        failed_backups = Backup.query.filter_by(status="failed").count()
        
        total_size = db.session.query(
            db.func.sum(Backup.backup_size)
        ).filter(Backup.status == "success").scalar() or 0
        
        latest_backup = Backup.query.filter_by(status="success").order_by(
            Backup.created_at.desc()
        ).first()
        
        return {
            "total_backups": total_backups,
            "successful_backups": successful_backups,
            "failed_backups": failed_backups,
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "latest_backup": latest_backup.to_dict() if latest_backup else None,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
