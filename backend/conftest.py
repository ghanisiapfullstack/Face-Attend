import sys, os
sys.path.insert(0, os.path.dirname(__file__))
os.environ['DATABASE_URL'] = 'sqlite:///./test_faceattend.db'
os.environ['SECRET_KEY'] = 'test-secret-key'

from unittest.mock import patch
patch('app.main.run_light_migration', lambda: None).start()
