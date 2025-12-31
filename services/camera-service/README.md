# Camera Service (Optional)

This optional service can be implemented with Picamera2/libcamera for more control.
Current runtime defaults to `rpicam-still` subprocess capture. If you need a
long-running camera service, add a Python FastAPI/Flask server here and point
`vision.capture.backend` to `camera-service` with `cameraServiceUrl`.
