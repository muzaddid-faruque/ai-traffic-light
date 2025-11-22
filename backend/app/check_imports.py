import sys
import importlib

print('Python', sys.version)
modules = ['ultralytics','cv2','pydantic','pydantic_settings','uvicorn']
for m in modules:
    try:
        importlib.import_module(m)
        print(m, 'OK')
    except Exception as e:
        print(m, 'ERROR:', e)
