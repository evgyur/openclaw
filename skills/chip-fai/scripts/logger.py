#!/usr/bin/env python3
"""Centralized logging for chip-fai skill"""

import logging
import sys
from pathlib import Path

LOG_DIR = Path(__file__).parent.parent / 'logs'
LOG_DIR.mkdir(exist_ok=True)

def get_logger(name):
    logger = logging.getLogger(name)
    
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        
        # Console handler
        console = logging.StreamHandler(sys.stderr)
        console.setLevel(logging.WARNING)
        console.setFormatter(logging.Formatter('%(levelname)s: %(message)s'))
        logger.addHandler(console)
        
        # File handler
        log_file = LOG_DIR / 'chip-fai.log'
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.INFO)
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        logger.addHandler(file_handler)
    
    return logger
