import os
import sys

# Change to the current directory to avoid import errors
sys.path.append(os.path.dirname(__file__))

from main import app

for route in app.routes:
    print(route.path)
