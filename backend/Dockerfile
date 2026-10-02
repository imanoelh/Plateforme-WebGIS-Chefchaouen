FROM python:3.12-slim

WORKDIR /app
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
COPY backend/app /app/app

EXPOSE 8000
CMD ["sh", "-c", "python -m app.wait_for_db && exec uvicorn app.main:app --host ${BACKEND_HOST:-0.0.0.0} --port ${PORT:-${BACKEND_PORT:-8000}}"]
