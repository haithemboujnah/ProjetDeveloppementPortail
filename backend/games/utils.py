import os
import zipfile
import hashlib
from django.core.files.storage import default_storage
from django.conf import settings

def calculate_file_hash(file_path):
    """Calculate SHA-256 hash of a file"""
    hash_sha256 = hashlib.sha256()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            hash_sha256.update(chunk)
    return hash_sha256.hexdigest()

def get_file_size(file):
    """Get file size in bytes"""
    if hasattr(file, 'size'):
        return file.size
    return 0

def validate_game_file(file):
    """Validate uploaded game file"""
    # Check file size (max 10GB)
    max_size = 10 * 1024 * 1024 * 1024  # 10GB
    if file.size > max_size:
        raise ValueError(f'File size exceeds maximum allowed size of 10GB')
    
    # Check file extension
    allowed_extensions = ['.exe', '.zip', '.rar', '.msi', '.dmg', '.app']
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in allowed_extensions:
        raise ValueError(f'File type {ext} not allowed')
    
    return True

def create_game_zip(game_files, output_path):
    """Create a zip archive of game files"""
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for file_path in game_files:
            arcname = os.path.basename(file_path)
            zipf.write(file_path, arcname)
    return output_path